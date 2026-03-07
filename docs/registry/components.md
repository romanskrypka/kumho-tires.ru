# Реестр Twig-компонентов и секций

> Автоматически сгенерировано 2026-03-07. Обновлять при добавлении/удалении компонентов.

## Components (30)

| Имя | Путь | Параметры | Включает | Описание |
|-----|------|-----------|----------|----------|
| accordion | `components/accordion.twig` | `items[]` (title, answerText, desc, icon), `accordion_id` | — | FAQ-аккордеон с JSON-LD FAQPage |
| analytics | `components/analytics.twig` | — | — | Подключение аналитики (Яндекс.Метрика, Roistat, Mail.ru) |
| blockquote | `components/blockquote.twig` | `item` (title, class) | — | Блок цитаты |
| burger-icon | `components/burger-icon.twig` | `global.burger.aria_*`, `lang_code` | — | Кнопка гамбургер-меню с ARIA |
| burger-menu | `components/burger-menu.twig` | `items[]` (href, title, visible), `lang_code` | — | Мобильное навигационное меню |
| button | `components/button.twig` | `item` (title, href, target, icon, data_tag, class) | — | Универсальная кнопка/ссылка |
| button-section | `components/button-section.twig` | `item` (href, title, icon, class, target) | — | Крупная секционная кнопка |
| card-action | `components/card-action.twig` | `item` (href, cover, icon, title, desc, class, target) | — | Интерактивная карточка с логотипом и описанием |
| card-dealer | `components/card-dealer.twig` | `item` (name, location, address, phones[], site, guarantee, bshm) | — | Карточка дилера с контактами |
| card-gradient | `components/card-gradient.twig` | `item` (href, cover, title, icon, class) | — | Карточка с градиентным фоном |
| card-nav | `components/card-nav.twig` | `item` (href, cover, title, class) | — | Навигационная карточка |
| card-news | `components/card-news.twig` | `item` (slug, cover, date, title, desc) | — | Новостная карточка |
| card-number | `components/card-number.twig` | `item` (title, label, time) | — | Карточка числовых показателей |
| card-owner | `components/card-owner.twig` | `item` (cover, title) | — | Карточка персоны |
| card-tire | `components/card-tire.twig` | `item` (item.code, item.series, images), `lang_code` | — | Карточка шины |
| cover | `components/cover.twig` | `cover` (alt, src) | `picture.twig` | Обёртка для адаптивного изображения |
| custom-list | `components/custom-list.twig` | `items[]` (строки HTML) | — | Список с auto-detection маркеров |
| favicons | `components/favicons.twig` | — | — | Блок фавиконок |
| features-list | `components/features-list.twig` | `items[]` (строки) | — | Список особенностей (uppercase) |
| filter | `components/filter.twig` | `filter` (root_class, groups[]) | — | Универсальный фильтр: buttons, select, toggle |
| form-callback | `components/form-callback.twig` | `data.button`, `global['form-callback'].*`, `csrf_token` | — | Форма обратного звонка |
| heading | `components/heading.twig` | `item` (tag, title, class, attributes) | — | Универсальный заголовок h1-h6 |
| logo | `components/logo.twig` | `src`, `alt`, `class`, `global.logo.*` | — | Логотип с fallback на глобальный |
| mini-table | `components/mini-table.twig` | `items[]` (href, title, value) | — | Таблица пар ключ-значение |
| numbered-list | `components/numbered-list.twig` | `items[]` (строки HTML) | — | Нумерованный список |
| picture | `components/picture.twig` | `image` (src/raw/1600/800), `alt`, `class`, `sizes_preset`, `loading` | — | Адаптивное изображение с srcset и WebP |
| scripts | `components/scripts.twig` | — | — | Подключение JS бандлов |
| slider | `components/slider.twig` | `slider_id`, `items[]`, `slider_settings`, `slide_component` | `picture.twig`, `heading.twig` | Swiper-слайдер |
| spoiler | `components/spoiler.twig` | `item` (title, icon, active, items[]) | — | Раскрывающийся спойлер |
| styles | `components/styles.twig` | — | — | Подключение CSS бандлов |

## Sections (17)

| Имя | Путь | Параметры | Включает | Описание |
|-----|------|-----------|----------|----------|
| actions | `sections/actions.twig` | `data` (heading, items[]) | `heading.twig`, `card-action.twig` | Ряд action-карточек |
| contacts | `sections/contacts.twig` | `section` (title, content), `contacts` (phone, email, address) | `heading.twig` | Контакты с Schema.org Organization |
| content | `sections/content.twig` | `data` (items[].content, items[].class) | — | HTML-контент через template_from_string |
| content-container | `sections/content-container.twig` | `data` (content.items[]), `container` | `content.twig` | Обёртка для content с контейнером |
| cookie-panel | `sections/cookie-panel.twig` | `global['cookie-panel'][lang_code].*` | — | Панель согласия на cookies |
| dealers | `sections/dealers.twig` | `data` (heading, items[], map, filter) | `heading.twig`, `filter.twig`, `card-dealer.twig` | Карта дилеров с фильтрацией |
| footer | `sections/footer.twig` | `global.logo.*`, `global.nav[lang_code].*`, `global.copyright[lang_code]` | — | Подвал с навигацией и копирайтом |
| frame | `sections/frame.twig` | `data` (cover.src / cover) | — | Фрейм с фоновым изображением |
| header | `sections/header.twig` | `global` (logo, nav), `pageData.name`, `page_id`, `lang_code` | `burger-icon.twig`, `burger-menu.twig` | Шапка с навигацией |
| headline | `sections/headline.twig` | `data` (heading) | `heading.twig` | Секция с одним заголовком |
| intro | `sections/intro.twig` | `data` (slider, heading, background), `lang_code` | `picture.twig`, `heading.twig` | Hero-секция со слайдером |
| logoline | `sections/logoline.twig` | `data` (tires[]), `lang_code` | — | Слайдер быстрых ссылок на модели |
| navigation | `sections/navigation.twig` | `data` (items[]{type, size, items[]}) | `button-section.twig`, `card-gradient.twig`, `card-nav.twig` | Типизированные блоки навигации |
| news | `sections/news.twig` | `data` (heading, items[], all_news_link), `page_id` | `heading.twig`, `card-news.twig` | Новостная лента |
| owners | `sections/owners.twig` | `data` (heading, items[]) | `heading.twig`, `card-owner.twig` | Галерея персон |
| tires | `sections/tires.twig` | `data` (heading, filter, items[], all_models_link, preview_limit) | `heading.twig`, `filter.twig`, `card-tire.twig` | Каталог шин с фильтрацией |
| us | `sections/us.twig` | `data` (cover.src, cards[].text, items[]) | `card-number.twig` | Секция «О нас» с метриками |

## Pages (3)

| Имя | Путь | Описание |
|-----|------|----------|
| page | `pages/page.twig` | Data-driven рендеринг страницы по sections из JSON |
| tire | `pages/tire.twig` | Детальная страница шины (extends base.twig) |
| news | `pages/news.twig` | Детальная страница новости (extends base.twig) |

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
