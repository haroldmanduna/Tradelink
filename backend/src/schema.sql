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

