import { test, expect } from '../fixtures/auth-fixture';
import { 
  performOidcLogin, 
  verifyUserInMas, 
  createMasTestUser, 
  cleanupMasTestUser, 
  performPasswordLogin, 
  TestUser 
} from './utils/auth-helpers';
import { checkMasUserExistsByEmail, createMasUserWithPassword, getMasUserByEmail, deactivateMasUser,oauthLinkExistsByUserId, oauthLinkExistsBySubject } from './utils/mas-admin';
import { SCREENSHOTS_DIR } from './utils/config';

test.describe('Oidc login flows', () => {
 
  test('should link existing MAS account when logging in via OIDC by username', async ({ page, userLegacy: userLegacy }) => {
    const screenshot_path = 'link_oidc_account_by_username';

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same username as Keycloak user: ${userLegacy.kc_username}`);
    
    userLegacy.masId = await createMasUserWithPassword(userLegacy.kc_username, userLegacy.kc_email, userLegacy.kc_password);
    
    try {

      
      // Perform the OIDC login flow
      await performOidcLogin(page, userLegacy, screenshot_path);
      
       // Click the link account button
      await page.locator('button[type="submit"]').click();

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Mon compte')).toBeVisible();
      
      // Take a screenshot of the authenticated state
      await page.screenshot({fullPage:true,  path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png` });
      
      // Verify the user in MAS is still the same (account was linked, not created new)
      const userAfterLogin = await getMasUserByEmail(userLegacy.kc_email);
      expect(userAfterLogin.id).toBe(userLegacy.masId);
      expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${userLegacy.kc_email}`);
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(userLegacy.masId);
      console.log(`Cleaned up MAS user: ${userLegacy.kc_username}`);
    }
  });


  test('should link existing MAS account when logging in via OIDC with same email but different username', async ({ page, userLegacy: userLegacy }) => {
    const screenshot_path = 'link_oidc_account_by_email';

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${userLegacy.kc_email}`);
    
    userLegacy.masId = await createMasUserWithPassword(userLegacy.kc_username+"different_from_email", userLegacy.kc_email, userLegacy.kc_password);
    
    try {
      // Verify the user exists in MAS
      const existsBeforeLogin = await checkMasUserExistsByEmail(userLegacy.kc_email);
      expect(existsBeforeLogin).toBe(true);
      console.log(`Confirmed MAS user exists with email: ${userLegacy.kc_email}`);
      
      // Perform the OIDC login flow
      await performOidcLogin(page, userLegacy, screenshot_path);
      
       // Click the link account button
      await page.locator('button[type="submit"]').click();

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Mon compte')).toBeVisible();
      
      // Take a screenshot of the authenticated state
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png` });
      
      // Verify the user in MAS is still the same (account was linked, not created new)
      const userAfterLogin = await getMasUserByEmail(userLegacy.kc_email);
      expect(userAfterLogin.id).toBe(userLegacy.masId);
      expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);
      //expect(await oauthLinkExistsBySubject(userLegacy.kc_username)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${userLegacy.kc_email}`);
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(userLegacy.masId);
      console.log(`Cleaned up MAS user: ${userLegacy.kc_username}`);
    }
  });


  test('should link existing MAS account when logging in via OIDC by email using fallback rules', async ({ page, userLegacyWithFallbackRules: userLegacy }) => {
    const screenshot_path = 'link_oidc_account_by_email_with_fallback_rules';

    const old_email_domain = "@beta.gouv.fr";
    const old_email = userLegacy.kc_email.replace(/@.*/, old_email_domain);


    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with old email: ${old_email} whereas email in keycloak is : ${userLegacy.kc_email}`);
    
    userLegacy.masId = await createMasUserWithPassword(userLegacy.kc_username+"different_from_email", old_email, userLegacy.kc_password);
    
    try {
      // Verify the user exists in MAS
      const existsBeforeLogin = await checkMasUserExistsByEmail(old_email);
      expect(existsBeforeLogin).toBe(true);
      console.log(`Confirmed MAS user exists with email: ${old_email}`);
      
      // Perform the OIDC login flow
      await performOidcLogin(page, userLegacy, screenshot_path);
      
       // Click the link account button
      await page.locator('button[type="submit"]').click();

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Mon compte')).toBeVisible();
      
      // Take a screenshot of the authenticated state
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png` });
      
      // Verify the user in MAS is still the same (account was linked, not created new)
      const userAfterLogin = await getMasUserByEmail(old_email);
      expect(userAfterLogin.id).toBe(userLegacy.masId);
      expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${old_email}`);
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(userLegacy.masId);
      console.log(`Cleaned up MAS user: ${userLegacy.kc_username}`);
    }
  });
});
