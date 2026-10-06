-- ============================================================================
-- Интернет-магазин инструментов «ToolShop»
-- Схема базы данных PostgreSQL 16
--
-- Курсовая работа по дисциплине «Клиент-серверное программирование»
-- Вариант 24. Улагашев А. В., группа БИВТ-24-1
--
-- Скрипт создаёт схему целиком: таблицы, ограничения, индексы,
-- представления, функции, хранимые процедуры, триггеры и начальные данные.
-- Запуск:  psql -U postgres -f BIVT-24-1_Ulagashev_AV_24.sql
--
-- Примечание. Рабочая версия приложения хранит данные в оперативной памяти
-- (требование технического задания). Настоящая схема описывает структуру
-- источника данных в терминах реляционной модели и используется как
-- проектная документация и как основа для перевода приложения на СУБД.
-- ============================================================================

DROP DATABASE IF EXISTS toolshop;
CREATE DATABASE toolshop WITH ENCODING 'UTF8' LC_COLLATE 'ru_RU.UTF-8' LC_CTYPE 'ru_RU.UTF-8' TEMPLATE template0;

\connect toolshop

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Перечислимые типы
-- ----------------------------------------------------------------------------

-- Категории (роли) пользователей приложения
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'customer');

-- Статусы жизненного цикла заказа
CREATE TYPE order_status AS ENUM ('new', 'processing', 'shipped', 'completed', 'cancelled');

-- ----------------------------------------------------------------------------
-- 2. Таблицы
-- ----------------------------------------------------------------------------

-- Пользователи системы
CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          varchar(100) NOT NULL,
    email         varchar(120) NOT NULL,
    age           smallint,
    role          user_role    NOT NULL DEFAULT 'customer',
    password_hash varchar(72),
    is_active     boolean      NOT NULL DEFAULT true,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_email      UNIQUE (email),
    CONSTRAINT ck_users_name       CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
    CONSTRAINT ck_users_email      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT ck_users_age        CHECK (age IS NULL OR age BETWEEN 14 AND 120)
);

COMMENT ON TABLE  users      IS 'Пользователи приложения: администраторы, менеджеры и покупатели';
COMMENT ON COLUMN users.age  IS 'Возраст указывается по желанию, остальные поля обязательны';

-- Категории каталога
CREATE TABLE categories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(60)  NOT NULL,
    slug        varchar(40)  NOT NULL,
    description varchar(300) NOT NULL DEFAULT '',
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT uq_categories_slug UNIQUE (slug),
    CONSTRAINT uq_categories_name UNIQUE (name),
    CONSTRAINT ck_categories_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

COMMENT ON TABLE categories IS 'Справочник категорий инструмента';

-- Товары каталога
CREATE TABLE products (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(120)  NOT NULL,
    sku         varchar(8)    NOT NULL,
    description varchar(1000) NOT NULL DEFAULT '',
    price       numeric(10, 2) NOT NULL,
    stock       integer       NOT NULL DEFAULT 0,
    brand       varchar(40)   NOT NULL,
    category_id uuid          NOT NULL,
    image       varchar(40)   NOT NULL DEFAULT '',
    is_archived boolean       NOT NULL DEFAULT false,
    created_at  timestamptz   NOT NULL DEFAULT now(),
    updated_at  timestamptz   NOT NULL DEFAULT now(),

    CONSTRAINT uq_products_sku      UNIQUE (sku),
    CONSTRAINT ck_products_sku      CHECK (sku ~ '^[A-Z]{3}-[0-9]{4}$'),
    CONSTRAINT ck_products_price    CHECK (price >= 1 AND price <= 1000000),
    CONSTRAINT ck_products_stock    CHECK (stock >= 0 AND stock <= 10000),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id)
        REFERENCES categories (id) ON UPDATE CASCADE ON DELETE RESTRICT
);

COMMENT ON TABLE  products        IS 'Номенклатура интернет-магазина';
COMMENT ON COLUMN products.is_archived IS 'Товар снят с продажи, но сохранён ради истории заказов';
COMMENT ON COLUMN products.image       IS 'Имя файла фотографии товара; пустая строка — фотографии нет';

-- Заказы покупателей
CREATE TABLE orders (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    number      varchar(12)  NOT NULL,
    customer_id uuid         NOT NULL,
    status      order_status NOT NULL DEFAULT 'new',
    total       numeric(12, 2) NOT NULL DEFAULT 0,
    address     varchar(200) NOT NULL,
    phone       varchar(20)  NOT NULL,
    comment     varchar(300),
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT uq_orders_number    UNIQUE (number),
    CONSTRAINT ck_orders_number    CHECK (number ~ '^TS-[0-9]{6}$'),
    CONSTRAINT ck_orders_phone     CHECK (phone ~ '^\+7 \([0-9]{3}\) [0-9]{3}-[0-9]{2}-[0-9]{2}$'),
    CONSTRAINT ck_orders_total     CHECK (total >= 0),
    CONSTRAINT fk_orders_customer  FOREIGN KEY (customer_id)
        REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT
);

COMMENT ON TABLE orders IS 'Заказы, оформленные покупателями';

-- Позиции заказа
CREATE TABLE order_items (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     uuid           NOT NULL,
    product_id   uuid           NOT NULL,
    product_name varchar(120)   NOT NULL,
    price        numeric(10, 2) NOT NULL,
    quantity     integer        NOT NULL,
    sum          numeric(12, 2) GENERATED ALWAYS AS (price * quantity) STORED,

    CONSTRAINT uq_order_items       UNIQUE (order_id, product_id),
    CONSTRAINT ck_order_items_qty   CHECK (quantity BETWEEN 1 AND 100),
    CONSTRAINT ck_order_items_price CHECK (price >= 0),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
        REFERENCES orders (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON UPDATE CASCADE ON DELETE RESTRICT
);

COMMENT ON TABLE  order_items            IS 'Состав заказа';
COMMENT ON COLUMN order_items.product_name IS 'Наименование на момент покупки: карточка товара может измениться позже';
COMMENT ON COLUMN order_items.sum        IS 'Вычисляемый столбец: цена, умноженная на количество';

-- Отзывы покупателей о товарах
CREATE TABLE reviews (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  uuid         NOT NULL,
    author_id   uuid         NOT NULL,
    rating      smallint     NOT NULL,
    text        varchar(500) NOT NULL,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT uq_reviews_author    UNIQUE (product_id, author_id),
    CONSTRAINT ck_reviews_rating    CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT ck_reviews_text      CHECK (char_length(btrim(text)) BETWEEN 10 AND 500),
    CONSTRAINT fk_reviews_product   FOREIGN KEY (product_id)
        REFERENCES products (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_reviews_author    FOREIGN KEY (author_id)
        REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
);

COMMENT ON TABLE reviews IS 'Отзывы покупателей; на один товар покупатель оставляет не более одного отзыва';

-- ----------------------------------------------------------------------------
-- 3. Индексы для часто используемых условий отбора
-- ----------------------------------------------------------------------------

CREATE INDEX ix_products_category ON products (category_id);
CREATE INDEX ix_products_price    ON products (price);
CREATE INDEX ix_products_name     ON products (name);
CREATE INDEX ix_orders_customer   ON orders (customer_id);
CREATE INDEX ix_orders_status     ON orders (status);
CREATE INDEX ix_reviews_product   ON reviews (product_id);

-- ----------------------------------------------------------------------------
-- 4. Представления
-- ----------------------------------------------------------------------------

-- 4.1. Каталог товаров с категорией и агрегатами по отзывам
CREATE VIEW v_catalog AS
SELECT p.id,
       p.name,
       p.sku,
       p.price,
       p.stock,
       p.brand,
       p.image,
       c.name                                   AS category_name,
       c.slug                                   AS category_slug,
       COALESCE(ROUND(AVG(r.rating), 1), 0)     AS rating,
       COUNT(r.id)                              AS reviews_count
FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN reviews r ON r.product_id = p.id
WHERE p.is_archived = false
GROUP BY p.id, c.name, c.slug;

COMMENT ON VIEW v_catalog IS 'Витрина каталога для клиентской части';

-- 4.2. Заказы со сводкой по составу
CREATE VIEW v_order_summary AS
SELECT o.id,
       o.number,
       o.status,
       o.created_at,
       u.name                         AS customer_name,
       u.email                        AS customer_email,
       COUNT(oi.id)                   AS positions,
       COALESCE(SUM(oi.quantity), 0)  AS units,
       o.total
FROM orders o
         JOIN users u ON u.id = o.customer_id
         LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, u.name, u.email;

COMMENT ON VIEW v_order_summary IS 'Заказы с числом позиций и единиц товара — для панели управления';

-- 4.3. Продажи в разрезе категорий
CREATE VIEW v_sales_by_category AS
SELECT c.id                                   AS category_id,
       c.name                                 AS category_name,
       COUNT(DISTINCT o.id)                   AS orders_count,
       COALESCE(SUM(oi.quantity), 0)          AS units_sold,
       COALESCE(SUM(oi.sum), 0)               AS revenue
FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         LEFT JOIN order_items oi ON oi.product_id = p.id
         LEFT JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
GROUP BY c.id, c.name;

COMMENT ON VIEW v_sales_by_category IS 'Выручка и количество проданных единиц по категориям';

-- ----------------------------------------------------------------------------
-- 5. Функции
-- ----------------------------------------------------------------------------

-- 5.1. Средняя оценка товара
CREATE FUNCTION fn_product_rating(p_product_id uuid)
    RETURNS numeric
    LANGUAGE sql
    STABLE
AS $$
SELECT COALESCE(ROUND(AVG(rating), 1), 0)
FROM reviews
WHERE product_id = p_product_id;
$$;

COMMENT ON FUNCTION fn_product_rating IS 'Средняя оценка товара по пятибалльной шкале';

-- 5.2. Следующий номер заказа вида TS-000001
CREATE FUNCTION fn_next_order_number()
    RETURNS varchar
    LANGUAGE plpgsql
AS $$
DECLARE
    v_next integer;
BEGIN
    SELECT COALESCE(MAX(SUBSTRING(number FROM 4)::integer), 0) + 1 INTO v_next FROM orders;
    RETURN 'TS-' || LPAD(v_next::text, 6, '0');
END;
$$;

COMMENT ON FUNCTION fn_next_order_number IS 'Формирует следующий человекочитаемый номер заказа';

-- 5.3. Проверка допустимости перехода между статусами заказа
CREATE FUNCTION fn_status_transition_allowed(p_from order_status, p_to order_status)
    RETURNS boolean
    LANGUAGE sql
    IMMUTABLE
AS $$
SELECT CASE p_from
           WHEN 'new' THEN p_to IN ('processing', 'cancelled')
           WHEN 'processing' THEN p_to IN ('shipped', 'cancelled')
           WHEN 'shipped' THEN p_to = 'completed'
           ELSE false
           END;
$$;

COMMENT ON FUNCTION fn_status_transition_allowed IS 'Схема допустимых переходов статуса заказа';

-- 5.4. Итоги покупателя: количество заказов и сумма покупок
CREATE FUNCTION fn_customer_totals(p_customer_id uuid,
                                   OUT orders_count bigint,
                                   OUT total_spent numeric)
    LANGUAGE sql
    STABLE
AS $$
SELECT COUNT(*), COALESCE(SUM(total), 0)
FROM orders
WHERE customer_id = p_customer_id
  AND status <> 'cancelled';
$$;

COMMENT ON FUNCTION fn_customer_totals IS 'Число заказов и сумма покупок конкретного покупателя';

-- ----------------------------------------------------------------------------
-- 6. Хранимые процедуры
-- ----------------------------------------------------------------------------

-- 6.1. Оформление заказа с проверкой и списанием остатков
CREATE PROCEDURE sp_place_order(IN p_customer_id uuid,
                                IN p_address varchar,
                                IN p_phone varchar,
                                IN p_items jsonb,
                                INOUT p_order_id uuid DEFAULT NULL)
    LANGUAGE plpgsql
AS $$
DECLARE
    v_item    jsonb;
    v_product products%ROWTYPE;
    v_qty     integer;
BEGIN
    INSERT INTO orders (number, customer_id, address, phone)
    VALUES (fn_next_order_number(), p_customer_id, p_address, p_phone)
    RETURNING id INTO p_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_qty := (v_item ->> 'quantity')::integer;

            SELECT * INTO v_product FROM products
            WHERE id = (v_item ->> 'productId')::uuid FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Товар % не найден', v_item ->> 'productId';
            END IF;

            IF v_product.is_archived THEN
                RAISE EXCEPTION 'Товар «%» снят с продажи', v_product.name;
            END IF;

            IF v_product.stock < v_qty THEN
                RAISE EXCEPTION 'Недостаточно товара «%»: доступно % шт.', v_product.name, v_product.stock;
            END IF;

            INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
            VALUES (p_order_id, v_product.id, v_product.name, v_product.price, v_qty);

            UPDATE products SET stock = stock - v_qty, updated_at = now() WHERE id = v_product.id;
        END LOOP;
END;
$$;

COMMENT ON PROCEDURE sp_place_order IS 'Оформляет заказ, проверяя и списывая остатки на складе';

-- 6.2. Смена статуса заказа с возвратом остатков при отмене
CREATE PROCEDURE sp_change_order_status(IN p_order_id uuid, IN p_status order_status)
    LANGUAGE plpgsql
AS $$
DECLARE
    v_current order_status;
BEGIN
    SELECT status INTO v_current FROM orders WHERE id = p_order_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Заказ % не найден', p_order_id;
    END IF;

    IF v_current = p_status THEN
        RETURN;
    END IF;

    IF NOT fn_status_transition_allowed(v_current, p_status) THEN
        RAISE EXCEPTION 'Недопустимый переход статуса: «%» -> «%»', v_current, p_status;
    END IF;

    IF p_status = 'cancelled' THEN
        UPDATE products p
        SET stock = p.stock + oi.quantity, updated_at = now()
        FROM order_items oi
        WHERE oi.order_id = p_order_id AND p.id = oi.product_id;
    END IF;

    UPDATE orders SET status = p_status, updated_at = now() WHERE id = p_order_id;
END;
$$;

COMMENT ON PROCEDURE sp_change_order_status IS 'Переводит заказ в новый статус по схеме допустимых переходов';

-- 6.3. Удаление товара: архивирование, если товар встречается в заказах
CREATE PROCEDURE sp_remove_product(IN p_product_id uuid, INOUT p_archived boolean DEFAULT false)
    LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM order_items WHERE product_id = p_product_id) THEN
        UPDATE products SET is_archived = true, updated_at = now() WHERE id = p_product_id;
        p_archived := true;
    ELSE
        DELETE FROM products WHERE id = p_product_id;
        p_archived := false;
    END IF;
END;
$$;

COMMENT ON PROCEDURE sp_remove_product IS 'Удаляет товар либо переводит его в архив ради сохранения истории продаж';

-- ----------------------------------------------------------------------------
-- 7. Триггеры
-- ----------------------------------------------------------------------------

-- 7.1. Автоматическое обновление отметки времени изменения записи
CREATE FUNCTION trg_set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER tr_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER tr_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 7.2. Пересчёт итоговой суммы заказа при изменении его состава
CREATE FUNCTION trg_recalculate_order_total()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
DECLARE
    v_order_id uuid := COALESCE(NEW.order_id, OLD.order_id);
BEGIN
    UPDATE orders
    SET total = (SELECT COALESCE(SUM(sum), 0) FROM order_items WHERE order_id = v_order_id)
    WHERE id = v_order_id;

    RETURN NULL;
END;
$$;

CREATE TRIGGER tr_order_items_total
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION trg_recalculate_order_total();

-- 7.3. Приведение адреса электронной почты к строчному виду
CREATE FUNCTION trg_normalize_email()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    NEW.email := lower(btrim(NEW.email));
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_users_normalize_email
    BEFORE INSERT OR UPDATE OF email ON users
    FOR EACH ROW EXECUTE FUNCTION trg_normalize_email();

-- 7.4. Запрет на удаление последнего администратора
CREATE FUNCTION trg_protect_last_admin()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.role = 'admin' AND (SELECT COUNT(*) FROM users WHERE role = 'admin') = 1 THEN
        RAISE EXCEPTION 'В системе должен остаться хотя бы один администратор';
    END IF;

    RETURN OLD;
END;
$$;

CREATE TRIGGER tr_users_protect_last_admin
    BEFORE DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION trg_protect_last_admin();

-- ----------------------------------------------------------------------------
-- 8. Начальное заполнение
-- ----------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, description) VALUES
('11111111-1111-4111-8111-000000000001', 'Электроинструмент',        'power-tools',     'Дрели, шуруповёрты, шлифовальные машины и лобзики'),
('11111111-1111-4111-8111-000000000002', 'Ручной инструмент',        'hand-tools',      'Ключи, молотки, отвёртки и клещи'),
('11111111-1111-4111-8111-000000000003', 'Измерительный инструмент', 'measuring-tools', 'Рулетки, уровни и лазерные дальномеры'),
('11111111-1111-4111-8111-000000000004', 'Садовый инструмент',       'garden-tools',    'Триммеры, пилы и техника для участка'),
('11111111-1111-4111-8111-000000000005', 'Расходные материалы',      'consumables',     'Свёрла, диски, биты и прочая оснастка');

INSERT INTO users (id, name, email, age, role, password_hash) VALUES
('22222222-2222-4222-8222-000000000001', 'Улагашев Айман Владимирович', 'admin@toolshop.ru',   20, 'admin',    crypt('admin12345',    gen_salt('bf', 8))),
('22222222-2222-4222-8222-000000000002', 'Соколова Мария Андреевна',    'manager@toolshop.ru', 31, 'manager',  crypt('manager12345',  gen_salt('bf', 8))),
('22222222-2222-4222-8222-000000000003', 'Ковалёв Сергей Петрович',     'kovalev@example.com', 42, 'customer', crypt('customer12345', gen_salt('bf', 8))),
('22222222-2222-4222-8222-000000000004', 'Жукова Анна Ивановна',        'zhukova@example.com', NULL, 'customer', crypt('customer12345', gen_salt('bf', 8)));

INSERT INTO products (id, name, sku, description, price, stock, brand, category_id, image) VALUES
('33333333-3333-4333-8333-000000000001', 'Перфоратор SDS-Plus 850 Вт',                    'PWR-0850', 'Сетевой перфоратор с патроном SDS-Plus, энергия удара 2,8 Дж, три режима работы, кейс в комплекте.', 8490,  14, 'Makita',    '11111111-1111-4111-8111-000000000001', 'perforator.jpg'),
('33333333-3333-4333-8333-000000000002', 'Углошлифовальная машина 125 мм',                'PWR-0125', 'УШМ мощностью 1100 Вт, регулировка оборотов, плавный пуск, защита от непроизвольного включения.',    5290,  21, 'Makita',    '11111111-1111-4111-8111-000000000001', ''),
('33333333-3333-4333-8333-000000000003', 'Аккумуляторный шуруповёрт 18 В',                'PWR-1802', 'Два аккумулятора 2,0 А·ч, крутящий момент 45 Н·м, 20 ступеней регулировки.',                        6990,   9, 'Makita',    '11111111-1111-4111-8111-000000000001', 'screwdriver.jpg'),
('33333333-3333-4333-8333-000000000004', 'Электролобзик 750 Вт',                          'PWR-0750', 'Маятниковый ход, четыре ступени, пропил дерева до 80 мм, патрубок для пылесоса.',                   4150,  12, 'Bosch',     '11111111-1111-4111-8111-000000000001', ''),
('33333333-3333-4333-8333-000000000005', 'Набор головок и ключей, 46 предметов',          'HND-0012', 'Торцевые головки 4–32 мм, комбинированные ключи 8–22 мм, две трещотки и удлинители.',               2390,  30, 'Зубр',      '11111111-1111-4111-8111-000000000002', 'wrench-set.jpg'),
('33333333-3333-4333-8333-000000000006', 'Молоток слесарный 600 г',                       'HND-0600', 'Кованая головка, фибергласовая рукоять с противоскользящим покрытием.',                              790,  45, 'Stanley',   '11111111-1111-4111-8111-000000000002', ''),
('33333333-3333-4333-8333-000000000007', 'Набор шарнирно-губцевого инструмента, 3 предмета', 'HND-0180', 'Пассатижи, бокорезы и длинногубцы из хром-ванадиевой стали, двухкомпонентные рукояти.', 640, 38, 'Bosch',  '11111111-1111-4111-8111-000000000002', 'pliers.jpg'),
('33333333-3333-4333-8333-000000000008', 'Рулетка измерительная 5 м',                     'MSR-0005', 'Автостоп, магнитный зацеп, класс точности II, обрезиненный корпус.',                                 420,  52, 'Зубр',      '11111111-1111-4111-8111-000000000003', ''),
('33333333-3333-4333-8333-000000000009', 'Уровень строительный 800 мм',                   'MSR-0800', 'Алюминиевый профиль, три глазка, точность 0,5 мм/м.',                                               1180,  17, 'Kapro',     '11111111-1111-4111-8111-000000000003', ''),
('33333333-3333-4333-8333-000000000010', 'Лазерный дальномер 40 м',                       'MSR-0040', 'Погрешность ±2 мм, расчёт площади и объёма, память на 20 измерений.',                               3950,   6, 'Bosch',     '11111111-1111-4111-8111-000000000003', ''),
('33333333-3333-4333-8333-000000000011', 'Триммер электрический 1200 Вт',                 'GRD-1200', 'Разъёмная штанга, ширина скашивания 350 мм, леска и нож в комплекте.',                              5490,   8, 'Huter',     '11111111-1111-4111-8111-000000000004', ''),
('33333333-3333-4333-8333-000000000012', 'Пила садовая складная 210 мм',                  'GRD-0210', 'Закалённый зуб, японская заточка, фиксатор полотна в двух положениях.',                              890,  24, 'Fiskars',   '11111111-1111-4111-8111-000000000004', ''),
('33333333-3333-4333-8333-000000000013', 'Набор свёрл по металлу, 19 предметов',          'CNS-0019', 'Диаметр 1–10 мм, сталь HSS-Co, шлифованная поверхность, металлический кейс.',                       1690,  27, 'Ruko',      '11111111-1111-4111-8111-000000000005', ''),
('33333333-3333-4333-8333-000000000014', 'Диск отрезной по металлу 125×1,2 мм, 10 шт.',   'CNS-0125', 'Армированный круг для УШМ, посадочный диаметр 22,2 мм, ресурс до 60 резов.',                         560,  64, 'Луга',      '11111111-1111-4111-8111-000000000005', ''),
('33333333-3333-4333-8333-000000000015', 'Набор инструментов в кейсе, 142 предмета',     'HND-0142', 'Головки, ключи, отвёртки, биты и трещотки в пластиковом кейсе с ложементом.',                      18900,  5, 'JTC',        '11111111-1111-4111-8111-000000000002', 'tool-case.jpg'),
('33333333-3333-4333-8333-000000000016', 'Ножницы раскройные 250 мм',                    'HND-0250', 'Для ткани, кожи и обивочных материалов, кованые лезвия, латунный винт.',                           1450, 15, 'Jack',       '11111111-1111-4111-8111-000000000002', 'scissors.jpg'),
('33333333-3333-4333-8333-000000000017', 'Набор шестигранных ключей, 9 предметов',      'HND-0009', 'Удлинённые Г-образные ключи 1,5–10 мм со сферическим концом, держатель в комплекте.',              690,  33, 'Bing Jiang', '11111111-1111-4111-8111-000000000002', 'hex-keys.jpg'),
('33333333-3333-4333-8333-000000000018', 'Набор ручного инструмента для дома, 8 предметов', 'HND-0008', 'Молоток, отвёртки, пассатижи, бокорезы, ножовка, стамеска и рубанок.',                       4290, 11, 'Kraftool',   '11111111-1111-4111-8111-000000000002', 'hand-tools.jpg');

-- Заказы. Итоговая сумма рассчитывается триггером tr_order_items_total
INSERT INTO orders (id, number, customer_id, status, address, phone, comment) VALUES
('44444444-4444-4444-8444-000000000001', 'TS-000001', '22222222-2222-4222-8222-000000000003', 'completed',  'г. Москва, ул. Воронцовская, д. 6а, стр. 1', '+7 (916) 100-20-30', 'Просьба позвонить за час до доставки'),
('44444444-4444-4444-8444-000000000002', 'TS-000002', '22222222-2222-4222-8222-000000000004', 'processing', 'Московская обл., г. Химки, ул. Лавочкина, д. 14', '+7 (925) 771-04-19', NULL),
('44444444-4444-4444-8444-000000000003', 'TS-000003', '22222222-2222-4222-8222-000000000003', 'new',        'г. Москва, ул. Воронцовская, д. 6а, стр. 1', '+7 (916) 100-20-30', NULL);

INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES
('44444444-4444-4444-8444-000000000001', '33333333-3333-4333-8333-000000000001', 'Перфоратор SDS-Plus 850 Вт',                 8490, 1),
('44444444-4444-4444-8444-000000000001', '33333333-3333-4333-8333-000000000013', 'Набор свёрл по металлу, 19 предметов',       1690, 2),
('44444444-4444-4444-8444-000000000002', '33333333-3333-4333-8333-000000000011', 'Триммер электрический 1200 Вт',              5490, 1),
('44444444-4444-4444-8444-000000000003', '33333333-3333-4333-8333-000000000005', 'Набор головок и ключей, 46 предметов', 2390, 1),
('44444444-4444-4444-8444-000000000003', '33333333-3333-4333-8333-000000000008', 'Рулетка измерительная 5 м',                   420, 3);

INSERT INTO reviews (product_id, author_id, rating, text) VALUES
('33333333-3333-4333-8333-000000000001', '22222222-2222-4222-8222-000000000003', 5, 'Бетон берёт уверенно, вибрация умеренная. За свои деньги отличный инструмент.'),
('33333333-3333-4333-8333-000000000001', '22222222-2222-4222-8222-000000000004', 4, 'Тяжеловат для длительной работы, но со своей задачей справляется.'),
('33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000003', 5, 'Два аккумулятора в комплекте — работать можно весь день без перерыва.'),
('33333333-3333-4333-8333-000000000011', '22222222-2222-4222-8222-000000000004', 3, 'Скашивает ровно, но провод короткий, нужен удлинитель.'),
('33333333-3333-4333-8333-000000000010', '22222222-2222-4222-8222-000000000003', 5, 'Замеры совпадают с рулеткой до миллиметра, экономит массу времени.');

-- ----------------------------------------------------------------------------
-- 9. Контрольные запросы
-- ----------------------------------------------------------------------------

-- Каталог с оценками покупателей
-- SELECT name, category_name, price, rating, reviews_count FROM v_catalog ORDER BY rating DESC;

-- Сводка по заказам
-- SELECT number, customer_name, positions, units, total, status FROM v_order_summary ORDER BY created_at;

-- Продажи по категориям
-- SELECT category_name, units_sold, revenue FROM v_sales_by_category ORDER BY revenue DESC;

-- Оформление заказа хранимой процедурой
-- CALL sp_place_order('22222222-2222-4222-8222-000000000003',
--                     'г. Москва, ул. Воронцовская, д. 6а, стр. 1',
--                     '+7 (916) 100-20-30',
--                     '[{"productId": "33333333-3333-4333-8333-000000000002", "quantity": 2}]'::jsonb);

-- Смена статуса заказа
-- CALL sp_change_order_status('44444444-4444-4444-8444-000000000003', 'processing');

-- Итоги покупателя
-- SELECT * FROM fn_customer_totals('22222222-2222-4222-8222-000000000003');
