# Архитектура репозиториев и Workflow синхронизации

> **Дата создания:** 10 марта 2026
> **Актуальность:** поддерживается при изменениях в структуре remote'ов или workflow

---

## Репозитории проекта

| Репозиторий | Роль | Ветки |
|---|---|---|
| **itsokismart/orch** | Deployment Ритейл Логистик | `main` |
| **qbsm/kumho-tires.ru** | Оригинальный проект Kumho (эталон платформы) | `master` (контент Kumho), `platform` (ядро платформы) |
| **itsokismart/kumho-tires.ru** | Форк Kumho (мост между deployment'ами и эталоном) | `master` (контент Kumho), `platform` (платформа из orch), `platform-clean` (временная для PR) |

## Схема взаимодействия

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  qbsm/kumho-tires.ru        │        │  itsokismart/orch            │
│  (эталон платформы + Kumho)  │        │  (Ритейл Логистик)           │
│                              │        │                              │
│  master   = контент Kumho    │        │  main = контент РЛ           │
│  platform = ядро платформы   │        │                              │
└──────────┬───────────────────┘        └──────────┬───────────────────┘
           │                                       │
           │  ◄──── PR: platform-clean ◄────────── │ git push itsok main:platform
           │        (только ядро)                   │
           │                                       │
           │  ── fetch qbsm platform ──────────► │
           │     + селективный checkout             │
           │     (только платформенные файлы)       │
           │                                       │
     ┌─────┴──────────────────────────┐            │
     │  itsokismart/kumho-tires.ru    │            │
     │  (форк, мост для PR)           │            │
     │                                │            │
     │  master         ◄── sync qbsm  │            │
     │  platform       ◄── из orch  ──┼────────────┘
     │  platform-clean ◄── временная  │
     └────────────────────────────────┘

Коллега работает в qbsm:
  - Контент Kumho    → коммит в master
  - Ядро платформы   → коммит в platform

Разработчик РЛ работает в orch:
  - Всё в main (deployment)
  - Платформенные изменения → push в itsok:platform → PR в qbsm:platform
```

## Remote'ы (настройка в локальном репо)

```bash
# Актуальные remote'ы
origin  → itsokismart/orch.git           # Deployment РЛ           ← main
itsok   → itsokismart/kumho-tires.ru.git # Форк Kumho              ← master, platform, platform-clean
qbsm    → qbsm/kumho-tires.ru.git       # Эталон Kumho            ← master, platform
```

## Потоки данных

### Поток 1: Deployment → Эталон (платформенные улучшения)

Когда в deployment'е (orch) сделаны платформенные улучшения, которые полезны всем проектам.

```bash
# 1. Работа в orch/main — разработка
# 2. Push платформенных изменений в форк
git push itsok main:platform

# 3. Если platform содержит контентную специфику — создать чистую ветку:
git checkout -b platform-clean qbsm/platform
git checkout main -- path/to/platform/file.ext
git commit -m "feat: описание платформенного улучшения"
git push itsok platform-clean:platform-clean

# 4. Создать PR на GitHub: itsokismart/kumho-tires.ru:platform-clean → qbsm/kumho-tires.ru:platform
# 5. Ревью и merge PR
# 6. Удалить временную ветку
git branch -d platform-clean
```

### Поток 1b: Коллега в эталоне (платформенные улучшения из Kumho)

Когда коллега делает платформенные улучшения напрямую в qbsm.

```bash
# Коллега работает в qbsm/kumho-tires.ru:
git checkout platform
# редактирует src/, templates/, assets/js/, assets/css/components/
git commit -m "feat: описание платформенного улучшения"
git push origin platform
```

### Поток 2: Эталон → Deployment (обратная синхронизация)

Когда в эталоне (qbsm) появились платформенные изменения от коллеги или из другого deployment'а.

```bash
# 1. Скачать изменения из ветки platform эталона (read-only, ничего не меняет)
git fetch qbsm platform

# 2. Посмотреть что нового
git log main..qbsm/platform --oneline
git diff main..qbsm/platform --stat

# 3. Убедиться что это только платформенные файлы
git diff main..qbsm/platform -- src/ templates/ assets/css/ assets/js/ config/settings.php

# 4. Применить изменения
git checkout qbsm/platform -- path/to/platform/file.ext
# или точечные правки вручную

# 5. Коммит и push
git add <файлы>
git commit -m "fix: платформенные улучшения из qbsm/platform"
git push origin main
```

> **Примечание:** если ветка `platform` в qbsm ещё не создана, используйте `qbsm/master` и ручную фильтрацию (как описано в разделе «Правила фильтрации»).

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
2. **Две ветки в каждом репо**: `master` (контент проекта) и `platform` (ядро платформы)
3. **Deployment'ы не мержатся друг в друга** — только через эталон
4. **Контент никогда не пересекает границы** — JSON, изображения, цвета бренда, аналитика остаются в своём deployment'е
5. **Ветка `platform` в форке** — мост для PR в эталон
6. **`platform-clean`** — временная ветка для чистых PR (без контентной специфики deployment'а)
7. **Коммиты от имени разработчика** — без автоматических Co-Authored-By

## Связанные документы

- **[CONTRIBUTING-PLATFORM.md](CONTRIBUTING-PLATFORM.md)** — руководство для разработчиков и AI-ассистентов по классификации файлов и правилам коммитов
