# BuggyBoard Delete-Bug E2E Test Plan

## Application Overview

Playwright end-to-end coverage for deleting a bug from its Edit bug modal. The plan follows `specs/constitution.md`, `specs/features/12-delete-bug.md`, and the related create, edit, and board specifications. Clicking a bug opens a dialog named `Edit bug #<id>` with a `Delete` button. Clicking Delete must show a confirmation alert dialog identifying the selected bug. Only the confirmation action sends `DELETE /api/bugs/<id>`; cancel, X, and Escape leave the bug intact and return to the edit dialog.

## Test Setup and Isolation

- Run every scenario in an independent authenticated browser context. Use `tests/seed.spec.ts` as a reference for the login flow and read credentials from `users.json`; do not depend on another test's browser state.
- Before each scenario, create a new target bug through the `New Bug` UI with a unique title, valid severity, owner, and description. Wait for `POST /api/bugs` to return HTTP 201, capture the generated ID from its response, and wait for the new board row. Never delete a hard-coded ID, a seeded record, or a bug left by another test.
- The preservation scenario creates a second unique companion bug in its setup as well; both records must be fresh for that test.
- Track every bug ID created by the test. In teardown, remove only those tracked records that remain, so a failed assertion does not leave test data behind. Do not reset or truncate the shared SQLite database.
- Use unique titles and captured IDs so tests can run alongside existing records. Scope row locators to the table and target title/ID; do not assume a row order or fixed ID.

## Test Scenarios

### 1. Delete Control

**Seed:** `tests/seed.spec.ts` (login-flow reference only)

#### 1.1. Edit modal exposes Delete for a freshly created bug

**File:** `tests/delete-bug/delete-control.spec.ts`

**Setup:** Authenticate and create a fresh target bug as described above.

**Steps:**

1. Locate the board entry by the target's unique title and captured ID, then open it.
   - expect: The dialog is visible with the heading `Edit bug #<id>` for the target.
   - expect: The dialog displays the target's values and a button named `Delete`.
2. Observe the network activity while opening the dialog.
   - expect: `GET /api/bugs/<id>` returns HTTP 200.
   - expect: Opening the dialog sends no `DELETE /api/bugs/<id>` request.

### 2. Confirmation and Cancellation

**Seed:** `tests/seed.spec.ts` (login-flow reference only)

#### 2.1. Canceling confirmation does not delete the bug

**File:** `tests/delete-bug/delete-control.spec.ts`

**Setup:** Authenticate and create a fresh target bug; retain its unique title and generated ID. Observe page DELETE requests for the target.

**Steps:**

1. Open the edit dialog and click `Delete`.
   - expect: A confirmation alert dialog identifies `#<id>` and the bug title,
     with `Delete` and `Cancel` actions and a `Close` control.
   - expect: No DELETE request has been sent; `GET /api/bugs/<id>` still
     returns HTTP 200.
2. Independently dismiss the confirmation with Escape, Cancel, and the X
   control, reopening it before each dismissal.
   - expect: Each dismissal closes only the confirmation and returns to the
     selected bug's edit dialog.
   - expect: The bug row remains visible and no DELETE request is sent.

### 3. Successful Deletion

**Seed:** `tests/seed.spec.ts` (login-flow reference only)

#### 3.1. Delete a freshly created bug after explicit confirmation

**File:** `tests/delete-bug/delete-success.spec.ts`

**Setup:** Authenticate and create a fresh target bug; retain its unique title and generated ID.

**Steps:**

1. Open the target's edit dialog and click `Delete`.
   - expect: The confirmation identifies the target bug.
   - expect: The bug is still present and no DELETE request has yet occurred.
2. Start waiting for the `DELETE /api/bugs/<id>` response, then click the
   confirmation's `Delete` action.
   - expect: Exactly one DELETE request is sent for the target ID and it
     returns HTTP 204 No Content.
3. Wait for deletion to finish and the board to refresh.
   - expect: Both dialogs close and the target row is no longer visible.
   - expect: A fresh `GET /api/bugs` response excludes the target ID and
     `GET /api/bugs/<id>` returns HTTP 404.

### 4. Target Isolation

**Seed:** `tests/seed.spec.ts` (login-flow reference only)

#### 3.1. Deleting one fresh bug leaves another fresh bug untouched

**File:** `tests/delete-bug/delete-preserves-other-bugs.spec.ts`

**Setup:** Authenticate and create two distinct fresh bugs, a target and a companion. Capture both IDs and titles.

**Steps:**

1. Open the target bug, click `Delete`, then explicitly confirm in the
   confirmation dialog.
   - expect: The response is HTTP 204 and the edit dialog closes.
   - expect: The target row is absent after the board refresh.
2. Inspect the companion row and the refreshed bug list.
   - expect: The companion row remains visible with its original ID and title.
   - expect: The API still returns the companion and does not return the target.
   - expect: No DELETE request was sent for the companion ID.

### 5. Delete Failure

**Seed:** `tests/seed.spec.ts` (login-flow reference only)

#### 4.1. A failed delete keeps the fresh bug available for retry

**File:** `tests/delete-bug/delete-failure.spec.ts`

**Setup:** Authenticate and create a fresh target bug. Route only `DELETE /api/bugs/<id>` for that captured ID to return HTTP 500 with a JSON error message.

**Steps:**

1. Open the target, click `Delete`, and confirm while the failure route is active.
   - expect: The request returns HTTP 500.
   - expect: The edit dialog remains visible and exposes the returned error in an accessible alert.
   - expect: The target row remains on the board and the bug remains available from `GET /api/bugs/<id>`.
2. Remove the route, reopen confirmation, and retry Delete for the same
   test-created target.
   - expect: The retry returns HTTP 204.
   - expect: The dialog closes and the target row disappears after refresh.

## Coverage Notes

- The control, success, preservation, and failure scenarios each create fresh
  bug data and require explicit confirmation before deletion.
- The delete feature contract is defined in `specs/features/12-delete-bug.md`. This plan focuses on delete availability, successful removal, isolation of other records, and recovery from a failed request; editing and bug-state behavior remain covered by their respective plans.
