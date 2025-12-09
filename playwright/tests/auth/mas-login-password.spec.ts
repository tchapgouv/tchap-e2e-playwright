import { test, expect } from '../../fixtures/auth-fixture';
import { 
  createMasTestUser, 
  cleanupMasTestUser, 
  performPasswordLogin, 
  TestUser 
} from '../../utils/auth-helpers';
import { SCREENSHOTS_DIR } from '../../utils/config';

test.describe('MAS login password', () => {

  test('with allowed account', async ({ page }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Create a test user with a password in MAS
    const user = await createMasTestUser("exemple.com");
    
    try {
      console.log(`Created test user in MAS: ${user.username} (${user.email})`);
      
      // Perform password login
      await performPasswordLogin(page, user,screenshot_path);
      
      // Verify we're successfully logged in
      await expect(page.locator('text=Mon compte')).toBeVisible();
      
      // Take a screenshot of the authenticated state
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-password-auth-success.png` });
      
      console.log(`Successfully authenticated with password for user: ${user.username}`);
    } finally {
      // Clean up the test user
      await cleanupMasTestUser(user);
      console.log(`Cleaned up test user: ${user.username}`);
    }
  });
});
