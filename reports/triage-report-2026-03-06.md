# QA Triage Report

**Generated**: 2026-03-06
**Run**: Run 1
**Branch**: release/boo
**Build Commit**: 64888fd0cc (QA repo head on release/boo)

## Summary

- Total failures: 1
- FE Code: 0 | BE Code: 0 | QA Automation: 0 | CI/Config: 0 | Inconclusive: 1

## Failures

### 1. TC [EDIT PROFILE] - Validate Maximum Private Photos Upload with Photo Share and Unshare

- **Scenario**: Validate Maximum number of Private Photos with Real-time Private Photo Share and Unshare (profile_id=N009)
- **Classification**: Flaky/Inconclusive
- **Confidence**: MEDIUM
- **Error**: Timeout exception / Assertion error — Messages inbox stuck loading (spinner never resolves), preventing test from clicking on conversation thread
- **Duration**: 678.46s (11m 18s) — 23 steps attempted
- **Stability**: 0.0 (consistently failing)
- **Stack Trace** (key frames):
  ```
  Timeout exception — element not visible within wait period
  XPath: //span[contains(text(),'<username>')]/../../../../../..//p[@class='ConvoRow-body']
  (MessageListingComponent.java:53 — getConversationRecentMessage)
  ```

- **Screenshot Evidence**: Messages/Inbox page shows loading spinner that never completes. The inbox content (conversation threads) failed to load, causing the `WaitUntil.elementToBeVisible` call to timeout when trying to locate the message thread row.

- **Root Cause Analysis**:

  The test fails at **Step 26** ("User clicks on message thread of newly registered member") after logging in as `other_profile_id_1` (N003) and navigating to the Messages page. The inbox API call appears to hang or return no data, leaving the UI in a permanent loading state.

  **No recent production code changes correlate to this failure:**

  | Repo | Recent Changes Checked | Correlation |
  |------|----------------------|-------------|
  | FE (sa-v3) | SATHREE-41521 (restricted members in Conversation.tsx), SATHREE-41354 (iOS viewport fix in Conversation.tsx), SATHREE-41405 (set-primary trigger in EditForm.tsx) | None affect inbox/message listing — these modify the conversation view opened AFTER clicking a thread |
  | BE (seeking) | SATHREE-41398 (Eloquent syntax refactor), SATHREE-41651 (boost validation), SATHREE-41566 (fraud delete) | None touch messaging/inbox API endpoints |
  | QA (sa-ui-automation) | release-boo-run1-fixes (card expiry, API wait, assertion updates, user reverts) | None touch the photo-private-max-count test or its step definitions |

  **Possible causes (not confirmed):**
  1. **Test environment/data issue**: The newly registered test user (N003) may have stale or corrupted session/message data, causing the inbox API to hang
  2. **API latency**: The messages inbox API may be intermittently slow in the test environment, exceeding the `WaitUntil` timeout
  3. **Test user account state**: Profile N003 may be in an unexpected state (suspended, flagged, etc.) preventing message loading
  4. **Timing/race condition**: The API message send (step before navigation) may not have propagated by the time the inbox loads

  **Key observation**: Stability is **0.0** — this test has been consistently failing. This is NOT a new regression from recent code changes. The failure pattern (inbox stuck loading) suggests a **persistent test environment or test data issue** rather than a code regression.

- **Evidence**:
  - Screenshot shows Messages inbox with loading spinner that never resolves
  - No recent FE/BE commits touch the inbox/message-listing components or APIs
  - Stability 0.0 indicates this is a chronic failure, not a new regression
  - The XPath selector `//span[contains(text(),'<username>')]/../../../../../..//p[@class='ConvoRow-body']` targets `ConvoRow-body` — if the inbox never loads, these elements never exist in DOM
  - Duration of 678s (11+ min) with 23 steps suggests the test progressed through photo upload and messaging API steps successfully before failing on the UI interaction

- **Recommended Fix**:
  - Investigate the test user accounts (N003, N008, N009) — verify they are in a clean, valid state in the test environment
  - Check if the Messages inbox API returns data for user N003 by manually calling the endpoint
  - Add explicit wait/retry logic for inbox loading in `MessageConversationDefinitions.java:140` before attempting to click the conversation row
  - Consider resetting test user message data before each run to avoid stale state

- **Recommended Owner**: QA Automation team

---

## Action Items

- [ ] Verify test user accounts N003/N008/N009 are in valid state in test environment
- [ ] Manually test Messages inbox loading for user N003 to rule out API issues
- [ ] Review if the `WaitUntil` timeout is sufficient for inbox loading (current timeout may be too short)
- [ ] Consider adding a health check step before the messaging flow to confirm inbox API returns data
- [ ] Since stability is 0.0, this test should be flagged for review/quarantine until the root cause is fixed
