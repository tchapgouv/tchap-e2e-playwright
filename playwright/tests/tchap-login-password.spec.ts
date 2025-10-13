import { test, expect } from '../fixtures/auth-fixture';
import { checkMasUserExistsByEmail, createMasUserWithPassword } from '../utils/mas-admin';
import { SCREENSHOTS_DIR, ELEMENT_URL, MAS_URL } from '../utils/config';


test.describe('Tchap : Login password', () => {

  test('tchap login with password and login_hint', async ({ page, userLegacy: userLegacy }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    userLegacy.masId = await createMasUserWithPassword(userLegacy.kc_username, userLegacy.kc_email, userLegacy.kc_password);
    const existsBeforeLogin = await checkMasUserExistsByEmail(userLegacy.kc_email);
    expect(existsBeforeLogin).toBe(true);
  
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
  
    //welcome
    await page.waitForURL(url => url.toString().includes(`#/welcome`));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/01-tchap-login-page.png` });
    await page.getByRole('link').filter({hasText : "Se connecter par email"}).click();
    await page.waitForURL(url => url.toString().includes(`#/email-precheck-sso`));
    await page.locator('input').fill(userLegacy.kc_email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
  
    //login
    await page.waitForURL(url => url.toString().includes(`${MAS_URL}/login`));
    await expect(page.locator('input[name="username"]')).toHaveValue(userLegacy.kc_email);
    await page.locator('input[name="password"]').fill(userLegacy.kc_password);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/03-password-login-filled.png` });
    await page.locator('button[type="submit"]').click();
    
    //consent
    await page.waitForURL(url => url.toString().includes('/consent'));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-consent_page.png` });
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();


    //tchap 
    await expect(page.locator('text=Bienvenue')).toBeVisible({timeout: 20000});
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/05-auth-success.png` });

    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(userLegacy.kc_email);
    expect(existsAfterLogin).toBe(true);
    
    console.log(`Successfully authenticated and verified user ${userLegacy.kc_username} (${userLegacy.kc_email})`);
  });
});
