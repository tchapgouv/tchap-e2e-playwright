import { test, expect } from '../../fixtures/auth-fixture';
import { 
  createMasTestUser,
  extractVerificationCode,
  generateTestUserData
} from '../../utils/auth-helpers';
import { getMasUserByEmail } from '../../utils/mas-admin';
import {ELEMENT_URL, NOT_INVITED_EMAIL_DOMAIN, STANDARD_EMAIL_DOMAIN, WRONG_SERVER_EMAIL_DOMAIN } from '../../utils/config';


test.describe('Tchap : register with password', () => {


  const PASSWORd = "sdf78qsd!9090ssss";

  test('tchap register with oidc native', async ({ context, page, userData: user, screenChecker: screen, startTchapRegisterWithEmail }) => {
    
    await startTchapRegisterWithEmail(page, user.email);

    await screen(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(user.email);
    
    await page.locator('input[name="password"]').fill(PASSWORd);
    await page.locator('input[name="password_confirm"]').fill(PASSWORd);

    //wait for password-confirm matching confirmation
    await page.locator("body").click({ position: { x: 0, y: 0 } }); //unfocus field    
    await expect(page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })).toBeVisible();
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screen(page, '/verify-email');
    let verificationCode  = await extractVerificationCode(context, screen);
    await page.locator('input[name="code"]').fill(verificationCode);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screen(page, '/consent');
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //await screen(page, '#/home'); does not work with waitFor "networkidle"
    await expect(page.locator('h1').filter({ hasText: /Bienvenue.*\[Tchapgouv\]/ })).toBeVisible({ timeout: 20000 });
    const created_user = await getMasUserByEmail(user.email);

    //check created username fields
    expect(created_user.attributes.username).toContain(user.username);
  });

  test('with not invited email', async ({page, userData: user, screenChecker: screen, startTchapRegisterWithEmail }) => {
    
    await startTchapRegisterWithEmail(page, user.email);

    const not_invited_user = generateTestUserData(NOT_INVITED_EMAIL_DOMAIN);

    await screen(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(user.email);

    //change email with not invited email
    await page.locator('input[name="email"]').fill(not_invited_user.email);
    await page.locator('input[name="password"]').fill(PASSWORd);
    await page.locator('input[name="password_confirm"]').fill(PASSWORd);

    //wait for password-confirm matching confirmation
    await page.locator("body").click({ position: { x: 0, y: 0 } }); //unfocus field    
    await expect(page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })).toBeVisible();
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screen(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(not_invited_user.email);

    //check that error message is visible
    await expect(page.locator('div.cpd-form-message.cpd-form-error-message').filter({ hasText: 'Vous avez besoin d\'une invitation' })).toBeVisible();
  });

  test('with email on wrong server', async ({page, userData: user, screenChecker: screen, startTchapRegisterWithEmail }) => {
    
    await startTchapRegisterWithEmail(page, user.email);

    const wrong_server_user = generateTestUserData(WRONG_SERVER_EMAIL_DOMAIN);

    await screen(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(user.email);

    //change email with not invited email
    await page.locator('input[name="email"]').fill(wrong_server_user.email);
    await page.locator('input[name="password"]').fill(PASSWORd);
    await page.locator('input[name="password_confirm"]').fill(PASSWORd);

    //wait for password-confirm matching confirmation
    await page.locator("body").click({ position: { x: 0, y: 0 } }); //unfocus field
    await expect(page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })).toBeVisible();
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screen(page, '/register/password');

    //check that error message is visible
    await expect(page.locator('div.cpd-form-message.cpd-form-error-message').filter({ hasText: 'Votre adresse mail est associée à un autre serveur' })).toBeVisible();
  });

  test('when user already exists', async ({page, context, browser, screenChecker: screen, startTchapRegisterWithEmail }) => {

    // Create a test user with a password in MAS
    const user = await createMasTestUser(STANDARD_EMAIL_DOMAIN);        
      
    await startTchapRegisterWithEmail(page, user.email);

    await screen(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(user.email);
    
    await page.locator('input[name="password"]').fill(PASSWORd);
    await page.locator('input[name="password_confirm"]').fill(PASSWORd);

  //wait for password-confirm matching confirmation
    await page.locator("body").click({ position: { x: 0, y: 0 } }); //unfocus field
    await expect(page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })).toBeVisible();
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();//needs to focus out from the `password_confirm` field 

    //form is submitted successfully
    await screen(page, '/verify-email');

    let verificationCode  = await extractVerificationCode(context, screen);
    await page.locator('input[name="code"]').fill(verificationCode);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screen(page, '/finish');
    await expect(page.locator('text=le compte Tchap existe déjà')).toBeVisible();
    await page.getByRole('link').filter({ hasText: 'Continuer' }).click();

    await screen(page, '/login');
  });

});
