import json
import os
from datetime import datetime
from zoneinfo import ZoneInfo

import paho.mqtt.client as mqtt

from app.state import DEVICES, OFFLINE_TIMEOUT_SECONDS, add_history_point, ensure_device

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "devices/+/telemetry")

MOSCOW_TZ = ZoneInfo("Europe/Moscow")

mqtt_client = None


def now_dt() -> datetime:
    return datetime.now(MOSCOW_TZ)


def now_iso() -> str:
    return now_dt().isoformat(timespec="seconds")


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=MOSCOW_TZ)
        return dt
    except ValueError:
        return None


def parse_setpoint(payload: dict) -> float | None:
    value = payload.get("setpoint")

    if value is None:
        return None

    try:
        return round(float(value), 1)
    except (TypeError, ValueError):
        return None


def parse_status(payload: dict) -> int | None:
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


def apply_telemetry(device_id: str, topic: str, raw_payload: str, payload: dict) -> None:
    device = ensure_device(device_id)

    parsed_setpoint = parse_setpoint(payload)
    parsed_status = parse_status(payload)
    timestamp = now_iso()

    device["raw_topic"] = topic
    device["raw_payload"] = raw_payload
    device["last_seen"] = timestamp
    device["connected"] = True

    if parsed_status is not None:
        device["status"] = parsed_status

    if parsed_setpoint is not None:
        device["setpoint"] = parsed_setpoint
        add_history_point(device, parsed_setpoint, timestamp)

    print("MQTT received:")
    print(f"  topic: {topic}")
    print(f"  payload: {raw_payload}")
    print(f"  parsed: setpoint={parsed_setpoint} status={parsed_status}")


def on_connect(client, userdata, flags, rc, properties=None):
    client.subscribe(MQTT_TOPIC)
    print(f"MQTT subscribed to: {MQTT_TOPIC}")


def on_message(client, userdata, msg):
    topic = msg.topic
    raw_payload = msg.payload.decode("utf-8", errors="replace")

    parts = topic.split("/")
    if len(parts) < 3:
        print("MQTT message skipped: invalid topic")
        print(f"  topic: {topic}")
        print(f"  payload: {raw_payload}")
        return

    device_id = parts[1]
    device = ensure_device(device_id)
    device["raw_topic"] = topic
    device["raw_payload"] = raw_payload

    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError as e:
        print("MQTT JSON error:")
        print(f"  topic: {topic}")
        print(f"  payload: {raw_payload}")
        print(f"  error: {e}")
        return

    if not isinstance(payload, dict):
        print("MQTT message skipped: payload is not JSON object")
        print(f"  topic: {topic}")
        print(f"  payload: {raw_payload}")
        return

    try:
        apply_telemetry(device_id, topic, raw_payload, payload)
    except Exception as e:
        print("MQTT message error:")
        print(f"  topic: {topic}")
        print(f"  payload: {raw_payload}")
        print(f"  error: {e}")


def start_mqtt():
    global mqtt_client

    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message

    mqtt_client.connect(MQTT_HOST, MQTT_PORT, 60)
    mqtt_client.loop_start()


def stop_mqtt():
    global mqtt_client

    if mqtt_client is not None:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
