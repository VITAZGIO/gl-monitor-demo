const deviceSelect = document.getElementById("deviceSelect");
const deviceData = document.getElementById("deviceData");

let selectedDeviceId = "";
let autoRefreshInterval = null;

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
            <