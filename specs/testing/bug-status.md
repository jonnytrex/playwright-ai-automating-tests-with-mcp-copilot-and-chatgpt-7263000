# BuggyBoard Bug State E2E Test Plan

## Coverage Assessment

No automated test under `tests/` covers the Open/Closed field, state changes,
or the board's state filter. CLI exploration confirmed that a newly created
bug defaults to Open, the edit dialog exposes a State combobox, saving Closed
removes that bug from the default Open view, and selecting Closed displays it.
Selecting Closed with no matching records displays `No bugs matched.`.

## Test Setup and Isolation

- Start each scenario from a fresh authenticated browser context.
- Create uniquely titled test bugs and retain IDs for cleanup. Create records
  in both states when a scenario needs to compare filters.
- Use `boardPage` for interactions and API responses for setup/persistence
  checks; do not mutate shared or seeded bugs.
- Keep test-created records isolated and remove only those IDs in teardown.

## Test Scenarios

### 1. State Lifecycle

#### 1.1. Create a bug in the Open state

**File:** `tests/bug-status/create-default-open.spec.ts`

1. Create a bug through the New Bug dialog and inspect its API record.
   - expect: The returned bug has state OPEN.
   - expect: The bug is visible in the default Open view and is not shown in
     Closed.
   - expect: The create dialog does not expose a State field.

#### 1.2. Change a bug's state from Open to Closed

**File:** `tests/bug-status/edit-state.spec.ts`

1. Open a fresh Open bug and change State to Closed, then save.
   - expect: The edit dialog initially reflects the saved state and offers
     Open and Closed options.
   - expect: PUT `/api/bugs/<id>` returns the updated record with state CLOSED.
   - expect: The dialog closes and the record disappears from the Open view.
2. Select Closed.
   - expect: The updated record appears in the Closed view.

#### 1.3. Change a bug from Closed back to Open

**File:** `tests/bug-status/reopen-bug.spec.ts`

1. Open a Closed test bug, change State to Open, and save.
   - expect: The API record contains state OPEN.
   - expect: The bug is visible in Open and absent from Closed.

### 2. State Filter

#### 2.1. Default to Open and show only Open bugs

**File:** `tests/bug-status/default-open-filter.spec.ts`

1. Create at least one Open and one Closed test bug, then load `/board`.
   - expect: Open is selected by default.
   - expect: Open records are displayed and Closed records are not.

#### 2.2. Filter Closed bugs and handle an empty state

**File:** `tests/bug-status/closed-filter.spec.ts`

1. Select Closed when both Open and Closed records exist.
   - expect: Only Closed records are displayed.
2. Repeat when there are no Closed records.
   - expect: `No bugs matched.` is displayed and no Open record appears.

#### 2.3. Combine state selection with search and sorting

**File:** `tests/bug-status/state-filter-combinations.spec.ts`

1. With records in both states, select Closed, sort by Title, and search for a
   title shared by only a subset of Closed records.
   - expect: Only records matching the state and title query remain.
   - expect: The selected sort order and indicator remain active.
