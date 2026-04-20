import json
import os
from datetime import datetime

import paho.mqtt.client as mqtt

from app.state import ensure_device, add_history_point

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "devices/+/telemetry")

mqtt_client = None

def apply_telemetry(device_id: str, payload: dict):
    device = ensure_device(device_id)

    value = payload.get("system_pressure")
    if value is None:
        value = payload.get("setpoint", 0.0)

    timestamp = payload.get("timestamp") or datetime.now().isoformat(timespec="seconds")
    online = bool(payload.get("online", True))
    status = int(payload.get("status", 0))

    device["connected"] = online
    device["online"] = online
    device["status"] = status
    device["last_update"] = timestamp
    device["system_pressure"] = round(float(value), 1)

    device["input_pressure"] = round(
        float(payload.get("input_pressure", max(device["system_pressure"] + 0.5, 0.0))), 1
    )

    if not online:
        device["errors"] = "Нет связи"
    elif status == 0:
        device["errors"] = "Нет"
    else:
        device["errors"] = f"Статус {status}"

    add_history_point(device, device["system_pressure"], timestamp)

def on_connect(client, userdata, flags, rc, properties=None):
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        parts = msg.topic.split("/")
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
