# Источник данных приложения «ToolShop»

## Состав папки

| Файл | Назначение |
| --- | --- |
| `BIVT-24-1_Ulagashev_AV_24.sql` | Полный скрипт создания схемы: типы, таблицы, ограничения, индексы, представления, функции, хранимые процедуры, триггеры и начальное заполнение |
| `BIVT-24-1_Ulagashev_AV_24_backup.sql` | Резервная копия базы данных, снятая утилитой `pg_dump` после выполнения основного скрипта |

## Развёртывание

```
psql -d postgres -f BIVT-24-1_Ulagashev_AV_24.sql
```

Восстановление из резервной копии:

```
createdb toolshop
psql -d toolshop -f BIVT-24-1_Ulagashev_AV_24_backup.sql
```

Скрипт проверен на PostgreSQL 16.

## Соотношение схемы и работающего приложения

Согласно техническому заданию, данные приложения хранятся в оперативной
памяти и не сохраняются между перезапусками. Поэтому серверная часть
работает с классом `InMemoryDatabase`, а не с СУБД.

Приведённая схема описывает ту же предметную область средствами реляционной
модели: каждому репозиторию источника данных соответствует таблица, а
ограничениям, проверяемым в сервисах, — ограничения целостности, триггеры и
хранимые процедуры. Такое соответствие позволяет перевести приложение на
PostgreSQL без изменения контроллеров: достаточно заменить реализацию
репозиториев.

| Репозиторий `InMemoryDatabase` | Таблица | Проверки в сервисе | Объект БД |
| --- | --- | --- | --- |
| `users` | `users` | уникальность почты, защита последнего администратора | `uq_users_email`, `tr_users_protect_last_admin`, `tr_users_normalize_email` |
| `categories` | `categories` | уникальность символьного кода | `uq_categories_slug` |
| `products` | `products` | уникальность артикула, контроль остатка | `uq_products_sku`, `ck_products_stock` |
| `orders` + позиции | `orders`, `order_items` | расчёт суммы, схема статусов | `tr_order_items_total`, `fn_status_transition_allowed`, `sp_change_order_status` |
| `reviews` | `reviews` | один отзыв на товар от пользователя | `uq_reviews_author` |

## Объекты базы данных

**Представления (3):** `v_catalog`, `v_order_summary`, `v_sales_by_category`.

**Функции (4):** `fn_product_rating`, `fn_next_order_number`,
`fn_status_transition_allowed`, `fn_customer_totals`.

**Хранимые процедуры (3):** `sp_place_order`, `sp_change_order_status`,
`sp_remove_product`.

**Триггеры (6):** `tr_users_updated_at`, `tr_products_updated_at`,
`tr_orders_updated_at`, `tr_order_items_total`, `tr_users_normalize_email`,
`tr_users_protect_last_admin`.
