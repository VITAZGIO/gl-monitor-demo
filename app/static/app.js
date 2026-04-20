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
                    label: "Setpoint, бар",
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
    if (!isoString) return "—";

    const date = new Date(isoString);
    return date.toLocaleTimeString("ru-RU");
}

function formatDateTime(isoString) {
    if (!isoString) return "Нет данных";

    const date = new Date(isoString);
    return date.toLocaleString("ru-RU");
}

function formatStatus(status) {
    switch (status) {
        case 0:
            return "Норма";
        case 1:
            return "Предупреждение";
        case 2:
            return "Авария";
        default:
            return `Код ${status}`;
    }
}

async function loadDevices() {
    const res = await fetch("/api/devices?t=" + Date.now(), { cache: "no-store" });
    const data = await res.json();

    deviceSelect.innerHTML = '<option value="">-- Выберите устройство --</option>';

    data.devices.forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        deviceSelect.appendChild(opt);
    });
}

async function loadDevice(deviceId) {
    if (!deviceId) {
        deviceData.innerHTML = `
            <p>Выберите устройство</p>
        `;
        return;
    }

    const res = await fetch(`/api/devices/${deviceId}?t=${Date.now()}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        deviceData.innerHTML = `
            <p>Не удалось загрузить данные устройства</p>
        `;
        return;
    }

    const data = await res.json();

    deviceData.innerHTML = `
        <p><strong>Устройство:</strong> ${data.device_id}</p>
        <p><strong>Подключено:</strong> ${data.connected ? "Да" : "Нет"}</p>
        <p><strong>Статус:</strong> ${formatStatus(data.status)}</p>
        <p><strong>Setpoint:</strong> ${data.setpoint}</p>
        <p><strong>Последнее сообщение:</strong> ${formatDateTime(data.last_seen)}</p>
    `;
}

async function loadDeviceHistory(deviceId) {
    if (!deviceId) {
        clearChart();
        hideChart();
        return;
    }

    const res = await fetch(`/api/devices/${deviceId}/history?t=${Date.now()}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        clearChart();
        hideChart();
        return;
    }

    const history = await res.json();

    pressureChart.data.labels = history.map((point) => formatTime(point.timestamp));
    pressureChart.data.datasets[0].data = history.map((point) => point.value);
    pressureChart.update();

    showChart();
}

async function refreshSelectedDevice() {
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
        deviceData.innerHTML = `<p>Выберите устройство</p>`;
        clearChart();
        hideChart();
        return;
    }

    showChart();
    await refreshSelectedDevice();
    startAuto();
});

createChart();
hideChart();
loadDevices();
