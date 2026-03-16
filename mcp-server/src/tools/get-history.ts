import { z } from "zod";
import { query } from "../db/client.js";
import type { TestHistoryRow } from "../lib/types.js";

export const getHistorySchema = {
  name: "get_history",
  description:
    "Retrieve test stability history for given test keys. Used for the stability gate to classify failures into Skip/Quick/Full/Critical tiers.",
  inputSchema: z.object({
    test_keys: z.array(z.string()).describe("Test keys in 'Story | Title' format"),
  }),
};

export type GetHistoryInput = z.infer<typeof getHistorySchema.inputSchema>;

export async function handleGetHistory(input: GetHistoryInput) {
  if (input.test_keys.length === 0) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ tests: {} }) }],
    };
  }

  // Build parameterized IN clause
  const placeholders = input.test_keys.map((_, i) => `$${i + 1}`).join(", ");
  const result = await query<TestHistoryRow>(
    `SELECT * FROM test_history WHERE test_key IN (${placeholders})`,
    input.test_keys
  );

  const tests: Record<string, TestHistoryRow> = {};
  for (const row of result.rows) {
    tests[row.test_key] = row;
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ tests }, null, 2),
      },
    ],
  };
}
