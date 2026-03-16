export interface FailureData {
  test_name: string;
  story: string;
  error_message: string;
  stack_trace: string;
}

export interface PatternRow {
  id: string;
  name: string;
  status: string;
  confidence: string;
  protocol_md: string;
  trigger_keywords: string[];
  trigger_error_signatures: string[];
  times_used: number;
  times_correct: number;
  false_positives: number;
  false_positive_log: unknown[];
  sprint_validated: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatternInstanceRow {
  id: string;
  pattern_id: string;
  date: string;
  test_name: string;
  description: string | null;
}

export interface MatchRules {
  keyword_required: boolean;
  min_total_score: number;
  keyword_weight: number;
  signature_weight: number;
}

export interface PatternMatch {
  failure_index: number;
  pattern_id: string;
  pattern_name: string;
  keyword_score: number;
  signature_score: number;
  total_score: number;
}

export interface MatchResult {
  matches: PatternMatch[];
  unmatched_indices: number[];
}

export interface TestHistoryRow {
  test_key: string;
  first_seen: string | null;
  first_seen_failing: string | null;
  last_fail: string | null;
  last_pass: string | null;
  consecutive_failures: number;
  consecutive_passes: number;
  total_runs: number;
  total_passes: number;
  total_failures: number;
  stability_trend: number[];
  last_classification: string | null;
  last_error: string | null;
  updated_at: string;
}

export interface FeedbackEntry {
  test_name: string;
  system_classification: string | null;
  actual_classification: string | null;
  classification_correct: string | null;
  pattern_used: string | null;
  pattern_match_correct: boolean | null;
  key_investigative_step: string | null;
  new_pattern_candidate: boolean;
  new_pattern_trigger: string | null;
  new_pattern_protocol: string | null;
  notes: string | null;
}

export interface HistoryUpdateResult {
  test_key: string;
  outcome: "SUCCESS" | "FAILURE";
  stability: number;
  classification?: string;
  error?: string;
}
