"""Sensors for the NAS, its disks (keyed by serial) and its pools."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.const import PERCENTAGE, EntityCategory, UnitOfDataRate, UnitOfInformation, UnitOfTemperature
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, VERSION


@dataclass(frozen=True)
class Metric:
    key: str
    name: str
    unit: str | None = None
    device_class: SensorDeviceClass | None = None
    state_class: SensorStateClass | None = SensorStateClass.MEASUREMENT
    icon: str | None = None
    diagnostic: bool = False
    attrs: Callable[[dict], dict] | None = None


GIB = UnitOfInformation.GIBIBYTES
METRICS = [
    Metric("health", "Health", state_class=None, device_class=SensorDeviceClass.ENUM, icon="mdi:server",
           attrs=lambda s: {k: s[k] for k in ("summary", "summary_key", "summary_n", "summary_pool", "summary_status", "hostname", "version", "model", "memory_total", "net_speed", "interfaces")}),
    Metric("cpu_usage", "CPU usage", PERCENTAGE, icon="mdi:cpu-64-bit",
           attrs=lambda s: {k: s[k] for k in ("cpu_cores", "cpu_thread_count", "cpu_threads")}),
    Metric("cpu_temperature", "CPU temperature", UnitOfTemperature.CELSIUS, SensorDeviceClass.TEMPERATURE),
    Metric("load", "Load", icon="mdi:gauge"),
    Metric("memory_apps", "Memory used by apps and system", GIB, SensorDeviceClass.DATA_SIZE),
    Metric("memory_cache", "Memory used by ZFS cache", GIB, SensorDeviceClass.DATA_SIZE),
    Metric("memory_free", "Memory free", GIB, SensorDeviceClass.DATA_SIZE),
    Metric("net_down", "Network download", UnitOfDataRate.MEGABITS_PER_SECOND, SensorDeviceClass.DATA_RATE),
    Metric("net_up", "Network upload", UnitOfDataRate.MEGABITS_PER_SECOND, SensorDeviceClass.DATA_RATE),
    Metric("boot_time", "Last boot", device_class=SensorDeviceClass.TIMESTAMP, state_class=None, diagnostic=True),
    Metric("alerts", "Alerts", icon="mdi:alert-circle-outline", attrs=lambda s: {"alert_list": s["alert_list"]}),
    Metric("apps_running", "Apps running", icon="mdi:application-brackets-outline", attrs=lambda s: {"apps_total": s["apps_total"]}),
    Metric("snapshots", "Snapshots", icon="mdi:camera-burst", diagnostic=True, attrs=lambda s: {"backup": s["backup"]}),
    Metric("replication_tasks", "Replication tasks", icon="mdi:database-sync", diagnostic=True),
]


async def async_setup_entry(hass: HomeAssistant, entry, async_add_entities: AddEntitiesCallback) -> None:
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(SystemSensor(coordinator, entry, m) for m in METRICS)
    seen_disks: set[str] = set()
    seen_pools: set[str] = set()

    @callback
    def add_new() -> None:
        """Replacement disks and new pools appear without a restart."""
        data = coordinator.data or {}
        new: list[SensorEntity] = []
        for serial in data.get("disks", {}):
            if serial not in seen_disks:
                seen_disks.add(serial)
                new.append(DiskSensor(coordinator, entry, serial))
        for name in data.get("pools", {}):
            if name not in seen_pools:
                seen_pools.add(name)
                new.append(PoolSensor(coordinator, entry, name))
        if new:
            async_add_entities(new)

    add_new()
    entry.async_on_unload(coordinator.async_add_listener(add_new))


class Base(CoordinatorEntity, SensorEntity):
    _attr_has_entity_name = True
    _unrecorded_attributes = frozenset({"alert_list", "backup", "cpu_threads", "interfaces", "issues", "nas_bays_role", "nas_bays_entry"})

    def __init__(self, coordinator, entry) -> None:
        super().__init__(coordinator)
        self._entry = entry
        system = (coordinator.data or {}).get("system", {})
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=system.get("hostname") or entry.title,
            model=system.get("model"),
            sw_version=system.get("version"),
            manufacturer="TrueNAS",
            configuration_url=f"https://{entry.data['host']}:{entry.data['port']}",
        )


class SystemSensor(Base):
    def __init__(self, coordinator, entry, metric: Metric) -> None:
        super().__init__(coordinator, entry)
        self._m = metric
        self._attr_unique_id = f"{entry.entry_id}_{metric.key}"
        self._attr_name = metric.name
        self._attr_native_unit_of_measurement = metric.unit
        self._attr_device_class = metric.device_class
        self._attr_state_class = metric.state_class
        self._attr_icon = metric.icon
        if metric.key == "health":
            self._attr_options = ["ok", "warning", "critical"]
        if metric.device_class == SensorDeviceClass.DATA_SIZE:
            self._attr_suggested_unit_of_measurement = GIB
        if metric.diagnostic:
            self._attr_entity_category = EntityCategory.DIAGNOSTIC

    @property
    def native_value(self):
        return self.coordinator.data["system"].get(self._m.key)

    @property
    def extra_state_attributes(self):
        system = self.coordinator.data["system"]
        extra = self._m.attrs(system) if self._m.attrs else {}
        return {"nas_bays_role": self._m.key, "nas_bays_entry": self._entry.entry_id, **extra}


class DiskSensor(Base):
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator, entry, serial: str) -> None:
        super().__init__(coordinator, entry)
        self._serial = serial
        self._attr_unique_id = f"{entry.entry_id}_disk_{serial}"
        self._attr_name = f"Disk {serial}"

    @property
    def _disk(self):
        return (self.coordinator.data or {}).get("disks", {}).get(self._serial)

    @property
    def available(self) -> bool:
        """A pulled disk goes unavailable, so the card can show its bay as missing."""
        return super().available and self._disk is not None

    @property
    def native_value(self):
        return self._disk["temperature"]

    @property
    def extra_state_attributes(self):
        d = self._disk
        keys = ("serial", "model", "device", "size", "type", "pool", "boot", "state", "health", "issues", "read_errors", "write_errors", "checksum_errors")
        return {"nas_bays_role": "disk", "nas_bays_entry": self._entry.entry_id, **{k: d[k] for k in keys}}


class PoolSensor(Base):
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:database"

    def __init__(self, coordinator, entry, name: str) -> None:
        super().__init__(coordinator, entry)
        self._pool_name = name
        self._attr_unique_id = f"{entry.entry_id}_pool_{name}"
        self._attr_name = f"Pool {name} used"

    @property
    def _pool(self):
        return (self.coordinator.data or {}).get("pools", {}).get(self._pool_name)

    @property
    def available(self) -> bool:
        return super().available and self._pool is not None

    @property
    def native_value(self):
        return self._pool["percent"]

    @property
    def extra_state_attributes(self):
        p = self._pool
        keys = ("name", "status", "healthy", "used", "available", "total", "layout", "scrub_state", "scrub_end", "scrub_errors", "scan_function", "disks_total", "disks_with_errors", "data_vdevs", "caches", "spares")
        return {"nas_bays_role": "pool", "nas_bays_entry": self._entry.entry_id, **{k: p[k] for k in keys}}
