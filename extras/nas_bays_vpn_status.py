#!/usr/bin/env python3
"""Optional helper for the NAS Bays card: send a Gluetun container's status to Home Assistant.

Run it every minute from cron on the machine that runs Gluetun, as a user that can use Docker:
  nas_bays_vpn_status.py --ha-url http://HOME-ASSISTANT:8123 --token-file /path/to/token

Read-only towards Gluetun: it only reads `docker inspect`. It sends the provider, VPN type, location
and health. It never sends or prints anything else from the container's settings (they hold secrets).
"""
import argparse
import json
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

PROVIDERS = {
    "airvpn": "AirVPN", "custom": "Custom", "cyberghost": "CyberGhost", "expressvpn": "ExpressVPN", "fastestvpn": "FastestVPN",
    "hidemyass": "HideMyAss", "ipvanish": "IPVanish", "ivpn": "IVPN", "mullvad": "Mullvad", "nordvpn": "NordVPN",
    "perfect privacy": "Perfect Privacy", "privado": "Privado", "private internet access": "Private Internet Access",
    "privatevpn": "PrivateVPN", "protonvpn": "Proton", "purevpn": "PureVPN", "slickvpn": "SlickVPN", "surfshark": "Surfshark",
    "torguard": "TorGuard", "vpn secure": "VPNSecure", "vpn unlimited": "VPN Unlimited", "vyprvpn": "VyprVPN",
    "wevpn": "WeVPN", "windscribe": "Windscribe",
}
TYPES = {"wireguard": "WireGuard", "openvpn": "OpenVPN"}
WANTED = ("VPN_SERVICE_PROVIDER", "VPN_TYPE", "SERVER_COUNTRIES", "SERVER_REGIONS", "SERVER_CITIES")


def inspect(container: str) -> dict | None:
    done = subprocess.run(["docker", "inspect", container], capture_output=True, text=True, timeout=30)
    if done.returncode != 0:
        return None
    return json.loads(done.stdout)[0]


def status(container: str) -> tuple[str, dict]:
    info = inspect(container)
    if info is None:
        return "missing", {"issue": f"Container {container} not found"}
    env = dict(item.split("=", 1) for item in info["Config"].get("Env") or [] if item.split("=", 1)[0] in WANTED)
    raw = (env.get("VPN_SERVICE_PROVIDER") or "").strip()
    provider = PROVIDERS.get(raw.lower(), raw)
    kind = (env.get("VPN_TYPE") or "openvpn").strip().lower()
    location = next((env[k] for k in WANTED[2:] if env.get(k)), "")
    attrs = {
        "provider": provider,
        "vpn_type": TYPES.get(kind, kind),
        "location": ", ".join(p.strip() for p in location.split(",") if p.strip()),
    }
    state = info["State"]
    health = (state.get("Health") or {}).get("Status")
    if not state.get("Running"):
        return "stopped", {**attrs, "issue": "Container stopped"}
    if health == "healthy":
        return "connected", {**attrs, "issue": ""}
    if health == "starting":
        return "connecting", {**attrs, "issue": "Starting"}
    if health == "unhealthy":
        return "not_connected", {**attrs, "issue": "Health check failing"}
    return "running", {**attrs, "issue": "No health check"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--ha-url", required=True)
    parser.add_argument("--token-file", required=True)
    parser.add_argument("--container", default="gluetun")
    parser.add_argument("--entity", default="sensor.nas_vpn")
    args = parser.parse_args()
    state, attrs = status(args.container)
    attrs |= {"friendly_name": "VPN", "icon": "mdi:vpn", "checked": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    with open(args.token_file, encoding="utf-8") as handle:
        token = handle.read().strip()
    request = urllib.request.Request(
        f"{args.ha_url.rstrip('/')}/api/states/{args.entity}",
        json.dumps({"state": state, "attributes": attrs}).encode(),
        {"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=20):
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
