import { test, expect } from "@playwright/test";

test("parcours /projet → /merci?src=form", async ({ page }) => {
  // Intercepte l'API : on teste l'UX du formulaire, pas l'envoi réel.
  await page.route("**/api/leads", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  );

  await page.goto("/projet");
  await expect(page.getByRole("heading", { name: "Parlons de votre projet." })).toBeVisible();

  await page.getByRole("button", { name: "Hôtellerie" }).click();
  await page.getByLabel("Votre projet en une phrase").fill("Reprendre la main sur nos réservations directes.");
  await page.getByRole("button", { name: "Une idée à cadrer" }).click();
  await page.getByRole("button", { name: "Ce trimestre" }).click();
  await page.getByLabel("Votre nom").fill("Amine K.");
  await page.getByLabel("Email").fill("amine@exemple.com");

  await page.getByRole("button", { name: /Envoyer la demande/ }).click();

  await expect(page).toHaveURL(/\/merci\?src=form/);
  await expect(page.getByRole("heading", { name: "Merci." })).toBeVisible();
  await expect(page.getByText("DEMANDE ENVOYÉE")).toBeVisible();
});
