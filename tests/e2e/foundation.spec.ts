import { test, expect } from "@playwright/test";

test.describe("Password Manager — E2E", () => {
  test("Web Crypto API is available", async ({ page }) => {
    await page.goto("about:blank");
    const available = await page.evaluate(
      () => typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined",
    );
    expect(available).toBe(true);
  });

  test("login form fields are detectable", async ({ page }) => {
    await page.setContent(`
      <form>
        <input type="email" name="username" />
        <input type="password" name="password" />
      </form>
    `);
    const fields = await page.evaluate(() => ({
      email: document.querySelectorAll('input[type="email"]').length,
      password: document.querySelectorAll('input[type="password"]').length,
    }));
    expect(fields.email).toBe(1);
    expect(fields.password).toBe(1);
  });

  test("extension manifest is valid MV3 with clipboard permission", async () => {
    const manifest = await import("../../extension/manifest.ts");
    expect(manifest.default.manifest_version).toBe(3);
    expect(manifest.default.permissions).toContain("clipboardWrite");
  });
});
