# Архитектура репозиториев и Workflow синхронизации

> **Дата создания:** 10 марта 2026
> **Актуальность:** поддерживается при изменениях в структуре remote'ов или workflow

---

## Репозитории проекта

| Репозиторий | Роль | Ветки |
|---|---|---|
| **itsokismart/orch** | Deployment Ритейл Логистик | `main` |
| **qbsm/kumho-tires.ru** | Оригинальный проект Kumho (эталон платформы) | `master` |
| **itsokismart/kumho-tires.ru** | Форк Kumho (мост между deployment'ами и эталоном) | `master` (контент Kumho), `platform` (платформа из orch) |

## Схема взаимодействия

```
┌─────────────────────────┐
│   itsokismart/orch      │
│   (Ритейл Логистик)     │
│   ветка: main           │
└────────┬────────────────┘
         │
         │ git push itsok main:platform
         │ (только платформенные изменения)
         ▼
┌─────────────────────────────────┐
│   itsokismart/kumho-tires.ru    │
│   (форк Kumho)                  │
│   ветка: platform ◄── из orch   │
│   ветка: master   ◄── из qbsm  │
└────────┬────────────────────────┘
         │
         │ PR: platform → qbsm:master
         │ (платформенные улучшения в эталон)
         ▼
┌─────────────────────────────────┐
│   qbsm/kumho-tires.ru          │
│   (эталон платформы)            │
│   ветка: master                 │
└────────┬────────────────────────┘
         │
         │ git fetch qbsm master
         │ + селективный checkout (только платформа, без контента)
         ▼
┌─────────────────────────┐
│   itsokismart/orch      │
│   (Ритейл Логистик)     │
│   ветка: main           │
└─────────────────────────┘
```

## Remote'ы (настройка в локальном репо)

```bash
# Актуальные remote'ы
origin  → itsokismart/orch.git           # Deployment РЛ           ← main
itsok   → itsokismart/kumho-tires.ru.git # Форк Kumho              ← master, platform
qbsm    → qbsm/kumho-tires.ru.git       # Эталон Kumho            ← master
```

## Потоки данных

### Поток 1: Deployment → Эталон (платформенные улучшения)

Когда в deployment'е (orch) сделаны платформенные улучшения, которые полезны всем проектам.

```bash
# 1. Работа в orch/main — разработка
# 2. Push платформенных изменений в форк
git push itsok main:platform

# 3. Если platform содержит контентную специфику — создать чистую ветку:
git checkout -b platform-clean qbsm/master
git checkout main -- path/to/platform/file.ext
git commit -m "feat: описание платформенного улучшения"
git push itsok platform-clean:platform-clean

# 4. Создать PR на GitHub: itsokismart/kumho-tires.ru:platform-clean → qbsm/kumho-tires.ru:master
# 5. Ревью и merge PR
# 6. Удалить временную ветку
git branch -d platform-clean
```

### Поток 2: Эталон → Deployment (обратная синхронизация)

Когда в эталоне (qbsm) появились изменения от коллеги или из другого deployment'а.

```bash
# 1. Скачать изменения из эталона (read-only, ничего не меняет)
git fetch qbsm master

# 2. Посмотреть что нового
git log main..qbsm/master --oneline
git diff main..qbsm/master --stat

# 3. Классифицировать: платформа vs контент
git diff main..qbsm/master -- src/ templates/ assets/css/ assets/js/ config/settings.php

# 4. Селективно применить только платформенные изменения
git checkout qbsm/master -- path/to/platform/file.ext
# или точечные правки вручную

# 5. Коммит и push
git add <файлы>
git commit -m "fix: платформенные улучшения из qbsm/master"
git push origin main
```

### Поток 3: Синхронизация форка с эталоном

Поддержание `itsok/master` в актуальном состоянии с `qbsm/master`.

```bash
# 1. Fetch оригинала
git fetch qbsm master

# 2. Push в форк
git push itsok qbsm/master:master
```

## Правила фильтрации: платформа vs контент

| Категория | Паттерн файлов | Действие при синхронизации |
|---|---|---|
| **Платформа (тянуть)** | `src/**`, `templates/components/**`, `templates/sections/**`, `templates/base.twig`, `templates/pages/page.twig`, `assets/js/**`, `assets/css/components/**`, `assets/css/sections/**`, `assets/css/base/**` (кроме `variables.css`), `config/settings.php`, `tools/scaffold/**`, `tests/**` | Селективный checkout / edit |
| **Контент (НЕ тянуть)** | `data/json/**`, `data/img/**`, `config/project.php`, `assets/css/base/variables.css` (цвета бренда), `templates/components/analytics*.twig` (ID метрики), `data/img/favicons/**` | Игнорировать |
| **Документация** | `docs/**`, `CLAUDE.md`, `README.md` | Оценивать по ситуации |

## Принципы

1. **Эталон = qbsm/kumho-tires.ru** — все платформенные улучшения в конечном счёте попадают сюда
2. **Deployment'ы не мержатся друг в друга** — только через эталон
3. **Контент никогда не пересекает границы** — JSON, изображения, цвета бренда, аналитика остаются в своём deployment'е
4. **Ветка `platform` в форке** — мост для PR в эталон, содержит историю orch/main
5. **`platform-clean`** — временная ветка для чистых PR (без контентной специфики)
6. **Коммиты от имени разработчика** — без автоматических Co-Authored-By
