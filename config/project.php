<?php

// Проектная конфигурация — специфичная для текущего заказчика / deployment'а.
// Для нового заказчика: скопировать project.php.dist -> project.php и адаптировать.

return [
    // slug в URL => page_id (файл data/json/{lang}/pages/{page_id}.json)
    'route_map' => [
        'demo-tools' => 'demo-tools',
    ],

    // Параметризация коллекций: каждая коллекция описывается полностью через конфиг.
    // Добавление/удаление коллекции — только здесь, 0 правок PHP.
    'collections' => [],

    // page_id страниц для sitemap.xml (без 404)
    'sitemap_pages' => [
        'index',
        'contacts',
        'demo-tools',
        'policy',
        'agree',
    ],

    // Внешние интеграции (флаги включения)
    'integrations' => [
        'photoroom' => ['enabled' => true],
    ],
];
