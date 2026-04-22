import contextlib

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.mqtt_client import refresh_devices_online_status, start_mqtt, stop_mqtt
from app.state import DEVICES

app = FastAPI(title="GL Monitor Demo")

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")


def status_to_text(status: int | None) -> str:
    if status == 0:
        return "Норма"
    if status == 1:
        return "Предупреждение"
    if status == 2:
        return "Авария"
    return "Неизвестно"


def format_setpoint(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{value:.1f} бар"


@app.on_event("startup")
async def startup_event():
    start_mqtt()
    print("mqtt subscriber started")


@app.on_event("shutdown")
async def shutdown_event():
    with contextlib.suppress(Exception):
        stop_mqtt()


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


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
        "setpoint": format_setpoint(device.get("setpoint")),
        "last_seen": device.get("last_seen") or "—",
        "raw_topic": device.get("raw_topic") or "—",
        "raw_payload": device.get("raw_payload") or "—",
    }


@app.get("/api/devices/{device_id}/history")
async def get_device_history(device_id: str):
    refresh_devices_online_status()

    device = DEVICES.get(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Устройство не найдено")

    return device.get("history", [])
