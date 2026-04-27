import json
import logging
import os
import re
from datetime import datetime

import paho.mqtt.client as mqtt

from app.state import (
    APP_TZ,
    DEVICES,
    OFFLINE_TIMEOUT_SECONDS,
    add_alarm_event,
    add_history_point,
    ensure_device,
)

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
logger = logging.getLogger("gl-monitor.gateway.mqtt")

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


def parse_float(payload: dict, field_name: str) -> float | None:
    if field_name not in payload:
        return None

    value = payload.get(field_name)

    if value is None:
        return None

    try:
        return round(float(value), 1)
    except (TypeError, ValueError):
        return None


def parse_int_flag(payload: dict, field_name: str) -> int | None:
    if field_name not in payload:
        return None

    value = payload.get(field_name)

    if value is None:
        return None

    if isinstance(value, bool):
        return 1 if value else 0

    if isinstance(value, int):
        return 1 if value != 0 else 0

    if isinstance(value, float):
        return 1 if int(value) != 0 else 0

    if isinstance(value, str):
        normalized = value.strip().lower()

        if normalized in {"1", "true", "on", "yes", "вкл"}:
            return 1

        if normalized in {"0", "false", "off", "no", "выкл"}:
            return 0

    return None


def parse_status(payload: dict) -> int | None:
    if "status" not in payload:
        return None

    value = payload.get("status")

    if value is None:
        return None

    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None

    if parsed in (0, 1, 2):
        return parsed

    return None


def derive_status(parsed_warning: int | None, parsed_alarm: int | None) -> int | None:
    if parsed_alarm == 1:
        return 2

    if parsed_warning == 1:
        return 1

    if parsed_alarm == 0 and parsed_warning == 0:
        return 0

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
            "MQTT skipped: invalid topic\n topic: %s\n payload: %s",
            topic,
            raw_payload,
        )
        return

    device_id = match.group("device_id")
    device = ensure_device(device_id)

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
            "MQTT skipped: payload is not object\n topic: %s\n payload: %s",
            topic,
            raw_payload,
        )
        return

    if not payload:
        logger.warning(
            "MQTT skipped: empty payload object\n topic: %s\n payload: %s",
            topic,
            raw_payload,
        )
        return

    parsed_setpoint = parse_float(payload, "setpoint")
    parsed_temperature = parse_float(payload, "temperature")

    parsed_run = parse_int_flag(payload, "run")
    parsed_warning = parse_int_flag(payload, "warning")
    parsed_alarm = parse_int_flag(payload, "alarm")
    parsed_ack = parse_int_flag(payload, "ack")

    parsed_status = parse_status(payload)

    if parsed_status is None:
        parsed_status = derive_status(parsed_warning, parsed_alarm)

    has_any_valid_field = any(
        value is not None
        for value in (
            parsed_setpoint,
            parsed_temperature,
            parsed_run,
            parsed_warning,
            parsed_alarm,
            parsed_ack,
            parsed_status,
        )
    )

    if not has_any_valid_field:
        logger.warning(
            "MQTT skipped: no valid fields\n topic: %s\n payload: %s",
            topic,
            raw_payload,
        )
        return

    previous_latched_alarm = 1 if device.get("alarm") == 1 else 0
    latched_alarm = previous_latched_alarm

    timestamp = now_iso()

    device["last_seen"] = timestamp
    device["connected"] = True

    if parsed_setpoint is not None:
        device["setpoint"] = parsed_setpoint
        add_history_point(device, parsed_setpoint, timestamp)

    if parsed_temperature is not None:
        device["temperature"] = parsed_temperature

    if parsed_run is not None:
        device["run"] = parsed_run

    if parsed_warning is not None:
        device["warning"] = parsed_warning

    if parsed_ack is not None:
        device["ack"] = parsed_ack

    # Защёлка аварии:
    # 1. Если пришёл alarm=1 — фиксируем аварию.
    # 2. Если физический alarm потом стал 0 — авария всё равно остаётся.
    # 3. Сбрасываем только по ack=1, когда alarm уже 0.
    if parsed_alarm is not None:
        device["raw_alarm"] = parsed_alarm

        if parsed_alarm == 1:
            latched_alarm = 1

        elif parsed_alarm == 0 and parsed_ack == 1:
            latched_alarm = 0

    elif parsed_ack == 1:
        latched_alarm = 0

    if latched_alarm == 1 and previous_latched_alarm != 1:
        add_alarm_event(device, timestamp)

    if parsed_alarm is not None or parsed_ack is not None:
        device["alarm"] = latched_alarm

    # Итоговый статус считаем уже по защёлкнутой аварии.
    # Авария имеет максимальный приоритет.
    if device.get("alarm") == 1:
        device["status"] = 2

    elif device.get("warning") == 1:
        device["status"] = 1

    elif parsed_status is not None:
        device["status"] = parsed_status

    elif parsed_alarm is not None or parsed_warning is not None or parsed_ack is not None:
        device["status"] = 0

    logger.info(
        "MQTT received:\n"
        " topic: %s\n"
        " payload: %s\n"
        " parsed: setpoint=%s status=%s temperature=%s run=%s warning=%s alarm=%s ack=%s latched_alarm=%s",
        topic,
        raw_payload,
        parsed_setpoint,
        device.get("status"),
        parsed_temperature,
        parsed_run,
        parsed_warning,
        parsed_alarm,
        parsed_ack,
        device.get("alarm"),
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
