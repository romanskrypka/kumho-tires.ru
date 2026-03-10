# План: Трансформация iSmart Platform → тиражируемая платформа

## Контекст

**Проект:** iSmart Platform (PHP 8.5+, Slim 4, Twig 3, Webpack, JSON-контент).
**Первый заказчик:** «Ритейл Логистик» — импортёр и дистрибьютор алкогольной продукции.
**Текущее состояние:** Платформа содержит контент шинного бренда Kumho (tires, news). Контент частично отделён от ядра (JSON-файлы, параметризация коллекций в settings.php), но `DataLoaderService` и `PageAction` ещё содержат хардкоды tires/news.

**Ключевой принцип: тиражируемость.** Платформа — не одноразовое решение под одну компанию. Конечная конфигурация «Ритейл Логистик» (сайт + n8n + Django) должна быть воспроизводима для любой компании с аналогичным запросом. Каждая инсталляция = своё ядро платформы + свой контент/брендинг + своя n8n + свои Django-сервисы.

**Проблема:** Нужно полностью отделить контентный слой от ядра платформы, чтобы:
1. Легко заменить контент Kumho на контент «Ритейл Логистик» (или любого другого заказчика)
2. Сохранить удобство работы: JSON-контент, секционные Twig-шаблоны, управление стилями и блоками
3. Подготовить фундамент для последующих этапов (авторизация, ЛК/АРМ, интеграции)
4. Обеспечить тиражирование: развернуть новую инсталляцию = клонировать ядро + подставить конфиг/контент/стили заказчика

---

## Дорожная карта (общий план)

| Этап | Что | Результат |
|------|-----|-----------|
| **0. Отделение контента от ядра** | Универсальный загрузчик коллекций, чистка хардкодов | Платформа content-agnostic: замена контента = JSON + Twig + CSS, 0 правок PHP |
| **1. Контент «Ритейл Логистик»** | Новые страницы, ребрендинг, удаление Kumho-контента | Публичный сайт РЛ: главная, контакты, политики, демо-инструменты, ссылка на vintegra.ru |
| **2. Аутентификация** | Регистрация/вход, модерация, сессии | Сотрудники могут залогиниться (PHP-логика или n8n) |
| **3. ЛК и ролевая модель** | Dashboard, профиль, роли (MDM, закупка/ВЭД, и др.) | Авторизованные пользователи попадают в свой АРМ |
| **4. Интеграции n8n + Django** | Интеграционный слой, webhook'и, API-прокси | Сайт взаимодействует с n8n и Django-сервисами |
| **5. АРМ и инструменты** | Справочники, AI-агенты, сервисы | Рабочие инструменты в АРМ (извлечение данных с этикеток, обрезка по контуру и т.д.) |

**Текущий фокус: Этап 0** — подробно ниже. Этапы 1-5 будут планироваться отдельно.

---

## Этап 0: Отделение контента от ядра

### Цель

Сделать PHP-ядро полностью content-agnostic. После этого этапа:
- Добавление/удаление коллекции = правка `config/settings.php` + JSON-данные + Twig-шаблон
- Добавление/удаление страницы = JSON в `data/json/{lang}/pages/` (это уже работает)
- 0 правок PHP-кода при смене контента

### Шаг 1: Расширить конфиг коллекций

**Файл:** `config/settings.php` (строки 82-93)

Добавить поля для полной параметризации загрузки:

```php
'collections' => [
    'tires' => [
        'nav_slug'     => 'tires',
        'list_page_id' => 'tires-list',
        'template'     => 'pages/tire.twig',
        'item_key'     => 'item',       // ключ объекта в JSON элемента
        'data_dir'     => 'tires',      // каталог data/json/{lang}/{data_dir}/
        'slugs_source' => 'items',      // ключ массива slug'ов
        'og_type'      => 'website',
    ],
    'news' => [
        'nav_slug'     => 'news',
        'list_page_id' => 'news',
        'template'     => 'pages/news.twig',
        'item_key'     => 'news',
        'data_dir'     => 'news',
        'slugs_source' => 'items',
        'og_type'      => 'article',
    ],
],
```

### Шаг 2: Универсальные методы в DataLoaderService

**Файл:** `src/Service/DataLoaderService.php`

Добавить два универсальных метода, удалить четыре специфичных:

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

**Удалить:** `loadTire`, `loadTireSlugs`, `loadNews`, `loadNewsSlugs`

**Сохранить без изменений:** `loadGlobal`, `loadPage`, `loadSeo`, `loadJson`

### Шаг 3: Рефакторинг PageAction

**Файл:** `src/Action/PageAction.php`

**Суть:** Заменить отдельные переменные `$tire`/`$news` и две ветки if/else на одну универсальную ветку с циклом по коллекциям.

**Заменяются переменные:**
- `$tiresConfig`, `$newsConfig`, `$tiresListPageId`, `$newsListPageId`, `$tiresNavSlug`, `$newsNavSlug`, `$tiresTemplate`, `$newsTemplate` → убрать
- `$tire`, `$news` → `$entity`, `$entityType` (ключ коллекции), `$entityConfig`

**Заменяется логика:**
1. Если `$pageData === null` — цикл по всем коллекциям, поиск entity по slug
2. Если entity не найден — проверить, является ли текущая страница списком какой-то коллекции (`list_page_id`), и обработать подстраницы

**Объединяются методы:**
- `buildSeoForTire` + `buildSeoForNews` → `buildSeoForEntity(array $entity, string $baseUrl, array $config)`
  - Использует `$config['item_key']` для извлечения name/desc и `$config['og_type']` для og:type
- `buildTireBreadcrumb` + `buildNewsBreadcrumb` → `buildEntityBreadcrumb(array $global, string $langCode, array $entity, array $config)`
  - Использует `$config['nav_slug']` для URL и навигации
- `injectNewsListItems` → `injectListItems(array &$pageData, string $jsonBaseDir, string $langCode, string $baseUrl, array $config)`
  - Использует `$config['nav_slug']` вместо хардкода `'news'`

**Обратная совместимость extras:**
```php
// tire.twig ожидает {{ tire.item }}, news.twig ожидает {{ news.news }}
// Передаём данные под оригинальным ключом через item_key из конфига:
$extras[$entityConfig['item_key']] = $entity[$entityConfig['item_key']] ?? $entity;
$extras['entity'] = $entity;  // + универсальный ключ для новых шаблонов
$extras['breadcrumb'] = $this->buildEntityBreadcrumb(...);
```

**Примечание по extras:** Шаблон `tire.twig` обращается к `tire.item` (переменная `tire` = весь JSON файл элемента, в нём ключ `item`). Конфиг tires имеет `item_key = 'item'`. Но в extras нужно передать `$extras['tire'] = $entity` (весь объект), а не `$extras['item']`. Значит, нужен ещё один ключ в конфиге — `extras_key` (или использовать ключ коллекции как имя переменной для Twig). Уточнение:

```php
// Для tires: tire.twig использует {{ tire.item.name }}, {{ tire.desc.short }}
//   → $extras['tire'] = $entity (весь JSON)
// Для news: news.twig использует {{ news.news.title }}, {{ news.news.body }}
//   → $extras['news'] = $entity (весь JSON)
// Паттерн: extras[ключ_коллекции_в_единственном_числе] = entity
// Но ключ коллекции = 'tires' (мн. число). Варианты:
//   a) Добавить 'extras_key' => 'tire' в конфиг
//   b) Использовать item_key: для tires item_key='item', для news item_key='news'
//      tire.twig: {{ tire.item }} — тут 'tire' = имя переменной, 'item' = ключ внутри
//      news.twig: {{ news.news }} — тут 'news' = имя переменной, 'news' = ключ внутри
```

**Решение:** Добавить `extras_key` в конфиг коллекции:

```php
'tires' => [
    ...
    'extras_key' => 'tire',   // имя переменной в Twig-шаблоне
],
'news' => [
    ...
    'extras_key' => 'news',   // имя переменной в Twig-шаблоне
],
```

Тогда: `$extras[$config['extras_key']] = $entity;`

### Шаг 4: Обновить тесты

**Файлы:**
- `tests/php/Unit/DataLoaderServiceTest.php` — добавить тесты для `loadEntitySlugs`/`loadEntity`, удалить тесты старых методов (если есть)
- `tests/php/Integration/PageActionTest.php` — существующие тесты (200 для `/`, 404 для несуществующей) должны пройти без изменений

**Запуск:** `php vendor/bin/phpunit`

### Шаг 5: Обновить документацию

- **`CLAUDE.md`** — привести описание в соответствие с реальным стеком (PHP/Slim 4, не статический HTML)
- **`docs/guides/entity-agnostic-setup.md`** — упростить: теперь для новой коллекции не нужно править PHP, только конфиг + данные + шаблон
- **`docs/platform-content-separation.md`** — добавить раздел о завершении универсализации

---

## Целевая структура страниц «Ритейл Логистик» (для Этапа 1, справочно)

**Публичные (без авторизации):**
1. Главная (`index`) + форма входа/регистрации
2. Контакты (`contacts`) — уже есть как страница
3. Политики и правила (`policy`, `agree`) — уже есть
4. Демо-страница инструментов (`demo-tools`) — новая
5. Интернет-магазин — пункт меню со ссылкой на vintegra.ru

**Авторизованные (после модерации):**
1. АРМ по ролям: MDM, закупка/ВЭД, и др. + суперроль
2. Профиль пользователя
3. Остальное — по мере уточнения

**Аутентификация:** Собственная PHP-логика (или n8n на начальном этапе).
**Брендинг:** Полный ребрендинг дизайна под «Ритейл Логистик» (свой стиль, логотип, цветовая схема).

---

## Критические файлы (Этап 0)

| Файл | Действие |
|------|----------|
| `config/settings.php` | Расширить collections: `item_key`, `data_dir`, `slugs_source`, `og_type`, `extras_key` |
| `src/Service/DataLoaderService.php` | Добавить `loadEntitySlugs`/`loadEntity`, удалить 4 старых метода |
| `src/Action/PageAction.php` | Одна универсальная ветка коллекций, объединение методов SEO/breadcrumb/inject |
| `tests/php/Unit/DataLoaderServiceTest.php` | Тесты для новых методов |
| `tests/php/Integration/PageActionTest.php` | Проверка регрессий (существующие тесты) |
| `CLAUDE.md` | Обновить описание проекта |
| `docs/guides/entity-agnostic-setup.md` | Упростить инструкцию |

---

## Верификация

1. `php vendor/bin/phpunit` — все тесты проходят
2. `vendor/bin/phpstan analyse` — статический анализ без ошибок
3. Smoke-тест в браузере:
   - `/` — главная загружается
   - Страницы коллекций (tires, news) работают как прежде
   - 404 для несуществующих slug'ов
4. После верификации — коллекции tires/news можно будет удалить из конфига и данных (Этап 1), и всё продолжит работать