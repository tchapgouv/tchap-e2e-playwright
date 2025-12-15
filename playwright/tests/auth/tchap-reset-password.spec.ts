import { test, expect } from '../../fixtures/auth-fixture';
import { checkMasUserExistsByEmail, createMasUserWithPassword } from '../../utils/mas-admin';
import { ELEMENT_URL  } from '../../utils/config';
import { openResetPasswordEmail } from '../../utils/auth-helpers';


test.describe('Tchap : reset password', () => {

  test('tchap reset password', async ({ page, userData: userData,screenChecker }) => {

    userData.masId = await createMasUserWithPassword(userData.username, userData.email, userData.password);
    const existsBeforeLogin = await checkMasUserExistsByEmail(userData.email);
    expect(existsBeforeLogin).toBe(true);
  
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
  
    await screenChecker(page, '/welcome')
    await page.getByRole('link').filter({hasText : "Se connecter par email"}).click();
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    
    //MAS login
    await screenChecker(page, '/login')
    await page.getByRole('link').filter({ hasText: "Mot de passe oublié" }).click();
    
    //MAS reset password
    await page.locator('input[name="email"]').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //MAS reset password - verify
    await screenChecker(page, '/recover/progress')

    const resetPwdPage = await openResetPasswordEmail(page.context(), screenChecker);

    const newPassword = "monchienmangemapantoufle"
    await resetPwdPage.locator('input[name="new_password"]').fill(newPassword);
    await resetPwdPage.locator('input[name="new_password_again"]').fill(newPassword);
    await resetPwdPage.locator("body").click({ position: { x: 0, y: 0 } }); //unfocus field    
    await expect(resetPwdPage.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })).toBeVisible();
    await resetPwdPage.getByRole('button').filter({ hasText: 'Sauvegarder et continuer' }).click({clickCount:2});

    //new tab is redirected back to welcome page
    await expect(resetPwdPage.getByRole('link').filter({ hasText: 'Continuer dans Tchap Windows' })).toBeVisible();
    await screenChecker(resetPwdPage, '/')

    //first tab is stuck back to recovery page
    await screenChecker(page, '/recover/progress')

  });
});
