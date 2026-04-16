const deviceSelect = document.getElementById("deviceSelect");
const deviceData = document.getElementById("deviceData");

let selectedDeviceId = "";
let interval = null;

async function loadDevices() {
    const res = await fetch("/api/devices?t=" + Date.now(), { cache: "no-store" });
    const data = await res.json();

    deviceSelect.innerHTML = '<option value="">-- Выберите устройство --</option>';

    data.devices.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        deviceSelect.appendChild(opt);
    });
}

async function loadDevice(deviceId) {
    if (!deviceId) {
        deviceData.innerHTML = '<div class="empty">Выберите устройство</div>';
        return;
    }

    const res = await fetch(`/api/devices/${deviceId}?t=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();

    deviceData.innerHTML = `
        <div class="row"><span class="name">Устройство:</span> ${data.device_id}</div>
        <div class="row"><span class="name">Подключено:</span> ${data.connected ? "Да" : "Нет"}</div>
        <div class="row"><span class="name">Ошибки:</span> ${data.errors}</div>
        <div class="row"><span class="name">Входное давление:</span> ${data.input_pressure}</div>
        <div class="row"><span class="name">Давление системы:</span> ${data.system_pressure}</div>
    `;
}

function startAuto() {
    stopAuto();
    interval = setInterval(() => {
        if (selectedDeviceId) loadDevice(selectedDeviceId);
    }, 3000);
}

function stopAuto() {
    if (interval) clearInterval(interval);
}

deviceSelect.addEventListener("change", async (e) => {
    selectedDeviceId = e.target.value;

    if (!selectedDeviceId) {
        stopAuto();
        return;
    }

    await loadDevice(selectedDeviceId);
    startAuto();
});

loadDevices();