import { test, expect } from '../../fixtures/auth-fixture';
import { 
  extractVerificationCode
} from '../../utils/auth-helpers';
import { getMasUserByEmail } from '../../utils/mas-admin';
import {ELEMENT_URL } from '../../utils/config';


test.describe('Tchap : register password', () => {

  test('tchap register with password', async ({ context, page, simpleUser: user, screenChecker: screen }) => {
    
    const email = user.kc_email;
    let password = "sdf78qsd!9090ssss";

    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
    
    await screen(page, '#/welcome');
    await page.getByRole('link').filter({hasText : "Créer un compte"}).click();

    await screen(page, '#/email-precheck-sso');
    await page.locator('input').fill(email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
  
    await screen(page, '/register');
    await page.getByRole('button').filter({ hasText: 'Continuer avec une adresse mail' }).click();

    await screen(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="password_confirm"]').fill(password);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screen(page, '/verify-email');
    let verificationCode  = await extractVerificationCode(context, screen);
    await page.locator('input[name="code"]').fill(verificationCode);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screen(page, '/consent');
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screen(page, '#/home');
    await expect(page.locator('h1').filter({ hasText: /Bienvenue.*\[Tchapgouv\]/ })).toBeVisible({ timeout: 20000 });
    const created_user = await getMasUserByEmail(email);

    //check created username fields
    expect(created_user.attributes.username).toContain(user.kc_username);

    //todo : check displayname? -> display name is stored in Synapse, or in the home screen of Tchap
  });

  test('tchap register with password where login_hint is mistaken', async ({page, simpleUser: user, screenChecker: screen  }) => {
    
    const email = user.kc_email;
    const second_email = user.kc_email.replace("@","another_email@");

    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
  
    await screen(page, '#/welcome');
    await page.getByRole('link').filter({hasText : "Créer un compte"}).click();
    await screen(page, '#/email-precheck-sso');
    await page.locator('input').fill(email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
    await screen(page, '/register');
    await page.getByRole('button').filter({ hasText: 'Continuer avec une adresse mail' }).click();

    //click on link: wrong email
    await screen(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(email);
    await page.getByRole('link').filter({ hasText: 'pas la bonne adresse' }).click();

    //input second email
    await screen(page, '#/welcome');
    await page.getByRole('link').filter({hasText : "Créer un compte"}).click();
    await screen(page, '#/email-precheck-sso');
    await page.locator('input').fill(second_email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
    await screen(page, '/register');
    await page.getByRole('button').filter({ hasText: 'Continuer avec une adresse mail' }).click();
    
    //check second email
    await screen(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(second_email);
  });

});
