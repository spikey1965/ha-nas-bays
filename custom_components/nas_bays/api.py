"""Small read-only client for the TrueNAS JSON-RPC 2.0 WebSocket API."""
from __future__ import annotations

import asyncio
import json
import logging
from itertools import count
from typing import Any

import aiohttp

_LOGGER = logging.getLogger(__name__)
TIMEOUT = 30


class TrueNASError(Exception):
    """The NAS could not be reached or returned an error."""


class TrueNASAuthError(TrueNASError):
    """The API key was refused."""


class TrueNASSSLError(TrueNASError):
    """The NAS certificate could not be verified."""


class TrueNASClient:
    """One authenticated connection. API keys only ever travel over wss://."""

    def __init__(self, session: aiohttp.ClientSession, host: str, port: int, api_key: str, verify_ssl: bool) -> None:
        self._session = session
        self._url = f"wss://{host}:{port}/api/current"
        self._key = api_key
        self._ssl = bool(verify_ssl)
        self._ws: aiohttp.ClientWebSocketResponse | None = None
        self._reader: asyncio.Task | None = None
        self._ids = count(1)
        self._pending: dict[int, asyncio.Future] = {}
        self.realtime: dict[str, Any] = {}
        self._first_event = asyncio.Event()

    @property
    def connected(self) -> bool:
        return self._ws is not None and not self._ws.closed and self._reader is not None and not self._reader.done()

    async def connect(self) -> None:
        await self.close()
        self._first_event.clear()
        try:
            self._ws = await self._session.ws_connect(self._url, ssl=self._ssl, heartbeat=30, timeout=aiohttp.ClientWSTimeout(ws_close=10), max_msg_size=0)
        except aiohttp.ClientConnectorCertificateError as err:
            raise TrueNASSSLError(str(err)) from err
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError) as err:
            raise TrueNASError(f"Cannot connect: {err}") from err
        self._reader = asyncio.create_task(self._read())
        try:
            ok = await self.call("auth.login_with_api_key", self._key)
        except TrueNASError as err:
            await self.close()
            raise TrueNASAuthError(str(err)) from err
        if ok is not True:
            await self.close()
            raise TrueNASAuthError("API key refused")
        try:
            await self.call("core.subscribe", "reporting.realtime")
            await asyncio.wait_for(self._first_event.wait(), 6)
        except (TrueNASError, asyncio.TimeoutError):
            _LOGGER.debug("No live stats yet from the NAS")

    async def close(self) -> None:
        if self._reader:
            self._reader.cancel()
            self._reader = None
        if self._ws and not self._ws.closed:
            await self._ws.close()
        self._ws = None
        self._fail_pending(TrueNASError("Connection closed"))

    def _fail_pending(self, err: Exception) -> None:
        for fut in self._pending.values():
            if not fut.done():
                fut.set_exception(err)
        self._pending.clear()

    async def call(self, method: str, *params: Any) -> Any:
        if not self._ws or self._ws.closed:
            raise TrueNASError("Not connected")
        req = next(self._ids)
        fut: asyncio.Future = asyncio.get_running_loop().create_future()
        self._pending[req] = fut
        try:
            await self._ws.send_str(json.dumps({"jsonrpc": "2.0", "id": req, "method": method, "params": list(params)}))
            return await asyncio.wait_for(fut, TIMEOUT)
        except (aiohttp.ClientError, asyncio.TimeoutError, ConnectionError) as err:
            raise TrueNASError(f"{method}: {err!r}") from err
        finally:
            self._pending.pop(req, None)

    async def _read(self) -> None:
        try:
            async for msg in self._ws:
                if msg.type != aiohttp.WSMsgType.TEXT:
                    continue
                data = json.loads(msg.data)
                req = data.get("id")
                if req is not None:
                    fut = self._pending.get(req)
                    if fut and not fut.done():
                        if "error" in data:
                            err = data["error"]
                            fut.set_exception(TrueNASError(f"{err.get('message')}: {(err.get('data') or {}).get('reason', '')}"))
                        else:
                            fut.set_result(data.get("result"))
                elif data.get("method") == "collection_update":
                    p = data.get("params") or {}
                    if p.get("collection") == "reporting.realtime" and p.get("fields"):
                        self.realtime = p["fields"]
                        self._first_event.set()
        finally:
            self._fail_pending(TrueNASError("Connection lost"))
