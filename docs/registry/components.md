# Реестр Twig-компонентов и секций

> Обновлено 2026-03-10. Обновлять при добавлении/удалении компонентов.

## Components (30)

| Имя | Путь | Параметры | Универсальное назначение |
|-----|------|-----------|--------------------------|
| accordion | `components/accordion.twig` | `items[]` (title, answerText, desc, icon), `accordion_id` | FAQ, раскрывающиеся списки, Q&A |
| analytics | `components/analytics.twig` | — | Подключение аналитики (Метрика, Roistat, Mail.ru) |
| blockquote | `components/blockquote.twig` | `item` (title, class) | Цитаты, выделенные блоки текста |
| burger-icon | `components/burger-icon.twig` | `global.burger.aria_*`, `lang_code` | Кнопка гамбургер-меню с ARIA |
| burger-menu | `components/burger-menu.twig` | `items[]` (href, title, visible), `lang_code` | Мобильное навигационное меню |
| button | `components/button.twig` | `item` (title, href, target, icon, data_tag, class) | Универсальная кнопка/ссылка |
| button-section | `components/button-section.twig` | `item` (href, title, icon, class, target) | Крупная секционная кнопка |
| card-action | `components/card-action.twig` | `item` (href, cover, icon, title, desc, class, target) | Интерактивная карточка с логотипом и описанием |
| **card-dealer** | `components/card-dealer.twig` | `item` (name, location, address, phones[], site, guarantee, bshm) | **Карточка контрагента**: дилер, партнёр, филиал, точка продаж — любая сущность с адресом, телефонами и бейджами |
| card-gradient | `components/card-gradient.twig` | `item` (href, cover, title, icon, class) | Карточка с градиентным фоном |
| card-nav | `components/card-nav.twig` | `item` (href, cover, title, class) | Навигационная карточка |
| **card-news** | `components/card-news.twig` | `item` (slug, cover, date, title, desc) | **Карточка публикации**: новость, статья, событие, анонс — любой контент с датой, обложкой, описанием |
| card-number | `components/card-number.twig` | `item` (title, label, time) | Карточка числовых показателей |
| card-owner | `components/card-owner.twig` | `item` (cover, title) | Карточка персоны |
| **card-tire** | `components/card-tire.twig` | `item` (item.code, item.series, images), `lang_code` | **Карточка товара каталога**: шина, бутылка, запчасть — любой товар с кодом, серией и изображением. Имя исторические (tire = первый deployment), по сути — `card-product` |
| cover | `components/cover.twig` | `cover` (alt, src) | Обёртка для адаптивного изображения |
| custom-list | `components/custom-list.twig` | `items[]` (строки HTML) | Список с auto-detection маркеров |
| favicons | `components/favicons.twig` | — | Блок фавиконок |
| features-list | `components/features-list.twig` | `items[]` (строки) | Список особенностей (uppercase) |
| **filter** | `components/filter.twig` | `filter` (root_class, groups[]) | **Полностью универсальный** data-driven фильтр: кнопки, селекты, переключатели. Конфигурация через JSON. Используется в каталогах, картах, списках |
| form-callback | `components/form-callback.twig` | `data.button`, `global['form-callback'].*`, `csrf_token` | Форма обратного звонка |
| heading | `components/heading.twig` | `item` (tag, title, class, attributes) | Универсальный заголовок h1-h6 |
| logo | `components/logo.twig` | `src`, `alt`, `class`, `global.logo.*` | Логотип с fallback на глобальный |
| mini-table | `components/mini-table.twig` | `items[]` (href, title, value) | Таблица пар ключ-значение |
| numbered-list | `components/numbered-list.twig` | `items[]` (строки HTML) | Нумерованный список |
| picture | `components/picture.twig` | `image` (src/raw/1600/800), `alt`, `class`, `sizes_preset`, `loading` | Адаптивное изображение с srcset и WebP |
| scripts | `components/scripts.twig` | — | Подключение JS бандлов |
| slider | `components/slider.twig` | `slider_id`, `items[]`, `slider_settings`, `slide_component` | Swiper-слайдер |
| spoiler | `components/spoiler.twig` | `item` (title, icon, active, items[]) | Раскрывающийся спойлер |
| styles | `components/styles.twig` | — | Подключение CSS бандлов |

## Sections (20)

| Имя | Путь | Параметры | Универсальное назначение |
|-----|------|-----------|--------------------------|
| actions | `sections/actions.twig` | `data` (heading, items[]) | Ряд action-карточек |
| contacts | `sections/contacts.twig` | `section` (title, content), `contacts` | Контакты с Schema.org Organization |
| content | `sections/content.twig` | `data` (items[].content, items[].class) | HTML-контент через `template_from_string` |
| content-container | `sections/content-container.twig` | `data` (content.items[]), `container` | Обёртка для content с контейнером |
| cookie-panel | `sections/cookie-panel.twig` | `global['cookie-panel'][lang_code].*` | Панель согласия на cookies |
| **dealers** | `sections/dealers.twig` | `data` (heading, items[], map, filter) | **Секция геоконтактов**: дилеры, филиалы, точки продаж, партнёры — любые сущности с координатами. Яндекс.Карты + фильтрация по городу и бейджам |
| footer | `sections/footer.twig` | `global.logo.*`, `global.nav[lang_code].*`, `global.copyright` | Подвал с навигацией и копирайтом |
| frame | `sections/frame.twig` | `data` (cover.src / cover) | Фрейм с фоновым изображением |
| header | `sections/header.twig` | `global`, `pageData.name`, `page_id`, `lang_code` | Шапка с навигацией |
| headline | `sections/headline.twig` | `data` (heading) | Секция с одним заголовком |
| **hero** | `sections/hero.twig` | `data` (heading, description, login, background) | **Главный экран**: заголовок, описание, форма входа (опционально), фон. Для лендингов и корпоративных порталов |
| intro | `sections/intro.twig` | `data` (slider, heading, background), `lang_code` | Hero-секция со слайдером |
| logoline | `sections/logoline.twig` | `data` (tires[]), `lang_code` | Слайдер быстрых ссылок на модели |
| navigation | `sections/navigation.twig` | `data` (items[]{type, size, items[]}) | Типизированные блоки навигации |
| **news** | `sections/news.twig` | `data` (heading, items[], all_news_link), `page_id` | **Лента публикаций**: новости, статьи, события, блог — любой список с обложкой, датой, описанием |
| owners | `sections/owners.twig` | `data` (heading, items[]) | Галерея персон |
| **partners** | `sections/partners.twig` | `data` (label, heading, description, features[], cards[]) | **Блок для партнёров/клиентов**: заголовок, описание, список фич, карточки категорий партнёров |
| **tires** | `sections/tires.twig` | `data` (heading, filter, items[], all_models_link, preview_limit) | **Каталог товаров** с data-driven фильтрацией: шины, напитки, запчасти — любая коллекция с фильтруемыми атрибутами. Имя историческое (tire = первый deployment) |
| **trust** | `sections/trust.twig` | `data` (items[]{icon, title, desc}) | **Блок доверия/преимуществ**: иконки + заголовок + описание. Для USP, ценностей, фактов о компании |
| us | `sections/us.twig` | `data` (cover.src, cards[].text, items[]) | Секция «О нас» с метриками |

## Pages (3)

| Имя | Путь | Универсальное назначение |
|-----|------|--------------------------|
| page | `pages/page.twig` | Data-driven рендеринг страницы по sections из JSON |
| **tire** | `pages/tire.twig` | **Детальная страница сущности коллекции**: шина, напиток, товар — код, серия, описание. Имя историческое |
| **news** | `pages/news.twig` | **Детальная страница публикации**: новость, статья, событие — обложка, дата, лид, тело |

## JavaScript (2 секционных модуля)

| Имя | Путь | Универсальное назначение |
|-----|------|--------------------------|
| **tires.js** | `assets/js/sections/tires.js` | **Клиентская фильтрация каталога**: читает data-атрибуты карточек (`data-season`, `data-diameter` и т.д.), фильтрует через pipe-separated токены (`"\|value1\|value2\|"`). Адаптируется к любым атрибутам через JSON-конфиг |
| **dealers.js** | `assets/js/sections/dealers.js` | **Карта + фильтрация контрагентов**: Яндекс.Карты, маркеры из data-атрибутов, двусторонняя синхронизация (фильтр ↔ карта ↔ карточки), геолокация. Для дилеров, филиалов, точек продаж |

## Соглашение об именах

Некоторые шаблоны носят имена первого deployment'а (Kumho Tires). Это **исторические имена**, не ограничивающие использование:

| Текущее имя | Универсальное значение | Почему не переименовано |
|-------------|----------------------|------------------------|
| `card-tire` | `card-product` | Переименование ломает git-историю, импорты в main.js/main.css, ссылки в JSON. Нулевая польза для рендеринга |
| `tires` (секция) | `catalog` | Аналогично. Секция полностью data-driven, работает с любым типом товара |
| `tires.js` | `catalog.js` | Аналогично. Фильтрация параметризована через data-атрибуты |
| `tire` (страница) | `product-detail` | Аналогично. Шаблон принимает любую сущность коллекции |
| `dealers` | `partners-list` / `locations` | Аналогично. Работает с любыми геоконтактами |
| `dealers.js` | `locations.js` | Аналогично |

**Принцип:** имя файла — идентификатор в системе, не описание контента. Описание — в этом реестре и в JSON-конфиге секции.

## Глобальные переменные (доступны во всех шаблонах)

| Переменная | Источник | Описание |
|---|---|---|
| `global` | `data/json/global.json` | Навигация, логотипы, контакты, формы, cookies |
| `base_url` | Twig global | Базовый URL сайта |
| `lang_code` | TemplateDataBuilder | Текущий язык (ru, en) |
| `currentLang` | TemplateDataBuilder | Объект языка {code, title, direction} |
| `page_id` | TemplateDataBuilder | Идентификатор страницы |
| `pageData` | TemplateDataBuilder | Данные страницы (sections, items) |
| `pageSeoData` | TemplateDataBuilder | SEO-данные (title, meta) |
| `sections` | TemplateDataBuilder | Массив секций страницы |
| `settings` | TemplateDataBuilder | Конфигурация приложения |
| `csrf_token` | PageAction | CSRF-токен для форм |

## Schema.org разметка

| Компонент | Тип Schema.org |
|---|---|
| accordion | FAQPage, Question, Answer |
| header | Organization |
| footer | Organization |
| contacts | Organization, PostalAddress |
