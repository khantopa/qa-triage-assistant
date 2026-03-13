# Triage Workflow

Follow these steps in order for every triage run.

## Standing Rules (non-negotiable)

- **Serenity first**: Always extract evidence from the Serenity JSON before asking for anything else. Serenity captures REST request/response bodies, recordReportData, step outcomes, and screenshots. Use all of it.
- **Console log is a fallback only**: Ask for the console log (passing or failing) only when Serenity JSON does not contain the evidence needed. State clearly what Serenity is missing before asking.
- **Never assume**: Do not assume what a config value was, what a step sent, or what a passing run looked like. Every claim must be backed by data from a file. If the data is not available, ask for it — do not guess.
- **No solution without evidence**: Do not propose a root cause or fix until the evidence supports it. If evidence is incomplete, say what is missing and ask for it.
- **QA automation ruled out first**: Before investigating FE or BE, always check recent QA commits to shared helpers (`AdminLoginSteps.java`, `LoginSteps.java`, `ProfileWallSteps.java`, `BasePageObject.java`, `BaseStepObject.java`). A change to a shared helper can silently affect many unrelated tests. Do not move to FE/BE investigation until recent QA shared helper changes have been reviewed and cleared.

## Step 1: Extract & Inventory

- Extract ZIP to `temp/`
- Categorise files found:
  - `summary.txt` — check this first
  - `results.csv` — one row per test
  - `SERENITY-JUNIT-*.xml` — JUnit XML
  - `*.json` (~400KB+) — full Serenity outcome
  - `*.html` — individual test pages (fallback)
  - `*.log` / `*.txt` — Jenkins console logs
- Print a file summary to the user

## Step 2: Parse Failures

1. Check `summary.txt` — if `Failed: 0` and `Failed with errors: 0`, report green and stop
2. Parse `results.csv` — filter rows where Result != `SUCCESS`
3. Parse `SERENITY-JUNIT-*.xml` — extract `<testcase>` elements with `<failure>` or `<error>` tags
4. Parse matching `*.json` — extract failing `testSteps`, `exception.message`, `exception.stackTrace`
5. Parse console logs — extract commit SHA, branch, build number, Jenkins URL
6. Build a **failure inventory**: test name, error message, stack trace, URL context

## Step 3: Stability & History Gate

Read `reports/history.json` if it exists. Classify each failure into a triage tier:

| Tier         | Criteria                                           | Action                                                    |
| ------------ | -------------------------------------------------- | --------------------------------------------------------- |
| **Skip**     | Stability = 0.0 OR consecutive_failures ≥ 10       | Classify as Chronic Failure, ask user before any git work |
| **Quick**    | Stability < 0.3 OR consecutive_failures ≥ 5        | Brief git check only — skip deep blame                    |
| **Full**     | Stability ≥ 0.5, now failing                       | Full git correlation + root cause                         |
| **Critical** | Stability ≥ 0.8, now failing OR first-time failure | Full analysis + highlight as high-priority regression     |

Rules:

- History data takes precedence over current stability when both are available
- Stability = 0.0 is always at least Skip, even on first run

**For Skip-tier tests** — batch into a single `AskUserQuestion`:

> "The following are chronic failures. How should I proceed?"
>
> | #   | Test   | Stability | Consecutive Failures |
> | --- | ------ | --------- | -------------------- |
> | 1   | test_a | 0.0       | 12                   |
>
> (A) Skip all — classify as chronic, recommend quarantine
> (B) Skip all except... — user specifies
> (C) Investigate all

**For Critical-tier tests** — immediately surface to user before continuing.

## Step 4: Group by Common Root Cause

Before git correlation, group failures sharing the same error signature:

- Group key: normalised error message + top 3 stack trace frames
- Report the primary failure with full analysis; list others as "Same root cause as #N"

## Step 5: Determine Repos & Ask for Branches

See `.claude/rules/03-git-correlation.md` for URL-based repo routing.

### Finding the QA Branch from the ZIP

Before asking the user, search the ZIP for the QA branch name:

```bash
grep -r "release\|branch" <temp_dir>/ --include="*.json" --include="*.txt" --include="*.log" -l
```

Check `summary.txt`, Jenkins console logs, and the main Serenity JSON for `gitBranch`, `branch`, or `GIT_BRANCH` fields.

**If not found in the ZIP**: Ask the user. Once confirmed, never ask again for the same run.

Once repos are determined, ask for branch names:

- If only admin URLs failed → ask for BE branch + QA branch
- If React pages failed → ask for FE + BE + QA branches
- If mixed → ask based on where the failing step occurred

## Step 6: Git Correlation

See `.claude/rules/03-git-correlation.md`.

## Step 7: Classify & Root Cause

See `.claude/rules/04-classification.md`.

## Step 8: Generate Report & Update History

See `.claude/rules/05-report-format.md`.

After saving the report, update `reports/history.json`:

- For each test in `results.csv`:
  - New entry if test key (`<Story> | <Title>`) not in history
  - SUCCESS: increment `consecutive_passes`, reset `consecutive_failures`, update `last_pass`
  - FAILURE: increment `consecutive_failures`, reset `consecutive_passes`, update `last_fail`; set `first_seen_failing` if null
  - Append Stability to `stability_trend` (keep last 10)
  - Increment `total_runs` + `total_passes` or `total_failures`
  - Set `last_classification` if classified this run
- Set `last_updated` to current timestamp

## Step 9: Clean Up

Delete `temp/` directory after the report is saved.
