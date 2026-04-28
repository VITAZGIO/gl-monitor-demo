# Общая идея проекта

GL Monitor Demo — это прототип системы мониторинга шкафов управления насосами.

Цель проекта:

* принимать данные с физических устройств;
* отображать состояние шкафов в веб-интерфейсе;
* показывать аварии, предупреждения, давление и статусы;
* подготовить архитектуру под будущую промышленную систему;
* постепенно перейти от демо без базы данных к полноценному серверу с БД, историей и пользователями.

На текущем этапе проект работает без PostgreSQL и без авторизации.

Все данные хранятся в оперативной памяти контейнеров.

# Текущая архитектура

На текущем этапе реализована схема:

```text
ESP32
  ↓
MQTT broker Mosquitto
  ↓
Customer Gateway / Шлюз заказчика
  ↓ HTTP POST
Company Server / Сервер фирмы
  ↓
Web Dashboard
```

# Компоненты проекта

| Компонент      | Назначение                                   |
| -------------- | -------------------------------------------- |
| ESP32          | физическая плата / имитация шкафа управления |
| Mosquitto      | MQTT broker                                  |
| Gateway        | шлюз заказчика, принимает MQTT от ESP        |
| Company Server | сервер фирмы, принимает данные от gateway    |
| Web UI         | веб-интерфейс мониторинга                    |

# Структура проекта

```text
gl-monitor-demo/
│
├── company-server/
│   ├── app/
│   │   ├── static/
│   │   │   ├── app.js
│   │   │   └── feature.js
│   │   ├── templates/
│   │   │   └── index.html
│   │   ├── main.py
│   │   └── state.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── gateway/
│   ├── app/
│   │   ├── config.py
│   │   ├── exporter.py
│   │   ├── main.py
│   │   ├── mqtt_client.py
│   │   └── state.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── mosquitto/
│   └── mosquitto.conf
│
├── docker-compose.yml
├── publisher.py
├── publisher.Dockerfile
└── README.md
```

# MQTT-топик ESP32

Gateway слушает MQTT-топики по шаблону:

```text
devices/+/telemetry
```

Каждая ESP-плата публикует данные в топик:

```text
devices/{device_id}/telemetry
```

Пример для демо-платы:

```text
devices/ESP32-DEMO-001/telemetry
```

Где:

| Часть topic      | Значение                  |
| ---------------- | ------------------------- |
| `devices`        | общий раздел устройств    |
| `ESP32-DEMO-001` | идентификатор ESP / шкафа |
| `telemetry`      | телеметрия устройства     |

# Текущий MQTT payload

Актуальный формат телеметрии:

```json
{
  "setpoint": 2.0,
  "temperature": 2.3,
  "status": "0",
  "run": 1,
  "warning": 0,
  "alarm": 0,
  "ack": 0
}
```

На текущем этапе поле `temperature` используется как **выходное давление**.

# Расшифровка MQTT-полей

| Поле          | Назначение                  | Тип        |
| ------------- | --------------------------- | ---------- |
| `setpoint`    | уставка давления            | float      |
| `temperature` | выходное давление           | float      |
| `status`      | общий статус устройства     | string/int |
| `run`         | запуск / работа             | 0/1        |
| `warning`     | предупреждение              | 0/1        |
| `alarm`       | авария                      | 0/1        |
| `ack`         | сброс аварии / квитирование | 0/1        |

# Значения status

| Значение | Расшифровка    |
| -------- | -------------- |
| `0`      | Норма          |
| `1`      | Предупреждение |
| `2`      | Авария         |

# Company Server

Company Server — это центральный сервер фирмы.

Он принимает пакеты от Gateway через HTTP POST и показывает данные в web-интерфейсе.

Основная роль:

```text
Gateway заказчика → Company Server → Web UI
```

Пока данные хранятся в памяти:

```text
Заказчик
  → Объект
    → Шлюз заказчика
      → Устройство
```

Пример:

```text
Заказчик: Globe
  Объект: Office
    Шлюз заказчика: GlobeDemo-01
      Устройство: ESP32-DEMO-001
```

# Gateway

Gateway — это шлюз заказчика.

Он принимает MQTT от ESP32 и отправляет данные на Company Server.

Gateway выполняет следующие задачи:

* подключается к MQTT broker;
* слушает `devices/+/telemetry`;
* автоматически определяет `device_id` из MQTT topic;
* хранит текущее состояние устройств;
* определяет online/offline;
* формирует export packet;
* отправляет данные на Company Server через HTTP POST.

# Export packet Gateway → Company Server

Gateway отправляет на Company Server пакет такого вида:

```json
{
  "gateway_id": "GlobeDemo-01",
  "customer_id": "Globe",
  "site_id": "Office",
  "timestamp": "2026-04-28T12:00:00+00:00",
  "devices": [
    {
      "device_id": "ESP32-DEMO-001",
      "connected": true,
      "status": 0,
      "status_text": "Норма",
      "setpoint": 2.0,
      "temperature": 2.3,
      "run": 1,
      "warning": 0,
      "alarm": 0,
      "ack": 0,
      "last_seen": "2026-04-28T12:00:00+00:00"
    }
  ]
}
```

# Company Server API

Главная сводка:

```text
GET /api/dashboard/summary
```

Заказчики:

```text
GET /api/customers
```

Конкретный заказчик:

```text
GET /api/customers/{customer_id}
```

Объекты:

```text
GET /api/sites
```

Конкретный объект:

```text
GET /api/sites/{site_id}
```

Шлюзы заказчика:

```text
GET /api/gateways
```

Устройства:

```text
GET /api/devices
```

Конкретное устройство:

```text
GET /api/devices/{device_id}
```

История давления устройства:

```text
GET /api/devices/{device_id}/history
```

История аварий устройства:

```text
GET /api/devices/{device_id}/alarm-history
```

Активные аварии и предупреждения:

```text
GET /api/alarms
```

# Gateway API

Статус шлюза:

```text
GET /api/gateway/status
```

Export packet:

```text
GET /api/gateway/export
```

Список устройств gateway:

```text
GET /api/devices
```

Данные устройства gateway:

```text
GET /api/devices/{device_id}
```





# Текущие русские названия во frontend

| Поле          | Русское название     |
| ------------- | -------------------- |
| `customer_id` | Заказчик             |
| `site_id`     | Объект               |
| `gateway_id`  | Шлюз заказчика       |
| `device_id`   | Устройство           |
| `connected`   | Подключено           |
| `status`      | Статус               |
| `setpoint`    | Уставка давления     |
| `temperature` | Выходное давление    |
| `run`         | Запуск               |
| `warning`     | Предупреждение       |
| `alarm`       | Авария               |
| `ack`         | Сброс аварии         |
| `last_seen`   | Последнее обновление |



# Пример ручной MQTT-телеметрии

Пример сообщения от ESP32:

```json
{
  "setpoint": 2.0,
  "temperature": 2.3,
  "status": "0",
  "run": 1,
  "warning": 0,
  "alarm": 0,
  "ack": 0
}
```