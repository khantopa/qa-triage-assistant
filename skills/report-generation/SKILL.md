---
name: report-generation
description: Generates structured triage reports in markdown format with sprint trigger, root cause, chain of causation, and action items. Use when producing the final triage report.
---

# Triage Report Format

Save to `reports/triage-report-<timestamp>.md`.

```markdown
# QA Triage Report

**Generated**: <timestamp>
**Run**: <Run 1 / Run 2>
**Branch**: <branch(es)>
**Build Commit**: <SHA>

## Summary

- Total failures: X
- New regressions (Critical): X
- Existing issues (Full/Quick): X
- Chronic failures (Skipped): X
- FE Code: X | BE Code: X | QA Automation: X | CI/Config: X | Inconclusive: X

## Chronic Failures (Skipped Deep Analysis)

| Test | Stability | Consecutive Failures | Since | Recommendation |
|------|-----------|----------------------|-------|----------------|
| <name> | 0.0 | 15 | 2026-02-20 | Quarantine |

## Failures

### 1. <Test Name>

- **Triage Tier**: Critical / Full / Quick / Skip
- **Classification**: FE / BE / QA Automation / CI / Flaky / Chronic Failure
- **Confidence**: HIGH / MEDIUM / LOW
- **Error**: <brief error message>
- **Stack Trace** (key frames):
  ```
  <relevant lines>
  ```
- **Sprint Trigger**: <SHA> by <author> — "<commit message>" — <why this is the trigger>
- **Root Cause** (if different): <SHA> by <author> — "<commit message>" — <underlying defect>
- **Chain of Causation**: <how root cause + trigger combine to produce this failure>
- **Evidence**:
  - <bullet points>
- **Recommended Fix**:
  - <file path + what to change>
- **Recommended Owner**: <team or person>

---

## Action Items

- [ ] <actionable items>
```

## Key Rules

- **Sprint Trigger** is a separate field from **Root Cause**
- **Chain of Causation** explains the link
- Both fields are required when they differ — never just report an old commit without explaining why the failure appeared now

## Updating History

After saving the report, call `mcp__qa-triage__update_history` with results for all tests in the run (both passing and failing):

```
Input: {
  results: [{
    test_key: "<Story> | <Title>",
    outcome: "SUCCESS" | "FAILURE",
    stability: <number from results.csv>,
    classification: "<classification if failure>",
    error: "<error message if failure>"
  }]
}
```
