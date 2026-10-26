-- =====================================================================
-- Simply Design - 99_smoke_test.sql
-- Verifies the schema behaves as designed. Everything is rolled back at the end.
-- Run as a SUPERUSER (it uses SET ROLE), after 00-03 (not needed: 04):
--
--     psql -U postgres -d simply_design -f 99_smoke_test.sql
--
-- Success = it prints "ALL TESTS PASSED". Any failure stops with "TEST FAILED: ...".
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;

-- ---------- fixtures (as owner) ----------
SET LOCAL ROLE sd_owner;

-- Fake but well-formed Argon2id hashes (the DB only checks the format).
SELECT set_config('t.alice', auth.create_user('alice@example.com', 'Alice Test',
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g')::text, true);
SELECT set_config('t.bob', auth.create_user('bob@example.com', 'Bob Test',
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g')::text, true);
SELECT set_config('t.admin', auth.create_admin_user('admin-test@example.com', 'Admin Test',
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g')::text, true);

-- 1. plaintext passwords are rejected
DO $t$
BEGIN
  BEGIN
    PERFORM auth.create_user('plain@example.com', 'Plain', 'hunter2hunter2hunter2hunter2hunter2hunter2hunter2');
    RAISE EXCEPTION 'TEST FAILED: plaintext password was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END
$t$;

-- 2. login lockout after 5 failures, and reset-token cooldown
DO $t$
DECLARE
  i integer;
  v_locked timestamptz;
  v_first boolean;
  v_second boolean;
BEGIN
  FOR i IN 1..5 LOOP
    PERFORM auth.record_login_result('alice@example.com', false, '10.0.0.1');
  END LOOP;
  SELECT locked_until INTO v_locked FROM auth.get_credentials('alice@example.com');
  IF v_locked IS NULL OR v_locked <= now() THEN RAISE EXCEPTION 'TEST FAILED: account was not locked'; END IF;

  v_first  := auth.create_reset_token('bob@example.com', decode(repeat('ab', 32), 'hex'));
  v_second := auth.create_reset_token('bob@example.com', decode(repeat('cd', 32), 'hex'));
  IF NOT v_first OR v_second THEN RAISE EXCEPTION 'TEST FAILED: reset cooldown not enforced'; END IF;
  IF auth.create_reset_token('nobody@example.com', decode(repeat('ef', 32), 'hex')) THEN
    RAISE EXCEPTION 'TEST FAILED: reset token created for unknown email';
  END IF;
END
$t$;

-- 3. API role cannot read credentials directly
SET LOCAL ROLE sd_app;
DO $t$
BEGIN
  BEGIN
    PERFORM password_hash FROM auth.users;
    RAISE EXCEPTION 'TEST FAILED: sd_app can read auth.users';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$t$;

-- 4. admin creates an item; code is generated, price comes from the category
SELECT app.set_context(current_setting('t.admin')::uuid, 'admin');
WITH ins AS (
  INSERT INTO rental.items (name, category_id, size_code, color)
  SELECT 'Test Pink Gown', c.id, 'M', 'Pink' FROM rental.categories c WHERE c.code = 'LG'
  RETURNING id
)
SELECT set_config('t.item', id::text, true) FROM ins;
DO $t$
DECLARE
  v_code text;
  v_price numeric;
BEGIN
  SELECT code, rental_price INTO v_code, v_price FROM rental.items WHERE id = current_setting('t.item')::bigint;
  IF v_code <> 'LGPINK0001' OR v_price <> 1500 THEN
    RAISE EXCEPTION 'TEST FAILED: item defaults wrong (% / %)', v_code, v_price;
  END IF;
END
$t$;

-- 5. a customer can only create a plain reservation for themselves, at the catalogue price
SELECT app.set_context(current_setting('t.alice')::uuid, 'customer');
INSERT INTO rental.rentals (customer_id, item_id, pickup_date, return_date)
SELECT c.id, current_setting('t.item')::bigint, current_date + 10, current_date + 12
FROM rental.customers c WHERE c.user_id = current_setting('t.alice')::uuid;

DO $t$
DECLARE
  v_ref text;
  v_fee numeric;
BEGIN
  SELECT ref, rental_fee INTO v_ref, v_fee FROM rental.rentals;
  IF v_ref !~ '^SD-[0-9]{4}-[0-9]{4}$' OR v_fee <> 1500 THEN
    RAISE EXCEPTION 'TEST FAILED: rental defaults wrong (% / %)', v_ref, v_fee;
  END IF;

  -- cheating on the price is blocked by row-level security
  BEGIN
    INSERT INTO rental.rentals (customer_id, item_id, pickup_date, return_date, rental_fee)
    SELECT c.id, current_setting('t.item')::bigint, current_date + 20, current_date + 21, 1
    FROM rental.customers c WHERE c.user_id = current_setting('t.alice')::uuid;
    RAISE EXCEPTION 'TEST FAILED: customer set their own price';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- a customer cannot change the status of a rental (zero rows are visible to UPDATE)
  UPDATE rental.rentals SET status = 'returned' WHERE item_id = current_setting('t.item')::bigint;
  IF FOUND THEN RAISE EXCEPTION 'TEST FAILED: customer updated a rental'; END IF;
END
$t$;

-- 6. Bob cannot see Alice's rental, nor book the same dates (double booking)
SELECT app.set_context(current_setting('t.bob')::uuid, 'customer');
DO $t$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM rental.rentals;
  IF n <> 0 THEN RAISE EXCEPTION 'TEST FAILED: Bob sees % rentals of other people', n; END IF;

  IF NOT rental.item_is_booked(current_setting('t.item')::bigint, current_date + 11, current_date + 11) THEN
    RAISE EXCEPTION 'TEST FAILED: availability check did not see the existing booking';
  END IF;

  BEGIN
    INSERT INTO rental.rentals (customer_id, item_id, pickup_date, return_date)
    SELECT c.id, current_setting('t.item')::bigint, current_date + 11, current_date + 13
    FROM rental.customers c WHERE c.user_id = current_setting('t.bob')::uuid;
    RAISE EXCEPTION 'TEST FAILED: double booking was allowed';
  EXCEPTION WHEN exclusion_violation THEN NULL;
  END;
END
$t$;

-- 7. admin: invalid status jump is refused; valid flow works and syncs the item status
SELECT app.set_context(current_setting('t.admin')::uuid, 'admin');
DO $t$
DECLARE
  v_item rental.item_status;
BEGIN
  BEGIN
    UPDATE rental.rentals SET status = 'returned' WHERE item_id = current_setting('t.item')::bigint;
    RAISE EXCEPTION 'TEST FAILED: reserved -> returned was allowed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  UPDATE rental.rentals SET status = 'active' WHERE item_id = current_setting('t.item')::bigint;
  SELECT status INTO v_item FROM rental.items WHERE id = current_setting('t.item')::bigint;
  IF v_item <> 'rented' THEN RAISE EXCEPTION 'TEST FAILED: item not marked rented'; END IF;

  UPDATE rental.rentals SET status = 'returned' WHERE item_id = current_setting('t.item')::bigint;
  SELECT status INTO v_item FROM rental.items WHERE id = current_setting('t.item')::bigint;
  IF v_item <> 'available' THEN RAISE EXCEPTION 'TEST FAILED: item not released after return'; END IF;
END
$t$;

-- 8. the audit log recorded the changes and cannot be altered
RESET ROLE;
SET LOCAL ROLE sd_owner;
DO $t$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM audit.audit_log WHERE table_name = 'rentals';
  IF n < 3 THEN RAISE EXCEPTION 'TEST FAILED: audit log has only % rental rows', n; END IF;

  IF EXISTS (SELECT 1 FROM audit.audit_log WHERE new_data ? 'password_hash' OR old_data ? 'password_hash') THEN
    RAISE EXCEPTION 'TEST FAILED: a password hash leaked into the audit log';
  END IF;

  BEGIN
    DELETE FROM audit.audit_log;
    RAISE EXCEPTION 'TEST FAILED: audit log rows could be deleted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$t$;

\echo 'ALL TESTS PASSED'
ROLLBACK;
