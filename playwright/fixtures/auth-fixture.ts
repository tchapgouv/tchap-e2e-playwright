import { test as base } from '@playwright/test';
import { createKeycloakTestUser, cleanupKeycloakTestUser, TestUser } from '../tests/utils/auth-helpers';
import { disposeApiContext as disposeKeycloakApiContext } from '../tests/utils/keycloak-admin';
import { disposeApiContext as disposeMasApiContext } from '../tests/utils/mas-admin';
import { generateTestUser } from '../tests/utils/config';

import { 
  STANDARD_EMAIL_DOMAIN, 
  INVITED_EMAIL_DOMAIN, 
  NOT_INVITED_EMAIL_DOMAIN, 
  WRONG_SERVER_EMAIL_DOMAIN,
  NUMERIQUE_EMAIL_DOMAIN
} from '../tests/utils/config';

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
      await Promise.all([
        disposeKeycloakApiContext(),
        disposeMasApiContext()
      ]);
      console.log('API contexts disposed');
    }
  };
}

//legacy users have a username derived from email :
//email : username@domain.com -> username : username-domain.com
function createLegacyUserFixture(domain: string) {
  return async ({}, use: (user: TestUser) => Promise<void>) => {
    try {
      const randomSuffix = Math.floor(Math.random() * 10000);

      const testUser:TestUser = {
        kc_username: `test.user${randomSuffix}-${domain}`,
        kc_email: `test.user${randomSuffix}@${domain}`,
        kc_password: '1234!'
      }
      
      // Create a test user in Keycloak
      const user = await createKeycloakTestUser(testUser);
      
      // Use the test user in the test
      await use(user);
      
      // Clean up the test user after the test
      await cleanupKeycloakTestUser(user);
      console.log(`Cleaned up test user: ${user.kc_username}`);
    } finally {
      // Dispose API contexts
      await Promise.all([
        disposeKeycloakApiContext(),
        disposeMasApiContext()
      ]);
      console.log('API contexts disposed');
    }
  };
}

/**
 * Extend the basic test fixtures with our authentication fixtures
 */
export const test = base.extend<{
  testUser: TestUser;
  testExternalUserWithInvit: TestUser;
  testExternalUserWitoutInvit: TestUser;
  testUserOnWrongServer: TestUser;
  userLegacy:TestUser;
  userLegacyWithFallbackRules: TestUser;
}>({
  /**
   * Create a test user in Keycloak before the test and clean it up after
   */
  testUser: createTestUserFixture(STANDARD_EMAIL_DOMAIN),
  testExternalUserWithInvit: createTestUserFixture(INVITED_EMAIL_DOMAIN),
  testExternalUserWitoutInvit: createTestUserFixture(NOT_INVITED_EMAIL_DOMAIN),
  testUserOnWrongServer: createTestUserFixture(WRONG_SERVER_EMAIL_DOMAIN),
  userLegacy:createLegacyUserFixture(STANDARD_EMAIL_DOMAIN),
  userLegacyWithFallbackRules:createLegacyUserFixture(NUMERIQUE_EMAIL_DOMAIN)
});

export { expect } from '@playwright/test';
