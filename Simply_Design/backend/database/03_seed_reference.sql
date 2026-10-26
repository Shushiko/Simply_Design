-- =====================================================================
-- Simply Design - 03_seed_reference.sql   (REQUIRED, safe to re-run)
-- Categories, sizes, branch and business settings taken from the front-end.
--
--     psql -U postgres -d simply_design -f 03_seed_reference.sql
-- =====================================================================
\set ON_ERROR_STOP on

SET ROLE sd_owner;
BEGIN;

-- Buy prices come from BUY_PRICE in items.js; rental price is 1500 for every type.
INSERT INTO rental.categories (code, name, default_rental_price, default_buy_price, sort_order) VALUES
  ('LG', 'Long Gown',      1500, 8500, 1),
  ('CD', 'Cocktail Dress', 1500, 6500, 2),
  ('MS', 'Men Suit',       1500, 9500, 3)
ON CONFLICT (code) DO NOTHING;

-- Waistlines come from WAISTLINE in items.js. XS exists in the admin form but has no measurement yet.
INSERT INTO rental.sizes (code, sort_order, waist_min_in, waist_max_in) VALUES
  ('XS', 1, NULL, NULL),
  ('S',  2, 20, 26),
  ('M',  3, 23, 29),
  ('L',  4, 26, 32),
  ('XL', 5, 29, 35)
ON CONFLICT (code) DO NOTHING;

INSERT INTO rental.branches (name, address, city)
VALUES ('Tayabas', 'Juan Street, Tayabas City', 'Tayabas')
ON CONFLICT (name) DO NOTHING;

-- Values shown on settings.html. (contact.js shows a different phone/email - decide which is right.)
INSERT INTO rental.business_settings
  (business_name, email, phone, address, gcash_number, late_fee_per_day, damage_fee_min)
VALUES
  ('Simply Design by Jun Tabi', 'admin@rentaltrack.com', '+63 980-108-5346',
   'Juan Street, Tayabas City', '09171234567', 15, 50)
ON CONFLICT (id) DO NOTHING;

COMMIT;
RESET ROLE;
\echo 'Reference data loaded.'
