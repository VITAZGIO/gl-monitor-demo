const clientSelect = document.getElementById("clientSelect");
const deviceSelect = document.getElementById("deviceSelect");
const deviceSelectWrap = document.getElementById("deviceSelectWrap");

const deviceSection = document.getElementById("deviceSection");
const deviceTitle = document.getElementById("deviceTitle");
const deviceData = document.getElementById("deviceData");

const alarmHistorySection = document.getElementById("alarmHistorySection");
const alarmHistoryData = document.getElementById("alarmHistoryData");

const chartSection = document.getElementById("chartSection");
const chartCanvas = document.getElementById("pressureChart");

const POLL_INTERVAL_MS = 3000;

let selectedGatewayId = "";
let selectedDeviceId = "";
let pressureChart = null;

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

function formatTime(value) {
    if (!value || value === "—") return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString("ru-RU");
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

function connectedClass(connected) {
    return connected ? "ok" : "bad";
}

function createChart() {
    pressureChart = new Chart(chartCanvas, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Уставка давления, бар",
                    data: [],
                    borderColor: "#4bc0c0",
                    backgroundColor: "rgba(75, 192, 192, 0.15)",
                    tension: 0.25,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    labels: {
                        color: "#e6e6e6",
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: "#cccccc" },
                    grid: { color: "rgba(255,255,255,0.08)" },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#cccccc" },
                    grid: { color: "rgba(255,255,255,0.08)" },
                },
            },
        },
    });
}

function clearChart() {
    if (!pressureChart) return;

    pressureChart.data.labels = [];
    pressureChart.data.datasets[0].data = [];
    pressureChart.update();
}

function updateChart(history) {
    if (!Array.isArray(history) || history.length === 0) {
        clearChart();
        return;
    }

    pressureChart.data.labels = history.map((point) => formatTime(point.timestamp));
    pressureChart.data.datasets[0].data = history.map((point) => point.value);
    pressureChart.update();
}

function renderDevice(device) {
    if (!device) {
        deviceData.innerHTML = `<div class="placeholder">Выберите устройство</div>`;
        return;
    }

    deviceTitle.textContent = device.device_id || "Устройство";

    deviceData.innerHTML = `
        <div class="kv-grid">
            <div class="kv-item">
                <div class="kv-label">Подключено</div>
                <div class="kv-value ${connectedClass(device.connected)}">${device.connected ? "Да" : "Нет"}</div>
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
                <div class="kv-label">Последнее обновление</div>
                <div class="kv-value">${escapeHtml(formatDateTime(device.last_seen))}</div>
            </div>
        </div>
    `;
}

function renderAlarmHistory(items) {
    if (!Array.isArray(items) || items.length === 0) {
        alarmHistoryData.innerHTML = `<div class="placeholder">Аварий пока не было</div>`;
        return;
    }

    const rows = items
        .slice()
        .reverse()
        .map((item) => `<li>${escapeHtml(formatDateTime(item.timestamp))}</li>`)
        .join("");

    alarmHistoryData.innerHTML = `<ul class="history-list">${rows}</ul>`;
}

async function loadClients() {
    const res = await fetch(`/api/gateways?t=${Date.now()}`, { cache: "no-store" });

    if (!res.ok) {
        throw new Error("Не удалось загрузить клиентов");
    }

    const data = await res.json();
    const gateways = Array.isArray(data.gateways) ? data.gateways : [];

    const oldValue = selectedGatewayId;

    clientSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = gateways.length ? "-- Выберите клиента --" : "-- Клиентов нет --";
    clientSelect.appendChild(placeholder);

    gateways.forEach((gateway) => {
        const option = document.createElement("option");
        option.value = gateway.gateway_id;
        option.textContent = `${gateway.gateway_id} — ${gateway.customer_id} / ${gateway.site_id}`;
        clientSelect.appendChild(option);
    });

    if (oldValue && gateways.some((gateway) => gateway.gateway_id === oldValue)) {
        clientSelect.value = oldValue;
    }
}

async function loadDevicesForClient(gatewayId) {
    if (!gatewayId) {
        deviceSelectWrap.style.display = "none";
        return;
    }

    const res = await fetch(`/api/gateways/${encodeURIComponent(gatewayId)}/devices?t=${Date.now()}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error("Не удалось загрузить устройства клиента");
    }

    const data = await res.json();
    const devices = Array.isArray(data.devices) ? data.devices : [];

    const oldValue = selectedDeviceId;

    deviceSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = devices.length ? "-- Выберите устройство --" : "-- Устройств нет --";
    deviceSelect.appendChild(placeholder);

    devices.forEach((device) => {
        const option = document.createElement("option");
        option.value = device.device_id;
        option.textContent = device.device_id;
        deviceSelect.appendChild(option);
    });

    if (oldValue && devices.some((device) => device.device_id === oldValue)) {
        deviceSelect.value = oldValue;
    } else {
        selectedDeviceId = "";
    }

    deviceSelectWrap.style.display = "block";
}

async function loadSelectedDevice() {
    if (!selectedDeviceId) {
        deviceSection.style.display = "none";
        alarmHistorySection.style.display = "none";
        chartSection.style.display = "none";
        clearChart();
        return;
    }

    const deviceRes = await fetch(`/api/devices/${encodeURIComponent(selectedDeviceId)}?t=${Date.now()}`, {
        cache: "no-store",
    });

    if (!deviceRes.ok) {
        throw new Error("Не удалось загрузить устройство");
    }

    const device = await deviceRes.json();

    const historyRes = await fetch(`/api/devices/${encodeURIComponent(selectedDeviceId)}/history?t=${Date.now()}`, {
        cache: "no-store",
    });

    const alarmRes = await fetch(`/api/devices/${encodeURIComponent(selectedDeviceId)}/alarm-history?t=${Date.now()}`, {
        cache: "no-store",
    });

    const historyData = historyRes.ok ? await historyRes.json() : { history: [] };
    const alarmData = alarmRes.ok ? await alarmRes.json() : { alarm_history: [] };

    deviceSection.style.display = "block";
    alarmHistorySection.style.display = "block";
    chartSection.style.display = "block";

    renderDevice(device);
    renderAlarmHistory(alarmData.alarm_history);
    updateChart(historyData.history);
}

async function refreshAll() {
    try {
        await loadClients();

        if (selectedGatewayId) {
            await loadDevicesForClient(selectedGatewayId);
        }

        if (selectedDeviceId) {
            await loadSelectedDevice();
        }
    } catch (error) {
        console.error(error);
    }
}

clientSelect.addEventListener("change", async (event) => {
    selectedGatewayId = event.target.value;
    selectedDeviceId = "";

    deviceSelect.value = "";
    deviceSection.style.display = "none";
    alarmHistorySection.style.display = "none";
    chartSection.style.display = "none";
    clearChart();

    await loadDevicesForClient(selectedGatewayId);
});

deviceSelect.addEventListener("change", async (event) => {
    selectedDeviceId = event.target.value;
    await loadSelectedDevice();
});

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

createChart();
refreshAll();
setInterval(refreshAll, POLL_INTERVAL_MS);
