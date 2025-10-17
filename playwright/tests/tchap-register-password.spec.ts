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


test.describe('Tchap : register password', () => {

  test('tchap register with password', async ({ context, page, simpleUser: user }) => {
    
    const email = user.kc_email;

    const screenshot_path = test.info().title.replace(" ", "_");
  
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
  
    //welcome
    await page.waitForURL(url => url.toString().includes(`#/welcome`));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/01--tchap-login-page.png` });
    await page.getByRole('link').filter({hasText : "Créer un compte"}).click();
    await page.waitForURL(url => url.toString().includes(`#/email-precheck-sso`));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/01-tchap-precheck-sso.png` });
    await page.locator('input').fill(email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
  
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

    //verify-email
    await page.waitForURL(url => url.toString().includes(`/verify-email`));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/05-verify_email.png`, fullPage: true });
    let verificationCode  = await extractVerificationCode(context, screenshot_path);
    console.log("verification code extracted : ", verificationCode);
    await page.locator('input[name="code"]').fill(verificationCode);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //display-name
    await page.waitForURL(url => url.toString().includes(`/display-name`));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/06-display-name.png`, fullPage: true });
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //consent
    await page.waitForURL(url => url.toString().includes(`/consent`));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/07-consent.png`, fullPage: true });
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();


    //tchap
    await page.waitForURL(url => url.toString().includes(`#/home`), { timeout: 20000 });
    //TODO this condition is hardcoded
    await expect(page.locator('h1').filter({ hasText: /Bienvenue.*\[Tchapgouv\]/ })).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/08-tchap-home.png`, fullPage: true });
    

    const created_user = await getMasUserByEmail(email);

    //check created username fields
    expect(created_user.attributes.username).toContain(user.kc_username);

    //todo : check displayname? -> display name is stored in Synapse, or in the home screen of Tchap
  });

});
