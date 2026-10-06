# BuggyBoard Edit Existing Bug E2E Test Plan

## Application Overview

End-to-end Playwright coverage for editing an existing BuggyBoard bug from the authenticated board. The plan follows specs/constitution.md, specs/product/vision.md, specs/design/theme.md, specs/engineering/tech-stack.md, specs/engineering/coding-standards.md, specs/engineering/development-process.md, specs/features/09-edit-bug.md, and related board, severity, delete, and state specifications. Use tests/seed.spec.ts as the seed file; each scenario must begin from a fresh authenticated browser state and use isolated bug data or restore its fixture in teardown. The running app was explored at http://localhost:5173/board with seeded bug #1.

## Test Scenarios

### 1. Edit Bug Modal

**Seed:** `tests/seed.spec.ts`

#### 1.1. Open an existing board row and display the complete edit modal

**File:** `tests/edit-bug/open-edit-modal.spec.ts`

**Steps:**
  1. Start from the authenticated board created by tests/seed.spec.ts and wait for table Bugs and at least one data row. Locate the row by role button and its observed accessible name pattern, for example `page.getByRole('button', { name: /1 HIGH Login fails with special characters buggy/ })`; do not use an unscoped `getByLabel('Title')` because the board search also matches that label substring.
    - expect: The board is at `/board` and the existing bug row is visible.
    - expect: The row is keyboard-focusable/clickable and contains ID, severity, title, and owner.
  2. Click the bug row and wait for `page.getByRole('dialog', { name: 'Edit bug #1' })`.
    - expect: A visible dialog is displayed with accessible role `dialog` and `aria-modal="true"`.
    - expect: The heading is `Edit bug #1` (parameterize the ID for non-seeded fixtures).
    - expect: The dialog contains labeled controls `ID`, `Title`, `Severity`, `State`, `Owner`, and `Description`, plus buttons `Save`, `Cancel`, `Close`, and `Delete`.
    - expect: Initial values match the selected bug, including the description fetched from `GET /api/bugs/1`.
  3. Assert the open request with `page.waitForResponse(response => response.url().endsWith('/api/bugs/1') && response.request().method() === 'GET')` or inspect the response body.
    - expect: The detail request returns HTTP 200 and its JSON ID/title/severity/owner/description/state matches the values rendered in the modal.
    - expect: No PUT or DELETE request is sent merely by opening the modal.

#### 1.2. Verify editability, read-only ID, and severity presentation

**File:** `tests/edit-bug/field-controls.spec.ts`

**Steps:**
  1. Open an existing bug and scope every locator under `const dialog = page.getByRole('dialog')`. Inspect `#edit-bug-id`, `#edit-bug-title`, `#edit-bug-severity`, `#edit-bug-state`, `#edit-bug-owner`, and `#edit-bug-description`.
    - expect: The ID control is a textbox with value equal to the bug ID, `readOnly === true`, and `aria-readonly="true"`; attempting to fill it does not change it.
    - expect: Title and Owner are enabled editable textboxes; Description is an enabled editable textbox/textarea; Severity and State are enabled editable comboboxes.
  2. Inspect `dialog.getByLabel('Severity')` and its options, then select `high`, `mid`, and `low` one at a time. Compare the selected control class/computed color with the board badge for the same severity and read the root CSS custom properties.
    - expect: The options are exactly HIGH, MID, and LOW (values observed as `high`, `mid`, `low`).
    - expect: The selected control receives `severity-select-high`, `severity-select-mid`, or `severity-select-low`.
    - expect: HIGH uses `--color-severity-high` / `#b84a2e`, MID uses `--color-severity-mid` / `#a67c47`, and LOW uses `--color-severity-low` / `#4a6b5e`; the selected text and tint are consistent with the board severity badge tokens.
    - expect: Changing a field enables Save, while returning every field to its initial value disables Save again.

#### 1.3. Backdrop does not discard edits

**File:** `tests/edit-bug/backdrop.spec.ts`

**Steps:**
  1. Open a bug, change Title to a unique temporary value, and assert Save is enabled. Click the dimmed area outside the white modal panel using a coordinate inside the dialog overlay but outside its centered panel, or a locator for the outer `[role="dialog"]` at position `{ x: 10, y: 10 }`.
    - expect: The dialog remains visible after the backdrop click.
    - expect: The changed Title and all other entered values are preserved.
    - expect: No PUT or DELETE request occurs.
  2. Press Escape only after the backdrop assertion, then verify the dialog closes and query `GET /api/bugs/:id` or reopen the row.
    - expect: Escape closes the modal without saving.
    - expect: The API/reopened modal still contains the original title and other original data.

#### 1.4. Cancel, X, and Escape close without saving

**File:** `tests/edit-bug/close-without-saving.spec.ts`

**Steps:**
  1. For each close action in independent subtests or freshly reopened modal instances, change a different field to a unique sentinel: click `Cancel`; click `dialog.getByRole('button', { name: 'Close' })` (the upper-right X); press `page.keyboard.press('Escape')`.
    - expect: Each action closes the dialog.
    - expect: Each action sends neither PUT nor DELETE.
    - expect: The board remains visible after close.
  2. After each close, call `GET /api/bugs/:id` and/or reopen the same row, and compare every field with the pre-edit fixture.
    - expect: Title, severity, state, owner, and description remain unchanged after Cancel, X, and Escape.
    - expect: A failed implementation that updates any field or sends a save request fails the scenario.

### 2. Edit Bug Persistence and Validation

**Seed:** `tests/seed.spec.ts`

#### 2.1. Save modified fields and verify API/database persistence

**File:** `tests/edit-bug/save-persistence.spec.ts`

**Steps:**
  1. Create or select an isolated existing bug with known title, severity, state, owner, and description. Open it from the board and change at least Title, Severity, Owner, and Description; optionally change State in the same request because State is implemented by the related state feature.
    - expect: Each changed value is reflected in the modal and Save is enabled.
    - expect: The ID remains unchanged and read-only.
  2. Start waiting for a PUT response to `/api/bugs/:id`, click Save, and capture the request body and response.
    - expect: Exactly one PUT is sent to `/api/bugs/<id>` with JSON fields title, severity, state, owner, and description.
    - expect: The payload contains trimmed values and accepted normalized severity/state values; the observed implementation sends lowercase `severity` and `state`.
    - expect: The response is HTTP 200 and returns the updated bug with the same immutable ID.
  3. Assert the dialog closes, wait for the board refresh GET `/api/bugs`, then query `GET /api/bugs/<id>` directly or reopen the row.
    - expect: The modal is closed and the board shows the edited title/severity/owner.
    - expect: The detail API response and, where the test harness permits, the SQLite row in `backend/data/buggyboard.db` contain all edited fields, proving persistence beyond the modal state.
    - expect: The fixture is deleted or restored after the test so later tests do not depend on its mutation.

#### 2.2. Save remains disabled with no changes and with blank required fields

**File:** `tests/edit-bug/save-validation.spec.ts`

**Steps:**
  1. Open an existing bug without changing any control and inspect `dialog.getByRole('button', { name: 'Save' })`.
    - expect: Save is disabled.
    - expect: Clicking Save does not close the dialog and sends no PUT request.
  2. Independently clear each required field Title, Owner, and Description; also verify the Severity control cannot be blank through its options (and exercise an invalid blank value via direct fixture/API only if the implementation permits it). Keep a changed value in at least one other field so the only reason for disablement is blank validation.
    - expect: Save is disabled whenever Title, Owner, Description, or Severity is blank/invalid.
    - expect: The user cannot submit while any required field is blank.
    - expect: No PUT request is sent and the modal remains open.
  3. Restore all required values to nonblank values but make no net change to the original record; then change one value to a valid new value.
    - expect: Save stays disabled when there is no net change.
    - expect: Save becomes enabled only when all required values are nonblank and at least one field differs from the initial record.

#### 2.3. Related State and Delete controls are scoped correctly

**File:** `tests/edit-bug/related-controls-scope.spec.ts`

**Steps:**
  1. Open the edit modal and assert the live controls `State` (combobox with Open/Closed) and `Delete` are present.
    - expect: State and Delete presence are documented as live behavior, not omitted from the test plan.
  2. Do not duplicate the State workflow or Delete workflow in the core edit-bug scenarios. Link implementation coverage to `specs/features/13-bug-status.md` for changing Open/Closed and `specs/features/12-delete-bug.md` for DELETE/removal behavior; keep only a smoke assertion here that the controls are available to those feature suites.
    - expect: State behavior is considered in-scope for the related feature suite, including persistence and board filtering.
    - expect: Delete behavior is considered in-scope for the delete feature suite, including DELETE, modal close, and row removal.
    - expect: The edit-bug plan does not accidentally treat Delete as a save/cancel concern or duplicate destructive-flow coverage.
