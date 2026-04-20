from datetime import datetime

HISTORY_LIMIT = 40
OFFLINE_TIMEOUT_SECONDS = 10


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def make_history_point(value: float, timestamp: str | None = None) -> dict:
    return {
        "timestamp": timestamp or now_iso(),
        "value": round(float(value), 1),
    }


def create_empty_device(device_id: str) -> dict:
    return {
        "device_id": device_id,
        "connected": False,
        "status": 0,
        "setpoint": 0.0,
        "last_seen": None,
        "history": [],
    }


DEVICES = {
    "GL-001": create_empty_device("GL-001"),
    "GL-002": create_empty_device("GL-002"),
    "GL-003": create_empty_device("GL-003"),
}


def ensure_device(device_id: str) -> dict:
    if device_id not in DEVICES:
        DEVICES[device_id] = create_empty_device(device_id)
    return DEVICES[device_id]


def add_history_point(device: dict, value: float, timestamp: str | None = None) -> None:
    device["history"].append(make_history_point(value, timestamp))
    if len(device["history"]) > HISTORY_LIMIT:
        device["history"] = device["history"][-HISTORY_LIMIT:]
