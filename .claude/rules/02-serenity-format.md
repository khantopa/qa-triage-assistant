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
