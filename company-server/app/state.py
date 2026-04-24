from datetime import datetime, timezone
from typing import Any

GATEWAYS: dict[str, dict[str, Any]] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def save_gateway_packet(packet: dict[str, Any]) -> None:
    gateway_id = packet.get("gateway_id")
    if not gateway_id:
        return

    devices = packet.get("devices", [])
    if not isinstance(devices, list):
        devices = []

    GATEWAYS[gateway_id] = {
        "gateway_id": gateway_id,
        "customer_id": packet.get("customer_id"),
        "site_id": packet.get("site_id"),
        "timestamp": packet.get("timestamp"),
        "last_seen": now_iso(),
        "devices": {
            device.get("device_id"): device
            for device in devices
            if isinstance(device, dict) and device.get("device_id")
        },
    }


def get_gateways_list() -> list[dict[str, Any]]:
    return [
        {
            "gateway_id": gateway.get("gateway_id"),
            "customer_id": gateway.get("customer_id"),
            "site_id": gateway.get("site_id"),
            "last_seen": gateway.get("last_seen"),
            "devices_count": len(gateway.get("devices", {})),
        }
        for gateway in GATEWAYS.values()
    ]


def get_all_devices() -> list[dict[str, Any]]:
    result = []

    for gateway in GATEWAYS.values():
        for device in gateway.get("devices", {}).values():
            result.append(
                {
                    "gateway_id": gateway.get("gateway_id"),
                    "customer_id": gateway.get("customer_id"),
                    "site_id": gateway.get("site_id"),
                    **device,
                }
            )

    return result


def get_device_by_id(device_id: str) -> dict[str, Any] | None:
    for gateway in GATEWAYS.values():
        device = gateway.get("devices", {}).get(device_id)
        if device:
            return {
                "gateway_id": gateway.get("gateway_id"),
                "customer_id": gateway.get("customer_id"),
                "site_id": gateway.get("site_id"),
                **device,
            }

    return None
