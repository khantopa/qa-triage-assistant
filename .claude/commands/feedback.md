# /feedback Command

Use this command to capture feedback for a completed triage run without running a new triage.

## When to use

- You closed the triage session before feedback was captured
- You investigated further after the session and found the real root cause
- You want to promote a pattern candidate to a full pattern

## Usage

```
/feedback
```

No arguments needed. The command will:

1. Find the most recent triage report in `reports/`
2. Check `reports/feedback-log.json` — if feedback already exists for this report, ask if you want to add/amend
3. Check `patterns/candidates.json` — if candidates exist, offer to review them
4. Run feedback capture (your choice of Mode A or Mode B)

## Amending existing feedback

If you ran feedback capture during the session but later found the real root cause:

```
/feedback amend
```

This opens the last feedback entry for editing without creating a duplicate.

## Reviewing pattern candidates

```
/feedback patterns
```

Shows all entries in `patterns/candidates.json` with options to:
- Promote to full pattern
- Accumulate more instances
- Discard
