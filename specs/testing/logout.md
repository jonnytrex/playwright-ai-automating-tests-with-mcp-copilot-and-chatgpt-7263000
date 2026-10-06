# BuggyBoard Logout E2E Test Plan

## Coverage Assessment

No test under `tests/` verifies logout or the behavior of protected routes
after logout. The Playwright CLI confirmed that clicking `Logout` redirects to
`/login`, and direct navigation to `/board` while logged out also redirects to
`/login`.

## Test Setup and Isolation

- Start each scenario with a fresh browser context and log in using credentials
  from `users.json`.
- Use `loginPage` and `boardPage` from
  `tests/fixtures/page-fixtures.ts`.
- Do not rely on another test's local storage or browser history.

## Test Scenarios

### 1. Logout and Route Protection

#### 1.1. Log out from the board

**File:** `tests/logout/logout.spec.ts`

1. Log in and verify that `/board` is displayed.
2. Click the title bar's `Logout` button.
   - expect: The browser navigates to `/login`.
   - expect: The login form is visible and the logout control is absent.
   - expect: The stored authenticated user is removed.

#### 1.2. Redirect logged-out users away from the board

**File:** `tests/logout/protected-board.spec.ts`

1. Log in, log out, then navigate directly to `/board`.
   - expect: The app redirects to `/login`.
   - expect: Board-only controls and bug data are not displayed.

#### 1.3. Browser Back does not restore the authenticated board

**File:** `tests/logout/back-after-logout.spec.ts`

1. Log in, log out, then use the browser Back button.
   - expect: The previous authenticated session is not restored.
   - expect: The user remains unauthenticated; any protected route resolves to
     `/login`.
