import { test as base, Page } from "@playwright/test";
import {
  createKeycloakTestUser,
  cleanupKeycloakTestUser,
  TestUser,
  TypeUser,
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
  BASSE_URL
} from "../utils/config";
import { ClientServerApi, Credentials } from "../utils/api";


/** Adds an initScript to the given page which will populate localStorage appropriately so that Element will use the given credentials. */
export async function populateLocalStorageWithCredentials(page: Page, credentials: Credentials) {
  await page.addInitScript(
      ({ credentials }) => {
          window.localStorage.setItem("mx_hs_url", credentials.homeserverBaseUrl);
          window.localStorage.setItem("mx_user_id", credentials.userId);
          window.localStorage.setItem("mx_access_token", credentials.accessToken);
          window.localStorage.setItem("mx_device_id", credentials.deviceId);
          window.localStorage.setItem("mx_is_guest", "false");
          window.localStorage.setItem("mx_has_pickle_key", "false");
          window.localStorage.setItem("mx_has_access_token", "true");

          window.localStorage.setItem(
              "mx_local_settings",
              JSON.stringify({
                  // Retain any other settings which may have already been set
                  ...JSON.parse(window.localStorage.getItem("mx_local_settings") ?? "{}"),
                  // Ensure the language is set to a consistent value
                  language: "en",
              }),
          );
      },
      { credentials },
  );
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
  simpleUser: TestUser,
  testUser: TestUser;
  testExternalUserWithInvit: TestUser;
  testExternalUserWitoutInvit: TestUser;
  testUserOnWrongServer: TestUser;
  userLegacy: TestUser;
  userLegacyWithFallbackRules: TestUser;
  authenticatedUser: Credentials;
  typeUser: TypeUser;
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
  authenticatedUser: async ({ page, testUser: user, request }, use) => {
    // 1. Register user
    const userId = await createMasUserWithPassword(
      user.kc_username,
      user.kc_email,
      user.kc_password
    );
    const csAPI = new ClientServerApi(BASSE_URL, request);
    console.log("user.kc_password", user.kc_password);
    console.log("userId", userId);

    await waitForMasUser(user.kc_email);

    const credentials = (await csAPI.loginUser(
      userId,
      user.kc_password
    )) as Credentials;

    // 2. Populate localStorage
    await populateLocalStorageWithCredentials(page, credentials);

    // 3. Load app
    await page.goto("/");
    await page.waitForSelector(".mx_MatrixChat", { timeout: 30000 });

    // 4. Pass page to test
    await use(credentials);

    // Clean up, deactivate user
    await deactivateMasUser(userId);
    console.log(`Cleaned up MAS user: ${user.kc_username}`);
  },
});

export { expect } from "@playwright/test";
