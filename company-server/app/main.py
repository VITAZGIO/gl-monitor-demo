import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.state import (
    get_active_events,
    get_all_devices,
    get_customer,
    get_customers_list,
    get_dashboard_summary,
    get_device_alarm_history,
    get_device_by_id,
    get_device_history,
    get_devices_by_gateway,
    get_gateways_list,
    get_site,
    get_sites_list,
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
    return templates.TemplateResponse(
        request=request,
        name="index.html",
    )


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


@app.get("/api/dashboard/summary")
async def api_dashboard_summary():
    return get_dashboard_summary()


@app.get("/api/customers")
async def api_customers():
    return {"customers": get_customers_list()}


@app.get("/api/customers/{customer_id}")
async def api_customer(customer_id: str):
    customer = get_customer(customer_id)

    if not customer:
        raise HTTPException(status_code=404, detail="Заказчик не найден")

    return customer


@app.get("/api/sites")
async def api_sites():
    return {"sites": get_sites_list()}


@app.get("/api/sites/{site_id}")
async def api_site(site_id: str):
    site = get_site(site_id)

    if not site:
        raise HTTPException(status_code=404, detail="Объект не найден")

    return site


@app.get("/api/gateways")
async def api_gateways():
    return {"gateways": get_gateways_list()}


@app.get("/api/gateways/{gateway_id}/devices")
async def api_gateway_devices(gateway_id: str):
    return {"devices": get_devices_by_gateway(gateway_id)}


@app.get("/api/devices")
async def api_devices():
    return {"devices": get_all_devices()}


@app.get("/api/devices/{device_id}")
async def api_device(device_id: str):
    device = get_device_by_id(device_id)

    if not device:
        raise HTTPException(status_code=404, detail="Устройство не найдено")

    return device


@app.get("/api/devices/{device_id}/history")
async def api_device_history(device_id: str):
    return {"history": get_device_history(device_id)}


@app.get("/api/devices/{device_id}/alarm-history")
async def api_device_alarm_history(device_id: str):
    return {"alarm_history": get_device_alarm_history(device_id)}


@app.get("/api/alarms")
async def api_alarms():
    return {"alarms": get_active_events()}
