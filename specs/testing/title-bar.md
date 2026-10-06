# BuggyBoard Title Bar and Branding E2E Test Plan

## Coverage Assessment

The example tests in `tests/example.spec.ts` target playwright.dev, not
BuggyBoard. Existing BuggyBoard tests use the title bar's `New Bug`, search,
and `Logout` controls as setup or test actions, but do not verify its branding,
the logo asset, favicon, or complete set of authenticated controls.

## Test Setup and Isolation

- Use the authenticated `boardPage` fixture from
  `tests/fixtures/page-fixtures.ts` for title bar checks.
- Use a fresh logged-out context for favicon checks; do not require login.
- Verify asset responses or image natural dimensions rather than relying only
  on pixel screenshots.

## Test Scenarios

### 1. Authenticated Title Bar

#### 1.1. Display BuggyBoard branding and controls

**File:** `tests/title-bar/board-title-bar.spec.ts`

1. Log in and navigate to `/board`.
   - expect: The header contains the BuggyBoard logo and `BuggyBoard` heading.
   - expect: The logo uses the app's `/logo_50x50.png` asset and loads
     successfully.
   - expect: The header exposes the `Search bugs by title` field, `New Bug`
     button, and `Logout` button.

### 2. Browser Branding

#### 2.1. Reference the BuggyBoard favicon

**File:** `tests/title-bar/favicon.spec.ts`

1. Navigate to the app while logged out and inspect the document's icon link.
   - expect: The page references `/favicon.ico`.
   - expect: The favicon asset request succeeds.
