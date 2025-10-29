import { test as base, Page, TestInfo } from "@playwright/test";
import {
  createKeycloakTestUser,
  cleanupKeycloakTestUser,
  TestUser,
  TypeUser,
  populateLocalStorageWithCredentials,
} from "../utils/auth-helpers";
import { disposeApiContext as disposeKeycloakApiContext } from "../utils/keycloak-admin";
import { createMasUserWithPassword, deactivateMasUser, disposeApiContext as disposeMasApiContext, waitForMasUser } from "../utils/mas-admin";
import { generateTestUser } from "../utils/auth-helpers";
import fs from 'fs';
import path from 'path';
import { SCREENSHOTS_DIR } from '../utils/config';

import {
  STANDARD_EMAIL_DOMAIN,
  INVITED_EMAIL_DOMAIN,
  NOT_INVITED_EMAIL_DOMAIN,
  WRONG_SERVER_EMAIL_DOMAIN,
  NUMERIQUE_EMAIL_DOMAIN,
  BASE_URL,
  ELEMENT_URL
} from "../utils/config";
import { ClientServerApi, Credentials } from "../utils/api";


function generateSimpleUserFixture(domain: string) {
  return async ({}, use: (user: TestUser) => Promise<void>) => {
    try {
      const user = generateTestUser(domain);
      
      // Use the test user in the test
      await use(user);
     
    } finally {
      // Dispose API contexts
      await Promise.all([
      ]);
    }
  };
}

/**
 * Function to create a test user fixture with a specific domain
 */
function createTestUserFixture(domain: string) {
  return async ({}, use: (user: TestUser) => Promise<void>) => {
    try {
      const testUser = generateTestUser(domain);

      // Create a test user in Keycloak
      const user = await createKeycloakTestUser(testUser);

      // Use the test user in the test
      await use(user);

      // Clean up the test user after the test
      await cleanupKeycloakTestUser(user);
      console.log(`Cleaned up test user: ${user.kc_username}`);
    } finally {
      // Dispose API contexts
      await Promise.all([disposeKeycloakApiContext(), disposeMasApiContext()]);
      console.log("API contexts disposed");
    }
  };
}

//legacy users have a username derived from email :
//email : username@domain.com -> username : username-domain.com
function createLegacyUserFixture(domain: string) {
  return async ({}, use: (user: TestUser) => Promise<void>) => {
    try {
      const randomSuffix = Math.floor(Math.random() * 10000);

      const testUser: TestUser = {
        kc_username: `test.user${randomSuffix}-${domain}`,
        kc_email: `test.user${randomSuffix}@${domain}`,
        kc_password: "1234!",
      };

      // Create a test user in Keycloak
      const user = await createKeycloakTestUser(testUser);

      // Use the test user in the test
      await use(user);

      // Clean up the test user after the test
      await cleanupKeycloakTestUser(user);
      console.log(`Cleaned up test user: ${user.kc_username}`);
    } finally {
      // Dispose API contexts
      await Promise.all([disposeKeycloakApiContext(), disposeMasApiContext()]);
      console.log("API contexts disposed");
    }
  };
}


export type ScreenCheckerFixture = {
  waitForScreen: (page: Page, urlFragment: string) => Promise<void>;
};

/**
 * Extend the basic test fixtures with our authentication fixtures
 */
export const test = base.extend<{
  simpleUser: TestUser,
  testUser: TestUser;
  testExternalUserWithInvit: TestUser;
  testExternalUserWitoutInvit: TestUser;
  testUserOnWrongServer: TestUser;
  userLegacy: TestUser;
  userLegacyWithFallbackRules: TestUser;
  authenticatedUser: Credentials;
  typeUser: TypeUser;
  screenChecker :ScreenCheckerFixture;
}>({
  /**
   * Create a test user in Keycloak before the test and clean it up after
   */
  simpleUser: generateSimpleUserFixture(STANDARD_EMAIL_DOMAIN),
  testUser: createTestUserFixture(STANDARD_EMAIL_DOMAIN),
  testExternalUserWithInvit: createTestUserFixture(INVITED_EMAIL_DOMAIN),
  testExternalUserWitoutInvit: createTestUserFixture(NOT_INVITED_EMAIL_DOMAIN),
  testUserOnWrongServer: createTestUserFixture(WRONG_SERVER_EMAIL_DOMAIN),
  userLegacy: createLegacyUserFixture(STANDARD_EMAIL_DOMAIN),
  userLegacyWithFallbackRules: createLegacyUserFixture(NUMERIQUE_EMAIL_DOMAIN),
  typeUser: TypeUser.MAS_PASSWORD_USER,
   screenChecker: async ({}, use, testInfo: TestInfo) => {
    //this fixture clean up the screenshot folder before the tests
    //and exposes a method to capture a screenshot from an waited url

    const screenshotPath = path.join(SCREENSHOTS_DIR, testInfo.title.replace(/\s+/g, '_'));
    let counter = 1;

    if (fs.existsSync(screenshotPath)) {
      fs.rmSync(screenshotPath, { recursive: true, force: true });
    }
    fs.mkdirSync(screenshotPath, { recursive: true });

    const screenChecker = async (page: Page, urlFragment: string) => {
      await page.waitForURL((url) => url.toString().includes(urlFragment));
      const filename = `${counter.toString().padStart(2, '0')}-${urlFragment.replace(/[^\w]/g, '_')}.png`;
      await page.screenshot({ path: path.join(screenshotPath, filename), fullPage:true });
      counter++;
    };

    await use(screenChecker);
  },
  authenticatedUser: async ({ page, testUser: user, request }, use) => {
    // 1. Register user
    const userId = await createMasUserWithPassword(
      user.kc_username,
      user.kc_email,
      user.kc_password
    );
    const csAPI = new ClientServerApi(BASE_URL, request);

    await waitForMasUser(user.kc_email);

    const credentials = (await csAPI.loginUser(
      user.kc_username,
      user.kc_password
    )) as Credentials;

    // 2. Populate localStorage
    await populateLocalStorageWithCredentials(page, credentials);

    // 3. Load app
    await page.goto(ELEMENT_URL);
    await page.waitForSelector(".mx_MatrixChat", { timeout: 20000 });

    // 4. Pass page to test
    await use(credentials);

    // Clean up, deactivate user
    await deactivateMasUser(userId);
    console.log(`Cleaned up MAS user: ${user.kc_username}`);
  },
});

export { expect } from "@playwright/test";
