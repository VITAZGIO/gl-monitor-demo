import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.state import (
    get_all_devices,
    get_device_by_id,
    get_gateways_list,
    save_gateway_packet,
)

app = FastAPI(title="GL Monitor Company Server")

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

COMPANY_API_TOKEN = os.getenv("COMPANY_API_TOKEN", "demo-token")


def check_auth(authorization: str | None) -> None:
    if authorization != f"Bearer {COMPANY_API_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/ingest/gateway")
async def ingest_gateway(
    request: Request,
    authorization: str | None = Header(default=None),
):
    check_auth(authorization)

    packet: dict[str, Any] = await request.json()

    gateway_id = packet.get("gateway_id")
    if not gateway_id:
        raise HTTPException(status_code=400, detail="gateway_id is required")

    devices = packet.get("devices", [])
    if not isinstance(devices, list):
        raise HTTPException(status_code=400, detail="devices must be list")

    save_gateway_packet(packet)

    return {
        "status": "ok",
        "gateway_id": gateway_id,
        "devices_count": len(devices),
    }


@app.get("/api/gateways")
async def api_gateways():
    return {"gateways": get_gateways_list()}


@app.get("/api/devices")
async def api_devices():
    return {"devices": get_all_devices()}


@app.get("/api/devices/{device_id}")
async def api_device(device_id: str):
    device = get_device_by_id(device_id)

    if not device:
        raise HTTPException(status_code=404, detail="Устройство не найдено")

    return device
