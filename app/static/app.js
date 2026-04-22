const deviceSelect = document.getElementById("deviceSelect");
const deviceData = document.getElementById("deviceData");
const chartCanvas = document.getElementById("pressureChart");
const chartCard = document.getElementById("chartCard");

let selectedDeviceId = "";
let interval = null;
let pressureChart = null;

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
                    ticks: {
                        color: "#cccccc",
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.08)",
                    },
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "#cccccc",
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.08)",
                    },
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

function showChart() {
    chartCard.style.display = "block";
}

function hideChart() {
    chartCard.style.display = "none";
}

function formatTime(isoString) {
    if (!isoString || isoString === "—") return "—";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString("ru-RU");
}

function formatDateTime(isoString) {
    if (!isoString || isoString === "—") return "Нет данных";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "Нет данных";
    return date.toLocaleString("ru-RU");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderEmpty(message = "Выберите устройство") {
    deviceData.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}

async function loadDevices() {
    const previousValue = deviceSelect.value;

    try {
        const res = await fetch("/api/devices?t=" + Date.now(), {
            cache: "no-store",
        });

        if (!res.ok) {
            throw new Error("Не удалось загрузить список устройств");
        }

        const data = await res.json();
        const devices = Array.isArray(data.devices) ? data.devices : [];

        deviceSelect.innerHTML = '<option value="">-- Выберите устройство --</option>';

        devices.forEach((d) => {
            const opt = document.createElement("option");
            opt.value = d;
            opt.textContent = d;
            deviceSelect.appendChild(opt);
        });

        if (previousValue && devices.includes(previousValue)) {
            deviceSelect.value = previousValue;
            selectedDeviceId = previousValue;
        } else if (selectedDeviceId && devices.includes(selectedDeviceId)) {
            deviceSelect.value = selectedDeviceId;
        } else {
            if (selectedDeviceId && !devices.includes(selectedDeviceId)) {
                selectedDeviceId = "";
                stopAuto();
                renderEmpty("Устройство недоступно");
                clearChart();
                hideChart();
            }
            deviceSelect.value = "";
        }
    } catch (error) {
        console.error(error);
        deviceSelect.innerHTML = '<option value="">-- Ошибка загрузки --</option>';

        if (!selectedDeviceId) {
            renderEmpty("Ошибка связи с backend");
            clearChart();
            hideChart();
        }
    }
}

async function loadDevice(deviceId) {
    if (!deviceId) {
        renderEmpty("Выберите устройство");
        return;
    }

    try {
        const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}?t=${Date.now()}`, {
            cache: "no-store",
        });

        if (!res.ok) {
            deviceData.innerHTML = `<div class="empty">Не удалось загрузить данные устройства</div>`;
            return;
        }

        const data = await res.json();

        const rawTopic = escapeHtml(data.raw_topic || "—");
        const rawPayload = escapeHtml(data.raw_payload || "—");

        deviceData.innerHTML = `
            <div class="row"><span class="name">Устройство:</span> ${escapeHtml(data.device_id || "—")}</div>
            <div class="row"><span class="name">Подключено:</span> ${data.connected ? "Да" : "Нет"}</div>
            <div class="row"><span class="name">Статус:</span> ${escapeHtml(data.status_text || "Неизвестно")}</div>
            <div class="row"><span class="name">Уставка давления:</span> ${escapeHtml(data.setpoint || "—")}</div>
            <div class="row"><span class="name">Последнее сообщение:</span> ${formatDateTime(data.last_seen)}</div>

            <div class="debug-box">
                <div class="debug-title">Debug</div>
                <div class="row"><span class="name">Topic:</span> ${rawTopic}</div>
                <div class="row"><span class="name">Raw payload:</span></div>
                <pre class="debug-pre">${rawPayload}</pre>
            </div>
        `;
    } catch (error) {
        console.error(error);
        deviceData.innerHTML = `<div class="empty">Ошибка связи с backend</div>`;
    }
}

async function loadDeviceHistory(deviceId) {
    if (!deviceId) {
        clearChart();
        hideChart();
        return;
    }

    try {
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
    } catch (error) {
        console.error(error);
        clearChart();
        hideChart();
    }
}

async function refreshSelectedDevice() {
    await loadDevices();

    if (!selectedDeviceId) return;

    await loadDevice(selectedDeviceId);
    await loadDeviceHistory(selectedDeviceId);
}

function startAuto() {
    stopAuto();
    interval = setInterval(() => {
        refreshSelectedDevice();
    }, 3000);
}

function stopAuto() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
}

deviceSelect.addEventListener("change", async (e) => {
    selectedDeviceId = e.target.value;

    if (!selectedDeviceId) {
        stopAuto();
        renderEmpty("Выберите устройство");
        clearChart();
        hideChart();
        return;
    }

    await refreshSelectedDevice();
    startAuto();
});

createChart();
hideChart();
renderEmpty("Выберите устройство");
loadDevices();
