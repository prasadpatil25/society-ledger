-- Society ledger schema (Cloudflare D1 / SQLite)
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,                              -- ISO YYYY-MM-DD
  particulars TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('credit','debit')),
  amount      REAL NOT NULL CHECK (amount > 0),
  category    TEXT,
  member      TEXT,
  mode        TEXT
);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

-- Per-IP login throttling (populated by the login endpoint).
CREATE TABLE IF NOT EXISTS login_attempts (
  ip           TEXT PRIMARY KEY,
  fails        INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0
);

-- Financial years (named period windows). Entries belong to a year by date,
-- so no foreign key is needed; a year is just a start/end window with a label.
CREATE TABLE IF NOT EXISTS years (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  label    TEXT NOT NULL,
  fy_start TEXT NOT NULL,
  fy_end   TEXT NOT NULL
);

-- Member roster. Entries reference a member by name (text); this table gives
-- a consistent list and lets the dues view show members who have paid nothing.
CREATE TABLE IF NOT EXISTS members (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  flat    TEXT,
  name    TEXT NOT NULL,
  contact TEXT,
  active  INTEGER NOT NULL DEFAULT 1
);

-- Backfill the roster from existing entries, but only if it's still empty
-- (safe to re-run; does nothing once members exist).
INSERT INTO members (name)
SELECT DISTINCT member FROM entries
WHERE member IS NOT NULL AND TRIM(member) <> ''
  AND NOT EXISTS (SELECT 1 FROM members);

-- Society-level settings. 'opening' is the genesis balance, i.e. the balance
-- BEFORE the first financial year. Each year's opening is then computed as
-- genesis + the net of all entries dated before that year starts.
INSERT OR IGNORE INTO meta(key, value) VALUES
  ('name',    'Avir Society'),
  ('opening', '0'),
  ('due',     '15000');

-- Seed the first financial year only if none exist yet.
INSERT INTO years (label, fy_start, fy_end)
SELECT 'FY 2025-26', '2025-06-01', '2026-06-30'
WHERE NOT EXISTS (SELECT 1 FROM years);
