import { z } from "zod";
import { query } from "../db/client.js";

export const updateHistorySchema = {
  name: "update_history",
  description:
    "Update test stability history after a triage run. Handles increment/reset logic for consecutive failures/passes, stability trends, and timestamps.",
  inputSchema: z.object({
    results: z.array(
      z.object({
        test_key: z.string(),
        outcome: z.enum(["SUCCESS", "FAILURE"]),
        stability: z.number(),
        classification: z.string().optional(),
        error: z.string().optional(),
      })
    ),
  }),
};

export type UpdateHistoryInput = z.infer<typeof updateHistorySchema.inputSchema>;

export async function handleUpdateHistory(input: UpdateHistoryInput) {
  let updated = 0;
  let created = 0;
  const now = new Date().toISOString();

  for (const result of input.results) {
    // Check if test exists
    const existing = await query(
      "SELECT test_key FROM test_history WHERE test_key = $1",
      [result.test_key]
    );

    if (existing.rows.length === 0) {
      // Create new entry
      if (result.outcome === "SUCCESS") {
        await query(
          `INSERT INTO test_history (
            test_key, first_seen, last_pass,
            consecutive_passes, total_runs, total_passes,
            stability_trend, updated_at
          ) VALUES ($1, $2, $2, 1, 1, 1, ARRAY[$3::numeric], $2)`,
          [result.test_key, now, result.stability]
        );
      } else {
        await query(
          `INSERT INTO test_history (
            test_key, first_seen, first_seen_failing, last_fail,
            consecutive_failures, total_runs, total_failures,
            stability_trend, last_classification, last_error, updated_at
          ) VALUES ($1, $2, $2, $2, 1, 1, 1, ARRAY[$3::numeric], $4, $5, $2)`,
          [
            result.test_key,
            now,
            result.stability,
            result.classification ?? null,
            result.error ?? null,
          ]
        );
      }
      created++;
    } else {
      // Update existing entry
      if (result.outcome === "SUCCESS") {
        await query(
          `UPDATE test_history SET
            consecutive_passes = consecutive_passes + 1,
            consecutive_failures = 0,
            last_pass = $2,
            total_runs = total_runs + 1,
            total_passes = total_passes + 1,
            stability_trend = (
              CASE WHEN array_length(stability_trend, 1) >= 10
              THEN stability_trend[2:10] || ARRAY[$3::numeric]
              ELSE stability_trend || ARRAY[$3::numeric]
              END
            ),
            updated_at = $2
          WHERE test_key = $1`,
          [result.test_key, now, result.stability]
        );
      } else {
        await query(
          `UPDATE test_history SET
            consecutive_failures = consecutive_failures + 1,
            consecutive_passes = 0,
            last_fail = $2,
            first_seen_failing = COALESCE(first_seen_failing, $2),
            total_runs = total_runs + 1,
            total_failures = total_failures + 1,
            stability_trend = (
              CASE WHEN array_length(stability_trend, 1) >= 10
              THEN stability_trend[2:10] || ARRAY[$3::numeric]
              ELSE stability_trend || ARRAY[$3::numeric]
              END
            ),
            last_classification = COALESCE($4, last_classification),
            last_error = COALESCE($5, last_error),
            updated_at = $2
          WHERE test_key = $1`,
          [
            result.test_key,
            now,
            result.stability,
            result.classification ?? null,
            result.error ?? null,
          ]
        );
      }
      updated++;
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ updated, created }),
      },
    ],
  };
}
