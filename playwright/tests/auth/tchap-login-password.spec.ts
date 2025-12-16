import { test, expect } from '../../fixtures/auth-fixture';
import { checkMasUserExistsByEmail, createMasUserWithPassword } from '../../utils/mas-admin';
import { SCREENSHOTS_DIR, ELEMENT_URL, MAS_URL } from '../../utils/config';
import { Page } from '@playwright/test';
import { loginWithPassword } from '../../utils/auth-helpers';


test.describe('Tchap : Login password', () => {

  test('tchap login with password and login_hint', async ({ page, userData: userData, screenChecker }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    userData.masId = await createMasUserWithPassword(userData.username, userData.email, userData.password);
    const existsBeforeLogin = await checkMasUserExistsByEmail(userData.email);
    expect(existsBeforeLogin).toBe(true);
  
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
  
    await screenChecker(page, `#/welcome`)
    await page.getByRole('link').filter({hasText : "Se connecter par email"}).click();
  
    await screenChecker(page, `#/email-precheck-sso`)
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
  
    //login
    await screenChecker(page, `/login`)
    await expect(page.locator('input[name="username"]')).toHaveValue(userData.email);
    await page.locator('input[name="password"]').fill(userData.password);
    await page.locator('button[type="submit"]').click();

  
    //consent
    await screenChecker(page, `/consent`)
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //tchap 
    await expect(page.locator('text=Bienvenue')).toBeVisible({timeout: 20000});
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/05-auth-success.png` });

    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(userData.email);
    expect(existsAfterLogin).toBe(true);
    
    console.log(`Successfully authenticated and verified user ${userData.username} (${userData.email})`);
  });
});
