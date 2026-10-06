--
-- PostgreSQL database dump
--

\restrict ieCQFa8KO6l2JwoBoKCHtbgC31LRiLnhFtEC6tzSGQRZ0j4Xt8BIkUt90yFYtQN

-- Dumped from database version 16.14 (Homebrew)
-- Dumped by pg_dump version 16.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'new',
    'processing',
    'shipped',
    'completed',
    'cancelled'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'manager',
    'customer'
);


--
-- Name: fn_customer_totals(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_customer_totals(p_customer_id uuid, OUT orders_count bigint, OUT total_spent numeric) RETURNS record
    LANGUAGE sql STABLE
    AS $$
SELECT COUNT(*), COALESCE(SUM(total), 0)
FROM orders
WHERE customer_id = p_customer_id
  AND status <> 'cancelled';
$$;


--
-- Name: FUNCTION fn_customer_totals(p_customer_id uuid, OUT orders_count bigint, OUT total_spent numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_customer_totals(p_customer_id uuid, OUT orders_count bigint, OUT total_spent numeric) IS 'Число заказов и сумма покупок конкретного покупателя';


--
-- Name: fn_next_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_next_order_number() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_next integer;
BEGIN
    SELECT COALESCE(MAX(SUBSTRING(number FROM 4)::integer), 0) + 1 INTO v_next FROM orders;
    RETURN 'TS-' || LPAD(v_next::text, 6, '0');
END;
$$;


--
-- Name: FUNCTION fn_next_order_number(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_next_order_number() IS 'Формирует следующий человекочитаемый номер заказа';


--
-- Name: fn_product_rating(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_product_rating(p_product_id uuid) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
SELECT COALESCE(ROUND(AVG(rating), 1), 0)
FROM reviews
WHERE product_id = p_product_id;
$$;


--
-- Name: FUNCTION fn_product_rating(p_product_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_product_rating(p_product_id uuid) IS 'Средняя оценка товара по пятибалльной шкале';


--
-- Name: fn_status_transition_allowed(public.order_status, public.order_status); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_status_transition_allowed(p_from public.order_status, p_to public.order_status) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE p_from
           WHEN 'new' THEN p_to IN ('processing', 'cancelled')
           WHEN 'processing' THEN p_to IN ('shipped', 'cancelled')
           WHEN 'shipped' THEN p_to = 'completed'
           ELSE false
           END;
$$;


--
-- Name: FUNCTION fn_status_transition_allowed(p_from public.order_status, p_to public.order_status); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fn_status_transition_allowed(p_from public.order_status, p_to public.order_status) IS 'Схема допустимых переходов статуса заказа';


--
-- Name: sp_change_order_status(uuid, public.order_status); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_change_order_status(IN p_order_id uuid, IN p_status public.order_status)
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


--
-- Name: PROCEDURE sp_change_order_status(IN p_order_id uuid, IN p_status public.order_status); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON PROCEDURE public.sp_change_order_status(IN p_order_id uuid, IN p_status public.order_status) IS 'Переводит заказ в новый статус по схеме допустимых переходов';


--
-- Name: sp_place_order(uuid, character varying, character varying, jsonb, uuid); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_place_order(IN p_customer_id uuid, IN p_address character varying, IN p_phone character varying, IN p_items jsonb, INOUT p_order_id uuid DEFAULT NULL::uuid)
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


--
-- Name: PROCEDURE sp_place_order(IN p_customer_id uuid, IN p_address character varying, IN p_phone character varying, IN p_items jsonb, INOUT p_order_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON PROCEDURE public.sp_place_order(IN p_customer_id uuid, IN p_address character varying, IN p_phone character varying, IN p_items jsonb, INOUT p_order_id uuid) IS 'Оформляет заказ, проверяя и списывая остатки на складе';


--
-- Name: sp_remove_product(uuid, boolean); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_remove_product(IN p_product_id uuid, INOUT p_archived boolean DEFAULT false)
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


--
-- Name: PROCEDURE sp_remove_product(IN p_product_id uuid, INOUT p_archived boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON PROCEDURE public.sp_remove_product(IN p_product_id uuid, INOUT p_archived boolean) IS 'Удаляет товар либо переводит его в архив ради сохранения истории продаж';


--
-- Name: trg_normalize_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_normalize_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.email := lower(btrim(NEW.email));
    RETURN NEW;
END;
$$;


--
-- Name: trg_protect_last_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_protect_last_admin() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.role = 'admin' AND (SELECT COUNT(*) FROM users WHERE role = 'admin') = 1 THEN
        RAISE EXCEPTION 'В системе должен остаться хотя бы один администратор';
    END IF;

    RETURN OLD;
END;
$$;


--
-- Name: trg_recalculate_order_total(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_recalculate_order_total() RETURNS trigger
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


--
-- Name: trg_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(60) NOT NULL,
    slug character varying(40) NOT NULL,
    description character varying(300) DEFAULT ''::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_categories_slug CHECK (((slug)::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))
);


--
-- Name: TABLE categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.categories IS 'Справочник категорий инструмента';


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name character varying(120) NOT NULL,
    price numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    sum numeric(12,2) GENERATED ALWAYS AS ((price * (quantity)::numeric)) STORED,
    CONSTRAINT ck_order_items_price CHECK ((price >= (0)::numeric)),
    CONSTRAINT ck_order_items_qty CHECK (((quantity >= 1) AND (quantity <= 100)))
);


--
-- Name: TABLE order_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_items IS 'Состав заказа';


--
-- Name: COLUMN order_items.product_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_items.product_name IS 'Наименование на момент покупки: карточка товара может измениться позже';


--
-- Name: COLUMN order_items.sum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_items.sum IS 'Вычисляемый столбец: цена, умноженная на количество';


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number character varying(12) NOT NULL,
    customer_id uuid NOT NULL,
    status public.order_status DEFAULT 'new'::public.order_status NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    address character varying(200) NOT NULL,
    phone character varying(20) NOT NULL,
    comment character varying(300),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_orders_number CHECK (((number)::text ~ '^TS-[0-9]{6}$'::text)),
    CONSTRAINT ck_orders_phone CHECK (((phone)::text ~ '^\+7 \([0-9]{3}\) [0-9]{3}-[0-9]{2}-[0-9]{2}$'::text)),
    CONSTRAINT ck_orders_total CHECK ((total >= (0)::numeric))
);


--
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orders IS 'Заказы, оформленные покупателями';


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    sku character varying(8) NOT NULL,
    description character varying(1000) DEFAULT ''::character varying NOT NULL,
    price numeric(10,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    brand character varying(40) NOT NULL,
    category_id uuid NOT NULL,
    image character varying(40) DEFAULT ''::character varying NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_products_price CHECK (((price >= (1)::numeric) AND (price <= (1000000)::numeric))),
    CONSTRAINT ck_products_sku CHECK (((sku)::text ~ '^[A-Z]{3}-[0-9]{4}$'::text)),
    CONSTRAINT ck_products_stock CHECK (((stock >= 0) AND (stock <= 10000)))
);


--
-- Name: TABLE products; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.products IS 'Номенклатура интернет-магазина';


--
-- Name: COLUMN products.image; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.image IS 'Имя файла фотографии товара; пустая строка — фотографии нет';


--
-- Name: COLUMN products.is_archived; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.is_archived IS 'Товар снят с продажи, но сохранён ради истории заказов';


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    author_id uuid NOT NULL,
    rating smallint NOT NULL,
    text character varying(500) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_reviews_rating CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT ck_reviews_text CHECK (((char_length(btrim((text)::text)) >= 10) AND (char_length(btrim((text)::text)) <= 500)))
);


--
-- Name: TABLE reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reviews IS 'Отзывы покупателей; на один товар покупатель оставляет не более одного отзыва';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(120) NOT NULL,
    age smallint,
    role public.user_role DEFAULT 'customer'::public.user_role NOT NULL,
    password_hash character varying(72),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_users_age CHECK (((age IS NULL) OR ((age >= 14) AND (age <= 120)))),
    CONSTRAINT ck_users_email CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT ck_users_name CHECK (((char_length(btrim((name)::text)) >= 2) AND (char_length(btrim((name)::text)) <= 100)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Пользователи приложения: администраторы, менеджеры и покупатели';


--
-- Name: COLUMN users.age; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.age IS 'Возраст указывается по желанию, остальные поля обязательны';


--
-- Name: v_catalog; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_catalog AS
SELECT
    NULL::uuid AS id,
    NULL::character varying(120) AS name,
    NULL::character varying(8) AS sku,
    NULL::numeric(10,2) AS price,
    NULL::integer AS stock,
    NULL::character varying(40) AS brand,
    NULL::character varying(40) AS image,
    NULL::character varying(60) AS category_name,
    NULL::character varying(40) AS category_slug,
    NULL::numeric AS rating,
    NULL::bigint AS reviews_count;


--
-- Name: VIEW v_catalog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_catalog IS 'Витрина каталога для клиентской части';


--
-- Name: v_order_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_order_summary AS
SELECT
    NULL::uuid AS id,
    NULL::character varying(12) AS number,
    NULL::public.order_status AS status,
    NULL::timestamp with time zone AS created_at,
    NULL::character varying(100) AS customer_name,
    NULL::character varying(120) AS customer_email,
    NULL::bigint AS positions,
    NULL::bigint AS units,
    NULL::numeric(12,2) AS total;


--
-- Name: VIEW v_order_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_order_summary IS 'Заказы с числом позиций и единиц товара — для панели управления';


--
-- Name: v_sales_by_category; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sales_by_category AS
 SELECT c.id AS category_id,
    c.name AS category_name,
    count(DISTINCT o.id) AS orders_count,
    COALESCE(sum(oi.quantity), (0)::bigint) AS units_sold,
    COALESCE(sum(oi.sum), (0)::numeric) AS revenue
   FROM (((public.categories c
     LEFT JOIN public.products p ON ((p.category_id = c.id)))
     LEFT JOIN public.order_items oi ON ((oi.product_id = p.id)))
     LEFT JOIN public.orders o ON (((o.id = oi.order_id) AND (o.status <> 'cancelled'::public.order_status))))
  GROUP BY c.id, c.name;


--
-- Name: VIEW v_sales_by_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_sales_by_category IS 'Выручка и количество проданных единиц по категориям';


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, description, created_at, updated_at) FROM stdin;
11111111-1111-4111-8111-000000000001	Электроинструмент	power-tools	Дрели, шуруповёрты, шлифовальные машины и лобзики	2026-10-06 12:00:20.705958+03	2026-10-06 12:00:20.705958+03
11111111-1111-4111-8111-000000000002	Ручной инструмент	hand-tools	Ключи, молотки, отвёртки и клещи	2026-10-06 12:00:20.705958+03	2026-10-06 12:00:20.705958+03
11111111-1111-4111-8111-000000000003	Измерительный инструмент	measuring-tools	Рулетки, уровни и лазерные дальномеры	2026-10-06 12:00:20.705958+03	2026-10-06 12:00:20.705958+03
11111111-1111-4111-8111-000000000004	Садовый инструмент	garden-tools	Триммеры, пилы и техника для участка	2026-10-06 12:00:20.705958+03	2026-10-06 12:00:20.705958+03
11111111-1111-4111-8111-000000000005	Расходные материалы	consumables	Свёрла, диски, биты и прочая оснастка	2026-10-06 12:00:20.705958+03	2026-10-06 12:00:20.705958+03
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, product_name, price, quantity) FROM stdin;
8a77dc4a-1dee-4af2-99cc-e7310ebf1d53	44444444-4444-4444-8444-000000000001	33333333-3333-4333-8333-000000000001	Перфоратор SDS-Plus 850 Вт	8490.00	1
1902f543-b69b-42a5-98d7-522695599ded	44444444-4444-4444-8444-000000000001	33333333-3333-4333-8333-000000000013	Набор свёрл по металлу, 19 предметов	1690.00	2
07683723-22c6-4410-9b85-85ca62945119	44444444-4444-4444-8444-000000000002	33333333-3333-4333-8333-000000000011	Триммер электрический 1200 Вт	5490.00	1
97be6296-393d-443f-8e7a-f9d495561a43	44444444-4444-4444-8444-000000000003	33333333-3333-4333-8333-000000000005	Набор головок и ключей, 46 предметов	2390.00	1
d67ae0bc-ba2f-481a-9541-3ed8d8809891	44444444-4444-4444-8444-000000000003	33333333-3333-4333-8333-000000000008	Рулетка измерительная 5 м	420.00	3
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, number, customer_id, status, total, address, phone, comment, created_at, updated_at) FROM stdin;
44444444-4444-4444-8444-000000000001	TS-000001	22222222-2222-4222-8222-000000000003	completed	11870.00	г. Москва, ул. Воронцовская, д. 6а, стр. 1	+7 (916) 100-20-30	Просьба позвонить за час до доставки	2026-10-06 12:00:20.772811+03	2026-10-06 12:00:20.773578+03
44444444-4444-4444-8444-000000000002	TS-000002	22222222-2222-4222-8222-000000000004	processing	5490.00	Московская обл., г. Химки, ул. Лавочкина, д. 14	+7 (925) 771-04-19	\N	2026-10-06 12:00:20.772811+03	2026-10-06 12:00:20.773578+03
44444444-4444-4444-8444-000000000003	TS-000003	22222222-2222-4222-8222-000000000003	new	3650.00	г. Москва, ул. Воронцовская, д. 6а, стр. 1	+7 (916) 100-20-30	\N	2026-10-06 12:00:20.772811+03	2026-10-06 12:00:20.773578+03
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, sku, description, price, stock, brand, category_id, image, is_archived, created_at, updated_at) FROM stdin;
33333333-3333-4333-8333-000000000001	Перфоратор SDS-Plus 850 Вт	PWR-0850	Сетевой перфоратор с патроном SDS-Plus, энергия удара 2,8 Дж, три режима работы, кейс в комплекте.	8490.00	14	Makita	11111111-1111-4111-8111-000000000001	perforator.jpg	f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000002	Углошлифовальная машина 125 мм	PWR-0125	УШМ мощностью 1100 Вт, регулировка оборотов, плавный пуск, защита от непроизвольного включения.	5290.00	21	Makita	11111111-1111-4111-8111-000000000001		f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000003	Аккумуляторный шуруповёрт 18 В	PWR-1802	Два аккумулятора 2,0 А·ч, крутящий момент 45 Н·м, 20 ступеней регулировки.	6990.00	9	Makita	11111111-1111-4111-8111-000000000001	screwdriver.jpg	f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000004	Электролобзик 750 Вт	PWR-0750	Маятниковый ход, четыре ступени, пропил дерева до 80 мм, патрубок для пылесоса.	4150.00	12	Bosch	11111111-1111-4111-8111-000000000001		f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000005	Набор головок и ключей, 46 предметов	HND-0012	Торцевые головки 4–32 мм, комбинированные ключи 8–22 мм, две трещотки и удлинители.	2390.00	30	Зубр	11111111-1111-4111-8111-000000000002	wrench-set.jpg	f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000006	Молоток слесарный 600 г	HND-0600	Кованая головка, фибергласовая рукоять с противоскользящим покрытием.	790.00	45	Stanley	11111111-1111-4111-8111-000000000002		f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000007	Набор шарнирно-губцевого инструмента, 3 предмета	HND-0180	Пассатижи, бокорезы и длинногубцы из хром-ванадиевой стали, двухкомпонентные рукояти.	640.00	38	Bosch	11111111-1111-4111-8111-000000000002	pliers.jpg	f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000008	Рулетка измерительная 5 м	MSR-0005	Автостоп, магнитный зацеп, класс точности II, обрезиненный корпус.	420.00	52	Зубр	11111111-1111-4111-8111-000000000003		f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000009	Уровень строительный 800 мм	MSR-0800	Алюминиевый профиль, три глазка, точность 0,5 мм/м.	1180.00	17	Kapro	11111111-1111-4111-8111-000000000003		f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000010	Лазерный дальномер 40 м	MSR-0040	Погрешность ±2 мм, расчёт площади и объёма, память на 20 измерений.	3950.00	6	Bosch	11111111-1111-4111-8111-000000000003		f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000011	Триммер электрический 1200 Вт	GRD-1200	Разъёмная штанга, ширина скашивания 350 мм, леска и нож в комплекте.	5490.00	8	Huter	11111111-1111-4111-8111-000000000004		f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000012	Пила садовая складная 210 мм	GRD-0210	Закалённый зуб, японская заточка, фиксатор полотна в двух положениях.	890.00	24	Fiskars	11111111-1111-4111-8111-000000000004		f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000013	Набор свёрл по металлу, 19 предметов	CNS-0019	Диаметр 1–10 мм, сталь HSS-Co, шлифованная поверхность, металлический кейс.	1690.00	27	Ruko	11111111-1111-4111-8111-000000000005		f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000014	Диск отрезной по металлу 125×1,2 мм, 10 шт.	CNS-0125	Армированный круг для УШМ, посадочный диаметр 22,2 мм, ресурс до 60 резов.	560.00	64	Луга	11111111-1111-4111-8111-000000000005		f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000015	Набор инструментов в кейсе, 142 предмета	HND-0142	Головки, ключи, отвёртки, биты и трещотки в пластиковом кейсе с ложементом.	18900.00	5	JTC	11111111-1111-4111-8111-000000000002	tool-case.jpg	f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000016	Ножницы раскройные 250 мм	HND-0250	Для ткани, кожи и обивочных материалов, кованые лезвия, латунный винт.	1450.00	15	Jack	11111111-1111-4111-8111-000000000002	scissors.jpg	f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000017	Набор шестигранных ключей, 9 предметов	HND-0009	Удлинённые Г-образные ключи 1,5–10 мм со сферическим концом, держатель в комплекте.	690.00	33	Bing Jiang	11111111-1111-4111-8111-000000000002	hex-keys.jpg	f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
33333333-3333-4333-8333-000000000018	Набор ручного инструмента для дома, 8 предметов	HND-0008	Молоток, отвёртки, пассатижи, бокорезы, ножовка, стамеска и рубанок.	4290.00	11	Kraftool	11111111-1111-4111-8111-000000000002	hand-tools.jpg	f	2026-10-06 12:00:20.771164+03	2026-10-06 12:00:20.771164+03
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, product_id, author_id, rating, text, created_at, updated_at) FROM stdin;
d1f0330c-2494-40e7-bd40-197c8ccae4a0	33333333-3333-4333-8333-000000000001	22222222-2222-4222-8222-000000000003	5	Бетон берёт уверенно, вибрация умеренная. За свои деньги отличный инструмент.	2026-10-06 12:00:20.774511+03	2026-10-06 12:00:20.774511+03
72c7e81c-4ee6-4cb6-b976-491b06359889	33333333-3333-4333-8333-000000000001	22222222-2222-4222-8222-000000000004	4	Тяжеловат для длительной работы, но со своей задачей справляется.	2026-10-06 12:00:20.774511+03	2026-10-06 12:00:20.774511+03
8823b307-416f-4faa-8d10-9344cce1c4bc	33333333-3333-4333-8333-000000000003	22222222-2222-4222-8222-000000000003	5	Два аккумулятора в комплекте — работать можно весь день без перерыва.	2026-10-06 12:00:20.774511+03	2026-10-06 12:00:20.774511+03
3060a02f-90c3-4e6c-9596-904b5aff0840	33333333-3333-4333-8333-000000000011	22222222-2222-4222-8222-000000000004	3	Скашивает ровно, но провод короткий, нужен удлинитель.	2026-10-06 12:00:20.774511+03	2026-10-06 12:00:20.774511+03
1731ee75-6676-426f-bdaa-334c4128917d	33333333-3333-4333-8333-000000000010	22222222-2222-4222-8222-000000000003	5	Замеры совпадают с рулеткой до миллиметра, экономит массу времени.	2026-10-06 12:00:20.774511+03	2026-10-06 12:00:20.774511+03
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, age, role, password_hash, is_active, created_at, updated_at) FROM stdin;
22222222-2222-4222-8222-000000000001	Улагашев Айман Владимирович	admin@toolshop.ru	20	admin	$2a$08$ujRINmVqDl.wfJx4dxQ3VuAJcdS61pKbRnNbkKb.ofyZxPhvZ3nmS	t	2026-10-06 12:00:20.706493+03	2026-10-06 12:00:20.706493+03
22222222-2222-4222-8222-000000000002	Соколова Мария Андреевна	manager@toolshop.ru	31	manager	$2a$08$xMZPmCLRjiJk3mBaE.KQFuxeB1idi1XBRI1PC0.ZdziMmFw7PGDPS	t	2026-10-06 12:00:20.706493+03	2026-10-06 12:00:20.706493+03
22222222-2222-4222-8222-000000000003	Ковалёв Сергей Петрович	kovalev@example.com	42	customer	$2a$08$KTz5/0EzoImrjDrnK3YH3Otj1KH3Q3HAzunFaaSbcxMOp6.D48pka	t	2026-10-06 12:00:20.706493+03	2026-10-06 12:00:20.706493+03
22222222-2222-4222-8222-000000000004	Жукова Анна Ивановна	zhukova@example.com	\N	customer	$2a$08$2iqMnCvPsOfQAXGsvoED3e06yFnlITMjXZf0Ydngt..WxL2OKUPK6	t	2026-10-06 12:00:20.706493+03	2026-10-06 12:00:20.706493+03
\.


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: categories uq_categories_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT uq_categories_name UNIQUE (name);


--
-- Name: categories uq_categories_slug; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT uq_categories_slug UNIQUE (slug);


--
-- Name: order_items uq_order_items; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT uq_order_items UNIQUE (order_id, product_id);


--
-- Name: orders uq_orders_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT uq_orders_number UNIQUE (number);


--
-- Name: products uq_products_sku; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT uq_products_sku UNIQUE (sku);


--
-- Name: reviews uq_reviews_author; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT uq_reviews_author UNIQUE (product_id, author_id);


--
-- Name: users uq_users_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_email UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_customer ON public.orders USING btree (customer_id);


--
-- Name: ix_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_status ON public.orders USING btree (status);


--
-- Name: ix_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_products_category ON public.products USING btree (category_id);


--
-- Name: ix_products_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_products_name ON public.products USING btree (name);


--
-- Name: ix_products_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_products_price ON public.products USING btree (price);


--
-- Name: ix_reviews_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_product ON public.reviews USING btree (product_id);


--
-- Name: v_catalog _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_catalog AS
 SELECT p.id,
    p.name,
    p.sku,
    p.price,
    p.stock,
    p.brand,
    p.image,
    c.name AS category_name,
    c.slug AS category_slug,
    COALESCE(round(avg(r.rating), 1), (0)::numeric) AS rating,
    count(r.id) AS reviews_count
   FROM ((public.products p
     JOIN public.categories c ON ((c.id = p.category_id)))
     LEFT JOIN public.reviews r ON ((r.product_id = p.id)))
  WHERE (p.is_archived = false)
  GROUP BY p.id, c.name, c.slug;


--
-- Name: v_order_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_order_summary AS
 SELECT o.id,
    o.number,
    o.status,
    o.created_at,
    u.name AS customer_name,
    u.email AS customer_email,
    count(oi.id) AS positions,
    COALESCE(sum(oi.quantity), (0)::bigint) AS units,
    o.total
   FROM ((public.orders o
     JOIN public.users u ON ((u.id = o.customer_id)))
     LEFT JOIN public.order_items oi ON ((oi.order_id = o.id)))
  GROUP BY o.id, u.name, u.email;


--
-- Name: order_items tr_order_items_total; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_order_items_total AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.trg_recalculate_order_total();


--
-- Name: orders tr_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();


--
-- Name: products tr_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();


--
-- Name: users tr_users_normalize_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_users_normalize_email BEFORE INSERT OR UPDATE OF email ON public.users FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_email();


--
-- Name: users tr_users_protect_last_admin; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_users_protect_last_admin BEFORE DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trg_protect_last_admin();


--
-- Name: users tr_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();


--
-- Name: order_items fk_order_items_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items fk_order_items_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders fk_orders_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: products fk_products_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reviews fk_reviews_author; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT fk_reviews_author FOREIGN KEY (author_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reviews fk_reviews_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ieCQFa8KO6l2JwoBoKCHtbgC31LRiLnhFtEC6tzSGQRZ0j4Xt8BIkUt90yFYtQN

