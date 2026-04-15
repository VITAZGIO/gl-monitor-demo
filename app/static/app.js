const deviceSelect = document.getElementById("deviceSelect");
const deviceData = document.getElementById("deviceData");

let selectedDeviceId = "";
let autoRefreshInterval = null;

// загрузка списка устройств
async function loadDevices() {
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

    } catch (error) {
        deviceSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
        console.error(error);
    }
}

// загрузка данных устройства
async function loadDeviceData(deviceId) {
    if (!deviceId) {
        deviceData.innerHTML = '<div class="empty">Выберите устройство</div>';
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

    } catch (error) {
        deviceData.innerHTML = '<div class="empty">Ошибка загрузки данных</div>';
        console.error(error);
    }
}

// запуск автообновления
function startAutoRefresh() {
    stopAutoRefresh();

    autoRefreshInterval = setInterval(() => {
        if (selectedDeviceId) {
            loadDeviceData(selectedDeviceId);
        }
    }, 3000);
}

// остановка автообновления
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// выбор устройства
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

// запуск
loadDevices();