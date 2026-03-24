


import { test, expect } from '../../fixtures/auth-fixture';
import { addUserEmail, checkMasUserExistsByEmail, createMasUserWithPassword, deactivateMasUser, deleteOauthLink, deleteUserEmail, getMasUserByEmail, getOauthLinkBySubject, getUserEmail, oauthLinkExistsBySubject, reactivateMasUser } from '../../utils/mas-admin';
import { SCREENSHOTS_DIR, ELEMENT_URL } from '../../utils/config';
import { performOidcLogin } from '../../utils/auth-helpers';


test.describe('Tchap : Login password', () => {

  test('tchap login when account is deactivated displays "Identifiants Invalides"', async ({ page, userData, screenChecker }) => {

    userData.masId = await createMasUserWithPassword(userData.username, userData.email, userData.password);
    const existsBeforeLogin = await checkMasUserExistsByEmail(userData.email);
    expect(existsBeforeLogin).toBe(true);

    //deactivate user
    await deactivateMasUser(userData.masId);
  
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
  
    await screenChecker(page, `#/welcome`)
    await page.getByRole('link').filter({hasText : "Se connecter"}).click();
  
    await screenChecker(page, `#/email-precheck-sso`)
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
  
    //login
    await screenChecker(page, `/login`)
    await expect(page.locator('input[name="username"]')).toHaveValue(userData.email);
    await page.locator('input[name="password"]').fill(userData.password);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=Identifiants invalides')).toBeVisible();

  });

  test('tchap register when account is deactivated displays "Compte desactivé"', async ({ page, userData, screenChecker, startTchapRegisterWithEmail }) => {

    userData.masId = await createMasUserWithPassword(userData.username, userData.email, userData.password);
    const existsBeforeLogin = await checkMasUserExistsByEmail(userData.email);
    expect(existsBeforeLogin).toBe(true);

    //deactivate user
    await deactivateMasUser(userData.masId);
  
    await startTchapRegisterWithEmail(page, userData.email);
   
    await screenChecker(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(userData.email);
    
    await page.locator('input[name="password"]').fill(userData.password);
    await page.locator('input[name="password_confirm"]').fill(userData.password);

    //wait for password-confirm matching confirmation
    await page.locator("body").click({ position: { x: 0, y: 0 } }); //unfocus field    
    await expect(page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })).toBeVisible();
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click({clickCount:2}); //2 clicks works better than one

    await expect(page.locator('text=Compte desactivé')).toBeVisible();

    
  });

  test('match account by email when former account is deactivated but another one is valid', async ({page, oidcUser }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${oidcUser.email}`);
    
    const formerTchapAccountMasId = await createMasUserWithPassword(oidcUser.username, oidcUser.email, oidcUser.password);
    await deactivateMasUser(formerTchapAccountMasId);
    
    const newTchapAccountWithIndex = {
      username: oidcUser.username + "2",
      email: oidcUser.email,
      password: oidcUser.password,
      masId: "",
    }
    newTchapAccountWithIndex.masId = await createMasUserWithPassword(newTchapAccountWithIndex.username, newTchapAccountWithIndex.email, newTchapAccountWithIndex.password);
    
    try {
     
      // Perform the OIDC login flow with KC Account(=userLegacy)
      await performOidcLogin(page, oidcUser, screenshot_path);

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
      expect(await oauthLinkExistsBySubject(oidcUser.username)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${newTchapAccountWithIndex.email}`);

    } finally {
      // Clean up the MAS user
      await deactivateMasUser(newTchapAccountWithIndex.masId);
      console.log(`Cleaned up MAS user: ${newTchapAccountWithIndex.username}`);
    }
  });

  test.skip('match account by email when account was deactivated but is reactivated by support', async ({browser, page, oidcUser }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${oidcUser.email}`);
    
    oidcUser.masId = await createMasUserWithPassword(oidcUser.username, oidcUser.email, oidcUser.password);
    
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

      // deactvate account
      await deactivateMasUser(oidcUser.masId);

      // SUPPORT PROCESS PERFORMED BY BOT ADMIN
      const links = await getOauthLinkBySubject(oidcUser.username);
      await deleteOauthLink(links[0]['id'])
      await reactivateMasUser(oidcUser.masId);
      await addUserEmail(oidcUser.masId, oidcUser.email)
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
      await performOidcLogin(page2, oidcUser, screenshot_path_2);

      await page2.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path_2}/04-linked-account.png` });

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page2.locator('text=Connecté')).toBeVisible();
      
      // Take a screenshot of the authenticated state
      await page2.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path_2}/05-connected-account.png` });
    
   
      console.log(`Successfully verified account linking for user with email: ${oidcUser.email}`);


      // Verify the user in MAS is still the same (account was linked, not created new)
      const userAfterLogin2 = await getMasUserByEmail(oidcUser.email);
      expect(userAfterLogin2.id).toBe(oidcUser.masId);
      //expect(await oauthLinkExistsByUserId(userLegacy.masId)).toBe(true);
      expect(await oauthLinkExistsBySubject(oidcUser.username)).toBe(true);

      console.log(`Successfully verified account linking for user with email: ${oidcUser.email}`);
      
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(oidcUser.masId);
      console.log(`Cleaned up MAS user: ${oidcUser.username}`);
    }
  });
  
  test('match account by email when account was deactivated displays "Invalid Data"', async ({page, oidcUser }) => {
    try {
        const screenshot_path = test.info().title.replace(" ", "_");

        // Create a user in MAS with the same email as the Keycloak user
        console.log(`Creating MAS user with same email as Keycloak user: ${oidcUser.email}`);
        
        oidcUser.masId = await createMasUserWithPassword(oidcUser.username, oidcUser.email, oidcUser.password);
        const existsBeforeLogin = await checkMasUserExistsByEmail(oidcUser.email);
        expect(existsBeforeLogin).toBe(true);
        //delete email 
        const user_email_row = await getUserEmail(oidcUser.masId, oidcUser.email);
        await deleteUserEmail(user_email_row.id);

        // Perform the OIDC login flow
        await performOidcLogin(page, oidcUser, screenshot_path);

        // Since the account already exists, we should be automatically logged in
        // Verify we're successfully logged in
        
        //await expect(page.locator('text=Connecté')).toBeVisible();
        await expect(page.locator('text=Invalid Data')).toBeVisible();

        // Take a screenshot of the authenticated state
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png` });
       
    } finally {
      // Clean up the MAS user
      await deactivateMasUser(oidcUser.masId);
      console.log(`Cleaned up MAS user: ${oidcUser.username}`);
    }
  });


})