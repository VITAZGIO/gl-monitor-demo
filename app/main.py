import asyncio
import contextlib
import random
from datetime import datetime

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI(title="GL Monitor Demo")

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

updater_task = None
HISTORY_LIMIT = 40

def make_history_point(value: float):
    return {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "value": round(value, 1),
    }

def add_history_point(device: dict):
    device["history"].append(make_history_point(device["system_pressure"]))

    if len(device["history"]) > HISTORY_LIMIT:
        device["history"] = device["history"][-HISTORY_LIMIT:]

def create_device(device_id: str):
    input_pressure = round(random.uniform(3.5, 5.5), 1)
    system_pressure = round(max(0.0, input_pressure - random.uniform(0.2, 0.8)), 1)

    device = {
        "device_id": device_id,
        "connected": True,
        "errors": "Нет",
        "input_pressure": input_pressure,
        "system_pressure": system_pressure,
        "history": [],
    }

    add_history_point(device)
    return device

DEVICES = {
    "GL-001": create_device("GL-001"),
    "GL-002": create_device("GL-002"),
    "GL-003": create_device("GL-003"),
    "GL-004": create_device("GL-004"),
    "GL-005": create_device("GL-005"),
}

def update_device(device: dict):
    if device["connected"] and random.random() < 0.08:
        device["connected"] = False
        device["errors"] = "Нет связи"
        device["input_pressure"] = 0.0
        device["system_pressure"] = 0.0
        add_history_point(device)
        return

    if not device["connected"] and random.random() < 0.35:
        device["connected"] = True
        device["input_pressure"] = round(random.uniform(3.0, 5.5), 1)
        device["system_pressure"] = round(
            max(0.0, device["input_pressure"] - random.uniform(0.2, 0.8)), 1
        )
        device["errors"] = "Нет"
        add_history_point(device)
        return

    if not device["connected"]:
        add_history_point(device)
        return

    device["input_pressure"] = round(
        min(6.0, max(1.0, device["input_pressure"] + random.uniform(-0.3, 0.3))), 1
    )
    device["system_pressure"] = round(
        min(5.8, max(0.8, device["system_pressure"] + random.uniform(-0.3, 0.3))), 1
    )

    if device["system_pressure"] > device["input_pressure"]:
        device["system_pressure"] = round(
            max(0.0, device["input_pressure"] - random.uniform(0.1, 0.5)), 1
        )

    if device["input_pressure"] < 2.0:
        device["errors"] = "Предупреждение: низкое входное давление"
    elif device["system_pressure"] < 1.5:
        device["errors"] = "Предупреждение: низкое давление системы"
    elif random.random() < 0.07:
        device["errors"] = "Предупреждение: скачок давления"
    else:
        device["errors"] = "Нет"

    add_history_point(device)

async def device_updater():
    while True:
        for device in DEVICES.values():
            update_device(device)
        await asyncio.sleep(3)

@app.on_event("startup")
async def startup_event():
    global updater_task
    updater_task = asyncio.create_task(device_updater())
    print("device_updater started")

@app.on_event("shutdown")
async def shutdown_event():
    global updater_task
    if updater_task:
        updater_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await updater_task

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/devices")
async def get_devices():
    return {"devices": list(DEVICES.keys())}

@app.get("/api/devices/{device_id}")
async def get_device_data(device_id: str):
    device = DEVICES.get(device_id)

    if not device:
        raise HTTPException(status_code=404, detail="Устройство не найдено")

    return {
        "device_id": device["device_id"],
        "connected": device["connected"],
        "errors": device["errors"],
        "input_pressure": f'{device["input_pressure"]:.1f} бар',
        "system_pressure": f'{device["system_pressure"]:.1f} бар',
    }

@app.get("/api/devices/{device_id}/history")
async def get_device_history(device_id: str):
    device = DEVICES.get(device_id)

    if not device:
        raise HTTPException(status_code=404, detail="Устройство не найдено")

    return device["history"]