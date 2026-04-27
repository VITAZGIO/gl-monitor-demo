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

    customer_id = packet.get("customer_id") or "UNKNOWN-CUSTOMER"
    site_id = packet.get("site_id") or "UNKNOWN-SITE"

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

        last_seen = (
            incoming_device.get("last_seen")
            or packet.get("timestamp")
            or now_iso()
        )

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
        "customer_id": customer_id,
        "site_id": site_id,
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


def build_customers_tree() -> dict[str, Any]:
    customers: dict[str, Any] = {}

    for gateway in GATEWAYS.values():
        customer_id = gateway.get("customer_id") or "UNKNOWN-CUSTOMER"
        site_id = gateway.get("site_id") or "UNKNOWN-SITE"
        gateway_id = gateway.get("gateway_id")

        customer = customers.setdefault(
            customer_id,
            {
                "customer_id": customer_id,
                "sites": {},
            },
        )

        site = customer["sites"].setdefault(
            site_id,
            {
                "site_id": site_id,
                "gateways": {},
            },
        )

        site["gateways"][gateway_id] = {
            "gateway_id": gateway_id,
            "last_seen": gateway.get("last_seen"),
            "devices": gateway.get("devices", {}),
        }

    return customers


def get_customers_list() -> list[dict[str, Any]]:
    customers_tree = build_customers_tree()
    result = []

    for customer in customers_tree.values():
        sites = customer.get("sites", {})
        gateways_count = 0
        devices_count = 0

        for site in sites.values():
            gateways = site.get("gateways", {})
            gateways_count += len(gateways)

            for gateway in gateways.values():
                devices_count += len(gateway.get("devices", {}))

        result.append(
            {
                "customer_id": customer.get("customer_id"),
                "sites_count": len(sites),
                "gateways_count": gateways_count,
                "devices_count": devices_count,
            }
        )

    return result


def get_customer(customer_id: str) -> dict[str, Any] | None:
    customers_tree = build_customers_tree()
    return customers_tree.get(customer_id)


def get_sites_list() -> list[dict[str, Any]]:
    result = []

    customers_tree = build_customers_tree()

    for customer in customers_tree.values():
        customer_id = customer.get("customer_id")

        for site in customer.get("sites", {}).values():
            gateways = site.get("gateways", {})
            devices_count = 0

            for gateway in gateways.values():
                devices_count += len(gateway.get("devices", {}))

            result.append(
                {
                    "customer_id": customer_id,
                    "site_id": site.get("site_id"),
                    "gateways_count": len(gateways),
                    "devices_count": devices_count,
                }
            )

    return result


def get_site(site_id: str) -> dict[str, Any] | None:
    customers_tree = build_customers_tree()

    for customer in customers_tree.values():
        site = customer.get("sites", {}).get(site_id)
        if site:
            return {
                "customer_id": customer.get("customer_id"),
                **site,
            }

    return None


def get_active_events() -> list[dict[str, Any]]:
    events = []

    for device in get_all_devices():
        status = _to_int(device.get("status"))
        warning = _to_int(device.get("warning"))
        alarm = _to_int(device.get("alarm"))

        if status == 2 or alarm == 1:
            events.append(
                {
                    "level": "alarm",
                    "level_text": "Авария",
                    **device,
                }
            )
            continue

        if status == 1 or warning == 1:
            events.append(
                {
                    "level": "warning",
                    "level_text": "Предупреждение",
                    **device,
                }
            )

    return events


def get_dashboard_summary() -> dict[str, Any]:
    customers = get_customers_list()
    sites = get_sites_list()
    gateways = get_gateways_list()
    devices = get_all_devices()
    events = get_active_events()

    online = sum(1 for device in devices if device.get("connected") is True)
    offline = len(devices) - online

    warnings = sum(1 for event in events if event.get("level") == "warning")
    alarms = sum(1 for event in events if event.get("level") == "alarm")

    return {
        "customers_count": len(customers),
        "sites_count": len(sites),
        "gateways_count": len(gateways),
        "devices_count": len(devices),
        "online_devices": online,
        "offline_devices": offline,
        "warnings_count": warnings,
        "alarms_count": alarms,
    }
