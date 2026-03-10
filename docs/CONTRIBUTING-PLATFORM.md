# Руководство: Ядро платформы vs Контент проекта

> **Для всех участников разработки, включая AI-ассистентов (Claude Code, Cursor, Copilot и др.)**
> **Дата:** 10 марта 2026 | **Версия:** 1.0

---

## Главное правило

**Платформенные изменения и контент проекта НИКОГДА не смешиваются в одном коммите и одной ветке.**

- **Ветка `master`** (или `main`) — контент конкретного проекта (JSON, изображения, цвета бренда, аналитика)
- **Ветка `platform`** — изменения ядра платформы (PHP, шаблоны, JS, CSS-компоненты, тесты)

---

## Что такое ядро платформы

Ядро — это content-agnostic код, который работает одинаково для любого deployment'а (Kumho, Ритейл Логистик, будущие проекты).

### Платформа (пушить в `platform`)

| Категория | Файлы |
|---|---|
| PHP-ядро | `src/**` |
| Конфигурация ядра | `config/settings.php`, `config/routes.php`, `config/container.php`, `config/middleware.php` |
| Шаблоны компонентов | `templates/components/**` (кроме `analytics*.twig`) |
| Шаблоны секций | `templates/sections/**` |
| Базовые шаблоны | `templates/base.twig`, `templates/pages/page.twig` |
| JavaScript | `assets/js/**` |
| CSS компоненты/секции | `assets/css/components/**`, `assets/css/sections/**` |
| CSS базовый (кроме переменных бренда) | `assets/css/base/**` (кроме `variables.css`) |
| CSS утилиты | `assets/css/utils/**` |
| CSS main (импорты) | `assets/css/main.css` |
| Scaffold-генераторы | `tools/scaffold/**` |
| Тесты | `tests/**` |
| Webpack/PostCSS конфиги | `webpack.config.js`, `postcss.config.js` |
| Документация платформы | `docs/workflow-repositories.md`, `docs/CONTRIBUTING-PLATFORM.md` |

### Контент проекта (пушить в `master`/`main`)

| Категория | Файлы | Почему нельзя в platform |
|---|---|---|
| JSON-данные | `data/json/**` | Контент конкретного проекта |
| Изображения | `data/img/**` | Визуальные ресурсы бренда |
| Фавиконки | `data/img/favicons/**` | Брендинг |
| CSS переменные бренда | `assets/css/base/variables.css` | Цвета, специфичные для бренда |
| Конфигурация проекта | `config/project.php` | Коллекции, route_map, sitemap |
| Аналитика | `templates/components/analytics*.twig` | ID метрики конкретного проекта |
| Шрифты бренда | `assets/fonts/**` | Типографика бренда |

---

## Структура репозиториев

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│  qbsm/kumho-tires.ru        │     │  itsokismart/orch            │
│  (эталон платформы + Kumho)  │     │  (Ритейл Логистик)           │
│                              │     │                              │
│  master   = контент Kumho    │     │  main     = контент РЛ       │
│  platform = ядро платформы   │     │                              │
└──────────┬───────────────────┘     └──────────┬───────────────────┘
           │                                    │
           │◄───── PR: platform ◄── platform ───┤
           │                                    │
           ├───── fetch + селективный checkout ─►│
           │      (только platform файлы)       │
           │                                    │
     ┌─────┴──────────────────────────┐         │
     │  itsokismart/kumho-tires.ru    │         │
     │  (форк, мост для PR)           │         │
     │                                │         │
     │  master   ◄── sync с qbsm     │         │
     │  platform ◄── push из orch  ───┼─────────┘
     └────────────────────────────────┘
```

---

## Workflow для разработчика

### Я работаю над проектом Kumho (qbsm)

```bash
# Контентные изменения — в master
git checkout master
# редактирую data/json/, data/img/, config/project.php, variables.css
git commit -m "content: описание изменения"
git push origin master

# Платформенные изменения — в platform
git checkout platform
# редактирую src/, templates/, assets/js/, assets/css/components/
git commit -m "feat: описание платформенного улучшения"
git push origin platform
```

### Я работаю над Ритейл Логистик (orch)

```bash
# Всё в main (контент + платформа в одной ветке, т.к. deployment)
git checkout main

# Платформенные изменения → отправить в форк для PR
git push itsok main:platform

# Обратная синхронизация из эталона
git fetch qbsm master
git diff main..qbsm/master -- src/ templates/ assets/css/ assets/js/
git checkout qbsm/master -- path/to/platform/file.ext
```

---

## Workflow для AI-ассистента

### Обязательные правила

1. **Перед коммитом** — классифицируй каждый изменённый файл по таблице выше
2. **Не смешивай** платформу и контент в одном коммите
3. **Не пушь** контент одного проекта в другой (JSON, изображения, цвета, аналитику)
4. **Коммиты от имени разработчика** — без Co-Authored-By
5. **При селективном merge** — используй `git checkout <remote>/<branch> -- <file>` для платформенных файлов, игнорируй контентные

### Префиксы коммитов

| Префикс | Использование | Ветка |
|---|---|---|
| `feat:` | Новая платформенная функциональность | `platform` |
| `fix:` | Исправление в ядре | `platform` |
| `refactor:` | Рефакторинг ядра | `platform` |
| `content:` | Контент проекта (JSON, изображения) | `master`/`main` |
| `style:` | Стили бренда (variables.css, шрифты) | `master`/`main` |
| `docs:` | Документация | по ситуации |

### Как определить: платформа или контент?

Задай себе вопрос: **"Это изменение нужно всем проектам на этой платформе?"**

- **Да** → платформа → ветка `platform`
- **Нет, только этому проекту** → контент → ветка `master`/`main`

---

## Чек-лист перед push

- [ ] Все платформенные файлы — в коммите для `platform`
- [ ] Все контентные файлы — в коммите для `master`/`main`
- [ ] Нет JSON-данных в платформенном коммите
- [ ] Нет `variables.css` в платформенном коммите
- [ ] Нет `config/project.php` в платформенном коммите
- [ ] Нет `analytics*.twig` в платформенном коммите
- [ ] Коммит-сообщение с правильным префиксом
