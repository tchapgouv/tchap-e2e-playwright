import { test, expect } from '../../../fixtures/auth-fixture';
import { TestUser } from '../../../utils/auth-helpers';
import { STANDARD_EMAIL_DOMAIN } from '../../../utils/config';
import { getLatestVerificationCode } from '../../../utils/mailpit';
import { MasAdminClient } from '../../../utils/mas-admin';

test.describe('MAS Register password', () => {
  const PASSWORd = 'sdf78qsd!9090ssss';

  test.skip('without oauth2 session', async ({ page, screenChecker: screen }) => {
    // This test is intentionally ignored.
    //the error page has been deactivated for the moment because the MAS unit tests must be fixed

    await page.goto('/register');
    await page.getByRole('button').filter({ hasText: 'Continuer avec mon adresse mail' }).click();

    //form is not submitted because no oauth2_authorization_grant
    await screen(page, '/register/password');
    await expect(page.locator('h1', { hasText: 'Unexpected error' })).toBeVisible();
    await expect(
      page.locator('p', {
        hasText:
          'Veuillez fermer cette fenêtre et relancer la création de compte depuis votre appareil Tchap',
      })
    ).toBeVisible();
  });

  test('with JavaScript disabled', async ({ browser, userData: user, screenChecker: screen }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();

    await page.goto('/register');
    await page.getByRole('button').filter({ hasText: 'Continuer avec mon adresse mail' }).click();

    await screen(page, '/register/password');
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(PASSWORd);
    await page.locator('input[name="password_confirm"]').fill(PASSWORd);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //form is submitted successfully
    await screen(page, '/verify-email');
  });

   test('when user already exists with a colliding email', async ({
    browser,
    page,
    screenChecker:screen,
    startTchapRegisterWithEmail,
  }) => {
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    const randomSuffix = Math.floor(Math.random() * 1000000000);

    const user_1:TestUser = {
      username: `olivier-${randomSuffix}-${STANDARD_EMAIL_DOMAIN}`,
      email: `olivier-${randomSuffix}@${STANDARD_EMAIL_DOMAIN}`,
      password : "any",
      displayName : "any",
      domain: `${STANDARD_EMAIL_DOMAIN}`,
    }

    const user_2:TestUser = {
      username: `olivier-${randomSuffix}-${STANDARD_EMAIL_DOMAIN}`,
      email: `olivier@${randomSuffix}-${STANDARD_EMAIL_DOMAIN}`,
      //email: `olivier@${WRONG_SERVER_EMAIL_DOMAIN}`,
      password : "any",
      displayName : "any",
      domain: `${STANDARD_EMAIL_DOMAIN}`,
    }

    const user_1_mas_id = await masAdminClient.createUserWithPassword(
      user_1.username,
      user_1.email,
      user_1.password,
      user_1.displayName
    );

    //new browser to start from a clean browser history
    await page.goto('/register');
    await page.getByRole('button').filter({ hasText: 'Continuer avec mon adresse mail' }).click();

    await screen(page, '/register/password');

    await page.locator('input[name="email"]').fill(user_2.email);
    await page.locator('input[name="password"]').fill(PASSWORd);
    await page.locator('input[name="password_confirm"]').fill(PASSWORd);

    //wait for password-confirm matching confirmation
    await page.locator('body').click({ position: { x: 0, y: 0 } }); //unfocus field
    await expect(
      page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })
    ).toBeVisible();
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click({ clickCount: 2 });

    //check that error message is visible
    await expect(
      page
        .locator('div.cpd-form-message.cpd-form-error-message')
        .filter({ hasText: 'associée au serveur' })
    ).toBeVisible();
  });
});
