import type { Locator, Page, Response } from "@playwright/test";

export interface BugIdentity {
  id: number;
  title: string;
}

export interface NewBugDetails {
  title: string;
  severity: "high" | "mid" | "low";
  owner: string;
  description: string;
}

export class BoardPage {
  readonly newBugButton: Locator;
  readonly bugsTable: Locator;
  readonly logoutButton: Locator;
  readonly searchInput: Locator;

  constructor(readonly page: Page) {
    this.newBugButton = page.getByRole("button", { name: "New Bug" });
    this.bugsTable = page.getByRole("table", { name: "Bugs" });
    this.logoutButton = page.getByRole("button", { name: "Logout" });
    this.searchInput = page.getByRole("search", {
      name: "Search bugs by title",
    });
  }

  getCreateBugDialog(): Locator {
    return this.page.getByRole("dialog", { name: "Create bug" });
  }

  getCreateBugField(name: string): Locator {
    return this.getCreateBugDialog().getByLabel(name);
  }

  getCreateBugAction(name: string): Locator {
    return this.getCreateBugDialog().getByRole("button", { name });
  }

  async openCreateBugDialog(): Promise<Locator> {
    await this.newBugButton.click();
    return this.getCreateBugDialog();
  }

  async createBug(details: NewBugDetails): Promise<Response> {
    await this.openCreateBugDialog();
    await this.getCreateBugField("Title").fill(details.title);
    await this.getCreateBugField("Severity").selectOption(details.severity);
    await this.getCreateBugField("Owner").fill(details.owner);
    await this.getCreateBugField("Description").fill(details.description);

    const createResponse = this.waitForApiResponse("POST", "/api/bugs");
    await this.getCreateBugAction("Save").click();
    return createResponse;
  }

  getBugRow(bug: BugIdentity): Locator {
    return this.bugsTable.getByRole("button").filter({ hasText: bug.title });
  }

  getEditBugDialog(id: number): Locator {
    return this.page.getByRole("dialog", { name: `Edit bug #${id}` });
  }

  getEditBugField(id: number, name: string): Locator {
    return this.getEditBugDialog(id).getByLabel(name);
  }

  getEditBugAction(id: number, name: string): Locator {
    return this.getEditBugDialog(id).getByRole("button", { name });
  }

  getEditBugIdField(id: number): Locator {
    return this.getEditBugDialog(id).getByLabel("ID");
  }

  getDeleteButton(id: number): Locator {
    return this.getEditBugDialog(id).getByRole("button", {
      name: "Delete",
      exact: true,
    });
  }

  getDeleteConfirmationDialog(id: number): Locator {
    return this.page.getByRole("alertdialog", {
      name: `Delete bug #${id}?`,
    });
  }

  getDeleteConfirmationAction(id: number, name: string): Locator {
    return this.getDeleteConfirmationDialog(id).getByRole("button", { name });
  }

  getDeleteError(id: number): Locator {
    return this.getEditBugDialog(id).getByRole("alert");
  }

  getBugCell(title: string): Locator {
    return this.bugsTable.getByRole("cell", { name: title, exact: true });
  }

  getNoMatchingBugsCell(): Locator {
    return this.getBugCell("No bugs matched.");
  }

  getClearSearchButton(): Locator {
    return this.page.getByRole("button", { name: "Clear search" });
  }

  async searchFor(title: string): Promise<void> {
    await this.searchInput.fill(title);
  }

  async clearSearch(): Promise<void> {
    await this.getClearSearchButton().click();
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  async openBug(bug: BugIdentity): Promise<Response> {
    const detailResponse = this.waitForApiResponse(
      "GET",
      `/api/bugs/${bug.id}`
    );
    await this.getBugRow(bug).click();
    return detailResponse;
  }

  async openDeleteConfirmation(id: number): Promise<void> {
    await this.getDeleteButton(id).click();
    await this.getDeleteConfirmationDialog(id).waitFor();
  }

  async confirmDelete(id: number): Promise<Response> {
    const deleteResponse = this.waitForApiResponse("DELETE", `/api/bugs/${id}`);
    await this.getDeleteConfirmationAction(id, "Delete").click();
    return deleteResponse;
  }

  private waitForApiResponse(
    method: string,
    pathname: string
  ): Promise<Response> {
    return this.page.waitForResponse((response) => {
      return (
        new URL(response.url()).pathname === pathname &&
        response.request().method() === method
      );
    });
  }
}
