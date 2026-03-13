# Stage 10: Feedback Capture

Run this stage AFTER the report is saved and AFTER temp/ cleanup.

This is non-negotiable. Every run must produce a feedback entry. This is how the system learns.

---

## Choosing a Mode

Ask the user:

```
📋 Feedback Capture

The triage report is saved. Before we close, I need to capture feedback 
so the system learns from this run.

Choose your mode:
  (A) Quick — I'll draft it, you approve or edit (2 min)
  (B) Interactive — I'll ask you questions, you answer (5 min)

Which works for you right now?
```

---

## Mode A: Auto-Draft

Generate a draft feedback entry based on the triage report and history.json.

For each non-stability failure in this run:

```markdown
## Failure: <test_name>
**My Classification**: <what system said>
**Confidence I Reported**: HIGH / MEDIUM / LOW
**Pattern Used**: <pattern.id or "none — standard investigation">

**Draft: Actual Root Cause**
<Extract the root cause from the report. If system was wrong, flag with ⚠️>

**Draft: Was My Classification Correct?**
<Compare system classification to report conclusion>
[ ] Yes — exact match
[ ] Partial — right domain, wrong details
[ ] No — wrong classification

**Draft: What investigative step found the answer?**
<Extract the key step from the report that led to the conclusion>

**Draft: Should this become a new pattern?**
<If no pattern was matched AND this failure has a repeatable investigation path>
[ ] Yes — extract pattern
[ ] No — one-off or inconclusive

**Draft: Notes**
<Any context not captured above>
```

Then say:

```
Here's my draft feedback. Does this look correct?
- Edit anything that's wrong
- Type APPROVE to save as-is
- Type SKIP to discard (not recommended)
```

---

## Mode B: Interactive

Ask these questions one at a time. Wait for the answer before asking the next.

**Q1**: "What was the actual root cause of each failure? Walk me through what really happened."

**Q2**: "Was my classification correct? For each failure — exact match, partial, or wrong?"

**Q3**: "What was the single most useful investigative step that led to the answer?"

**Q4**: "Is this a failure pattern you'd recognize again in a future sprint? Describe the trigger in one sentence."

**Q5**: "Anything else the system should know for next time?"

---

## Saving Feedback

After approval (Mode A) or completion (Mode B), write to `reports/feedback-log.json`:

```json
{
  "run_id": "<timestamp>",
  "report_file": "reports/triage-report-<timestamp>.md",
  "sprint_branch": "<branch>",
  "captured_at": "<iso_timestamp>",
  "failures": [
    {
      "test_name": "<name>",
      "system_classification": "<what system said>",
      "actual_classification": "<what really happened>",
      "classification_correct": "yes | partial | no",
      "pattern_used": "<pattern.id or null>",
      "pattern_match_correct": true,
      "key_investigative_step": "<what found the answer>",
      "new_pattern_candidate": true,
      "new_pattern_trigger": "<one sentence description>",
      "new_pattern_protocol": "<brief steps that would have found this>",
      "notes": "<freeform>"
    }
  ]
}
```

---

## Pattern Promotion

After saving feedback, check each entry where `new_pattern_candidate: true`.

Say:

```
🧠 Pattern Candidate Detected

You flagged "<test_name>" as a potential new pattern.
Trigger: "<new_pattern_trigger>"

Should I:
  (A) Draft a new pattern file now and add it to the registry
  (B) Save for later — I'll accumulate more instances first
  (C) Skip — this was a one-off
```

If (A): Generate a new `patterns/<pattern-id>.md` using the same structure as `face-comparison.md`.
Update `patterns/index.json` with the new entry.

If (B): Save to `patterns/candidates.json` for future review.

---

## Why This Is Non-Negotiable

Every skipped feedback entry is a lost data point.
After 10 sprints of consistent feedback:
- Pattern library has 10-20 real, validated patterns
- Hypothesis Engine resolves 60-80% of failures without standard git scan
- Token costs drop significantly
- System is ready for RAG integration

After 10 sprints of skipped feedback:
- System is identical to today
- You are still the reasoning engine

The feedback loop IS the system improvement. There is no other path.
