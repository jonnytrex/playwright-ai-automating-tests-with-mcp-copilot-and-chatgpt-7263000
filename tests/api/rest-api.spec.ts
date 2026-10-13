import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type APIRequestContext, test as base } from "@playwright/test";

const API_BASE_URL = "http://localhost:3000";
const USERS_PATH = resolve(process.cwd(), "users.json");

interface UserAccount {
  username: string;
  password: string;
}

interface BugInput {
  title: string;
  severity: string;
  owner: string;
  description: string;
}

interface Bug extends BugInput {
  id: number;
  severity: "HIGH" | "MID" | "LOW";
  state: "OPEN" | "CLOSED";
}

interface ApiError {
  error: string;
  message: string;
}

type TestFixtures = {
  api: APIRequestContext;
  createdBugIds: number[];
};

function loadTestUser(): UserAccount {
  const users: unknown = JSON.parse(readFileSync(USERS_PATH, "utf-8"));
  if (!Array.isArray(users)) {
    throw new Error("users.json must contain an array of user accounts");
  }

  const user = users.find(
    (candidate): candidate is UserAccount =>
      typeof candidate === "object" &&
      candidate !== null &&
      "username" in candidate &&
      "password" in candidate &&
      typeof candidate.username === "string" &&
      typeof candidate.password === "string"
  );
  if (!user) {
    throw new Error("users.json must contain at least one valid user account");
  }
  return user;
}

const testUser = loadTestUser();
const test = base.extend<TestFixtures>({
  api: async ({ playwright }, use) => {
    const api = await playwright.request.newContext({ baseURL: API_BASE_URL });
    await use(api);
    await api.dispose();
  },
  createdBugIds: async ({ api }, use) => {
    const ids: number[] = [];
    await use(ids);

    for (const id of ids) {
      const response = await api.delete(`/api/bugs/${id}`);
      expect([204, 404]).toContain(response.status());
    }
  },
});

function uniqueTitle(label: string): string {
  return `${label}-${randomUUID()}`;
}

function validBugInput(title = uniqueTitle("api-test")): BugInput {
  return {
    title,
    severity: "mid",
    owner: "API test",
    description: `Test description for ${title}`,
  };
}

async function createBug(
  api: APIRequestContext,
  createdBugIds: number[],
  input: BugInput = validBugInput()
): Promise<Bug> {
  const response = await api.post("/api/bugs", { data: input });
  expect(response.status()).toBe(201);
  const bug = (await response.json()) as Bug;
  if (Number.isInteger(bug.id)) {
    createdBugIds.push(bug.id);
  }
  return bug;
}

async function expectApiError(
  response: Awaited<ReturnType<APIRequestContext["post"]>>,
  status: number,
  error: string,
  message: string
): Promise<void> {
  expect(response.status()).toBe(status);
  const body = (await response.json()) as ApiError;
  expect(body).toEqual({ error, message });
}

async function expectUniqueTitleAbsent(
  api: APIRequestContext,
  title: string
): Promise<void> {
  const response = await api.get("/api/bugs");
  expect(response.status()).toBe(200);
  const bugs = (await response.json()) as Bug[];
  expect(bugs.some((bug) => bug.title === title)).toBe(false);
}

function changedBugInput(bug: Bug): BugInput & { state: string } {
  return {
    title: `${bug.title}-updated`,
    severity: "high",
    owner: "Updated API test",
    description: `${bug.description} updated`,
    state: "closed",
  };
}

test.describe("BuggyBoard REST API", () => {
  test("reports API and database health", async ({ api }) => {
    const response = await api.get("/api/health");

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      message: "BuggyBoard API is running",
      database: "connected",
    });
  });

  test.describe("POST /api/login", () => {
    test("accepts valid credentials without returning the password", async ({
      api,
    }) => {
      const response = await api.post("/api/login", {
        data: { username: testUser.username, password: testUser.password },
      });

      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ username: testUser.username });
    });

    test("trims surrounding username whitespace", async ({ api }) => {
      const response = await api.post("/api/login", {
        data: {
          username: `  ${testUser.username}  `,
          password: testUser.password,
        },
      });

      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ username: testUser.username });
    });

    test("rejects an unknown username with a generic error", async ({ api }) => {
      const response = await api.post("/api/login", {
        data: { username: uniqueTitle("unknown"), password: "incorrect" },
      });

      await expectApiError(
        response,
        401,
        "invalid_credentials",
        "Invalid username or password."
      );
    });

    test("rejects an incorrect password with a generic error", async ({
      api,
    }) => {
      const response = await api.post("/api/login", {
        data: {
          username: testUser.username,
          password: `${testUser.password}-incorrect`,
        },
      });

      await expectApiError(
        response,
        401,
        "invalid_credentials",
        "Invalid username or password."
      );
    });

    test("rejects a blank username", async ({ api }) => {
      const response = await api.post("/api/login", {
        data: { username: "   ", password: "nonblank" },
      });

      await expectApiError(
        response,
        400,
        "blank_username",
        "Username cannot be blank."
      );
    });

    test("rejects a blank password", async ({ api }) => {
      const response = await api.post("/api/login", {
        data: { username: testUser.username, password: "" },
      });

      await expectApiError(
        response,
        400,
        "blank_password",
        "Password cannot be blank."
      );
    });

    test("rejects missing and jointly blank credentials", async ({ api }) => {
      const requests = [
        api.post("/api/login", { data: {} }),
        api.post("/api/login", { data: { username: "", password: "" } }),
      ];
      for (const responsePromise of requests) {
        await expectApiError(
          await responsePromise,
          400,
          "missing_credentials",
          "Please enter your username and password."
        );
      }
    });

    test("rejects malformed JSON", async ({ api }) => {
      const response = await api.post("/api/login", {
        data: "{",
        headers: { "Content-Type": "application/json" },
      });

      expect(response.status()).toBe(400);
    });

    test("rejects non-string usernames with a controlled validation error", async ({
      api,
    }) => {
      const response = await api.post("/api/login", {
        data: { username: 42, password: "nonblank" },
      });

      await expectApiError(
        response,
        400,
        "blank_username",
        "Username cannot be blank."
      );
    });
  });

  test.describe("GET /api/bugs", () => {
    test("lists persisted bugs in ascending ID order", async ({
      api,
      createdBugIds,
    }) => {
      const first = await createBug(api, createdBugIds);
      const second = await createBug(api, createdBugIds);

      const response = await api.get("/api/bugs");
      expect(response.status()).toBe(200);
      const bugs = (await response.json()) as Bug[];
      expect(bugs.map((bug) => bug.id)).toEqual(
        [...bugs.map((bug) => bug.id)].sort((left, right) => left - right)
      );
      expect(bugs.find((bug) => bug.id === first.id)).toEqual(first);
      expect(bugs.find((bug) => bug.id === second.id)).toEqual(second);
      expect(Object.keys(first).sort()).toEqual(
        ["description", "id", "owner", "severity", "state", "title"].sort()
      );
    });

    test("ignores unsupported collection query parameters", async ({
      api,
      createdBugIds,
    }) => {
      const created = await createBug(api, createdBugIds);
      const response = await api.get("/api/bugs?unused=value");

      expect(response.status()).toBe(200);
      const bugs = (await response.json()) as Bug[];
      expect(bugs.find((bug) => bug.id === created.id)).toEqual(created);
    });

    test("ignores a valid GET body", async ({ api }) => {
      const response = await api.fetch("/api/bugs", {
        method: "GET",
        data: { title: "ignored" },
      });

      expect(response.status()).toBe(200);
      expect(Array.isArray(await response.json())).toBe(true);
    });

    test("rejects a malformed JSON GET body before listing", async ({ api }) => {
      const response = await api.fetch("/api/bugs", {
        method: "GET",
        data: "{",
        headers: { "Content-Type": "application/json" },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe("POST /api/bugs", () => {
    test("creates a bug with normalized fields and a generated ID", async ({
      api,
      createdBugIds,
    }) => {
      const input = validBugInput();
      const created = await createBug(api, createdBugIds, input);

      expect(created).toEqual({
        ...input,
        id: expect.any(Number),
        severity: "MID",
        state: "OPEN",
      });
      const response = await api.get(`/api/bugs/${created.id}`);
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual(created);
    });

    for (const severity of ["high", "mid", "low", "HIGH", "MID", "LOW"]) {
      test(`accepts ${severity} severity`, async ({ api, createdBugIds }) => {
        const input = { ...validBugInput(), severity };
        const created = await createBug(api, createdBugIds, input);
        expect(created.severity).toBe(severity.toUpperCase());
      });
    }

    test("trims text fields", async ({ api, createdBugIds }) => {
      const title = uniqueTitle("trimmed");
      const created = await createBug(api, createdBugIds, {
        title: ` ${title} `,
        severity: " mid ",
        owner: " API test ",
        description: " reproduction steps ",
      });

      expect(created.title).toBe(title);
      expect(created.severity).toBe("MID");
      expect(created.owner).toBe("API test");
      expect(created.description).toBe("reproduction steps");
    });

    const createInvalidCases: Array<{
      name: string;
      body: (title: string) => Record<string, unknown>;
      error: string;
      message: string;
      titlePresent?: boolean;
    }> = [
      {
        name: "missing title",
        body: () => ({ severity: "mid", owner: "QA", description: "steps" }),
        error: "blank_title",
        message: "Title is required.",
      },
      {
        name: "empty title",
        body: (title) => ({
          title: "",
          severity: "mid",
          owner: "QA",
          description: title,
        }),
        error: "blank_title",
        message: "Title is required.",
      },
      {
        name: "whitespace title",
        body: (title) => ({
          title: "   ",
          severity: "mid",
          owner: "QA",
          description: title,
        }),
        error: "blank_title",
        message: "Title is required.",
      },
      {
        name: "missing severity",
        body: (title) => ({ title, owner: "QA", description: "steps" }),
        error: "blank_severity",
        message: "Severity is required (high, mid, or low).",
      },
      {
        name: "blank severity",
        body: (title) => ({
          ...validBugInput(title),
          severity: "   ",
        }),
        error: "blank_severity",
        message: "Severity is required (high, mid, or low).",
      },
      {
        name: "unsupported severity",
        body: (title) => ({ ...validBugInput(title), severity: "critical" }),
        error: "blank_severity",
        message: "Severity is required (high, mid, or low).",
      },
      {
        name: "missing owner",
        body: (title) => ({ title, severity: "mid", description: "steps" }),
        error: "blank_owner",
        message: "Owner is required.",
      },
      {
        name: "blank owner",
        body: (title) => ({ ...validBugInput(title), owner: "   " }),
        error: "blank_owner",
        message: "Owner is required.",
      },
      {
        name: "missing description",
        body: (title) => ({ title, severity: "mid", owner: "QA" }),
        error: "blank_description",
        message: "Description is required.",
      },
      {
        name: "blank description",
        body: (title) => ({ ...validBugInput(title), description: "   " }),
        error: "blank_description",
        message: "Description is required.",
      },
      {
        name: "empty object",
        body: () => ({}),
        error: "blank_title",
        message: "Title is required.",
      },
      {
        name: "non-string title",
        body: (title) => ({ ...validBugInput(title), title: 42 }),
        error: "blank_title",
        message: "Title is required.",
      },
      {
        name: "non-string severity",
        body: (title) => ({ ...validBugInput(title), severity: { level: "mid" } }),
        error: "blank_severity",
        message: "Severity is required (high, mid, or low).",
      },
      {
        name: "non-string owner",
        body: (title) => ({ ...validBugInput(title), owner: 42 }),
        error: "blank_owner",
        message: "Owner is required.",
      },
      {
        name: "non-string description",
        body: (title) => ({ ...validBugInput(title), description: { text: "x" } }),
        error: "blank_description",
        message: "Description is required.",
      },
    ];

    for (const scenario of createInvalidCases) {
      test(`rejects ${scenario.name} without creating a bug`, async ({
        api,
      }) => {
        const title = uniqueTitle("invalid-create");
        const response = await api.post("/api/bugs", {
          data: scenario.body(title),
        });

        await expectApiError(response, 400, scenario.error, scenario.message);
        if (scenario.titlePresent !== false) {
          await expectUniqueTitleAbsent(api, title);
        }
      });
    }

    test("rejects malformed JSON without creating a bug", async ({ api }) => {
      const response = await api.post("/api/bugs", {
        data: "{",
        headers: { "Content-Type": "application/json" },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe("GET /api/bugs/:id", () => {
    test("returns an existing bug", async ({ api, createdBugIds }) => {
      const created = await createBug(api, createdBugIds);
      const response = await api.get(`/api/bugs/${created.id}`);

      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual(created);
    });

    test("returns not found for a deleted numeric ID", async ({
      api,
      createdBugIds,
    }) => {
      const created = await createBug(api, createdBugIds);
      const deletion = await api.delete(`/api/bugs/${created.id}`);
      expect(deletion.status()).toBe(204);

      await expectApiError(
        await api.get(`/api/bugs/${created.id}`),
        404,
        "not_found",
        "Bug not found."
      );
    });

    test("rejects non-numeric IDs", async ({ api }) => {
      await expectApiError(
        await api.get("/api/bugs/not-a-number"),
        400,
        "invalid_id",
        "Bug ID must be a number."
      );
    });

    test("returns not found for zero and negative numeric IDs", async ({
      api,
    }) => {
      for (const id of ["0", "-1"]) {
        await expectApiError(
          await api.get(`/api/bugs/${id}`),
          404,
          "not_found",
          "Bug not found."
        );
      }
    });

    test("rejects numeric-prefix IDs without reading a bug", async ({
      api,
      createdBugIds,
    }) => {
      const created = await createBug(api, createdBugIds);
      await expectApiError(
        await api.get(`/api/bugs/${created.id}junk`),
        400,
        "invalid_id",
        "Bug ID must be a number."
      );
      expect((await api.get(`/api/bugs/${created.id}`)).status()).toBe(200);
    });
  });

  test.describe("PUT /api/bugs/:id", () => {
    test("updates every field and persists normalized values", async ({
      api,
      createdBugIds,
    }) => {
      const created = await createBug(api, createdBugIds);
      const input = changedBugInput(created);
      const response = await api.put(`/api/bugs/${created.id}`, {
        data: input,
      });

      expect(response.status()).toBe(200);
      const updated = (await response.json()) as Bug;
      expect(updated).toEqual({
        ...input,
        id: created.id,
        severity: "HIGH",
        state: "CLOSED",
      });
      expect(await (await api.get(`/api/bugs/${created.id}`)).json()).toEqual(
        updated
      );

      const reopened = await api.put(`/api/bugs/${created.id}`, {
        data: { ...changedBugInput(updated), state: "open" },
      });
      expect(reopened.status()).toBe(200);
      expect(((await reopened.json()) as Bug).state).toBe("OPEN");
    });

    test("returns not found for a deleted numeric ID", async ({
      api,
      createdBugIds,
    }) => {
      const created = await createBug(api, createdBugIds);
      expect((await api.delete(`/api/bugs/${created.id}`)).status()).toBe(204);

      await expectApiError(
        await api.put(`/api/bugs/${created.id}`, {
          data: changedBugInput(created),
        }),
        404,
        "not_found",
        "Bug not found."
      );
    });

    test("rejects non-numeric IDs", async ({ api }) => {
      await expectApiError(
        await api.put("/api/bugs/not-a-number", {
          data: { ...validBugInput(), state: "open" },
        }),
        400,
        "invalid_id",
        "Bug ID must be a number."
      );
    });

    test("rejects numeric-prefix IDs without updating a bug", async ({
      api,
      createdBugIds,
    }) => {
      const created = await createBug(api, createdBugIds);
      await expectApiError(
        await api.put(`/api/bugs/${created.id}junk`, {
          data: changedBugInput(created),
        }),
        400,
        "invalid_id",
        "Bug ID must be a number."
      );
      expect(await (await api.get(`/api/bugs/${created.id}`)).json()).toEqual(
        created
      );
    });

    const updateInvalidCases: Array<{
      name: string;
      update: (original: Bug) => Record<string, unknown>;
      error: string;
      message: string;
    }> = [
      {
        name: "missing title",
        update: (bug) => {
          const body: Record<string, unknown> = changedBugInput(bug);
          delete body.title;
          return body;
        },
        error: "blank_title",
        message: "Title is required.",
      },
      {
        name: "blank title",
        update: (bug) => ({ ...changedBugInput(bug), title: "   " }),
        error: "blank_title",
        message: "Title is required.",
      },
      {
        name: "missing severity",
        update: (bug) => {
          const body: Record<string, unknown> = changedBugInput(bug);
          delete body.severity;
          return body;
        },
        error: "blank_severity",
        message: "Severity is required (high, mid, or low).",
      },
      {
        name: "blank or unsupported severity",
        update: (bug) => ({ ...changedBugInput(bug), severity: "critical" }),
        error: "blank_severity",
        message: "Severity is required (high, mid, or low).",
      },
      {
        name: "missing owner",
        update: (bug) => {
          const body: Record<string, unknown> = changedBugInput(bug);
          delete body.owner;
          return body;
        },
        error: "blank_owner",
        message: "Owner is required.",
      },
      {
        name: "blank owner",
        update: (bug) => ({ ...changedBugInput(bug), owner: "   " }),
        error: "blank_owner",
        message: "Owner is required.",
      },
      {
        name: "missing description",
        update: (bug) => {
          const body: Record<string, unknown> = changedBugInput(bug);
          delete body.description;
          return body;
        },
        error: "blank_description",
        message: "Description is required.",
      },
      {
        name: "blank description",
        update: (bug) => ({ ...changedBugInput(bug), description: "   " }),
        error: "blank_description",
        message: "Description is required.",
      },
      {
        name: "missing state",
        update: (bug) => {
          const body: Record<string, unknown> = changedBugInput(bug);
          delete body.state;
          return body;
        },
        error: "invalid_state",
        message: "State must be Open or Closed.",
      },
      {
        name: "blank state",
        update: (bug) => ({ ...changedBugInput(bug), state: "   " }),
        error: "invalid_state",
        message: "State must be Open or Closed.",
      },
      {
        name: "unsupported state",
        update: (bug) => ({ ...changedBugInput(bug), state: "pending" }),
        error: "invalid_state",
        message: "State must be Open or Closed.",
      },
      {
        name: "empty object",
        update: () => ({}),
        error: "blank_title",
        message: "Title is required.",
      },
      {
        name: "non-string title",
        update: (bug) => ({ ...changedBugInput(bug), title: 42 }),
        error: "blank_title",
        message: "Title is required.",
      },
      {
        name: "non-string severity",
        update: (bug) => ({
          ...changedBugInput(bug),
          severity: { level: "high" },
        }),
        error: "blank_severity",
        message: "Severity is required (high, mid, or low).",
      },
      {
        name: "non-string owner",
        update: (bug) => ({ ...changedBugInput(bug), owner: 42 }),
        error: "blank_owner",
        message: "Owner is required.",
      },
      {
        name: "non-string description",
        update: (bug) => ({
          ...changedBugInput(bug),
          description: { text: "steps" },
        }),
        error: "blank_description",
        message: "Description is required.",
      },
      {
        name: "non-string state",
        update: (bug) => ({ ...changedBugInput(bug), state: 42 }),
        error: "invalid_state",
        message: "State must be Open or Closed.",
      },
    ];

    for (const scenario of updateInvalidCases) {
      test(`rejects ${scenario.name} without mutating a bug`, async ({
        api,
        createdBugIds,
      }) => {
        const original = await createBug(api, createdBugIds);
        const response = await api.put(`/api/bugs/${original.id}`, {
          data: scenario.update(original),
        });

        await expectApiError(
          response,
          400,
          scenario.error,
          scenario.message
        );
        expect(
          await (await api.get(`/api/bugs/${original.id}`)).json()
        ).toEqual(original);
      });
    }

    test("rejects malformed JSON without mutating a bug", async ({
      api,
      createdBugIds,
    }) => {
      const original = await createBug(api, createdBugIds);
      const response = await api.put(`/api/bugs/${original.id}`, {
        data: "{",
        headers: { "Content-Type": "application/json" },
      });

      expect(response.status()).toBe(400);
      expect(await (await api.get(`/api/bugs/${original.id}`)).json()).toEqual(
        original
      );
    });
  });

  test.describe("DELETE /api/bugs/:id", () => {
    test("deletes an existing bug with an empty 204 response", async ({
      api,
      createdBugIds,
    }) => {
      const created = await createBug(api, createdBugIds);
      const deletion = await api.delete(`/api/bugs/${created.id}`);

      expect(deletion.status()).toBe(204);
      expect(await deletion.text()).toBe("");
      await expectApiError(
        await api.get(`/api/bugs/${created.id}`),
        404,
        "not_found",
        "Bug not found."
      );
    });

    test("returns not found when deleting the same bug twice", async ({
      api,
      createdBugIds,
    }) => {
      const created = await createBug(api, createdBugIds);
      expect((await api.delete(`/api/bugs/${created.id}`)).status()).toBe(204);
      await expectApiError(
        await api.delete(`/api/bugs/${created.id}`),
        404,
        "not_found",
        "Bug not found."
      );
    });

    test("rejects non-numeric IDs", async ({ api }) => {
      await expectApiError(
        await api.delete("/api/bugs/not-a-number"),
        400,
        "invalid_id",
        "Bug ID must be a number."
      );
    });

    test("returns not found for zero and negative numeric IDs", async ({
      api,
    }) => {
      for (const id of ["0", "-1"]) {
        await expectApiError(
          await api.delete(`/api/bugs/${id}`),
          404,
          "not_found",
          "Bug not found."
        );
      }
    });

    test("rejects numeric-prefix IDs without deleting a bug", async ({
      api,
      createdBugIds,
    }) => {
      const created = await createBug(api, createdBugIds);
      await expectApiError(
        await api.delete(`/api/bugs/${created.id}junk`),
        400,
        "invalid_id",
        "Bug ID must be a number."
      );
      expect((await api.get(`/api/bugs/${created.id}`)).status()).toBe(200);
    });
  });

  test.describe("shared API behavior", () => {
    test("answers CORS preflight requests", async ({ api }) => {
      const response = await api.fetch("/api/bugs", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type",
        },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()["access-control-allow-origin"]).toBe(
        "http://localhost:5173"
      );
      expect(response.headers()["access-control-allow-methods"]).toBe(
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      expect(response.headers()["access-control-allow-headers"]).toBe(
        "Content-Type"
      );
    });

    test("does not reflect an unconfigured origin", async ({ api }) => {
      const response = await api.get("/api/health", {
        headers: { Origin: "https://unconfigured.example" },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()["access-control-allow-origin"]).toBe(
        "http://localhost:5173"
      );
    });

    test("returns 404 for an unknown API route", async ({ api }) => {
      const response = await api.get("/api/not-a-route");

      expect(response.status()).toBe(404);
    });

    test("supports an isolated create-read-update-delete lifecycle", async ({
      api,
      createdBugIds,
    }) => {
      const target = await createBug(api, createdBugIds);
      const companion = await createBug(api, createdBugIds);

      expect(
        await (await api.get(`/api/bugs/${target.id}`)).json()
      ).toEqual(target);
      expect(
        await (await api.get(`/api/bugs/${companion.id}`)).json()
      ).toEqual(companion);

      const updatedInput = changedBugInput(target);
      const update = await api.put(`/api/bugs/${target.id}`, {
        data: updatedInput,
      });
      expect(update.status()).toBe(200);
      expect(
        await (await api.get(`/api/bugs/${companion.id}`)).json()
      ).toEqual(companion);

      const deletion = await api.delete(`/api/bugs/${target.id}`);
      expect(deletion.status()).toBe(204);
      const list = (await (await api.get("/api/bugs")).json()) as Bug[];
      expect(list.some((bug) => bug.id === target.id)).toBe(false);
      expect(list.some((bug) => bug.id === companion.id)).toBe(true);
      await expectApiError(
        await api.get(`/api/bugs/${target.id}`),
        404,
        "not_found",
        "Bug not found."
      );
    });
  });
});
