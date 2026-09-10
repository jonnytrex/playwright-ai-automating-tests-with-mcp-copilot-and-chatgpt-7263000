# BuggyBoard Create New Bug End-to-End Test Plan

## Application Overview

Comprehensive Playwright end-to-end coverage for BuggyBoard's authenticated create-new-bug workflow. The live app was explored at http://localhost:5173/board using the configured Chromium planner session. The board exposes a semantic New Bug button; the modal is role=dialog with accessible name Create bug and labels Title, Severity, Owner, Description. Severity is a native select with values high, mid, low and MID selected by default. Owner defaults to the authenticated user (observed user buggy). A successful submission issued POST /api/bugs with HTTP 201 Created, then GET /api/bugs, closed the dialog, and rendered a row containing ID 1, HIGH, the title, and owner. Empty Save kept the modal open and displayed Title is required. and Description is required. The feature spec additionally requires every field to be required, cancellation through Cancel/X/Escape, backdrop non-dismissal, and persistence verification.

## Test Scenarios

### 1. Create New Bug Workflow

**Seed:** `tests/seed.spec.ts`

#### 1.1. Open create-bug modal and expose the complete accessible form

**File:** `tests/create-bug/open-modal.spec.ts`

**Steps:**
  1. Start from a fresh isolated database/session and authenticate with the first account from users.json through /login, then verify the browser is at /board.
    - expect: The board page is loaded at /board.
    - expect: The title bar exposes a button named New Bug.
  2. Click the New Bug button.
    - expect: A visible element with role dialog and accessible name Create bug is displayed.
    - expect: The dialog contains accessible controls named Title, Severity, Owner, and Description.
    - expect: The dialog contains buttons named Save and Cancel and an accessible Close button for the upper-right X.
    - expect: The dialog is modal (aria-modal=true) and the board remains behind the dimmed backdrop.
  3. Inspect the initial control values and types.
    - expect: Title and Description are empty text inputs/textarea.
    - expect: Severity is a native combobox with visible options HIGH, MID, and LOW; its value is mid and displayed option is MID.
    - expect: Owner is a text input pre-filled with the authenticated username.
    - expect: No create request is sent merely by opening the modal.

#### 1.2. Default owner and severity can be changed before saving

**File:** `tests/create-bug/defaults-and-severity.spec.ts`

**Steps:**
  1. Open the New Bug dialog as authenticated user buggy.
    - expect: Owner has value buggy.
    - expect: Severity has value mid and displays MID.
  2. Select HIGH, then MID, then LOW using the Severity combobox.
    - expect: The selected value changes to high, mid, and low respectively.
    - expect: The displayed severity label remains uppercase HIGH, MID, or LOW.
    - expect: The select styling changes with the selected severity and uses the application severity token/class convention; HIGH, MID, and LOW are visually distinguishable.
  3. Change Owner to vanny without leaving the dialog.
    - expect: The Owner field contains vanny and remains editable before submission.

#### 1.3. Save a valid high-severity bug and verify the persisted record

**File:** `tests/create-bug/save-valid-bug.spec.ts`

**Steps:**
  1. Use a fresh database/session, log in as buggy, open New Bug, and fill Title with Login fails with special characters, select HIGH, leave Owner as buggy, and fill Description with When I use < and > in my password, login fails.
    - expect: The fields contain exactly the entered values, including the < and > characters.
    - expect: The Owner field contains buggy.
  2. Wait for the POST /api/bugs response, then click Save in the dialog.
    - expect: A POST request is made to /api/bugs and returns HTTP 201 Created.
    - expect: The request payload contains the entered title, severity HIGH/high according to the API contract, owner buggy, and the complete description.
    - expect: The Create bug dialog closes after the successful response.
    - expect: A follow-up GET /api/bugs is made and the board shows the created bug row with an automatically assigned integer ID, HIGH, the title, and owner buggy.
  3. Verify persistence independently after a page refresh or direct API/database read using the test fixture's supported isolation helper.
    - expect: The created record still exists with the same title, severity, owner, and description.
    - expect: The generated ID is present and is an integer; the test does not assert a hard-coded ID unless the isolated fixture explicitly guarantees it.

#### 1.4. Save valid bugs for every severity option

**File:** `tests/create-bug/save-each-severity.spec.ts`

**Steps:**
  1. For each value high, mid, and low, open a fresh New Bug dialog and fill a unique title, the severity option, the default owner, and a non-empty description; click Save and wait for the API response.
    - expect: Each submission returns HTTP 201 Created from POST /api/bugs.
    - expect: Each dialog closes only after the successful save.
    - expect: Each persisted record retains its selected severity and displays the corresponding uppercase HIGH, MID, or LOW label on the board.
    - expect: Severity presentation uses the documented design tokens: HIGH #b84a2e, MID #a67c47, and LOW #4a6b5e, or the equivalent CSS custom properties --color-severity-high/mid/low.

#### 1.5. Required-field validation blocks incomplete submissions

**File:** `tests/create-bug/required-fields.spec.ts`

**Steps:**
  1. For each field in Title, Severity, Owner, and Description, start with a fresh authenticated board and open New Bug. Leave only that field blank while filling every other required field with valid data, then attempt Save.
    - expect: No POST /api/bugs request is sent.
    - expect: The dialog remains visible.
    - expect: The user is informed which field is required, using the app's visible validation message or accessible error state.
    - expect: Values entered into the other fields are preserved.
  2. Open a fresh dialog, leave all fields at their initial values, and click Save.
    - expect: The dialog remains open.
    - expect: No bug is created.
    - expect: Validation identifies every missing required value according to the implemented contract. During exploration, the live app reported Title is required. and Description is required.; the test should capture any current gap for Severity and Owner rather than silently accepting it.
  3. Repeat with whitespace-only values for Title, Owner, and Description and a valid value in the other fields.
    - expect: Whitespace-only required values are rejected or normalized according to the feature contract.
    - expect: The dialog remains open and no create request is issued.

#### 1.6. Cancel closes the modal without saving

**File:** `tests/create-bug/cancel-no-save.spec.ts`

**Steps:**
  1. Start from an isolated authenticated board, record the existing bug count, open New Bug, and enter a unique title, change Severity, edit Owner, and enter a description.
    - expect: All entered values are visible in the dialog.
  2. Click Cancel.
    - expect: The dialog is hidden.
    - expect: The URL remains /board.
    - expect: No POST /api/bugs request was sent.
    - expect: The board contains no new row with the unique title and the isolated bug count is unchanged.
  3. Open New Bug again.
    - expect: The form is reset to its defaults: empty Title and Description, MID severity, and the authenticated username as Owner.

#### 1.7. Close X cancels without saving

**File:** `tests/create-bug/close-x-no-save.spec.ts`

**Steps:**
  1. Open New Bug, enter a unique title and non-empty description, and select LOW.
    - expect: The entered values are present before dismissal.
  2. Click the button named Close in the upper-right corner of the Create bug dialog.
    - expect: The dialog closes with the same behavior as Cancel.
    - expect: No POST /api/bugs request occurs.
    - expect: No bug with the unique title is persisted.
    - expect: The board remains at /board.

#### 1.8. Escape cancels without saving

**File:** `tests/create-bug/escape-no-save.spec.ts`

**Steps:**
  1. Open New Bug, fill Title and Description with unique data, and change Severity to HIGH.
    - expect: The dialog remains visible with the entered values.
  2. Press Escape while the dialog is open.
    - expect: The dialog closes.
    - expect: No POST /api/bugs request occurs.
    - expect: The entered bug is not present after reopening the modal or refreshing the board.
    - expect: The board remains usable at /board.

#### 1.9. Backdrop click does not dismiss or lose form data

**File:** `tests/create-bug/backdrop-preservation.spec.ts`

**Steps:**
  1. Open New Bug and fill Title, Severity, Owner, and Description with distinctive values.
    - expect: The dialog is visible and all values are present.
  2. Click the dimmed area outside the inner modal panel, targeting the outer role=dialog backdrop rather than a control inside the panel.
    - expect: The dialog remains visible.
    - expect: All four field values are unchanged.
    - expect: No POST /api/bugs request occurs.
  3. Click Save and wait for the successful response.
    - expect: The bug is saved exactly once with the preserved values and the dialog closes.

#### 1.10. Create bug requests and UI errors are handled deterministically

**File:** `tests/create-bug/request-failure.spec.ts`

**Steps:**
  1. Open New Bug with valid data and intercept POST /api/bugs with a controlled server error or abort, using the existing Playwright route/interception conventions.
    - expect: The request is attempted with the expected payload.
    - expect: The dialog does not falsely close as though the bug was saved.
    - expect: The user receives a visible or accessible failure indication consistent with the app's error-handling conventions.
    - expect: Entered values remain available for correction or retry unless the app contract explicitly states otherwise.
  2. Restore the route, retry Save, and wait for the successful response.
    - expect: Exactly one successful bug is created after the retry.
    - expect: The dialog closes only after success.
    - expect: The board/API/database contains one record for the test title, not duplicates.

#### 1.11. Create-bug flow is isolated and repeatable

**File:** `tests/create-bug/isolation-and-repeatability.spec.ts`

**Steps:**
  1. Run the create-bug scenarios with a unique title suffix per test and an isolated database reset or API cleanup before each test; authenticate via the seed flow rather than sharing browser state between tests.
    - expect: Tests do not depend on the exploratory bug currently in the local database.
    - expect: Each test can run independently and in parallel-safe mode or explicitly serializes database access when using the single SQLite file.
    - expect: Credentials come from users.json, never hard-coded in test logic.
  2. After a successful save, query the supported API or SQLite database in a fixture/teardown verification step.
    - expect: The persisted record has an integer ID, exact title, selected severity, owner, and description.
    - expect: Cleanup removes only records created by the test, or the isolated database is discarded and recreated.
    - expect: The plan does not assert that a created bug must appear on the board beyond what the current implementation exposes; the feature spec marks board display and individual bug viewing out of scope, so API/SQLite verification is authoritative.
