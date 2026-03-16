---
description: Capture feedback for the most recent triage run
argument-hint: [report_path]
allowed-tools: [Read, Write, Glob, mcp__qa-triage__save_feedback, mcp__qa-triage__create_pattern, mcp__qa-triage__get_history]
---

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
2. Call `mcp__qa-triage__save_feedback` to check if feedback already exists for this report — if so, ask if you want to add/amend
3. Call `mcp__qa-triage__get_history` to check for pattern candidates pending review
4. Run feedback capture (your choice of Mode A or Mode B)

## Amending existing feedback

```
/feedback amend
```

This opens the last feedback entry for editing without creating a duplicate.

## Reviewing pattern candidates

```
/feedback patterns
```

Shows all pattern candidates with options to:
- Promote to full pattern via `mcp__qa-triage__create_pattern`
- Accumulate more instances
- Discard
