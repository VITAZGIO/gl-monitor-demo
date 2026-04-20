from datetime import datetime

HISTORY_LIMIT = 40


def make_history_point(value: float, timestamp: str | None = None):
    return {
        "timestamp": timestamp or datetime.now().isoformat(timespec="seconds"),
        "value": round(float(value), 1),
    }


def create_empty_device(device_id: str):
    return {
        "device_id": device_id,
        "connected": False,
        "errors": "Нет данных",
        "input_pressure": 0.0,
        "system_pressure": 0.0,
        "history": [],
        "last_update": None,
        "status": 0,
        "online": False,
    }


DEVICES = {
    "GL-001": create_empty_device("GL-001"),
    "GL-002": create_empty_device("GL-002"),
    "GL-003": create_empty_device("GL-003"),
}


def ensure_device(device_id: str):
    if device_id not in DEVICES:
        DEVICES[device_id] = create_empty_device(device_id)
    return DEVICES[device_id]


def add_history_point(device: dict, value: float, timestamp: str | None = None):
    device["history"].append(make_history_point(value, timestamp))
    if len(device["history"]) > HISTORY_LIMIT:
        device["history"] = device["history"][-HISTORY_LIMIT:]
