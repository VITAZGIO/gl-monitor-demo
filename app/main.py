from contextlib import asynccontextmanager
from datetime import datetime
import asyncio
import random

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

def now_str():
    return datetime.now().strftime("%d.%m.%Y %H:%M:%S")

def create_device(device_id: str):
    input_pressure = round(random.uniform(3.5, 5.5), 1)
    system_pressure = round(max(0.0, input_pressure - random.uniform(0.2, 0.8)), 1)

    return {
        "device_id": device_id,
        "connected": True,
        "errors": "Нет",
        "input_pressure": input_pressure,
        "system_pressure": system_pressure,
        "last_updated": now_str(),
    }

DEVICES = {
    "GL-001": create_device("GL-001"),
    "GL-002": create_device("GL-002"),
    "GL-003": create_device("GL-003"),
    "GL-004": create_device("GL-004"),
    "GL-005": create_device("GL-005"),
}

def update_device(device: dict):
    # Иногда устройство теряет связь
    if device["connected"] and random.random() < 0.08:
        device["connected"] = False
        device["errors"] = "Нет связи"
        device["input_pressure"] = 0.0
        device["system_pressure"] = 0.0
        device["last_updated"] = now_str()
        return

    # Иногда связь восстанавливается
    if not device["connected"] and random.random() < 0.35:
        device["connected"] = True
        device["input_pressure"] = round(random.uniform(3.0, 5.5), 1)
        device["system_pressure"] = round(
            max(0.0, device["input_pressure"] - random.uniform(0.2, 0.8)), 1
        )
        device["errors"] = "Нет"
        device["last_updated"] = now_str()
        return

    # Если нет связи — просто обновим время
    if not device["connected"]:
        device["last_updated"] = now_str()
        return

    # Плавное изменение давления
    input_delta = random.uniform(-0.3, 0.3)
    system_delta = random.uniform(-0.3, 0.3)

    device["input_pressure"] = round(
        min(6.0, max(1.0, device["input_pressure"] + input_delta)), 1
    )
    device["system_pressure"] = round(
        min(5.8, max(0.8, device["system_pressure"] + system_delta)), 1
    )

    # Системное давление не должно быть сильно больше входного
    if device["system_pressure"] > device["input_pressure"]:
        device["system_pressure"] = round(
            max(0.0, device["input_pressure"] - random.uniform(0.1, 0.5)), 1
        )

    # Логика ошибок
    if device["input_pressure"] < 2.0:
        device["errors"] = "Предупреждение: низкое входное давление"
    elif device["system_pressure"] < 1.5:
        device["errors"] = "Предупреждение: низкое давление системы"
    elif random.random() < 0.07:
        device["errors"] = "Предупреждение: скачок давления"
    else:
        device["errors"] = "Нет"

    device["last_updated"] = now_str()

async def device_updater():
    while True:
        for device in DEVICES.values():
            update_device(device)
        await asyncio.sleep(3)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(device_updater())
    try:
        yield
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

import contextlib

app = FastAPI(title="GL Monitor Demo", lifespan=lifespan)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

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
        "last_updated": device["last_updated"],
    }