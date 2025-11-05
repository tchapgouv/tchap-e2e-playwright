import { test, expect } from '../../fixtures/auth-fixture';
import { 
  performOidcLogin,
} from '../../utils/auth-helpers';
import { checkMasUserExistsByEmail, createMasUserWithPassword, getMasUserByEmail, deactivateMasUser,oauthLinkExistsByUserId, oauthLinkExistsBySubject, getOauthLinkBySubject, deleteOauthLink, reactivateMasUser, addUserEmail } from '../../utils/mas-admin';
import { SCREENSHOTS_DIR } from '../../utils/config';

test.describe('Login via OIDC', () => {
 
  test('match account by username', async ({ page, userLegacy: userLegacy }) => {
    const screenshot_path = test.info().title.replace(" ", "_");
    
    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same username as Keycloak user: ${userLegacy.username}`);
    
    userLegacy.masId = await createMasUserWithPassword(userLegacy.username, userLegacy.email, userLegacy.password);
    
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
      const userAfterLogin = await getMasUserByEmail(userLegacy.email);
      expect(userAfterLogin.id).toBe(userLegacy.masId);
      expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${userLegacy.email}`);
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(userLegacy.masId);
      console.log(`Cleaned up MAS user: ${userLegacy.username}`);
    }
  });


  test('match account by email', async ({ page, userLegacy: userLegacy }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${userLegacy.email}`);
    
    userLegacy.masId = await createMasUserWithPassword(userLegacy.username+"different_from_email", userLegacy.email, userLegacy.password);
    
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
      const userAfterLogin = await getMasUserByEmail(userLegacy.email);
      expect(userAfterLogin.id).toBe(userLegacy.masId);
      //expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);
      expect(await oauthLinkExistsBySubject(userLegacy.username)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${userLegacy.email}`);
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(userLegacy.masId);
      console.log(`Cleaned up MAS user: ${userLegacy.username}`);
    }
  });


  test('match account by email with fallback rules', async ({ page, userLegacyWithFallbackRules: userLegacy }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    const old_email_domain = "@beta.gouv.fr";
    const old_email = userLegacy.email.replace(/@.*/, old_email_domain);


    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with old email: ${old_email} whereas email in keycloak is : ${userLegacy.email}`);
    
    userLegacy.masId = await createMasUserWithPassword(userLegacy.username+"different_from_email", old_email, userLegacy.password);
    
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
      console.log(`Cleaned up MAS user: ${userLegacy.username}`);
    }
  });


  test('match account by email when former account is deactivated but another one is valid', async ({browser, context, page, userLegacy: userLegacy }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${userLegacy.email}`);
    
    const formerTchapAccountMasId = await createMasUserWithPassword(userLegacy.username, userLegacy.email, userLegacy.password);
    await deactivateMasUser(formerTchapAccountMasId);
    
    const newTchapAccountWithIndex = {
      username: userLegacy.username + "2",
      email: userLegacy.email,
      password: userLegacy.password,
      masId: "",
    }
    newTchapAccountWithIndex.masId = await createMasUserWithPassword(newTchapAccountWithIndex.username, newTchapAccountWithIndex.email, newTchapAccountWithIndex.password);
    
    try {
     
      // Perform the OIDC login flow with KC Account(=userLegacy)
      await performOidcLogin(page, userLegacy, screenshot_path);
      
       // Click the link account button
      await page.locator('button[type="submit"]').click();

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Mon compte')).toBeVisible();
      
      // Take a screenshot of the authenticated state
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png` });
      
      // Verify the user in MAS is linked to the indexed account
      const userAfterLogin = await getMasUserByEmail(newTchapAccountWithIndex.email);
      expect(userAfterLogin.id).toBe(newTchapAccountWithIndex.masId);
      expect(userAfterLogin.attributes['username']).toBe(newTchapAccountWithIndex.username);
      await expect(page.locator(`text=${newTchapAccountWithIndex.username}`)).toBeVisible();
      expect(await oauthLinkExistsBySubject(userLegacy.username)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${newTchapAccountWithIndex.email}`);

    } finally {
      // Clean up the MAS user
      await deactivateMasUser(newTchapAccountWithIndex.masId);
      console.log(`Cleaned up MAS user: ${newTchapAccountWithIndex.username}`);
    }
  });


  test('match account by email when account was deactivated but is reactivated by support', async ({browser, context, page, userLegacy: userLegacy }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${userLegacy.email}`);
    
    userLegacy.masId = await createMasUserWithPassword(userLegacy.username, userLegacy.email, userLegacy.password);
    
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
      const userAfterLogin = await getMasUserByEmail(userLegacy.email);
      expect(userAfterLogin.id).toBe(userLegacy.masId);
      //expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);
      expect(await oauthLinkExistsBySubject(userLegacy.username)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${userLegacy.email}`);

      // deactvate account
      await deactivateMasUser(userLegacy.masId);


      // SUPPORT PROCESS PERFORMED BY BOT ADMIN
      const links = await getOauthLinkBySubject(userLegacy.username);
      await deleteOauthLink(links[0]['id'])
      await reactivateMasUser(userLegacy.masId);
      await addUserEmail(userLegacy.masId, userLegacy.email)
      // END OF SUPPORT PROCESS

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
    
   
      console.log(`Successfully verified account linking for user with email: ${userLegacy.email}`);


      // Verify the user in MAS is still the same (account was linked, not created new)
      const userAfterLogin2 = await getMasUserByEmail(userLegacy.email);
      expect(userAfterLogin2.id).toBe(userLegacy.masId);
      //expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);
      expect(await oauthLinkExistsBySubject(userLegacy.username)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${userLegacy.email}`);
      
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(userLegacy.masId);
      console.log(`Cleaned up MAS user: ${userLegacy.username}`);
    }
  });
});
