# Changelog

## [1.1.0] - 2026-03-07

### Added
- PSR-14 Event Dispatcher (`league/event`): события `PageLoaded`, `EntityResolved`, `SeoBuilt` в PageAction.
- `RequestDurationMiddleware` — измерение и логирование времени запроса, заголовок `X-Response-Time`.
- JSON-формат логов (Monolog `JsonFormatter` + `RotatingFileHandler` с ротацией 14 дней).
- PHPDoc-контракты на все public-методы: DataLoaderService, SeoService, LanguageService, TemplateDataBuilder.
- Реестр Twig-компонентов `docs/registry/components.md` (30 components, 17 sections).
- Scaffold `create-deployment` — генерация полной структуры deployment'а (docker-compose, nginx, .env, project.php, данные).
- Scaffold `create-collection` — генерация скелета коллекции для всех языков с 3 fixture-сущностями.
- Модернизация `create-page` — валидация slug, многоязычность, SEO для всех языков.

### Changed
- Логи в `logs/app-YYYY-MM-DD.log` (ротация по дням, JSON-формат).
- Middleware порядок: CorrelationId → RequestDuration (request_id доступен в логах).

## [1.0.0] - 2026-03-07

### Added
- Универсальные методы `loadEntitySlugs` и `loadEntity` в `DataLoaderService` — работают с любой коллекцией через конфиг.
- Проектная конфигурация `config/project.php` — route_map, collections, sitemap_pages вынесены из ядра.
- Шаблон `config/project.php.dist` для новых deployment'ов.
- Unit-тесты для `loadEntitySlugs` и `loadEntity` (13 тестов).

### Removed
- Специфичные методы `loadTireSlugs`, `loadTire`, `loadNewsSlugs`, `loadNews` из `DataLoaderService`.
- Хардкод tires/news из `PageAction` — заменён на цикл по коллекциям.

### Changed
- `PageAction` рефакторинг: 6 контент-специфичных методов заменены на 3 универсальных (`buildSeoForEntity`, `buildEntityBreadcrumb`, `injectListItems`).
- `config/settings.php` загружает проектные значения из `config/project.php`.
- Ядро платформы полностью content-agnostic — 0 упоминаний tires/news в `src/`.
