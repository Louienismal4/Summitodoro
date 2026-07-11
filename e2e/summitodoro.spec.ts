import { expect, test } from "@playwright/test";

test("loads directly into the expedition dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No active expedition")).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Select mountain" }),
  ).toHaveValue("mt-ulap");
  await expect(
    page.getByRole("heading", { name: "Focus control" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Virtual expedition map" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset camera" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit trail" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Toggle terrain" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Show map attribution and safety information",
    }),
  ).toBeVisible();
});

test("starts, pauses, and restores a session after refresh", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "5 min" }).click();
  await page.getByRole("button", { name: "Deploy hiker" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
});

test("keeps timer controls available when Mapbox is not configured", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText(/Mapbox token is not configured/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Deploy hiker" }),
  ).toBeEnabled();
  await expect(page.getByText("Virtual focus route.")).toBeVisible();
});

test("recovers an elapsed session directly at the summit", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "summitodoro:session:mt-ulap",
      JSON.stringify({
        version: 1,
        session: {
          id: "recovered-session",
          durationMs: 1_000,
          startedAt: Date.now() - 5_000,
          pausedAt: null,
          accumulatedPausedMs: 0,
          status: "running",
        },
        reachedCheckpointIds: ["pine-ridge", "grassland-view"],
      }),
    );
  });

  await page.goto("/hike/mt-ulap");
  await expect(
    page.getByRole("dialog", { name: "Summit secured!" }),
  ).toBeVisible();
  await expect(page.getByText("+100 XP")).toBeVisible();
});
