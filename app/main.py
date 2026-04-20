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
    return {"devices": list(DEVICES.keys())}


@app.get("/api/devices/{device_id}")
async def get_device_data(device_id: str):
    refresh_devices_online_status()

    device = DEVICES.get(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Устройство не найдено")

    return {
        "device_id": device["device_id"],
        "connected": device["connected"],
        "status": device["status"],
        "setpoint": f'{device["setpoint"]:.1f} бар',
        "last_seen": device["last_seen"],
    }


@app.get("/api/devices/{device_id}/history")
async def get_device_history(device_id: str):
    refresh_devices_online_status()

    device = DEVICES.get(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Устройство не найдено")

    return device["history"]
