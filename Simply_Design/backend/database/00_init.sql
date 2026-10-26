-- =====================================================================
-- Simply Design - 00_init.sql
-- Run ONCE as a PostgreSQL superuser, connected to the default database:
--
--     psql -U postgres -f 00_init.sql
--
-- Creates the roles, the database and the hardening defaults.
-- Targets PostgreSQL 15+ (needs security_invoker views); written for 18.
-- =====================================================================
\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------
-- Roles (least privilege)
--   sd_owner : owns every object. NOLOGIN. Used only to run migrations
--              (via SET ROLE). The application must NEVER connect as it,
--              because owners bypass row-level security.
--   sd_app   : privilege group for the backend API. NOLOGIN.
--   sd_api   : the login role your backend connects with (member of sd_app).
--              No password is set here - see README ("set the password").
-- None of them is superuser / createdb / createrole / bypassrls.
-- ---------------------------------------------------------------------
DO $do$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sd_owner') THEN
    CREATE ROLE sd_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sd_app') THEN
    CREATE ROLE sd_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sd_api') THEN
    CREATE ROLE sd_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS CONNECTION LIMIT 50;
  END IF;
END
$do$;

GRANT sd_app TO sd_api;

-- ---------------------------------------------------------------------
-- Database (created only if it does not exist yet)
-- ---------------------------------------------------------------------
SELECT 'CREATE DATABASE simply_design OWNER sd_owner ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'simply_design')
\gexec

\connect simply_design

-- Nobody connects unless explicitly allowed.
REVOKE ALL ON DATABASE simply_design FROM PUBLIC;
GRANT CONNECT ON DATABASE simply_design TO sd_owner, sd_app;

-- Shop is in Tayabas, PH: store timestamptz, show Manila time by default.
ALTER DATABASE simply_design SET timezone TO 'Asia/Manila';

-- The default "public" schema must not be writable by everyone.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Extensions live in their own schema, not in public.
CREATE SCHEMA IF NOT EXISTS extensions AUTHORIZATION sd_owner;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;   -- used for the "no double booking" constraint
GRANT USAGE ON SCHEMA extensions TO sd_app;

-- Functions created by sd_owner are NOT executable by PUBLIC unless granted.
ALTER DEFAULT PRIVILEGES FOR ROLE sd_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Guard rails for the backend connection.
ALTER ROLE sd_api IN DATABASE simply_design SET statement_timeout = '15s';
ALTER ROLE sd_api IN DATABASE simply_design SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE sd_api IN DATABASE simply_design SET lock_timeout = '5s';
ALTER ROLE sd_api IN DATABASE simply_design SET search_path = rental, app, extensions;

\echo
\echo 'Done. Next: set the sd_api password (see README), then run 01_schema.sql'
