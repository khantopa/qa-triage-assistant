Ask the user for the path to their test report ZIP file using AskUserQuestion: "Please provide the path to the test report ZIP file."

Once provided, follow the full triage workflow in `.claude/rules/01-workflow.md`. Load each rules file at the appropriate step — do not load all of them upfront.

Key reminders:
- Determine repo relevance from failure URLs BEFORE asking for branch names
- Only ask for branches for repos that are actually needed
- Use the Agent tool to run git correlation in parallel across repos when multiple repos are relevant
- Sprint trigger and root cause are separate — find BOTH when they differ
