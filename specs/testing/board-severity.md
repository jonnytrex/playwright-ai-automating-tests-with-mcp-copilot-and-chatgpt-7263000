# BuggyBoard Severity Presentation E2E Test Plan

## Coverage Assessment

The current tests create bugs with MID severity and inspect severity values in
the edit modal, but none assert board badge colors, severity design tokens, or
relative visual distinction. Existing create/edit plans mention severity
controls, but those scenarios are not currently implemented as automated
tests.

## Test Setup and Isolation

- Authenticate using a fresh browser context.
- Create one uniquely titled bug at each severity and retain the IDs for cleanup.
- Use API setup for deterministic severity data; assert visible presentation
  through the board page and dialog fixtures.
- Do not depend on row ordering when locating badges.

## Test Scenarios

### 1. Board Severity Badges

#### 1.1. Display all severity levels as uppercase badges with design colors

**File:** `tests/board-severity/board-badges.spec.ts`

1. Create test bugs with HIGH, MID, and LOW severity, then load `/board`.
   - expect: Each row displays its severity in uppercase.
   - expect: Each severity badge uses the matching text and tinted background
     colors from `--color-severity-high`, `--color-severity-mid`, or
     `--color-severity-low`.
   - expect: The token values are `#b84a2e`, `#a67c47`, and `#4a6b5e`,
     respectively, and all three badges are visually distinguishable.

#### 1.2. Preserve severity presentation in modal controls

**File:** `tests/board-severity/modal-severity.spec.ts`

1. Open the create-bug dialog and select HIGH, MID, and LOW in turn.
2. Open an existing bug's edit dialog and repeat the selection checks.
   - expect: Each selected value is uppercase in the control.
   - expect: The selected control uses the same severity token and tint as its
     corresponding board badge.
