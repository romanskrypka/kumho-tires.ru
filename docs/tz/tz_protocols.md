# Протоколы коммуникации: API, Webhooks, MCP

## Контекст и связь с другими ТЗ

Настоящий документ детализирует **протоколы коммуникации** между компонентами системы, описанной в [tz_architecture.md](tz_architecture.md).

**Связанные документы:**
- [tz_architecture.md](tz_architecture.md) — архитектура системы PHP + n8n + Django (компоненты, потоки данных, безопасность)
- [tz_reuse.md](tz_reuse.md) — принципы тиражируемости
- [tz_.md](tz_.md) — план этапов трансформации

**Вопрос, на который отвечает этот документ:** Какой протокол использовать для каждой связи между компонентами, почему, и как MCP меняет подход к AI-интеграциям?

---

## Три протокола коммуникации

### API (REST) — pull-модель

```
Клиент  ──[HTTP запрос]──>  Сервер
Клиент  <──[HTTP ответ]───  Сервер
```

**Суть:** Клиент инициирует запрос, сервер отвечает. Синхронная модель «запрос-ответ».

| Характеристика | Значение |
|---------------|---------|
| Инициатор | Клиент |
| Модель | Pull (запрос-ответ) |
| Синхронность | Синхронная |
| Стандарт | REST, OpenAPI/Swagger, GraphQL, gRPC |
| Безопасность | Bearer Token, OAuth 2.0, API Key |
| Применение | Получение данных по запросу, CRUD-операции, синхронные интеграции |

**Пример в системе:**
```
PHP (DjangoApiClient)  ──GET /api/v1/products/123──>  Django Core API
PHP (DjangoApiClient)  <──{ "id": 123, "name": "..." }──  Django Core API
```

### Webhooks — push-модель

```
Сервер  ──[HTTP POST на твой URL]──>  Клиент
              (событие произошло!)
```

**Суть:** Сервер сам отправляет данные на заранее зарегистрированный URL, когда происходит событие. «API наоборот».

| Характеристика | Значение |
|---------------|---------|
| Инициатор | Сервер (источник события) |
| Модель | Push (событийная) |
| Синхронность | Асинхронная |
| Стандарт | Нет единого (HMAC-подпись де-факто) |
| Безопасность | HMAC-SHA256, Bearer Token |
| Применение | Реакция на события, уведомления, callback'и |

**Пример в системе:**
```
PHP  ──[POST /webhook/ai-task + HMAC]──>  n8n
...время обработки...
n8n  ──[POST /api/callback + Bearer]──>  PHP (результат готов)
```

### MCP (Model Context Protocol) — двусторонняя модель для AI

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  AI Model   │ <──> │  MCP Client │ <──> │  MCP Server │
│  (Claude,   │      │  (хост-     │      │  (инструмент│
│   GPT etc.) │      │   приложение│      │   / данные) │
└─────────────┘      └─────────────┘      └─────────────┘
```

**Суть:** Открытый протокол от Anthropic (2024), стандартизирующий подключение AI-моделей к внешним инструментам, данным и сервисам. «USB-C для AI» — универсальный разъём между моделью и внешним миром.

| Характеристика | Значение |
|---------------|---------|
| Инициатор | AI-модель (через MCP Client) |
| Модель | Двусторонняя (запрос + обнаружение) |
| Синхронность | Обе (синхронные Tools, потоковые Resources) |
| Стандарт | MCP Specification (open standard) |
| Безопасность | OAuth 2.0 |
| Транспорт | stdio (локальный), HTTP+SSE (удалённый), WebSocket |
| Применение | AI-агенты, интеллектуальные интерфейсы, автоматизация с AI |

**Три примитива MCP:**

| Примитив | Описание | Пример в системе |
|----------|---------|-----------------|
| **Tools** | Функции, которые AI-модель может вызвать | `label_extractor.run`, `product.search`, `report.generate` |
| **Resources** | Данные, которые AI-модель может прочитать | Справочник продукции, данные поставщиков, история операций |
| **Prompts** | Готовые шаблоны инструкций | Системные промпты для классификации, анализа этикеток |

**Ключевое отличие MCP от API:**
- API: разработчик жёстко кодирует, какие эндпоинты вызывать → негибко
- MCP: AI-модель **сама обнаруживает** доступные инструменты и **сама решает**, какие вызвать → адаптивно, тиражируемо

**Кто поддерживает MCP (на 2026):**
- Claude Desktop, Claude Code
- Cursor IDE, Continue.dev, Zed Editor
- n8n (через MCP-ноду)
- Собственные приложения через MCP SDK

---

## Как протоколы соотносятся друг с другом

```
MCP может ИСПОЛЬЗОВАТЬ внутри себя:
├── API   → для вызова инструментов (Tools)
└── Webhooks → для получения событий (Resources с подпиской)

MCP — это надстройка специально для AI,
API и Webhooks — базовые механизмы коммуникации.
```

**Аналогия:**
- **API** — ты звонишь в магазин и спрашиваешь о товаре
- **Webhook** — магазин сам звонит тебе, когда товар появился
- **MCP** — умный ассистент, который знает, в какой магазин позвонить, что спросить и как интерпретировать ответ в твоих интересах

---

## Карта протоколов в системе

### Общая схема

```
                    ПОЛЬЗОВАТЕЛИ
                         |
                    [HTTPS/REST]
                         |
              ┌──────────┴──────────┐
              |   PHP WEBSITE       |
              |                     |
              |  REST ──> Django    |  (DjangoApiClient, синхронно)
              |  Webhook ──> n8n   |  (N8nGateway, HMAC, асинхронно)
              └──────────┬──────────┘
                         |
            ┌────────────┼────────────┐
            |            |            |
       [Webhook]    [Webhook]    [REST API]
       (HMAC)      (callback)   (прямой)
            |            |            |
       ┌────┴────┐       |      ┌────┴─────┐
       |   n8n   |───────┘      | Django   |
       |         |──[REST]──────| Core API |
       |         |──[REST]──┐   └──────────┘
       └─────────┘          |
                       ┌────┴──────────┐
                       | Django        |
                       | Agents Service|
                       |               |
                       | [MCP Server]  |  <── AI-модели подключаются через MCP
                       | [REST API]    |  <── n8n, PHP подключаются через REST
                       └───────┬───────┘
                               |
                          [REST/MCP]
                               |
                       ┌───────┴───────┐
                       | Django        |
                       | MAS Service   |
                       └───────────────┘
```

### Таблица: связь -> протокол -> обоснование

| Связь | Протокол | Модель | Авторизация | Обоснование |
|-------|----------|--------|-------------|-------------|
| Пользователь → PHP | HTTPS | Pull | JWT (форма входа) | Стандартный веб, браузерные запросы |
| PHP → n8n | Webhook | Push | HMAC-SHA256 | Асинхронная обработка, PHP не ждёт результата |
| n8n → PHP (callback) | Webhook | Push | Bearer Token | Уведомление о готовности результата |
| PHP → Django Core | REST API | Pull | Bearer Token | Синхронные запросы данных (справочники, пользователи) |
| PHP → Django Agents | REST API | Pull | Bearer Token | Синхронный запуск агента из демо-страницы |
| n8n → Django Core | REST API | Pull | Bearer Token | CRUD-операции в бизнес-логике workflow'а |
| n8n → Django Agents | REST API | Pull | Bearer Token | Запуск агента из workflow'а |
| Django Core ↔ Django Agents | REST API | Pull | Bearer Token (межсервисный) | Внутренние вызовы через Docker-сеть |
| **AI-модель → инструменты** | **MCP (Tools)** | Двусторонний | OAuth 2.0 | AI сам обнаруживает и вызывает нужные инструменты |
| **AI-модель → данные** | **MCP (Resources)** | Pull | OAuth 2.0 | AI читает справочники, историю, контекст |
| **MAS → агенты** | REST + MCP | Оба | Bearer + OAuth | Оркестрация (REST) + контекст (MCP) |

---

## API в системе

### Где используется REST API

1. **Django Core API** (`/api/v1/`) — основной бизнес-API:
   - `GET /api/v1/products` — справочник продукции
   - `GET /api/v1/users/{id}` — данные пользователя
   - `POST /api/v1/leads` — создание заявки
   - `GET /api/v1/references/{type}` — справочники

2. **Django Agents API** (`/api/v1/`) — запуск и управление агентами:
   - `POST /api/v1/agent/run` — запуск агента
   - `GET /api/v1/agents` — список доступных агентов
   - `GET /api/v1/tasks/{id}` — статус задачи

3. **Django MAS API** (`/api/v1/`) — оркестрация:
   - `POST /api/v1/pipeline/run` — запуск pipeline
   - `GET /api/v1/pipeline/{id}/status` — статус pipeline

### Контракты (OpenAPI)

Каждый Django-сервис экспортирует OpenAPI-спецификацию:
- `GET /api/v1/schema/` — JSON-спецификация
- `GET /api/v1/docs/` — Swagger UI

**Файлы контрактов:** `docs/contracts/openapi/`
- `core-api.yaml` — Core API
- `agents-api.yaml` — Agents API
- `mas-api.yaml` — MAS API

### Версионирование

- Все эндпоинты под `/api/v1/`
- При breaking changes → `/api/v2/`, старая версия поддерживается минимум 1 MINOR-релиз
- Версия указана в URL, не в заголовках (проще для отладки и n8n)

### PHP-клиент (DjangoApiClient)

Описан в [tz_architecture.md](tz_architecture.md). Ключевой паттерн:
- Все URL из `.env` (не хардкод)
- Все вызовы через `DjangoApiClient` (не напрямую)
- Каждый вызов передаёт `X-Trace-Id` и `X-Tenant-Id`
- Логирование каждого вызова с `duration_ms`

---

## Webhooks в системе

### Где используются Webhooks

1. **PHP → n8n** — асинхронный запуск workflow'ов:
   - `lead-intake` — приём заявки с публичной формы
   - `ai-task` — запуск AI-обработки из ЛК
   - `sync-trigger` — ручной запуск синхронизации

2. **n8n → PHP (callback)** — уведомление о результате:
   - `notify` — результат AI-обработки готов
   - `status-update` — изменение статуса заявки

### Контракты Webhook'ов

**Файл:** `docs/contracts/n8n-webhooks.yaml`

Подробные контракты описаны в [tz_architecture.md](tz_architecture.md), раздел «Контракты webhook'ов».

### Паттерн: PHP → n8n (HMAC)

```
PHP (N8nGateway):
1. Сериализует payload в JSON
2. Вычисляет HMAC-SHA256(body, N8N_HMAC_SECRET)
3. Отправляет POST с заголовками:
   - X-HMAC-SHA256: {подпись}
   - X-Trace-Id: {trace_id}
   - X-Tenant-Id: {tenant_id}
   - Content-Type: application/json
4. Получает { execution_id, status: "accepted" }
5. НЕ ждёт результата (асинхронно)

n8n:
1. Проверяет HMAC-подпись
2. Запускает workflow
3. По завершению — callback на PHP
```

### Паттерн: n8n → PHP (callback)

```
n8n:
1. Workflow завершён
2. Отправляет POST на {APP_BASE_URL}/api/callback:
   - Authorization: Bearer {PLATFORM_API_KEY}
   - X-Trace-Id: {trace_id из исходного запроса}
   - Body: { execution_id, status, result }

PHP:
1. Проверяет Bearer Token
2. Обновляет статус задачи в ЛК пользователя
3. Отправляет push-уведомление (если настроено)
```

### Когда Webhook, а когда REST API?

| Сценарий | Протокол | Почему |
|---------|----------|--------|
| PHP запрашивает справочник у Django | REST API | Нужен немедленный ответ, данные нужны для рендеринга |
| PHP запускает AI-обработку | Webhook → n8n | Обработка долгая (секунды-минуты), PHP не ждёт |
| n8n возвращает результат AI | Webhook → PHP | Событие «обработка завершена», push-модель |
| PHP проверяет статус задачи | REST API → Django | Пользователь явно запрашивает статус |
| GitHub push → деплой | Webhook | Реакция на внешнее событие |

**Правило:** Если ответ нужен немедленно и быстро (< 1 сек) → REST API. Если обработка долгая или событийная → Webhook.

---

## MCP в системе

### Зачем MCP

**Проблема без MCP:**
```python
# Жёстко закодированная интеграция — НЕ тиражируемо
class LabelExtractorAgent:
    def process(self, data):
        # Агент знает конкретные эндпоинты
        products = requests.get("http://core:8000/api/v1/products?search=...")
        categories = requests.get("http://core:8000/api/v1/references/categories")
        # При тиражировании: другие URL, другая структура данных → переписывать
```

**Решение с MCP:**
```python
# Агент обнаруживает инструменты через MCP — тиражируемо
class LabelExtractorAgent:
    def process(self, data, mcp_client):
        # Агент запрашивает у MCP Server доступные ресурсы
        products = mcp_client.read_resource("products://search?q=...")
        categories = mcp_client.read_resource("references://categories")
        # При тиражировании: MCP Server отдаёт данные из другого источника
        # Код агента НЕ меняется
```

### MCP Server на Django

Каждый Django-сервис может экспортировать MCP Server — интерфейс для AI-моделей:

#### agents-service MCP Server

**Tools (инструменты, которые AI может вызвать):**

| Tool | Описание | Параметры |
|------|---------|-----------|
| `label_extractor.run` | Извлечение данных с этикетки | `image` (base64/URL) |
| `background_remover.run` | Удаление фона изображения | `image` (base64/URL) |
| `classifier.run` | Классификация продукта | `text` (описание), `image` (опционально) |
| `summarizer.run` | Суммаризация текста | `text`, `max_length` |

**Resources (данные, которые AI может читать):**

| Resource | Описание | URI |
|----------|---------|-----|
| Справочник продукции | Каталог с названиями, категориями, атрибутами | `products://list`, `products://search?q={query}` |
| Справочник категорий | Дерево категорий продукции | `references://categories` |
| Справочник поставщиков | Данные контрагентов | `references://suppliers` |
| История операций | Лог обработанных задач | `tasks://history?limit={n}` |

**Prompts (шаблоны инструкций):**

| Prompt | Описание |
|--------|---------|
| `label-analysis` | Системный промпт для анализа этикеток алкогольной продукции |
| `product-classification` | Промпт для классификации по категориям РЛ |
| `data-extraction` | Промпт для структурированного извлечения данных |

#### core-api MCP Server

**Tools:**

| Tool | Описание |
|------|---------|
| `products.search` | Поиск по справочнику продукции |
| `products.create` | Создание нового продукта |
| `references.get` | Получение справочника по типу |
| `reports.generate` | Генерация отчёта |

**Resources:**

| Resource | URI |
|----------|-----|
| Продукты | `products://` |
| Пользователи | `users://` |
| Справочники | `references://{type}` |

### MCP Client

**Кто выступает MCP Client:**

1. **n8n** — через MCP-ноду или HTTP+SSE:
   - AI-workflow'ы подключаются к MCP Server на Django
   - AI-модель (Claude, GPT) через n8n обнаруживает доступные Tools и Resources
   - Результат: AI-модель в workflow сама решает, какие инструменты использовать

2. **PHP (будущее)** — для AI-интерфейсов в ЛК:
   - Пользователь в АРМ общается с AI-ассистентом
   - AI-ассистент через MCP имеет доступ к справочникам и инструментам
   - Результат: контекстная помощь прямо в интерфейсе АРМ

### Транспорт MCP

| Транспорт | Применение | Когда использовать |
|-----------|-----------|-------------------|
| **stdio** | Локальные процессы | MCP Server и Client на одном сервере (dev-окружение) |
| **HTTP+SSE** | Удалённые серверы | MCP Server на Django, MCP Client в n8n/PHP (production) |
| **WebSocket** | Real-time | Будущее: потоковые обновления в ЛК |

Для production-среды: **HTTP+SSE** — Django MCP Server слушает на отдельном порту или endpoint'е.

### Пример: полный цикл с MCP

**Сценарий:** Сотрудник в АРМ «Закупка/ВЭД» загружает фото бутылки для анализа.

```
1. Пользователь → PHP: загружает фото через форму в АРМ
   [HTTPS, JWT авторизация]

2. PHP → n8n: отправляет задачу
   [Webhook, HMAC-SHA256]
   POST /webhook/ai-task
   {
     "task_type": "label_analysis",
     "payload": { "image_url": "https://..." },
     "callback_url": "https://retail-logistic.ru/api/callback",
     "trace_id": "tr-abc123"
   }

3. n8n workflow: подключается к MCP Server (agents-service)
   [MCP, HTTP+SSE, OAuth 2.0]

4. AI-модель через MCP:
   a) Обнаруживает Tool: label_extractor.run
   b) Вызывает Tool с параметром image_url
   c) Получает результат: { name, manufacturer, country, volume, alcohol }
   d) Читает Resource: products://search?q={name}
   e) Сверяет с каталогом: найден/не найден
   f) Если не найден — предлагает создание через Tool: products.create

5. n8n → PHP: callback с результатом
   [Webhook, Bearer Token]
   POST /api/callback
   {
     "execution_id": "exec-xyz",
     "status": "success",
     "result": {
       "extracted": { "name": "...", "manufacturer": "...", ... },
       "catalog_match": { "found": true, "product_id": 456 },
       "confidence": 0.94
     },
     "trace_id": "tr-abc123"
   }

6. PHP → пользователь: отображает результат в АРМ
   [HTTPS, JWT]
```

---

## Стратегия внедрения MCP

### Этапность

| Этап | Протоколы | MCP |
|------|----------|-----|
| **0. Отделение контента** | — | — |
| **0.5 Инфраструктура** | — | — |
| **1. Контент РЛ** | — | — |
| **2. Аутентификация** | REST API (AuthService) | — |
| **3. ЛК и роли** | REST API (Django Core) | — |
| **4. Интеграции n8n + Django** | REST API + Webhooks | **MCP Server на agents-service** (обёртка над REST) |
| **5. АРМ и инструменты** | REST API + Webhooks + MCP | **MCP для MAS**, MCP Client в ЛК |

### Этап 4: первый MCP Server

**Что делаем:**
- Добавляем MCP Server к Django agents-service
- MCP Server = обёртка над существующим REST API (не замена!)
- Tools = эндпоинты `/api/v1/agent/run`, `/api/v1/agents`
- Resources = эндпоинты `/api/v1/products`, `/api/v1/references`

**Реализация:**
```python
# agents-service/src/mcp_server.py
from mcp.server import Server
from mcp.types import Tool, Resource

server = Server("agents-mcp")

@server.tool("label_extractor.run")
async def label_extractor(image: str) -> dict:
    """Извлечение данных с этикетки алкогольной продукции."""
    agent = LabelExtractorAgent()
    result = agent.run(AgentInput(payload={"image": image}))
    return result.result

@server.resource("products://search")
async def search_products(query: str) -> str:
    """Поиск по справочнику продукции."""
    response = await core_api_client.get(f"/api/v1/products?search={query}")
    return json.dumps(response.json())

@server.prompt("label-analysis")
async def label_analysis_prompt() -> str:
    """Системный промпт для анализа этикеток."""
    return """Ты — эксперт по алкогольной продукции. Анализируй этикетку и извлеки:
    - Название продукта
    - Производитель
    - Страна происхождения
    - Объём (мл)
    - Крепость (%)
    - Тип напитка (вино, виски, водка, и т.д.)
    Используй справочник продукции для сверки."""
```

**Совместимость:** REST API продолжает работать. MCP Server — дополнительный интерфейс для AI-клиентов. Существующие n8n workflow'ы через REST не ломаются.

### Этап 5: MCP для MAS

**Что делаем:**
- MAS Orchestrator использует MCP для **динамического обнаружения** агентов
- Вместо хардкода списка агентов → MCP-запрос к agents-service: «Какие Tools доступны?»
- Новый агент = регистрация нового Tool в MCP Server, оркестратор обнаруживает автоматически

```python
# mas-service/src/orchestrator.py
class MasOrchestrator:
    async def discover_agents(self):
        """Обнаружение доступных агентов через MCP."""
        tools = await self.mcp_client.list_tools()
        return [t for t in tools if t.name.endswith('.run')]

    async def run_pipeline(self, task_type, payload):
        agents = await self.discover_agents()
        strategy = self._select_strategy(task_type, agents)
        # Стратегия использует только обнаруженных агентов
        # Новый агент подключается автоматически
```

---

## Сравнительная таблица применения

| Критерий | REST API | Webhooks | MCP |
|----------|---------|----------|-----|
| **Инициатор** | Клиент | Сервер | AI-модель |
| **Модель** | Pull | Push | Двусторонняя |
| **Синхронность** | Синхронная | Асинхронная | Обе |
| **Стандарт** | OpenAPI | Нет единого | MCP Specification |
| **Безопасность** | Bearer/OAuth | HMAC подпись | OAuth 2.0 |
| **Контекст AI** | Нет | Нет | Да (ключевое!) |
| **Обнаружение** | Нет (нужна документация) | Нет | Да (автоматическое) |
| **Когда использовать** | Синхронные запросы данных | Реакция на события | AI-агенты, интеллектуальные интерфейсы |

### Когда что использовать в нашей системе

**REST API — когда:**
- PHP запрашивает данные у Django (справочники, пользователи)
- n8n выполняет CRUD-операции в Django
- Django-сервисы вызывают друг друга
- Нужен немедленный синхронный ответ (< 1 сек)

**Webhooks — когда:**
- PHP запускает долгую обработку через n8n
- n8n уведомляет PHP о готовности результата
- Реакция на внешние события (GitHub push, оплата)
- Не хочешь polling (постоянный опрос)

**MCP — когда:**
- AI-агент должен выбрать, какие инструменты использовать
- AI-модель нужен контекст из разных источников данных
- Нужна универсальная интеграция для разных AI-моделей
- MAS-оркестратор обнаруживает агентов динамически
- AI-ассистент в ЛК работает с данными пользователя

---

## Антипаттерны и правила выбора протокола

### Антипаттерны

| Антипаттерн | Проблема | Правильное решение |
|------------|----------|-------------------|
| Хардкод URL в коде агента | Не тиражируемо, ломается при смене окружения | URL из `.env`, вызовы через Gateway/Client |
| Прямой HTTP-вызов Django из n8n без контракта | Нет документации, сложно поддерживать | OpenAPI-контракт + YAML для webhook'ов |
| Webhook без HMAC-подписи | Любой может отправить фейковый запрос | HMAC-SHA256 для PHP→n8n, Bearer Token для callback'ов |
| Polling вместо Webhook | Лишняя нагрузка, задержка обнаружения | Webhook для событий, polling только как fallback |
| REST API для AI-агентов без MCP | Агент жёстко привязан к эндпоинтам | MCP-обёртка: агент обнаруживает инструменты |
| MCP без fallback на REST | При недоступности MCP Server система падает | REST API как основа, MCP — надстройка |
| Один протокол для всего | Неоптимально: синхронный для событий, асинхронный для запросов | Выбор протокола по характеру взаимодействия |

### Правила выбора

1. **По умолчанию — REST API.** Это базовый протокол для всех межсервисных вызовов
2. **Webhook — для событий.** Если источник «знает», когда что-то произошло → push
3. **MCP — для AI.** Если вызывающая сторона — AI-модель, которая сама выбирает инструменты
4. **REST + MCP — совместимость.** MCP Server = обёртка над REST. Оба интерфейса работают параллельно
5. **Контракт обязателен.** Любой протокол → документированный контракт (OpenAPI, YAML, MCP schema)

---

## Чеклист протоколов

### REST API

| # | Проверка | Критерий |
|---|----------|----------|
| 1 | OpenAPI-спецификация | Каждый Django-сервис экспортирует `/api/v1/schema/` |
| 2 | Версионирование | Все эндпоинты под `/api/v1/` |
| 3 | Авторизация | Bearer Token в каждом запросе |
| 4 | Trace ID | `X-Trace-Id` в каждом запросе |
| 5 | Tenant ID | `X-Tenant-Id` в каждом запросе |
| 6 | Логирование | Каждый вызов логируется с `duration_ms` |
| 7 | Timeout | Настраиваемый через `.env` |
| 8 | Error handling | Стандартные HTTP-коды + JSON-тело ошибки |

### Webhooks

| # | Проверка | Критерий |
|---|----------|----------|
| 1 | Контракт YAML | `docs/contracts/n8n-webhooks.yaml` описывает все webhook'и |
| 2 | HMAC-подпись | PHP→n8n: HMAC-SHA256 с общим секретом из `.env` |
| 3 | Bearer Token | n8n→PHP (callback): токен из `.env` |
| 4 | Trace ID | Пробрасывается из исходного запроса |
| 5 | Idempotency | Повторная отправка не создаёт дублей |
| 6 | Retry policy | n8n настроен на повтор при 5xx (max 3 раза) |
| 7 | Timeout | callback должен ответить за < 5 сек (подтверждение приёма) |

### MCP

| # | Проверка | Критерий |
|---|----------|----------|
| 1 | MCP Server запущен | agents-service экспортирует MCP-интерфейс (HTTP+SSE) |
| 2 | Tools зарегистрированы | `label_extractor.run`, `classifier.run` и др. доступны через MCP |
| 3 | Resources зарегистрированы | `products://`, `references://` доступны через MCP |
| 4 | Prompts зарегистрированы | Системные промпты для каждого типа задачи |
| 5 | Авторизация | OAuth 2.0 для MCP-клиентов |
| 6 | REST fallback | Все MCP Tools доступны и через REST API |
| 7 | Обнаружение | MCP Client может получить список всех Tools/Resources |
| 8 | Логирование | Каждый MCP-вызов логируется в едином формате |
