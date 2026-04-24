const gatewaysData = document.getElementById("gatewaysData");
const devicesData = document.getElementById("devicesData");

const POLL_INTERVAL_MS = 3000;

function escapeHtml(value) {
    return String(value ?? "—")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
    if (!value || value === "—") return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);

    return date.toLocaleString("ru-RU");
}

function flagText(value, onText = "Вкл", offText = "Выкл") {
    if (value === 1) return onText;
    if (value === 0) return offText;
    return "—";
}

function statusClass(status) {
    if (status === 2) return "bad";
    if (status === 1) return "warn";
    if (status === 0) return "ok";
    return "";
}

function renderGateways(gateways) {
    if (!Array.isArray(gateways) || gateways.length === 0) {
        gatewaysData.innerHTML = `<div class="placeholder">Gateway пока не подключался</div>`;
        return;
    }

    gatewaysData.innerHTML = gateways.map((gateway) => `
        <div class="gateway-card">
            <div class="kv-grid">
                <div class="kv-item">
                    <div class="kv-label">Gateway</div>
                    <div class="kv-value">${escapeHtml(gateway.gateway_id)}</div>
                </div>

                <div class="kv-item">
                    <div class="kv-label">Заказчик</div>
                    <div class="kv-value">${escapeHtml(gateway.customer_id)}</div>
                </div>

                <div class="kv-item">
                    <div class="kv-label">Объект</div>
                    <div class="kv-value">${escapeHtml(gateway.site_id)}</div>
                </div>

                <div class="kv-item">
                    <div class="kv-label">Устройств</div>
                    <div class="kv-value">${escapeHtml(gateway.devices_count)}</div>
                </div>

                <div class="kv-item">
                    <div class="kv-label">Последняя отправка gateway</div>
                    <div class="kv-value">${escapeHtml(formatDateTime(gateway.last_seen))}</div>
                </div>
            </div>
        </div>
    `).join("");
}

function renderDevices(devices) {
    if (!Array.isArray(devices) || devices.length === 0) {
        devicesData.innerHTML = `<div class="placeholder">Данных от устройств пока нет</div>`;
        return;
    }

    devicesData.innerHTML = devices.map((device) => {
        const connectedClass = device.connected ? "ok" : "bad";
        const connectedText = device.connected ? "Да" : "Нет";

        return `
            <div class="device-card card">
                <h2>${escapeHtml(device.device_id)}</h2>

                <div class="kv-grid">
                    <div class="kv-item">
                        <div class="kv-label">Заказчик</div>
                        <div class="kv-value">${escapeHtml(device.customer_id)}</div>
                    </div>

                    <div class="kv-item">
                        <div class="kv-label">Объект</div>
                        <div class="kv-value">${escapeHtml(device.site_id)}</div>
                    </div>

                    <div class="kv-item">
                        <div class="kv-label">Gateway</div>
                        <div class="kv-value">${escapeHtml(device.gateway_id)}</div>
                    </div>

                    <div class="kv-item">
                        <div class="kv-label">Подключено</div>
                        <div class="kv-value ${connectedClass}">${connectedText}</div>
                    </div>

                    <div class="kv-item">
                        <div class="kv-label">Статус</div>
                        <div class="kv-value ${statusClass(device.status)}">${escapeHtml(device.status_text || "Неизвестно")}</div>
                    </div>

                    <div class="kv-item">
                        <div class="kv-label">Уставка давления</div>
                        <div class="kv-value">${escapeHtml(device.setpoint)} бар</div>
                    </div>

                    <div class="kv-item">
                        <div class="kv-label">Температура</div>
                        <div class="kv-value">${escapeHtml(device.temperature)} °C</div>
                    </div>

                    <div class="kv-item">
                        <div class="kv-label">Запуск</div>
                        <div class="kv-value">${escapeHtml(flagText(device.run))}</div>
                    </div>

                    <div class="kv-item">
                        <div class="kv-label">Предупреждение</div>
                        <div class="kv-value ${device.warning === 1 ? "warn" : ""}">${escapeHtml(flagText(device.warning))}</div>
                    </div>

                    <div class="kv-item">
                        <div class="kv-label">Авария</div>
                        <div class="kv-value ${device.alarm === 1 ? "bad" : ""}">${escapeHtml(flagText(device.alarm))}</div>
                    </div>

                    <div class="kv-item">
                        <div class="kv-label">Сброс аварии</div>
                        <div class="kv-value ${device.ack === 1 ? "ack" : ""}">${escapeHtml(flagText(device.ack, "Нажата", "Не нажата"))}</div>
                    </div>

                    <div class="kv-item">
                        <div class="kv-label">Последнее сообщение ESP</div>
                        <div class="kv-value">${escapeHtml(formatDateTime(device.last_seen))}</div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

async function loadGateways() {
    const res = await fetch(`/api/gateways?t=${Date.now()}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error("Не удалось загрузить gateway");
    }

    const data = await res.json();
    renderGateways(data.gateways);
}

async function loadDevices() {
    const res = await fetch(`/api/devices?t=${Date.now()}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error("Не удалось загрузить устройства");
    }

    const data = await res.json();
    renderDevices(data.devices);
}

async function refreshAll() {
    try {
        await loadGateways();
        await loadDevices();
    } catch (error) {
        console.error(error);
        gatewaysData.innerHTML = `<div class="error-box">Ошибка связи с сервером фирмы</div>`;
        devicesData.innerHTML = `<div class="error-box">Ошибка загрузки устройств</div>`;
    }
}

function startPolling() {
    refreshAll();
    setInterval(refreshAll, POLL_INTERVAL_MS);
}

/*
    Секретная кнопка.
    Если feature.js содержит свою функцию toggleFeature(),
    она заменит эту fallback-функцию.
*/
if (typeof window.toggleFeature !== "function") {
    window.toggleFeature = function () {
        const container = document.getElementById("feature-container");
        if (!container) return;

        const isVisible = container.dataset.visible === "1";

        if (isVisible) {
            container.innerHTML = "";
            container.dataset.visible = "0";
            return;
        }

        container.dataset.visible = "1";
        container.innerHTML = `
            <div style="
                position: fixed;
                right: 32px;
                bottom: 32px;
                z-index: 9998;
                background: rgba(17, 24, 39, 0.96);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 14px;
                padding: 14px 16px;
                color: #e8edf2;
                font-family: Arial, sans-serif;
                box-shadow: 0 8px 24px rgba(0,0,0,0.35);
            ">
                Секретная фича активна
            </div>
        `;
    };
}

startPolling();
