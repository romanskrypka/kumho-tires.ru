# Changelog

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
