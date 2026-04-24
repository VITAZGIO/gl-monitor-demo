import asyncio
import logging
from datetime import datetime

import httpx

from app.config import (
    COMPANY_API_TOKEN,
    COMPANY_API_URL,
    CUSTOMER_ID,
    EXPORT_INTERVAL_SECONDS,
    GATEWAY_ID,
    SITE_ID,
)
from app.mqtt_client import refresh_devices_online_status
from app.state import APP_TZ, DEVICES

logger = logging.getLogger("gl-monitor.gateway.exporter")

EXPORT_STATE = {
    "last_export_at": None,
    "last_export_ok": False,
    "last_export_error": None,
}


def now_iso() -> str:
    return datetime.now(APP_TZ).isoformat(timespec="seconds")


def status_to_text(status: int | None) -> str:
    if status == 0:
        return "Норма"

    if status == 1:
        return "Предупреждение"

    if status == 2:
        return "Авария"

    return "Неизвестно"


def make_export_packet() -> dict:
    refresh_devices_online_status()

    devices = []

    for device in DEVICES.values():
        status = device.get("status")

        devices.append(
            {
                "device_id": device.get("device_id"),
                "connected": bool(device.get("connected", False)),
                "status": status,
                "status_text": status_to_text(status),
                "setpoint": device.get("setpoint"),
                "temperature": device.get("temperature"),
                "run": device.get("run"),
                "warning": device.get("warning"),
                "alarm": device.get("alarm"),
                "ack": device.get("ack"),
                "last_seen": device.get("last_seen"),
            }
        )

    return {
        "gateway_id": GATEWAY_ID,
        "customer_id": CUSTOMER_ID,
        "site_id": SITE_ID,
        "timestamp": now_iso(),
        "devices": devices,
    }


async def export_once() -> None:
    packet = make_export_packet()

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                COMPANY_API_URL,
                json=packet,
                headers={
                    "Authorization": f"Bearer {COMPANY_API_TOKEN}",
                    "Content-Type": "application/json",
                },
            )

            response.raise_for_status()

        EXPORT_STATE["last_export_at"] = now_iso()
        EXPORT_STATE["last_export_ok"] = True
        EXPORT_STATE["last_export_error"] = None

        logger.info(
            "Export OK: gateway=%s devices=%s",
            GATEWAY_ID,
            len(packet["devices"]),
        )

    except Exception as e:
        EXPORT_STATE["last_export_at"] = now_iso()
        EXPORT_STATE["last_export_ok"] = False
        EXPORT_STATE["last_export_error"] = str(e)

        logger.warning("Export failed: %s", e)


async def export_loop() -> None:
    while True:
        await export_once()
        await asyncio.sleep(EXPORT_INTERVAL_SECONDS)
