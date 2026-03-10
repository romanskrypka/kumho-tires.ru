# Техническое задание: iSmart Platform — тиражируемая платформа

## 1. Контекст

**Проект:** iSmart Platform (PHP 8.5+, Slim 4, Twig 3, Webpack, JSON-контент).
**Первый заказчик:** «Ритейл Логистик» (РЛ) — импортёр и дистрибьютор алкогольной продукции.
**Текущее состояние:** Платформа содержит контент шинного бренда Kumho. PHP-ядро полностью content-agnostic: `DataLoaderService` использует универсальные методы `loadEntitySlugs`/`loadEntity`, `PageAction` обрабатывает все коллекции единым циклом (0 хардкодов tires/news/kumho в `src/`). Проектная конфигурация вынесена в `config/project.php`. Инфраструктура тиражирования готова: Event Dispatcher (PSR-14), JSON-логирование, PHPDoc-контракты, scaffold-генераторы (create-collection, create-page, create-deployment). Отсутствует система ролей и личных кабинетов. Нет связи с n8n, не создан Django с сервисами.

**Ключевой принцип: тиражируемость.** Каждая инсталляция = своё ядро платформы + свой контент/брендинг + своя n8n + свои Django-сервисы.

**Конечная цель:** Пользователь заходит в ЛК → по роли получает АРМ → справочники, данные, инструменты (сервисы, AI-агенты, MAS) → выполняет задачи → постепенно функционал автоматизируется → роль человека: целеуказание, стратегия, аудит.

---

## 2. Три компонента системы

```
                            ПОЛЬЗОВАТЕЛИ
                                 |
                    +------------+------------+
                    |                         |
              [Публичная зона]         [Приватная зона]
              - Главная + вход         - ЛК / АРМ по ролям
              - Контакты               - Профиль
              - Политики               - Справочники
              - Демо-инструменты       - AI-инструменты
              - Магазин (vintegra.ru)   - Данные и отчёты
                    |                         |
                    +------------+------------+
                                 |
                    +------------+------------+
                    |    PHP WEBSITE           |
                    |    (iSmart Platform)     |
                    |    = ЛИЦО СИСТЕМЫ       |
                    |                         |
                    |  N8nGateway             |
                    |  DjangoApiClient        |
                    |  AuthService            |
                    +-----+-------------+-----+
                          |             |
             +------------+    +--------+----------+
             |                 |                   |
  +----------+------+  +------+---------+  +------+---------+
  |       n8n       |  |  Django        |  |  Django        |
  |  = НЕРВЫ        |  |  Core API     |  |  Agents Service|
  |                 |  |  (порт 8000)  |  |  (порт 8001)  |
  |  Workflows      |  |  = МОЗГ       |  |               |
  |  Триггеры       |  |               |  |  AI-агенты    |
  |  Маршрутизация  |  |  Бизнес-      |  |  MCP Server   |
  |  400+ интеграций|  |  логика       |  |               |
  +---------+-------+  |  Справочники  |  +-------+-------+
            |          |  Пользователи |          |
            |          +-------+-------+  +-------+-------+
            |                  |          |  Django        |
            |                  |          |  MAS Service   |
            +------------------+          |  (порт 8002)  |
                                          |               |
                                          |  Оркестратор  |
                                          |  Message Bus  |
                                          +---------------+
```

### Метафора

- **PHP = Лицо** — что видит пользователь. Быстрое, SEO-оптимизированное
- **n8n = Нервы** — как передаётся сигнал. Связывает компоненты, реагирует на события
- **Django = Мозг** — где принимаются решения. AI, бизнес-логика, данные

### Границы ответственности

| Компонент | Что ДЕЛАЕТ | Что НЕ делает |
|-----------|-----------|--------------|
| **PHP** | UI, контент, SEO, сессии, формы, API-прокси | AI/ML обработка, тяжёлые вычисления |
| **n8n** | Маршрутизация вызовов, триггеры (cron/webhook), интеграции с внешними сервисами | Обработка данных, парсинг файлов, ML, тяжёлая бизнес-логика |
| **Django** | Бизнес-логика, AI-агенты, ML-модели, REST API, Celery-задачи, персонализация, данные | UI рендеринг, SEO |

**Критическое правило: n8n = дирижёр, НЕ исполнитель.**

| # | Правило | Обоснование |
|---|---------|-------------|
| 1 | Max 10-15 нод в workflow | Если больше — часть логики в Django service |
| 2 | n8n НЕ парсит файлы | Изображения, PDF, CSV -> Django |
| 3 | n8n НЕ делает ML/AI | Vision API, LLM, embeddings -> Django |
| 4 | n8n НЕ хранит данные | Результаты -> Django Core (PostgreSQL) |
| 5 | Queue Mode + Redis | Self-hosted n8n с очередями для надёжности |
| 6 | > 1000 вызовов/час -> Celery | Высоконагруженные задачи -> Django Celery |
| 7 | Retry policy: max 3 раза | 5xx от Django -> n8n перезапускает (с backoff) |
| 8 | Timeout: 30 сек на webhook | n8n не ждёт долго, Django обрабатывает асинхронно |

---

## 3. Дорожная карта

| Этап | Что | Результат | Измерения |
|------|-----|-----------|-----------|
| **0. Отделение контента от ядра** | Универсальный загрузчик коллекций, чистка хардкодов, `project.php`, версионирование | **ЗАВЕРШЁН.** Платформа content-agnostic: замена контента = JSON + Twig + CSS, 0 правок PHP | Переиспользуемость, Гибкость |
| **0.5. Инфраструктура тиражирования** | Контракты, Event Dispatcher, реестр, scaffold, JSON-логи | **ЗАВЕРШЁН.** Готовность к тиражированию | Тиражируемость, Гибкость |
| **1. Scaffold-генераторы + Контент «Ритейл Логистик»** | Scaffold: create-collection, create-page (модернизирован), utils.js. Далее: новые страницы, ребрендинг, удаление Kumho-контента | **Scaffold ЗАВЕРШЁН.** Контент РЛ — в процессе | Тиражируемость, Индивидуальность |
| **2. Аутентификация** | Регистрация/вход, модерация, сессии, JWT | Сотрудники могут залогиниться | Гибкость |
| **3. ЛК и ролевая модель** | Dashboard, профиль, роли (MDM, закупка/ВЭД, и др.) | Авторизованные пользователи попадают в свой АРМ | Гибкость, Персональность |
| **4. Интеграции n8n + Django** | Интеграционный слой, webhook'и, API-прокси, Celery + Redis, PostgreSQL, MCP Server | Сайт взаимодействует с n8n и Django-сервисами | Масштабирование, Универсальность, Автономность |
| **5. АРМ и инструменты** | Справочники, AI-агенты, MAS, pgvector | Рабочие инструменты в АРМ | Автономность, Универсальность, Персональность |

**Завершённые этапы: 0, 0.5, 1 (scaffold-генераторы).** Текущий фокус: Этап 1 (контент «Ритейл Логистик»).

---

## 4. Этап 0: Отделение контента от ядра

### Цель

Сделать PHP-ядро полностью content-agnostic. После этого этапа:
- Добавление/удаление коллекции = правка `config/settings.php` + JSON-данные + Twig-шаблон
- Добавление/удаление страницы = JSON в `data/json/{lang}/pages/` (уже работает)
- 0 правок PHP-кода при смене контента

### Шаг 1: Расширить конфиг коллекций

**Файл:** `config/settings.php`

```php
'collections' => [
    'tires' => [
        'nav_slug'     => 'tires',
        'list_page_id' => 'tires-list',
        'template'     => 'pages/tire.twig',
        'item_key'     => 'item',
        'data_dir'     => 'tires',
        'slugs_source' => 'items',
        'og_type'      => 'website',
        'extras_key'   => 'tire',
    ],
    'news' => [
        'nav_slug'     => 'news',
        'list_page_id' => 'news',
        'template'     => 'pages/news.twig',
        'item_key'     => 'news',
        'data_dir'     => 'news',
        'slugs_source' => 'items',
        'og_type'      => 'article',
        'extras_key'   => 'news',
    ],
],
```

### Шаг 2: Универсальные методы в DataLoaderService

**Файл:** `src/Service/DataLoaderService.php`

**Новые методы:**
- `loadEntitySlugs(string $jsonBaseDir, string $langCode, array $collectionConfig): ?array`
  - Путь: `{jsonBaseDir}/{langCode}/pages/{nav_slug}.json`
  - Извлекает slug'и из `$data[$slugsSource]`
  - Fallback через `sections[name={nav_slug}].data.items` (совместимость с текущей структурой news)
  - Поддержка строковых slug'ов и объектов `{"slug": "..."}`
- `loadEntity(string $jsonBaseDir, string $langCode, string $slug, string $baseUrl, array $collectionConfig): ?array`
  - Путь: `{jsonBaseDir}/{langCode}/{data_dir}/{slug}.json`
  - Проверка `empty($data[$itemKey])` и `$data['visible'] !== false`
  - Устанавливает `$data['slug'] = $slug`

**Удалить:** `loadTire`, `loadTireSlugs`, `loadNews`, `loadNewsSlugs` — **ВЫПОЛНЕНО** (v1.0.0)

**Сохранить без изменений:** `loadGlobal`, `loadPage`, `loadSeo`, `loadJson` — **ВЫПОЛНЕНО**

### Шаг 3: Рефакторинг PageAction

**Файл:** `src/Action/PageAction.php`

Заменить отдельные переменные `$tire`/`$news` и две ветки if/else на одну универсальную ветку с циклом по коллекциям.

**Объединяются методы:**
- `buildSeoForTire` + `buildSeoForNews` -> `buildSeoForEntity(array $entity, string $baseUrl, array $config)`
- `buildTireBreadcrumb` + `buildNewsBreadcrumb` -> `buildEntityBreadcrumb(array $global, string $langCode, array $entity, array $config)`
- `injectNewsListItems` -> `injectListItems(array &$pageData, string $jsonBaseDir, string $langCode, string $baseUrl, array $config)`

**Обратная совместимость extras:**
```php
// tire.twig ожидает {{ tire.item }}, news.twig ожидает {{ news.news }}
$extras[$config['extras_key']] = $entity;  // оригинальный ключ для существующих шаблонов
$extras['entity'] = $entity;               // универсальный ключ для новых шаблонов
$extras['breadcrumb'] = $this->buildEntityBreadcrumb(...);
```

### Шаг 4: Обновить тесты

- `tests/php/Unit/DataLoaderServiceTest.php` — тесты для `loadEntitySlugs`/`loadEntity`, удалить тесты старых методов
- `tests/php/Integration/PageActionTest.php` — существующие тесты должны пройти без изменений
- Запуск: `php vendor/bin/phpunit`

### Шаг 5: Обновить документацию

- `CLAUDE.md` — привести описание в соответствие с реальным стеком
- `docs/guides/entity-agnostic-setup.md` — упростить
- `docs/platform-content-separation.md` — добавить раздел о завершении универсализации

### Шаг 6: config/project.php — вынос проектных настроек

Выделить из `settings.php` проектно-специфичные данные в отдельный файл. Три уровня конфигурации:

| Уровень | Файл | Что содержит | Кто редактирует |
|---------|------|-------------|----------------|
| Ядро | `config/settings.php` | Пути, Twig-конфигурация, CORS, rate limits, размеры изображений | Разработчик ядра |
| Проект | `config/project.php` | `route_map`, `collections`, `sitemap_pages`, `integrations`, `n8n`, `django`, `auth`, `roles` | Команда заказчика |
| Окружение | `.env` | `APP_BASE_URL`, `APP_ENV`, API-ключи, секреты, метрика | DevOps / администратор |

**config/project.php** (полная структура, объединяющая все потребности этапов 0-5):
```php
<?php
return [
    // === Этап 0: контент ===
    'route_map' => [
        'tires' => 'tires-list',
    ],
    'collections' => [
        'tires' => [
            'nav_slug'     => 'tires',
            'list_page_id' => 'tires-list',
            'template'     => 'pages/tire.twig',
            'item_key'     => 'item',
            'data_dir'     => 'tires',
            'slugs_source' => 'items',
            'og_type'      => 'website',
            'extras_key'   => 'tire',
        ],
    ],
    'sitemap_pages' => ['index', 'contacts', 'policy', 'agree', 'tires-list', 'news'],
    'integrations' => [
        'photoroom' => ['enabled' => true],
    ],

    // === Этап 2-4: интеграции (значения из .env) ===
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

    // === Этап 3: роли и АРМ ===
    'roles' => [
        'mdm' => [
            'label'                => 'MDM',
            'arms'                 => ['mdm-dashboard', 'mdm-references', 'mdm-tools'],
            'autonomy_level'       => 2,
            'confidence_threshold' => 0.9,
        ],
        'purchasing_ved' => [
            'label'                => 'Закупка и ВЭД',
            'arms'                 => ['purchasing-dashboard', 'ved-tools', 'label-extractor'],
            'autonomy_level'       => 1,
            'confidence_threshold' => 0.95,
        ],
        'admin' => [
            'label'                => 'Администратор',
            'arms'                 => ['*'],
            'autonomy_level'       => 3,
            'confidence_threshold' => 0.7,
        ],
    ],
];
```

**config/project.php.dist** (шаблон для нового заказчика):
```php
<?php
// Конфигурация проекта заказчика
// Скопируйте в project.php и адаптируйте
return [
    'route_map' => [],
    'collections' => [],
    'sitemap_pages' => ['index', 'contacts', 'policy', 'agree'],
    'integrations' => [],
    'n8n' => [],
    'django' => [],
    'auth' => [],
    'roles' => [],
];
```

**Изменение в settings.php:**
```php
$projectConfig = [];
$projectConfigPath = __DIR__ . '/project.php';
if (file_exists($projectConfigPath)) {
    $projectConfig = require $projectConfigPath;
}

return [
    // ... настройки ядра ...
    'route_map'     => $projectConfig['route_map'] ?? [],
    'collections'   => $projectConfig['collections'] ?? [],
    'sitemap_pages' => $projectConfig['sitemap_pages'] ?? ['index'],
    'integrations'  => $projectConfig['integrations'] ?? [],
    'n8n'           => $projectConfig['n8n'] ?? [],
    'django'        => $projectConfig['django'] ?? [],
    'auth'          => $projectConfig['auth'] ?? [],
    'roles'         => $projectConfig['roles'] ?? [],
];
```

### Шаг 7: Версионирование ядра — **ВЫПОЛНЕНО**

1. ~~Создать `CHANGELOG.md` (формат Keep a Changelog)~~ — ВЫПОЛНЕНО (v1.0.0, v1.1.0)
2. ~~Добавить версию в `config/settings.php` из `composer.json`~~
3. ~~Первый тег `v1.0.0` после завершения Этапа 0~~

---

## 5. Этап 0.5: Инфраструктура тиражирования

### 0.5.1 Контракты сервисов

PHPDoc-контракты на все public-методы `DataLoaderService`, `SeoService`, `TemplateDataBuilder`, `LanguageService`. Обновить `docs/api/services.md`.

### 0.5.2 Event Dispatcher (PSR-14)

Подключить PSR-14 Event Dispatcher (например, `league/event`). События: `PageLoaded`, `EntityResolved`, `SeoBuilt`. Интегрировать в `PageAction`. Регистрация слушателей — в `config/project.php` или `config/listeners.php`.

### 0.5.3 Реестр компонентов

Создать `docs/registry/components.md` — каталог Twig-компонентов и секций: имя, путь, параметры, пример, статус.

### 0.5.4 Scaffold-скрипт — **ВЫПОЛНЕНО**

`tools/scaffold/create-deployment.js` — создаёт полную структуру `deployments/{client}/` включая `docker-compose.yml`, `.env`, `project.php`, дефолтные данные. Вызов: `npm run create-deployment -- <slug>`.

Также реализованы scaffold-генераторы (Этап 1):
- `npm run create-collection -- <slug>` — коллекция (JSON для всех языков, 3 fixtures, Twig, SEO)
- `npm run create-page -- <slug>` — страница (JSON для всех языков, SEO, JS, CSS)
- `tools/scaffold/utils.js` — общие утилиты (валидация, многоязычность, проверка конфликтов)

### 0.5.5 Расширение наблюдаемости

Monolog -> JSON-формат. `RequestDurationMiddleware`. Обогащение контекста: `timestamp`, `level`, `request_id`, `duration_ms`, `method`, `path`.

---

## 6. Целевая структура страниц «Ритейл Логистик»

### Публичные (без авторизации)

| Страница | page_id | Описание |
|----------|---------|----------|
| Главная | `index` | Лендинг + форма входа/регистрации |
| Контакты | `contacts` | Контактная информация (уже есть) |
| Политики | `policy`, `agree` | Правовые документы (уже есть) |
| Демо-инструменты | `demo-tools` | Примеры AI-сервисов: извлечение данных с этикетки, обрезка по контуру |
| Интернет-магазин | — | Пункт меню -> внешняя ссылка на vintegra.ru |

### Приватные (после авторизации и модерации)

| Страница | page_id | Описание |
|----------|---------|----------|
| ЛК / Dashboard | `dashboard` | Сводка по роли, виджеты зависят от роли и настроек пользователя |
| Профиль | `profile` | Данные пользователя, тема, уведомления, порог доверия, избранные инструменты |
| АРМ: MDM | `arm-mdm` | Справочники, классификаторы |
| АРМ: Закупка/ВЭД | `arm-purchasing` | Инструменты для закупки и ВЭД |
| АРМ: Админ | `arm-admin` | Управление пользователями, модерация, все АРМ |

### Жизненный цикл пользователя

1. Регистрация -> статус `awaiting_moderation`
2. Модерация (админ подтверждает) -> статус `active`, назначается роль
3. Вход -> JWT-токен (HttpOnly cookie) -> ЛК -> АРМ по роли

---

## 7. Протоколы коммуникации

### Три протокола

| Протокол | Модель | Инициатор | Когда использовать |
|----------|--------|-----------|-------------------|
| **REST API** | Pull (запрос-ответ) | Клиент | Синхронные запросы данных (< 1 сек), CRUD |
| **Webhooks** | Push (событийная) | Сервер | Реакция на события, долгая обработка, callback'и |
| **MCP** | Двусторонняя | AI-модель | AI-агенты выбирают инструменты, обнаружение данных |

MCP — надстройка для AI поверх REST/Webhooks. REST API — базовый протокол. MCP Server = обёртка над REST, оба интерфейса работают параллельно.

### Потоки данных и авторизация

> **Устранённое противоречие:** В исходных документах webhook `ai-task` был обозначен как `bearer-token` (tz_protocols.md) и одновременно как `HMAC-SHA256` (tz_architecture.md). **Решение:** Все вызовы PHP -> n8n используют HMAC-SHA256, так как PHP — доверенный серверный компонент, подписывающий тело запроса. Bearer Token — только для callback'ов n8n -> PHP.

| Связь | Протокол | Авторизация | Обоснование |
|-------|----------|-------------|-------------|
| Пользователь -> PHP | HTTPS | JWT (форма входа) | Стандартный веб |
| **PHP -> n8n** | **Webhook** | **HMAC-SHA256 + X-Trace-Id** | Асинхронная обработка, PHP не ждёт результата |
| **n8n -> PHP (callback)** | **Webhook** | **Bearer Token** | Уведомление о готовности результата |
| PHP -> Django Core | REST API | Bearer Token + X-Trace-Id | Синхронные запросы данных |
| PHP -> Django Agents | REST API | Bearer Token + X-Trace-Id | Синхронный запуск агента из демо-страницы |
| n8n -> Django Core | REST API | Bearer Token + X-Trace-Id | CRUD-операции в workflow |
| n8n -> Django Agents | REST API | Bearer Token + X-Trace-Id | Запуск агента из workflow |
| Django <-> Django | REST API | Bearer Token (межсервисный) | Внутренние вызовы через Docker-сеть |
| AI-модель -> инструменты | MCP (Tools) | OAuth 2.0 | AI обнаруживает и вызывает инструменты |
| AI-модель -> данные | MCP (Resources) | OAuth 2.0 | AI читает справочники, историю |

### Обязательные заголовки во всех межсервисных вызовах

```
Authorization: Bearer {token}       # или X-HMAC-SHA256 для PHP->n8n
X-Trace-Id: {trace_id}             # Сквозная трассировка
X-Tenant-Id: {tenant_id}           # Изоляция по тенанту
Content-Type: application/json
```

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
      required: [X-HMAC-SHA256, X-Trace-Id, X-Tenant-Id]
    input:
      required: [name (string), email (string), source (string)]
      optional: [phone (string), message (string)]
    output:
      success: { execution_id: string, status: "accepted" }
    errors: { 400: "Невалидные данные", 401: "Неверная подпись HMAC", 429: "Лимит" }

  ai-task:
    description: "Запуск AI-агента на обработку задачи"
    url: "/webhook/ai-task"
    method: POST
    auth: hmac-sha256                    # <-- исправлено: было bearer-token
    headers:
      required: [X-HMAC-SHA256, X-Trace-Id, X-Tenant-Id]
    input:
      required:
        - task_type: enum[classify, label_extract, background_remove, summarize, analyze]
        - payload: object
        - callback_url: string
      optional:
        - priority: enum[low, normal, high]
    output:
      success: { execution_id: string, status: "queued" }

  notify:
    description: "Callback с результатом обработки (n8n -> PHP)"
    url: "/api/callback"
    method: POST
    auth: bearer-token
    input:
      required: [execution_id (string), status (enum[success, error, partial]), result (object)]
      optional: [confidence (float), processing_ms (integer)]
```

### REST API (Django-сервисы)

Все Django-сервисы используют версионирование: `/api/v1/`. При breaking changes -> `/api/v2/`, старая версия поддерживается минимум 1 MINOR-релиз.

**Django Core API** (`порт 8000`):
- `GET /api/v1/products`, `GET /api/v1/users/{id}`, `POST /api/v1/leads`, `GET /api/v1/references/{type}`

**Django Agents API** (`порт 8001`):
- `POST /api/v1/agent/run`, `GET /api/v1/agents`, `GET /api/v1/tasks/{id}`

**Django MAS API** (`порт 8002`):
- `POST /api/v1/pipeline/run`, `GET /api/v1/pipeline/{id}/status`

Каждый сервис экспортирует OpenAPI-спецификацию: `GET /api/v1/schema/`, `GET /api/v1/docs/`.

### MCP (Model Context Protocol)

**Стратегия внедрения:** Этап 4 — первый MCP Server на agents-service (обёртка над REST). Этап 5 — MCP для MAS (динамическое обнаружение агентов).

**agents-service MCP Server:**

| Примитив | Элементы |
|----------|---------|
| **Tools** | `label_extractor.run`, `background_remover.run`, `classifier.run`, `summarizer.run` |
| **Resources** | `products://list`, `products://search?q={query}`, `references://categories`, `references://suppliers`, `tasks://history?limit={n}` |
| **Prompts** | `label-analysis`, `product-classification`, `data-extraction` |

**core-api MCP Server:**

| Примитив | Элементы |
|----------|---------|
| **Tools** | `products.search`, `products.create`, `references.get`, `reports.generate` |
| **Resources** | `products://`, `users://`, `references://{type}` |

**MCP Clients:** n8n (через MCP-ноду), PHP (будущее — AI-ассистент в ЛК).

**Транспорт production:** HTTP+SSE.

---

## 8. Архитектура PHP-сервисов

### Текущие сервисы (ядро)

- `DataLoaderService` — загрузка JSON-контента
- `SeoService` — SEO-данные
- `LanguageService` — определение языка
- `TemplateDataBuilder` — сборка данных для шаблона
- `PageAction` — оркестратор HTTP-запросов

### Новые сервисы (Этапы 2-4)

#### N8nGateway

Единая точка взаимодействия с n8n. Инкапсулирует HTTP-вызовы, подпись HMAC, передачу Trace ID.

```php
// src/Contracts/AutomationGatewayInterface.php
interface AutomationGatewayInterface
{
    public function triggerWorkflow(string $workflowId, array $payload): WorkflowResult;
    public function getWorkflowStatus(string $executionId): WorkflowStatus;
}

// src/Service/N8nGateway.php
class N8nGateway implements AutomationGatewayInterface
{
    public function __construct(
        private HttpClientInterface $http,
        private string $baseUrl,      // N8N_BASE_URL
        private string $apiKey,       // N8N_API_KEY
        private string $hmacSecret,   // N8N_HMAC_SECRET
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

        return WorkflowResult::fromResponse($response);
    }
}
```

#### DjangoApiClient

```php
// src/Contracts/AiServiceInterface.php
interface AiServiceInterface
{
    public function runAgent(string $agentType, array $payload): AgentResult;
    public function runMas(string $taskType, array $payload): MasResult;
}

// src/Service/DjangoApiClient.php
class DjangoApiClient implements AiServiceInterface
{
    public function __construct(
        private HttpClientInterface $http,
        private string $coreUrl,      // DJANGO_CORE_URL
        private string $agentsUrl,    // DJANGO_AGENTS_URL
        private string $masUrl,       // DJANGO_MAS_URL
        private string $serviceToken, // DJANGO_SERVICE_TOKEN
        private LoggerInterface $logger,
    ) {}
}
```

#### AuthService

```php
// src/Service/AuthService.php
class AuthService
{
    public function authenticate(string $email, string $password): AuthResult;
    public function register(string $email, string $password, array $profile): RegisterResult;
    public function validateToken(string $token): ?UserClaims;
    public function hasRole(UserClaims $user, string $role): bool;
}
```

### Регистрация в DI-контейнере

**Файл:** `config/container.php`

```php
N8nGateway::class => function (ContainerInterface $c) { ... },
AutomationGatewayInterface::class => \DI\get(N8nGateway::class),

DjangoApiClient::class => function (ContainerInterface $c) { ... },
AiServiceInterface::class => \DI\get(DjangoApiClient::class),

AuthService::class => function (ContainerInterface $c) { ... },
```

Замена реализации = замена определения в контейнере, не правка вызывающего кода.

---

## 9. Архитектура Django-сервисов

### Структура

```
django-services/
+-- core-api/                      # Порт 8000
|   +-- src/api/v1/endpoints.py
|   +-- src/models/                # Пользователи, справочники
|   +-- src/services/              # Бизнес-логика
|   +-- src/middleware/tenant.py   # TenantMiddleware
|
+-- agents-service/                # Порт 8001
|   +-- src/agents/
|   |   +-- base_agent.py
|   |   +-- classifier_agent.py
|   |   +-- label_extractor_agent.py
|   |   +-- background_remover_agent.py
|   |   +-- summarizer_agent.py
|   +-- src/api/v1/endpoints.py
|   +-- src/mcp_server.py          # MCP Server (Этап 4)
|
+-- mas-service/                   # Порт 8002
    +-- src/orchestrator.py
    +-- src/message_bus.py
    +-- src/strategies/
    +-- src/api/v1/endpoints.py
```

### Контракт агента (BaseAgent)

```python
@dataclass
class AgentInput:
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    payload: dict[str, Any] = field(default_factory=dict)
    priority: str = "normal"       # low | normal | high
    tenant_id: str | None = None
    trace_id: str | None = None

@dataclass
class AgentOutput:
    task_id: str = ""
    status: str = "success"        # success | error | partial
    result: dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0        # 0.0 - 1.0
    processing_ms: int = 0
    error_message: str | None = None

class BaseAgent(ABC):
    @abstractmethod
    def validate_input(self, data: AgentInput) -> bool: ...

    @abstractmethod
    def process(self, data: AgentInput) -> AgentOutput: ...

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
            return AgentOutput(task_id=data.task_id, status="error",
                               error_message=str(e),
                               processing_ms=int((time.monotonic() - start) * 1000))
        except Exception as e:
            return AgentOutput(task_id=data.task_id, status="error",
                               error_message=f"Internal error: {type(e).__name__}",
                               processing_ms=int((time.monotonic() - start) * 1000))
```

### Примеры агентов для РЛ

**LabelExtractorAgent** — загрузка изображения бутылки -> извлечение: название, производитель, страна, объём, крепость, тип напитка. Учитывает `confidence_threshold` из пользовательского контекста для решения об автоматическом подтверждении.

**BackgroundRemoverAgent** — удаление фона (обрезка по контуру).

### MAS Orchestrator

Координация нескольких агентов для составных задач. Пример pipeline: BackgroundRemover -> LabelExtractor -> Classifier.

На Этапе 5 использует MCP для динамического обнаружения агентов (вместо хардкода списка).

### TenantMiddleware (Django)

Извлекает `tenant_id` из заголовка `X-Tenant-Id` или JWT-токена. Устанавливает контекст для изоляции данных.

---

## 10. Слой данных

| Хранилище | Что хранить | Компонент-владелец | Этап |
|-----------|------------|-------------------|:----:|
| **JSON-файлы** | Контент страниц, глобальные данные (навигация, контакты) | PHP Website | 0 (уже) |
| **PostgreSQL** | Пользователи, справочники, история задач, заявки | Django Core | 2 |
| **Redis** | Кэш справочников, JWT-сессии, очередь Celery, краткосрочный контекст | Все компоненты | 3 |
| **Celery + Redis** | Очереди для AI-задач | Django Agents | 4 |
| **pgvector** (расширение PostgreSQL) | Эмбеддинги взаимодействий, семантический поиск | Django Agents | 5 |

### Архитектура масштабирования

```
                    Load Balancer
                         |
              +----------+----------+
              |          |          |
           PHP #1     PHP #2     PHP #3       <-- горизонтально
              |          |          |
              +----------+----------+
                         |
                    n8n (1 инстанс)           <-- вертикально (Queue Mode + Redis)
                    Queue Mode + Redis
                         |
              +----------+----------+
              |          |          |
         Django #1  Django #2  Django #3      <-- горизонтально
         + Celery   + Celery   + Celery
              |          |          |
              +----------+----------+
                         |
                    PostgreSQL
                    + Redis
                    + pgvector
```

PHP и Django масштабируются горизонтально (replicas). n8n — вертикально (один мощный инстанс + Queue Mode). **Это основной компромисс стека.**

---

## 11. Безопасность

### Схема авторизации

```
                    HMAC-SHA256              Bearer Token
  [PHP Website] ----------------> [n8n] ----------------> [Django]
       ^                          |                          |
       |     Bearer Token         |                          |
       +--------------------------+                          |
                (callback)                                   |
                                     Bearer Token            |
  [Django Core] <--------------------------------------------+
                    (межсервисный, Docker-сеть)
```

**Пользователь <-> PHP Website:**
- JWT в HttpOnly cookie (не в localStorage)
- JWT payload: `{ user_id, email, role, tenant_id, exp }`
- Проверка в `AuthMiddleware`

**PHP -> n8n:** HMAC-SHA256 подпись тела. Ключ: `N8N_HMAC_SECRET` в `.env` обоих компонентов.

**n8n -> PHP (callback):** Bearer Token `PLATFORM_API_KEY`.

**n8n -> Django, Django <-> Django:** Bearer Token `DJANGO_SERVICE_TOKEN`. Межсервисная Docker-сеть.

---

## 12. Сквозная наблюдаемость

### Единый JSON-формат логов (все три компонента)

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
  "data": { "workflow_id": "ai-task", "agent_type": "label_extractor" }
}
```

### Обязательные поля

| Поле | Обязательное | Описание |
|------|:-----------:|----------|
| `timestamp` | Да | ISO 8601 |
| `level` | Да | DEBUG, INFO, WARNING, ERROR |
| `service` | Да | php-website, n8n, django-core, django-agents, django-mas |
| `tenant_id` | Да | ID тенанта |
| `trace_id` | Да | Сквозной ID (пробрасывается через все компоненты) |
| `event` | Да | Семантическое имя (формат: `компонент.сущность.действие`) |
| `request_id` | Нет | Локальный ID внутри компонента |
| `duration_ms` | Нет | Длительность операции |
| `data` | Нет | Произвольные данные события |

### Сквозной Trace ID

PHP (генерирует в `CorrelationIdMiddleware`) -> X-Trace-Id -> n8n (пробрасывает) -> X-Trace-Id -> Django (`TraceIdMiddleware`).

---

## 13. Принципы тиражируемости (20 правил + 2 расширения)

### I. Архитектура компонентов

1. **Единственная ответственность** — каждый Service отвечает за одну задачу
2. **Независимость** — Middleware (PSR-15) — независимые компоненты, взаимодействие через PSR-7
3. **Заменяемость** — все сервисы через DI-контейнер, замена = одно изменение в `container.php`

### II. Переиспользуемость

4. **Параметризация** — коллекции = единый параметризованный механизм
5. **Контекстная независимость** — Twig-компоненты не предполагают конкретного заказчика
6. **Версионирование** — SemVer, CHANGELOG.md, обратная совместимость при MINOR
7. **Документированный контракт** — PHPDoc, HTTP-контракты, реестр компонентов

### III. Тиражируемость

8. **Изоляция конфигурации** — три уровня: ядро / проект / окружение
9. **Multi-tenancy** — single-tenant с отдельной инсталляцией (архитектура позволяет переход к multi-tenant)
10. **Профили внедрения** — набор файлов для конфигурации нового заказчика
11. **Минимальное вмешательство** — адаптация без изменения PHP-кода ядра

### IV. Глобальные решения

12. **Платформенное мышление** — чёткое разделение ядра и проектного слоя
13. **Реестр компонентов** — каталог `docs/registry/components.md`
14. **Управляемый техдолг** — хардкоды фиксируются с приоритетом и плановым этапом устранения

### V. Жизненный цикл

15. **Сопровождаемость** — deploy-checklist, CHANGELOG, .env.example
16. **Наблюдаемость** — единый JSON-формат логов, Request ID, Duration
17. **Тестируемость** — PHPUnit, Vitest, smoke-тесты, JSON-валидация. Порог покрытия ядра >= 80%

### VI. Организационные правила

18. **Владение** — ядро = одна команда, проектный контент = команда заказчика
19. **Внутренний рынок** — инсталляции потребляют ядро через контракты
20. **Приоритет переиспользования** — найти -> адаптировать -> запросить -> создать

### Расширения (из анализа измерений)

21. **Управляемая автономность** — каждый AI-компонент имеет уровень автономности (0-4), повышение через конфигурацию, Human-in-the-loop обязателен для уровней 1-2
22. **Масштабируемость by design** — stateless-сервисы, очередь задач для долгих операций, health checks

---

## 14. Восемь измерений системы

### Определения

| # | Измерение | Вопрос | Фокус |
|---|-----------|--------|-------|
| 1 | **Переиспользуемость** | Можно взять повторно? | КОД |
| 2 | **Тиражируемость** | Можно развернуть заново? | ПРОДУКТ |
| 3 | **Автономность** | Работает самостоятельно? | ПОВЕДЕНИЕ |
| 4 | **Масштабирование** | Выдержит рост? | НАГРУЗКА |
| 5 | **Универсальность** | Работает в любом контексте? | АБСТРАКЦИЯ |
| 6 | **Гибкость** | Легко меняется? | АДАПТАЦИЯ |
| 7 | **Индивидуальность** | Система знает, кто она? | ИДЕНТИЧНОСТЬ СИСТЕМЫ |
| 8 | **Персональность** | Система знает, кто ты? | ОТНОШЕНИЕ К ПОЛЬЗОВАТЕЛЮ |

### Четыре группы

```
+----------------------------------------------------------+
|                     ЭФФЕКТИВНОСТЬ                         |
|  Переиспользуемость, Тиражируемость,                     |
|  Автономность, Масштабирование                            |
+----------------------------------------------------------+

+----------------------------------------------------------+
|                      ГИБКОСТЬ                             |
|  Расширяемость, Конфигурируемость,                        |
|  Слабая связанность, Инверсия зависимостей                |
+----------------------------------------------------------+

+----------------------------------------------------------+
|                   УНИВЕРСАЛЬНОСТЬ                         |
|  Абстракция, Стандартизация, Обобщение                    |
+----------------------------------------------------------+

+----------------------------------------------------------+
|                    ИДЕНТИЧНОСТЬ                            |
|  Индивидуальность --- система знает, кто она              |
|  Персональность ------ система знает, кто ты              |
+----------------------------------------------------------+
```

### Матрица зрелости по этапам

| Измерение | ~~Текущее~~ | ~~Этап 0~~ | ~~Этап 0.5~~ | **Этап 1 (текущее)** | Этап 2-3 | Этап 4-5 |
|-----------|:-------:|:------:|:--------:|:------:|:--------:|:--------:|
| Переиспользуемость | ~~4~~ | ~~7~~ | ~~7~~ | **7** | 8 | 9 |
| Тиражируемость | ~~2~~ | ~~5~~ | ~~6~~ | **8** | 8 | 9 |
| Автономность | ~~0~~ | ~~0~~ | ~~0~~ | **0** | 2 | 7 |
| Масштабирование | ~~1~~ | ~~1~~ | ~~1~~ | **2** | 3 | 6 |
| Универсальность | ~~1~~ | ~~2~~ | ~~2~~ | **3** | 4 | 7 |
| Гибкость | ~~3~~ | ~~5~~ | ~~6~~ | **6** | 7 | 8 |
| Индивидуальность | ~~1~~ | ~~2~~ | ~~2~~ | **5** | 6 | 8 |
| Персональность | ~~0~~ | ~~0~~ | ~~0~~ | **0** | 4 | 7 |

### Спектр автономности

```
Уровень 0         Уровень 1          Уровень 2          Уровень 3          Уровень 4
РУЧНОЙ             ИНСТРУМЕНТ          ПОЛУАВТОНОМНЫЙ      АВТОНОМНЫЙ          САМОУПРАВЛЯЕМЫЙ

Человек            Человек             Система             Система             Система
делает всё         использует          предлагает,         решает сама,        улучшает
                   инструменты         человек             человек             себя сама
                                       подтверждает        контролирует
```

Для каждого АРМ и инструмента определяется текущий и целевой уровень. Повышение уровня — через конфигурацию (`autonomy_level`, `confidence_threshold` в `project.php`), не через код.

### Слоистая персонализация

| Уровень | Что | Где хранится | Стоимость/user | Этап |
|---------|-----|-------------|:--------------:|:----:|
| 1. Роль | Набор доступных АРМ | `project.php` | ~0 | 2-3 |
| 2. Настройки | Избранное, порядок, тема | Django Core (UserProfile) | ~1 KB | 3 |
| 3. История | Последние задачи, решения | Django Core (TaskHistory) | ~100 KB/мес | 4-5 |
| 4. AI-модель | Персональные веса, предпочтения | Django Agents + pgvector | ~10 MB | 5+ |

### Индивидуальность deployment'а

Ядро тиражируется. Характер не тиражируется — он создаётся для каждого deployment.

| Уровень | Что делает систему индивидуальной | Механизм |
|---------|----------------------------------|----------|
| Бизнес-домен | Отрасль, терминология, процессы | `data/json/`, `extensions/custom-agents/` |
| Брендинг | Визуальная идентичность | `variables.css`, `global.json` |
| Процессы | Уникальные бизнес-процессы | `extensions/custom-workflows/` |
| AI-характер | Доменные промпты и стратегии | MCP Prompts, MAS стратегии |
| Ролевая модель | Организационная структура | `config/project.php` -> `roles` |
| Данные | Справочники, классификаторы | Django Core + JSON |

### Путь системы

```
Текущее        Этап 1           Этап 2-3         Этап 4-5
ИНСТРУМЕНТ  -> ХАРАКТЕРНАЯ   -> (промежуточное) -> ЖИВАЯ
               СИСТЕМА          состояние         СИСТЕМА
```

### Матрица компромиссов

| | Переисп. | Тираж. | Автоном. | Масштаб. | Универс. | Гибкость | Индив. | Персон. |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Переисп.** | -- | + | ~ | ~ | + | - | - | ~ |
| **Тираж.** | + | -- | ~ | ~ | - | ~ | - | ~ |
| **Автоном.** | ~ | ~ | -- | + | + | - | ~ | - |
| **Масштаб.** | ~ | ~ | + | -- | ~ | - | - | - |
| **Универс.** | + | - | + | ~ | -- | ~ | ~ | - |
| **Гибкость** | - | ~ | - | - | ~ | -- | + | + |
| **Индив.** | - | - | ~ | - | ~ | + | -- | ~ |
| **Персон.** | ~ | ~ | - | - | - | + | ~ | -- |

`+` усиливают, `-` конфликтуют, `~` нейтральны

**Ключевое:** Гибкость чаще всего конфликтует с Эффективностью, но усиливает Идентичность. Осознанный выбор баланса — задача архитектора.

### Оценка стека по 8 измерениям

| Измерение | PHP | n8n | Django | Итого | Ключевой паттерн |
|-----------|:---:|:---:|:------:|:-----:|-----------------|
| Переиспользуемость | Composer, DI, Twig | JSON-шаблоны | Django apps, BaseAgent | Высокая | Модули + контракты |
| Тиражируемость | `project.php` + JSON | Docker | Docker + миграции | Отличная | `docker-compose up` |
| Автономность | -- | Cron/Webhook | BaseAgent.run() | Высокая | n8n триггер -> Django агент |
| **Масштабирование** | PHP-FPM | **bottleneck** | Gunicorn + Celery | **Требует внимания** | Celery для тяжёлого |
| Гибкость | Event Dispatcher | 400+ коннекторов | DI, async | Очень высокая | Замена через интерфейсы |
| Универсальность | Веб-стандарты | 400+ интеграций | Python-экосистема | Одна из лучших | n8n коннекторы + Django вычисления |
| Индивидуальность | Брендинг, контент | Уникальные workflow | Кастомные агенты | Да (создаёшь ТЫ) | Проектный слой |
| Персональность | JWT, UI по роли | Контекст | Память, pgvector, AI | **Главный козырь** | Слоистая персонализация |

**7 из 8 сильно. 1 из 8 (Масштабирование) требует внимания: n8n = bottleneck, решение через Celery.**

---

## 15. Структура тиражируемого решения

```
solution/
+-- core/                           # ЯДРО --- не менять при тиражировании
|   +-- php-site/                   #   PHP Website (iSmart Platform)
|   |   +-- src/
|   |   +-- templates/
|   |   +-- config/settings.php
|   |   +-- tools/
|   +-- n8n-workflows/              #   Экспортированные workflow'ы
|   |   +-- lead-intake.json
|   |   +-- ai-task.json
|   |   +-- notify.json
|   |   +-- sync.json
|   +-- django-core/                #   Core API
|   +-- django-agents/              #   Agents Service
|   +-- django-mas/                 #   MAS Service
|   +-- django-common/              #   Общая библиотека (BaseAgent, middleware, утилиты)
|
+-- profiles/                       # Профили внедрения
|   +-- small-business/config.yaml  #   Минимум: PHP + n8n, без MAS
|   +-- enterprise/config.yaml      #   Полный стек: PHP + n8n + Django (все)
|   +-- saas/config.yaml            #   Multi-tenant конфигурация
|
+-- deployments/                    # Конфигурации конкретных внедрений
|   +-- retail-logistic/
|   |   +-- .env
|   |   +-- config/project.php
|   |   +-- data/json/
|   |   +-- assets/css/base/variables.css
|   |   +-- docker-compose.yml
|   +-- other-client/
|       +-- ...
|
+-- extensions/                     # Расширения без изменения ядра
    +-- custom-agents/
    |   +-- retail-logistic/
    |       +-- wine_classifier_agent.py
    +-- custom-workflows/
    |   +-- retail-logistic/
    |       +-- ved-document-processing.json
    +-- custom-templates/
        +-- retail-logistic/
            +-- arm-purchasing.twig
```

### Что остаётся неизменным при тиражировании

| Компонент | Неизменное ядро | Настраиваемый слой |
|-----------|----------------|-------------------|
| PHP Website | `src/`, `templates/sections/`, `templates/components/`, `config/settings.php` | `config/project.php`, `data/json/`, `variables.css` |
| n8n | Базовые workflow'ы (lead-intake, ai-task, notify) | Кастомные workflow'ы в `extensions/` |
| Django Core | Модели, API, middleware | Конфигурация тенанта, миграции данных |
| Django Agents | BaseAgent, API | Кастомные агенты в `extensions/custom-agents/` |
| Django MAS | Orchestrator, Message Bus | Стратегии координации |

---

## 16. Конфигурация .env для полной системы

```env
# === PHP Website ===
APP_BASE_URL=https://retail-logistic.ru
APP_ENV=production
APP_DEBUG=0
APP_DEFAULT_LANG=ru

# JWT
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

# === Внешние API ===
PHOTOROOM_API_KEY=your-photoroom-key
```

---

## 17. Docker Compose (production)

```yaml
services:
  php:
    image: php:8.5-fpm
    volumes:
      - ./config/project.php:/app/config/project.php
      - ./data/json:/app/data/json
      - ./assets/css/base/variables.css:/app/assets/css/base/variables.css

  n8n:
    image: n8nio/n8n
    environment:
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis

  django-core:
    build: ./django-services/core-api
    environment:
      - DATABASE_URL=${DATABASE_URL}

  django-agents:
    build: ./django-services/agents-service
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  postgres:
    image: pgvector/pgvector:pg16

  redis:
    image: redis:7-alpine
```

---

## 18. Антипаттерны

| Антипаттерн | Проблема | Правильное решение |
|------------|----------|-------------------|
| Хардкод URL в коде агента | Не тиражируемо | URL из `.env`, вызовы через Gateway/Client |
| n8n = центр вселенной (50+ нод) | Bottleneck, не масштабируется | n8n маршрутизирует, Django исполняет |
| n8n парсит файлы / вызывает LLM | Блокирует n8n | CPU/GPU-задачи -> Django Celery |
| Webhook без HMAC-подписи | Фейковые запросы | HMAC-SHA256 для PHP->n8n |
| Polling вместо Webhook | Лишняя нагрузка | Webhook для событий |
| REST API для AI без MCP | Агент привязан к эндпоинтам | MCP-обёртка + REST fallback |
| MCP без fallback на REST | При недоступности MCP все падает | REST как основа, MCP — надстройка |
| Копирование кода между Django-сервисами | Рассинхронизация | `django-common/` как pip-пакет |
| PHP вызывает Django напрямую (без `DjangoApiClient`) | Нет контракта, нет логирования | Все вызовы через клиент-обёртку |
| Агент всегда автономен (без учёта роли) | confidence 50% -> автоматически | `confidence_threshold` из user context |

---

## 19. Верификация и чеклисты

### Этап 0: Отделение контента от ядра — **ЗАВЕРШЁН** (2026-03-07, v1.0.0)

| # | Проверка | Критерий | Статус |
|---|----------|---------|--------|
| 1 | Ноль хардкодов контента в PHP | `grep -r "tires\|kumho\|Kumho" src/` = 0 | **PASS** |
| 2 | Новая коллекция без правки PHP | Добавить `test-items` в collections -> работает | **PASS** |
| 3 | Удаление коллекции без ошибок | Убрать `tires` -> остальные работают, 404 для /tires/ | **PASS** |
| 4 | Тесты проходят | `php vendor/bin/phpunit` = 0 failures (42 tests, 10 skipped) | **PASS** |
| 5 | Статический анализ чист | `vendor/bin/phpstan analyse` = 0 errors | Не проверен |
| 6 | project.php отделён | Проектные настройки в `config/project.php`, не в `settings.php` | **PASS** |
| 7 | Дефолты при отсутствии project.php | Удалить project.php -> ядро загружается, главная работает | **PASS** |
| 8 | project.php.dist существует | Шаблон содержит все ключи с дефолтами | **PASS** |
| 9 | CHANGELOG.md создан | Содержит версию 1.0.0 | **PASS** |
| 10 | Тег v1.0.0 создан | `git tag` содержит `v1.0.0` | Не создан |

### Этап 0.5: Инфраструктура тиражирования — **ЗАВЕРШЁН** (2026-03-07, v1.1.0)

| # | Проверка | Критерий | Статус |
|---|----------|---------|--------|
| 1 | Контракты сервисов | Каждый public-метод в `src/Service/` имеет `@param`/`@return` | **PASS** (9 методов) |
| 2 | Event Dispatcher работает | 3 события: PageLoaded, EntityResolved, SeoBuilt | **PASS** (league/event ^3.0) |
| 3 | Реестр заполнен | `docs/registry/components.md` содержит все компоненты | **PASS** (30 + 17) |
| 4 | Scaffold работает | `npm run create-deployment -- test-client` создаёт рабочий проект | **PASS** |
| 5 | JSON-формат логов | `tail -1 logs/app-YYYY-MM-DD.log` парсится как JSON | **PASS** (RotatingFileHandler) |
| 6 | Duration в логах | Логи содержат `duration_ms`, заголовок `X-Response-Time` | **PASS** |

### Этап 1: Scaffold-генераторы — **ЗАВЕРШЁН** (2026-03-07, v1.1.0). Контент РЛ — НЕ НАЧАТ

Scaffold-генераторы:
| # | Проверка | Критерий | Статус |
|---|----------|---------|--------|
| 1 | create-collection работает | Генерирует JSON, fixtures, Twig, SEO для всех языков | **PASS** |
| 2 | create-page модернизирован | Валидация, многоязычность, проверка конфликтов | **PASS** |
| 3 | utils.js вынесены | Общие функции для всех scaffold'ов | **PASS** |

Контент заказчика (предстоит):
| # | Проверка | Критерий | Статус |
|---|----------|---------|--------|
| 1 | Развёрнуто по профилю | Через scaffold, не ручным копированием | Не начат |
| 2 | Ноль правок ядра | `git diff` в ядре = пусто | — |
| 3 | Брендинг через CSS | Смена цветовой схемы = правка `variables.css` | — |
| 4 | Smoke-тест | Все страницы из `sitemap_pages` отдают HTTP 200 | — |
| 5 | Deployment отличим | РЛ визуально и функционально отличается от Kumho | — |

### Этапы 2-5: Общие критерии

| # | Проверка | Критерий |
|---|----------|---------|
| 1 | Расширяемость | Новая функциональность через конфигурацию или Event Dispatcher |
| 2 | Обратная совместимость | Существующие инсталляции работают после обновления ядра |
| 3 | Покрытие тестами | Покрытие нового кода >= 80% |
| 4 | CHANGELOG обновлён | Новая версия с описанием |
| 5 | Реестр обновлён | Новые компоненты зарегистрированы |

### Протоколы: REST API

| # | Проверка | Критерий |
|---|----------|---------|
| 1 | OpenAPI-спецификация | Каждый Django-сервис экспортирует `/api/v1/schema/` |
| 2 | Версионирование | Все под `/api/v1/` |
| 3 | Авторизация | Bearer Token в каждом запросе |
| 4 | Trace ID | `X-Trace-Id` в каждом запросе |
| 5 | Tenant ID | `X-Tenant-Id` в каждом запросе |
| 6 | Timeout | Настраиваемый через `.env` |

### Протоколы: Webhooks

| # | Проверка | Критерий |
|---|----------|---------|
| 1 | Контракт YAML | `docs/contracts/n8n-webhooks.yaml` описывает все webhook'и |
| 2 | HMAC | PHP->n8n: HMAC-SHA256 |
| 3 | Bearer | n8n->PHP (callback): токен из `.env` |
| 4 | Trace ID | Пробрасывается из исходного запроса |
| 5 | Idempotency | Повторная отправка не создаёт дублей |
| 6 | Retry | n8n: max 3 раза при 5xx |

### Протоколы: MCP

| # | Проверка | Критерий |
|---|----------|---------|
| 1 | MCP Server запущен | agents-service экспортирует MCP (HTTP+SSE) |
| 2 | Tools зарегистрированы | Доступны через MCP |
| 3 | Resources зарегистрированы | Доступны через MCP |
| 4 | OAuth 2.0 | Авторизация MCP-клиентов |
| 5 | REST fallback | Все MCP Tools доступны и через REST |

### Чеклист измерений (для каждого нового решения)

| # | Вопрос | Если «нет» |
|---|--------|-----------|
| 1 | Переиспользуемо? | Параметризовать, вынести в общий компонент |
| 2 | Тиражируемо? Работает при другом `project.php`? | Вынести хардкоды в конфиг |
| 3 | Учитывает автономность? Где человек, где система? | Определить уровень (0-4) |
| 4 | Масштабируется? Что при x10? | Stateless, очередь, кэш |
| 5 | Универсально? Работает с другой AI-моделью? | Стандартный интерфейс (MCP, OpenAPI) |
| 6 | Гибко? Что если заказчик попросит иначе? | DI, Event Dispatcher, конфиг |
| 7 | Учитывает индивидуальность deployment'а? | Доменная логика в проектный слой |
| 8 | Учитывает персональность? Поведение зависит от пользователя? | User context в логику решений |

---

## 20. Критические файлы (все этапы)

### Этап 0

| Файл | Действие |
|------|----------|
| `config/settings.php` | Расширить collections, подключить project.php |
| `config/project.php` (новый) | Проектная конфигурация |
| `config/project.php.dist` (новый) | Шаблон для нового заказчика |
| `src/Service/DataLoaderService.php` | `loadEntitySlugs`/`loadEntity`, удалить 4 старых |
| `src/Action/PageAction.php` | Универсальная ветка коллекций |
| `tests/php/Unit/DataLoaderServiceTest.php` | Тесты новых методов |
| `CLAUDE.md` | Обновить описание проекта |
| `CHANGELOG.md` (новый) | Журнал изменений |

### Этап 0.5

| Файл | Действие |
|------|----------|
| `docs/registry/components.md` (новый) | Реестр Twig-компонентов |
| `docs/api/services.md` (новый) | Контракты Service Layer |
| `tools/scaffold/create-deployment.sh` (новый) | Scaffold полного стека |
| `src/Event/PageLoaded.php` (новый) | PSR-14 событие |
| `src/Event/EntityResolved.php` (новый) | PSR-14 событие |
| `src/Event/SeoBuilt.php` (новый) | PSR-14 событие |
| `src/Middleware/RequestDurationMiddleware.php` (новый) | Замер длительности |

### Этапы 2-5

| Файл | Действие |
|------|----------|
| `src/Contracts/AutomationGatewayInterface.php` (новый) | Интерфейс n8n |
| `src/Contracts/AiServiceInterface.php` (новый) | Интерфейс Django |
| `src/Service/N8nGateway.php` (новый) | Реализация n8n-клиента |
| `src/Service/DjangoApiClient.php` (новый) | Реализация Django-клиента |
| `src/Service/AuthService.php` (новый) | Аутентификация/авторизация |
| `docs/contracts/n8n-webhooks.yaml` (новый) | Контракты webhook'ов |
| `docs/contracts/openapi/*.yaml` (новые) | OpenAPI Django-сервисов |
| `django-services/` (новая структура) | Core, Agents, MAS |

---

## 21. Устранённые противоречия

| Противоречие | Источник | Решение |
|-------------|---------|---------|
| Webhook `ai-task`: `bearer-token` vs `HMAC-SHA256` | `tz_protocols.md` (bearer) vs `tz_architecture.md` (HMAC) | **Все PHP->n8n = HMAC-SHA256.** Bearer Token — только для callback'ов n8n->PHP. В архитектуре PHP — доверенный серверный компонент, подписывающий тело запроса; bearer-token не обеспечивает целостность payload |
| `project.php`: разное содержимое | `tz_reuse.md` (route_map, collections, sitemap_pages) vs `tz_architecture.md` (n8n, django, auth, roles) | **Объединённая структура** `project.php` содержит все секции: route_map, collections, sitemap_pages, integrations, n8n, django, auth, roles. Секции n8n/django/auth/roles пусты на Этапе 0 и заполняются по мере продвижения |
| 6 vs 8 измерений | `tz_dimensions.md` (6) vs `tz_identity.md` (8) | **8 измерений** — финальная модель. `tz_identity.md` расширяет `tz_dimensions.md`, добавляя 4-ю группу (Идентичность). Оценки 6 оригинальных измерений идентичны в обоих документах |
| Scaffold: `create-project.sh` vs полный стек | `tz_reuse.md` (только PHP) vs `tz_stack_capabilities.md` (PHP + n8n + Django) | **`create-deployment.sh`** — scaffold для полного стека, включая `docker-compose.yml`, `.env`, `project.php`, дефолтный контент и конфиг n8n |
| `django-common/`: упомянут, но не в структуре | `tz_stack_capabilities.md` (рекомендация) vs `tz_architecture.md` (не упомянут) | **Добавлен** в целевую структуру `solution/core/django-common/` — общая библиотека (BaseAgent, middleware, утилиты логирования), подключаемая как pip-пакет во все Django-сервисы |