import json
import os
from datetime import datetime

import paho.mqtt.client as mqtt

from app.state import DEVICES, OFFLINE_TIMEOUT_SECONDS, add_history_point, ensure_device

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "devices/+/telemetry")

mqtt_client = None


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def refresh_devices_online_status() -> None:
    now = datetime.now()

    for device in DEVICES.values():
        last_seen_str = device.get("last_seen")
        last_seen_dt = parse_iso_datetime(last_seen_str)

        if last_seen_dt is None:
            device["connected"] = False
            continue

        diff = (now - last_seen_dt).total_seconds()
        device["connected"] = diff <= OFFLINE_TIMEOUT_SECONDS


def apply_telemetry(device_id: str, payload: dict) -> None:
    device = ensure_device(device_id)

    setpoint = round(float(payload.get("setpoint", 0.0)), 1)
    status = int(payload.get("status", 0))
    timestamp = datetime.now().isoformat(timespec="seconds")

    device["status"] = status
    device["setpoint"] = setpoint
    device["last_seen"] = timestamp
    device["connected"] = True

    add_history_point(device, setpoint, timestamp)


def on_connect(client, userdata, flags, rc, properties=None):
    client.subscribe(MQTT_TOPIC)
    print(f"MQTT subscribed to: {MQTT_TOPIC}")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        parts = msg.topic.split("/")

        if len(parts) < 3:
            raise ValueError(f"Invalid topic: {msg.topic}")

        device_id = parts[1]
        apply_telemetry(device_id, payload)

        print(f"MQTT received: {msg.topic} -> {payload}")
    except Exception as e:
        print(f"MQTT message error: {e}")


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
