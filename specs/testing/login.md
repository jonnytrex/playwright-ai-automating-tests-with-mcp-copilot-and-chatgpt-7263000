# BuggyBoard Login E2E Test Plan

## Coverage Assessment

`tests/seed.spec.ts` covers a successful login and redirect to `/board`, but does
not assert the login form itself, failed submissions, keyboard submission,
username normalization, or persistence across reloads. Existing browser tests
use the successful login helper as setup; that does not cover these login
behaviors.

## Test Setup and Isolation

- Use a fresh browser context for each scenario.
- Read valid credentials from `users.json`; do not duplicate credentials in
  this plan or depend on another test's authentication state.
- Use the `loginPage` fixture from `tests/fixtures/page-fixtures.ts`.
- Assert both the visible UI and the resulting URL or authentication state.

## Test Scenarios

### 1. Login Form

**Seed:** `tests/seed.spec.ts` (login-flow reference only)

#### 1.1. Display the accessible login form

**File:** `tests/login/login-form.spec.ts`

1. Navigate to `/login` while logged out.
   - expect: The page displays the BuggyBoard heading and a `Login` button.
   - expect: `Username` is a text field and `Password` is a masked password
     field.

### 2. Authentication Results

#### 2.1. Reject invalid credentials

**File:** `tests/login/invalid-credentials.spec.ts`

1. Submit an unknown username with a non-empty password.
2. Repeat with a valid username from `users.json` and an incorrect password.
   - expect: Each attempt remains at `/login`.
   - expect: An accessible alert says `Invalid username or password.`
   - expect: The user is not authenticated and `/board` remains protected.

#### 2.2. Report missing credentials

**File:** `tests/login/required-credentials.spec.ts`

1. Submit with a blank username and non-empty password.
2. Submit with a valid username and blank password.
3. Submit with both fields blank.
   - expect: Each attempt remains at `/login` and shows an accessible alert.
   - expect: The respective messages identify a blank username, blank
     password, or both missing credentials.
   - expect: No attempt authenticates the user.

### 3. Login Interaction and Session

#### 3.1. Submit from either credential field with Enter

**File:** `tests/login/keyboard-submit.spec.ts`

1. Fill valid credentials and press Enter while focused in `Username`.
2. In an independent context, fill valid credentials and press Enter while
   focused in `Password`.
   - expect: Both submissions behave like clicking `Login` and navigate to
     `/board`.

#### 3.2. Trim surrounding whitespace from the username

**File:** `tests/login/username-whitespace.spec.ts`

1. Submit a valid username surrounded by whitespace and its correct password.
   - expect: Authentication succeeds and the app navigates to `/board`.
   - expect: The authenticated username is normalized without the surrounding
     whitespace.

#### 3.3. Keep an authenticated user signed in after reload

**File:** `tests/login/session-persistence.spec.ts`

1. Log in with valid credentials, then reload `/board`.
   - expect: The user remains authenticated and the board is displayed.
2. Navigate to `/login` while authenticated.
   - expect: The app redirects to `/board`.
