const deviceSelect = document.getElementById("deviceSelect");
const deviceData = document.getElementById("deviceData");
const debugInfo = document.getElementById("debugInfo");

let selectedDeviceId = "";
let autoRefreshInterval = null;
let tick = 0;

function setDebug(text) {
    if (debugInfo) {
        debugInfo.textContent = text;
    }
}

async function loadDevices() {
    setDebug("loadDevices() запущен");

    try {
        const response = await fetch("/api/devices?t=" + Date.now(), {
            cache: "no-store"
        });
        const data = await response.json();

        deviceSelect.innerHTML = '<option value="">-- Выберите устройство --</option>';

        data.devices.forEach(device => {
            const option = document.createElement("option");
            option.value = device;
            option.textContent = device;
            deviceSelect.appendChild(option);
        });

        setDebug("Список устройств загружен");
    } catch (error) {
        console.error(error);
        setDebug("Ошибка загрузки списка устройств");
    }
}

async function loadDeviceData(deviceId) {
    if (!deviceId) {
        deviceData.innerHTML = '<div class="empty">Выберите устройство</div>';
        setDebug("Устройство не выбрано");
        return;
    }

    try {
        const response = await fetch(`/api/devices/${deviceId}?t=${Date.now()}`, {
            cache: "no-store"
        });
        const data = await response.json();

        deviceData.innerHTML = `
            <div class="row"><span class="name">Устройство:</span> ${data.device_id}</div>
            <div class="row"><span class="name">Подключено:</span> ${data.connected ? "Да" : "Нет"}</div>
            <div class="row"><span class="name">Ошибки:</span> ${data.errors}</div>
            <div class="row"><span class="name">Входное давление:</span> ${data.input_pressure}</div>
            <div class="row"><span class="name">Давление системы:</span> ${data.system_pressure}</div>
            <div class="row"><span class="name">Последнее обновление:</span> ${data.last_updated}</div>
        `;

        setDebug(`Тик: ${tick}, время: ${new Date().toLocaleTimeString()}`);
    } catch (error) {
        console.error(error);
        setDebug("Ошибка загрузки данных устройства");
    }
}

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }

    tick = 0;
    setDebug("Автообновление стартовало");

    autoRefreshInterval = setInterval(() => {
        if (!selectedDeviceId) return;
        tick++;
        loadDeviceData(selectedDeviceId);
    }, 3000);
}

deviceSelect.addEventListener("change", async (event) => {
    selectedDeviceId = event.target.value;
    await loadDeviceData(selectedDeviceId);
    startAutoRefresh();
});

setDebug("Новый app.js реально загрузился");
loadDevices();