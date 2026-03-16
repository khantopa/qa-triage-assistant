import { z } from "zod";
import { query } from "../db/client.js";
import { matchPatterns } from "../lib/pattern-matcher.js";
import type { PatternRow, MatchRules } from "../lib/types.js";

export const matchPatternsSchema = {
  name: "match_patterns",
  description:
    "Match test failures against known patterns in the pattern library. Returns pattern matches with scores and unmatched failure indices.",
  inputSchema: z.object({
    failures: z.array(
      z.object({
        test_name: z.string(),
        story: z.string().default(""),
        error_message: z.string(),
        stack_trace: z.string().default(""),
      })
    ),
  }),
};

export type MatchPatternsInput = z.infer<typeof matchPatternsSchema.inputSchema>;

export async function handleMatchPatterns(input: MatchPatternsInput) {
  // Fetch active patterns
  const patternsResult = await query<PatternRow>(
    "SELECT * FROM patterns WHERE status = 'active'"
  );

  // Fetch match rules
  const rulesResult = await query<MatchRules>(
    "SELECT * FROM match_rules WHERE id = 'default'"
  );

  const rules: MatchRules = rulesResult.rows[0] ?? {
    keyword_required: true,
    min_total_score: 4,
    keyword_weight: 2,
    signature_weight: 3,
  };

  const result = matchPatterns(input.failures, patternsResult.rows, rules);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
