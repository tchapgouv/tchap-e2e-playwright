import { test, expect } from '../../fixtures/auth-fixture';
import { checkMasUserExistsByEmail, createMasUserWithPassword } from '../../utils/mas-admin';
import { SCREENSHOTS_DIR, ELEMENT_URL, MAS_URL } from '../../utils/config';
import { Page } from '@playwright/test';
import { loginWithPassword } from '../../utils/auth-helpers';


test.describe('Tchap : logout', () => {

  test('tchap login-logout-login', async ({ page, userData: userData, screenChecker }) => {
    userData.masId = await createMasUserWithPassword(userData.username, userData.email, userData.password);
  
    // First login
    await loginWithPassword(page, userData, screenChecker);

    // Success - Tchap home
    await expect(page.locator('text=Bienvenue')).toBeVisible({timeout: 20000});

    //logout
    await page.getByLabel('Avatar').click();
    //await screenChecker(page, `/`)
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await screenChecker(page, `/welcome`)

    // Second login
    await page.getByRole('link').filter({hasText : "Se connecter par email"}).click();

    // Email precheck
    await screenChecker(page, `#/email-precheck-sso`);
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    // Login page
    await screenChecker(page, `/login`);
    await expect(page.locator('input[name="username"]')).toHaveValue(userData.email);
    await page.locator('input[name="password"]').fill(userData.password);
    await page.locator('button[type="submit"]').click();

    // Consent page
    await screenChecker(page, `/consent`);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    // Success - Confirm identity
    await expect(page.locator('text=Confirmez votre identité')).toBeVisible({timeout: 20000});
    await screenChecker(page, `/`);
  });

});
