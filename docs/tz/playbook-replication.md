# Playbook: Тиражирование iSmart Platform на нового заказчика

> **Версия:** 1.0
> **Дата:** 2026-03-10
> **Время выполнения:** 2-4 часа (при наличии всех входных данных)
> **Предусловие:** Все действия выполняются от ветки `main`, в которой лежит платформа с полной библиотекой компонентов

---

## Часть 1. Чеклист входных данных от заказчика

Прежде чем начинать — собрать материалы. Без пунктов с пометкой **[блокирует]** начинать нельзя.

### Брендинг

| # | Артефакт | Формат | Блокирует? | Примечание |
|---|----------|--------|-----------|------------|
| 1 | **Логотип горизонтальный** | SVG (идеально) или PNG ≥ 400px | **[блокирует]** | Нужны 2 варианта: для светлого и тёмного фона. Если один — используем CSS-фильтр для инверсии |
| 2 | **Логотип вертикальный** | SVG или PNG | Нет | Если нет — дублируем горизонтальный |
| 3 | **Фавикон** | SVG или PNG ≥ 512px | **[блокирует]** | Из него генерируются все размеры: `npm run generate-favicons` |
| 4 | **Акцентный цвет** | HEX | **[блокирует]** | Минимум один. Пойдёт в `--color-3` |
| 5 | **Дополнительные цвета** | HEX | Нет | Фон, текст, тёмные/светлые варианты. Если нет — подберём на основе акцентного |
| 6 | **Шрифты** | Файлы .woff2 или название Google Font | Нет | Если не указаны — оставляем Source Sans 3 + Manrope |
| 7 | **OG-изображение** | PNG/JPG 1200×630 | Нет | Для шаринга в соцсетях. Если нет — сгенерируем из логотипа |

### Контент

| # | Артефакт | Блокирует? | Примечание |
|---|----------|-----------|------------|
| 8 | **Название компании** (юр. лицо + бренд) | **[блокирует]** | Для footer, policy, agree, SEO |
| 9 | **Слоган / описание** | Нет | Для hero-секции и meta description |
| 10 | **Контакты** (адрес, телефон, email) | Нет | Можно начать с заглушек |
| 11 | **Тексты главной страницы** | Нет | Описание компании, преимущества, CTA |
| 12 | **Юридические тексты** (политика ПДн, соглашение) | Нет | Шаблон уже есть, нужно обновить реквизиты |
| 13 | **Список страниц** (какие страницы нужны) | **[блокирует]** | Определяет scope работы |
| 14 | **Коллекции** (каталог товаров, новости и т.д.) | Нет | Определяет, нужны ли collections в project.php |

### Техническое

| # | Артефакт | Блокирует? | Примечание |
|---|----------|-----------|------------|
| 15 | **Домен** | Нет | Для APP_BASE_URL, SSL, SEO |
| 16 | **Счётчик аналитики** (Яндекс.Метрика ID) | Нет | Для .env. Если нет — ставим 0 |
| 17 | **API-ключи** (Photoroom, другие) | Нет | Для .env |

---

## Часть 2. Пошаговое создание проекта

### Шаг 1. Создать ветку проекта

```bash
git checkout main
git pull origin main
git checkout -b project/<client-slug>
```

Имя ветки: `project/` + slug заказчика латиницей (например `project/retail-logistic`, `project/stroy-mart`).

---

### Шаг 2. Удалить данные предыдущего проекта

**Удаляем ТОЛЬКО JSON-данные и изображения. Шаблоны, JS, CSS — НЕ ТРОГАЕМ.**

```bash
# JSON-данные коллекций (если есть от предыдущего проекта)
rm -rf data/json/ru/tires/
rm -rf data/json/ru/news/
# ... любые другие коллекции

# Страницы, специфичные для предыдущего проекта
rm -f data/json/ru/pages/tires-list.json
rm -f data/json/ru/pages/tires.json
rm -f data/json/ru/pages/news.json
rm -f data/json/ru/pages/buy.json
rm -f data/json/ru/pages/warranty.json
rm -f data/json/ru/pages/dealers.json
# НЕ удалять: index.json, contacts.json, policy.json, agree.json, 404.json

# SEO файлы удалённых страниц
rm -f data/json/ru/seo/tires-list.json
rm -f data/json/ru/seo/news.json
rm -f data/json/ru/seo/buy.json
rm -f data/json/ru/seo/warranty.json
# НЕ удалять: index.json, contacts.json, policy.json, agree.json, 404.json

# Изображения контента
rm -rf data/img/tires/
rm -rf data/img/news/
rm -rf data/img/actions/
rm -rf data/img/frames/*.jpg data/img/frames/*.webp data/img/frames/*.jpeg
```

---

### Шаг 3. Настроить конфигурацию проекта

#### 3.1 `config/project.php`

Скопировать из шаблона и настроить:

```bash
cp config/project.php.dist config/project.php
```

Заполнить:

```php
return [
    'route_map' => [
        // 'catalog' => 'catalog-list',    // если нужна коллекция
        // 'demo-tools' => 'demo-tools',   // если нужна страница с кастомным slug
    ],

    'collections' => [
        // Добавлять по мере необходимости через npm run create-collection
    ],

    'sitemap_pages' => [
        'index',
        'contacts',
        'policy',
        'agree',
        // ... добавить все публичные страницы
    ],

    'integrations' => [
        'photoroom' => ['enabled' => false], // включить если нужно
    ],
];
```

#### 3.2 `.env`

```bash
cp .env.example .env
```

Обновить:

| Переменная | Что указать |
|-----------|-------------|
| `APP_ENV` | `development` (на время разработки) |
| `APP_DEBUG` | `1` |
| `APP_BASE_URL` | `http://localhost:8080/` или домен заказчика |
| `APP_DEFAULT_LANG` | `ru` |
| `YANDEX_METRIC_ID` | ID счётчика или `0` |

#### 3.3 `data/json/global.json`

Обновить секции:

| Секция | Что изменить |
|--------|-------------|
| `nav.ru.items` / `nav.en.items` | Пункты навигации нового проекта |
| `phones` | Телефоны заказчика |
| `email` | Email заказчика |
| `logo.horizontal.white.src` | Путь к логотипу (светлый фон) |
| `logo.horizontal.black.src` | Путь к логотипу (тёмный фон) |
| `logo.vertical.white.src` | Путь к вертикальному логотипу |
| `logo.vertical.black.src` | Путь к вертикальному логотипу |
| `copyright` | Текст копирайта |
| `socials` | Ссылки на соцсети (или пустой массив) |

#### 3.4 `assets/css/base/variables.css`

Обновить цвета бренда:

```css
:root {
    --color-3: #______;   /* Акцентный цвет (кнопки, ссылки, акценты) */
    --color-4: #______;   /* Светло-серый */
    --color-5: #______;   /* Средне-серый */
    --color-6: #______;   /* Тёмно-серый */
    --color-7: #______;   /* Серый (границы) */
    --color-8: #______;   /* Тёмный фон (footer, hero) */

    --color-hero-bg: #______;        /* Фон hero-секции */
    --color-hero-bg-light: #______;  /* Светлый вариант фона hero */
}
```

Если меняются шрифты:

```css
    --font-1: "NewFont", sans-serif;   /* Основной текст */
    --font-2: "NewFont", sans-serif;   /* Заголовки */
```

При смене шрифтов также обновить:
- `assets/fonts/` — добавить файлы .woff2
- `assets/css/base/fonts.css` — обновить `@font-face`

---

### Шаг 4. Заменить брендинг

#### 4.1 Логотипы

Положить файлы в `data/img/ui/logos/`:

| Файл | Назначение |
|------|-----------|
| `logo-h-color-1.svg` | Горизонтальный, для тёмного фона (светлый) |
| `logo-h-color-2.svg` | Горизонтальный, для светлого фона (тёмный) |
| `logo-v-color-1.svg` | Вертикальный, для тёмного фона |
| `logo-v-color-2.svg` | Вертикальный, для светлого фона |

Если есть только один логотип — указать его во всех 4 слотах в `global.json`, при необходимости использовать CSS-фильтр для инверсии (см. `footer.css` → `.footer__logo { filter: brightness(0) invert(1) }`).

#### 4.2 Фавиконы

Положить исходник (SVG или PNG ≥ 512px) и сгенерировать:

```bash
npm run generate-favicons
```

Если генератор недоступен — вручную заменить файлы в `data/img/favicons/`:
- `favicon.svg` — SVG-версия
- `favicon.ico` — из PNG 48px
- `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon-96x96.png`
- `apple-touch-icon.png` (180px)
- `android-chrome-192x192.png`, `android-chrome-512x512.png`
- `web-app-manifest-192x192.png`, `web-app-manifest-512x512.png`

#### 4.3 `site.webmanifest`

```json
{
  "name": "Бренд — Название компании",
  "short_name": "Бренд",
  "icons": [...],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}
```

#### 4.4 OG-изображение

Заменить `data/img/seo/og.webp` (1200×630px).

---

### Шаг 5. Наполнить контентом

#### 5.1 Обязательные страницы (уже существуют — обновить)

| Страница | JSON | SEO | Что обновить |
|----------|------|-----|-------------|
| Главная | `pages/index.json` | `seo/index.json` | Секции (hero, trust, partners и т.д.), тексты, CTA |
| Контакты | `pages/contacts.json` | `seo/contacts.json` | Адрес, телефоны, email, форма |
| Политика | `pages/policy.json` | `seo/policy.json` | Юр. лицо, реквизиты, email оператора |
| Соглашение | `pages/agree.json` | `seo/agree.json` | Юр. лицо, описание сервиса |
| 404 | `pages/404.json` | `seo/404.json` | Обычно достаточно обновить SEO |

#### 5.2 Новые страницы (создать через scaffold)

```bash
npm run create-page -- <slug>
# Создаст: pages/<slug>.json, seo/<slug>.json, pages/<slug>.css, pages/<slug>.js
# Добавит импорты в main.css и main.js
```

Затем добавить `<slug>` в `sitemap_pages` в `config/project.php`.

Если странице нужен кастомный URL:
```php
'route_map' => [
    'custom-url' => 'page-id',  // /custom-url/ → pages/page-id.json
],
```

#### 5.3 Коллекции (если нужны)

```bash
npm run create-collection -- <slug>
# Создаст: pages/<slug>.json (со списком items), <slug>/example-1..3.json,
#           seo/<slug>.json, pages/<singular>.twig
```

Затем добавить блок в `config/project.php`:
```php
'collections' => [
    '<slug>' => [
        'nav_slug'     => '<slug>',
        'list_page_id' => '<slug>',
        'template'     => 'pages/<singular>.twig',
        'item_key'     => 'item',
        'data_dir'     => '<slug>',
        'slugs_source' => 'items',
        'og_type'      => 'website',
        'extras_key'   => '<singular>',
    ],
],
```

#### 5.4 Новые секции (если нужны)

```bash
npm run create-section -- <name>
# Создаст: sections/<name>.twig, sections/<name>.css, sections/<name>.js
# Добавит импорты в main.css и main.js
```

Для использования — добавить в JSON страницы:
```json
{
  "name": "<name>",
  "visible": true,
  "data": { ... }
}
```

#### 5.5 SEO для каждой страницы

Формат `data/json/ru/seo/<page_id>.json`:

```json
{
  "name": "<page_id>",
  "title": "Заголовок — Бренд",
  "meta": [
    { "name": "description", "content": "Описание страницы для поисковиков" },
    { "property": "og:type", "content": "website" },
    { "property": "og:title", "content": "Заголовок" },
    { "property": "og:description", "content": "Описание" },
    { "property": "og:site_name", "content": "Бренд" }
  ]
}
```

---

### Шаг 6. Собрать и проверить

```bash
# Сборка
npm run build:dev

# Запуск dev-сервера
php -S localhost:8080 -t public
# Windows (PHP не в PATH):
/c/php85/php.exe -S localhost:8080 -t public
```

---

## Часть 3. Что удалять / Что НЕ трогать

### УДАЛЯТЬ (данные предыдущего проекта)

| Категория | Путь | Почему |
|-----------|------|--------|
| JSON коллекций | `data/json/{lang}/{collection}/` | Контент другого заказчика |
| JSON страниц (специфичные) | `data/json/{lang}/pages/{tires-list,buy,warranty...}.json` | Страницы другого заказчика |
| JSON SEO (удалённых страниц) | `data/json/{lang}/seo/{tires-list,buy,warranty...}.json` | SEO удалённых страниц |
| Изображения контента | `data/img/{tires,news,actions}/` | Медиа другого заказчика |
| Фреймы/обложки контента | `data/img/frames/{tires,news,buy...}.*` | Обложки удалённых страниц |

### НЕ ТРОГАТЬ (платформа)

| Категория | Путь | Почему |
|-----------|------|--------|
| PHP-ядро | `src/**` | Content-agnostic, общее для всех |
| Базовые шаблоны | `templates/base.twig`, `templates/pages/page.twig` | Ядро рендеринга |
| ВСЕ секции | `templates/sections/*.twig` | Библиотека — неиспользуемые не мешают |
| ВСЕ компоненты | `templates/components/*.twig` | Библиотека — переиспользуются |
| Шаблоны коллекций | `templates/pages/tire.twig`, `news.twig` | Reference-реализации |
| ВСЕ JS секций | `assets/js/sections/*.js` | Обслуживают шаблоны |
| ВСЕ CSS секций | `assets/css/sections/*.css` | Обслуживают шаблоны |
| ВСЕ CSS компонентов | `assets/css/components/*.css` | Обслуживают компоненты |
| Импорты main.js | Строки `import './sections/...'` | Без импорта — ошибка при будущем использовании |
| Импорты main.css | Строки `@import "sections/..."` | Без импорта — ошибка при будущем использовании |
| Scaffold-генераторы | `tools/scaffold/*` | Инструментарий платформы |
| Тесты | `tests/*` | Инфраструктура проверки |
| Сборка | `webpack.config.js`, `postcss.config.js` | Инфраструктура сборки |
| Конфиг ядра | `config/settings.php`, `config/routes.php` | Общее для всех |
| CSS-база | `assets/css/base/*` (кроме variables.css) | Фундамент стилей |

### НАСТРАИВАТЬ (под нового заказчика)

| Файл | Что менять |
|------|-----------|
| `config/project.php` | route_map, collections, sitemap_pages, integrations |
| `.env` | APP_BASE_URL, YANDEX_METRIC_ID, API-ключи |
| `data/json/global.json` | Навигация, контакты, логотипы, копирайт |
| `assets/css/base/variables.css` | Цвета (`--color-3` ... `--color-8`), hero-фон, шрифты |
| `data/json/{lang}/pages/*.json` | Контент всех страниц |
| `data/json/{lang}/seo/*.json` | SEO всех страниц |
| `data/img/ui/logos/*` | Логотипы |
| `data/img/favicons/*` | Фавиконы |
| `data/img/favicons/site.webmanifest` | Имя приложения |
| `data/img/seo/og.webp` | OG-изображение |

---

## Часть 4. Чеклист верификации

### 4.1 Техническая проверка

```bash
# Валидация JSON (все файлы в data/json/)
npm run validate-json

# Сборка CSS + JS (не должно быть ошибок)
npm run build:dev

# Линтинг (опционально, но рекомендуется)
npm run check
```

| # | Команда | Ожидание |
|---|---------|----------|
| 1 | `npm run validate-json` | «Все JSON валидны» |
| 2 | `npm run build:dev` | «webpack compiled successfully», PostCSS без ошибок |
| 3 | `npm run test:php` | Все тесты пройдены |
| 4 | `npm run test:js` | Все тесты пройдены |

### 4.2 Smoke-тесты (требуется запущенный сервер)

```bash
# Запустить сервер
php -S localhost:8080 -t public &

# Запустить smoke-тесты
npm run test:smoke
```

| # | Проверка | Ожидание |
|---|---------|----------|
| 1 | `GET /` | 200, text/html |
| 2 | `GET /contacts/` | 200 |
| 3 | `GET /policy/` | 200 |
| 4 | `GET /agree/` | 200 |
| 5 | `GET /nonexistent/` | 404 |
| 6 | `GET /en/` | 200 (мультиязычность) |
| 7 | `GET /health` | 200, JSON |

### 4.3 Визуальная проверка (открыть в браузере)

| # | Что проверить | Где смотреть |
|---|-------------|-------------|
| 1 | Логотип в header | Верная картинка, корректный размер |
| 2 | Логотип в footer | Верная картинка, видна на тёмном фоне |
| 3 | Фавикон | Вкладка браузера |
| 4 | Цвета кнопок и ссылок | Акцентный цвет заказчика |
| 5 | Навигация | Верные пункты, ссылки рабочие |
| 6 | Footer | Копирайт, контакты, ссылки на policy/agree |
| 7 | Мобильная версия | Бургер-меню, адаптивность секций |
| 8 | Заголовок вкладки | `<title>` из SEO — бренд заказчика |
| 9 | Cookie-панель | Текст, кнопка, ссылка на policy |

### 4.4 SEO-проверка

| # | Что проверить | Как |
|---|-------------|-----|
| 1 | `<title>` каждой страницы | View source или DevTools |
| 2 | `<meta name="description">` | Уникальный для каждой страницы |
| 3 | `og:title`, `og:description`, `og:image` | DevTools → Elements → head |
| 4 | `og:site_name` | Должно быть имя бренда заказчика |
| 5 | JSON-LD в `<head>` | Organization, BreadcrumbList |
| 6 | `sitemap.xml` | `GET /sitemap.xml` — содержит только актуальные страницы |

### 4.5 Проверка на отсутствие старого контента

```bash
# Поиск упоминаний предыдущего заказчика
grep -ri "kumho\|шин[ыа-я]\|tires\|tire" data/json/ templates/
# Должно быть 0 результатов в data/json/
# В templates/ — допустимо (это шаблоны платформы, не контент)

# Проверка несуществующих страниц
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/tires/
# Ожидание: 404

curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/buy/
# Ожидание: 404
```

---

## Часть 5. Быстрый старт (всё в одном)

Минимальный набор команд для нового проекта:

```bash
# 1. Ветка
git checkout main && git checkout -b project/<client>

# 2. Очистка данных (адаптировать под текущее содержимое main)
rm -rf data/json/ru/tires/ data/json/ru/news/
rm -rf data/img/tires/ data/img/news/ data/img/actions/
rm -f data/json/ru/pages/{tires-list,tires,news,buy,warranty,dealers}.json
rm -f data/json/ru/seo/{tires-list,news,buy,warranty}.json
rm -f data/img/frames/{tires,news,buy,warranty}.*

# 3. Конфигурация
cp config/project.php.dist config/project.php
cp .env.example .env
# Отредактировать: project.php, .env, global.json, variables.css

# 4. Брендинг
# Положить логотипы в data/img/ui/logos/
# Положить фавикон-исходник и запустить: npm run generate-favicons
# Обновить site.webmanifest

# 5. Контент
# Отредактировать pages/index.json, contacts.json, policy.json, agree.json
# Отредактировать seo/*.json

# 6. Новые страницы (при необходимости)
npm run create-page -- demo-tools
# Добавить в sitemap_pages в project.php

# 7. Сборка и проверка
npm run build:dev
npm run validate-json
php -S localhost:8080 -t public
```
