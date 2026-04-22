import json
import os
import random
import time

import paho.mqtt.client as mqtt

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
DEVICE_ID = os.getenv("DEVICE_ID", "ESP32-DEMO-001")
PUBLISH_INTERVAL = float(os.getenv("PUBLISH_INTERVAL", "3"))

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(MQTT_HOST, MQTT_PORT, 60)
client.loop_start()

setpoint = round(random.uniform(4.5, 6.0), 1)
online = True

try:
    while True:
        if random.random() < 0.08:
            online = not online

        if online:
            setpoint = round(
                min(6.5, max(3.0, setpoint + random.uniform(-0.3, 0.3))),
                1,
            )

            roll = random.random()
            if roll < 0.75:
                status = 0
            elif roll < 0.92:
                status = 1
            else:
                status = 2

            payload = {
                "setpoint": setpoint,
                "status": str(status),
            }

            topic = f"devices/{DEVICE_ID}/telemetry"

            client.publish(
                topic,
                json.dumps(payload),
                qos=0,
                retain=False,
            )

            print(f"Published: {topic} -> {payload}")
        else:
            print(f"Skipped publish for {DEVICE_ID} (simulate offline)")

        time.sleep(PUBLISH_INTERVAL)

except KeyboardInterrupt:
    print("Publisher stopped")

finally:
    client.loop_stop()
    client.disconnect()
