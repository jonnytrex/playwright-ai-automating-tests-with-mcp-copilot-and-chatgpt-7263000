# BuggyBoard Board Display E2E Test Plan

## Coverage Assessment

Current create, search, and delete tests exercise parts of the board but do not
assert its complete table contract, initial loading state, or the distinct
empty-database message. The CLI confirmed that the table is named `Bugs`, has
ID, Severity, Title, and Owner columns in that order, and distinguishes `No
bugs.` from `No bugs matched.`.

## Test Setup and Isolation

- Use an authenticated, fresh browser context.
- For populated-board scenarios, create uniquely titled test records using the
  API for setup and retain their returned IDs for assertions and cleanup.
- For empty/loading scenarios, intercept only `GET /api/bugs` with a controlled
  response; do not delete shared or seeded records.
- Request `boardPage` from `tests/fixtures/page-fixtures.ts`.

## Test Scenarios

### 1. Board Table

#### 1.1. Display the board columns in the specified order

**File:** `tests/board/table-columns.spec.ts`

1. Navigate to `/board` while authenticated.
   - expect: A table named `Bugs` is visible.
   - expect: Its column headers appear in order: ID, Severity, Title, Owner.

#### 1.2. Display every bug's board data

**File:** `tests/board/bug-rows.spec.ts`

1. Create multiple records with distinct IDs, severities, titles, and owners.
2. Load the board and locate each row by its unique title and captured ID.
   - expect: Each record has one row displaying its ID, uppercase severity,
     exact title, and owner.
   - expect: No unrelated record is mistaken for a test-created row.

#### 1.3. Show an empty-board message when the API has no bugs

**File:** `tests/board/empty-board.spec.ts`

1. Route `GET /api/bugs` to return an empty list before navigating to the
   authenticated board.
   - expect: The table headers remain visible.
   - expect: The table shows `No bugs.` and no bug rows.
   - expect: The distinct search/filter message `No bugs matched.` is not
     shown.

#### 1.4. Show and clear the loading state

**File:** `tests/board/loading-state.spec.ts`

1. Delay the `GET /api/bugs` response, then navigate to `/board`.
   - expect: The table displays `Loading…` while the response is pending.
2. Fulfill the response with a test bug.
   - expect: The loading row is replaced by the test bug's data row.
