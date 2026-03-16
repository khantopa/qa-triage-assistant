import type { FailureData, PatternRow, MatchRules, PatternMatch, MatchResult } from "./types.js";

/**
 * Pattern matching algorithm ported from 07-hypothesis-engine.md section 0.2.
 *
 * For each failure × each pattern:
 * - keyword found in (test_name OR story OR error_message OR stack_trace) → +keyword_weight
 * - signature found in (error_message OR stack_trace) → +signature_weight
 * - keyword_score == 0 → NO MATCH (keywords are mandatory gate)
 * - total_score >= min_total_score → MATCH
 */
export function matchPatterns(
  failures: FailureData[],
  patterns: PatternRow[],
  rules: MatchRules
): MatchResult {
  const matches: PatternMatch[] = [];
  const matchedIndices = new Set<number>();

  for (let fi = 0; fi < failures.length; fi++) {
    const failure = failures[fi];
    const searchFields = [
      failure.test_name,
      failure.story,
      failure.error_message,
      failure.stack_trace,
    ].map((s) => s.toLowerCase());

    for (const pattern of patterns) {
      if (pattern.status !== "active") continue;

      // Score keywords — mandatory gate
      let keywordScore = 0;
      for (const keyword of pattern.trigger_keywords) {
        const kw = keyword.toLowerCase();
        if (searchFields.some((field) => field.includes(kw))) {
          keywordScore += rules.keyword_weight;
        }
      }

      // Keywords are mandatory — signatures alone never trigger a match
      if (rules.keyword_required && keywordScore === 0) {
        continue;
      }

      // Score signatures — additive
      let signatureScore = 0;
      const signatureFields = [
        failure.error_message.toLowerCase(),
        failure.stack_trace.toLowerCase(),
      ];
      for (const sig of pattern.trigger_error_signatures) {
        const s = sig.toLowerCase();
        if (signatureFields.some((field) => field.includes(s))) {
          signatureScore += rules.signature_weight;
        }
      }

      const totalScore = keywordScore + signatureScore;

      if (totalScore >= rules.min_total_score) {
        matches.push({
          failure_index: fi,
          pattern_id: pattern.id,
          pattern_name: pattern.name,
          keyword_score: keywordScore,
          signature_score: signatureScore,
          total_score: totalScore,
        });
        matchedIndices.add(fi);
        break; // First matching pattern wins for this failure
      }
    }
  }

  const unmatchedIndices = failures
    .map((_, i) => i)
    .filter((i) => !matchedIndices.has(i));

  return { matches, unmatched_indices: unmatchedIndices };
}
