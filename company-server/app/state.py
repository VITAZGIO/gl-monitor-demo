from datetime import datetime, timezone
from typing import Any

GATEWAYS: dict[str, dict[str, Any]] = {}

HISTORY_LIMIT = 60
ALARM_HISTORY_LIMIT = 30


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _to_float(value: Any) -> float | None:
    if value is None:
        return None

    try:
        return round(float(value), 1)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    if value is None:
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _make_history_point(value: float, timestamp: str | None) -> dict[str, Any]:
    return {
        "timestamp": timestamp or now_iso(),
        "value": round(float(value), 1),
    }


def _make_alarm_event(timestamp: str | None) -> dict[str, Any]:
    return {
        "timestamp": timestamp or now_iso(),
    }


def save_gateway_packet(packet: dict[str, Any]) -> None:
    gateway_id = packet.get("gateway_id")
    if not gateway_id:
        return

    devices = packet.get("devices", [])
    if not isinstance(devices, list):
        devices = []

    old_gateway = GATEWAYS.get(gateway_id, {})
    old_devices = old_gateway.get("devices", {})

    new_devices: dict[str, dict[str, Any]] = {}

    for incoming_device in devices:
        if not isinstance(incoming_device, dict):
            continue

        device_id = incoming_device.get("device_id")
        if not device_id:
            continue

        old_device = old_devices.get(device_id, {})

        history = list(old_device.get("history", []))
        alarm_history = list(old_device.get("alarm_history", []))

        setpoint = _to_float(incoming_device.get("setpoint"))
        alarm = _to_int(incoming_device.get("alarm"))
        previous_alarm = _to_int(old_device.get("alarm"))
        last_seen = incoming_device.get("last_seen") or packet.get("timestamp") or now_iso()

        if setpoint is not None:
            history.append(_make_history_point(setpoint, last_seen))
            history = history[-HISTORY_LIMIT:]

        if alarm == 1 and previous_alarm != 1:
            alarm_history.append(_make_alarm_event(last_seen))
            alarm_history = alarm_history[-ALARM_HISTORY_LIMIT:]

        new_devices[device_id] = {
            **incoming_device,
            "history": history,
            "alarm_history": alarm_history,
        }

    GATEWAYS[gateway_id] = {
        "gateway_id": gateway_id,
        "customer_id": packet.get("customer_id"),
        "site_id": packet.get("site_id"),
        "timestamp": packet.get("timestamp"),
        "last_seen": now_iso(),
        "devices": new_devices,
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


def get_devices_by_gateway(gateway_id: str) -> list[dict[str, Any]]:
    gateway = GATEWAYS.get(gateway_id)
    if not gateway:
        return []

    return [
        {
            "gateway_id": gateway.get("gateway_id"),
            "customer_id": gateway.get("customer_id"),
            "site_id": gateway.get("site_id"),
            **device,
        }
        for device in gateway.get("devices", {}).values()
    ]


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


def get_device_history(device_id: str) -> list[dict[str, Any]]:
    device = get_device_by_id(device_id)
    if not device:
        return []

    return device.get("history", [])


def get_device_alarm_history(device_id: str) -> list[dict[str, Any]]:
    device = get_device_by_id(device_id)
    if not device:
        return []

    return device.get("alarm_history", [])
