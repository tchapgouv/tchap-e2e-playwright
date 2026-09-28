import { test, expect } from '../../../fixtures/auth-fixture';
import {
  createMasTestUser,
  cleanupMasTestUser,
  performPasswordLogin,
} from '../../../utils/auth-helpers';
import { MasAdminClient } from '../../../utils/mas-admin';

test.describe('MAS login password', () => {
  test('with allowed account', async ({ page, screenChecker }) => {
    // Create a test user with a password in MAS
    const masAdminClient = await MasAdminClient.createDefaultMAS();
    const user = await createMasTestUser('exemple.com', masAdminClient);

    try {
      console.log(`Created test user in MAS: ${user.username} (${user.email})`);

      // Perform password login
      await performPasswordLogin(page, user, screenChecker);

      // Verify we're successfully logged in
      await expect(page.locator('text=Connecté')).toBeVisible();

      // Take a screenshot of the authenticated state
      await screenChecker(page, '/');

      console.log(`Successfully authenticated with password for user: ${user.username}`);
    } finally {
      // Clean up the test user
      await cleanupMasTestUser(user, masAdminClient);
      console.log(`Cleaned up test user: ${user.username}`);
    }
  });
});
