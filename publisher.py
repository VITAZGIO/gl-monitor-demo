import json
import os
import random
import time

import paho.mqtt.client as mqtt

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
DEVICE_ID = os.getenv("DEVICE_ID", "ESP32-DEMO-001")
PUBLISH_INTERVAL = float(os.getenv("PUBLISH_INTERVAL", "5"))

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(MQTT_HOST, MQTT_PORT, 60)
client.loop_start()

temperature = round(random.uniform(19.0, 23.0), 1)
run = 0
warning = 0
alarm = 0
ack = 0

try:
    while True:
        temperature = round(
            min(35.0, max(10.0, temperature + random.uniform(-0.3, 0.3))),
            1,
        )

        setpoint = round(temperature / 6.0, 1)

        if random.random() < 0.06:
            run = 1 - run

        if random.random() < 0.06:
            warning = 1 - warning

        if random.random() < 0.04:
            alarm = 1 - alarm

        if random.random() < 0.08:
            ack = 1
        else:
            ack = 0

        if alarm == 1:
            status = "2"
        elif warning == 1:
            status = "1"
        else:
            status = "0"

        payload = {
            "setpoint": setpoint,
            "status": status,
            "run": run,
            "warning": warning,
            "alarm": alarm,
            "ack": ack,
            "temperature": temperature,
        }

        topic = f"devices/{DEVICE_ID}/telemetry"

        client.publish(
            topic,
            json.dumps(payload, ensure_ascii=False),
            qos=0,
            retain=False,
        )

        print(f"Published: {topic} -> {payload}")

        time.sleep(PUBLISH_INTERVAL)

except KeyboardInterrupt:
    print("Publisher stopped")

finally:
    client.loop_stop()
    client.disconnect()
