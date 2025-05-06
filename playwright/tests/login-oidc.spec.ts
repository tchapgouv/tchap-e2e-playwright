import { test, expect } from '../fixtures/auth-fixture';
import { 
  performOidcLogin, 
  verifyUserInMas, 
  createMasTestUser, 
  cleanupMasTestUser, 
  performPasswordLogin, 
  TestUser 
} from './utils/auth-helpers';
import { checkMasUserExistsByEmail, createMasUserWithPassword, getMasUserByEmail, deactivateMasUser } from './utils/mas-admin';
import { SCREENSHOTS_DIR } from './utils/config';

test.describe('Oidc login flows', () => {
 
  test('should link existing MAS account when logging in via OIDC with same email', async ({ page, testLink }) => {
    const screenshot_path = 'link_oidc_account';

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${testLink.email}`);
    
    const masUserId = await createMasUserWithPassword(testLink.username, testLink.email, testLink.password);
    testLink.masId = masUserId;
    
    try {
      // Verify the user exists in MAS
      const existsBeforeLogin = await checkMasUserExistsByEmail(testLink.email);
      expect(existsBeforeLogin).toBe(true);
      console.log(`Confirmed MAS user exists with email: ${testLink.email}`);
      
      // Perform the OIDC login flow
      await performOidcLogin(page, testLink, screenshot_path);
      
       // Click the link account button
      await page.locator('button[type="submit"]').click();

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Mon compte')).toBeVisible();
      
      // Take a screenshot of the authenticated state
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png` });
      
      // Verify the user in MAS is still the same (account was linked, not created new)
      const userAfterLogin = await getMasUserByEmail(testLink.email);
      expect(userAfterLogin.id).toBe(masUserId);
      
      console.log(`Successfully verified account linking for user with email: ${testLink.email}`);
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(masUserId);
      console.log(`Cleaned up MAS user: ${testLink.username}`);
    }
  });
});
