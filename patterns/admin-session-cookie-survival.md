# Pattern: Admin Session Switch Cookie Survival

**ID**: admin-session-cookie-survival
**Created**: 2026-03-14
**Last Validated**: 2026-03-14
**Confidence**: HIGH
**Times Used**: 1 | **Times Correct**: 1

---

## TRIGGER

Activate this pattern when ALL of the following are true:

- Test switches from member domain → admin → back to member domain mid-scenario
- Failure occurs on the member page **after** the admin session block
- Error is element not found, element not enabled, or modal not rendered — on a feature that is cookie-gated
- Recent QA commit touches `AdminLoginSteps.java`, `LoginSteps.java`, `goToLoginPageWithUrl()`, or `deleteAllCookies()` ordering

**Do NOT activate** if the test never visits admin, or if failure occurs before the admin session block.

---

## PROTOCOL

Execute these steps in strict order.

### Step 1 — Confirm the test flow pattern

Check the feature file for the member → admin → member sequence:

```bash
grep -n "Admin user logs into\|Admin user searches\|Directly navigate to 'Member'\|Complete my profile\|skipPcrAfterLogin" \
  <qa_repo>/src/test/resources/features/**/<test_file>.feature
```

Confirm:
1. A login step sets cookies on member domain (look for `waitForNewUserLoggedIn` with `skipPcrAfterLogin=true`)
2. An admin block follows (`Admin user logs into the application`)
3. The test navigates back to member domain after the admin block
4. The failing step depends on a feature gated by a cookie set in step 1

### Step 2 — Check `deleteAllCookies()` ordering in AdminLoginSteps

```bash
grep -n -A10 "goToLoginPageWithUrl\|deleteAllCookies" \
  <qa_repo>/src/main/java/incube8/seeking/steps/admin/general/AdminLoginSteps.java
```

**Safe ordering (clears member domain cookies):**
```java
adminLoginPage.getDriver().manage().deleteAllCookies(); // ← on member domain
adminLoginPage.open("admin-login", ...);
```

**Broken ordering (only clears admin domain cookies):**
```java
adminLoginPage.open("admin-login", ...);               // ← navigates away first
adminLoginPage.getDriver().manage().deleteAllCookies(); // ← now on admin domain, member cookies survive
adminLoginPage.open("admin-login", ...);
```

### Step 3 — Find the sprint trigger

```bash
git -C <qa_repo> log --oneline --since="14 days ago" -- \
  src/main/java/incube8/seeking/steps/admin/general/AdminLoginSteps.java

git -C <qa_repo> log --oneline --since="14 days ago" -S "deleteAllCookies\|goToLoginPageWithUrl" -- \
  src/main/java/incube8/seeking/steps/admin/general/AdminLoginSteps.java
```

If the ordering change is found → this is the sprint trigger.

### Step 4 — Identify which cookie survived and what it blocks

```bash
grep -n "skipPcrAfterLogin\|addCookie\|pcrHide\|membership-modal" \
  <qa_repo>/src/main/java/incube8/seeking/steps/profile/edit/ProfileWallSteps.java \
  <qa_repo>/src/main/java/incube8/seeking/steps/general/wp_public/LoginSteps.java
```

Match the surviving cookie name to the FE feature it gates (e.g. `pcr_hide_after_login` → `isAfterLoginPcrEligible()`).

---

## TERMINATION CONDITIONS

| Outcome | Classification | Confidence |
|---------|---------------|------------|
| `deleteAllCookies()` ordering changed, cookie survives, gates the failing feature | QA Automation | HIGH |
| Ordering unchanged but Serenity upgrade changed WebDriver init behaviour | QA Automation | MEDIUM |
| Cookie survival confirmed but no recent commit found | Flaky/Inconclusive | LOW |

---

## WHY THIS PATTERN EXISTS

In Serenity 3.x, `getDriver()` eagerly initialised the WebDriver. Calling `deleteAllCookies()` before `open()` deleted cookies from the current page's domain (member domain).

In Serenity 5.x, the proxied WebDriver is not fully instantiated until first page interaction. `deleteAllCookies()` before `open()` had no effect — so the fix was to `open()` first. But this silently changed which domain's cookies get cleared.

Any test that relied on `deleteAllCookies()` wiping member-domain cookies as a side effect of the admin login step will now silently retain those cookies.

**Detectable only by:**
1. Comparing passing vs failing run behaviour on the member page post-admin block
2. Checking `deleteAllCookies()` call order in `AdminLoginSteps.java`

---

## KNOWN INSTANCES

### Instance 1 — Email Change Restriction (Sprint: release/ercole, 2026-03-13)
- **Sprint Trigger**: `b30c74a029` (Mar 7, 2026) — SATHREE-41718 Serenity upgrade fixes by Venkatesh Gopalakrishnan — reordered `deleteAllCookies()` to run after `adminLoginPage.open()`
- **Surviving Cookie**: `pcr_hide_after_login=true` (set by `skipPcrAfterLogin(true)` during member login)
- **Feature Blocked**: `isAfterLoginPcrEligible()` in `modalRules.ts` — AfterLoginPCR modal never renders on Member page
- **Failing Step**: `And User clicks 'Complete my profile' button on 'Profile Wall' modal` (Email_Change.feature:151)
- **Fix**: Restore `deleteAllCookies()` call before `adminLoginPage.open()`, or explicitly delete `pcr_hide_after_login` cookie before navigating back to member domain
