import { test, expect, type ScreenCheckerFixture } from '../../../fixtures/auth-fixture';
import type { Page } from '@playwright/test';
import { createMasTestUser, generateTestUserData } from '../../../utils/auth-helpers';
import { ELEMENT_URL, NOT_INVITED_EMAIL_DOMAIN, STANDARD_EMAIL_DOMAIN, TEST_USER_PASSWORD, WRONG_SERVER_EMAIL_DOMAIN } from '../../../utils/config';
import { MasAdminClient } from '../../../utils/mas-admin';
import { getLatestVerificationCode } from '../../../utils/mailpit';

/**
 * Tests for the `register/proconnect_only` policy entrypoint.
 *
 * The `register_proconnect_only_domains` policy data (list of regexes matched
 * against the lowercased email domain of the `login_hint`) hides the
 * "continue with email" button on the MAS register page.
 */

// In the policy data, domains are regexes: the dots must be escaped
const domainToRegex = (domain: string) => domain.replace(/\./g, '\\.');
const catch_all = ".*";

/**
 * Start the real Tchap account creation flow with the given email: Element
 * Web email precheck, then the MAS register page reached through the OAuth2
 * authorization grant carrying the login_hint.
 */
async function startRegisterFlowWithEmail(page: Page, email: string, screen: ScreenCheckerFixture) {
  await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'load' });
  await screen(page, '#/welcome');
  await page.getByRole('link').filter({ hasText: 'Créer un compte' }).click();

  await screen(page, '#/email-precheck-sso');
  await page.locator('input').fill(email);
  await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

  await screen(page, '/register');
}

test.describe('Tchap : register with ProConnect-only domain', () => {
  // The policy data is global to the MAS instance: save it before each test
  // and restore it afterwards so that other tests are not impacted.
  let masAdminClient: MasAdminClient | undefined;
  let initialPolicyData: Record<string, unknown> | null = null;

  test.beforeEach(async () => {
    masAdminClient = await MasAdminClient.createDefaultMAS();
    //reset policy data before each test
    await masAdminClient.setPolicyData({});

  });

  test.afterEach(async () => {
    if (masAdminClient) {
      //reset policy data after each test
      await masAdminClient.setPolicyData({});
    }
  });

  test('hides the "continue with email" button for a ProConnect-only domain', async ({
    page,
    screenChecker: screen,
  }) => {
    await masAdminClient?.setPolicyData({
      register_proconnect_only_domains: [domainToRegex(STANDARD_EMAIL_DOMAIN)],
    });

    // A user whose email domain is ProConnect-only starts the account
    // creation flow from Element Web
    const user = generateTestUserData(STANDARD_EMAIL_DOMAIN);
    await startRegisterFlowWithEmail(page, user.email, screen);

    // The ProConnect button is still offered
    await expect(page.locator('button.proconnect-button')).toBeVisible();

    // The "continue with email" button is hidden
    await expect(
      page.getByRole('button').filter({ hasText: 'Continuer avec mon adresse mail' })
    ).toBeHidden();
  });

  test('hides the "continue with email" button for all domain', async ({
    page,
    screenChecker: screen,
  }) => {
    await masAdminClient?.setPolicyData({
      register_proconnect_only_domains: [catch_all],
    });

    // A user whose email domain is ProConnect-only starts the account
    // creation flow from Element Web
    const user = generateTestUserData(STANDARD_EMAIL_DOMAIN);
    await startRegisterFlowWithEmail(page, user.email, screen);

    // The ProConnect button is still offered
    await expect(page.locator('button.proconnect-button')).toBeVisible();

    // The "continue with email" button is hidden
    await expect(
      page.getByRole('button').filter({ hasText: 'Continuer avec mon adresse mail' })
    ).toBeHidden();
  });

  test('keeps the "continue with email" button when the email domain is not ProConnect-only', async ({
    page,
    screenChecker: screen,
  }) => {
    // The policy data lists a domain which does not match the user email domain
    await masAdminClient?.setPolicyData({
      register_proconnect_only_domains: ['proconnect-only\\.example.fr'],
    });

    const user = generateTestUserData(STANDARD_EMAIL_DOMAIN);
    await startRegisterFlowWithEmail(page, user.email, screen);

    await expect(
      page.getByRole('button').filter({ hasText: 'Continuer avec mon adresse mail' })
    ).toBeVisible();
  });

  test('keeps the "continue with email" button when the register page is reached without an authorization grant', async ({
    page,
    screenChecker: screen,
  }) => {
    await masAdminClient?.setPolicyData({
      register_proconnect_only_domains: [domainToRegex(STANDARD_EMAIL_DOMAIN)],
    });

    // Direct navigation to the register page: no OAuth2 grant, so no
    // login_hint, the button is displayed even if the policy data is set
    await page.goto('/register');

    await expect(
      page.getByRole('button').filter({ hasText: 'Continuer avec mon adresse mail' })
    ).toBeVisible();

    await screen(page, '/register');
  });

  test('password registration form is still reachable by crafting the URL when the button is hidden', async ({
    page,
    screenChecker: screen,
  }) => {
    await masAdminClient?.setPolicyData({
      register_proconnect_only_domains: [domainToRegex(STANDARD_EMAIL_DOMAIN)],
    });

    // A user whose email domain is ProConnect-only lands on the register
    // page: the "continue with email" button is hidden
    const user = generateTestUserData(STANDARD_EMAIL_DOMAIN);
    await startRegisterFlowWithEmail(page, user.email, screen);
    await expect(
      page.getByRole('button').filter({ hasText: 'Continuer avec mon adresse mail' })
    ).toBeHidden();

    // KNOWN GAP: the protection is UI-level only.
    const grantQuery = new URL(page.url()).search;
    await page.goto(`/register/password${grantQuery}`);

    // The password registration form is displayed, prefilled with the
    // login_hint email of the grant
    await expect(page.locator('input[name="email"]')).toHaveValue(user.email);
    await screen(page, '/register/password');

    // The password registration form is displayed, without login_hint
    await page.goto(`/register/password`);
    await expect(page.locator('input[name="email"]')).toBeEmpty();
    await screen(page, '/register/password');


  });

  test('tchap register with oidc native', async ({
    page,
    userData: user,
    screenChecker: screen,
    startTchapRegisterWithEmail,
  }) => {
    await startTchapRegisterWithEmail(page, user.email);

    await screen(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(user.email);

    await page.locator('input[name="password"]').fill(TEST_USER_PASSWORD);
    await page.locator('input[name="password_confirm"]').fill(TEST_USER_PASSWORD);

    //wait for password-confirm matching confirmation
    await page.locator('body').click({ position: { x: 0, y: 0 } }); //unfocus field
    await expect(
      page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })
    ).toBeVisible();
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click({ clickCount: 2 }); //2 clicks works better than one

    await screen(page, '/verify-email');
    const verificationCode = await getLatestVerificationCode(user.email);
    await page.locator('input[name="code"]').fill(verificationCode);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screen(page, '/consent');
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //await screen(page, '#/home'); does not work with waitFor "networkidle"
    await expect(page.locator('h1').filter({ hasText: /Bienvenue.*/ })).toBeVisible({
      timeout: 20000,
    });
    const masAdminClient = await MasAdminClient.createDefaultMAS();
    const created_user = await masAdminClient.getUserByEmail(user.email);

    //check created username fields
    expect(created_user.attributes.username).toContain(user.username);
  });

  test('with not invited email', async ({
    page,
    userData: user,
    screenChecker: screen,
    startTchapRegisterWithEmail,
  }) => {
    await startTchapRegisterWithEmail(page, user.email);

    const not_invited_user = generateTestUserData(NOT_INVITED_EMAIL_DOMAIN);

    await screen(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(user.email);

    //change email with not invited email
    await page.locator('input[name="email"]').fill(not_invited_user.email);
    await page.locator('input[name="password"]').fill(TEST_USER_PASSWORD);
    await page.locator('input[name="password_confirm"]').fill(TEST_USER_PASSWORD);

    //wait for password-confirm matching confirmation
    await page.locator('body').click({ position: { x: 0, y: 0 } }); //unfocus field
    await expect(
      page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })
    ).toBeVisible();
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click({ clickCount: 2 });

    await screen(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(not_invited_user.email);

    //check that error message is visible
    await expect(
      page
        .locator('div.cpd-form-message.cpd-form-error-message')
        .filter({ hasText: "Vous avez besoin d'une invitation" })
    ).toBeVisible();
  });

  test('with email on wrong server', async ({
    page,
    userData: user,
    screenChecker: screen,
    startTchapRegisterWithEmail,
  }) => {
    await startTchapRegisterWithEmail(page, user.email);

    const wrong_server_user = generateTestUserData(WRONG_SERVER_EMAIL_DOMAIN);

    await screen(page, '/register/password');
    await expect(page.locator('input[name="email"]')).toHaveValue(user.email);

    //change email with not invited email
    await page.locator('input[name="email"]').fill(wrong_server_user.email);
    await page.locator('input[name="password"]').fill(TEST_USER_PASSWORD);
    await page.locator('input[name="password_confirm"]').fill(TEST_USER_PASSWORD);

    //wait for password-confirm matching confirmation
    await page.locator('body').click({ position: { x: 0, y: 0 } }); //unfocus field
    await expect(
      page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })
    ).toBeVisible();
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click({ clickCount: 2 });

    await screen(page, '/register/password');

    //check that error message is visible
    await expect(
      page
        .locator('div.cpd-form-message.cpd-form-error-message')
        .filter({ hasText: 'associée au serveur' })
    ).toBeVisible();
  });

  test('when user already exists', async ({
    browser,
    screenChecker: screen,
    startTchapRegisterWithEmail,
  }) => {
    const masAdminClient = await MasAdminClient.createDefaultMAS();

    // Create a test user with a password in MAS with API
    const user = await createMasTestUser(STANDARD_EMAIL_DOMAIN, masAdminClient);

    //new browser to start from a clean browser history
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await startTchapRegisterWithEmail(page2, user.email);

    await screen(page2, '/register/password');
    await expect(page2.locator('input[name="email"]')).toHaveValue(user.email);

    await page2.locator('input[name="password"]').fill(TEST_USER_PASSWORD);
    await page2.locator('input[name="password_confirm"]').fill(TEST_USER_PASSWORD);

    //wait for password-confirm matching confirmation
    await page2.locator('body').click({ position: { x: 0, y: 0 } }); //unfocus field
    await expect(
      page2.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })
    ).toBeVisible();
    await page2.getByRole('button').filter({ hasText: 'Continuer' }).click({ clickCount: 2 });

    //form is submitted successfully
    await screen(page2, '/verify-email');

    const verificationCode2 = await getLatestVerificationCode(user.email);
    await page2.locator('input[name="code"]').fill(verificationCode2);
    await page2.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screen(page2, '/finish');
    await expect(page2.locator('text=le compte Tchap existe déjà')).toBeVisible();
    await page2.getByRole('link').filter({ hasText: 'Continuer' }).click();

    await screen(page2, '/login');
  });
});
