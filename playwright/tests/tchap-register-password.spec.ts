import { test, expect } from '../fixtures/auth-fixture';
import { 
  verifyUserInMas, 
  performOidcLoginFromTchap
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
    await page.getByRole('link').filter({hasText : "Se connecter par email"}).click();
    await page.waitForURL(url => url.toString().includes(`#/email-precheck-sso`));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/01-tchap-precheck-sso.png` });
    await page.locator('input').fill(email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
  
    //login
    await page.waitForURL(url => url.toString().includes(`${MAS_URL}/login`));
    await expect(page.locator('input[name="username"]')).toHaveValue(email);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/02-login.png`, fullPage: true });

    //register
    await page.getByRole('link', { name: 'Créer un compte' }).click();
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


  // Add this function to extract the verification code
  async function extractVerificationCode(context: BrowserContext, screenshot_path:string): Promise<string> {
    // Create a new page for mail.tchapgouv.com
    const page = await context.newPage();

    // Navigate to mail.tchapgouv.com
    await page.goto('https://mail.tchapgouv.com');

    // Wait for the page to load and click on the first email
    await page.waitForSelector('.msglist-message');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/00-verification-code.png`, fullPage: true });

    const firstIncompingMail = await page.locator('.col-md-5').first();

    let codeText = await firstIncompingMail.textContent();
    if (!codeText) {
      throw new Error('Unable to extract verification code');
    }
    console.log(codeText);
    codeText = codeText.trim();
    console.log(codeText);
    const codeMatch = codeText.match(/.*: (\d+)/);
    if (!codeMatch) {
      throw new Error('Unable to extract verification code from text');
    }
    const verificationCode = codeMatch[1];

    return verificationCode;
  }

});
