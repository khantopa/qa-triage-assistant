import { z } from "zod";
import { query } from "../db/client.js";

export const saveFeedbackSchema = {
  name: "save_feedback",
  description:
    "Save feedback for a triage run including per-failure classification assessments and pattern candidate flags.",
  inputSchema: z.object({
    run_id: z.string(),
    report_file: z.string().optional(),
    sprint_branch: z.string().optional(),
    captured_at: z.string().optional(),
    user_email: z.string().optional(),
    failures: z.array(
      z.object({
        test_name: z.string(),
        system_classification: z.string().nullable().optional(),
        actual_classification: z.string().nullable().optional(),
        classification_correct: z.enum(["yes", "partial", "no"]).nullable().optional(),
        pattern_used: z.string().nullable().optional(),
        pattern_match_correct: z.boolean().nullable().optional(),
        key_investigative_step: z.string().nullable().optional(),
        new_pattern_candidate: z.boolean().default(false),
        new_pattern_trigger: z.string().nullable().optional(),
        new_pattern_protocol: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    ),
  }),
};

export type SaveFeedbackInput = z.infer<typeof saveFeedbackSchema.inputSchema>;

export async function handleSaveFeedback(input: SaveFeedbackInput) {
  // Upsert triage run
  await query(
    `INSERT INTO triage_runs (run_id, report_file, sprint_branch, user_email, captured_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (run_id) DO UPDATE SET
       report_file = COALESCE(EXCLUDED.report_file, triage_runs.report_file),
       sprint_branch = COALESCE(EXCLUDED.sprint_branch, triage_runs.sprint_branch),
       user_email = COALESCE(EXCLUDED.user_email, triage_runs.user_email)`,
    [
      input.run_id,
      input.report_file ?? null,
      input.sprint_branch ?? null,
      input.user_email ?? null,
      input.captured_at ?? new Date().toISOString(),
    ]
  );

  let candidatesCreated = 0;

  // Insert feedback entries
  for (const failure of input.failures) {
    await query(
      `INSERT INTO feedback_entries (
        run_id, test_name, system_classification, actual_classification,
        classification_correct, pattern_used, pattern_match_correct,
        key_investigative_step, new_pattern_candidate, new_pattern_trigger,
        new_pattern_protocol, notes, user_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        input.run_id,
        failure.test_name,
        failure.system_classification ?? null,
        failure.actual_classification ?? null,
        failure.classification_correct ?? null,
        failure.pattern_used ?? null,
        failure.pattern_match_correct ?? null,
        failure.key_investigative_step ?? null,
        failure.new_pattern_candidate,
        failure.new_pattern_trigger ?? null,
        failure.new_pattern_protocol ?? null,
        failure.notes ?? null,
        input.user_email ?? null,
      ]
    );

    // If flagged as pattern candidate, also insert into pattern_candidates
    if (failure.new_pattern_candidate && failure.new_pattern_trigger) {
      await query(
        `INSERT INTO pattern_candidates (trigger_description, protocol_draft, created_by)
         VALUES ($1, $2, $3)`,
        [
          failure.new_pattern_trigger,
          failure.new_pattern_protocol ?? null,
          input.user_email ?? null,
        ]
      );
      candidatesCreated++;
    }

    // Update pattern accuracy stats if pattern was used
    if (failure.pattern_used && failure.pattern_match_correct !== null) {
      if (failure.pattern_match_correct) {
        await query(
          "UPDATE patterns SET times_correct = times_correct + 1, updated_at = NOW() WHERE id = $1",
          [failure.pattern_used]
        );
      } else {
        await query(
          "UPDATE patterns SET false_positives = false_positives + 1, updated_at = NOW() WHERE id = $1",
          [failure.pattern_used]
        );
      }
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          saved: true,
          entries_created: input.failures.length,
          candidates_created: candidatesCreated,
        }),
      },
    ],
  };
}
