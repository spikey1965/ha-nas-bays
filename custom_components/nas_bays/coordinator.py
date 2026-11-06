"""Turn raw TrueNAS answers into the one data model the sensors and card use."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import TrueNASAuthError, TrueNASClient, TrueNASError
from .const import DOMAIN, FAST_INTERVAL, SLOW_EVERY

_LOGGER = logging.getLogger(__name__)
GIB = 1024**3
BAD_LEVELS = {"CRITICAL", "ALERT", "EMERGENCY", "ERROR"}


def parse_time(value: Any) -> datetime | None:
    """TrueNAS sends {"$date": ms} on the wire; accept ISO strings as well."""
    if isinstance(value, dict) and "$date" in value:
        return datetime.fromtimestamp(value["$date"] / 1000, timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


def interface_list(query: list[dict] | None, live: dict[str, dict]) -> list[dict]:
    """Network ports, ports with a link first. The basic card reads name and link; custom designs use the rest."""
    nics = []
    for nic in query or []:
        state = nic.get("state") or {}
        addresses = [a for a in state.get("aliases") or [] if a.get("type") in ("INET", "INET6")]
        nics.append({
            "name": nic.get("name"),
            "link": (live.get(nic.get("name")) or {}).get("link_state") or state.get("link_state"),
            "media_type": state.get("active_media_type"),
            "media_subtype": state.get("active_media_subtype"),
            "ip": f"{addresses[0]['address']}/{addresses[0]['netmask']}" if addresses else None,
            "ip_more": max(len(addresses) - 1, 0),
        })
    return sorted(nics, key=lambda n: n["link"] != "LINK_STATE_UP")


def leaves(vdev: dict) -> list[dict]:
    kids = vdev.get("children") or []
    if not kids:
        return [vdev]
    return [leaf for kid in kids for leaf in leaves(kid)]


def pool_leaves(pool: dict) -> list[dict]:
    return [leaf for vdevs in (pool.get("topology") or {}).values() for vdev in vdevs or [] for leaf in leaves(vdev)]


def layout_text(pool: dict) -> str:
    data = (pool.get("topology") or {}).get("data") or []
    if not data:
        return ""
    kinds = {v.get("type") for v in data}
    kind = kinds.pop() if len(kinds) == 1 else "mixed"
    disks = sum(len(leaves(v)) for v in data)
    if kind == "DISK":
        return "Single disk" if disks == 1 else f"Stripe, {disks} disks"
    vdevs = f"{len(data)} × " if len(data) > 1 else ""
    return f"{vdevs}{kind}, {disks} disks"


def thread_list(cpu: dict) -> list[dict]:
    """Usage and temperature per CPU thread, for custom designs. Whole numbers, as TrueNAS shows them."""
    rows = []
    while (row := cpu.get(f"cpu{len(rows)}")) is not None:
        usage, temp = row.get("usage"), row.get("temp")
        rows.append({"usage": int(usage) if usage is not None else None, "temp": int(temp) if temp is not None else None})
    return rows


def backup_summary(raw: dict) -> dict:
    """Snapshot tasks, and anything that copies data off this pool. Only tasks that are switched on count."""
    snaps = [t for t in raw.get("snapshot_tasks") or [] if t.get("enabled")]
    remote = [(t, t.get("state") or {}, "datetime") for t in raw.get("replication") or [] if t.get("enabled")]
    for key in ("cloud_sync", "rsync"):
        remote += [(t, t.get("job") or {}, "time_finished") for t in raw.get(key) or [] if t.get("enabled")]
    newest = lambda times: max((t for t in times if t), default=None)
    snap_times = [parse_time((t.get("state") or {}).get("datetime")) for t in snaps if (t.get("state") or {}).get("state") == "FINISHED"]
    remote_times = [parse_time(state.get(field)) for _, state, field in remote if state.get("state") in ("FINISHED", "SUCCESS")]
    last_snapshot, last_remote = newest(snap_times), newest(remote_times)
    return {
        "known": raw.get("snapshot_tasks") is not None,
        "snapshot_tasks": len(snaps),
        "snapshot_failed": sum(1 for t in snaps if (t.get("state") or {}).get("state") == "ERROR"),
        "last_snapshot": last_snapshot.isoformat() if last_snapshot else None,
        "remote_tasks": len(remote),
        "remote_failed": sum(1 for _, state, _f in remote if state.get("state") in ("ERROR", "FAILED")),
        "last_remote": last_remote.isoformat() if last_remote else None,
    }


def build_model(raw: dict, realtime: dict) -> dict:
    """Pure function: raw API answers in, the integration's data model out."""
    info = raw.get("info") or {}
    alerts = [a for a in raw.get("alerts") or [] if not a.get("dismissed")]
    pools_raw = raw.get("pools") or []
    boot = raw.get("boot") or None

    # Which pool each disk belongs to comes from the pool layout, not disk.query.
    where: dict[str, dict] = {}
    for pool in pools_raw + ([boot] if boot else []):
        for leaf in pool_leaves(pool):
            name = leaf.get("disk")
            if name:
                stats = leaf.get("stats") or {}
                where[name] = {
                    "pool": pool.get("name"),
                    "state": leaf.get("status"),
                    "read_errors": stats.get("read_errors", 0),
                    "write_errors": stats.get("write_errors", 0),
                    "checksum_errors": stats.get("checksum_errors", 0),
                }
    boot_name = boot.get("name") if boot else None

    temps = raw.get("temps") or {}
    disks: dict[str, dict] = {}
    for disk in raw.get("disks") or []:
        serial = disk.get("serial")
        if not serial:
            continue
        place = where.get(disk.get("name"), {})
        issues = [a for a in alerts if serial == (a.get("args") or {}).get("serial") or serial in (a.get("formatted") or "")]
        errors = sum(place.get(k, 0) or 0 for k in ("read_errors", "write_errors", "checksum_errors"))
        state = place.get("state")
        if any(a.get("level") in BAD_LEVELS for a in issues) or (state and state != "ONLINE"):
            health = "critical"
        elif issues or errors:
            health = "warning"
        else:
            health = "ok"
        disks[serial] = {
            "serial": serial,
            "model": disk.get("model"),
            "device": disk.get("name"),
            "size": disk.get("size"),
            "type": disk.get("type"),
            "temperature": temps.get(disk.get("name")),
            "pool": place.get("pool"),
            "boot": bool(boot_name) and place.get("pool") == boot_name,
            "state": state,
            "read_errors": place.get("read_errors", 0),
            "write_errors": place.get("write_errors", 0),
            "checksum_errors": place.get("checksum_errors", 0),
            "health": health,
            "issues": [a.get("formatted") for a in issues],
        }

    rt_pools = realtime.get("pools") or {}
    pools: dict[str, dict] = {}
    for pool in pools_raw:
        name = pool.get("name")
        live = rt_pools.get(name) or {}
        scan = pool.get("scan") or {}
        total = live.get("total") or pool.get("size") or 0
        used = live.get("used") if live else pool.get("allocated")
        ended = parse_time(scan.get("end_time"))
        members = pool_leaves(pool)
        topology = pool.get("topology") or {}
        pools[name] = {
            "name": name,
            "status": pool.get("status"),
            "healthy": pool.get("healthy"),
            "used": used,
            "available": live.get("available") if live else pool.get("free"),
            "total": total,
            "percent": round(used / total * 100, 1) if total and used is not None else None,
            "layout": layout_text(pool),
            "scrub_state": scan.get("state"),
            "scrub_end": ended.isoformat() if ended else None,
            "scrub_errors": scan.get("errors"),
            "scan_function": scan.get("function"),
            "data_vdevs": len(topology.get("data") or []),
            "caches": len(topology.get("cache") or []),
            "spares": len(topology.get("spare") or []),
            "disks_total": len(members),
            "disks_with_errors": sum(1 for leaf in members if any((leaf.get("stats") or {}).get(k) for k in ("read_errors", "write_errors", "checksum_errors"))),
        }

    mem = realtime.get("memory") or {}
    total = mem.get("physical_memory_total")
    free = mem.get("physical_memory_available")
    arc = mem.get("arc_size") or 0
    cpu = (realtime.get("cpu") or {}).get("cpu") or {}
    nets = [n for n in (realtime.get("interfaces") or {}).values() if n.get("link_state") == "LINK_STATE_UP"]
    speeds = [n.get("speed") or 0 for n in nets]

    apps = raw.get("apps") or []
    bad_pools = [p["name"] for p in pools.values() if not p["healthy"]]
    bad_disks = [d for d in disks.values() if d["health"] != "ok"]
    other_alerts = [a for a in alerts if a.get("level") != "INFO"]
    summary_key, summary_n, summary_pool, summary_status = "all_good", None, None, None
    if bad_pools:
        health, summary_key = "critical", "pool_status"
        summary_pool, summary_status = bad_pools[0], pools[bad_pools[0]]["status"]
        summary = f"{summary_pool} {(summary_status or 'unhealthy').lower()}"
    elif bad_disks:
        health = "critical" if any(d["health"] == "critical" for d in bad_disks) else "warning"
        summary_key, summary_n = "disks_attention", len(bad_disks)
        summary = f"{summary_n} disk{'s' if summary_n != 1 else ''} need{'' if summary_n != 1 else 's'} attention"
    elif other_alerts:
        health = "critical" if any(a.get("level") in BAD_LEVELS for a in other_alerts) else "warning"
        summary_key, summary_n = "alerts_n", len(other_alerts)
        summary = f"{summary_n} alert{'s' if summary_n != 1 else ''}"
    else:
        health, summary = "ok", "All good"

    boot_time = parse_time(info.get("boottime"))
    system = {
        "health": health,
        "summary": summary,
        "summary_key": summary_key,
        "summary_n": summary_n,
        "summary_pool": summary_pool,
        "summary_status": summary_status,
        "hostname": info.get("hostname"),
        "version": info.get("version"),
        "model": info.get("model"),
        "boot_time": boot_time,
        "load": (info.get("loadavg") or [None])[0],
        "cpu_usage": cpu.get("usage"),
        "cpu_temperature": cpu.get("temp"),
        "cpu_cores": info.get("physical_cores"),
        "cpu_thread_count": info.get("cores"),
        "cpu_threads": thread_list(realtime.get("cpu") or {}),
        "memory_total": round(total / GIB, 1) if total else None,
        "memory_apps": round(max(total - free - arc, 0) / GIB, 1) if total and free is not None else None,
        "memory_cache": round(arc / GIB, 1) if total else None,
        "memory_free": round(free / GIB, 1) if free is not None else None,
        "net_down": round(sum(n.get("received_bytes_rate") or 0 for n in nets) * 8 / 1e6, 2) if nets else None,
        "net_up": round(sum(n.get("sent_bytes_rate") or 0 for n in nets) * 8 / 1e6, 2) if nets else None,
        "net_speed": max(speeds) if speeds else None,
        "interfaces": interface_list(raw.get("interfaces"), realtime.get("interfaces") or {}),
        "alerts": len(alerts),
        "alert_list": [{"level": a.get("level"), "text": a.get("formatted")} for a in alerts],
        "apps_running": sum(1 for a in apps if a.get("state") == "RUNNING"),
        "apps_total": len(apps),
        "snapshots": sum((raw.get("snapshots") or {}).values()),
        "replication_tasks": len(raw.get("replication") or []),
        "backup": backup_summary(raw),
    }
    return {"system": system, "disks": disks, "pools": pools}


async def optional(job: Any) -> Any:
    """Extra detail only: without it the card still works, so an error here must not fail the update."""
    try:
        return await job
    except TrueNASError as err:
        _LOGGER.debug("Optional read failed: %s", err)
        return None


class NasBaysCoordinator(DataUpdateCoordinator[dict]):
    """Polls the NAS. Cheap reads every 30 s, slower reads every 5 minutes."""

    def __init__(self, hass: HomeAssistant, client: TrueNASClient, entry) -> None:
        super().__init__(hass, _LOGGER, name=DOMAIN, update_interval=timedelta(seconds=FAST_INTERVAL), config_entry=entry)
        self.client = client
        self._raw: dict[str, Any] = {}
        self._tick = 0

    async def _async_update_data(self) -> dict:
        try:
            if not self.client.connected:
                await self.client.connect()
                self._tick = 0
            call = self.client.call
            jobs: dict[str, Any] = {
                "info": call("system.info"),
                "alerts": call("alert.list"),
                "pools": call("pool.query"),
            }
            if self._tick % SLOW_EVERY == 0:
                jobs |= {
                    "disks": call("disk.query"),
                    "temps": call("disk.temperatures"),
                    "apps": call("app.query"),
                    "replication": call("replication.query"),
                    "snapshots": call("zfs.resource.snapshot.count", {"recursive": True}),
                    "boot": call("boot.get_state"),
                    "interfaces": optional(call("interface.query")),
                    "snapshot_tasks": optional(call("pool.snapshottask.query")),
                    "cloud_sync": optional(call("cloudsync.query")),
                    "rsync": optional(call("rsynctask.query")),
                }
            results = await asyncio.gather(*jobs.values())
            self._raw |= dict(zip(jobs, results))
            self._tick += 1
            return build_model(self._raw, self.client.realtime)
        except TrueNASAuthError as err:
            raise ConfigEntryAuthFailed(str(err)) from err
        except TrueNASError as err:
            await self.client.close()
            raise UpdateFailed(str(err)) from err
