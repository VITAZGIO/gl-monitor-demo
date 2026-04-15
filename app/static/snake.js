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
    try {
        const response = await fetch(`/api/devices?t=${Date.now()}`, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

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
        console.error("Ошибка загрузки списка устройств:", error);
        deviceSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
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

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        deviceData.innerHTML = `
            <div class="row"><span class="name">Устройство:</span> ${data.device_id}</div>
            <div class="row"><span class="name">Подключено:</span> ${data.connected ? "Да" : "Нет"}</div>
            <div class="row"><span class="name">Ошибки:</span> ${data.errors}</div>
            <div class="row"><span class="name">Входное давление:</span> ${data.input_pressure}</div>
            <div class="row"><span class="name">Давление системы:</span> ${data.system_pressure}</div>
            <div class="row"><span class="name">Последнее обновление:</span> ${data.last_updated}</div>
        `;

        setDebug(`Автообновление работает. Тик: ${tick}. Последний запрос: ${new Date().toLocaleTimeString()}`);
    } catch (error) {
        console.error("Ошибка загрузки данных устройства:", error);
        deviceData.innerHTML = '<div class="empty">Ошибка загрузки данных</div>';
        setDebug("Ошибка загрузки данных устройства");
    }
}

function startAutoRefresh() {
    stopAutoRefresh();

    tick = 0;
    setDebug("Автообновление запущено");

    autoRefreshInterval = setInterval(async () => {
        if (!selectedDeviceId) return;

        tick += 1;
        await loadDeviceData(selectedDeviceId);
    }, 3000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        setDebug("Автообновление остановлено");
    }
}

deviceSelect.addEventListener("change", async (event) => {
    selectedDeviceId = event.target.value;

    if (!selectedDeviceId) {
        stopAutoRefresh();
        deviceData.innerHTML = '<div class="empty">Выберите устройство</div>';
        return;
    }

    await loadDeviceData(selectedDeviceId);
    startAutoRefresh();
});

loadDevices();
setDebug("Новый app.js загружен");