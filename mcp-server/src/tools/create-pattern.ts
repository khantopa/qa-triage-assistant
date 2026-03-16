import { z } from "zod";
import { query } from "../db/client.js";

export const createPatternSchema = {
  name: "create_pattern",
  description:
    "Create a new pattern in the registry (active or candidate status).",
  inputSchema: z.object({
    id: z.string().optional(),
    name: z.string(),
    status: z.enum(["active", "candidate"]).default("candidate"),
    trigger_keywords: z.array(z.string()),
    trigger_error_signatures: z.array(z.string()).default([]),
    protocol_md: z.string(),
    confidence: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
    known_instances: z
      .array(
        z.object({
          test_name: z.string(),
          description: z.string().optional(),
          date: z.string(),
        })
      )
      .default([]),
    user_email: z.string().optional(),
  }),
};

export type CreatePatternInput = z.infer<typeof createPatternSchema.inputSchema>;

export async function handleCreatePattern(input: CreatePatternInput) {
  const patternId =
    input.id ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Insert pattern
  await query(
    `INSERT INTO patterns (id, name, status, confidence, protocol_md, trigger_keywords, trigger_error_signatures, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       status = EXCLUDED.status,
       confidence = EXCLUDED.confidence,
       protocol_md = EXCLUDED.protocol_md,
       trigger_keywords = EXCLUDED.trigger_keywords,
       trigger_error_signatures = EXCLUDED.trigger_error_signatures,
       updated_at = NOW()`,
    [
      patternId,
      input.name,
      input.status,
      input.confidence,
      input.protocol_md,
      input.trigger_keywords,
      input.trigger_error_signatures,
      input.user_email ?? null,
    ]
  );

  // Insert known instances
  for (const instance of input.known_instances) {
    await query(
      `INSERT INTO pattern_instances (pattern_id, date, test_name, description)
       VALUES ($1, $2, $3, $4)`,
      [patternId, instance.date, instance.test_name, instance.description ?? null]
    );
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ pattern_id: patternId, created: true, status: input.status }),
      },
    ],
  };
}
