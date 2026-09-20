-- Initial schema.
-- Durable history lives in `teams` and `matches`; the external API responses
-- live in `api_cache`, an ephemeral table with a TTL.

CREATE TABLE IF NOT EXISTS teams (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  short_name TEXT,
  tla        TEXT,
  crest      TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id             INTEGER PRIMARY KEY,
  league         TEXT NOT NULL,
  utc_date       TEXT NOT NULL,
  status         TEXT NOT NULL,
  matchday       INTEGER,
  home_team_id   INTEGER NOT NULL REFERENCES teams(id),
  away_team_id   INTEGER NOT NULL REFERENCES teams(id),
  winner         TEXT,
  duration       TEXT,
  full_time_home INTEGER,
  full_time_away INTEGER,
  half_time_home INTEGER,
  half_time_away INTEGER,
  updated_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matches_league ON matches (league);
CREATE INDEX IF NOT EXISTS idx_matches_utc_date ON matches (utc_date);

CREATE TABLE IF NOT EXISTS api_cache (
  key        TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at ON api_cache (expires_at);
