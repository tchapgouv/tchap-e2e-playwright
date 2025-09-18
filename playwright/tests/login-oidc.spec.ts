import { test, expect } from '../fixtures/auth-fixture';
import { 
  performOidcLogin,
} from './utils/auth-helpers';
import { checkMasUserExistsByEmail, createMasUserWithPassword, getMasUserByEmail, deactivateMasUser,oauthLinkExistsByUserId, oauthLinkExistsBySubject, getOauthLinkExistsByUserId, deleteOauthLink, getOauthLinkBySubject } from './utils/mas-admin';
import { SCREENSHOTS_DIR } from './utils/config';

test.describe('Login via OIDC', () => {
 
  test('match account by username', async ({ page, userLegacy: userLegacy }) => {
    const screenshot_path = test.info().title.replace(" ", "_");
    
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
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png` });
      
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


  test('match account by email', async ({ page, userLegacy: userLegacy }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${userLegacy.kc_email}`);
    
    userLegacy.masId = await createMasUserWithPassword(userLegacy.kc_username+"different_from_email", userLegacy.kc_email, userLegacy.kc_password);
    
    try {
     
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
      //expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);
      expect(await oauthLinkExistsBySubject(userLegacy.kc_username)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${userLegacy.kc_email}`);
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(userLegacy.masId);
      console.log(`Cleaned up MAS user: ${userLegacy.kc_username}`);
    }
  });


  test('match account by email with fallback rules', async ({ page, userLegacyWithFallbackRules: userLegacy }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    const old_email_domain = "@beta.gouv.fr";
    const old_email = userLegacy.kc_email.replace(/@.*/, old_email_domain);


    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with old email: ${old_email} whereas email in keycloak is : ${userLegacy.kc_email}`);
    
    userLegacy.masId = await createMasUserWithPassword(userLegacy.kc_username+"different_from_email", old_email, userLegacy.kc_password);
    
    try {
      
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


  test('match a deactivated account by email', async ({browser, context, page, userLegacy: userLegacy }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${userLegacy.kc_email}`);
    
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
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png` });
      
      // Verify the user in MAS is still the same (account was linked, not created new)
      const userAfterLogin = await getMasUserByEmail(userLegacy.kc_email);
      expect(userAfterLogin.id).toBe(userLegacy.masId);
      //expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);
      expect(await oauthLinkExistsBySubject(userLegacy.kc_username)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${userLegacy.kc_email}`);

      //deactvate account
      await deactivateMasUser(userLegacy.masId);

      const links = await getOauthLinkBySubject(userLegacy.kc_username);

      await deleteOauthLink(links[0]['id'])

      //console.log(`wait 1 seconds`);

      //await page.waitForTimeout(1000);

      // Create a new incognito browser context
      const context2 = await browser.newContext();

      // Create a page.
      const page2 = await context2.newPage();

      //RESTART ANOTHER OIDC LOGIN
      await page2.goto('/login');
  
      const screenshot_path_2 = screenshot_path + "_2"
      // Take a screenshot of the login page
      await page2.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path_2}/01-login-page.png` });
     
      // Perform the OIDC login flow
      await performOidcLogin(page2, userLegacy, screenshot_path_2);

      // Click the link account button
      await page2.locator('button[type="submit"]').click();

      await page2.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path_2}/04-linked-account.png` });

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page2.locator('text=Mon compte')).toBeVisible();
      
      // Take a screenshot of the authenticated state
      await page2.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path_2}/05-connected-account.png` });
    
   
      console.log(`Successfully verified account linking for user with email: ${userLegacy.kc_email}`);


      // Verify the user in MAS is still the same (account was linked, not created new)
      const userAfterLogin2 = await getMasUserByEmail(userLegacy.kc_email);
      expect(userAfterLogin2.id).toBe(userLegacy.masId);
      //expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);
      expect(await oauthLinkExistsBySubject(userLegacy.kc_username)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${userLegacy.kc_email}`);
      
    } finally {
      // Clean up the MAS user
      //await deactivateMasUser(userLegacy.masId);
      //console.log(`Cleaned up MAS user: ${userLegacy.kc_username}`);
    }
  });
});
