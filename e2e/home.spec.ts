import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
  test("displays the main card with title and description", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator('[data-slot="card-title"]')).toContainText(
      "Hitster",
    );
    await expect(page.getByText("Hello, Hitster Player!")).toBeVisible();
  });

  test("displays Join Game and Create Game links/buttons", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Join Game" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Game" }),
    ).toBeVisible();
  });

  test("Join Game link navigates to join page with PIN input", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Join Game" }).click();

    await expect(page).toHaveURL("/join");
    await expect(page.getByPlaceholder("ABCD")).toBeVisible();
  });
});
