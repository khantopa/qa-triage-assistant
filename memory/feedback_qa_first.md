---
name: QA automation must be ruled out before FE/BE investigation
description: Always check recent QA shared helper commits before moving to FE or BE investigation
type: feedback
---

Always check recent QA commits to shared helpers before investigating FE or BE code.

**Why:** Email Change failure (2026-03-13) was misclassified as FE Code. The real cause was a QA shared helper change (`goToLoginPageWithUrl` in `AdminLoginSteps.java`) that reordered `deleteAllCookies()` — deleting cookies on the wrong domain. This caused significant wasted manual investigation time going down the FE path.

**How to apply:** For every failure, before any FE or BE git correlation, run:
```bash
git -C <qa_repo> log --oneline --since="14 days ago" -- \
  src/main/java/incube8/seeking/steps/admin/general/AdminLoginSteps.java \
  src/main/java/incube8/seeking/steps/general/wp_public/LoginSteps.java \
  src/main/java/incube8/seeking/steps/profile/edit/ProfileWallSteps.java \
  src/main/java/incube8/seeking/pages/BasePageObject.java \
  src/main/java/incube8/seeking/steps/BaseStepObject.java
```

If any recent commits appear — review them first. A shared helper change can silently affect many unrelated tests. Only move to FE/BE if shared helpers are clean.
