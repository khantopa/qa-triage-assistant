import { z } from "zod";
import { query } from "../db/client.js";
import type { PatternRow, PatternInstanceRow } from "../lib/types.js";

export const getPatternProtocolSchema = {
  name: "get_pattern_protocol",
  description:
    "Retrieve the full protocol markdown, known instances, and metadata for a pattern.",
  inputSchema: z.object({
    pattern_id: z.string(),
  }),
};

export type GetPatternProtocolInput = z.infer<typeof getPatternProtocolSchema.inputSchema>;

export async function handleGetPatternProtocol(input: GetPatternProtocolInput) {
  const patternResult = await query<PatternRow>(
    "SELECT * FROM patterns WHERE id = $1",
    [input.pattern_id]
  );

  if (patternResult.rows.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: `Pattern not found: ${input.pattern_id}` }),
        },
      ],
      isError: true,
    };
  }

  const pattern = patternResult.rows[0];

  const instancesResult = await query<PatternInstanceRow>(
    "SELECT * FROM pattern_instances WHERE pattern_id = $1 ORDER BY date DESC",
    [input.pattern_id]
  );

  // Extract termination conditions from the protocol markdown
  // They're embedded in the markdown, so we return the full protocol and let Claude parse them
  const result = {
    pattern_id: pattern.id,
    name: pattern.name,
    confidence: pattern.confidence,
    protocol_md: pattern.protocol_md,
    known_instances: instancesResult.rows.map((row) => ({
      date: row.date,
      test_name: row.test_name,
      description: row.description,
    })),
    times_used: pattern.times_used,
    times_correct: pattern.times_correct,
    false_positives: pattern.false_positives,
  };

  // Increment times_used
  await query("UPDATE patterns SET times_used = times_used + 1, updated_at = NOW() WHERE id = $1", [
    input.pattern_id,
  ]);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
