import { test, expect } from '../../../fixtures/auth-fixture';
import { MasAdminClient } from '../../../utils/mas-admin';
import { SCREENSHOTS_DIR, ELEMENT_URL } from '../../../utils/config';
import { performOidcLogin } from '../../../utils/auth-helpers';
import { getLatestVerificationCode } from '../../../utils/mailpit';

test.describe('Tchap : Login password', () => {
  test('password login when account is deactivated displays "Identifiants Invalides"', async ({
    page,
    browser,
    userData,
    screenChecker,
  }) => {
    const masAdminClient = await MasAdminClient.createDefaultMAS();
    //create user
    userData.masId = await masAdminClient.createUserWithPassword(
      userData.username,
      userData.email,
      userData.password
    );

    //login
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
    await screenChecker(page, `#/welcome`);
    await page.getByRole('link').filter({ hasText: 'Se connecter' }).click();
    await screenChecker(page, `#/email-precheck-sso`);
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
    await screenChecker(page, `/login`);
    await expect(page.locator('input[name="username"]')).toHaveValue(userData.email);
    await page.locator('input[name="password"]').fill(userData.password);
    await page.locator('button[type="submit"]').click();

    //deactivate user
    await masAdminClient.deactivateUser(userData.masId);

    //login with another browser
    page = await (await browser.newContext()).newPage();

    //login
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
    await screenChecker(page, `#/welcome`);
    await page.getByRole('link').filter({ hasText: 'Se connecter' }).click();
    await screenChecker(page, `#/email-precheck-sso`);
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
    await screenChecker(page, `/login`);
    await expect(page.locator('input[name="username"]')).toHaveValue(userData.email);
    await page.locator('input[name="password"]').fill(userData.password);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=Identifiants invalides')).toBeVisible();
  });

  test('register when account is deactivated reactivates account silently', async ({
    page,
    userData,
    screenChecker,
    startTchapRegisterWithEmail,
  }) => {
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    //create user
    userData.masId = await masAdminClient.createUserWithPassword(
      userData.username,
      userData.email,
      userData.password
    );

    //deactivate user
    await masAdminClient.deactivateUser(userData.masId);

    //register
    await startTchapRegisterWithEmail(page, userData.email);
    await screenChecker(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(userData.email);
    await page.locator('input[name="password"]').fill(userData.password);
    await page.locator('input[name="password_confirm"]').fill(userData.password);
    await page.locator('body').click({ position: { x: 0, y: 0 } }); //unfocus field
    await expect(
      page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })
    ).toBeVisible();
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click({ clickCount: 2 }); //2 clicks works better than one
    await screenChecker(page, '/verify-email');
    const verificationCode = await getLatestVerificationCode(userData.email);
    await page.locator('input[name="code"]').fill(verificationCode);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
    await screenChecker(page, '/consent');
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
    await page.waitForSelector('.mx_MatrixChat', { timeout: 20000 });

    //same user, but reactivated
    const created_user = await masAdminClient.getUserByEmail(userData.email);
    console.log(created_user);
    expect(created_user.id).toBe(userData.masId);
    expect(created_user.attributes.deactivated_at).toBeNull();
  });

  test('match account by email when former account is deactivated but another one is valid', async ({
    page,
    oidcUser,
  }) => {
    const screenshot_path = test.info().title.replace(' ', '_');
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${oidcUser.email}`);
    const formerTchapAccountMasId = await masAdminClient.createUserWithPassword(
      oidcUser.username,
      oidcUser.email,
      oidcUser.password
    );
    await masAdminClient.deactivateUser(formerTchapAccountMasId);

    const newTchapAccountWithIndex = {
      username: `${oidcUser.username}2`,
      email: oidcUser.email,
      password: oidcUser.password,
      masId: '',
    };
    //create another user with same email but different username
    newTchapAccountWithIndex.masId = await masAdminClient.createUserWithPassword(
      newTchapAccountWithIndex.username,
      newTchapAccountWithIndex.email,
      newTchapAccountWithIndex.password
    );

    try {
      // Perform the OIDC login flow with KC Account(=userLegacy)
      await performOidcLogin(page, oidcUser, screenshot_path);

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Connecté')).toBeVisible();

      // Take a screenshot of the authenticated state
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png`,
      });

      // Verify the user in MAS is linked to the indexed account
      const userAfterLogin = await masAdminClient.getUserByEmail(newTchapAccountWithIndex.email);
      expect(userAfterLogin.id).toBe(newTchapAccountWithIndex.masId);
      expect(userAfterLogin.attributes.username).toBe(newTchapAccountWithIndex.username);
      await expect(page.locator(`text=${newTchapAccountWithIndex.username}`)).toBeVisible();
      expect(await masAdminClient.oauthLinkExistsBySubject(oidcUser.username)).toBe(true);

      console.log(
        `Successfully verified account linking for user with email: ${newTchapAccountWithIndex.email}`
      );
    } finally {
      // Clean up the MAS user
      await masAdminClient.deactivateUser(newTchapAccountWithIndex.masId);
      console.log(`Cleaned up MAS user: ${newTchapAccountWithIndex.username}`);
    }
  });

  test('oidc login match account by email when account was deactivated, reactivate account', async ({
    page,
    browser,
    oidcUser,
    screenChecker,
  }) => {
    test.setTimeout(30000);
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    const screenshot_path = test.info().title.replace(' ', '_');

    //create user
    oidcUser.masId = await masAdminClient.createUserWithPassword(
      oidcUser.username,
      oidcUser.email,
      oidcUser.password
    );

    //login into account
    await performOidcLogin(page, oidcUser, screenshot_path);

    //deactivate, email is unset
    await masAdminClient.deactivateUser(oidcUser.masId);
    try {
      //user has no email when deactivated
      await masAdminClient.getUserByEmail(oidcUser.email);
    } catch (e) {
      expect(e).toBeDefined();
    }

    //login with another browser context
    page = await (await browser.newContext()).newPage();

    // Perform the OIDC login flow
    await performOidcLogin(page, oidcUser, screenshot_path);
    await screenChecker(page, '/');
    await expect(page.locator('text=Connecté')).toBeVisible();

    //mas user is reactivated and email is set
    const created_user = await masAdminClient.getUserByEmail(oidcUser.email);
    expect(created_user.id).toBe(oidcUser.masId);
    expect(created_user.attributes.deactivated_at).toBeNull();
  });

  //legacy
  //skip it
  /*
  test.skip('match account by email when account was deactivated but is reactivated by support', async ({
    browser,
    page,
    oidcUser,
  }) => {
    const screenshot_path = test.info().title.replace(' ', '_');

    // Create a user in MAS with the same email as the Keycloak user
    console.log(`Creating MAS user with same email as Keycloak user: ${oidcUser.email}`);

    oidcUser.masId = await createMasUserWithPassword(
      oidcUser.username,
      oidcUser.email,
      oidcUser.password
    );

    try {
      // Perform the OIDC login flow
      await performOidcLogin(page, oidcUser, screenshot_path);

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Connecté')).toBeVisible();

      // Take a screenshot of the authenticated state
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-linked-account.png`,
      });

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
      await deleteOauthLink(links[0].id);
      await reactivateMasUser(oidcUser.masId);
      await addUserEmail(oidcUser.masId, oidcUser.email);
      // END OF SUPPORT PROCESS

      // Create a new incognito browser context
      const context2 = await browser.newContext();

      // Create a page.
      const page2 = await context2.newPage();

      //RESTART ANOTHER OIDC LOGIN
      await page2.goto('/login');

      const screenshot_path_2 = `${screenshot_path}_2`;
      // Take a screenshot of the login page
      await page2.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path_2}/01-login-page.png` });

      // Perform the OIDC login flow
      await performOidcLogin(page2, oidcUser, screenshot_path_2);

      await page2.screenshot({
        path: `${SCREENSHOTS_DIR}/${screenshot_path_2}/04-linked-account.png`,
      });

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page2.locator('text=Connecté')).toBeVisible();

      // Take a screenshot of the authenticated state
      await page2.screenshot({
        path: `${SCREENSHOTS_DIR}/${screenshot_path_2}/05-connected-account.png`,
      });

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
  */
});
