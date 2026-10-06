# BuggyBoard Column Sorting E2E Test Plan

## Coverage Assessment

No current test asserts board sorting. During CLI exploration, the board
displayed a descending arrow on Severity by default; clicking Title changed
the active indicator to ascending.

## Test Setup and Isolation

- Use a fresh authenticated browser context for each scenario.
- Create test bugs with distinct titles, owners, and severities so ordering is
  unambiguous; retain IDs for cleanup.
- Scope assertions to data rows and column headers in the `Bugs` table.
- Request the `boardPage` fixture from
  `tests/fixtures/page-fixtures.ts`.

## Test Scenarios

### 1. Default and Column Sorting

#### 1.1. Apply default Severity descending order

**File:** `tests/sort-board/default-sort.spec.ts`

1. Create HIGH, MID, and LOW test bugs and load `/board`.
   - expect: Rows are ordered HIGH, MID, then LOW.
   - expect: Severity has the descending indicator and no other header does.

#### 1.2. Sort each board column ascending and descending

**File:** `tests/sort-board/column-directions.spec.ts`

1. For ID, Severity, Title, and Owner, click the column header once.
2. Click the same header again.
   - expect: The first click sorts ascending; the second sorts descending.
   - expect: The arrow indicator changes from up to down with each click.
   - expect: Row values follow numeric order for ID, LOW/MID/HIGH severity
     order for ascending Severity, and alphabetical order for Title and Owner.

#### 1.3. Keep only one active sort column

**File:** `tests/sort-board/single-active-column.spec.ts`

1. Sort by Owner, then click Severity.
   - expect: Only Severity shows an `aria-sort` value and sort indicator.
   - expect: The records are ordered by Severity in its newly selected
     ascending direction.

#### 1.4. Retain sort order when filtering the board

**File:** `tests/sort-board/sort-with-filters.spec.ts`

1. Sort test records by Title ascending, then enter a search that matches only
   some records.
2. Select Open or Closed when test records exist in both states.
   - expect: Search and state filtering reduce the displayed records without
     changing their selected sort order or active indicator.
