-- QA Triage Assistant — Database Schema
-- Run against a Postgres database (local or Supabase)

-- Pattern registry: stores pattern definitions with trigger rules and protocols
CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,                          -- e.g. "face-comparison"
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'          -- active | candidate | archived
    CHECK (status IN ('active', 'candidate', 'archived')),
  confidence TEXT NOT NULL DEFAULT 'MEDIUM'
    CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
  protocol_md TEXT NOT NULL,                    -- full protocol markdown (5-6KB typical)
  trigger_keywords TEXT[] NOT NULL DEFAULT '{}',
  trigger_error_signatures TEXT[] NOT NULL DEFAULT '{}',
  times_used INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  false_positives INTEGER NOT NULL DEFAULT 0,
  false_positive_log JSONB NOT NULL DEFAULT '[]',
  sprint_validated DATE,
  created_by TEXT,                              -- user email for attribution
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global scoring configuration for the pattern matcher
CREATE TABLE IF NOT EXISTS match_rules (
  id TEXT PRIMARY KEY DEFAULT 'default',
  keyword_required BOOLEAN NOT NULL DEFAULT TRUE,
  min_total_score INTEGER NOT NULL DEFAULT 4,
  keyword_weight INTEGER NOT NULL DEFAULT 2,
  signature_weight INTEGER NOT NULL DEFAULT 3
);

-- Known instances within a pattern (normalized from KNOWN INSTANCES sections)
CREATE TABLE IF NOT EXISTS pattern_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id TEXT NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  test_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pattern_instances_pattern_id ON pattern_instances(pattern_id);

-- Pattern promotion candidates (not yet active patterns)
CREATE TABLE IF NOT EXISTS pattern_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_description TEXT NOT NULL,
  protocol_draft TEXT,
  instances JSONB NOT NULL DEFAULT '[]',
  promote_after INTEGER DEFAULT 3,              -- promote to active after N instances
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-test stability tracking (mirrors history.json structure)
CREATE TABLE IF NOT EXISTS test_history (
  test_key TEXT PRIMARY KEY,                    -- "Story | Title" composite key
  first_seen TIMESTAMPTZ,
  first_seen_failing TIMESTAMPTZ,
  last_fail TIMESTAMPTZ,
  last_pass TIMESTAMPTZ,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  consecutive_passes INTEGER NOT NULL DEFAULT 0,
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_passes INTEGER NOT NULL DEFAULT 0,
  total_failures INTEGER NOT NULL DEFAULT 0,
  stability_trend NUMERIC[] NOT NULL DEFAULT '{}',
  last_classification TEXT,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triage run metadata (one row per triage session)
CREATE TABLE IF NOT EXISTS triage_runs (
  run_id TEXT PRIMARY KEY,
  report_file TEXT,
  sprint_branch TEXT,
  total_failures INTEGER,
  summary_json JSONB,
  user_email TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual failure feedback entries (many per run)
CREATE TABLE IF NOT EXISTS feedback_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL REFERENCES triage_runs(run_id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  system_classification TEXT,
  actual_classification TEXT,
  classification_correct TEXT                    -- yes | partial | no
    CHECK (classification_correct IN ('yes', 'partial', 'no')),
  pattern_used TEXT REFERENCES patterns(id),
  pattern_match_correct BOOLEAN,
  key_investigative_step TEXT,
  new_pattern_candidate BOOLEAN DEFAULT FALSE,
  new_pattern_trigger TEXT,
  new_pattern_protocol TEXT,
  notes TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_entries_run_id ON feedback_entries(run_id);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_pattern ON feedback_entries(pattern_used);
