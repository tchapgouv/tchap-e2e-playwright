import { test, expect } from '../../fixtures/auth-fixture';
import { 
  createKeycloakTestUser,
  performOidcLogin,
  TestUser,
} from '../../utils/auth-helpers';
import { createMasUserWithPassword, getMasUserByEmail, deactivateMasUser,oauthLinkExistsByUserId, oauthLinkExistsBySubject, getOauthLinkBySubject, deleteOauthLink, reactivateMasUser, addUserEmail } from '../../utils/mas-admin';
import { SCREENSHOTS_DIR, STANDARD_EMAIL_DOMAIN } from '../../utils/config';

test.describe('MAS Login OIDC', () => {
 
  test('match account by email', async ({ page, oidcUser: oidcUser }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${oidcUser.email}`);
    
    oidcUser.masId = await createMasUserWithPassword(oidcUser.username, oidcUser.email, "any");
    
    try {
     
      // Perform the OIDC login flow
      await performOidcLogin(page, oidcUser, screenshot_path);
      
      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Connecté')).toBeVisible();
      
      // Take a screenshot of the authenticated state
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png` });
      
      // Verify the user in MAS is still the same (account was linked, not created new)
      const userAfterLogin = await getMasUserByEmail(oidcUser.email);
      expect(userAfterLogin.id).toBe(oidcUser.masId);
      //expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);
      expect(await oauthLinkExistsBySubject(oidcUser.username)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${oidcUser.email}`);
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(oidcUser.masId);
      console.log(`Cleaned up MAS user: ${oidcUser.username}`);
    }
  });

  test('match external account by email', async ({ page, oidcExternalUserWitoutInvit: externalUser }) => {
    // we use the fixture oidcExternalUserWitoutInvit because as long as the account is created, 
    // there is no invitation pending in the identity server.
    
    const screenshot_path = test.info().title.replace(" ", "_");

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${externalUser.email}`);
    
    externalUser.masId = await createMasUserWithPassword(externalUser.username, externalUser.email, externalUser.password);
    
    try {
      // Perform the OIDC login flow
      await performOidcLogin(page, externalUser, screenshot_path);
      
      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Connecté')).toBeVisible();
      
      // Take a screenshot of the authenticated state
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png` });
      
      // Verify the user in MAS is still the same (account was linked, not created new)
      const userAfterLogin = await getMasUserByEmail(externalUser.email);
      expect(userAfterLogin.id).toBe(externalUser.masId);
      //expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);
      expect(await oauthLinkExistsBySubject(externalUser.username)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${externalUser.email}`);
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(externalUser.masId);
      console.log(`Cleaned up MAS user: ${externalUser.username}`);
    }
  });

  test('match account by email with fallback rules', async ({ page, oidcUserWithFallbackRules: oidcUser }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    const old_email_domain = "@beta.gouv.fr";
    const old_email = oidcUser.email.replace(/@.*/, old_email_domain);


    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with old email: ${old_email} whereas email in keycloak is : ${oidcUser.email}`);
    
    oidcUser.masId = await createMasUserWithPassword(oidcUser.username+"different_from_email", old_email, oidcUser.password);
    
    try {
      
      // Perform the OIDC login flow
      await performOidcLogin(page, oidcUser, screenshot_path);
      
      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Connecté')).toBeVisible();
      
      // Take a screenshot of the authenticated state
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png` });
      
      // Verify the user in MAS is still the same (account was linked, not created new)
      const userAfterLogin = await getMasUserByEmail(old_email);
      expect(userAfterLogin.id).toBe(oidcUser.masId);
      expect(await oauthLinkExistsByUserId(oidcUser.masId)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${old_email}`);
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(oidcUser.masId);
      console.log(`Cleaned up MAS user: ${oidcUser.username}`);
    }
  });

  test('match account by email when former account is deactivated but another one is valid', async ({browser, context, page, oidcUserWithFallbackRules: userLegacy }) => {
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

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Connecté')).toBeVisible();
      
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

  test('match account by email when account was deactivated but is reactivated by support', async ({browser, context, page, oidcUserWithFallbackRules: userLegacy }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${userLegacy.email}`);
    
    userLegacy.masId = await createMasUserWithPassword(userLegacy.username, userLegacy.email, userLegacy.password);
    
    try {
     
      // Perform the OIDC login flow
      await performOidcLogin(page, userLegacy, screenshot_path);

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Connecté')).toBeVisible();
      
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

      await page2.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path_2}/04-linked-account.png` });

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page2.locator('text=Connecté')).toBeVisible();
      
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

  test('match account by username throw error when email does not match', async ({ page}) => {
    const screenshot_path = test.info().title.replace(" ", "_");
    
    //create a user in keycloak with an `email` that matches a `localpart` in MAS
    //while the email in MAS is different
    //then linking will not be on the `email` but on the `localpart`
    //which is a failing edge case
    //we expect an error page
    const domain = STANDARD_EMAIL_DOMAIN;
    
    const randomSuffix = Math.floor(Math.random() * 10000000);
    const mas_user_email = `any-email-${randomSuffix}@${domain}`;

      const testUser: TestUser = {
        username: `test.user${randomSuffix}-${domain}`,
        email: `test.user${randomSuffix}@${domain}`,
        password: "1234!",
      };

    const user = await createKeycloakTestUser(testUser);

    user.masId = await createMasUserWithPassword(user.username, mas_user_email, user.password);
    
    try {
      // Perform the OIDC login flow
      await performOidcLogin(page, user, screenshot_path);
      
      // Get error
      //await expect(page.locator('text=unknown_error'));
      await expect(page.locator('text="Invalid Data"')).toBeVisible();
;
   
      console.log(`Successfully verified account linking for user with email: ${user.email}`);
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(user.masId);
      console.log(`Cleaned up MAS user: ${user.username}`);
    }
  });
});
