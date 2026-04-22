import json
import logging
import os
import re
from datetime import datetime
from zoneinfo import ZoneInfo

import paho.mqtt.client as mqtt

from app.state import DEVICES, OFFLINE_TIMEOUT_SECONDS, add_history_point, ensure_device

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
logger = logging.getLogger("gl-monitor.mqtt")

APP_TIMEZONE = os.getenv("APP_TIMEZONE", "UTC")
APP_TZ = ZoneInfo(APP_TIMEZONE)

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "devices/+/telemetry")

TOPIC_PATTERN = re.compile(r"^devices/(?P<device_id>[^/]+)/telemetry$")

mqtt_client: mqtt.Client | None = None


def now_dt() -> datetime:
    return datetime.now(APP_TZ)


def now_iso() -> str:
    return now_dt().isoformat(timespec="seconds")


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return None

    if dt.tzinfo is None:
        return dt.replace(tzinfo=APP_TZ)

    return dt


def parse_setpoint(payload: dict) -> float | None:
    if "setpoint" not in payload:
        return None

    value = payload.get("setpoint")
    if value is None:
        return None

    try:
        return round(float(value), 1)
    except (TypeError, ValueError):
        return None


def parse_status(payload: dict) -> int | None:
    if "status" not in payload:
        return None

    value = payload.get("status")
    if value is None:
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def refresh_devices_online_status() -> None:
    now = now_dt()

    for device in DEVICES.values():
        last_seen_str = device.get("last_seen")
        last_seen_dt = parse_iso_datetime(last_seen_str)

        if last_seen_dt is None:
            device["connected"] = False
            continue

        diff = (now - last_seen_dt).total_seconds()
        device["connected"] = diff <= OFFLINE_TIMEOUT_SECONDS


def on_connect(client, userdata, flags, reason_code, properties=None):
    client.subscribe(MQTT_TOPIC)
    logger.info("MQTT subscribed to: %s", MQTT_TOPIC)


def on_message(client, userdata, msg):
    topic = msg.topic
    raw_payload = msg.payload.decode("utf-8", errors="replace")

    match = TOPIC_PATTERN.match(topic)
    if not match:
        logger.warning(
            "MQTT message skipped: invalid topic\n topic: %s\n payload: %s",
            topic,
            raw_payload,
        )
        return

    device_id = match.group("device_id")
    device = ensure_device(device_id)

    # debug сохраняем всегда для валидного device topic
    device["raw_topic"] = topic
    device["raw_payload"] = raw_payload

    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError as e:
        logger.warning(
            "MQTT JSON error\n topic: %s\n payload: %s\n error: %s",
            topic,
            raw_payload,
            e,
        )
        return

    if not isinstance(payload, dict):
        logger.warning(
            "MQTT message skipped: payload is not JSON object\n topic: %s\n payload: %s",
            topic,
            raw_payload,
        )
        return

    if not payload:
        logger.warning(
            "MQTT message skipped: empty JSON object\n topic: %s\n payload: %s",
            topic,
            raw_payload,
        )
        return

    parsed_setpoint = parse_setpoint(payload)
    parsed_status = parse_status(payload)

    has_any_valid_field = parsed_setpoint is not None or parsed_status is not None
    if not has_any_valid_field:
        logger.warning(
            "MQTT message skipped: no valid supported fields\n topic: %s\n payload: %s",
            topic,
            raw_payload,
        )
        return

    timestamp = now_iso()
    device["last_seen"] = timestamp
    device["connected"] = True

    if parsed_setpoint is not None:
        device["setpoint"] = parsed_setpoint
        add_history_point(device, parsed_setpoint, timestamp)

    if parsed_status is not None:
        device["status"] = parsed_status

    logger.info(
        "MQTT received:\n topic: %s\n payload: %s\n parsed: setpoint=%s status=%s",
        topic,
        raw_payload,
        parsed_setpoint,
        parsed_status,
    )

    invalid_fields: list[str] = []
    if "setpoint" in payload and parsed_setpoint is None:
        invalid_fields.append("setpoint")
    if "status" in payload and parsed_status is None:
        invalid_fields.append("status")

    if invalid_fields:
        logger.warning(
            "MQTT message had invalid fields: %s\n topic: %s\n payload: %s",
            ", ".join(invalid_fields),
            topic,
            raw_payload,
        )


def start_mqtt():
    global mqtt_client

    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    mqtt_client.reconnect_delay_set(min_delay=1, max_delay=10)
    mqtt_client.connect_async(MQTT_HOST, MQTT_PORT, 60)
    mqtt_client.loop_start()

    logger.info(
        "MQTT client started: host=%s port=%s topic=%s",
        MQTT_HOST,
        MQTT_PORT,
        MQTT_TOPIC,
    )


def stop_mqtt():
    global mqtt_client

    if mqtt_client is not None:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        mqtt_client = None
