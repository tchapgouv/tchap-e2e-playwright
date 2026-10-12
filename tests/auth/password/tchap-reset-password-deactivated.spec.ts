import { MasAdminClient } from '../../../utils/mas-admin';
import { test, expect } from '../../../fixtures/auth-fixture';
import { ELEMENT_URL } from '../../../utils/config';
import { assertNoEmail, getDeactivatedAccountEmail } from '../../../utils/mailpit';

test.describe('Tchap : reset password with deactivated account', () => {
  test('deactivated account receives a "compte désactivé" email instead of a reset link', async ({
    page,
    userData,
    screenChecker,
  }) => {
    test.setTimeout(90000);

    const masAdminClient = await MasAdminClient.createDefaultMAS();

    // Create a user with a password
    userData.masId = await masAdminClient.createUserWithPassword(
      userData.username,
      userData.email,
      userData.password
    );

    // Deactivate the user
    await masAdminClient.deactivateUser(userData.masId);

    // Navigate to the password recovery flow via Element Web
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
    await screenChecker(page, '/welcome');
    await page.getByRole('link').filter({ hasText: 'Se connecter' }).click();
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    // MAS login page → "Mot de passe oublié"
    await screenChecker(page, '/login');
    await page.getByRole('link').filter({ hasText: 'Mot de passe oublié' }).click();

    // MAS recovery start page
    await screenChecker(page, '/recover');
    await page.locator('input[name="email"]').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    // The progress page must be shown (no user enumeration: same UX as
    // a valid account)
    await screenChecker(page, '/recover/progress');

    // The "account deactivated" email must be received
    const emailContent = await getDeactivatedAccountEmail(userData.email);
    expect(emailContent).toContain('désactivé');
    expect(emailContent).toContain('nouvelle création de compte');
  });
});
