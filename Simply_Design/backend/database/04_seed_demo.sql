-- =====================================================================
-- Simply Design - 04_seed_demo.sql   (OPTIONAL - sample data, do NOT load in production)
-- The 15 catalogue items from items.js and sample customers/rentals from the admin pages.
-- Requires 03_seed_reference.sql. Run once.
--
--     psql -U postgres -d simply_design -f 04_seed_demo.sql
-- =====================================================================
\set ON_ERROR_STOP on

SET ROLE sd_owner;
BEGIN;

-- Admin context so explicit rental refs are accepted (see rentals_before_insert)
SELECT app.set_context(NULL, 'admin');

-- Items, inserted in this order so the generated codes match items.js
-- (LGBLUE0001, LGBLUE0002, LGBLUE0003, LGGREE0001, ...).
INSERT INTO rental.items (name, description, category_id, size_code, color)
SELECT v.color || ' ' || c.name, v.descr, c.id, v.sz, v.color
FROM (VALUES
  ( 1, 'LG', 'Blue',  'M',  'Blue light Long Gown'),
  ( 2, 'LG', 'Blue',  'S',  NULL),
  ( 3, 'LG', 'Blue',  'L',  NULL),
  ( 4, 'LG', 'Green', 'M',  NULL),
  ( 5, 'LG', 'Green', 'XL', NULL),
  ( 6, 'CD', 'Red',   'S',  NULL),
  ( 7, 'CD', 'Red',   'M',  NULL),
  ( 8, 'CD', 'Blue',  'L',  NULL),
  ( 9, 'CD', 'Blue',  'S',  NULL),
  (10, 'CD', 'Green', 'M',  NULL),
  (11, 'MS', 'Black', 'L',  NULL),
  (12, 'MS', 'Black', 'XL', NULL),
  (13, 'MS', 'Blue',  'M',  NULL),
  (14, 'MS', 'Blue',  'L',  NULL),
  (15, 'MS', 'Green', 'M',  NULL)
) AS v(ord, cat, color, sz, descr)
JOIN rental.categories c ON c.code = v.cat
ORDER BY v.ord;

DO $do$
DECLARE
  v_codes text[];
BEGIN
  SELECT array_agg(code ORDER BY id) INTO v_codes FROM rental.items;
  IF v_codes IS DISTINCT FROM ARRAY[
       'LGBLUE0001','LGBLUE0002','LGBLUE0003','LGGREE0001','LGGREE0002',
       'CDRED0001','CDRED0002','CDBLUE0001','CDBLUE0002','CDGREE0001',
       'MSBLAC0001','MSBLAC0002','MSBLUE0001','MSBLUE0002','MSGREE0001'] THEN
    RAISE EXCEPTION 'unexpected item codes: %', v_codes;
  END IF;
END
$do$;

-- Sample walk-in customers (customers.html). Emails use example.com on purpose.
INSERT INTO rental.customers (full_name, email, phone, barangay, city, province) VALUES
  ('Christine Luna', 'christineluna@example.com', '09171234567', 'Alitao',       'Tayabas', 'Quezon'),
  ('Maria Santos',   'maria32@example.com',       '09181234567', 'Ilasan Ibaba', 'Tayabas', 'Quezon'),
  ('Ana Reyes',      'analynmhok01@example.com',  '09191234567', 'Alitao',       'Tayabas', 'Quezon');

-- Rentals: the first three are the rows on rentals.html; the rest are the "booked" ranges from
-- items.js plus one future reservation.
INSERT INTO rental.rentals (ref, customer_id, item_id, pickup_date, return_date, status,
                            rental_fee, picked_up_at, returned_at)
SELECT v.ref, c.id, i.id, v.pickup::date, v.ret::date, v.st::rental.rental_status, v.fee,
       v.picked::timestamptz, v.returned::timestamptz
FROM (VALUES
  ('SD-2026-0913', 'Christine Luna', 'LGBLUE0001', '2026-09-14', '2026-09-21', 'returned', 4500, '2026-09-14 09:00+08', '2026-09-21 10:00+08'),
  ('SD-2026-0912', 'Maria Santos',   'CDRED0001',  '2026-09-12', '2026-09-15', 'active',   1200, '2026-09-12 09:00+08', NULL),
  ('SD-2026-0908', 'Ana Reyes',      'MSBLAC0002', '2026-09-08', '2026-09-12', 'active',   3500, '2026-09-08 09:00+08', NULL),
  ('SD-2026-0905', 'Christine Luna', 'LGBLUE0002', '2026-10-08', '2026-10-12', 'returned', 1500, '2026-10-08 09:00+08', '2026-10-12 10:00+08'),
  ('SD-2026-0906', 'Maria Santos',   'CDRED0001',  '2026-10-01', '2026-10-04', 'returned', 1500, '2026-10-01 09:00+08', '2026-10-04 10:00+08'),
  ('SD-2026-0907', 'Ana Reyes',      'MSBLAC0002', '2026-10-15', '2026-10-18', 'returned', 1500, '2026-10-15 09:00+08', '2026-10-18 10:00+08'),
  ('SD-2026-0911', 'Christine Luna', 'LGGREE0001', '2026-11-05', '2026-11-08', 'reserved', 1500, NULL, NULL)
) AS v(ref, cust, code, pickup, ret, st, fee, picked, returned)
JOIN rental.customers c ON c.full_name = v.cust
JOIN rental.items i     ON i.code = v.code;

-- Payments (everything paid except the future reservation, which is pending GCash)
INSERT INTO rental.payments (rental_id, method, status, amount, paid_at)
SELECT r.id, v.m::rental.payment_method, v.s::rental.payment_state, r.total_amount,
       CASE WHEN v.s = 'paid' THEN (r.pickup_date + time '09:30') AT TIME ZONE 'Asia/Manila' END
FROM (VALUES
  ('SD-2026-0913', 'gcash', 'paid'),
  ('SD-2026-0912', 'cash',  'paid'),
  ('SD-2026-0908', 'cash',  'paid'),
  ('SD-2026-0905', 'cash',  'paid'),
  ('SD-2026-0906', 'cash',  'paid'),
  ('SD-2026-0907', 'cash',  'paid'),
  ('SD-2026-0911', 'gcash', 'pending')
) AS v(ref, m, s)
JOIN rental.rentals r ON r.ref = v.ref;

-- Make the generator continue after the highest imported reference (next = SD-2026-0914)
INSERT INTO rental.rental_ref_counters (year, last_seq) VALUES (2026, 913)
ON CONFLICT (year) DO UPDATE SET last_seq = greatest(rental.rental_ref_counters.last_seq, excluded.last_seq);

COMMIT;
RESET ROLE;
\echo 'Demo data loaded (15 items, 3 customers, 7 rentals).'
