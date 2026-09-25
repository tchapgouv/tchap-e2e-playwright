import { test, expect } from '../../../fixtures/auth-fixture';
import { performOidcLogin, verifyUserInMas } from '../../../utils/auth-helpers';
import { MasAdminClient } from '../../../utils/mas-admin';

test.describe('MAS register OIDC', () => {
  test('mas register oidc - with allowed account', async ({ page, oidcUser, screenChecker }) => {
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await masAdminClient.checkUserExistsByEmail(oidcUser.email);
    expect(existsBeforeLogin).toBe(false);

    // Perform the OIDC login flow
    await performOidcLogin(page, oidcUser, screenChecker);

    // Verify we're successfully logged in
    // This could be checking for a specific element that's only visible when logged in
    await expect(page.locator('text=Connecté')).toBeVisible();

    // Take a screenshot of the authenticated state
    await screenChecker(page, '/');

    // Verify the user was created in MAS
    await verifyUserInMas(oidcUser, masAdminClient);

    // Double-check with the API
    const existsAfterLogin = await masAdminClient.checkUserExistsByEmail(oidcUser.email);
    expect(existsAfterLogin).toBe(true);

    console.log(
      `Successfully authenticated and verified user ${oidcUser.username} (${oidcUser.email})`
    );
  });

  test('mas register oidc - with extern without invit', async ({
    page,
    oidcExternalUserWitoutInvit,
    screenChecker,
  }) => {
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await masAdminClient.checkUserExistsByEmail(
      oidcExternalUserWitoutInvit.email
    );
    expect(existsBeforeLogin).toBe(false);

    // Perform the OIDC login flow
    await performOidcLogin(page, oidcExternalUserWitoutInvit, screenChecker);

    // Get error
    await expect(page.locator('text=invitation_missing')).toBeVisible();

    // Take a screenshot of the authenticated state
    await screenChecker(page, '/');

    // Double-check with the API
    const existsAfterLogin = await masAdminClient.checkUserExistsByEmail(
      oidcExternalUserWitoutInvit.email
    );
    expect(existsAfterLogin).toBe(false);

    console.log(
      `Successfully authenticated and verified user ${oidcExternalUserWitoutInvit.username} (${oidcExternalUserWitoutInvit.email})`
    );
  });

  test('mas register oidc - with extern with invit', async ({
    page,
    oidcExternalUserWithInvit,
    screenChecker,
  }) => {
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await masAdminClient.checkUserExistsByEmail(
      oidcExternalUserWithInvit.email
    );
    expect(existsBeforeLogin).toBe(false);

    // Perform the OIDC login flow
    await performOidcLogin(page, oidcExternalUserWithInvit, screenChecker);

    // Verify we're successfully logged in
    await expect(page.locator('text=Connecté')).toBeVisible();

    // Take a screenshot of the authenticated state
    await screenChecker(page, '/');

    // Verify the user was created in MAS
    await verifyUserInMas(oidcExternalUserWithInvit, masAdminClient);

    // Double-check with the API
    const existsAfterLogin = await masAdminClient.checkUserExistsByEmail(
      oidcExternalUserWithInvit.email
    );
    expect(existsAfterLogin).toBe(true);

    console.log(
      `Successfully authenticated and verified external user ${oidcExternalUserWithInvit.username} (${oidcExternalUserWithInvit.email})`
    );
  });

  test('mas register oidc - on wrong homeserver', async ({
    page,
    oidcUserOnWrongServer,
    screenChecker,
  }) => {
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await masAdminClient.checkUserExistsByEmail(
      oidcUserOnWrongServer.email
    );
    expect(existsBeforeLogin).toBe(false);

    // Perform the OIDC login flow
    await performOidcLogin(page, oidcUserOnWrongServer, screenChecker);

    // Get error
    await expect(page.locator('text=wrong_server')).toBeVisible();

    // Take a screenshot of the authenticated state
    await screenChecker(page, '/');

    // Double-check with the API
    const existsAfterLogin = await masAdminClient.checkUserExistsByEmail(
      oidcUserOnWrongServer.email
    );
    expect(existsAfterLogin).toBe(false);

    console.log(
      `Successfully authenticated and verified user ${oidcUserOnWrongServer.username} (${oidcUserOnWrongServer.email})`
    );
  });
});
