const summaryData = document.getElementById("summaryData");
const customerFilter = document.getElementById("customerFilter");
const siteFilter = document.getElementById("siteFilter");
const gatewayFilter = document.getElementById("gatewayFilter");
const stateFilter = document.getElementById("stateFilter");

const eventsData = document.getElementById("eventsData");
const devicesData = document.getElementById("devicesData");

const deviceDetailsSection = document.getElementById("deviceDetailsSection");
const deviceTitle = document.getElementById("deviceTitle");
const deviceDetailsData = document.getElementById("deviceDetailsData");

const chartSection = document.getElementById("chartSection");
const chartCanvas = document.getElementById("pressureChart");
const chartRangeButtons = document.querySelectorAll(".chart-range-btn");

const alarmHistorySection = document.getElementById("alarmHistorySection");
const alarmHistoryData = document.getElementById("alarmHistoryData");

const POLL_INTERVAL_MS = 3000;

let allDevices = [];
let allCustomers = [];
let allSites = [];
let allGateways = [];
let selectedDeviceId = "";
let pressureChart = null;
let selectedChartRangeMinutes = 5;
let selectedDeviceHistory = [];

function escapeHtml(value) {
    return String(value ?? "—")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
    if (!value || value === "—") return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);

    return date.toLocaleString("ru-RU");
}

function formatTime(value) {
    if (!value || value === "—") return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString("ru-RU");
}

function flagText(value, onText = "Вкл", offText = "Выкл") {
    if (value === 1) return onText;
    if (value === 0) return offText;
    return "—";
}

function statusClass(status) {
    if (status === 2) return "bad";
    if (status === 1) return "warn";
    if (status === 0) return "ok";
    return "";
}

function statusText(device) {
    return device.status_text || "Неизвестно";
}

function getOutletPressure(device) {
    let value = null;

    if (device.outlet_pressure !== undefined && device.outlet_pressure !== null) {
        value = device.outlet_pressure;
    } else if (device.temperature !== undefined && device.temperature !== null) {
        value = device.temperature;
    }

    if (value === null) {
        return null;
    }

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return value;
    }

    return Math.round(numberValue * 10);
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
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    borderWidth: 2,
                },
                {
                    label: "Выходное давление, бар",
                    data: [],
                    borderColor: "#ffcc66",
                    backgroundColor: "rgba(255, 204, 102, 0.15)",
                    tension: 0.25,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    borderWidth: 2,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            elements: {
                point: {
                    radius: 0,
                    hoverRadius: 0,
                },
            },
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
                    grid: { color: "rgba(255,255,255,0.08)" },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#cccccc" },
                    grid: { color: "rgba(255,255,255,0.08)" },
                },
            },
        },
    });
}

function clearChart() {
    if (!pressureChart) return;

    pressureChart.data.labels = [];
    pressureChart.data.datasets[0].data = [];
    pressureChart.data.datasets[1].data = [];
    pressureChart.update();
}

function filterHistoryByRange(history) {
    if (!Array.isArray(history) || history.length === 0) {
        return [];
    }

    const now = Date.now();
    const rangeMs = selectedChartRangeMinutes * 60 * 1000;

    return history.filter((point) => {
        if (!point.timestamp) return false;

        const ts = new Date(point.timestamp).getTime();
        if (Number.isNaN(ts)) return false;

        return now - ts <= rangeMs;
    });
}

function updateChart(history) {
    if (!Array.isArray(history) || history.length === 0) {
        clearChart();
        return;
    }

    const filteredHistory = filterHistoryByRange(history);

    if (!filteredHistory.length) {
        clearChart();
        return;
    }

    pressureChart.data.labels = filteredHistory.map((point) => formatTime(point.timestamp));

    pressureChart.data.datasets[0].data = filteredHistory.map((point) => {
        if (point.setpoint !== undefined && point.setpoint !== null) {
            return point.setpoint;
        }

        // Совместимость со старой историей, где было только value
        if (point.value !== undefined && point.value !== null) {
            return point.value;
        }

        return null;
    });

    pressureChart.data.datasets[1].data = filteredHistory.map((point) => {
        if (point.outlet_pressure !== undefined && point.outlet_pressure !== null) {
            return point.outlet_pressure;
        }

        return null;
    });

    pressureChart.update();
}

function renderSummary(summary) {
    summaryData.innerHTML = `
        <div class="summary-item">
            <div class="summary-label">Заказчиков</div>
            <div class="summary-value">${escapeHtml(summary.customers_count)}</div>
        </div>

        <div class="summary-item">
            <div class="summary-label">Объектов</div>
            <div class="summary-value">${escapeHtml(summary.sites_count)}</div>
        </div>

        <div class="summary-item">
            <div class="summary-label">Шлюз(ов) заказчика</div>
            <div class="summary-value">${escapeHtml(summary.gateways_count)}</div>
        </div>

        <div class="summary-item">
            <div class="summary-label">Устройств</div>
            <div class="summary-value">${escapeHtml(summary.devices_count)}</div>
        </div>

        <div class="summary-item">
            <div class="summary-label">Online</div>
            <div class="summary-value ok">${escapeHtml(summary.online_devices)}</div>
        </div>

        <div class="summary-item">
            <div class="summary-label">Offline</div>
            <div class="summary-value bad">${escapeHtml(summary.offline_devices)}</div>
        </div>

        <div class="summary-item">
            <div class="summary-label">Предупреждений</div>
            <div class="summary-value warn">${escapeHtml(summary.warnings_count)}</div>
        </div>

        <div class="summary-item">
            <div class="summary-label">Аварий</div>
            <div class="summary-value bad">${escapeHtml(summary.alarms_count)}</div>
        </div>
    `;
}

function preserveSelectValue(select, buildFn) {
    const oldValue = select.value;
    buildFn();
    select.value = oldValue;
}

function fillFilters() {
    preserveSelectValue(customerFilter, () => {
        customerFilter.innerHTML = `<option value="">Все заказчики</option>`;

        allCustomers.forEach((customer) => {
            const option = document.createElement("option");
            option.value = customer.customer_id;
            option.textContent = customer.customer_id;
            customerFilter.appendChild(option);
        });
    });

    preserveSelectValue(siteFilter, () => {
        siteFilter.innerHTML = `<option value="">Все объекты</option>`;

        allSites.forEach((site) => {
            const option = document.createElement("option");
            option.value = site.site_id;
            option.textContent = `${site.site_id} (${site.customer_id})`;
            siteFilter.appendChild(option);
        });
    });

    preserveSelectValue(gatewayFilter, () => {
        gatewayFilter.innerHTML = `<option value="">Все шлюзы заказчика</option>`;

        allGateways.forEach((gateway) => {
            const option = document.createElement("option");
            option.value = gateway.gateway_id;
            option.textContent = gateway.gateway_id;
            gatewayFilter.appendChild(option);
        });
    });
}

function getFilteredDevices() {
    const customerId = customerFilter.value;
    const siteId = siteFilter.value;
    const gatewayId = gatewayFilter.value;
    const state = stateFilter.value;

    return allDevices.filter((device) => {
        if (customerId && device.customer_id !== customerId) return false;
        if (siteId && device.site_id !== siteId) return false;
        if (gatewayId && device.gateway_id !== gatewayId) return false;

        if (state === "online" && device.connected !== true) return false;
        if (state === "offline" && device.connected === true) return false;
        if (state === "warning" && Number(device.status) !== 1 && Number(device.warning) !== 1) return false;
        if (state === "alarm" && Number(device.status) !== 2 && Number(device.alarm) !== 1) return false;

        return true;
    });
}

function renderEvents(events) {
    if (!Array.isArray(events) || events.length === 0) {
        eventsData.innerHTML = `<div class="placeholder">Активных аварий и предупреждений нет</div>`;
        return;
    }

    eventsData.innerHTML = `
        <div class="events-list">
            ${events.map((event) => `
                <div class="event-item">
                    <div class="event-title ${event.level === "alarm" ? "bad" : "warn"}">
                        ${escapeHtml(event.level_text)} — ${escapeHtml(event.device_id)}
                    </div>
                    <div class="event-meta">
                        Заказчик: ${escapeHtml(event.customer_id)} /
                        Объект: ${escapeHtml(event.site_id)} /
                        Шлюз заказчика: ${escapeHtml(event.gateway_id)} /
                        Последнее обновление: ${escapeHtml(formatDateTime(event.last_seen))}
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function renderDevicesList() {
    const devices = getFilteredDevices();

    if (!devices.length) {
        devicesData.innerHTML = `<div class="placeholder">Устройств по выбранным фильтрам нет</div>`;
        return;
    }

    devicesData.innerHTML = `
        <div class="device-list">
            ${devices.map((device) => {
                const activeClass = selectedDeviceId === device.device_id ? "active" : "";

                return `
                    <div class="kv-item device-row ${activeClass}" data-device-id="${escapeHtml(device.device_id)}">
                        <div class="device-row-title">
                            <span>${escapeHtml(device.device_id)}</span>
                            <span class="${device.connected ? "ok" : "bad"}">${device.connected ? "Online" : "Offline"}</span>
                        </div>

                        <div class="device-row-meta">
                            ${escapeHtml(device.customer_id)} / ${escapeHtml(device.site_id)} /
                            ${escapeHtml(device.gateway_id)} /
                            <span class="${statusClass(device.status)}">${escapeHtml(statusText(device))}</span>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;

    document.querySelectorAll(".device-row").forEach((row) => {
        row.addEventListener("click", async () => {
            const clickedDeviceId = row.dataset.deviceId;

            if (selectedDeviceId === clickedDeviceId) {
                selectedDeviceId = "";

                deviceDetailsSection.style.display = "none";
                chartSection.style.display = "none";
                alarmHistorySection.style.display = "none";

                clearChart();
                renderDevicesList();
                return;
            }

            selectedDeviceId = clickedDeviceId;
            await loadSelectedDevice();
            renderDevicesList();
        });
    });
}

function renderDeviceDetails(device) {
    if (!device) {
        deviceDetailsSection.style.display = "none";
        chartSection.style.display = "none";
        alarmHistorySection.style.display = "none";
        return;
    }

    const outletPressure = getOutletPressure(device);

    deviceTitle.textContent = device.device_id || "Устройство";

    deviceDetailsData.innerHTML = `
        <div class="kv-grid">
            <div class="kv-item">
                <div class="kv-label">Заказчик</div>
                <div class="kv-value">${escapeHtml(device.customer_id)}</div>
            </div>

            <div class="kv-item">
                <div class="kv-label">Объект</div>
                <div class="kv-value">${escapeHtml(device.site_id)}</div>
            </div>

            <div class="kv-item">
                <div class="kv-label">Шлюз заказчика</div>
                <div class="kv-value">${escapeHtml(device.gateway_id)}</div>
            </div>

            <div class="kv-item">
                <div class="kv-label">Подключено</div>
                <div class="kv-value ${device.connected ? "ok" : "bad"}">${device.connected ? "Да" : "Нет"}</div>
            </div>

            <div class="kv-item">
                <div class="kv-label">Статус</div>
                <div class="kv-value ${statusClass(device.status)}">${escapeHtml(statusText(device))}</div>
            </div>

            <div class="kv-item">
                <div class="kv-label">Уставка давления</div>
                <div class="kv-value">${escapeHtml(device.setpoint)} бар</div>
            </div>

            <div class="kv-item">
                <div class="kv-label">Выходное давление</div>
                <div class="kv-value">${escapeHtml(outletPressure)} бар</div>
            </div>

            <div class="kv-item">
                <div class="kv-label">Запуск</div>
                <div class="kv-value">${escapeHtml(flagText(device.run))}</div>
            </div>

            <div class="kv-item">
                <div class="kv-label">Предупреждение</div>
                <div class="kv-value ${device.warning === 1 ? "warn" : ""}">${escapeHtml(flagText(device.warning))}</div>
            </div>

            <div class="kv-item">
                <div class="kv-label">Авария</div>
                <div class="kv-value ${device.alarm === 1 ? "bad" : ""}">${escapeHtml(flagText(device.alarm))}</div>
            </div>

            <div class="kv-item">
                <div class="kv-label">Сброс аварии</div>
                <div class="kv-value ${device.ack === 1 ? "ack" : ""}">${escapeHtml(flagText(device.ack, "Нажата", "Не нажата"))}</div>
            </div>

            <div class="kv-item">
                <div class="kv-label">Последнее обновление</div>
                <div class="kv-value">${escapeHtml(formatDateTime(device.last_seen))}</div>
            </div>
        </div>
    `;

    deviceDetailsSection.style.display = "block";
    chartSection.style.display = "block";
    alarmHistorySection.style.display = "block";
}

function renderAlarmHistory(items) {
    if (!Array.isArray(items) || items.length === 0) {
        alarmHistoryData.innerHTML = `<div class="placeholder">Аварий пока не было</div>`;
        return;
    }

    const rows = items
        .slice()
        .reverse()
        .map((item) => `<li>${escapeHtml(formatDateTime(item.timestamp))}</li>`)
        .join("");

    alarmHistoryData.innerHTML = `<ul class="history-list">${rows}</ul>`;
}

async function loadSelectedDevice() {
    if (!selectedDeviceId) {
        renderDeviceDetails(null);
        return;
    }

    const deviceRes = await fetch(`/api/devices/${encodeURIComponent(selectedDeviceId)}?t=${Date.now()}`, {
        cache: "no-store",
    });

    if (!deviceRes.ok) {
        renderDeviceDetails(null);
        return;
    }

    const device = await deviceRes.json();

    const historyRes = await fetch(`/api/devices/${encodeURIComponent(selectedDeviceId)}/history?t=${Date.now()}`, {
        cache: "no-store",
    });

    const alarmRes = await fetch(`/api/devices/${encodeURIComponent(selectedDeviceId)}/alarm-history?t=${Date.now()}`, {
        cache: "no-store",
    });

    const historyData = historyRes.ok ? await historyRes.json() : { history: [] };
    const alarmData = alarmRes.ok ? await alarmRes.json() : { alarm_history: [] };

    selectedDeviceHistory = Array.isArray(historyData.history) ? historyData.history : [];

    renderDeviceDetails(device);
    updateChart(selectedDeviceHistory);
    renderAlarmHistory(alarmData.alarm_history);
}

async function fetchJson(url) {
    const res = await fetch(`${url}?t=${Date.now()}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`Ошибка запроса: ${url}`);
    }

    return await res.json();
}

async function refreshAll() {
    try {
        const [summary, customersData, sitesData, gatewaysData, devicesDataResponse, alarmsData] = await Promise.all([
            fetchJson("/api/dashboard/summary"),
            fetchJson("/api/customers"),
            fetchJson("/api/sites"),
            fetchJson("/api/gateways"),
            fetchJson("/api/devices"),
            fetchJson("/api/alarms"),
        ]);

        allCustomers = Array.isArray(customersData.customers) ? customersData.customers : [];
        allSites = Array.isArray(sitesData.sites) ? sitesData.sites : [];
        allGateways = Array.isArray(gatewaysData.gateways) ? gatewaysData.gateways : [];
        allDevices = Array.isArray(devicesDataResponse.devices) ? devicesDataResponse.devices : [];

        renderSummary(summary);
        fillFilters();
        renderEvents(alarmsData.alarms);
        renderDevicesList();

        if (selectedDeviceId) {
            await loadSelectedDevice();
        }
    } catch (error) {
        console.error(error);
        summaryData.innerHTML = `<div class="error-box">Ошибка загрузки сводки</div>`;
        eventsData.innerHTML = `<div class="error-box">Ошибка загрузки событий</div>`;
        devicesData.innerHTML = `<div class="error-box">Ошибка загрузки устройств</div>`;
    }
}

customerFilter.addEventListener("change", () => {
    renderDevicesList();
});

siteFilter.addEventListener("change", () => {
    renderDevicesList();
});

gatewayFilter.addEventListener("change", () => {
    renderDevicesList();
});

stateFilter.addEventListener("change", () => {
    renderDevicesList();
});

chartRangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        selectedChartRangeMinutes = Number(button.dataset.minutes || "5");

        chartRangeButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");

        updateChart(selectedDeviceHistory);
    });
});

if (typeof window.toggleFeature !== "function") {
    window.toggleFeature = function () {
        const container = document.getElementById("feature-container");
        if (!container) return;

        const isVisible = container.dataset.visible === "1";

        if (isVisible) {
            container.innerHTML = "";
            container.dataset.visible = "0";
            return;
        }

        container.dataset.visible = "1";
        container.innerHTML = `
            <div style="
                position: fixed;
                right: 32px;
                bottom: 32px;
                z-index: 9998;
                background: rgba(17, 24, 39, 0.96);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 14px;
                padding: 14px 16px;
                color: #e8edf2;
                font-family: Arial, sans-serif;
                box-shadow: 0 8px 24px rgba(0,0,0,0.35);
            ">
                Секретная фича активна
            </div>
        `;
    };
}

createChart();
refreshAll();
setInterval(refreshAll, POLL_INTERVAL_MS);
