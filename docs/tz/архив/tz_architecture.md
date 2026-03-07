# Архитектура системы: PHP + n8n + Django

## Контекст и связь с другими ТЗ

Настоящий документ описывает **полную архитектуру системы** для «Ритейл Логистик» — импортёра и дистрибьютора алкогольной продукции.

**Связанные документы:**
- [tz_.md](tz_.md) — план этапов трансформации платформы (Этапы 0-5)
- [tz_reuse.md](tz_reuse.md) — принципы и инфраструктура тиражируемости

**Конечная цель:** Пользователь заходит в ЛК → по роли получает АРМ (автоматизированное рабочее место) → справочники, актуальные данные, инструменты (простые сервисы, AI-агенты, мультиагентные системы) → выполняет задачи самостоятельно или полусамостоятельно → постепенно функционал автоматизируется полностью → роль человека: целеуказание, стратегия, аудит.

**Три компонента системы:**
1. **PHP Website (iSmart Platform)** — взаимодействие с пользователями, публичная часть + ЛК/АРМ
2. **n8n** — оркестрация workflow'ов, интеграции, автоматизация процессов (развёрнут в облаке)
3. **Django** — backend-сервисы: бизнес-логика, AI-агенты, MAS (развёрнут в облаке)

---

## Карта системы

```
                            ПОЛЬЗОВАТЕЛИ
                                 |
                    ┌────────────┴────────────┐
                    |                         |
              [Публичная зона]         [Приватная зона]
              - Главная + вход         - ЛК / АРМ по ролям
              - Контакты               - Профиль
              - Политики               - Справочники
              - Демо-инструменты       - AI-инструменты
              - Магазин (vintegra.ru)   - Данные и отчёты
                    |                         |
                    └────────────┬────────────┘
                                 |
                    ┌────────────┴────────────┐
                    |    PHP WEBSITE           |
                    |    (iSmart Platform)     |
                    |                         |
                    |  N8nGateway ──────────┐ |
                    |  DjangoApiClient ───┐ | |
                    |  AuthService        | | |
                    |  AgentOrchestrator  | | |
                    └─────────────────────┼─┼─┘
                                          | |
                         ┌────────────────┘ |
                         |                  |
            ┌────────────┴────────────┐     |
            |          n8n            |     |
            |                         |     |
            |  Workflow: intake       |     |
            |  Workflow: ai-task  ────┼─────┤
            |  Workflow: notify       |     |
            |  Workflow: sync         |     |
            └────────────┬────────────┘     |
                         |                  |
                         └──────┬───────────┘
                                |
            ┌───────────────────┼───────────────────┐
            |                   |                   |
  ┌─────────┴──────┐  ┌───────┴────────┐  ┌───────┴────────┐
  |  Django         |  |  Django         |  |  Django         |
  |  Core API       |  |  Agents Service |  |  MAS Service    |
  |  (порт 8000)    |  |  (порт 8001)    |  |  (порт 8002)    |
  |                 |  |                 |  |                 |
  |  Бизнес-логика  |  |  AI-агенты:     |  |  Оркестратор    |
  |  Справочники    |  |  - Классификатор|  |  мультиагентных |
  |  Данные         |  |  - Извлечение   |  |  систем         |
  |  Пользователи   |  |    с этикеток   |  |  Message Bus    |
  |                 |  |  - Обрезка фона |  |                 |
  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Потоки данных

| Поток | Направление | Протокол | Авторизация |
|-------|------------|----------|-------------|
| Пользователь → PHP | HTTPS | — (публичная) / JWT (приватная) | Форма входа → JWT-токен |
| PHP → n8n | HTTPS POST | HMAC-SHA256 + X-Trace-Id | Подпись тела запроса |
| n8n → PHP (callback) | HTTPS POST | Bearer Token | API-ключ платформы |
| n8n → Django | HTTP POST | Bearer Token + X-Trace-Id | Сервисный токен |
| PHP → Django (прямой) | HTTP POST | Bearer Token + X-Trace-Id | Сервисный токен |
| Django → Django | HTTP (внутренний) | Bearer Token | Межсервисный токен |

---

## Компонент 1: PHP Website (iSmart Platform)

### Текущие сервисы (ядро)

Уже реализованы и описаны в [tz_.md](tz_.md):
- `DataLoaderService` — загрузка JSON-контента
- `SeoService` — SEO-данные
- `LanguageService` — определение языка
- `TemplateDataBuilder` — сборка данных для шаблона
- `PageAction` — оркестратор HTTP-запросов

### Новые сервисы (Этапы 2-4)

**Файл:** `src/Service/`

#### N8nGateway

Единая точка взаимодействия с n8n. Инкапсулирует HTTP-вызовы, подпись HMAC, передачу Trace ID.

```php
// src/Contracts/AutomationGatewayInterface.php
interface AutomationGatewayInterface
{
    /**
     * Запустить workflow в n8n
     * @param string $workflowId ID или slug workflow'а
     * @param array $payload Данные для передачи
     * @return WorkflowResult Результат запуска (execution_id, status)
     * @throws AutomationException При ошибке связи или невалидном ответе
     */
    public function triggerWorkflow(string $workflowId, array $payload): WorkflowResult;

    /**
     * Получить статус выполнения workflow
     * @param string $executionId ID выполнения
     * @return WorkflowStatus Статус (running, success, error)
     */
    public function getWorkflowStatus(string $executionId): WorkflowStatus;
}

// src/Service/N8nGateway.php
class N8nGateway implements AutomationGatewayInterface
{
    public function __construct(
        private HttpClientInterface $http,
        private string $baseUrl,      // из .env: N8N_BASE_URL
        private string $apiKey,       // из .env: N8N_API_KEY
        private string $hmacSecret,   // из .env: N8N_HMAC_SECRET
        private LoggerInterface $logger,
    ) {}

    public function triggerWorkflow(string $workflowId, array $payload): WorkflowResult
    {
        $traceId = TraceContext::current()->getTraceId();
        $body = json_encode($payload);
        $signature = hash_hmac('sha256', $body, $this->hmacSecret);

        $response = $this->http->post("{$this->baseUrl}/webhook/{$workflowId}", [
            'body' => $body,
            'headers' => [
                'Content-Type'  => 'application/json',
                'X-Trace-Id'    => $traceId,
                'X-Tenant-Id'   => TenantContext::current()->getId(),
                'X-HMAC-SHA256' => $signature,
            ],
        ]);

        $this->logger->info('n8n.workflow.triggered', [
            'trace_id'    => $traceId,
            'workflow_id' => $workflowId,
            'status'      => $response->getStatusCode(),
        ]);

        return WorkflowResult::fromResponse($response);
    }
}
```

#### DjangoApiClient

Единая точка взаимодействия с Django-сервисами. Поддерживает обращение к core-api, agents-service, mas-service.

```php
// src/Contracts/AiServiceInterface.php
interface AiServiceInterface
{
    /**
     * Запустить AI-агента
     * @param string $agentType Тип агента (classifier, label_extractor, background_remover)
     * @param array $payload Входные данные агента
     * @return AgentResult Результат (status, result, confidence, processing_ms)
     * @throws AiServiceException При ошибке или таймауте
     */
    public function runAgent(string $agentType, array $payload): AgentResult;

    /**
     * Запустить мультиагентную систему
     * @param string $taskType Тип задачи
     * @param array $payload Входные данные
     * @return MasResult Результат оркестрации
     */
    public function runMas(string $taskType, array $payload): MasResult;
}

// src/Service/DjangoApiClient.php
class DjangoApiClient implements AiServiceInterface
{
    public function __construct(
        private HttpClientInterface $http,
        private string $coreUrl,      // из .env: DJANGO_CORE_URL
        private string $agentsUrl,    // из .env: DJANGO_AGENTS_URL
        private string $masUrl,       // из .env: DJANGO_MAS_URL
        private string $serviceToken, // из .env: DJANGO_SERVICE_TOKEN
        private LoggerInterface $logger,
    ) {}

    public function runAgent(string $agentType, array $payload): AgentResult
    {
        $traceId = TraceContext::current()->getTraceId();

        $response = $this->http->post("{$this->agentsUrl}/api/v1/agent/run", [
            'json' => [
                'task_id'    => Uuid::v4(),
                'agent_type' => $agentType,
                'payload'    => $payload,
                'tenant_id'  => TenantContext::current()->getId(),
            ],
            'headers' => [
                'Authorization' => "Bearer {$this->serviceToken}",
                'X-Trace-Id'    => $traceId,
            ],
        ]);

        $this->logger->info('django.agent.executed', [
            'trace_id'   => $traceId,
            'agent_type' => $agentType,
            'status'     => $response->getStatusCode(),
        ]);

        return AgentResult::fromResponse($response);
    }
}
```

#### AuthService

Аутентификация и авторизация пользователей.

```php
// src/Service/AuthService.php
class AuthService
{
    /**
     * Аутентификация по email/пароль
     * @return AuthResult Содержит JWT-токен и данные пользователя (роль, статус модерации)
     */
    public function authenticate(string $email, string $password): AuthResult;

    /**
     * Регистрация нового пользователя (статус: awaiting_moderation)
     */
    public function register(string $email, string $password, array $profile): RegisterResult;

    /**
     * Валидация JWT-токена и извлечение данных пользователя
     */
    public function validateToken(string $token): ?UserClaims;

    /**
     * Проверка роли пользователя
     * @param string $role Требуемая роль (mdm, purchasing_ved, admin)
     */
    public function hasRole(UserClaims $user, string $role): bool;
}
```

### Конфигурация интеграций

**Файл:** `config/project.php`

```php
return [
    // ... существующие настройки (route_map, collections, sitemap_pages) ...

    'n8n' => [
        'base_url'    => env('N8N_BASE_URL'),
        'api_key'     => env('N8N_API_KEY'),
        'hmac_secret' => env('N8N_HMAC_SECRET'),
        'timeout'     => (int) env('N8N_TIMEOUT', 30),
        'workflows'   => [
            'lead_intake'  => 'lead-intake',
            'ai_task'      => 'ai-task',
            'notification' => 'notify',
        ],
    ],

    'django' => [
        'core_url'      => env('DJANGO_CORE_URL'),
        'agents_url'    => env('DJANGO_AGENTS_URL'),
        'mas_url'       => env('DJANGO_MAS_URL'),
        'service_token' => env('DJANGO_SERVICE_TOKEN'),
        'timeout'       => (int) env('DJANGO_TIMEOUT', 60),
    ],

    'auth' => [
        'jwt_secret' => env('JWT_SECRET'),
        'jwt_ttl'    => (int) env('JWT_TTL', 3600),
        'provider'   => env('AUTH_PROVIDER', 'php'),  // 'php' или 'django'
    ],

    'roles' => [
        'mdm' => [
            'label' => 'MDM',
            'arms'  => ['mdm-dashboard', 'mdm-references', 'mdm-tools'],
        ],
        'purchasing_ved' => [
            'label' => 'Закупка и ВЭД',
            'arms'  => ['purchasing-dashboard', 'ved-tools', 'label-extractor'],
        ],
        'admin' => [
            'label' => 'Администратор',
            'arms'  => ['*'],  // доступ ко всем АРМ
        ],
    ],
];
```

### Ролевая модель и АРМ

**Принцип:** Роль определяет набор доступных АРМ-модулей. АРМ-модуль — это компонент реестра (Twig-шаблон + JSON-конфигурация + JS), подключаемый через `project.php`.

| Роль | Описание | Доступные АРМ |
|------|---------|--------------|
| `mdm` | Управление мастер-данными | Справочники, классификаторы, качество данных |
| `purchasing_ved` | Закупка и ВЭД | Анализ этикеток, работа с поставщиками, документооборот |
| `admin` | Суперроль | Все АРМ + управление пользователями, модерация |

**Жизненный цикл пользователя:**
1. Регистрация → статус `awaiting_moderation`
2. Модерация (админ подтверждает) → статус `active`, назначается роль
3. Вход → JWT-токен → ЛК → АРМ по роли

### Разделы сайта «Ритейл Логистик»

**Публичные (без авторизации):**

| Страница | page_id | Описание |
|----------|---------|----------|
| Главная | `index` | Лендинг + форма входа/регистрации |
| Контакты | `contacts` | Контактная информация (уже есть) |
| Политики | `policy`, `agree` | Правовые документы (уже есть) |
| Демо-инструменты | `demo-tools` | Примеры AI-сервисов: загрузка бутылки → извлечение данных с этикетки, обрезка по контуру и т.д. |
| Интернет-магазин | — | Пункт меню → внешняя ссылка на vintegra.ru |

**Приватные (после авторизации и модерации):**

| Страница | page_id | Описание |
|----------|---------|----------|
| ЛК / Dashboard | `dashboard` | Сводка по роли, быстрый доступ к АРМ |
| Профиль | `profile` | Данные пользователя, смена пароля |
| АРМ: MDM | `arm-mdm` | Справочники, классификаторы |
| АРМ: Закупка/ВЭД | `arm-purchasing` | Инструменты для закупки и ВЭД |
| АРМ: Админ | `arm-admin` | Управление пользователями, модерация, все АРМ |

---

## Компонент 2: n8n

### Архитектура workflow'ов

n8n развёрнут в облаке и выполняет роль **оркестратора процессов** между PHP-сайтом и Django-сервисами.

**Типы workflow'ов:**

| Workflow | Триггер | Действие | Результат |
|----------|---------|---------|-----------|
| `lead-intake` | Webhook от PHP (публичная форма) | Валидация → сохранение в Django Core → уведомление | Заявка создана, менеджер уведомлён |
| `ai-task` | Webhook от PHP (ЛК/АРМ) | Маршрутизация к Django Agents → ожидание → callback | Результат AI-обработки в ЛК |
| `notify` | Внутренний триггер / callback | Отправка уведомлений (email, Telegram, push в ЛК) | Пользователь уведомлён |
| `sync` | Расписание (cron) | Синхронизация справочников, обновление данных | Актуальные данные в системе |

### Контракты webhook'ов

**Файл:** `docs/contracts/n8n-webhooks.yaml`

```yaml
webhooks:

  lead-intake:
    description: "Приём заявки с публичной части сайта"
    url: "/webhook/lead-intake"
    method: POST
    auth: hmac-sha256
    headers:
      required:
        - X-HMAC-SHA256: string     # Подпись тела запроса
        - X-Trace-Id: string        # Сквозной ID для трассировки
        - X-Tenant-Id: string       # ID тенанта
    input:
      required:
        - name: string              # Имя заявителя
        - email: string             # Email
        - source: string            # Источник (utm-метка или страница)
      optional:
        - phone: string
        - message: string
    output:
      success:
        execution_id: string        # ID для отслеживания
        status: "accepted"
      error:
        code: integer
        message: string
    errors:
      400: "Невалидные данные"
      401: "Неверная подпись HMAC"
      429: "Превышен лимит запросов"

  ai-task:
    description: "Запуск AI-агента на обработку задачи"
    url: "/webhook/ai-task"
    method: POST
    auth: bearer-token
    headers:
      required:
        - Authorization: "Bearer {token}"
        - X-Trace-Id: string
        - X-Tenant-Id: string
    input:
      required:
        - task_type: enum[classify, label_extract, background_remove, summarize, analyze]
        - payload: object            # Входные данные для агента
        - callback_url: string       # URL для возврата результата
      optional:
        - priority: enum[low, normal, high]
    output:
      success:
        execution_id: string
        status: "queued"
      error:
        code: integer
        message: string

  notify:
    description: "Callback с результатом обработки"
    url: "/webhook/notify"
    method: POST
    auth: bearer-token
    input:
      required:
        - execution_id: string       # ID исходного запроса
        - status: enum[success, error, partial]
        - result: object             # Результат обработки
      optional:
        - confidence: float          # 0.0 - 1.0
        - processing_ms: integer
```

### Безопасность n8n

| Направление | Механизм | Реализация |
|------------|----------|-----------|
| PHP → n8n | HMAC-SHA256 | PHP подписывает тело запроса ключом `N8N_HMAC_SECRET`, n8n проверяет подпись |
| n8n → PHP | Bearer Token | n8n отправляет callback с `Authorization: Bearer {PLATFORM_API_KEY}` |
| n8n → Django | Bearer Token | n8n использует `DJANGO_SERVICE_TOKEN` для авторизации |

---

## Компонент 3: Django Services

### Общая структура

Три изолированных Django-сервиса, каждый со своим Dockerfile, зависимостями и API:

```
django-services/
├── core-api/                      # Основной бизнес-API (порт 8000)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── src/
│       ├── api/v1/
│       │   ├── endpoints.py       # REST API эндпоинты
│       │   └── serializers.py
│       ├── models/                # Модели данных (пользователи, справочники)
│       ├── services/              # Бизнес-логика
│       └── middleware/
│           └── tenant.py          # TenantMiddleware
│
├── agents-service/                # AI Агенты (порт 8001)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── src/
│       ├── agents/
│       │   ├── base_agent.py           # Абстрактный BaseAgent
│       │   ├── classifier_agent.py     # Классификатор (текст, изображения)
│       │   ├── label_extractor_agent.py # Извлечение данных с этикеток
│       │   ├── background_remover_agent.py # Обрезка по контуру
│       │   └── summarizer_agent.py     # Суммаризация текста
│       ├── api/v1/
│       │   └── endpoints.py
│       └── middleware/
│           └── trace.py           # TraceIdMiddleware
│
└── mas-service/                   # Multi-Agent System (порт 8002)
    ├── Dockerfile
    ├── requirements.txt
    └── src/
        ├── orchestrator.py        # Управление агентами
        ├── message_bus.py         # Внутренний обмен сообщениями
        ├── strategies/            # Стратегии координации агентов
        └── api/v1/
            └── endpoints.py
```

### Контракт агента (BaseAgent)

Все AI-агенты наследуют `BaseAgent` и реализуют единый интерфейс:

```python
# agents-service/src/agents/base_agent.py
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any
import time
import uuid


@dataclass
class AgentInput:
    """Входные данные для агента"""
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    payload: dict[str, Any] = field(default_factory=dict)
    priority: str = "normal"       # low | normal | high
    tenant_id: str | None = None
    trace_id: str | None = None


@dataclass
class AgentOutput:
    """Результат работы агента"""
    task_id: str = ""
    status: str = "success"        # success | error | partial
    result: dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0        # 0.0 - 1.0
    processing_ms: int = 0
    error_message: str | None = None


class BaseAgent(ABC):
    """
    Абстрактный базовый агент.
    Все AI-агенты наследуют этот класс и реализуют validate_input() и process().
    Метод run() обеспечивает единый pipeline: validate -> process -> return.
    """

    @abstractmethod
    def validate_input(self, data: AgentInput) -> bool:
        """Валидация входных данных. Raise ValueError при невалидных данных."""
        pass

    @abstractmethod
    def process(self, data: AgentInput) -> AgentOutput:
        """Основная логика агента. Реализуется в наследниках."""
        pass

    def run(self, data: AgentInput) -> AgentOutput:
        """Общий pipeline: validate -> process -> return с замером времени."""
        start = time.monotonic()
        try:
            self.validate_input(data)
            result = self.process(data)
            result.task_id = data.task_id
            result.processing_ms = int((time.monotonic() - start) * 1000)
            return result
        except ValueError as e:
            return AgentOutput(
                task_id=data.task_id,
                status="error",
                error_message=str(e),
                processing_ms=int((time.monotonic() - start) * 1000),
            )
        except Exception as e:
            return AgentOutput(
                task_id=data.task_id,
                status="error",
                error_message=f"Internal error: {type(e).__name__}",
                processing_ms=int((time.monotonic() - start) * 1000),
            )
```

### Примеры агентов для «Ритейл Логистик»

#### LabelExtractorAgent

Загрузка изображения бутылки с этикеткой → извлечение структурированной информации.

```python
# agents-service/src/agents/label_extractor_agent.py
class LabelExtractorAgent(BaseAgent):
    """
    Агент извлечения данных с этикеток алкогольной продукции.
    Вход: изображение (base64 или URL)
    Выход: название, производитель, страна, объём, крепость, тип напитка
    """

    def validate_input(self, data: AgentInput) -> bool:
        if 'image' not in data.payload and 'image_url' not in data.payload:
            raise ValueError("Required: 'image' (base64) or 'image_url'")
        return True

    def process(self, data: AgentInput) -> AgentOutput:
        # Логика: отправка в Vision LLM → парсинг структурированного ответа
        extracted = self._extract_from_image(data.payload)
        return AgentOutput(
            status="success",
            result={
                "product_name": extracted.get("name"),
                "manufacturer": extracted.get("manufacturer"),
                "country": extracted.get("country"),
                "volume_ml": extracted.get("volume"),
                "alcohol_pct": extracted.get("alcohol"),
                "drink_type": extracted.get("type"),
                "raw_text": extracted.get("ocr_text"),
            },
            confidence=extracted.get("confidence", 0.0),
        )
```

#### BackgroundRemoverAgent

Обрезка по контуру (удаление фона).

```python
# agents-service/src/agents/background_remover_agent.py
class BackgroundRemoverAgent(BaseAgent):
    """
    Агент удаления фона изображения.
    Вход: изображение (base64 или URL)
    Выход: изображение без фона (base64 PNG)
    """

    def validate_input(self, data: AgentInput) -> bool:
        if 'image' not in data.payload and 'image_url' not in data.payload:
            raise ValueError("Required: 'image' (base64) or 'image_url'")
        return True

    def process(self, data: AgentInput) -> AgentOutput:
        # Логика: вызов модели сегментации → удаление фона → PNG
        result_image = self._remove_background(data.payload)
        return AgentOutput(
            status="success",
            result={
                "image_base64": result_image,
                "format": "png",
            },
            confidence=0.95,
        )
```

### MAS Orchestrator

Для сложных задач, требующих координации нескольких агентов:

```python
# mas-service/src/orchestrator.py
class MasOrchestrator:
    """
    Оркестратор мультиагентных систем.
    Координирует выполнение нескольких агентов для решения составной задачи.

    Пример: полный анализ продукта =
      1. BackgroundRemover (очистка фото)
      2. LabelExtractor (извлечение данных с этикетки)
      3. Classifier (классификация продукта)
    """

    def __init__(self, agents_client: AgentsServiceClient):
        self.agents_client = agents_client

    async def run_pipeline(
        self,
        task_type: str,
        payload: dict,
        tenant_id: str,
        trace_id: str,
    ) -> MasResult:
        """Запуск pipeline агентов согласно стратегии для task_type."""
        strategy = self._get_strategy(task_type)
        results = []

        for step in strategy.steps:
            agent_input = step.prepare_input(payload, results)
            result = await self.agents_client.run_agent(
                agent_type=step.agent_type,
                payload=agent_input,
                tenant_id=tenant_id,
                trace_id=trace_id,
            )
            results.append(result)

            if result.status == "error" and step.required:
                return MasResult(status="error", steps=results)

        return MasResult(status="success", steps=results)
```

### API Versioning

Все Django-сервисы используют версионирование API: `/api/v1/`.

```python
# agents-service/src/api/v1/endpoints.py
from rest_framework.views import APIView
from rest_framework.response import Response

class AgentRunView(APIView):
    """POST /api/v1/agent/run — запуск агента."""

    def post(self, request):
        agent_type = request.data.get('agent_type')
        agent = AgentRegistry.get(agent_type)

        result = agent.run(AgentInput(
            task_id=request.data.get('task_id', str(uuid4())),
            payload=request.data.get('payload', {}),
            tenant_id=request.data.get('tenant_id'),
            trace_id=request.headers.get('X-Trace-Id'),
        ))

        return Response({
            'task_id': result.task_id,
            'status': result.status,
            'result': result.result,
            'confidence': result.confidence,
            'processing_ms': result.processing_ms,
        })


class AgentListView(APIView):
    """GET /api/v1/agents — список доступных агентов."""

    def get(self, request):
        return Response({
            'agents': [
                {'type': 'classifier', 'status': 'stable', 'description': '...'},
                {'type': 'label_extractor', 'status': 'stable', 'description': '...'},
                {'type': 'background_remover', 'status': 'stable', 'description': '...'},
                {'type': 'summarizer', 'status': 'experimental', 'description': '...'},
            ]
        })
```

### TenantMiddleware (Django)

```python
# core-api/src/middleware/tenant.py
class TenantMiddleware:
    """
    Извлекает tenant_id из заголовка X-Tenant-Id или JWT-токена.
    Устанавливает контекст тенанта для изоляции данных.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant_id = request.headers.get('X-Tenant-Id')
        if not tenant_id:
            # Извлечь из JWT, если есть
            tenant_id = self._extract_from_jwt(request)

        request.tenant_id = tenant_id
        response = self.get_response(request)
        return response
```

---

## Сквозная наблюдаемость

### Единый формат логов

Все три компонента (PHP, n8n, Django) пишут логи в **одном JSON-формате**:

```json
{
  "timestamp": "2026-03-07T15:30:00.000Z",
  "level": "INFO",
  "service": "php-website",
  "tenant_id": "retail-logistic",
  "trace_id": "tr-abc123-def456",
  "request_id": "req-789xyz",
  "event": "n8n.workflow.triggered",
  "method": "POST",
  "path": "/webhook/ai-task",
  "duration_ms": 145,
  "data": {
    "workflow_id": "ai-task",
    "agent_type": "label_extractor"
  }
}
```

### Поля стандарта

| Поле | Тип | Обязательное | Описание |
|------|-----|-------------|----------|
| `timestamp` | ISO 8601 | Да | Время события |
| `level` | string | Да | DEBUG, INFO, WARNING, ERROR |
| `service` | string | Да | Имя компонента: php-website, n8n, django-core, django-agents, django-mas |
| `tenant_id` | string | Да | ID тенанта/заказчика |
| `trace_id` | string | Да | Сквозной ID запроса (пробрасывается через все компоненты) |
| `request_id` | string | Нет | Локальный ID запроса внутри компонента |
| `event` | string | Да | Семантическое имя события (формат: `компонент.сущность.действие`) |
| `method` | string | Нет | HTTP-метод |
| `path` | string | Нет | HTTP-путь |
| `duration_ms` | integer | Нет | Длительность операции в мс |
| `data` | object | Нет | Произвольные данные события |

### Сквозной Trace ID

```
PHP (генерирует trace_id)
  → X-Trace-Id: tr-abc123
    → n8n (пробрасывает)
      → X-Trace-Id: tr-abc123
        → Django Agents (логирует)
          → X-Trace-Id: tr-abc123
            → MAS (логирует)
              → X-Trace-Id: tr-abc123
```

**PHP** — генерирует в `CorrelationIdMiddleware`, пробрасывает через `N8nGateway` и `DjangoApiClient`.

**n8n** — принимает `X-Trace-Id` из входящего webhook, пробрасывает во все исходящие HTTP-вызовы.

**Django** — `TraceIdMiddleware` извлекает из заголовка, добавляет в контекст логирования.

---

## Безопасность и авторизация

### Схема авторизации между компонентами

```
                    HMAC-SHA256              Bearer Token
  [PHP Website] ──────────────→ [n8n] ──────────────→ [Django]
       ↑                          |                      |
       |     Bearer Token         |                      |
       └──────────────────────────┘                      |
                (callback)                               |
                                     Bearer Token        |
  [Django Core] ←────────────────────────────────────────┘
                    (межсервисный)
```

### Детали

**1. Пользователь ↔ PHP Website**
- Форма входа → `AuthService::authenticate()` → JWT-токен
- JWT хранится в HttpOnly cookie (не в localStorage)
- Каждый запрос к приватной зоне проверяется `AuthMiddleware`
- JWT payload: `{ user_id, email, role, tenant_id, exp }`

**2. PHP Website → n8n**
- Механизм: HMAC-SHA256 подпись тела запроса
- Заголовок: `X-HMAC-SHA256: {signature}`
- Ключ: `N8N_HMAC_SECRET` (общий секрет, хранится в `.env` обоих компонентов)
- n8n проверяет подпись перед обработкой

**3. n8n → PHP Website (callback)**
- Механизм: Bearer Token
- Заголовок: `Authorization: Bearer {PLATFORM_API_KEY}`
- PHP проверяет токен в middleware

**4. n8n → Django**
- Механизм: Bearer Token
- Заголовок: `Authorization: Bearer {DJANGO_SERVICE_TOKEN}`
- Единый сервисный токен для всех Django-сервисов

**5. Django ↔ Django (межсервисный)**
- Механизм: Bearer Token (межсервисный)
- Внутренняя сеть Docker (не выходит наружу)

### Обязательные заголовки во всех межсервисных вызовах

```
Authorization: Bearer {token}       # Авторизация
X-Trace-Id: {trace_id}             # Сквозная трассировка
X-Tenant-Id: {tenant_id}           # Изоляция по тенанту
Content-Type: application/json      # Формат данных
```

---

## Структура тиражируемого решения

### Общая структура

```
solution/
├── core/                           # ЯДРО — не менять при тиражировании
│   ├── php-site/                   #   PHP Website (iSmart Platform)
│   │   ├── src/
│   │   ├── templates/
│   │   ├── config/settings.php
│   │   └── tools/
│   ├── n8n-workflows/              #   Экспортированные workflow'ы
│   │   ├── lead-intake.json
│   │   ├── ai-task.json
│   │   ├── notify.json
│   │   └── sync.json
│   ├── django-core/                #   Core API
│   ├── django-agents/              #   Agents Service
│   └── django-mas/                 #   MAS Service
│
├── profiles/                       # Профили внедрения
│   ├── small-business/
│   │   └── config.yaml             # Минимум: PHP + n8n, без MAS
│   ├── enterprise/
│   │   └── config.yaml             # Полный стек: PHP + n8n + Django (все сервисы)
│   └── saas/
│       └── config.yaml             # Multi-tenant конфигурация
│
├── deployments/                    # Конфигурации конкретных внедрений
│   ├── retail-logistic/            #   «Ритейл Логистик»
│   │   ├── .env
│   │   ├── config/project.php
│   │   ├── data/json/
│   │   ├── assets/css/base/variables.css
│   │   └── docker-compose.yml
│   └── other-client/
│       └── ...
│
└── extensions/                     # Расширения без изменения ядра
    ├── custom-agents/              #   Кастомные AI-агенты клиентов
    │   └── retail-logistic/
    │       └── wine_classifier_agent.py
    ├── custom-workflows/           #   Кастомные n8n workflow'ы
    │   └── retail-logistic/
    │       └── ved-document-processing.json
    └── custom-templates/           #   Кастомные Twig-шаблоны
        └── retail-logistic/
            └── arm-purchasing.twig
```

### Что остаётся неизменным при тиражировании

| Компонент | Неизменное ядро | Настраиваемый слой |
|-----------|----------------|-------------------|
| PHP Website | `src/`, `templates/sections/`, `templates/components/`, `config/settings.php` | `config/project.php`, `data/json/`, `assets/css/base/variables.css` |
| n8n | Базовые workflow'ы (lead-intake, ai-task, notify) | Кастомные workflow'ы в `extensions/` |
| Django Core | Модели, API, middleware | Конфигурация тенанта, миграции данных |
| Django Agents | BaseAgent, API | Кастомные агенты в `extensions/custom-agents/` |
| Django MAS | Orchestrator, Message Bus | Стратегии координации |

---

## Конфигурация интеграций

### .env для полной системы

```env
# === PHP Website ===
APP_BASE_URL=https://retail-logistic.ru
APP_ENV=production
APP_DEBUG=0
APP_DEFAULT_LANG=ru

# JWT авторизация
JWT_SECRET=your-jwt-secret-key-here
JWT_TTL=3600

# === n8n ===
N8N_BASE_URL=https://n8n.retail-logistic.ru
N8N_API_KEY=your-n8n-api-key
N8N_HMAC_SECRET=your-shared-hmac-secret
N8N_TIMEOUT=30

# === Django ===
DJANGO_CORE_URL=http://core-api:8000
DJANGO_AGENTS_URL=http://agents-service:8001
DJANGO_MAS_URL=http://mas-service:8002
DJANGO_SERVICE_TOKEN=your-django-service-token
DJANGO_TIMEOUT=60

# === Аналитика ===
YANDEX_METRIC_ID=your-metric-id

# === Photoroom (для обрезки фона, если используется внешний API) ===
PHOTOROOM_API_KEY=your-photoroom-key
```

### Регистрация в DI-контейнере

**Файл:** `config/container.php`

```php
// N8nGateway — взаимодействие с n8n
N8nGateway::class => function (ContainerInterface $c) {
    $settings = $c->get('settings');
    return new N8nGateway(
        http: $c->get(HttpClientInterface::class),
        baseUrl: $settings['n8n']['base_url'],
        apiKey: $settings['n8n']['api_key'],
        hmacSecret: $settings['n8n']['hmac_secret'],
        logger: $c->get(LoggerInterface::class),
    );
},
AutomationGatewayInterface::class => \DI\get(N8nGateway::class),

// DjangoApiClient — взаимодействие с Django
DjangoApiClient::class => function (ContainerInterface $c) {
    $settings = $c->get('settings');
    return new DjangoApiClient(
        http: $c->get(HttpClientInterface::class),
        coreUrl: $settings['django']['core_url'],
        agentsUrl: $settings['django']['agents_url'],
        masUrl: $settings['django']['mas_url'],
        serviceToken: $settings['django']['service_token'],
        logger: $c->get(LoggerInterface::class),
    );
},
AiServiceInterface::class => \DI\get(DjangoApiClient::class),

// AuthService — авторизация
AuthService::class => function (ContainerInterface $c) {
    $settings = $c->get('settings');
    return new AuthService(
        jwtSecret: $settings['auth']['jwt_secret'],
        jwtTtl: $settings['auth']['jwt_ttl'],
        logger: $c->get(LoggerInterface::class),
    );
},
```

---

## Чеклист архитектурной готовности

### Инфраструктура

| # | Проверка | Статус | Критерий |
|---|----------|--------|----------|
| 1 | Конфиг в .env | Планируется | Все URL, ключи, секреты вынесены в `.env`, ноль хардкодов |
| 2 | Контракты API | Планируется | OpenAPI/YAML для всех webhook'ов и Django-эндпоинтов |
| 3 | Изоляция сервисов | Планируется | Django разделён на 3 сервиса с отдельными Dockerfile |
| 4 | Trace ID сквозной | Частично | PHP имеет CorrelationId; нужно пробросить через n8n и Django |
| 5 | Tenant ID везде | Планируется | X-Tenant-Id в каждом межсервисном вызове |
| 6 | Профили внедрения | Планируется | `profiles/` с конфигурациями small-business, enterprise, saas |
| 7 | Версионирование API | Планируется | `/api/v1/` во всех Django-сервисах |
| 8 | Unit-тесты агентов | Планируется | Каждый агент тестируется в изоляции |

### Безопасность

| # | Проверка | Критерий |
|---|----------|----------|
| 1 | JWT авторизация | Токен в HttpOnly cookie, проверка в AuthMiddleware |
| 2 | HMAC для webhook'ов | PHP подписывает → n8n проверяет; ключ в `.env` |
| 3 | Bearer Token для Django | Сервисный токен в `.env`, проверка в middleware |
| 4 | Межсервисная сеть | Django-сервисы доступны только через внутреннюю сеть Docker |

### Наблюдаемость

| # | Проверка | Критерий |
|---|----------|----------|
| 1 | JSON-логи PHP | `tail -1 logs/app.log` парсится как JSON с обязательными полями |
| 2 | JSON-логи Django | Все сервисы пишут в едином формате |
| 3 | Trace ID сквозной | Один trace_id прослеживается от PHP через n8n до Django |
| 4 | Duration | Все компоненты логируют `duration_ms` |

### Тиражируемость

| # | Проверка | Критерий |
|---|----------|----------|
| 1 | Новый заказчик без правки ядра | `deployments/new-client/` + `.env` + `project.php` = рабочая система |
| 2 | Кастомный агент без правки ядра | Агент в `extensions/custom-agents/` подключается через конфиг |
| 3 | Кастомный workflow без правки ядра | Workflow в `extensions/custom-workflows/` импортируется в n8n |
| 4 | Обратная совместимость | Обновление ядра не ломает существующие инсталляции |
