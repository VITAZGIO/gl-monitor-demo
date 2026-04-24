import os
from datetime import datetime
from zoneinfo import ZoneInfo

APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Europe/Berlin")
APP_TZ = ZoneInfo(APP_TIMEZONE)

HISTORY_LIMIT = 40
ALARM_HISTORY_LIMIT = 20
OFFLINE_TIMEOUT_SECONDS = 10


def now_iso() -> str:
    return datetime.now(APP_TZ).isoformat(timespec="seconds")


def make_history_point(value: float, timestamp: str | None = None) -> dict:
    return {
        "timestamp": timestamp or now_iso(),
        "value": round(float(value), 1),
    }


def make_alarm_event(timestamp: str | None = None) -> dict:
    return {
        "timestamp": timestamp or now_iso(),
    }


def create_empty_device(device_id: str) -> dict:
    return {
        "device_id": device_id,
        "connected": False,
        "status": None,
        "setpoint": None,
        "temperature": None,
        "run": None,
        "warning": None,
        "alarm": None,
        "ack": None,
        "last_seen": None,
        "raw_topic": "",
        "raw_payload": "",
        "history": [],
        "alarm_history": [],
    }


DEVICES: dict[str, dict] = {}


def ensure_device(device_id: str) -> dict:
    if device_id not in DEVICES:
        DEVICES[device_id] = create_empty_device(device_id)
    return DEVICES[device_id]


def add_history_point(device: dict, value: float, timestamp: str | None = None) -> None:
    device["history"].append(make_history_point(value, timestamp))
    if len(device["history"]) > HISTORY_LIMIT:
        device["history"] = device["history"][-HISTORY_LIMIT:]


def add_alarm_event(device: dict, timestamp: str | None = None) -> None:
    device["alarm_history"].append(make_alarm_event(timestamp))
    if len(device["alarm_history"]) > ALARM_HISTORY_LIMIT:
        device["alarm_history"] = device["alarm_history"][-ALARM_HISTORY_LIMIT:]
