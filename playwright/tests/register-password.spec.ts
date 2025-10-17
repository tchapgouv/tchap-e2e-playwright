import { test, expect } from '../fixtures/auth-fixture';
import { 
  verifyUserInMas, 
  performOidcLoginFromTchap,
  extractVerificationCode
} from './utils/auth-helpers';
import { checkMasUserExistsByEmail, createMasUserWithPassword, getMasUserByEmail } from './utils/mas-admin';
import { SCREENSHOTS_DIR, ELEMENT_URL, MAS_URL, generateTestUser } from './utils/config';
import { BrowserContext } from '@playwright/test';
import { assert } from 'console';


test.describe('Register', () => {

  test('without login_hint', async ({ context, page, simpleUser: user }) => {
    
    const email = user.kc_email;

    const screenshot_path = test.info().title.replace(" ", "_");
    // Navigate to the register page
    await page.goto('/register');

    //register
    await page.waitForURL(url => url.toString().includes(`/register`));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/03-register.png`, fullPage: true });

    //password
    await page.getByRole('button').filter({ hasText: 'Continuer avec une adresse mail' }).click();
    await page.waitForURL(url => url.toString().includes(`/register/password`));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-password.png`, fullPage: true });
    let password = "sdf78qsd!9090ssss";
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="password_confirm"]').fill(password);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
    
    //form is not submitted because email is missing
    await page.waitForURL(url => url.toString().includes(`/register/password`));

  });
});
