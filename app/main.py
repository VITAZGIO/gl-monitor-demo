from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import random

app = FastAPI(title="GL Monitor Demo")

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

DEVICES = {
    "GL-001": {
        "connected": True,
        "errors": "Нет",
        "input_pressure": "4.2 бар",
        "system_pressure": "3.6 бар"
    },
    "GL-002": {
        "connected": False,
        "errors": "Нет связи",
        "input_pressure": "0.0 бар",
        "system_pressure": "0.0 бар"
    },
    "GL-003": {
        "connected": True,
        "errors": "Предупреждение: низкое давление",
        "input_pressure": "2.1 бар",
        "system_pressure": "1.7 бар"
    }
}

def generate_gl004():
    connected = random.choice([True, False])
    input_pressure = round(random.uniform(1.0, 6.0), 1) if connected else 0.0
    system_pressure = round(random.uniform(0.8, 5.5), 1) if connected else 0.0

    if not connected:
        errors = "Нет связи"
    else:
        errors = random.choice([
            "Нет",
            "Нет",
            "Нет",
            "Предупреждение: скачок давления",
            "Предупреждение: низкое давление"
        ])

    return {
        "connected": connected,
        "errors": errors,
        "input_pressure": f"{input_pressure} бар",
        "system_pressure": f"{system_pressure} бар"
    }

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/devices")
async def get_devices():
    devices = list(DEVICES.keys()) + ["GL-004"]
    return {"devices": devices}

@app.get("/api/devices/{device_id}")
async def get_device_data(device_id: str):
    if device_id == "GL-004":
        return {
            "device_id": device_id,
            **generate_gl004()
        }

    device = DEVICES.get(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Устройство не найдено")

    return {
        "device_id": device_id,
        **device
    }