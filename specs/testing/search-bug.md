# BuggyBoard Search E2E Test Plan

## Coverage Assessment

`tests/search-bug/search-atomic.spec.ts` and
`tests/search-bug/search-grand-tour.spec.ts` cover matching queries, case
insensitivity for `login`, non-matches, and basic clearing. The current tests
do not assert punctuation/whitespace normalization, the clear button's reset
behavior explicitly, or preservation of sorting while searching. State-filter
interaction is also untested.

## Test Setup and Isolation

- Start from a fresh authenticated browser context.
- Create uniquely titled records including punctuation and repeated whitespace
  variants; capture IDs and clean up only those records.
- Use the `boardPage` fixture from `tests/fixtures/page-fixtures.ts`.
- Assert both matching and non-matching rows so the search cannot pass by
  leaving the entire board visible.

## Test Scenarios

### 1. Normalized Title Matching

#### 1.1. Match case, punctuation, and whitespace variants

**File:** `tests/search-bug/normalized-matching.spec.ts`

1. Create titles such as `Login fails`, `Issue with log-in`, and a title with
   repeated whitespace.
2. Search using different letter case, punctuation, and collapsed whitespace.
   - expect: Equivalent normalized title/query pairs match.
   - expect: Titles that do not contain the normalized query are hidden.
   - expect: Matching is based on title only, not owner or description.

### 2. Clear Search

#### 2.1. Clear the query with the X control

**File:** `tests/search-bug/clear-search.spec.ts`

1. Enter a query that hides at least one test record.
2. Click the visible `Clear search` button.
   - expect: The query becomes blank and the clear control is no longer visible.
   - expect: All records permitted by the current state filter are shown again.
   - expect: The no-results message is removed.

### 3. Search with Sorting and State

#### 3.1. Preserve active sorting while filtering results

**File:** `tests/search-bug/sorting-preserved.spec.ts`

1. Sort test records by Title ascending and enter a query matching a subset.
   - expect: Only matching rows remain and their relative Title order is
     unchanged.
   - expect: The Title ascending indicator remains active.

#### 3.2. Combine search with the selected state filter

**File:** `tests/search-bug/state-filter-combination.spec.ts`

1. Create matching Open and Closed records plus non-matching records in both
   states.
2. Select Closed and enter a query matching only one Closed title.
   - expect: Only the record matching both selected state and title query is
     displayed.
   - expect: Clearing the query restores all Closed records without showing
     Open records.
