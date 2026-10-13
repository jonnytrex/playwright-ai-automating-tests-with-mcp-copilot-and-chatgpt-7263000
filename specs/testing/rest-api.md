# BuggyBoard REST API Test Plan

## Scope

Exercise the HTTP API directly, independently of the browser UI. The route
surface in `backend/src/index.ts` is:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API and database health |
| POST | `/api/login` | Validate credentials from the root `users.json` |
| GET | `/api/bugs` | List bugs |
| POST | `/api/bugs` | Create a bug |
| GET | `/api/bugs/:id` | Read one bug |
| PUT | `/api/bugs/:id` | Replace a bug's editable fields |
| DELETE | `/api/bugs/:id` | Delete one bug |

This is an API-level plan, not a Playwright browser-flow plan. Use
`APIRequestContext` or an equivalent HTTP client against the running backend
(`http://localhost:3000`). The app currently has no authentication middleware
on bug routes and login does not issue a session or token; do not assume either
behavior exists.

## Shared setup and data rules

- Start the backend with its normal initialization so the SQLite bugs table
  exists. Confirm test requests target the intended local instance.
- Read a valid username/password pair from root `users.json` at runtime; do
  not copy credentials into test output, logs, or this plan.
- Create bugs through `POST /api/bugs`, retain each generated ID, and remove
  only records created by the test. Never depend on fixed IDs, truncate the
  shared database, or delete seed/other test data.
- Use unique titles and keep request data/results local to each test. Tests
  that change or delete records must use their own records.
- Bug fields in successful API responses are `id`, `title`, `severity`,
  `owner`, `description`, and `state`. Stored/returned severity values are
  `HIGH`, `MID`, or `LOW`; state values are `OPEN` or `CLOSED`.
- Create requests use `title`, `severity`, `owner`, and `description`. Update
  requests replace all four fields and also require `state`.
- Assert status, JSON shape/values (or empty body for 204), and persisted state
  through a subsequent API request. For validation failures, also confirm no
  partial mutation or unintended record creation occurred.
- Missing `Content-Type: application/json` is not a separately specified
  contract. Send JSON with that content type except in the malformed-body case.

## Test cases

### GET `/api/health`

| ID | Case | Request/setup | Expected |
| --- | --- | --- | --- |
| H-01 | Healthy API and database | `GET /api/health` while the database is available | HTTP 200; JSON has `ok: true`, `message: "BuggyBoard API is running"`, and `database: "connected"`. |
| H-02 | Database health query fails | In an isolated test process, inject a database failure for the health-check `SELECT 1` without stopping the HTTP server | HTTP 200; same `ok` and `message`, with `database: "error"`. This is the explicit degraded-health response in the handler, not a 5xx response. |

### POST `/api/login`

| ID | Case | Request/setup | Expected |
| --- | --- | --- | --- |
| L-01 | Valid credentials | Submit one valid pair loaded from `users.json` | HTTP 200; JSON is exactly the authenticated `username` property, normalized for surrounding whitespace. No password is returned. |
| L-02 | Username whitespace is trimmed | Add leading/trailing whitespace to a valid username and submit its unchanged password | HTTP 200; response username equals the trimmed username. |
| L-03 | Unknown username | Submit an unknown nonblank username and a nonblank password | HTTP 401; `{ "error": "invalid_credentials", "message": "Invalid username or password." }`. |
| L-04 | Incorrect password | Submit a valid username and an incorrect nonblank password | HTTP 401 with the same generic invalid-credentials response as L-03. |
| L-05 | Blank username | Submit whitespace-only username and a nonblank password | HTTP 400; `error` is `blank_username` and message is `Username cannot be blank.` |
| L-06 | Blank password | Submit a valid username and an empty password | HTTP 400; `error` is `blank_password` and message is `Password cannot be blank.` |
| L-07 | Both credentials missing/blank | Submit `{}` and, separately, empty username and password | HTTP 400; `error` is `missing_credentials` and message is `Please enter your username and password.` |
| L-08 | Malformed JSON | Send invalid JSON with `Content-Type: application/json` | Express JSON parsing rejects the request with HTTP 400. Assert the status and that login did not succeed; do not depend on Express's default HTML error body or stack formatting. |
| L-09 | Non-string username | Submit an object whose `username` is a number, with a password | **Known implementation gap:** the route casts but does not validate the runtime type; the service calls `.trim()`, so this currently produces an unhandled server error (normally HTTP 500). Record this as a failing robustness case until the route returns a controlled 400 response. |

### GET `/api/bugs`

| ID | Case | Request/setup | Expected |
| --- | --- | --- | --- |
| B-01 | List with no records | Use an isolated empty test database | HTTP 200; JSON is an empty array. |
| B-02 | List persisted bugs | Create at least two bugs through the API, then request the collection | HTTP 200; JSON array contains each created bug once, with all six response properties and normalized uppercase severity / state. Results are ordered by ascending `id`. |
| B-03 | Collection query parameters | Request `/api/bugs?unused=value` | HTTP 200 and the same collection contract as B-02; the handler does not define query filtering. |
| B-04 | GET body is ignored | Send a GET with a valid JSON body, if the HTTP client allows it | HTTP 200 and the normal collection response; the route does not use request-body fields. |
| B-05 | Malformed JSON body | Send a GET with an invalid JSON body and JSON content type, if the HTTP client allows it | HTTP 400 from the global JSON parser before the list route runs. Assert status, not Express's default error body. |

### POST `/api/bugs`

Use a valid baseline body such as
`{ "title": "unique title", "severity": "mid", "owner": "QA", "description": "repro steps" }`.

| ID | Case | Request/setup | Expected |
| --- | --- | --- | --- |
| C-01 | Create with lowercase severity | Submit the baseline body | HTTP 201; response includes a generated numeric `id`, trimmed input values, `severity: "MID"`, and `state: "OPEN"`. A subsequent GET by ID returns the same bug. |
| C-02 | Accept each supported severity spelling | Create separate records with `high`, `mid`, `low`, and uppercase equivalents | Each returns HTTP 201 with the corresponding uppercase severity. Clean up each returned ID. |
| C-03 | Trim surrounding field whitespace | Submit nonblank fields with surrounding whitespace | HTTP 201; `title`, `owner`, and `description` are trimmed; severity is normalized. |
| C-04 | Missing title | Omit `title` from an otherwise valid body | HTTP 400; `{ "error": "blank_title", "message": "Title is required." }`; collection has no new record. |
| C-05 | Empty or whitespace title | Submit `title: ""` and `title: "   "` separately | HTTP 400 with `blank_title`; no record is created. |
| C-06 | Missing/blank severity | Omit `severity`, then submit an empty or whitespace severity | HTTP 400; `error` is `blank_severity`, message is `Severity is required (high, mid, or low).`; no record is created. |
| C-07 | Unsupported severity | Submit an unsupported value such as `critical` | HTTP 400 with the same `blank_severity` response as C-06; no record is created. |
| C-08 | Missing/blank owner | Omit `owner`, then submit whitespace-only owner | HTTP 400; `{ "error": "blank_owner", "message": "Owner is required." }`; no record is created. |
| C-09 | Missing/blank description | Omit `description`, then submit whitespace-only description | HTTP 400; `{ "error": "blank_description", "message": "Description is required." }`; no record is created. |
| C-10 | Empty object | Submit `{}` | HTTP 400 with `blank_title`, reflecting the handler's validation order; no record is created. |
| C-11 | Wrongly typed fields | Submit a number/object instead of each required string, one field at a time | The route converts non-string bug properties to empty strings. Expect the corresponding required-field 400 response and no record. |
| C-12 | Malformed JSON | Send invalid JSON with JSON content type | HTTP 400 from the JSON parser; no record is created. Assert status, not Express's default error page text. |

### GET `/api/bugs/:id`

| ID | Case | Request/setup | Expected |
| --- | --- | --- | --- |
| G-01 | Read existing bug | Create a bug, then GET its returned ID | HTTP 200; JSON matches the created record, including generated ID and normalized values. |
| G-02 | Numeric ID does not exist | GET a positive numeric ID that is not present | HTTP 404; `{ "error": "not_found", "message": "Bug not found." }`. |
| G-03 | Non-numeric ID | GET `/api/bugs/not-a-number` | HTTP 400; `{ "error": "invalid_id", "message": "Bug ID must be a number." }`. |
| G-04 | Zero or negative ID | GET `0` and a negative integer | HTTP 404 with `not_found` because the ID parses as numeric but no such row exists. |
| G-05 | Numeric prefix with trailing text | With a known existing ID `n`, GET `/api/bugs/njunk` | **Known implementation gap:** `parseInt` accepts the numeric prefix, so this currently reads bug `n` (HTTP 200). A strict-ID contract should reject the path with HTTP 400; keep this case marked as a failing hardening assertion until parsing is tightened. |

### PUT `/api/bugs/:id`

Start from a fresh bug. A complete valid update body includes
`title`, `severity`, `owner`, `description`, and `state`.

| ID | Case | Request/setup | Expected |
| --- | --- | --- | --- |
| U-01 | Update every field | PUT a complete body with changed values and lowercase valid severity/state | HTTP 200; response retains the same ID, trims text, normalizes severity/state to uppercase, and a subsequent GET returns the updated values. |
| U-02 | Update state in either direction | Update `OPEN` to `closed`, then `CLOSED` to `open` | Each returns HTTP 200 with normalized `CLOSED` then `OPEN`; GET confirms persistence. |
| U-03 | Missing/nonexistent ID | PUT a syntactically numeric ID with no row, using a valid body | HTTP 404 with `not_found`; no record is created. Existence is checked before field validation. |
| U-04 | Non-numeric ID | PUT `/api/bugs/not-a-number` with a valid body | HTTP 400 with `invalid_id`; no record changes. |
| U-05 | Numeric-prefix ID | PUT `/api/bugs/njunk` for an existing ID `n` | **Known implementation gap:** currently updates bug `n` because of `parseInt`. Strict parsing should return HTTP 400 without changing that bug. |
| U-06 | Missing/blank title | Omit title, then submit blank/whitespace title in separate requests | HTTP 400 with `blank_title`; GET confirms the original bug remains unchanged. |
| U-07 | Missing/blank/unsupported severity | Omit severity, submit whitespace, and submit an unsupported value separately | HTTP 400 with `blank_severity`; original bug remains unchanged. |
| U-08 | Missing/blank owner | Omit owner, then submit whitespace-only owner | HTTP 400 with `blank_owner`; original bug remains unchanged. |
| U-09 | Missing/blank description | Omit description, then submit whitespace-only description | HTTP 400 with `blank_description`; original bug remains unchanged. |
| U-10 | Missing/blank/invalid state | Omit state, submit whitespace, and submit an unsupported state separately | HTTP 400; `{ "error": "invalid_state", "message": "State must be Open or Closed." }`; original bug remains unchanged. |
| U-11 | Empty object | PUT `{}` to an existing ID | HTTP 400 with `blank_title`, following validation order; original bug remains unchanged. |
| U-12 | Wrongly typed fields | Replace each required value with a number/object in separate requests | Non-string bug properties are converted to empty strings; expect the corresponding validation 400 and no mutation. |
| U-13 | Malformed JSON | Send invalid JSON with JSON content type to an existing ID | HTTP 400 from the parser; original bug remains unchanged. |

### DELETE `/api/bugs/:id`

| ID | Case | Request/setup | Expected |
| --- | --- | --- | --- |
| D-01 | Delete existing bug | Create a fresh bug and DELETE its ID | HTTP 204 with an empty response body; subsequent GET returns HTTP 404. |
| D-02 | Delete same ID twice | Delete a test-created bug, then repeat DELETE | First response is HTTP 204; second is HTTP 404 with `not_found`. |
| D-03 | Delete numeric ID that does not exist | DELETE a positive numeric ID with no row | HTTP 404; `{ "error": "not_found", "message": "Bug not found." }`. |
| D-04 | Non-numeric ID | DELETE `/api/bugs/not-a-number` | HTTP 400 with `invalid_id`; no record is deleted. |
| D-05 | Zero or negative ID | DELETE `0` and a negative integer | HTTP 404 with `not_found`; no unrelated record is deleted. |
| D-06 | Numeric-prefix ID | With known existing ID `n`, DELETE `/api/bugs/njunk` | **Known implementation gap:** currently deletes bug `n` because of `parseInt`. Strict ID validation should return HTTP 400 and preserve the bug. Use an isolated test-created record only. |

### Shared HTTP behavior and cross-endpoint checks

| ID | Case | Request/setup | Expected |
| --- | --- | --- | --- |
| X-01 | CORS preflight for an API route | Send `OPTIONS /api/bugs` with `Origin: http://localhost:5173`, `Access-Control-Request-Method: POST`, and `Access-Control-Request-Headers: Content-Type` | Express's automatic OPTIONS response is successful (HTTP 200); response includes the configured `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` values. |
| X-02 | Unconfigured origin | Send an API request with a different `Origin` | The server continues to return the literal configured origin `http://localhost:5173`; it does not reflect the caller's origin. Browser enforcement is outside a direct HTTP assertion. |
| X-03 | Unknown API path | GET `/api/not-a-route` | Express default not-found response (HTTP 404); no API route is invoked. Do not assert a custom JSON error contract, which the app does not define. |
| X-04 | CRUD lifecycle and isolation | Create two unique bugs; GET/list both; update one; delete that one | The updated record retains its ID and new values; the other record is unchanged; deleted ID is absent from list and returns 404; cleanup removes only the surviving test-created record. |

## Known gaps / contract decisions

- Item routes use `parseInt(id, 10)`, which accepts numeric prefixes and may
  read, update, or delete an unintended record for IDs such as `12junk`.
  G-05, U-05, and D-06 are strict-validation hardening cases and currently fail
  the desired 400 expectation. Their setup must use a disposable record.
- Login assumes `username` is a string. A JSON numeric/object username can
  cause an unhandled error instead of a controlled client error; L-09 records
  this as a gap. The implementation should validate request types before
  calling the service.
- Bug service/database errors are not translated into a stable API error
  response. Do not require a particular JSON error body for database failures
  outside the health endpoint; add such a contract only if the API defines one.
- Bug CRUD routes are currently callable without login. If that is not
  intentional, authentication requirements need to be specified separately
  before adding API expectations for 401/403 behavior.
- The API does not define pagination, filtering, or sorting parameters for
  `GET /api/bugs`; the list is ordered by ascending ID.

## Source references

- `backend/src/index.ts` — HTTP routes, status codes, JSON parsing, and CORS
  headers.
- `backend/src/bugService.ts` — bug validation, normalization, persistence,
  and ordering.
- `backend/src/authService.ts` and `backend/src/users.ts` — login rules and
  runtime credential source.
- `backend/src/db.ts` — bug table schema and allowed severity/state values.
- `specs/engineering/api-conventions.md` — `/api` route prefix convention.
