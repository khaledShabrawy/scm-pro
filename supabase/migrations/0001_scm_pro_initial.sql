-- ============================================================
-- SCM Pro — Initial Schema Migration
-- APICS CPIM V8.1 Compliant Supply Chain Intelligence Platform
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Demand Forecast ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demand_forecast (
  id          SERIAL PRIMARY KEY,
  month       TEXT        NOT NULL,            -- "Jan 25"
  actual      NUMERIC,                          -- null for future months
  forecast    NUMERIC     NOT NULL,
  last_year   NUMERIC,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Inventory Items ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id          SERIAL PRIMARY KEY,
  sku         TEXT        NOT NULL UNIQUE,      -- "SKU-001"
  name        TEXT        NOT NULL,
  sl          INTEGER     NOT NULL DEFAULT 95,  -- service level %
  d_avg       NUMERIC     NOT NULL,             -- avg daily demand (units)
  sigma_d     NUMERIC     NOT NULL,             -- demand std dev
  lt          INTEGER     NOT NULL,             -- lead time (days)
  sigma_lt    NUMERIC     NOT NULL DEFAULT 0,   -- lead time std dev
  unit_cost   NUMERIC     NOT NULL,             -- EGP
  on_hand     NUMERIC     NOT NULL DEFAULT 0,
  status      TEXT        NOT NULL DEFAULT 'OK'
                CHECK (status IN ('OK','Low','Reorder')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── S&OP Balance ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sop_balance (
  id          SERIAL PRIMARY KEY,
  month       TEXT        NOT NULL UNIQUE,      -- "Jan"
  forecast    INTEGER     NOT NULL,
  supply      INTEGER     NOT NULL,
  gap         INTEGER     GENERATED ALWAYS AS (supply - forecast) STORED,
  opening_inv INTEGER     NOT NULL DEFAULT 0,
  closing_inv INTEGER     NOT NULL DEFAULT 0,
  backlog     INTEGER     NOT NULL DEFAULT 0,
  sales_actual INTEGER,                         -- null for future
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Supply Plan (LP variables) ─────────────────────────────
CREATE TABLE IF NOT EXISTS supply_plan (
  id            SERIAL PRIMARY KEY,
  variable      TEXT        NOT NULL UNIQUE,
  qty           NUMERIC     NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC     NOT NULL DEFAULT 0,
  total_cost    NUMERIC     GENERATED ALWAYS AS (qty * cost_per_unit) STORED,
  status        TEXT        NOT NULL DEFAULT 'Active'
                CHECK (status IN ('Active','Idle','At Capacity')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Customers (Route Planning / Beat Plan) ─────────────────
CREATE TABLE IF NOT EXISTS customers (
  id          TEXT        PRIMARY KEY,          -- "C01"
  name        TEXT        NOT NULL,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  rep_id      TEXT        NOT NULL,             -- "R1"–"R6"
  type        TEXT        NOT NULL
                CHECK (type IN ('Supermarket','Grocery','Kiosk','Horeca','Pharmacy','Wholesale')),
  visit_days  TEXT[]      NOT NULL DEFAULT '{}',
  freq        TEXT        NOT NULL DEFAULT 'W'
                CHECK (freq IN ('W','B','M')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Territory Polygons ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS territories (
  id              SERIAL PRIMARY KEY,
  rep_id          TEXT        NOT NULL UNIQUE,  -- "R1"–"R6"
  polygon_coords  JSONB       NOT NULL DEFAULT '[]',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Alerts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  level     TEXT        NOT NULL CHECK (level IN ('high','medium','low')),
  msg       TEXT        NOT NULL,
  page      TEXT        NOT NULL,
  resolved  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Settings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id                    TEXT PRIMARY KEY DEFAULT 'default',
  service_level         INTEGER  NOT NULL DEFAULT 95,
  holding_rate          NUMERIC  NOT NULL DEFAULT 25,
  order_cost            NUMERIC  NOT NULL DEFAULT 850,
  lead_time_days        INTEGER  NOT NULL DEFAULT 14,
  lead_time_sigma       NUMERIC  NOT NULL DEFAULT 2,
  ts_alert_threshold    NUMERIC  NOT NULL DEFAULT 4,
  mape_alert_threshold  NUMERIC  NOT NULL DEFAULT 15,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- ─── updated_at triggers ─────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'demand_forecast','inventory_items','sop_balance',
    'supply_plan','territories','settings'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at
      BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- ─── Row-Level Security ───────────────────────────────────────
ALTER TABLE demand_forecast  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_balance      ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_plan      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings         ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated read on all tables
CREATE POLICY "read_all" ON demand_forecast  FOR SELECT USING (true);
CREATE POLICY "read_all" ON inventory_items  FOR SELECT USING (true);
CREATE POLICY "read_all" ON sop_balance      FOR SELECT USING (true);
CREATE POLICY "read_all" ON supply_plan      FOR SELECT USING (true);
CREATE POLICY "read_all" ON customers        FOR SELECT USING (true);
CREATE POLICY "read_all" ON territories      FOR SELECT USING (true);
CREATE POLICY "read_all" ON alerts           FOR SELECT USING (true);
CREATE POLICY "read_all" ON settings         FOR SELECT USING (true);

-- Authenticated users can write
CREATE POLICY "auth_write" ON demand_forecast  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_write" ON inventory_items  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_write" ON sop_balance      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_write" ON supply_plan      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_write" ON customers        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_write" ON territories      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_write" ON alerts           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_write" ON settings         FOR ALL USING (auth.role() = 'authenticated');
