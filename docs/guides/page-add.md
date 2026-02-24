# Инструкция по созданию обычных страниц сайта

## Расположение файлов

JSON файлы обычных страниц находятся в директории: `data/json/ru/pages/`

Каждый файл должен иметь название, соответствующее slug страницы, например:

- `avtorskiy-nadzor.json`
- `landshaftnoe-proektirovanie.json`
- `team.json`

## Структура JSON файла страницы

### Основные поля (верхний уровень)

```json
{
  "name": "avtorskiy-nadzor",
  "sections": [
    {
      "name": "header",
      "data": {}
    },
    {
      "name": "promo",
      "data": { ... }
    },
    ...другие секции
  ]
}
```

#### Описание основных полей:

- **name** - уникальный идентификатор страницы (используется в URL)
- **sections** - массив секций, составляющих страницу

### Основные типы секций

#### 1. Header секция

```json
{
  "name": "header",
  "data": {}
}
```

#### 2. Promo секция (главный экран)

```json
{
  "name": "promo",
  "data": {
    "heading": {
      "tag": "h1",
      "class": "h1 heading heading-flex uppercase",
      "title": "Авторский надзор"
    },
    "subheading": {
      "tag": "h2",
      "class": "h6 heading heading-flex uppercase opacity-60",
      "title": "Чтобы сад родился таким, как был задуман."
    },
    "background": {
      "src": "data/img/ui/bg1.webp"
    }
  }
}
```

#### 3. Intro секция (слайдер)

```json
{
  "name": "intro",
  "data": {
    "slider": {
      "id": "introSlider",
      "navigation": {
        "enabled": true,
        "color": "#fff",
        "size": "3rem"
      },
      "pagination": {
        "enabled": false,
        "color": "#fff"
      },
      "items": [
        {
          "cover": "data/img/intro/slide-1.webp",
          "title": "",
          "desc": "",
          "href": ""
        }
      ]
    }
  }
}
```

#### 4. Content-container секция (основной контент)

```json
{
  "name": "content-container",
  "data": {
    "content": {
      "class": "landscape-design",
      "items": [
        ... массив контентных блоков
      ]
    }
  }
}
```

#### 5. Form-container секция

```json
{
  "name": "form-container",
  "data": {
    "heading": {
      "tag": "h2",
      "class": "h5 heading heading-flex uppercase",
      "title": "Заказать проектирование <span class='nowrap'>Скандинавского сада</span>"
    },
    "catalogs": [
      {
        "title": "Каталог частных садов",
        "href": "data/catalogs/catalog-private-gardens.pdf",
        "icon": {
          "src": "/data/img/ui/icons/icon-download-sm-color-2.svg"
        }
      }
    ]
  }
}
```

#### 6. Footer секция

```json
{
  "name": "footer",
  "data": {}
}
```

## Типы контентных блоков в content-container

### 1. Карточки преимуществ

```json
{
  "class": "cards-advantage-wrap",
  "content": "{% include 'components/card-advantage.twig' with {'items': item.items} %}",
  "items": [
    {
      "title": "Сопровождаем реализацию на всех этапах"
    },
    {
      "title": "Помогаем сохранить концепцию"
    }
  ]
}
```

### 2. Обложка (изображение)

```json
{
  "class": "cover-wrap",
  "content": "<div class='section__subitem container-lg'>{% include 'components/cover.twig' with {'cover': item.cover} %}</div>",
  "cover": {
    "src": "data/img/content/cover-1.webp",
    "alt": ""
  }
}
```

### 3. Контент с заголовком и описанием

```json
{
  "class": "content-wrap container-lg",
  "content": "<div class='section__subitem heading-wrap'>{% include 'components/heading.twig' with {'item': item.heading} %}</div><div class='section__subitem desc-wrap'><span class='desc'>{{ item.desc | raw }}</span></div>",
  "heading": {
    "tag": "h2",
    "class": "h3 heading heading-flex uppercase",
    "title": "Что такое авторский надзор?"
  },
  "desc": "Авторский надзор — это профессиональное сопровождение реализации проекта..."
}
```

### 4. Только заголовок

```json
{
  "class": "heading-wrap",
  "content": "<div class='section__subitem heading-wrap container-lg'>{% include 'components/heading.twig' with {'item': item.heading} %}</div>",
  "heading": {
    "tag": "h2",
    "class": "h2 heading heading-flex uppercase",
    "title": "Как проходит авторский надзор от студии Компания"
  }
}
```

### 5. Контент с изображением (content-cover-wrap)

```json
{
  "class": "content-cover-wrap",
  "content": "<div class='section__subitem content-wrap'><div class='section__inner heading-wrap container-lg'>{% include 'components/heading.twig' with {'item': item.heading} %}</div><div class='section__inner desc-wrap container-lg'><span class='desc'>{{ item.desc | raw }}</span></div></div><div class='section__subitem cover-wrap'><div class='section__inner container-lg'>{% include 'components/cover.twig' with {'cover': item.cover} %}</div></div>",
  "heading": {
    "tag": "h2",
    "class": "h3 heading heading-flex uppercase",
    "title": "2. Сопровождение на месте"
  },
  "desc": "Описание...",
  "cover": {
    "src": "data/img/content/cover-2.webp",
    "alt": ""
  }
}
```

### 6. Нумерованные карточки

```json
{
  "class": "cards-num-wrap",
  "content": "{% include 'components/card-num.twig' with {'items': item.items} %}",
  "items": [
    {
      "value": "01",
      "title": "Реализация без потери идеи",
      "desc": "Каждый сад начинается с идеи..."
    },
    {
      "value": "02",
      "title": "Экономия бюджета и времени",
      "desc": "Ошибки на стройке — это не просто неудобства..."
    }
  ]
}
```

### 7. Текстовые карточки

```json
{
  "class": "heading-cards-text-wrap container-lg",
  "content": "<div class='section__subitem heading-wrap container-lg'>{% include 'components/heading.twig' with {'item': item.heading} %}</div><div class='section__subitem cards-text-wrap'>{% include 'components/card-text.twig' with {'items': item.items} %}</div>",
  "heading": {
    "tag": "h2",
    "class": "h2 heading heading-flex uppercase",
    "title": "<span>Наши принципы</span> <span>при сопровождении</span>"
  },
  "items": [
    {
      "heading": {
        "tag": "h3",
        "class": "h6 heading heading-flex uppercase",
        "title": "Уважение к замыслу"
      },
      "desc": "Мы бережно относимся к идее..."
    }
  ]
}
```

### 8. Блок с формой

```json
{
  "class": "content-wrap container-lg",
  "content": "<div class='section__subitem desc-wrap container-md'><span class='desc'>{{ item.desc | raw }}</span></div><div class='section__subitem form-wrap container-md'>{% include 'components/form-callback.twig' with { data: item.form } %}</div>",
  "desc": "Каждый сад — индивидуален...",
  "form": {
    "button": {
      "title": "Узнать цену"
    }
  }
}
```

### 9. Аккордеон

```json
{
  "class": "heading-accordion-wrap",
  "content": "<div class='section__subitem heading-wrap'>{% include 'components/heading.twig' with {'item': item.heading} %}</div><div class='section__subitem accordion-wrap'>{% include 'components/accordion.twig' with {'items': item.items} %}</div>",
  "heading": {
    "tag": "h2",
    "class": "h5 heading heading-flex uppercase",
    "title": "<span>Частые вопросы</span> <span>по авторскому надзору</span>"
  },
  "items": [
    {
      "title": "Входит ли авторский надзор в стоимость проектирования?",
      "icon": {
        "src": "data/img/ui/icons/icon-arrow-down-color-2.svg",
        "alt": "Аккордеон"
      },
      "desc": "Нет, авторский надзор — это отдельная услуга..."
    }
  ]
}
```

### 10. Блок "О студии"

```json
{
  "class": "about-wrap",
  "content": "<div class='section__subitem heading-wrap container-md'>{% include 'components/heading.twig' with {'item': item.heading} %}</div><div class='section__subitem desc-wrap container-md'><span class='desc'>{{ item.desc | raw }}</span></div><div class='section__subitem button-wrap container-md'>{% include 'components/button.twig' with {'item': item.button} %}</div>",
  "heading": {
    "tag": "h2",
    "class": "h3 heading heading-flex uppercase",
    "title": "О студии ландшафтного дизайна Компания"
  },
  "desc": "Там, где хочется тишины, рождается сад...",
  "button": {
    "title": "Подробнее о нас",
    "class": "button button-sm outline-color-2 button-animated animation-shift uppercase link",
    "href": "/team/"
  }
}
```

## Как разбивать контент

Значения для компонентов (заголовки, классы) задаются **отдельно в JSON**, а не вставляются инлайном в HTML внутри `desc`.

**Нельзя:** один блок с длинным `desc`, в котором заголовки и разметка прописаны вручную:

```json
{
  "class": "content-wrap container-sm",
  "content": "...",
  "heading": { "tag": "h1", ... },
  "desc": "Текст... <h2 class=\"h6 heading...\">Подзаголовок</h2> ещё текст..."
}
```

**Нужно:** разбить контент на несколько блоков в `content.items`. У каждого блока — свои поля `heading` (если есть подзаголовок) и `desc` (только текст этого фрагмента, без тегов заголовков).

1. Определить логические блоки: вводный текст, блок «Что нужно сделать», блок «Не распространяется на» и т.п.
2. Для каждого блока создать отдельный элемент в `items` с одним и тем же шаблоном `content` (heading + longread).
3. Заголовок блока задать в `heading`: `tag`, `class`, `title`.
4. Текст блока — только в `desc`, без `<h2>`, `<h3>` и других компонентных классов внутри.

**Пример: длинная страница гарантии разбита на три блока**

```json
"items": [
  {
    "class": "content-wrap container-sm",
    "content": "<div class='section__subitem heading-wrap'><span class='heading-accent self-start' aria-hidden='true'></span>{% include 'components/heading.twig' with {'item': item.heading} %}</div><div class='section__subitem longread-wrap'><span class='longread'>{{ item.desc | raw }}</span></div>",
    "heading": {
      "tag": "h1",
      "class": "h1 heading font-2 weight-700 heading-flex uppercase",
      "title": "Расширенная гарантия на шины Kumho"
    },
    "desc": "Вводный текст без подзаголовков внутри..."
  },
  {
    "class": "content-wrap container-sm",
    "content": "...тот же content...",
    "heading": {
      "tag": "h2",
      "class": "h6 heading font-2 weight-600 heading-flex uppercase",
      "title": "Чтобы воспользоваться гарантией, необходимо:"
    },
    "desc": "Только текст и список этого блока, без <h2> в HTML."
  },
  {
    "class": "content-wrap container-sm",
    "content": "...тот же content...",
    "heading": {
      "tag": "h2",
      "class": "h6 heading font-2 weight-600 heading-flex uppercase",
      "title": "Гарантия не распространяется на:"
    },
    "desc": "Только список исключений."
  }
]
```

Иерархия заголовков: один `h1` на страницу, далее по порядку `h2` (без пропуска до `h3`). Стили заголовков задаются классами (`h1`, `h2`, `h6` и т.д.) в объекте `heading`, а не в разметке внутри `desc`.

## Правила оформления

### Заголовки

- **H1**: `"class": "h1 heading heading-flex uppercase"`
- **H2**: `"class": "h2 heading heading-flex uppercase"` или `"class": "h3 heading heading-flex uppercase"`
- **H3**: `"class": "h6 heading heading-flex uppercase"`
- Подзаголовки: `"class": "h6 heading heading-flex uppercase opacity-60"`

### Текст

- Поддерживается HTML разметка
- Переносы строк: `<br><br>`
- Можно использовать span для переносов: `<span>Первая часть</span> <span>Вторая часть</span>`

### Изображения

- Используйте изображения из `data/img/` (подразделы по секциям: intro, ui и т.д.)
- Предпочтительно WebP
- Формат: `.webp`
- Фоновые изображения: `data/img/ui/`

### CSS классы контейнеров

- `container-lg` - большой контейнер
- `container-md` - средний контейнер
- `section__subitem` - подэлемент секции
- `section__inner` - внутренний элемент секции

## Пример полной структуры страницы

```json
{
  "name": "example-page",
  "sections": [
    {
      "name": "header",
      "data": {}
    },
    {
      "name": "promo",
      "data": {
        "heading": {
          "tag": "h1",
          "class": "h1 heading heading-flex uppercase",
          "title": "Заголовок страницы"
        },
        "background": {
          "src": "data/img/ui/bg1.webp"
        }
      }
    },
    {
      "name": "content-container",
      "data": {
        "content": {
          "class": "page-content",
          "items": [
            {
              "class": "content-wrap container-lg",
              "content": "<div class='section__subitem desc-wrap'><span class='desc'>{{ item.desc | raw }}</span></div>",
              "desc": "Основной текст страницы."
            }
          ]
        }
      }
    },
    {
      "name": "footer",
      "data": {}
    }
  ]
}
```

## Технические требования

- Валидный JSON формат
- Кодировка UTF-8
- Корректное экранирование кавычек в HTML
- Обязательная проверка синтаксиса перед сохранением
- Использование существующих компонентов Twig
- Соблюдение единообразного стиля CSS классов
