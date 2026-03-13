# Pattern: Dragyn ML False Positive

**ID**: dragyn-false-positive
**Created**: 2026-03-13
**Last Validated**: 2026-03-13
**Confidence**: HIGH
**Times Used**: 1 | **Times Correct**: 1

---

## TRIGGER

Activate this pattern when ALL of the following are true:

- Test name or story contains any of: `Dragyn`, `photo moderation`, `dragyn photo`, `dragyn recommendation`
- Error message contains: `Dragyn history table has reason for`
- Test involves a photo upload with a known content_type (e.g. `GROUP_OF_PEOPLE`, `CELEBRITY_INDIVIDUAL`, `LOGO`, etc.)

**Do NOT activate** for Dragyn failures where the error is element not found, timeout, or login failures — those are standard QA Automation issues.

---

## PROTOCOL

Execute these steps in strict order.

### Step 1 — Get the actual Dragyn reason from Serenity recorded data

Do NOT guess from the error message alone. The assertion message only says the check failed — not what the actual value was.

```bash
# In the Serenity JSON for the failing test, look for reportData entries
# containing "Dragyn reason as"
cat <json_file> | python3 -c "
import json, sys
data = json.load(sys.stdin)
def find(steps):
    for s in steps:
        for e in s.get('reportData', []):
            if 'Dragyn reason' in e.get('title', ''):
                print(e['title'], '->', e['contents'])
        find(s.get('children', []))
find(data.get('testSteps', []))
"
```

Record: **actual_reason** = whatever `getDragynReason().getText()` returned.

---

### Step 2 — Confirm whether QA override is intentionally absent

This is the critical decision gate. The same symptom (wrong reason) has two very different causes.

```bash
# Check git log on the upload step definition for recent removal of qa_override / x-qa-override
git -C <qa_repo> log --oneline --since="14 days ago" -- <upload_step_definition_path>

# If commits found, inspect them:
git -C <qa_repo> show <sha> -- <upload_step_definition_path> | grep -i "qa_override\|x-qa-override\|x-qa-recommendation\|x-qa-reason"
```

**Decision:**

| Finding | Meaning | Next Step |
|---------|---------|-----------|
| Override **recently removed** (within sprint window) | Regression — override removal broke the test | → Step 3 (QA path) |
| Override **never present** in git history | Intentional E2E — test validates real Dragyn | → Step 4 (Dragyn path) |

---

### Step 3 — QA Regression Path (override recently removed)

```bash
# Find the commit that removed the override
git -C <qa_repo> log --oneline -S "qa_override\|x-qa-override" -- <step_definition_path>

# Check feature file for recent reason/recommendation changes
git -C <qa_repo> log --oneline --since="14 days ago" -- <feature_file_path>
```

**Termination**: Classify as `QA Automation` | `HIGH` confidence.
- Sprint Trigger: the commit that removed the override
- Recommended fix: restore `x-qa-override=true` and QA params in the upload step

---

### Step 4 — Dragyn False Positive Path (override never present)

Confirm the image itself is not the problem before escalating to Dragyn.

```bash
# 1. Verify the image file hasn't changed recently
git -C <qa_repo> log --oneline --since="14 days ago" -- <image_file_path>
git -C <qa_repo> log --oneline --follow -- <image_file_path>

# 2. Check if any BE changes affected the Dragyn callback or content_type routing
git -C <be_repo> log --oneline --since="14 days ago" -- app/Repositories/Dragyn/
git -C <be_repo> log --oneline --since="14 days ago" -- app/Http/Controllers/Api/Mock/DragynController.php
```

**If image changed recently** → test data issue, classify as `QA Automation`
**If no recent image or BE changes** → Dragyn ML false positive

**Termination**: Classify as `External Service — Dragyn Misclassification` | `HIGH` confidence.
- Owner: Dragyn team
- Action: Provide image file + actual vs expected reason to Dragyn team for model review

---

## TERMINATION CONDITIONS

| Outcome | Classification | Confidence |
|---------|---------------|------------|
| QA override recently removed from step definition | QA Automation | HIGH |
| Override never present + image recently changed | QA Automation | MEDIUM |
| Override never present + no image/BE changes + actual reason ≠ expected | External Service — Dragyn Misclassification | HIGH |
| Override never present + actual reason matches expected | No failure (re-run, was transient) | N/A |

---

## KNOWN INSTANCES

### Instance 1 — Dragyn Photo Moderation GROUP_OF_PEOPLE (Sprint: release/ercole, 2026-03-13)
- **Test**: Validation of Dragyn Photo Moderation with Attractive and Generous Members
- **Actual reason**: `"Minor in photo"`
- **Expected reason**: `"Cannot distinguish user in group photo"` OR `"Photo passed dragyn checks"`
- **Image**: `group_of_people.jpg` — unchanged since 2022, not a minor photo
- **Override status**: Never sent — intentional E2E test by design (confirmed by QA and BE teams)
- **Classification**: External Service — Dragyn Misclassification
- **Lesson**: Always check Serenity `recordReportData` for actual Dragyn reason before any code investigation. Confirm override intent via git history before escalating.
