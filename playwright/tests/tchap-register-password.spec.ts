import { test, expect } from '../fixtures/auth-fixture';
import { 
  verifyUserInMas, 
  performOidcLoginFromTchap
} from './utils/auth-helpers';
import { checkMasUserExistsByEmail, createMasUserWithPassword } from './utils/mas-admin';
import { SCREENSHOTS_DIR, ELEMENT_URL, MAS_URL } from './utils/config';


test.describe('Tchap : register password', () => {

  test('tchap register with password', async ({ page, userLegacy: userLegacy }) => {
    const screenshot_path = test.info().title.replace(" ", "_");
  
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
    
    //register
    await page.getByRole('link', { name: 'Créer un compte' }).click();
    await page.waitForURL(url => url.toString().includes(`${MAS_URL}/register`));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/02-register.png` });


  });
});
