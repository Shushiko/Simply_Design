-- =====================================================================
-- Simply Design - 01_schema.sql
-- Tables, constraints, triggers, business functions and views.
-- Run ONCE as a superuser (or a role allowed to SET ROLE sd_owner),
-- connected to the simply_design database:
--
--     psql -U postgres -d simply_design -f 01_schema.sql
--
-- Not idempotent: for later changes use migrations.
-- Everything runs in one transaction - an error rolls it all back.
-- =====================================================================
\set ON_ERROR_STOP on

SET ROLE sd_owner;
SET search_path = pg_catalog, extensions;

BEGIN;

CREATE SCHEMA app;      -- request-context helpers used by row-level security
CREATE SCHEMA auth;     -- credentials, sessions, reset tokens (never exposed to the API role directly)
CREATE SCHEMA rental;   -- the business data

-- =====================================================================
-- 1. APP HELPERS
-- =====================================================================

-- The backend runs   SELECT app.set_context(<user uuid>, '<role>')   at the start of
-- EVERY transaction. Row-level security reads that context.
-- Roles: anon | customer | admin | system  (system = payment webhooks / jobs; treated as admin)

CREATE FUNCTION app.set_context(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_role IS NULL OR p_role NOT IN ('anon', 'customer', 'admin', 'system') THEN
    RAISE EXCEPTION 'invalid app role: %', p_role USING ERRCODE = '22023';
  END IF;
  PERFORM set_config('app.user_id', coalesce(p_user_id::text, ''), true);  -- true = this transaction only
  PERFORM set_config('app.role', p_role, true);
END
$$;

CREATE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

CREATE FUNCTION app.request_role()
RETURNS text
LANGUAGE sql STABLE
AS $$ SELECT coalesce(nullif(current_setting('app.role', true), ''), 'anon') $$;

CREATE FUNCTION app.is_admin()
RETURNS boolean
LANGUAGE sql STABLE
AS $$ SELECT app.request_role() IN ('admin', 'system') $$;

CREATE FUNCTION app.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

-- =====================================================================
-- 2. AUTH  (login.html, signup.html, forgotpassword, resetpassword, social login)
-- =====================================================================

CREATE TYPE auth.user_role         AS ENUM ('customer', 'admin');
CREATE TYPE auth.user_status       AS ENUM ('active', 'suspended');
CREATE TYPE auth.identity_provider AS ENUM ('google', 'facebook');

CREATE TABLE auth.users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text NOT NULL,
  full_name           text NOT NULL,
  -- NULL = social-login-only account. Otherwise an Argon2id (or bcrypt) hash made by the
  -- backend. The CHECK below makes it impossible to store a plaintext password.
  password_hash       text,
  role                auth.user_role   NOT NULL DEFAULT 'customer',
  status              auth.user_status NOT NULL DEFAULT 'active',
  email_verified_at   timestamptz,
  failed_login_count  integer NOT NULL DEFAULT 0,
  locked_until        timestamptz,
  last_login_at       timestamptz,
  password_changed_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  CONSTRAINT users_email_key          UNIQUE (email),
  CONSTRAINT users_email_format       CHECK (email = lower(email) AND length(email) <= 254
                                             AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CONSTRAINT users_name_len           CHECK (length(btrim(full_name)) BETWEEN 1 AND 100),
  CONSTRAINT users_password_hash_fmt  CHECK (password_hash IS NULL
                                             OR (password_hash ~ '^\$(argon2id|2[aby])\$' AND length(password_hash) >= 50)),
  CONSTRAINT users_admin_has_password CHECK (role <> 'admin' OR password_hash IS NOT NULL),
  CONSTRAINT users_failed_nonneg      CHECK (failed_login_count >= 0)
);
COMMENT ON COLUMN auth.users.password_hash IS 'Argon2id/bcrypt hash computed by the backend. Never plaintext.';

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- "Continue with Google / Facebook"
CREATE TABLE auth.identities (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider         auth.identity_provider NOT NULL,
  provider_user_id text NOT NULL CHECK (length(provider_user_id) BETWEEN 1 AND 255),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id),
  UNIQUE (user_id, provider)
);

-- Server-side sessions. Only a SHA-256 hash of the session token is stored.
CREATE TABLE auth.sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token_hash   bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
  remember     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  ip           inet,
  user_agent   text CHECK (length(user_agent) <= 512)
);
CREATE INDEX sessions_user_idx ON auth.sessions (user_id) WHERE revoked_at IS NULL;

-- Password reset links (30 minutes, one use). Only the token HASH is stored.
CREATE TABLE auth.password_reset_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token_hash   bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  requested_ip inet,
  CHECK (expires_at > created_at)
);
CREATE INDEX password_reset_user_idx ON auth.password_reset_tokens (user_id, created_at DESC);

-- Audit trail of login attempts (also feeds rate limiting).
CREATE TABLE auth.login_attempts (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email        text NOT NULL CHECK (length(email) <= 254),
  ip           inet,
  success      boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_email_idx ON auth.login_attempts (email, attempted_at DESC);
CREATE INDEX login_attempts_ip_idx    ON auth.login_attempts (ip, attempted_at DESC);

-- =====================================================================
-- 3. RENTAL: reference data
-- =====================================================================

CREATE TYPE rental.item_status    AS ENUM ('available', 'rented', 'damaged');
CREATE TYPE rental.rental_status  AS ENUM ('reserved', 'active', 'returned', 'cancelled');
CREATE TYPE rental.payment_method AS ENUM ('gcash', 'card', 'cash');
CREATE TYPE rental.payment_state  AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TABLE rental.branches (
  id        smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      text NOT NULL UNIQUE,
  address   text,
  city      text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

-- Long Gown / Cocktail Dress / Men Suit.  code = prefix of the item code (LG, CD, MS).
CREATE TABLE rental.categories (
  id                   smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code                 text NOT NULL UNIQUE CHECK (code ~ '^[A-Z]{2,4}$'),
  name                 text NOT NULL UNIQUE,
  default_rental_price numeric(10,2) NOT NULL DEFAULT 1500 CHECK (default_rental_price >= 0),
  default_buy_price    numeric(10,2) CHECK (default_buy_price IS NULL OR default_buy_price >= 0),
  sort_order           smallint NOT NULL DEFAULT 0
);

CREATE TABLE rental.sizes (
  code         text PRIMARY KEY CHECK (code ~ '^[A-Z0-9]{1,4}$'),
  sort_order   smallint NOT NULL UNIQUE,
  waist_min_in smallint,
  waist_max_in smallint,
  CHECK ((waist_min_in IS NULL) = (waist_max_in IS NULL)),
  CHECK (waist_max_in IS NULL OR waist_max_in >= waist_min_in)
);

-- One row only (settings.html)
CREATE TABLE rental.business_settings (
  id                boolean PRIMARY KEY DEFAULT true CHECK (id),
  business_name     text NOT NULL,
  email             text,
  phone             text,
  address           text,
  gcash_number      text CHECK (gcash_number IS NULL OR gcash_number ~ '^(\+63|0)9[0-9]{9}$'),
  late_fee_per_day  numeric(10,2) NOT NULL DEFAULT 15 CHECK (late_fee_per_day >= 0),
  damage_fee_min    numeric(10,2) NOT NULL DEFAULT 50 CHECK (damage_fee_min >= 0),
  logo_key          text,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid REFERENCES auth.users (id) ON DELETE SET NULL
);
CREATE TRIGGER business_settings_set_updated_at BEFORE UPDATE ON rental.business_settings
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- =====================================================================
-- 4. RENTAL: inventory  (inventory.html, catalog, booking.html)
-- =====================================================================

-- Concurrency-safe counter behind generated item codes (LGBLUE0001, CDRED0002, ...)
CREATE TABLE rental.item_code_counters (
  prefix   text PRIMARY KEY,
  last_seq integer NOT NULL
);

CREATE FUNCTION rental.next_item_code(p_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, rental
AS $$
DECLARE
  v_seq integer;
BEGIN
  INSERT INTO rental.item_code_counters AS c (prefix, last_seq)
  VALUES (p_prefix, 1)
  ON CONFLICT (prefix) DO UPDATE SET last_seq = c.last_seq + 1
  RETURNING c.last_seq INTO v_seq;
  RETURN p_prefix || lpad(v_seq::text, 4, '0');
END
$$;

CREATE TABLE rental.items (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code         text NOT NULL,
  name         text NOT NULL,
  description  text,
  category_id  smallint NOT NULL REFERENCES rental.categories (id),
  size_code    text NOT NULL REFERENCES rental.sizes (code),
  color        text NOT NULL,
  rental_price numeric(10,2) NOT NULL,
  buy_price    numeric(10,2),
  branch_id    smallint NOT NULL REFERENCES rental.branches (id),
  status       rental.item_status NOT NULL DEFAULT 'available',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  CONSTRAINT items_code_key      UNIQUE (code),
  CONSTRAINT items_code_format   CHECK (code ~ '^[A-Z]{3,8}[0-9]{4,}$'),
  CONSTRAINT items_name_len      CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  CONSTRAINT items_desc_len      CHECK (length(description) <= 1000),
  CONSTRAINT items_color_format  CHECK (color ~ '^[A-Za-z][A-Za-z -]{0,29}$'),
  CONSTRAINT items_prices_nonneg CHECK (rental_price >= 0 AND (buy_price IS NULL OR buy_price >= 0))
);
CREATE INDEX items_category_idx ON rental.items (category_id) WHERE deleted_at IS NULL;
CREATE INDEX items_status_idx   ON rental.items (status)      WHERE deleted_at IS NULL;

-- Fills defaults (prices from the category, first active branch) and generates the item code.
CREATE FUNCTION rental.items_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_cat rental.categories;
BEGIN
  IF NEW.color IS NULL THEN
    RAISE EXCEPTION 'color is required' USING ERRCODE = '23502';
  END IF;
  SELECT * INTO v_cat FROM rental.categories WHERE id = NEW.category_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown category %', NEW.category_id USING ERRCODE = '23503';
  END IF;
  IF NEW.rental_price IS NULL THEN NEW.rental_price := v_cat.default_rental_price; END IF;
  IF NEW.buy_price    IS NULL THEN NEW.buy_price    := v_cat.default_buy_price;    END IF;
  IF NEW.branch_id    IS NULL THEN
    SELECT b.id INTO NEW.branch_id FROM rental.branches b WHERE b.is_active ORDER BY b.id LIMIT 1;
  END IF;
  IF NEW.code IS NULL THEN
    -- LG + BLUE + 0001  (first 4 letters of the colour, like the admin form does)
    NEW.code := rental.next_item_code(
      v_cat.code || upper(left(regexp_replace(NEW.color, '[^A-Za-z]', '', 'g'), 4))
    );
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER items_before_insert BEFORE INSERT ON rental.items
  FOR EACH ROW EXECUTE FUNCTION rental.items_before_insert();
CREATE TRIGGER items_set_updated_at BEFORE UPDATE ON rental.items
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- Up to 5 photos per item: the slot number IS the limit (1..5, unique per item).
CREATE TABLE rental.item_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      bigint NOT NULL REFERENCES rental.items (id) ON DELETE CASCADE,
  sort_order   smallint NOT NULL CHECK (sort_order BETWEEN 1 AND 5),
  storage_key  text NOT NULL CHECK (length(storage_key) BETWEEN 1 AND 500),   -- key in object storage, NOT the image bytes
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size    integer NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, sort_order)
);

-- =====================================================================
-- 5. RENTAL: customers & preferences  (customers.html, locations.html, profile.html)
-- =====================================================================

-- A customer is a person. user_id is set when they have a login; walk-ins created
-- by the admin ("+ New Customer") have no account.
CREATE TABLE rental.customers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL,
  full_name    text NOT NULL,
  email        text,
  phone        text,
  gcash_number text,
  address_line text,
  barangay     text,
  city         text,
  province     text,
  avatar_key   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  CONSTRAINT customers_name_len CHECK (length(btrim(full_name)) BETWEEN 1 AND 100),
  CONSTRAINT customers_email_format CHECK (email IS NULL OR (email = lower(email) AND length(email) <= 254
                                           AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  CONSTRAINT customers_phone_format  CHECK (phone        IS NULL OR phone        ~ '^(\+63|0)9[0-9]{9}$'),
  CONSTRAINT customers_gcash_format  CHECK (gcash_number IS NULL OR gcash_number ~ '^(\+63|0)9[0-9]{9}$'),
  CONSTRAINT customers_addr_len      CHECK (length(address_line) <= 200 AND length(barangay) <= 100
                                            AND length(city) <= 100 AND length(province) <= 100)
);
CREATE INDEX customers_name_idx  ON rental.customers (lower(full_name)) WHERE deleted_at IS NULL;
CREATE INDEX customers_email_idx ON rental.customers (email) WHERE email IS NOT NULL;
CREATE INDEX customers_phone_idx ON rental.customers (phone) WHERE phone IS NOT NULL;

-- Tidies input the way the forms do: lower-case email, no spaces inside mobile numbers.
CREATE FUNCTION rental.normalize_customer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.full_name    := btrim(NEW.full_name);
  NEW.email        := nullif(lower(btrim(NEW.email)), '');
  NEW.phone        := nullif(regexp_replace(coalesce(NEW.phone, ''), '\s', '', 'g'), '');
  NEW.gcash_number := nullif(regexp_replace(coalesce(NEW.gcash_number, ''), '\s', '', 'g'), '');
  RETURN NEW;
END
$$;
CREATE TRIGGER customers_normalize BEFORE INSERT OR UPDATE ON rental.customers
  FOR EACH ROW EXECUTE FUNCTION rental.normalize_customer();
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON rental.customers
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- Changing your name on the profile page also renames your login account.
CREATE FUNCTION rental.sync_customer_name_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    UPDATE auth.users SET full_name = NEW.full_name WHERE id = NEW.user_id;
  END IF;
  RETURN NULL;
END
$$;
CREATE TRIGGER customers_sync_name AFTER UPDATE OF full_name ON rental.customers
  FOR EACH ROW EXECUTE FUNCTION rental.sync_customer_name_to_user();

-- Profile "Preferences" + admin notification toggles + dark mode / language / currency
CREATE TABLE rental.user_preferences (
  user_id                  uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  notify_orders            boolean NOT NULL DEFAULT true,
  notify_email             boolean NOT NULL DEFAULT true,
  notify_new_rentals       boolean NOT NULL DEFAULT true,
  notify_item_returns      boolean NOT NULL DEFAULT true,
  notify_payment_received  boolean NOT NULL DEFAULT true,
  notify_violations        boolean NOT NULL DEFAULT true,
  dark_mode                boolean NOT NULL DEFAULT false,
  language                 text NOT NULL DEFAULT 'en'  CHECK (language IN ('en', 'fil')),
  currency                 text NOT NULL DEFAULT 'PHP' CHECK (currency IN ('PHP', 'USD')),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER user_preferences_set_updated_at BEFORE UPDATE ON rental.user_preferences
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- =====================================================================
-- 6. RENTAL: rentals & payments  (booking.html, rentals.html)
-- =====================================================================

CREATE TABLE rental.rental_ref_counters (
  year     integer PRIMARY KEY,
  last_seq integer NOT NULL
);

-- SD-2026-0001, SD-2026-0002 ... restarts every year
CREATE FUNCTION rental.next_rental_ref()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, rental
AS $$
DECLARE
  v_year integer := extract(year FROM (now() AT TIME ZONE 'Asia/Manila'))::integer;
  v_seq  integer;
BEGIN
  INSERT INTO rental.rental_ref_counters AS c (year, last_seq)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE SET last_seq = c.last_seq + 1
  RETURNING c.last_seq INTO v_seq;
  RETURN 'SD-' || v_year::text || '-' || lpad(v_seq::text, 4, '0');
END
$$;

CREATE TABLE rental.rentals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref           text NOT NULL,
  customer_id   uuid   NOT NULL REFERENCES rental.customers (id),
  item_id       bigint NOT NULL REFERENCES rental.items (id),
  pickup_date   date NOT NULL,
  return_date   date NOT NULL,
  status        rental.rental_status NOT NULL DEFAULT 'reserved',
  renter_name   text,                      -- name/phone typed on the booking form (snapshot)
  renter_phone  text,
  rental_fee    numeric(10,2) NOT NULL,    -- price snapshot: later price changes do not rewrite history
  late_fee      numeric(10,2) NOT NULL DEFAULT 0,
  damage_fee    numeric(10,2) NOT NULL DEFAULT 0,
  total_amount  numeric(10,2) GENERATED ALWAYS AS (rental_fee + late_fee + damage_fee) STORED,
  damage_notes  text,
  picked_up_at  timestamptz,
  returned_at   timestamptz,
  created_by    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT rentals_ref_key      UNIQUE (ref),
  CONSTRAINT rentals_ref_format   CHECK (ref ~ '^SD-[0-9]{4}-[0-9]{4,}$'),
  CONSTRAINT rentals_dates_ok     CHECK (return_date >= pickup_date),
  CONSTRAINT rentals_fees_nonneg  CHECK (rental_fee >= 0 AND late_fee >= 0 AND damage_fee >= 0),
  CONSTRAINT rentals_phone_format CHECK (renter_phone IS NULL OR renter_phone ~ '^(\+63|0)9[0-9]{9}$'),
  CONSTRAINT rentals_notes_len    CHECK (length(damage_notes) <= 1000),
  -- THE double-booking rule (replaces the "booked" array in items.js): the same item can never
  -- have two live reservations whose date ranges (inclusive) overlap.
  CONSTRAINT rentals_no_double_booking
    EXCLUDE USING gist (item_id WITH =, daterange(pickup_date, return_date, '[]') WITH &&)
    WHERE (status IN ('reserved', 'active') AND deleted_at IS NULL)
);
CREATE INDEX rentals_customer_idx ON rental.rentals (customer_id, created_at DESC);
CREATE INDEX rentals_item_idx     ON rental.rentals (item_id);
CREATE INDEX rentals_status_idx   ON rental.rentals (status, return_date) WHERE deleted_at IS NULL;

CREATE FUNCTION rental.rentals_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_cust rental.customers;
BEGIN
  -- Only admins may choose a reference (e.g. importing old data). Everyone else gets the next one.
  IF NEW.ref IS NULL OR NOT app.is_admin() THEN
    NEW.ref := rental.next_rental_ref();
  END IF;

  IF EXISTS (SELECT 1 FROM rental.items i
             WHERE i.id = NEW.item_id AND (i.status = 'damaged' OR i.deleted_at IS NOT NULL)) THEN
    RAISE EXCEPTION 'item % cannot be rented right now', NEW.item_id USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_cust FROM rental.customers WHERE id = NEW.customer_id;
  IF FOUND THEN
    NEW.renter_name  := coalesce(nullif(btrim(NEW.renter_name), ''), v_cust.full_name);
    NEW.renter_phone := coalesce(nullif(regexp_replace(coalesce(NEW.renter_phone, ''), '\s', '', 'g'), ''),
                                 v_cust.phone);
  END IF;

  IF NEW.rental_fee IS NULL THEN
    SELECT i.rental_price INTO NEW.rental_fee FROM rental.items i WHERE i.id = NEW.item_id;
  END IF;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := app.current_user_id();
  END IF;
  IF NEW.status = 'active' AND NEW.picked_up_at IS NULL THEN
    NEW.picked_up_at := now();
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER rentals_before_insert BEFORE INSERT ON rental.rentals
  FOR EACH ROW EXECUTE FUNCTION rental.rentals_before_insert();

-- Status flow: reserved -> active -> returned, or cancelled before it ends. "Overdue" is not stored:
-- it is an active rental whose return_date has passed (see v_rentals).
CREATE FUNCTION rental.rentals_before_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_days integer;
  v_fee  numeric(10,2);
BEGIN
  IF NEW.status <> OLD.status THEN
    IF NOT ((OLD.status = 'reserved' AND NEW.status IN ('active', 'cancelled'))
         OR (OLD.status = 'active'   AND NEW.status IN ('returned', 'cancelled'))) THEN
      RAISE EXCEPTION 'invalid rental status change: % -> %', OLD.status, NEW.status
        USING ERRCODE = '23514';
    END IF;
    IF NEW.status = 'active' THEN
      NEW.picked_up_at := coalesce(NEW.picked_up_at, now());
    END IF;
    IF NEW.status = 'returned' THEN
      NEW.returned_at := coalesce(NEW.returned_at, now());
      -- the "Return" button: charge the late fee per day from Settings unless one was entered
      IF NEW.late_fee = 0 THEN
        v_days := (NEW.returned_at AT TIME ZONE 'Asia/Manila')::date - NEW.return_date;
        IF v_days > 0 THEN
          SELECT s.late_fee_per_day INTO v_fee FROM rental.business_settings s;
          NEW.late_fee := v_days * coalesce(v_fee, 0);
        END IF;
      END IF;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
CREATE TRIGGER rentals_before_update BEFORE UPDATE ON rental.rentals
  FOR EACH ROW EXECUTE FUNCTION rental.rentals_before_update();

-- Keeps items.status (Available / Rented) in step with the rental. Damaged items are left alone.
CREATE FUNCTION rental.sync_item_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, rental
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE rental.items SET status = 'rented' WHERE id = NEW.item_id AND status = 'available';
    END IF;
  ELSE
    IF NEW.status = 'active' AND OLD.status <> 'active' THEN
      UPDATE rental.items SET status = 'rented' WHERE id = NEW.item_id AND status = 'available';
    ELSIF OLD.status = 'active'
          AND (NEW.status IN ('returned', 'cancelled')
               OR (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)) THEN
      UPDATE rental.items SET status = 'available' WHERE id = NEW.item_id AND status = 'rented';
    END IF;
  END IF;
  RETURN NULL;
END
$$;
CREATE TRIGGER rentals_sync_item_status AFTER INSERT OR UPDATE OF status, deleted_at ON rental.rentals
  FOR EACH ROW EXECUTE FUNCTION rental.sync_item_status();

-- PAYMENTS.  PCI DSS: this table deliberately has NO column for card number, expiry or CVV.
CREATE TABLE rental.payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id    uuid NOT NULL REFERENCES rental.rentals (id),
  method       rental.payment_method NOT NULL,
  status       rental.payment_state  NOT NULL DEFAULT 'pending',
  amount       numeric(10,2) NOT NULL CHECK (amount > 0),
  gateway_ref  text CHECK (length(gateway_ref) <= 200),    -- transaction / token id from the payment provider
  card_brand   text CHECK (length(card_brand) <= 20),
  card_last4   text CHECK (card_last4 ~ '^[0-9]{4}$'),
  paid_at      timestamptz,
  recorded_by  uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_card_fields_card_only CHECK (method = 'card' OR (card_brand IS NULL AND card_last4 IS NULL)),
  CONSTRAINT payments_paid_has_time         CHECK (status <> 'paid' OR paid_at IS NOT NULL)
);
COMMENT ON TABLE rental.payments IS
  'Never add columns for full card number (PAN), expiry or CVV/CVC. Store provider tokens and the last 4 digits only.';
CREATE INDEX payments_rental_idx ON rental.payments (rental_id);
CREATE INDEX payments_paid_at_idx ON rental.payments (paid_at) WHERE status = 'paid';
CREATE UNIQUE INDEX payments_gateway_ref_key ON rental.payments (gateway_ref) WHERE gateway_ref IS NOT NULL;

CREATE FUNCTION rental.payments_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.paid_at IS NULL THEN
    NEW.paid_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
CREATE TRIGGER payments_before_write BEFORE INSERT OR UPDATE ON rental.payments
  FOR EACH ROW EXECUTE FUNCTION rental.payments_before_write();

-- Bell icon on the profile page ("You have 3 unread notifications")
CREATE TABLE rental.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('order_confirmed', 'pay_at_pickup', 'payment_pending', 'payment_received',
                                           'return_reminder', 'new_rental', 'item_returned', 'violation')),
  title      text NOT NULL CHECK (length(title) <= 120),
  body       text NOT NULL CHECK (length(body) <= 500),
  rental_id  uuid REFERENCES rental.rentals (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);
CREATE INDEX notifications_unread_idx ON rental.notifications (user_id, created_at DESC) WHERE read_at IS NULL;

-- =====================================================================
-- 7. AVAILABILITY HELPERS
-- SECURITY DEFINER on purpose: a customer must be able to ask "is this dress free on these
-- dates?" without being allowed to read other people's rentals. They only get a boolean / dates.
-- =====================================================================

CREATE FUNCTION rental.item_is_booked(p_item_id bigint, p_from date, p_to date)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = pg_catalog, rental
AS $$
  SELECT (p_from IS NOT NULL OR p_to IS NOT NULL)
     AND EXISTS (
       SELECT 1
       FROM rental.rentals r
       WHERE r.item_id = p_item_id
         AND r.deleted_at IS NULL
         AND r.status IN ('reserved', 'active')
         AND daterange(r.pickup_date, r.return_date, '[]')
             && daterange(least(p_from, p_to), greatest(p_from, p_to), '[]')
     )
$$;

CREATE FUNCTION rental.item_booked_ranges(p_item_id bigint)
RETURNS TABLE (pickup_date date, return_date date)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = pg_catalog, rental
AS $$
  SELECT r.pickup_date, r.return_date
  FROM rental.rentals r
  WHERE r.item_id = p_item_id
    AND r.deleted_at IS NULL
    AND r.status IN ('reserved', 'active')
    AND r.return_date >= current_date
  ORDER BY r.pickup_date
$$;

-- =====================================================================
-- 8. VIEWS  (all security_invoker: they obey the row-level security of whoever queries them)
-- =====================================================================

-- Public catalog (index.html + booking.html)
CREATE VIEW rental.v_catalog WITH (security_invoker = true) AS
SELECT i.id AS item_id,
       i.code,
       i.name,
       c.name AS type,
       i.color,
       i.size_code AS size,
       CASE WHEN s.waist_min_in IS NULL THEN NULL
            ELSE s.waist_min_in::text || ' - ' || s.waist_max_in::text || ' inches' END AS waistline,
       i.rental_price,
       i.buy_price,
       coalesce(i.description, i.color || ' ' || c.name) AS description,
       b.name AS place,
       i.status AS item_status,
       rental.item_is_booked(i.id, current_date, current_date) AS is_booked_today
FROM rental.items i
JOIN rental.categories c ON c.id = i.category_id
JOIN rental.sizes s      ON s.code = i.size_code
JOIN rental.branches b   ON b.id = i.branch_id
WHERE i.deleted_at IS NULL;

-- Rentals table (rentals.html), "My Orders" (profile.html), rental history
CREATE VIEW rental.v_rentals WITH (security_invoker = true) AS
SELECT r.id AS rental_id,
       r.ref,
       r.customer_id,
       cu.full_name AS customer_name,
       i.id   AS item_id,
       i.code AS item_code,
       i.name AS item_name,
       cat.name AS category,
       r.pickup_date,
       r.return_date,
       r.rental_fee,
       r.late_fee,
       r.damage_fee,
       r.total_amount,
       pay.paid_total,
       CASE WHEN pay.paid_total >= r.total_amount THEN 'paid'
            WHEN pay.paid_total > 0               THEN 'partial'
            ELSE 'unpaid' END AS payment_status,
       r.status AS stored_status,
       CASE WHEN r.status = 'active' AND r.return_date < current_date THEN 'overdue'
            ELSE r.status::text END AS display_status,
       CASE WHEN r.status = 'active' AND r.return_date < current_date
            THEN current_date - r.return_date ELSE 0 END AS days_overdue,
       r.created_at
FROM rental.rentals r
JOIN rental.customers cu  ON cu.id = r.customer_id
JOIN rental.items i       ON i.id = r.item_id
JOIN rental.categories cat ON cat.id = i.category_id
CROSS JOIN LATERAL (
  SELECT coalesce(sum(p.amount), 0) AS paid_total
  FROM rental.payments p
  WHERE p.rental_id = r.id AND p.status = 'paid'
) pay
WHERE r.deleted_at IS NULL;

-- Customers page (rentals count, total spent, last rental) + Locations page
CREATE VIEW rental.v_customer_summary WITH (security_invoker = true) AS
SELECT cu.id AS customer_id,
       cu.full_name,
       cu.phone,
       cu.email,
       concat_ws(', ', cu.address_line, cu.barangay, cu.city, cu.province) AS location,
       coalesce(rs.rental_count, 0) AS rental_count,
       coalesce(rs.total_billed, 0) AS total_billed,
       coalesce(rs.total_paid, 0)   AS total_spent,
       rs.last_rental
FROM rental.customers cu
LEFT JOIN LATERAL (
  SELECT count(*)                      AS rental_count,
         sum(r.total_amount)           AS total_billed,
         max(r.pickup_date)            AS last_rental,
         sum(coalesce(pp.paid, 0))     AS total_paid
  FROM rental.rentals r
  LEFT JOIN LATERAL (
    SELECT sum(p.amount) AS paid
    FROM rental.payments p
    WHERE p.rental_id = r.id AND p.status = 'paid'
  ) pp ON true
  WHERE r.customer_id = cu.id AND r.deleted_at IS NULL AND r.status <> 'cancelled'
) rs ON true
WHERE cu.deleted_at IS NULL;

-- Dashboard cards
CREATE VIEW rental.v_dashboard_stats WITH (security_invoker = true) AS
SELECT (SELECT coalesce(sum(p.amount), 0) FROM rental.payments p WHERE p.status = 'paid')          AS total_earnings,
       (SELECT count(*) FROM rental.items i WHERE i.deleted_at IS NULL AND i.status = 'available') AS available_stock,
       (SELECT count(*) FROM rental.items i WHERE i.deleted_at IS NULL)                            AS total_items,
       (SELECT count(*) FROM rental.rentals r WHERE r.deleted_at IS NULL AND r.status = 'active')  AS active_rentals;

-- Dashboard "Weekly Sales Report": last 7 days including today
CREATE VIEW rental.v_weekly_sales WITH (security_invoker = true) AS
SELECT d.day,
       to_char(d.day, 'Dy') AS label,
       coalesce(sum(p.amount), 0) AS revenue
FROM (SELECT (current_date - n) AS day FROM generate_series(0, 6) AS n) d
LEFT JOIN rental.payments p
       ON p.status = 'paid'
      AND (p.paid_at AT TIME ZONE 'Asia/Manila')::date = d.day
GROUP BY d.day
ORDER BY d.day;

-- Analytics "Revenue Overview": one row per month that has payments (fill the empty months in the app)
CREATE VIEW rental.v_monthly_revenue WITH (security_invoker = true) AS
SELECT date_trunc('month', p.paid_at AT TIME ZONE 'Asia/Manila')::date AS month,
       sum(p.amount) AS revenue
FROM rental.payments p
WHERE p.status = 'paid'
GROUP BY 1
ORDER BY 1;

-- Analytics "Inventory Performance" / "Most Rented Items"
CREATE VIEW rental.v_inventory_performance WITH (security_invoker = true) AS
SELECT i.id AS item_id,
       i.code,
       i.name,
       c.name AS category,
       count(r.id) FILTER (WHERE r.status <> 'cancelled')                         AS times_rented,
       coalesce(sum(r.total_amount) FILTER (WHERE r.status <> 'cancelled'), 0)    AS revenue_billed,
       max(r.pickup_date)                                                         AS last_rented
FROM rental.items i
JOIN rental.categories c ON c.id = i.category_id
LEFT JOIN rental.rentals r ON r.item_id = i.id AND r.deleted_at IS NULL
WHERE i.deleted_at IS NULL
GROUP BY i.id, c.id;

-- =====================================================================
-- 9. AUTH FUNCTIONS
-- The API role has NO direct access to auth.* tables. It can only call these.
-- =====================================================================

-- Login step 1: fetch the stored hash so the backend can verify the password (Argon2id verify happens in the backend).
CREATE FUNCTION auth.get_credentials(p_email text)
RETURNS TABLE (user_id uuid, password_hash text, role auth.user_role, status auth.user_status,
               locked_until timestamptz, failed_login_count integer)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
  SELECT u.id, u.password_hash, u.role, u.status, u.locked_until, u.failed_login_count
  FROM auth.users u
  WHERE u.email = lower(btrim(p_email)) AND u.deleted_at IS NULL
$$;

-- Login step 2: record the outcome. 5 failures lock the account for 15 minutes.
-- The backend should check locked_until BEFORE verifying and skip this call while locked,
-- otherwise an attacker could keep a victim locked out forever.
CREATE FUNCTION auth.record_login_result(p_email text, p_success boolean, p_ip inet DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  INSERT INTO auth.login_attempts (email, ip, success) VALUES (left(v_email, 254), p_ip, p_success);
  IF p_success THEN
    UPDATE auth.users
       SET failed_login_count = 0, locked_until = NULL, last_login_at = now()
     WHERE email = v_email AND deleted_at IS NULL;
  ELSE
    UPDATE auth.users
       SET failed_login_count = failed_login_count + 1,
           locked_until = CASE WHEN failed_login_count + 1 >= 5
                               THEN now() + interval '15 minutes' ELSE locked_until END
     WHERE email = v_email AND deleted_at IS NULL;
  END IF;
END
$$;

-- Sign-up: customers only. (There is deliberately no way to pick the role.)
CREATE FUNCTION auth.create_user(p_email text, p_full_name text, p_password_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth, rental
AS $$
DECLARE
  v_id    uuid;
  v_email text := lower(btrim(p_email));
  v_name  text := btrim(p_full_name);
BEGIN
  IF p_password_hash IS NULL THEN
    RAISE EXCEPTION 'password hash is required' USING ERRCODE = '22004';
  END IF;
  INSERT INTO auth.users (email, full_name, password_hash, role)
  VALUES (v_email, v_name, p_password_hash, 'customer')
  RETURNING id INTO v_id;                       -- duplicate email => unique_violation (23505)
  INSERT INTO rental.customers (user_id, full_name, email) VALUES (v_id, v_name, v_email);
  INSERT INTO rental.user_preferences (user_id) VALUES (v_id);
  RETURN v_id;
END
$$;

-- Admin accounts are created by the DBA only (not granted to the API role).
CREATE FUNCTION auth.create_admin_user(p_email text, p_full_name text, p_password_hash text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = pg_catalog, auth, rental
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_password_hash IS NULL THEN
    RAISE EXCEPTION 'password hash is required' USING ERRCODE = '22004';
  END IF;
  INSERT INTO auth.users (email, full_name, password_hash, role, email_verified_at)
  VALUES (lower(btrim(p_email)), btrim(p_full_name), p_password_hash, 'admin', now())
  RETURNING id INTO v_id;
  INSERT INTO rental.user_preferences (user_id) VALUES (v_id);
  RETURN v_id;
END
$$;

-- "Continue with Google / Facebook". The backend must have verified the provider token itself.
-- Mirrors the front-end rules: unverified email => refused; admin accounts => password only.
CREATE FUNCTION auth.login_with_identity(p_provider auth.identity_provider, p_provider_user_id text,
                                         p_email text, p_full_name text, p_email_verified boolean)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth, rental
AS $$
DECLARE
  v_user  auth.users;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name  text := btrim(coalesce(p_full_name, ''));
BEGIN
  SELECT u.* INTO v_user
  FROM auth.identities i
  JOIN auth.users u ON u.id = i.user_id
  WHERE i.provider = p_provider AND i.provider_user_id = p_provider_user_id AND u.deleted_at IS NULL;
  IF FOUND THEN
    IF v_user.status <> 'active' THEN
      RAISE EXCEPTION 'account is suspended' USING ERRCODE = '42501';
    END IF;
    RETURN v_user.id;
  END IF;

  IF NOT coalesce(p_email_verified, false) OR v_email = '' THEN
    RAISE EXCEPTION 'the provider did not return a verified email address' USING ERRCODE = '22023';
  END IF;

  SELECT u.* INTO v_user FROM auth.users u WHERE u.email = v_email AND u.deleted_at IS NULL;
  IF FOUND THEN
    IF v_user.role = 'admin' THEN
      RAISE EXCEPTION 'this account can only sign in with its password' USING ERRCODE = '42501';
    END IF;
    IF v_user.status <> 'active' THEN
      RAISE EXCEPTION 'account is suspended' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF v_name = '' THEN v_name := split_part(v_email, '@', 1); END IF;
    INSERT INTO auth.users (email, full_name, password_hash, email_verified_at)
    VALUES (v_email, v_name, NULL, now())
    RETURNING * INTO v_user;
    INSERT INTO rental.customers (user_id, full_name, email) VALUES (v_user.id, v_name, v_email);
    INSERT INTO rental.user_preferences (user_id) VALUES (v_user.id);
  END IF;

  INSERT INTO auth.identities (user_id, provider, provider_user_id)
  VALUES (v_user.id, p_provider, p_provider_user_id);
  RETURN v_user.id;
END
$$;

-- Internal helper (not granted to the API role): set a new password and kill every session / open reset link.
CREATE FUNCTION auth.set_password(p_user_id uuid, p_new_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
BEGIN
  UPDATE auth.users
     SET password_hash = p_new_hash, password_changed_at = now(),
         failed_login_count = 0, locked_until = NULL
   WHERE id = p_user_id AND deleted_at IS NULL;
  UPDATE auth.sessions SET revoked_at = now() WHERE user_id = p_user_id AND revoked_at IS NULL;
  UPDATE auth.password_reset_tokens SET used_at = now() WHERE user_id = p_user_id AND used_at IS NULL;
END
$$;

-- profile.html "Change password": the backend verifies the CURRENT password, then passes the
-- stored hash back as proof. Returns false if the hash no longer matches.
CREATE FUNCTION auth.change_password(p_user_id uuid, p_current_hash text, p_new_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
BEGIN
  PERFORM 1 FROM auth.users
   WHERE id = p_user_id AND password_hash = p_current_hash AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM auth.set_password(p_user_id, p_new_hash);
  RETURN true;
END
$$;

-- forgotpassword: returns true only when a link was really created. The backend e-mails the link
-- only then, but shows the SAME message to the visitor either way (no account enumeration).
-- Rules copied from the front-end: link valid 30 min, one request per 60 s.
CREATE FUNCTION auth.create_reset_token(p_email text, p_token_hash bytea,
                                        p_ttl interval DEFAULT interval '30 minutes',
                                        p_ip inet DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
DECLARE
  v_user_id uuid;
  v_last    timestamptz;
BEGIN
  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE u.email = lower(btrim(p_email)) AND u.deleted_at IS NULL
    AND u.status = 'active' AND u.password_hash IS NOT NULL;
  IF v_user_id IS NULL THEN RETURN false; END IF;

  SELECT max(t.created_at) INTO v_last FROM auth.password_reset_tokens t WHERE t.user_id = v_user_id;
  IF v_last IS NOT NULL AND v_last > now() - interval '60 seconds' THEN RETURN false; END IF;

  UPDATE auth.password_reset_tokens SET used_at = now() WHERE user_id = v_user_id AND used_at IS NULL;
  INSERT INTO auth.password_reset_tokens (user_id, token_hash, expires_at, requested_ip)
  VALUES (v_user_id, p_token_hash, now() + least(p_ttl, interval '60 minutes'), p_ip);
  RETURN true;
END
$$;

-- resetpassword: valid once, atomically.
CREATE FUNCTION auth.consume_reset_token(p_token_hash bytea, p_new_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
DECLARE
  v_tok auth.password_reset_tokens;
BEGIN
  SELECT t.* INTO v_tok
  FROM auth.password_reset_tokens t
  WHERE t.token_hash = p_token_hash AND t.used_at IS NULL AND t.expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM auth.set_password(v_tok.user_id, p_new_hash);   -- also marks this token used
  RETURN true;
END
$$;

-- Sessions (the backend stores SHA-256(token) here, the raw token only goes to the browser cookie).
-- Lifetime caps: 12 h normally, 30 days with "remember me". Tune to taste.
CREATE FUNCTION auth.create_session(p_user_id uuid, p_token_hash bytea, p_ttl interval,
                                    p_remember boolean DEFAULT false, p_ip inet DEFAULT NULL,
                                    p_user_agent text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
DECLARE
  v_id  uuid;
  v_cap interval := CASE WHEN p_remember THEN interval '30 days' ELSE interval '12 hours' END;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users u
                 WHERE u.id = p_user_id AND u.status = 'active' AND u.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'user cannot log in' USING ERRCODE = '42501';
  END IF;
  INSERT INTO auth.sessions (user_id, token_hash, remember, expires_at, ip, user_agent)
  VALUES (p_user_id, p_token_hash, coalesce(p_remember, false), now() + least(p_ttl, v_cap), p_ip, left(p_user_agent, 512))
  RETURNING id INTO v_id;
  RETURN v_id;
END
$$;

-- Returns one row if the session is valid (not expired, not revoked, user still active), none otherwise.
CREATE FUNCTION auth.validate_session(p_token_hash bytea)
RETURNS TABLE (user_id uuid, role auth.user_role, session_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
BEGIN
  RETURN QUERY
  WITH upd AS (
    UPDATE auth.sessions s
       SET last_seen_at = CASE WHEN s.last_seen_at < now() - interval '1 minute'
                               THEN now() ELSE s.last_seen_at END
      FROM auth.users u
     WHERE s.token_hash = p_token_hash
       AND s.revoked_at IS NULL
       AND s.expires_at > now()
       AND u.id = s.user_id
       AND u.status = 'active'
       AND u.deleted_at IS NULL
    RETURNING u.id AS uid, u.role AS urole, s.id AS sid
  )
  SELECT uid, urole, sid FROM upd;
END
$$;

CREATE FUNCTION auth.revoke_session(p_token_hash bytea)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
  UPDATE auth.sessions SET revoked_at = now() WHERE token_hash = p_token_hash AND revoked_at IS NULL
$$;

-- Housekeeping: schedule daily (pg_cron or a backend job).
CREATE FUNCTION auth.purge_expired()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, auth
AS $$
BEGIN
  DELETE FROM auth.login_attempts WHERE attempted_at < now() - interval '90 days';
  DELETE FROM auth.sessions WHERE expires_at < now() - interval '30 days' OR revoked_at < now() - interval '30 days';
  DELETE FROM auth.password_reset_tokens WHERE expires_at < now() - interval '7 days';
END
$$;

COMMIT;

RESET ROLE;
RESET search_path;

\echo 'Schema created. Next: 02_security.sql'
