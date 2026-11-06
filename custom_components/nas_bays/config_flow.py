"""Config flow: address + API key. HTTPS only, because TrueNAS revokes keys sent over HTTP."""
from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_API_KEY, CONF_HOST, CONF_PORT
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import TrueNASAuthError, TrueNASClient, TrueNASError, TrueNASSSLError
from .const import CONF_VERIFY_SSL, DEFAULT_PORT, DOMAIN


async def _test(hass, host: str, port: int, key: str, verify: bool) -> str | None:
    client = TrueNASClient(async_get_clientsession(hass, verify_ssl=verify), host, port, key, verify)
    try:
        await client.connect()
        await client.call("system.info")
    except TrueNASAuthError:
        return "invalid_auth"
    except TrueNASSSLError:
        return "ssl_error"
    except TrueNASError:
        return "cannot_connect"
    finally:
        await client.close()
    return None


class NasBaysConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            host = user_input[CONF_HOST].strip().rstrip("/")
            if host.lower().startswith("http://"):
                errors["base"] = "https_only"
            else:
                host = host.removeprefix("https://").removeprefix("HTTPS://")
                await self.async_set_unique_id(f"{host}:{user_input[CONF_PORT]}")
                self._abort_if_unique_id_configured()
                error = await _test(self.hass, host, user_input[CONF_PORT], user_input[CONF_API_KEY], user_input[CONF_VERIFY_SSL])
                if error:
                    errors["base"] = error
                else:
                    return self.async_create_entry(title=host, data={**user_input, CONF_HOST: host})
        schema = vol.Schema({
            vol.Required(CONF_HOST): str,
            vol.Required(CONF_PORT, default=DEFAULT_PORT): int,
            vol.Required(CONF_API_KEY): str,
            vol.Required(CONF_VERIFY_SSL, default=True): bool,
        })
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    async def async_step_reauth(self, entry_data: dict[str, Any]) -> ConfigFlowResult:
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        entry = self._get_reauth_entry()
        if user_input is not None:
            d = entry.data
            error = await _test(self.hass, d[CONF_HOST], d[CONF_PORT], user_input[CONF_API_KEY], d.get(CONF_VERIFY_SSL, True))
            if error:
                errors["base"] = error
            else:
                return self.async_update_reload_and_abort(entry, data={**d, CONF_API_KEY: user_input[CONF_API_KEY]})
        return self.async_show_form(step_id="reauth_confirm", data_schema=vol.Schema({vol.Required(CONF_API_KEY): str}), errors=errors)
