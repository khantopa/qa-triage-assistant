---
name: serenity-parser
description: Parses Serenity BDD report files including summary.txt, results.csv, JUnit XML, and JSON outcome files. Use when extracting failure data from test report ZIPs.
---

# Serenity BDD Report Format

Test reports use **Serenity BDD** format.

## Key Files

| File | Purpose |
|------|---------|
| `summary.txt` | Quick pass/fail counts — check first |
| `results.csv` | One row per test: Story, Title, Result, Date, Stability, Duration |
| `SERENITY-JUNIT-*.xml` | JUnit XML with `<testsuite>` and `<testcase>` elements |
| `*.json` (~400KB+) | Full Serenity test outcome: steps, screenshots, errors, REST interactions |
| `*.html` | Individual test result pages — fallback only |

## Parsing Priority for Failures

1. `summary.txt` — green check
2. `results.csv` — which tests failed
3. `SERENITY-JUNIT-*.xml` — `<failure>` and `<error>` tags inside `<testcase>`
4. `*.json` matching the failed test hash — step-by-step errors, stack traces
5. `*.html` — visual fallback if JSON is insufficient

## Finding the QA Branch from the ZIP

Before asking the user, search the extracted ZIP for the QA branch name:

```bash
grep -r "release\|branch" <temp_dir>/ --include="*.json" --include="*.txt" --include="*.log" -l
```

Check `summary.txt`, Jenkins console logs, and the main Serenity JSON for `gitBranch`, `branch`, or `GIT_BRANCH` fields.

**If not found in the ZIP**: Ask the user. Once confirmed, never ask again for the same run.
