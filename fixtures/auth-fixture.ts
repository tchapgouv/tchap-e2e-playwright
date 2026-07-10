import { test as base, type Page, type TestInfo } from '@playwright/test';
import {
  createKeycloakTestUser,
  cleanupKeycloakTestUser,
  type TestUser,
  TypeUser,
  populateLocalStorageWithCredentials,
  Credentials,
} from '../utils/auth-helpers';
import { disposeApiContext as disposeKeycloakApiContext } from '../utils/keycloak-admin';
import { MasAdminClient } from '../utils/mas-admin';
import { generateTestUserData } from '../utils/auth-helpers';
import fs from 'node:fs';
import path from 'node:path';
import { SCREENSHOTS_DIR } from '../utils/config';

import {
  STANDARD_EMAIL_DOMAIN,
  INVITED_EMAIL_DOMAIN,
  NOT_INVITED_EMAIL_DOMAIN,
  WRONG_SERVER_EMAIL_DOMAIN,
  NUMERIQUE_EMAIL_DOMAIN,
  MATRIX_URL,
  ELEMENT_URL,
} from '../utils/config';
import { loginWithNewUser, standardUserOptions } from '../tests/integration/api/room-access-rules/room-utils';

function generateUserDataFixture(domain: string) {
  return async ({}, use: (user: TestUser) => Promise<void>) => {
    try {
      const user = generateTestUserData(domain);

      // Use the test user in the test
      await use(user);
    } finally {
      // Dispose API contexts
      await Promise.all([]);
    }
  };
}

/**
 * Function to create a test user fixture with a specific domain
 */
function createKeycloakUserFixture(domain: string) {
  return async ({}, use: (user: TestUser) => Promise<void>) => {
    try {
      const testUserData = generateTestUserData(domain);

      // Create a test user in Keycloak
      const user = await createKeycloakTestUser(testUserData);

      // Use the test user in the test
      await use(user);

      // Clean up the test user after the test
      await cleanupKeycloakTestUser(user);
      console.log(`Cleaned up test user: ${user.username}`);
    } finally {
      // Dispose API contexts
      await Promise.all([disposeKeycloakApiContext()]);
      console.log('API contexts disposed');
    }
  };
}

export type ScreenCheckerFixture = (page: Page, urlFragment: string) => Promise<void>;
export type StartTchapRegisterWithEmailFixture = (page: Page, email: string) => Promise<void>;
export type AuthenticatedUserFixture = (
  page: Page,
  user: TestUser,
  request: any
) => Promise<Credentials>;

async function screenCheckerFixture(
  {},
  use: (screenChecker: ScreenCheckerFixture) => Promise<void>,
  testInfo: TestInfo
) {
  //this fixture clean up the screenshot folder before the tests
  //and exposes a method to capture a screenshot from an waited url

  const screenshotPath = path.join(SCREENSHOTS_DIR, testInfo.title.replace(/\s+/g, '_'));
  let counter = 1;

  if (fs.existsSync(screenshotPath)) {
    fs.rmSync(screenshotPath, { recursive: true, force: true });
  }
  fs.mkdirSync(screenshotPath, { recursive: true });

  const screenChecker = async (page: Page, urlFragment: string) => {
    const browserName = page.context().browser()?.browserType().name();

    await page.waitForURL(
      (url) => {
        console.log('current page url : ', url.pathname);
        return url.toString().includes(urlFragment);
      },
      { waitUntil: 'load' }
    );
    const filename = `${browserName}_${counter.toString().padStart(2, '0')}-${urlFragment.replace(/[^\w]/g, '_')}.png`;
    await page.screenshot({ path: path.join(screenshotPath, filename), fullPage: true });
    counter++;
  };

  await use(screenChecker);
}

async function startTchapRegisterWithEmailFixture(
  { screenChecker }: { screenChecker: ScreenCheckerFixture },
  use: (start: StartTchapRegisterWithEmailFixture) => Promise<void>
) {
  const start = async (page: Page, email: string) => {
    await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'load' });
    await screenChecker(page, '#/welcome');
    await page.getByRole('link').filter({ hasText: 'Créer un compte' }).click();

    await screenChecker(page, '#/email-precheck-sso');
    await page.locator('input').fill(email);
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screenChecker(page, '/register');
    await page.getByRole('button').filter({ hasText: 'Continuer avec mon adresse mail' }).click();
  };
  await use(start);
}

async function authenticatedUserFixture(
  { page, userData: user, request }: { page: Page; userData: TestUser; request: any },
  use: (credentials: Credentials) => Promise<void>
) {
  const masAdminClient = await MasAdminClient.createDefaultMAS();
  
  const matrixAPI = await loginWithNewUser(masAdminClient, standardUserOptions() )

  const credentials = matrixAPI.credentials;

  //console.log(credentials);

  // 2. Populate localStorage
  await populateLocalStorageWithCredentials(page, credentials);

  // 3. Load app
  await page.goto(ELEMENT_URL);
  await page.waitForSelector('.mx_MatrixChat', { timeout: 20000 });

  // 4. Pass page to test
  await use(credentials);

  // Clean up, deactivate user
  await masAdminClient.deactivateUser(matrixAPI.masId);
  console.log(`Cleaned up MAS user: ${user.username}`);
}

/**
 * Extend the basic test fixtures with our authentication fixtures
 */
export const test = base.extend<{
  userData: TestUser;
  oidcUser: TestUser;
  oidcExternalUserWithInvit: TestUser;
  oidcExternalUserWitoutInvit: TestUser;
  oidcUserOnWrongServer: TestUser;
  oidcUserWithFallbackRules: TestUser;
  authenticatedUser: Credentials;
  typeUser: TypeUser;
  screenChecker: ScreenCheckerFixture;
  startTchapRegisterWithEmail: StartTchapRegisterWithEmailFixture;
}>({
  /**
   * Create a test user in Keycloak before the test and clean it up after
   */
  userData: generateUserDataFixture(STANDARD_EMAIL_DOMAIN),
  oidcUser: createKeycloakUserFixture(STANDARD_EMAIL_DOMAIN),
  oidcExternalUserWithInvit: createKeycloakUserFixture(INVITED_EMAIL_DOMAIN),
  oidcExternalUserWitoutInvit: createKeycloakUserFixture(NOT_INVITED_EMAIL_DOMAIN),
  oidcUserOnWrongServer: createKeycloakUserFixture(WRONG_SERVER_EMAIL_DOMAIN),
  oidcUserWithFallbackRules: createKeycloakUserFixture(NUMERIQUE_EMAIL_DOMAIN),
  authenticatedUser: authenticatedUserFixture,
  typeUser: TypeUser.MAS_PASSWORD_USER,
  screenChecker: screenCheckerFixture,
  startTchapRegisterWithEmail: startTchapRegisterWithEmailFixture,
});

export { expect } from '@playwright/test';
