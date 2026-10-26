-- =====================================================================
-- Simply Design - 02_security.sql
-- Privileges, row-level security (RLS) and the tamper-resistant audit log.
-- Run after 01_schema.sql, same way:
--
--     psql -U postgres -d simply_design -f 02_security.sql
-- =====================================================================
\set ON_ERROR_STOP on

SET ROLE sd_owner;
SET search_path = pg_catalog, extensions;

BEGIN;

-- =====================================================================
-- 1. AUDIT LOG  (append-only)
-- =====================================================================
CREATE SCHEMA audit;

CREATE TABLE audit.audit_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  table_schema  text NOT NULL,
  table_name    text NOT NULL,
  operation     text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id     text,
  actor_user_id text,                              -- app user (from app.set_context), if any
  actor_role    text,
  db_user       text NOT NULL DEFAULT session_user,
  old_data      jsonb,
  new_data      jsonb
);
CREATE INDEX audit_log_table_idx ON audit.audit_log (table_name, occurred_at DESC);
CREATE INDEX audit_log_record_idx ON audit.audit_log (table_name, record_id);
CREATE INDEX audit_log_actor_idx ON audit.audit_log (actor_user_id, occurred_at DESC);

CREATE FUNCTION audit.log_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, audit
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD) - 'password_hash'; END IF;   -- hashes never reach the log
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW) - 'password_hash'; END IF;
  INSERT INTO audit.audit_log (table_schema, table_name, operation, record_id,
                               actor_user_id, actor_role, old_data, new_data)
  VALUES (TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, coalesce(v_new, v_old) ->> 'id',
          nullif(current_setting('app.user_id', true), ''),
          nullif(current_setting('app.role', true), ''),
          v_old, v_new);
  RETURN NULL;
END
$$;

CREATE FUNCTION audit.block_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit.audit_log is append-only' USING ERRCODE = '42501';
END
$$;
CREATE TRIGGER audit_log_no_update_delete BEFORE UPDATE OR DELETE ON audit.audit_log
  FOR EACH ROW EXECUTE FUNCTION audit.block_mutation();
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit.audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit.block_mutation();

-- Who changed what: accounts (only security-relevant columns, so logins don't spam the log),
-- customers, items, rentals, payments and the business settings.
CREATE TRIGGER audit_users AFTER INSERT OR DELETE OR UPDATE OF email, role, status, password_hash, deleted_at
  ON auth.users FOR EACH ROW EXECUTE FUNCTION audit.log_change();
CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON rental.customers
  FOR EACH ROW EXECUTE FUNCTION audit.log_change();
CREATE TRIGGER audit_items AFTER INSERT OR UPDATE OR DELETE ON rental.items
  FOR EACH ROW EXECUTE FUNCTION audit.log_change();
CREATE TRIGGER audit_rentals AFTER INSERT OR UPDATE OR DELETE ON rental.rentals
  FOR EACH ROW EXECUTE FUNCTION audit.log_change();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON rental.payments
  FOR EACH ROW EXECUTE FUNCTION audit.log_change();
CREATE TRIGGER audit_business_settings AFTER INSERT OR UPDATE OR DELETE ON rental.business_settings
  FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- =====================================================================
-- 2. ROW-LEVEL SECURITY
-- Not FORCEd on purpose: the owner (sd_owner) and the SECURITY DEFINER functions bypass it,
-- everybody else - including the API role sd_api - is always filtered.
-- =====================================================================

-- 2a. Public read, admin-only write: catalogue & settings
DO $do$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories', 'sizes', 'branches', 'items', 'item_photos', 'business_settings'] LOOP
    EXECUTE format('ALTER TABLE rental.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON rental.%I FOR SELECT USING (true)', t || '_read', t);
    EXECUTE format('CREATE POLICY %I ON rental.%I FOR ALL USING (app.is_admin()) WITH CHECK (app.is_admin())',
                   t || '_admin_write', t);
  END LOOP;
END
$do$;

-- 2b. Customers: you see and edit your own record; admins see all. Only admins add walk-ins
--     (accounts are created through auth.create_user).
ALTER TABLE rental.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_select ON rental.customers FOR SELECT
  USING (app.is_admin() OR user_id = app.current_user_id());
CREATE POLICY customers_insert ON rental.customers FOR INSERT
  WITH CHECK (app.is_admin());
CREATE POLICY customers_update ON rental.customers FOR UPDATE
  USING (app.is_admin() OR user_id = app.current_user_id())
  WITH CHECK (app.is_admin() OR user_id = app.current_user_id());

-- 2c. Preferences: own row (admins too)
ALTER TABLE rental.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY prefs_select ON rental.user_preferences FOR SELECT
  USING (user_id = app.current_user_id() OR app.is_admin());
CREATE POLICY prefs_insert ON rental.user_preferences FOR INSERT
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
CREATE POLICY prefs_update ON rental.user_preferences FOR UPDATE
  USING (user_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());

-- 2d. Rentals: customers see their own; they can only create a plain reservation for THEMSELVES,
--     in the future, at the catalogue price, with no fees. Everything else is admin-only.
ALTER TABLE rental.rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY rentals_select ON rental.rentals FOR SELECT
  USING (app.is_admin()
         OR customer_id IN (SELECT c.id FROM rental.customers c WHERE c.user_id = app.current_user_id()));
CREATE POLICY rentals_insert ON rental.rentals FOR INSERT
  WITH CHECK (
    app.is_admin()
    OR (
      customer_id IN (SELECT c.id FROM rental.customers c WHERE c.user_id = app.current_user_id())
      AND status = 'reserved'
      AND late_fee = 0
      AND damage_fee = 0
      AND deleted_at IS NULL
      AND pickup_date >= current_date
      AND rental_fee = (SELECT i.rental_price FROM rental.items i WHERE i.id = item_id)
    )
  );
CREATE POLICY rentals_update ON rental.rentals FOR UPDATE
  USING (app.is_admin()) WITH CHECK (app.is_admin());

-- 2e. Payments: customers see payments of their own rentals and may only open a PENDING one.
--     Marking a payment paid / failed / refunded is admin-or-system only (e.g. gateway webhook).
ALTER TABLE rental.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_select ON rental.payments FOR SELECT
  USING (app.is_admin() OR rental_id IN (SELECT r.id FROM rental.rentals r));
CREATE POLICY payments_insert ON rental.payments FOR INSERT
  WITH CHECK (
    app.is_admin()
    OR (status = 'pending' AND paid_at IS NULL
        AND rental_id IN (SELECT r.id FROM rental.rentals r))
  );
CREATE POLICY payments_update ON rental.payments FOR UPDATE
  USING (app.is_admin()) WITH CHECK (app.is_admin());

-- 2f. Notifications: your own (you may mark them read); only the system/admin creates them
ALTER TABLE rental.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select ON rental.notifications FOR SELECT
  USING (user_id = app.current_user_id() OR app.is_admin());
CREATE POLICY notifications_insert ON rental.notifications FOR INSERT
  WITH CHECK (app.is_admin());
CREATE POLICY notifications_update ON rental.notifications FOR UPDATE
  USING (user_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());

-- =====================================================================
-- 3. PRIVILEGES  (default = nothing; grant only what the API needs)
-- =====================================================================

-- Start clean: no function is executable by PUBLIC
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app, auth, rental, audit FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA app, auth, rental, audit FROM PUBLIC;

GRANT USAGE ON SCHEMA app, auth, rental, extensions TO sd_app;
-- (no USAGE on audit: the API role cannot even see the audit schema)

-- Reference data & catalogue
GRANT SELECT ON rental.categories, rental.sizes, rental.branches TO sd_app;
GRANT SELECT, INSERT ON rental.items TO sd_app;
GRANT UPDATE (name, description, category_id, size_code, color, rental_price, buy_price,
              branch_id, status, deleted_at) ON rental.items TO sd_app;           -- 'code' can never change
GRANT SELECT, INSERT, DELETE ON rental.item_photos TO sd_app;
GRANT UPDATE (sort_order) ON rental.item_photos TO sd_app;
GRANT SELECT ON rental.business_settings TO sd_app;
GRANT UPDATE (business_name, email, phone, address, gcash_number, late_fee_per_day,
              damage_fee_min, logo_key, updated_by) ON rental.business_settings TO sd_app;

-- People
GRANT SELECT, INSERT ON rental.customers TO sd_app;
GRANT UPDATE (full_name, email, phone, gcash_number, address_line, barangay, city, province,
              avatar_key, deleted_at) ON rental.customers TO sd_app;               -- user_id cannot be re-linked
GRANT SELECT, INSERT ON rental.user_preferences TO sd_app;
GRANT UPDATE (notify_orders, notify_email, notify_new_rentals, notify_item_returns,
              notify_payment_received, notify_violations, dark_mode, language, currency)
  ON rental.user_preferences TO sd_app;

-- Rentals, payments, notifications (no DELETE anywhere: use deleted_at / status)
GRANT SELECT, INSERT ON rental.rentals TO sd_app;
GRANT UPDATE (item_id, pickup_date, return_date, status, renter_name, renter_phone, rental_fee,
              late_fee, damage_fee, damage_notes, picked_up_at, returned_at, deleted_at)
  ON rental.rentals TO sd_app;                                                       -- ref / customer_id are fixed
GRANT SELECT, INSERT ON rental.payments TO sd_app;
GRANT UPDATE (status, paid_at, gateway_ref, card_brand, card_last4, recorded_by) ON rental.payments TO sd_app;
GRANT SELECT, INSERT ON rental.notifications TO sd_app;
GRANT UPDATE (read_at) ON rental.notifications TO sd_app;

-- Views
GRANT SELECT ON rental.v_catalog, rental.v_rentals, rental.v_customer_summary, rental.v_dashboard_stats,
                rental.v_weekly_sales, rental.v_monthly_revenue, rental.v_inventory_performance TO sd_app;

-- Functions the API may call. NOTE: nothing in auth.* tables is reachable except through these.
GRANT EXECUTE ON FUNCTION
  app.set_context(uuid, text),
  app.current_user_id(),
  app.request_role(),
  app.is_admin(),
  rental.item_is_booked(bigint, date, date),
  rental.item_booked_ranges(bigint),
  rental.next_item_code(text),
  rental.next_rental_ref(),
  auth.get_credentials(text),
  auth.record_login_result(text, boolean, inet),
  auth.create_user(text, text, text),
  auth.login_with_identity(auth.identity_provider, text, text, text, boolean),
  auth.change_password(uuid, text, text),
  auth.create_reset_token(text, bytea, interval, inet),
  auth.consume_reset_token(bytea, text),
  auth.create_session(uuid, bytea, interval, boolean, inet, text),
  auth.validate_session(bytea),
  auth.revoke_session(bytea),
  auth.purge_expired()
TO sd_app;
-- Deliberately NOT granted: auth.create_admin_user, auth.set_password, the counter tables, audit.*

COMMIT;

RESET ROLE;
RESET search_path;

\echo 'Security layer installed. Next: 03_seed_reference.sql (required) and 04_seed_demo.sql (optional sample data)'
