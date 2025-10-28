import { APIRequestContext, test as base, Page } from "@playwright/test";
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

import {
  STANDARD_EMAIL_DOMAIN,
  INVITED_EMAIL_DOMAIN,
  NOT_INVITED_EMAIL_DOMAIN,
  WRONG_SERVER_EMAIL_DOMAIN,
  NUMERIQUE_EMAIL_DOMAIN,
  BASE_URL,
  ELEMENT_URL,
  env,
  AVAILABLE_ENV,
} from "../utils/config";
import { ClientServerApi, Credentials } from "../utils/api";
import { users } from "../data/users";
import { AdminApi } from "../utils/api-admin";



async function loginUserAndPopulateStorage(page: Page, request: APIRequestContext, user: TestUser): Promise<Credentials> {
  const csAPI = new ClientServerApi(BASE_URL, request);

  const credentials = (await csAPI.loginUser(
    user.kc_username,
    user.kc_password
  )) as Credentials;

  // 2. Populate localStorage
  await populateLocalStorageWithCredentials(page, credentials);

  return credentials;

}
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

/**
 * Extend the basic test fixtures with our authentication fixtures
 */
export const test = base.extend<{
  simpleUser: TestUser;
  testUser: TestUser;
  testExternalUserWithInvit: TestUser;
  testExternalUserWitoutInvit: TestUser;
  testUserOnWrongServer: TestUser;
  userLegacy: TestUser;
  userLegacyWithFallbackRules: TestUser;
  authenticatedUser: Credentials;
  adminAPI: AdminApi;
  chooseUserEnv: TestUser;
  typeUser: TypeUser;
  env: AVAILABLE_ENV;
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
  env,
  adminAPI: async ({ page }, use) => {
    // initialize adminAPI
    const adminAPI = AdminApi.getInstance(BASE_URL);

    await adminAPI.init();

    use(adminAPI);
  },
  chooseUserEnv: async ({ testUser: user }, use) => {
    let selectedUser: TestUser;
    let userId: string | null = null;

    if (env === AVAILABLE_ENV.LOCAL) {
      // 1. Register user
      userId = await createMasUserWithPassword(
        user.kc_username,
        user.kc_email,
        user.kc_password
      );

      await waitForMasUser(user.kc_email);

      selectedUser = user;
    } else {
      selectedUser = users[AVAILABLE_ENV.DEV][0];
    }

    use(selectedUser);


    if (env === AVAILABLE_ENV.LOCAL && userId) {
      // Clean up mas local user, deactivate user
      await deactivateMasUser(userId);
      console.log(`Cleaned up MAS user: ${user.kc_username}`);
    }
  },
  authenticatedUser: async ({ page, testUser: user, request }, use) => {

    const credentials = await loginUserAndPopulateStorage(page, request, user);

    // 3. Load app
    await page.goto(ELEMENT_URL);
    await page.waitForSelector(".mx_MatrixChat", { timeout: 20000 });

    // 4. Pass page to test
    await use(credentials);
  },
});

export { expect } from "@playwright/test";
