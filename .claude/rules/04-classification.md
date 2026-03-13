# Failure Classification & Root Cause Analysis

## Classification Categories

Classify each failure into exactly ONE:

| Classification | Signals |
|---|---|
| **FE Code** | Stack trace in FE source files; recent FE commits touched failing area; DOM/rendering errors in production code |
| **BE Code** | API errors, 5xx responses, backend stack traces; recent BE commits in affected endpoints |
| **QA Automation** | Element not found, stale selectors, timeout in test harness; stack trace points to test code; no recent production changes in failing area |
| **CI/Config** | Build tool errors, dependency failures, env var issues, Docker/infra errors |
| **Flaky/Inconclusive** | Intermittent failures, timing-dependent, no clear code change correlation |
| **Chronic Failure** | Skip-tier tests — classify without deep analysis |

**Key heuristic**: Top stack frame in test/automation code + no recent production commits in that area = likely **QA Automation**.

## Root Cause Analysis

For each classified failure:

1. Identify the **sprint trigger** — the most recent commit that caused this failure to appear now (see `.claude/rules/03-git-correlation.md`)
2. Identify the **root cause** if different from the sprint trigger — the older commit introducing the underlying defect
3. Explain the chain of causation with evidence
4. State assumptions explicitly
5. Assign confidence: `HIGH`, `MEDIUM`, or `LOW`

**Never report only an old commit as the root cause without explaining why the failure surfaced in this sprint.**
