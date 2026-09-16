import { test, expect } from '../../../fixtures/auth-fixture';
import { MasAdminClient } from '../../../utils/mas-admin';
import { SCREENSHOTS_DIR, ELEMENT_URL } from '../../../utils/config';
import { makeWrongServerEmail } from '../../../utils/auth-helpers';

test.describe('Tchap : Login password', () => {
  test('tchap login with password and login_hint', async ({ page, userData, screenChecker }) => {
    const screenshot_path = test.info().title.replace(' ', '_');

    const masAdminClient = await MasAdminClient.createDefaultMAS();
    userData.masId = await masAdminClient.createUserWithPassword(
      userData.username,
      userData.email,
      userData.password
    );

    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });

    await screenChecker(page, `#/welcome`);
    await page.getByRole('link').filter({ hasText: 'Se connecter' }).click();

    await screenChecker(page, `#/email-precheck-sso`);
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //login
    await screenChecker(page, `/login`);
    await expect(page.locator('input[name="username"]')).toHaveValue(userData.email);
    await page.locator('input[name="password"]').fill(userData.password);
    await page.locator('button[type="submit"]').click();

    //consent
    await screenChecker(page, `/consent`);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //tchap
    await expect(page.locator('text=Bienvenue')).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/05-auth-success.png` });

    // Double-check with the API
    const existsAfterLogin = await masAdminClient.checkUserExistsByEmail(userData.email);
    expect(existsAfterLogin).toBe(true);

    console.log(
      `Successfully authenticated and verified user ${userData.username} (${userData.email})`
    );
  });

   test('tchap login with wrong server email shows error', async ({
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

    // MAS login page — replace the pre-filled username with the wrong-server email
    await screenChecker(page, '/login');
    await page.locator('input[name="username"]').fill(wrongServerEmail);
    await page.locator('input[name="password"]').fill(userData.password);
    await page.locator('button[type="submit"]').click();

    await screenChecker(page, '/login');
    await expect(page.getByText('hors vous êtes sur le serveur')).toBeVisible();
  });
});
