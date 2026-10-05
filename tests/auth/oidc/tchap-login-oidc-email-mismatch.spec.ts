import { expect, test } from '../../../fixtures/auth-fixture';
import { MasAdminClient } from '../../../utils/mas-admin';
import {
  cleanupKeycloakTestUser,
  createKeycloakTestUser,
  generateTestUserData,
  performOidcLoginFromTchap,
} from '../../../utils/auth-helpers';
import {
  STANDARD_EMAIL_DOMAIN,
  WRONG_SERVER_EMAIL_DOMAIN,
  TEST_USER_PREFIX,
} from '../../../utils/config';

test.describe('Tchap Login OIDC — login hint email mismatch oidc email', () => {
  test('DifferentHomeserver: login_hint on STANDARD, OIDC email on WRONG server — login fails with wrong_server message', async ({
    page,
    screenChecker,
  }) => {
    // Keycloak user on WRONG_SERVER_EMAIL_DOMAIN (different homeserver)
    const keycloakUser = await createKeycloakTestUser(
      generateTestUserData(WRONG_SERVER_EMAIL_DOMAIN)
    );

    // login_hint on STANDARD_EMAIL_DOMAIN (the current MAS server's domain)
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    const loginHintEmail = `${TEST_USER_PREFIX}_hint_${timestamp}_${randomSuffix}@${STANDARD_EMAIL_DOMAIN}`;

    console.log(`[Mismatch Test] login_hint (Element): ${loginHintEmail}`);
    console.log(`[Mismatch Test] OIDC email (Keycloak): ${keycloakUser.email}`);

    try {
      await performOidcLoginFromTchap(page, keycloakUser, screenChecker, loginHintEmail);

      // The login must succeed despite the mismatch (informational check only)
      await expect(page.locator('text=wrong_server')).toBeVisible();

      //no user created
    } finally {
      await cleanupKeycloakTestUser(keycloakUser);
      console.log(
        '[Mismatch Test] Done — check MAS logs for tracing::warn! with DifferentHomeserver'
      );
    }
  });

  test('SameHomeserver: login_hint and OIDC email differ on the same homeserver — login still succeeds', async ({
    page,
    oidcUser,
    screenChecker,
  }) => {
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    // login_hint email on the same domain as the Keycloak user, but different local-part
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    const loginHintEmail = `${TEST_USER_PREFIX}_hint_${timestamp}_${randomSuffix}@${STANDARD_EMAIL_DOMAIN}`;

    console.log(`[Mismatch Test] login_hint (Element): ${loginHintEmail}`);
    console.log(`[Mismatch Test] OIDC email (Keycloak): ${oidcUser.email}`);

    try {
      await performOidcLoginFromTchap(page, oidcUser, screenChecker, loginHintEmail);

      // The login must succeed despite the mismatch (informational check only)
      await expect(page.locator('text=Nouvel appareil')).toBeVisible();

      // Verify the user was created in MAS
      const masUser = await masAdminClient.waitForUser(oidcUser.email);
      expect(masUser).toBeDefined();
      console.log(`[Mismatch Test] MAS user created: ${masUser.id}`);

      // Clean up MAS user
      await masAdminClient.deactivateUser(masUser.id);
    } finally {
      console.log('[Mismatch Test] Done — check MAS logs for tracing::warn! with SameHomeserver');
    }
  });
});
