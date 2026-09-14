import { MasAdminClient } from '../../../utils/mas-admin';
import { test, expect } from '../../../fixtures/auth-fixture';
import { ELEMENT_URL } from '../../../utils/config';
import { openResetPasswordEmail, makeWrongServerEmail } from '../../../utils/auth-helpers';

test.describe('Tchap : reset password', () => {
  test('tchap reset password', async ({ page, userData, screenChecker }) => {
    const masAdminClient = await MasAdminClient.createDefaultMAS();
    const masId = await masAdminClient.createUserWithPassword(
      userData.username,
      userData.email,
      userData.password
    );

    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });

    await screenChecker(page, '/welcome');
    await page.getByRole('link').filter({ hasText: 'Se connecter' }).click();
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //MAS login
    await screenChecker(page, '/login');
    await page.getByRole('link').filter({ hasText: 'Mot de passe oublié' }).click();

    //MAS reset password
    await page.locator('input[name="email"]').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //MAS reset password - verify
    await screenChecker(page, '/recover/progress');

    const resetPwdPage = await openResetPasswordEmail(
      page.context(),
      screenChecker,
      userData.email
    );

    const newPassword = 'monchienmangemapantoufle';
    await resetPwdPage.locator('input[name="new_password"]').fill(newPassword);
    await resetPwdPage.locator('input[name="new_password_again"]').fill(newPassword);
    await resetPwdPage.locator('body').click({ position: { x: 0, y: 0 } }); //unfocus field
    await expect(
      resetPwdPage.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })
    ).toBeVisible();
    await resetPwdPage
      .getByRole('button')
      .filter({ hasText: 'Sauvegarder et continuer' })
      .click({ clickCount: 2 });

    //new tab is redirected back to MAS welcome page
    await expect(
      resetPwdPage.getByRole('link').filter({ hasText: 'Continuer dans Tchap' })
    ).toBeVisible();
    await screenChecker(resetPwdPage, '/');

    //first tab is stuck back to recovery page
    await screenChecker(page, '/recover/progress');

    masAdminClient.deactivateUser(masId);
  });

  test('tchap password reset with wrong server email shows error', async ({
    page,
    userData,
    screenChecker,
  }) => {
    const wrongServerEmail = makeWrongServerEmail();

    // Start from Element Web welcome page with a standard-domain email
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
    await screenChecker(page, '#/welcome');

    await page.getByRole('link').filter({ hasText: 'Se connecter' }).click();

    await screenChecker(page, '#/email-precheck-sso');
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screenChecker(page, '/login');
    await page.getByRole('link').filter({ hasText: 'Mot de passe oublié' }).click();

    await screenChecker(page, '/recover');

    // Fill the wrong-server email and submit
    await page.locator('input[name="email"]').fill(wrongServerEmail);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screenChecker(page, '/recover');
    await expect(page.getByText('hors vous êtes sur le serveur')).toBeVisible();
  });

  test('tchap password reset with authenticated account', async ({
    page,
    userData,
    screenChecker,
  }) => {
    const wrongServerEmail = makeWrongServerEmail();

    // Start from Element Web welcome page with a standard-domain email
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
    await screenChecker(page, '#/welcome');

    await page.getByRole('link').filter({ hasText: 'Se connecter' }).click();

    await screenChecker(page, '#/email-precheck-sso');
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screenChecker(page, '/login');
    await page.getByRole('link').filter({ hasText: 'Mot de passe oublié' }).click();

    await screenChecker(page, '/recover');

    // Fill the wrong-server email and submit
    await page.locator('input[name="email"]').fill(wrongServerEmail);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screenChecker(page, '/recover');
    await expect(page.getByText('hors vous êtes sur le serveur')).toBeVisible();
  });

});
