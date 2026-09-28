import { test, expect } from '../../../fixtures/auth-fixture';
import { verifyUserInMas, performOidcLoginFromTchap } from '../../../utils/auth-helpers';
import { MasAdminClient } from '../../../utils/mas-admin';
import { ELEMENT_URL } from '../../../utils/config';

//flaky on await expect(page.locator('text=Configuration')).toBeVisible({timeout: 20000});
test.describe('Tchap : Login via OIDC', () => {
  test('tchap match account by email', async ({ page, oidcUser, screenChecker }) => {
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    oidcUser.masId = await masAdminClient.createUserWithPassword(
      oidcUser.username,
      oidcUser.email,
      oidcUser.password
    );

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await masAdminClient.checkUserExistsByEmail(oidcUser.email);
    expect(existsBeforeLogin).toBe(true);

    // Perform the OIDC login flow
    await performOidcLoginFromTchap(page, oidcUser, screenChecker);

    await page.locator('button[type="submit"]').filter({ hasText: 'Continuer' }).click();

    //flaky condition
    await expect(page.locator('text=Bienvenue')).toBeVisible({ timeout: 20000 });

    // Take a screenshot of the authenticated state
    await screenChecker(page, "/");

    // Verify the user was created in MAS
    await verifyUserInMas(oidcUser, masAdminClient);

    // Double-check with the API
    const existsAfterLogin = await masAdminClient.checkUserExistsByEmail(oidcUser.email);
    expect(existsAfterLogin).toBe(true);

    console.log(
      `Successfully authenticated and verified user ${oidcUser.username} (${oidcUser.email})`
    );
  });
});
