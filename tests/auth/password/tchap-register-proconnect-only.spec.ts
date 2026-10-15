import { test, expect, type ScreenCheckerFixture } from '../../../fixtures/auth-fixture';
import type { Page } from '@playwright/test';
import { generateTestUserData } from '../../../utils/auth-helpers';
import { ELEMENT_URL, STANDARD_EMAIL_DOMAIN } from '../../../utils/config';
import { MasAdminClient } from '../../../utils/mas-admin';

/**
 * Tests for the `register/proconnect_only` policy entrypoint.
 *
 * The `register_proconnect_only_domains` policy data (list of regexes matched
 * against the lowercased email domain of the `login_hint`) hides the
 * "continue with email" button on the MAS register page.
 *
 * The login_hint is set by the Tchap client in the OAuth2 authorization
 * request and stored in the authorization grant: the register page reads it
 * from the grant, not from the URL. The tests therefore go through the real
 * Element Web account creation flow (email precheck), which lands on
 * `/register` with the grant continuation parameters.
 *
 * The last test documents a known gap: the protection only hides the button
 * (UI level). The password registration page itself is still reachable by
 * crafting its URL with the grant continuation parameters.
 */

// In the policy data, domains are regexes: the dots must be escaped
const domainToRegex = (domain: string) => domain.replace(/\./g, '\\.');

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
    initialPolicyData = await masAdminClient.getLatestPolicyData();
  });

  test.afterEach(async () => {
    if (masAdminClient) {
      await masAdminClient.setPolicyData(initialPolicyData ?? {});
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
});
