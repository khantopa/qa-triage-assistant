# QA Triage Assistant Memory

## User Preferences
- Always try to find the QA branch from the ZIP before asking the user — search JSON/logs for gitBranch/GIT_BRANCH fields
- Always ask for the release branch BEFORE starting any analysis
- Admin URL tests do NOT need sa-v3 (FE) codebase analysis — only use FE repo for React page failures
- Some tests visit both admin and React pages — determine which part failed before choosing which repo to correlate against
- See [triage-notes.md](triage-notes.md) for detailed patterns

## Key Paths
- FE: `/Users/khantopa/dev/sa-v3`
- BE: `/Users/khantopa/dev/seeking`
- QA: `/Users/khantopa/dev/sa-ui-automation`

## Deep Triage Rules
- [feedback_deep_triage.md](feedback_deep_triage.md) — Always verify file content (hashes), not just paths. Question old commits. Find the recent trigger.
- [feedback_evidence_first.md](feedback_evidence_first.md) — Serenity JSON first for all evidence. Console log is fallback only. Never assume values — read from files or ask. No solution without evidence.
- [feedback_qa_first.md](feedback_qa_first.md) — Always rule out QA shared helper changes BEFORE investigating FE or BE. Check AdminLoginSteps, LoginSteps, ProfileWallSteps, BasePageObject, BaseStepObject for recent commits first.

# currentDate
Today's date is 2026-03-14.
