# Stage 0: Hypothesis Engine

Run this stage BEFORE Step 3 (Stability Gate) and BEFORE any git correlation.

This stage answers one question: **"Do we already know how to investigate this failure?"**

---

## 0.1 — Load Pattern Index

Read `patterns/index.json`. Extract all pattern trigger_keywords and trigger_error_signatures.

If `patterns/index.json` does not exist or has no patterns → skip to 0.3.

## 0.2 — Match Failure Against Patterns

For each failure in the failure inventory, check:

```
FOR EACH failure:
  FOR EACH pattern in index.json:
    score = 0

    FOR EACH trigger_keyword in pattern:
      IF keyword found in (test_name OR story OR error_message OR stack_trace):
        score += 2

    FOR EACH trigger_error_signature in pattern:
      IF signature found in (error_message OR stack_trace):
        score += 3

    IF score >= 3:
      → PATTERN MATCH: attach pattern.id to this failure
      → Log: "Pattern matched: <pattern.id> (score: <score>)"
      → Break inner loop
```

## 0.3 — Route Each Failure

Based on matching result:

**PATTERN MATCH found:**
→ Load the full pattern file (e.g. `patterns/face-comparison.md`)
→ Execute the PROTOCOL section of that pattern exactly
→ Do not run standard git correlation — the pattern defines the investigation steps
→ After completing protocol, proceed to Step 7 (Classify) using TERMINATION CONDITIONS from pattern

**NO MATCH found:**
→ Log: "No pattern match — running standard investigation"
→ Continue with standard workflow (Steps 3–7)
→ At end of run, feedback capture is MANDATORY (flag this failure for pattern extraction)

## 0.4 — Surface Pattern Match to User

Before starting investigation, tell the user:

```
🔍 Hypothesis Engine Results:
- <Test Name>: Pattern matched → "face-comparison" (score: 8)
  Executing: Face/Selfie Comparison Protocol
  Skipping standard git scan for this failure.

- <Test Name>: No pattern match
  Running standard investigation.
  Feedback capture required after this run.
```

---

## Why This Matters

Without this stage:
- Every run scans all repos from scratch
- Token cost is O(failures × repos × files)
- System never gets faster with experience

With this stage:
- Known failure types execute a targeted protocol
- Token cost is O(pattern_steps) — significantly lower
- System gets faster as pattern library grows
- Unknown failures are explicitly flagged for learning

---

## Pattern Match Confidence Boost

When a pattern match is found and the protocol produces a conclusion:
- Inherit the pattern's base confidence
- Boost by +1 level if a Known Instance from the pattern matches the current failure
- Example: face-comparison pattern is HIGH → if sd-1.jpg duplicate found again → report as HIGH + note "matches known instance from 2026-03-06"
