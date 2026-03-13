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

## Key Differences from Old Format

- **Sprint Trigger** is now a separate field from **Root Cause**
- **Chain of Causation** explains the link
- Both fields are required when they differ — never just report an old commit without explaining why the failure appeared now
