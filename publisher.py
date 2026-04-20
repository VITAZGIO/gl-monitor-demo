import json
import os
import random
import time
from datetime import datetime

import paho.mqtt.client as mqtt

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

DEVICES = ["GL-001", "GL-002", "GL-003"]

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(MQTT_HOST, MQTT_PORT, 60)
client.loop_start()

state = {
    device_id: {
        "value": round(random.uniform(2.5, 4.5), 1),
        "online": True,
        "status": 0,
    }
    for device_id in DEVICES
}

while True:
    for device_id in DEVICES:
        item = state[device_id]

        if random.random() < 0.05:
            item["online"] = not item["online"]

        if item["online"]:
            item["value"] = round(
                min(5.5, max(0.8, item["value"] + random.uniform(-0.3, 0.3))), 1
            )
            item["status"] = 0 if random.random() < 0.9 else 1
        else:
            item["value"] = 0.0
            item["status"] = 2

        payload = {
            "system_pressure": item["value"],
            "status": item["status"],
            "online": item["online"],
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        }

        client.publish(
            f"devices/{device_id}/telemetry",
            json.dumps(payload),
            qos=0,
            retain=False,
        )

    time.sleep(3)
