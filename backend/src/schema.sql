-- TradeLink schema (idempotent)

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  role         TEXT NOT NULL CHECK (role IN ('customer', 'tradesperson')),
  name         TEXT NOT NULL,
  email        TEXT UNIQUE,
  phone        TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  location     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tradesperson_profiles (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,
  skills       TEXT,
  bio          TEXT,
  rating       NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  jobs_done    INTEGER NOT NULL DEFAULT 0,
  verified     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id                SERIAL PRIMARY KEY,
  customer_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category          TEXT NOT NULL,
  description       TEXT NOT NULL,
  location          TEXT NOT NULL,
  budget            NUMERIC(12,2) NOT NULL CHECK (budget >= 0),
  status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'matched', 'in_progress', 'completed', 'cancelled')),
  accepted_offer_id INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offers (
  id              SERIAL PRIMARY KEY,
  job_id          INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tradesperson_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price           NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, tradesperson_id)
);

-- accepted_offer_id references offers after both tables exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'jobs_accepted_offer_fk'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_accepted_offer_fk
      FOREIGN KEY (accepted_offer_id) REFERENCES offers(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS ratings (
  id              SERIAL PRIMARY KEY,
  job_id          INTEGER NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tradesperson_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_category ON jobs(status, category);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_offers_job ON offers(job_id);
CREATE INDEX IF NOT EXISTS idx_offers_trade ON offers(tradesperson_id);
CREATE INDEX IF NOT EXISTS idx_profiles_category ON tradesperson_profiles(category);

-- v1.1 additions: two-sided completion + support inbox (idempotent) ---------
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS worker_marked_done BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS worker_done_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completion_note TEXT;
-- "Other" category: customer types the trade they need
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS custom_category TEXT;
ALTER TABLE tradesperson_profiles ADD COLUMN IF NOT EXISTS custom_category TEXT;

-- Credits wallet: balance lives on the user; ledger records every change ------
ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_balance INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS credit_ledger (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta         INTEGER NOT NULL,             -- +credits (top-up) / -credits (fee)
  reason        TEXT NOT NULL,                -- 'topup' | 'job_fee' | 'adjustment' | 'welcome'
  balance_after INTEGER NOT NULL,
  ref           TEXT,                         -- e.g. topup reference or job id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON credit_ledger(user_id, created_at DESC);

-- Paynow top-up attempts -----------------------------------------------------
CREATE TABLE IF NOT EXISTS paynow_topups (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference    TEXT NOT NULL UNIQUE,          -- our unique reference sent to Paynow
  bundle_id    TEXT NOT NULL,
  amount_usd   NUMERIC(10,2) NOT NULL,
  credits      INTEGER NOT NULL,
  method       TEXT NOT NULL DEFAULT 'web',   -- 'web' | 'ecocash' | 'onemoney' | 'innbucks'
  poll_url     TEXT,
  paynow_ref   TEXT,
  status       TEXT NOT NULL DEFAULT 'Created',
  credited     BOOLEAN NOT NULL DEFAULT false, -- guards against double-crediting
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_topups_user ON paynow_topups(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin & moderation ---------------------------------------------------------
-- Allow an 'admin' role alongside customers and tradespeople. The original
-- inline CHECK is dropped and recreated so this is safe on existing databases.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('customer', 'tradesperson', 'admin'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at     TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
-- Google sign-in: link a Google account id to a user (nullable = password user).
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id        TEXT UNIQUE;

-- Only ONE superadmin can ever exist, and it can never be deleted while flagged.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_superadmin ON users (is_superadmin) WHERE is_superadmin;

-- Immutable audit trail of every privileged action.
CREATE TABLE IF NOT EXISTS admin_actions (
  id          SERIAL PRIMARY KEY,
  admin_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  admin_name  TEXT,
  action      TEXT NOT NULL,            -- 'suspend' | 'unsuspend' | 'grant_admin' | 'revoke_admin' | 'support_status'
  target_type TEXT,                     -- 'user' | 'support'
  target_id   INTEGER,
  target_name TEXT,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_time ON admin_actions(created_at DESC);

-- Notifications (in-app) + Web Push subscriptions ---------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'job_match',  -- 'job_match' | 'offer_made' | 'offer_accepted'
  title      TEXT NOT NULL,
  body       TEXT,
  job_id     INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- Supabase hardening ---------------------------------------------------------
-- Our backend connects as the table OWNER (postgres role), which bypasses RLS,
-- so the app keeps full access. Enabling RLS with NO policies means the public
-- PostgREST roles (anon / authenticated) can read/write NOTHING through the
-- Supabase auto-API. Safe & idempotent everywhere (owner/superuser bypass RLS).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','tradesperson_profiles','jobs','offers','ratings',
    'credit_ledger','paynow_topups','support_messages','admin_actions',
    'notifications','push_subscriptions'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END IF;
  END LOOP;
END$$;

