## Защита эндпоинта /admin/requests

Эндпоинт используется для просмотра сохранённых JSON-заявок. Доступ должен быть ограничён.

### Возможности защиты

- Basic Auth (включение и учётные данные)
- Белый список IP (allowlist)
- Ограничение размера просматриваемого файла

Все параметры настраиваются через конфиг (`settings.admin.*`) или переменные окружения.

### Настройка через ENV

Пример `.htaccess`/конфигурации окружения:

```
SetEnv APP_ADMIN_BAUTH_ENABLED 1
SetEnv APP_ADMIN_BAUTH_USER admin
SetEnv APP_ADMIN_BAUTH_PASS secret
SetEnv APP_ADMIN_ALLOW_IPS "127.0.0.1, 192.168.0.2"
SetEnv APP_ADMIN_MAX_FILE_SIZE 1048576
```

### Детали реализации

> **Примечание:** Класс `App\Http\Routing\ApiRouter` упомянут в первоначальном проектировании. В текущей архитектуре (Slim 4) проверки безопасности реализуются через PSR-15 Middleware и Action-классы в `src/Action/` и `src/Middleware/`. При реализации эндпоинта `/admin/requests` следует использовать отдельный Action + middleware для Basic Auth и IP-фильтрации.

- Basic Auth: проверка через middleware или непосредственно в Action
- IP Allowlist: `isIpAllowed()` с поддержкой списка из ENV
- Логирование обращений: `logs/admin.log` (`ok`/`unauthorized_basic_auth`/`forbidden_ip`)
- Ограничение размера файла — в Action-классе (метод `getMaxFileSize()`).

### Логи

- `logs/admin.log` — JSON строки вида:

```json
{"time":"2025-08-08T10:00:00+03:00","url":"/admin/requests?file=request-123.json","ip":"127.0.0.1","ua":"Mozilla/5.0","status":"ok"}
```

### Рекомендации

- Держать эндпоинт закрытым (Basic Auth включён, IP-фильтр задан).
- Для продакшена использовать сложные пароли и ограничивать IP.
