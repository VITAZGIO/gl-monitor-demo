const deviceSelect = document.getElementById("deviceSelect");
const deviceData = document.getElementById("deviceData");

let selectedDeviceId = "";
let autoRefreshInterval = null;

async function loadDevices() {
    try {
        const response = await fetch("/api/devices");
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
    }
}

async function loadDeviceData(deviceId) {
    if (!deviceId) {
        deviceData.innerHTML = '<div class="empty">Выберите устройство</div>';
        return;
    }

    try {
        const response = await fetch(`/api/devices/${deviceId}`);
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
    }
}

function startAutoRefresh() {
    stopAutoRefresh();

    autoRefreshInterval = setInterval(() => {
        if (selectedDeviceId) {
            loadDeviceData(selectedDeviceId);
        }
    }, 3000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

deviceSelect.addEventListener("change", (event) => {
    selectedDeviceId = event.target.value;
    loadDeviceData(selectedDeviceId);

    if (selectedDeviceId) {
        startAutoRefresh();
    } else {
        stopAutoRefresh();
    }
});

loadDevices();