import asyncio
import contextlib

from fastapi import FastAPI, HTTPException

from app.config import COMPANY_API_URL, CUSTOMER_ID, GATEWAY_ID, SITE_ID
from app.exporter import EXPORT_STATE, export_loop, make_export_packet
from app.mqtt_client import refresh_devices_online_status, start_mqtt, stop_mqtt
from app.state import DEVICES

app = FastAPI(title="GL Monitor Customer Gateway")

export_task = None


def status_to_text(status: int | None) -> str:
    if status == 0:
        return "Норма"

    if status == 1:
        return "Предупреждение"

    if status == 2:
        return "Авария"

    return "Неизвестно"


def format_bar(value: float | None) -> str:
    if value is None:
        return "—"

    return f"{value:.1f} бар"


def format_celsius(value: float | None) -> str:
    if value is None:
        return "—"

    return f"{value:.1f} °C"


@app.on_event("startup")
async def startup_event():
    global export_task

    start_mqtt()
    export_task = asyncio.create_task(export_loop())

    print("gateway mqtt subscriber started")
    print("gateway exporter started")


@app.on_event("shutdown")
async def shutdown_event():
    global export_task

    if export_task:
        export_task.cancel()

    with contextlib.suppress(Exception):
        stop_mqtt()


@app.get("/")
async def root():
    return {
        "service": "GL Monitor Customer Gateway",
        "gateway_id": GATEWAY_ID,
        "customer_id": CUSTOMER_ID,
        "site_id": SITE_ID,
        "status": "running",
    }


@app.get("/api/devices")
async def get_devices():
    refresh_devices_online_status()
    return {"devices": sorted(DEVICES.keys())}


@app.get("/api/devices/{device_id}")
async def get_device_data(device_id: str):
    refresh_devices_online_status()

    device = DEVICES.get(device_id)

    if not device:
        raise HTTPException(status_code=404, detail="Устройство не найдено")

    return {
        "device_id": device.get("device_id") or device_id,
        "connected": bool(device.get("connected", False)),
        "status": device.get("status"),
        "status_text": status_to_text(device.get("status")),
        "setpoint": format_bar(device.get("setpoint")),
        "temperature": format_celsius(device.get("temperature")),
        "run": device.get("run"),
        "warning": device.get("warning"),
        "alarm": device.get("alarm"),
        "ack": device.get("ack"),
        "last_seen": device.get("last_seen") or "—",
        "raw_topic": device.get("raw_topic") or "—",
        "raw_payload": device.get("raw_payload") or "—",
        "alarm_history": device.get("alarm_history", []),
    }


@app.get("/api/devices/{device_id}/history")
async def get_device_history(device_id: str):
    refresh_devices_online_status()

    device = DEVICES.get(device_id)

    if not device:
        raise HTTPException(status_code=404, detail="Устройство не найдено")

    return device.get("history", [])


@app.get("/api/gateway/export")
async def get_gateway_export():
    return make_export_packet()


@app.get("/api/gateway/status")
async def get_gateway_status():
    refresh_devices_online_status()

    devices = list(DEVICES.values())
    online_devices = sum(1 for device in devices if device.get("connected"))
    offline_devices = len(devices) - online_devices

    return {
        "gateway_id": GATEWAY_ID,
        "customer_id": CUSTOMER_ID,
        "site_id": SITE_ID,
        "devices_count": len(devices),
        "online_devices": online_devices,
        "offline_devices": offline_devices,
        "company_api_url": COMPANY_API_URL,
        "last_export_at": EXPORT_STATE.get("last_export_at"),
        "last_export_ok": EXPORT_STATE.get("last_export_ok"),
        "last_export_error": EXPORT_STATE.get("last_export_error"),
    }
