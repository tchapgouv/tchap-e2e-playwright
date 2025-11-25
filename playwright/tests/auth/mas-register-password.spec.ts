import { test, expect } from '../../fixtures/auth-fixture';
import { SCREENSHOTS_DIR, ELEMENT_URL, MAS_URL } from '../../utils/config';


test.describe('MAS Register password', () => {

  const PASSWORd = "sdf78qsd!9090ssss";

  test.skip('without oauth2 session', async ({page, screenChecker: screen }) => {
    // This test is intentionally ignored.
    //the error page has been deactivated for the moment because the MAS unit tests must be fixed

    await page.goto('/register');
    await page.getByRole('button').filter({ hasText: 'Continuer avec une adresse mail' }).click();
    
    //form is not submitted because no oauth2_authorization_grant 
    await screen(page, '/register/password');
    await expect(page.locator("h1", {hasText:"Unexpected error"})).toBeVisible();
    await expect(page.locator("p", {hasText:"Veuillez fermer cette fenêtre et relancer la création de compte depuis votre appareil Tchap"})).toBeVisible();

  });

  test('with JavaScript disabled', async ({ browser,  userData: user, screenChecker: screen }) => {
    
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();

    await page.goto('/register');
    await page.getByRole('button').filter({ hasText: 'Continuer avec une adresse mail' }).click();
    
    await screen(page, '/register/password');
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(PASSWORd);
    await page.locator('input[name="password_confirm"]').fill(PASSWORd);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //form is submitted successfully
    await screen(page, '/verify-email');
  });

  test('when user already exists', async ({ browser,  userData: user, screenChecker: screen }) => {
    
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();

    await page.goto('/register');
    await page.getByRole('button').filter({ hasText: 'Continuer avec une adresse mail' }).click();
    
    await screen(page, '/register/password');
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(PASSWORd);
    await page.locator('input[name="password_confirm"]').fill(PASSWORd);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //form is submitted successfully
    await screen(page, '/verify-email');
  });

});
