# Test Automation Patterns

This document is the project-wide source of truth for Playwright test automation. Read and follow it when adding or refactoring browser tests.

## Page Object Model

Use the Page Object Model (POM) to keep test scenarios focused on behavior and expectations instead of repeated UI mechanics. Follow [Playwright's POM guidance](https://playwright.dev/docs/pom).

- Put page objects under `tests/pages/`.
- Create one page object class for each routed application page, with exactly one page object class per file. BuggyBoard currently has `LoginPage` for `/login` and `BoardPage` for `/board`.
- Each class receives a Playwright `Page` in its constructor and owns that page's locators and user-facing actions. Prefer accessible locators such as `getByRole` and `getByLabel`.
- Model dialogs and other components in the page object for the route that hosts them. For example, create/edit bug dialogs belong to `BoardPage`; they are not separate routed pages.
- Expose locators for scenario assertions and provide methods for repeated or meaningful user actions. Keep expected outcomes and behavioral assertions in the test.
- Every test that uses a page object must request it through its fixture; tests must not construct page objects themselves or build long raw `page.getBy...` call chains. Use `Page` directly for cross-cutting Playwright capabilities such as network routing, request/response observation, or tracing when those are part of the scenario.

## Page Object Fixtures

Follow [Playwright's test fixture guidance](https://playwright.dev/docs/test-fixtures) and define a typed fixture for every page object in `tests/fixtures/`.

- Keep the shared page-object fixtures in `tests/fixtures/page-fixtures.ts` and extend Playwright's base `test` with a fixture type for every page object class.
- Each fixture depends on Playwright's built-in `page`, constructs its page object, and provides it with `await use(pageObject)`. Keep page-object fixtures test-scoped; do not navigate automatically unless that is an explicit invariant for every consumer.
- Tests import `test` (and `expect`) from the fixture module and request page objects by name in the test or hook fixture arguments.
- Do not construct page objects with `new` in tests or shared helpers. Helpers that need a page object receive the fixture instance as an argument.
- When adding a page object, add its fixture and fixture type at the same time. Every test that uses the page object must consume its fixture.

## Test Data and Hooks

- Use `beforeEach` to establish independent browser state and create fresh test records required by the scenario.
- Use `afterEach` to clean up only records created by that test. Do not rely on fixed database IDs or delete shared/seed data.
- API requests may be used for setup, persistence checks, and cleanup. Drive user workflows through the page objects.
- Register response waits before the UI action that triggers the request, then assert the response and resulting UI state in the test.

## Test Organization

- Keep tests independent, deterministic, and safe to run in parallel. Use unique test data and retain generated identifiers for assertions and cleanup.
- Follow the existing Playwright configuration, fixtures, and repository lint/format conventions. Do not add a second browser automation framework.
