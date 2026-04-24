const deviceSelect = document.getElementById("deviceSelect");
const deviceData = document.getElementById("deviceData");
const chartCanvas = document.getElementById("pressureChart");
const chartCard = document.getElementById("chartCard");

const POLL_INTERVAL_MS = 3000;

let selectedDeviceId = "";
let pollTimer = null;
let pressureChart = null;

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatTime(isoString) {
    if (!isoString || isoString === "—") return "—";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString("ru-RU");
}

function formatDateTime(isoString) {
    if (!isoString || isoString === "—") return "—";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("ru-RU");
}

function flagText(value, onText = "Вкл", offText = "Выкл") {
    if (value === 1) return onText;
    if (value === 0) return offText;
    return "—";
}

function flagClass(value, kind = "default") {
    if (value === null || value === undefined) return "flag-unknown";

    if (kind === "alarm") {
        return value === 1 ? "flag-on flag-alarm" : "flag-off";
    }

    if (kind === "warning") {
        return value === 1 ? "flag-on flag-warning" : "flag-off";
    }

    if (kind === "ack") {
        return value === 1 ? "flag-on flag-ack" : "flag-off";
    }

    return value === 1 ? "flag-on" : "flag-off";
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
                    grid: { color: "rgba(255, 255, 255, 0.08)" },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#cccccc" },
                    grid: { color: "rgba(255, 255, 255, 0.08)" },
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

function hideChart() {
    chartCard.style.display = "none";
}

function showChart() {
    chartCard.style.display = "block";
}

function renderPlaceholder(message) {
    deviceData.innerHTML = `<div class="placeholder">${escapeHtml(message)}</div>`;
}

function renderError(message) {
    deviceData.innerHTML = `<div class="error-box">${escapeHtml(message)}</div>`;
}

function renderAlarmHistory(items) {
    if (!Array.isArray(items) || !items.length) {
        return `
            <div class="extra-box">
                <div class="extra-title">История аварий</div>
                <div class="muted-line">Аварий пока не было</div>
            </div>
        `;
    }

    const rows = items
        .slice()
        .reverse()
        .map((item) => {
            return `<li>${escapeHtml(formatDateTime(item.timestamp))}</li>`;
        })
        .join("");

    return `
        <div class="extra-box">
            <div class="extra-title">История аварий</div>
            <ul class="history-list">${rows}</ul>
        </div>
    `;
}

function renderDeviceCard(data) {
    const rawTopic = escapeHtml(data.raw_topic || "—");
    const rawPayload = escapeHtml(data.raw_payload || "—");
    const setpoint = escapeHtml(data.setpoint || "—");
    const temperature = escapeHtml(data.temperature || "—");
    const statusText = escapeHtml(data.status_text || "Неизвестно");
    const deviceId = escapeHtml(data.device_id || "—");
    const connectedText = data.connected ? "Да" : "Нет";
    const connectedClass = data.connected ? "ok" : "bad";

    deviceData.innerHTML = `
        <div class="device-card">
            <h2>${deviceId}</h2>

            <div class="kv-grid">
                <div class="kv-item">
                    <div class="kv-label">Подключено</div>
                    <div class="kv-value ${connectedClass}">${connectedText}</div>
                </div>

                <div class="kv-item">
                    <div class="kv-label">Статус</div>
                    <div class="kv-value">${statusText}</div>
                </div>

                <div class="kv-item">
                    <div class="kv-label">Уставка давления</div>
                    <div class="kv-value">${setpoint}</div>
                </div>

                <div class="kv-item">
                    <div class="kv-label">Температура</div>
                    <div class="kv-value">${temperature}</div>
                </div>

                <div class="kv-item">
                    <div class="kv-label">Последнее сообщение</div>
                    <div class="kv-value">${escapeHtml(formatDateTime(data.last_seen))}</div>
                </div>
            </div>

            <div class="extra-box">
                <div class="extra-title">Входы стенда</div>
                <div class="inputs-grid">
                    <div class="input-row">
                        <span class="input-name">Запуск</span>
                        <span class="input-state ${flagClass(data.run)}">${flagText(data.run)}</span>
                    </div>

                    <div class="input-row">
                        <span class="input-name">Предупреждение</span>
                        <span class="input-state ${flagClass(data.warning, "warning")}">${flagText(data.warning)}</span>
                    </div>

                    <div class="input-row">
                        <span class="input-name">Авария</span>
                        <span class="input-state ${flagClass(data.alarm, "alarm")}">${flagText(data.alarm)}</span>
                    </div>

                    <div class="input-row">
                        <span class="input-name">Сброс аварии</span>
                        <span class="input-state ${flagClass(data.ack, "ack")}">${flagText(data.ack, "Нажата", "Не нажата")}</span>
                    </div>
                </div>
            </div>

            ${renderAlarmHistory(data.alarm_history)}

            <div class="debug-box">
                <div class="debug-title">Последнее MQTT-сообщение</div>
                <div class="debug-topic">${rawTopic}</div>
                <pre class="debug-payload">${rawPayload}</pre>
            </div>
        </div>
    `;
}


async function loadDevices() {
    const res = await fetch(`/api/devices?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) {
        throw new Error("Не удалось загрузить список устройств");
    }

    const data = await res.json();
    const devices = Array.isArray(data.devices) ? data.devices : [];
    const oldSelected = selectedDeviceId;

    deviceSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = devices.length
        ? "-- Выберите устройство --"
        : "-- Устройств нет --";
    deviceSelect.appendChild(placeholder);

    devices.forEach((deviceId) => {
        const option = document.createElement("option");
        option.value = deviceId;
        option.textContent = deviceId;
        deviceSelect.appendChild(option);
    });

    if (oldSelected && devices.includes(oldSelected)) {
        selectedDeviceId = oldSelected;
        deviceSelect.value = oldSelected;
        return;
    }

    if (!oldSelected && devices.length > 0) {
        selectedDeviceId = devices[0];
        deviceSelect.value = devices[0];
        return;
    }

    selectedDeviceId = "";
    deviceSelect.value = "";
}

async function loadDevice(deviceId) {
    if (!deviceId) {
        renderPlaceholder("Ожидание устройства...");
        return;
    }

    const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}?t=${Date.now()}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        renderError("Не удалось загрузить данные устройства");
        return;
    }

    const data = await res.json();
    renderDeviceCard(data);
}

async function loadDeviceHistory(deviceId) {
    if (!deviceId) {
        clearChart();
        hideChart();
        return;
    }

    const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/history?t=${Date.now()}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        clearChart();
        hideChart();
        return;
    }

    const history = await res.json();
    const points = Array.isArray(history) ? history : [];

    if (!points.length) {
        clearChart();
        hideChart();
        return;
    }

    pressureChart.data.labels = points.map((point) => formatTime(point.timestamp));
    pressureChart.data.datasets[0].data = points.map((point) => point.value);
    pressureChart.update();
    showChart();
}

async function refreshAll() {
    try {
        await loadDevices();

        if (!selectedDeviceId) {
            renderPlaceholder("Ожидание устройства...");
            clearChart();
            hideChart();
            return;
        }

        await loadDevice(selectedDeviceId);
        await loadDeviceHistory(selectedDeviceId);
    } catch (error) {
        console.error(error);
        renderError("Ошибка связи с backend");
        clearChart();
        hideChart();
    }
}

function startPolling() {
    stopPolling();
    pollTimer = setInterval(refreshAll, POLL_INTERVAL_MS);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

deviceSelect.addEventListener("change", async (event) => {
    selectedDeviceId = event.target.value;
    await refreshAll();
});

createChart();
hideChart();
renderPlaceholder("Загрузка...");
refreshAll();
startPolling();
