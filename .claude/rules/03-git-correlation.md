# Git Correlation Rules

## URL-Based Repo Routing

Determine which repos are relevant **before** asking the user for branches or running any git commands.

| Failing Step URL | Repos to Check |
|-----------------|----------------|
| `admin.*` only | BE_REPO + QA_REPO (admin pages are server-rendered — FE repo not relevant) |
| React app pages | FE_REPO + BE_REPO + QA_REPO |
| Mixed (admin + React) | Check which page the **failing step** occurred on, then apply rules above |

**How to determine URL context**: In the Serenity JSON for the failing test step, look at `url`, `restQuery`, or page object references.

Only ask the user for branches for the repos you actually need.

## Fetch Latest Before Any Analysis

```bash
git -C <repo_path> fetch origin <branch>
git -C <repo_path> checkout <branch>
git -C <repo_path> pull origin <branch>
```

If branch not found locally:
```bash
git -C <repo_path> fetch origin
git -C <repo_path> branch -a | grep <branch_name>
git -C <repo_path> checkout <branch>
git -C <repo_path> pull origin <branch>
```

Always use `git -C <path>`. Never `cd` into a repo.

## Finding the Sprint Trigger (Critical Rule)

**The goal is to find the commit that caused the failure THIS sprint — not just any related historical commit.**

### Step 1: Look at the sprint window first (last 14 days)

```bash
# Commits in the last 14 days on the release branch
git -C <repo_path> log --oneline --since="14 days ago" <branch>

# Commits in the last 14 days touching files implicated in the failure
git -C <repo_path> log --oneline --since="14 days ago" -- <file_path>
```

If a recent commit (within 14 days) touches the failing area → this is likely the **sprint trigger**.

### Step 2: If no recent commits, widen to 30 days then 90 days

Only go further back if nothing recent is found. Clearly state when you are going back further and why.

### Step 3: If git blame points to an old commit, ask "Why now?"

When `git blame` or `git log` returns a commit that is **months old**, do NOT accept it as the direct cause. Investigate:

1. Was this test recently added to the run suite? (Check CI config changes, tag additions)
2. Was a related step definition changed more recently?
3. Was there a framework/dependency upgrade that changed behaviour?
4. Did an external service change behaviour?

### Step 4: Report the chain of causation

Always present:
- **Sprint Trigger**: The most recent commit that directly caused the failure (within the sprint window)
- **Root Cause** (if different): The older commit that introduced the underlying defect
- Explain the link between them

Example:
> - Sprint Trigger: `e5d195a0dd` (Oct 14, 2025) — changed selfie upload to use `APPROVED_MALE`
> - Root Cause: `681e0b9cff` (Jul 31, 2025) — replaced `sd-1.jpg` with a duplicate of `approved_male.jpg`
> - Link: The root cause created the duplicate; the trigger made the test exercise it

## Git Commands Reference

```bash
# Recent commits on the branch
git -C <repo_path> log --oneline -20 <branch>

# Commits touching a specific file (with follow for renames)
git -C <repo_path> log --oneline --follow -- <file_path>

# Blame a specific line range
git -C <repo_path> blame <file> -L <start>,<end>

# Commits since N days ago touching a path
git -C <repo_path> log --oneline --since="14 days ago" -- <path>
```

## Multi-Repo Parallelism

When multiple repos are relevant, use the Agent tool to run git correlation in parallel — one subagent per repo — then synthesise the results.

Each subagent should:
1. Fetch and pull the branch
2. Check the sprint window (14 days) for relevant commits
3. Run blame on implicated files
4. Return: recent commits list, blame output, suspected sprint trigger
