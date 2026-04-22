const deviceSelect = document.getElementById("deviceSelect");
const deviceData = document.getElementById("deviceData");
const chartCanvas = document.getElementById("pressureChart");
const chartCard = document.getElementById("chartCard");
const secretBtn = document.getElementById("secret-btn");

const NORMAL_POLL_INTERVAL_MS = 3000;
const TURBO_POLL_INTERVAL_MS = 1000;

let selectedDeviceId = "";
let pollTimer = null;
let pressureChart = null;
let secretFeatureEnabled =
  localStorage.getItem("secretFeatureEnabled") === "1";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  if (chartCard) chartCard.style.display = "none";
}

function showChart() {
  if (chartCard) chartCard.style.display = "block";
}

function renderPlaceholder(message) {
  deviceData.innerHTML = `<div class="placeholder">${escapeHtml(message)}</div>`;
}

function renderError(message) {
  deviceData.innerHTML = `<div class="error-box">${escapeHtml(message)}</div>`;
}

function renderDeviceCard(data) {
  const rawTopic = escapeHtml(data.raw_topic || "—");
  const rawPayload = escapeHtml(data.raw_payload || "—");
  const setpoint = escapeHtml(data.setpoint || "—");
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
          <div class="kv-label">Уставка</div>
          <div class="kv-value">${setpoint}</div>
        </div>

        <div class="kv-item">
          <div class="kv-label">Последнее сообщение</div>
          <div class="kv-value">${escapeHtml(formatDateTime(data.last_seen))}</div>
        </div>
      </div>

      <div class="debug-box">
        <div class="debug-title">Последнее MQTT-сообщение</div>
        <div class="debug-topic">${rawTopic}</div>
        <pre class="debug-payload">${rawPayload}</pre>
      </div>
    </div>
  `;
}

async function loadDevices() {
  const res = await fetch(`/api/devices?t=${Date.now()}`, {
    cache: "no-store",
  });

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

  const res = await fetch(
    `/api/devices/${encodeURIComponent(deviceId)}/history?t=${Date.now()}`,
    {
      cache: "no-store",
    }
  );

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

function getPollInterval() {
  return secretFeatureEnabled
    ? TURBO_POLL_INTERVAL_MS
    : NORMAL_POLL_INTERVAL_MS;
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(refreshAll, getPollInterval());
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function applySecretFeatureState() {
  if (!secretBtn) return;

  if (secretFeatureEnabled) {
    secretBtn.style.opacity = "0.35";
    secretBtn.title = "Turbo demo mode: ON";
    secretBtn.dataset.enabled = "1";
  } else {
    secretBtn.style.opacity = "0.1";
    secretBtn.title = "Turbo demo mode: OFF";
    secretBtn.dataset.enabled = "0";
  }
}

function showSecretToast(text) {
  const toast = document.createElement("div");
  toast.textContent = text;
  toast.style.position = "fixed";
  toast.style.right = "16px";
  toast.style.bottom = "36px";
  toast.style.padding = "10px 14px";
  toast.style.borderRadius = "10px";
  toast.style.background = "rgba(20, 20, 20, 0.92)";
  toast.style.color = "#fff";
  toast.style.fontSize = "13px";
  toast.style.zIndex = "10000";
  toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.35)";
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 1300);
}

function toggleFeature() {
  secretFeatureEnabled = !secretFeatureEnabled;
  localStorage.setItem("secretFeatureEnabled", secretFeatureEnabled ? "1" : "0");

  applySecretFeatureState();
  startPolling();
  refreshAll();

  showSecretToast(
    secretFeatureEnabled
      ? "Turbo demo mode ON"
      : "Turbo demo mode OFF"
  );
}

window.toggleFeature = toggleFeature;

deviceSelect.addEventListener("change", async (event) => {
  selectedDeviceId = event.target.value;
  await refreshAll();
});

createChart();
hideChart();
applySecretFeatureState();
renderPlaceholder("Загрузка...");
refreshAll();
startPolling();
