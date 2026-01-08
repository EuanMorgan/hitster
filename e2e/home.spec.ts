import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
	test("displays the main card with title and description", async ({
		page,
	}) => {
		await page.goto("/");

		await expect(page.getByText("Hitster")).toBeVisible();
		await expect(
			page.getByText("A multiplayer music timeline game"),
		).toBeVisible();
	});

	test("displays game PIN input", async ({ page }) => {
		await page.goto("/");

		await expect(page.getByPlaceholder("Enter game PIN")).toBeVisible();
	});

	test("displays Join Game and Create Game buttons", async ({ page }) => {
		await page.goto("/");

		await expect(page.getByRole("button", { name: "Join Game" })).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Create Game" }),
		).toBeVisible();
	});
});
