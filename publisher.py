import json
import os
import random
import time

import paho.mqtt.client as mqtt

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
DEVICES = ["GL-001", "GL-002", "GL-003"]

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(MQTT_HOST, MQTT_PORT, 60)
client.loop_start()

state = {
    device_id: {
        "setpoint": round(random.uniform(2.5, 4.5), 1),
        "enabled": True,
        "status": 0,
    }
    for device_id in DEVICES
}

while True:
    for device_id in DEVICES:
        item = state[device_id]

        if random.random() < 0.05:
            item["enabled"] = not item["enabled"]

        if item["enabled"]:
            item["setpoint"] = round(
                min(5.5, max(0.8, item["setpoint"] + random.uniform(-0.3, 0.3))),
                1,
            )
            item["status"] = 0 if random.random() < 0.9 else 1

            payload = {
                "setpoint": item["setpoint"],
                "status": str(item["status"]),
            }

            client.publish(
                f"devices/{device_id}/telemetry",
                json.dumps(payload),
                qos=0,
                retain=False,
            )

            print(f"Published: devices/{device_id}/telemetry -> {payload}")
        else:
            print(f"Skipped publish for {device_id} (simulate offline)")

        time.sleep(3)
