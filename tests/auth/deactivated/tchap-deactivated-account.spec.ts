import { test, expect } from '../../../fixtures/auth-fixture';
import { MasAdminClient } from '../../../utils/mas-admin';
import { ELEMENT_URL } from '../../../utils/config';
import { cleanupMasTestUser, createMasTestUser, performOidcLogin } from '../../../utils/auth-helpers';
import { getLatestVerificationCode } from '../../../utils/mailpit';
import { getUserDetails, getUserThreepidEmail } from '../../../utils/synapse-admin';

test.describe('Tchap : deactivated account', () => {
  test('login : account must remain locked when reactivated', async ({
    page,
    userData,
    screenChecker,
  }) => {
    test.setTimeout(60000);

    const masAdminClient = await MasAdminClient.createDefaultMAS();
    const user = await createMasTestUser(userData.domain, masAdminClient);
    if (!user.masId) {
      throw new Error('Failed to create MAS test user');
    }

    try {
      await masAdminClient.deactivateUser(user.masId);
      await masAdminClient.lockUser(user.masId);
      await masAdminClient.reactivateUser(user.masId);

      // The account is active again but must still be locked
      const userAfter = await masAdminClient.getUser(user.masId);
      expect(userAfter.attributes.deactivated_at).toBeNull();
      expect(userAfter.attributes.locked_at).not.toBeNull();

      // Login directly on MAS: the user must get the account locked error page
      await page.goto('/login');
      await page.locator('input[name="username"]').fill(user.username);
      await page.locator('input[name="password"]').fill(user.password);
      await screenChecker(page, '/login');
      await page.locator('button[type="submit"]').click();

      await expect(page.locator('h1.title')).toHaveText('Compte bloqué');
      await expect(page.locator('p.text')).toContainText('a été verrouillé');
      await expect(page.locator('p.text')).toContainText(user.username);

      await screenChecker(page, '/');
    } finally {
      // Clean up the test user
      await cleanupMasTestUser(user, masAdminClient);
      console.log(`Cleaned up test user: ${user.username}`);
    }
  });
  
  test('login : must displays "Identifiants Invalides" when account is deactivated', async ({
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

    //deactivate user
    await masAdminClient.deactivateUser(userData.masId);

    //login
    page = await (await browser.newContext()).newPage();
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
    await page.getByRole('link').filter({ hasText: 'Se connecter' }).click();
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
    await screenChecker(page, `/login`);
    await expect(page.locator('input[name="username"]')).toHaveValue(userData.email);
    await page.locator('input[name="password"]').fill(userData.password);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=Identifiants invalides')).toBeVisible();
  });

  test('login : must displays "compte bloqué" when account is locked', async ({
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

    //lock user
    await masAdminClient.lockUser(userData.masId);


    //login with another browser
    page = await (await browser.newContext()).newPage();
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });
    await page.getByRole('link').filter({ hasText: 'Se connecter' }).click();
    await page.locator('input').fill(userData.email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
    await screenChecker(page, `/login`);
    await expect(page.locator('input[name="username"]')).toHaveValue(userData.email);
    await page.locator('input[name="password"]').fill(userData.password);
    await page.locator('button[type="submit"]').click();
    await screenChecker(page, `/login`);

    await expect(page.locator('text=compte bloqué')).toBeVisible();
  });

  test('register: must reactivates account and go to login', async ({
    page,
    userData,
    screenChecker,
    request,
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
    await expect(page.locator('input[name="email"]')).toHaveValue(userData.email);
    await page.locator('input[name="password"]').fill(userData.password);
    await page.locator('input[name="password_confirm"]').fill(userData.password);
    await page.locator('body').click({ position: { x: 0, y: 0 } }); //unfocus field
    await expect(
      page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })
    ).toBeVisible();
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click({ clickCount: 2 }); //2 clicks works better than one
    const verificationCode = await getLatestVerificationCode(userData.email);
    await page.locator('input[name="code"]').fill(verificationCode);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screenChecker(page, '/finish');
    await expect(page.locator('text=réactivé')).toBeVisible();
    await page.getByRole('link').filter({ hasText: 'Continuer' }).click();
    await screenChecker(page, '/login');
    
    //same user, but reactivated
    const created_user = await masAdminClient.getUserByEmail(userData.email);
    console.log(created_user);
    expect(created_user.id).toBe(userData.masId);
    expect(created_user.attributes.deactivated_at).toBeNull();

    //verify in synapse that reactivated user has email
    const userDetails = await getUserDetails(request, created_user.attributes.username);
    await expect(await getUserThreepidEmail(userDetails)).toEqual(userData.email);

  });

  test('oidc login : must link account by email while former account is deactivated but another one is valid', async ({
    page,
    oidcUser,
    screenChecker,
  }) => {
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
      // Perform the OIDC login flow
      await performOidcLogin(page, oidcUser, screenChecker);

      // Since the account already exists, we should be automatically logged in
      // Verify we're successfully logged in
      await expect(page.locator('text=Connecté')).toBeVisible();

      // Take a screenshot of the authenticated state
      await screenChecker(page, '/');

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

  test('oidc login : must reactivate account when oidc link exists', async ({
    page,
    request,
    browser,
    oidcUser,
    screenChecker,
  }) => {
    test.setTimeout(30000);
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    //create user
    oidcUser.masId = await masAdminClient.createUserWithPassword(
      oidcUser.username,
      oidcUser.email,
      oidcUser.password
    );

    //login into account, oidc identity is linked to mas account
    await performOidcLogin(page, oidcUser, screenChecker);

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
    await performOidcLogin(page, oidcUser, screenChecker);
    await screenChecker(page, '/');
    await expect(page.locator('text=Connecté')).toBeVisible();

    //mas user is reactivated and email is set
    const created_user = await masAdminClient.getUserByEmail(oidcUser.email);
    expect(created_user.id).toBe(oidcUser.masId);
    expect(created_user.attributes.deactivated_at).toBeNull();``

    //verify in synapse that reactivated user got the email from oidc
    const userDetails = await getUserDetails(request, created_user.attributes.username);
    await expect(await getUserThreepidEmail(userDetails)).toEqual(oidcUser.email);

  });

  test('oidc login : must keep account locked when reactivating', async ({
    page,
    browser,
    oidcUser,
    request,
    screenChecker,
  }) => {
    test.setTimeout(30000);
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    //create user
    oidcUser.masId = await masAdminClient.createUserWithPassword(
      oidcUser.username,
      oidcUser.email,
      oidcUser.password
    );

    //login into account, oidc identity is linked to mas account
    await performOidcLogin(page, oidcUser, screenChecker);

    //deactivate, email is unset
    await masAdminClient.deactivateUser(oidcUser.masId);
    await masAdminClient.lockUser(oidcUser.masId);
    try {
      //user has no email when deactivated
      await masAdminClient.getUserByEmail(oidcUser.email);
    } catch (e) {
      expect(e).toBeDefined();
    }

    //login with another browser context
    page = await (await browser.newContext()).newPage();

    // Perform the OIDC login flow
    await performOidcLogin(page, oidcUser, screenChecker);
    
    //email is not bound in synapse
    const userDetails = await getUserDetails(request, oidcUser.username);
    await expect(await getUserThreepidEmail(userDetails)).toBeNull();

    await expect(page.locator('h1.title')).toHaveText('Compte bloqué');
    await expect(page.locator('p.text')).toContainText('a été verrouillé');
  });

  test('oidc login : must reactivate account when oidc link does not exists', async ({
    page,
    browser,
    oidcUser,
    request,
    screenChecker,
  }) => {
    test.setTimeout(30000);
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    //create user
    oidcUser.masId = await masAdminClient.createUserWithPassword(
      oidcUser.username,
      oidcUser.email,
      oidcUser.password
    );

    //oidc link is not created

    //deactivate, email is unset
    await masAdminClient.deactivateUser(oidcUser.masId);

    await expect(await masAdminClient.checkUserExistsByEmail(oidcUser.email)).toBeFalsy();

    //login with another browser context
    page = await (await browser.newContext()).newPage();

    // Perform the OIDC login flow
    await performOidcLogin(page, oidcUser, screenChecker);
    
    //mas user is reactivated and email is set
    const created_user = await masAdminClient.getUserByEmail(oidcUser.email);
    expect(created_user.id).toBe(oidcUser.masId);
    expect(created_user.attributes.deactivated_at).toBeNull();

    //verify in synapse that reactivated user got the email from oidc
    const userDetails = await getUserDetails(request, oidcUser.username);
    await expect(await getUserThreepidEmail(userDetails)).toEqual(oidcUser.email);

  });
});
