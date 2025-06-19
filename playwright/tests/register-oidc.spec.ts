import { test, expect } from '../fixtures/auth-fixture';
import { 
  performOidcLogin, 
  verifyUserInMas, 
  createMasTestUser, 
  cleanupMasTestUser, 
  performPasswordLogin, 
  TestUser 
} from './utils/auth-helpers';
import { checkMasUserExistsByEmail, createMasUserWithPassword, getMasUserByEmail, deactivateMasUser } from './utils/mas-admin';
import { SCREENSHOTS_DIR } from './utils/config';

test.describe('Register', () => {

  test('register oidc with allowed account', async ({ page, testUser }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await checkMasUserExistsByEmail(testUser.kc_email);
    expect(existsBeforeLogin).toBe(false);
    
    // Perform the OIDC login flow
    await performOidcLogin(page, testUser,screenshot_path);
    
    // Click the create account button
    await page.locator('button[type="submit"]').click();

    // Verify we're successfully logged in
    // This could be checking for a specific element that's only visible when logged in
    await expect(page.locator('text=Mon compte')).toBeVisible();
    
    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-authenticated.png` });
    
    // Verify the user was created in MAS
    await verifyUserInMas(testUser);
    
    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(testUser.kc_email);
    expect(existsAfterLogin).toBe(true);
    
    console.log(`Successfully authenticated and verified user ${testUser.kc_username} (${testUser.kc_email})`);
  });
  
  test('register oidc with extern without invit', async ({ page, testExternalUserWitoutInvit }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await checkMasUserExistsByEmail(testExternalUserWitoutInvit.kc_email);
    expect(existsBeforeLogin).toBe(false);
    
    // Perform the OIDC login flow
    await performOidcLogin(page, testExternalUserWitoutInvit, screenshot_path);
    
    // Get error
    await page.locator('text=invitation_missing');
    
    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-error-no-invit.png` });
    
    
    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(testExternalUserWitoutInvit.kc_email);
    expect(existsAfterLogin).toBe(false);
    
    console.log(`Successfully authenticated and verified user ${testExternalUserWitoutInvit.kc_username} (${testExternalUserWitoutInvit.kc_email})`);
  });

  test('register oidc with extern with invit', async ({ page, testExternalUserWithInvit: testExternalUserWithInvit }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await checkMasUserExistsByEmail(testExternalUserWithInvit.kc_email);
    expect(existsBeforeLogin).toBe(false);
    
    // Perform the OIDC login flow
    await performOidcLogin(page, testExternalUserWithInvit, screenshot_path);
    
    // Click the create account button
    await page.locator('button[type="submit"]').click();
  
    // Verify we're successfully logged in
    await expect(page.locator('text=Mon compte')).toBeVisible();
    
    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-authenticated-external.png` });
    
    // Verify the user was created in MAS
    await verifyUserInMas(testExternalUserWithInvit);
    
    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(testExternalUserWithInvit.kc_email);
    expect(existsAfterLogin).toBe(true);
    
    console.log(`Successfully authenticated and verified external user ${testExternalUserWithInvit.kc_username} (${testExternalUserWithInvit.kc_email})`);
  });

  test('register oidc on wrong homeserver', async ({ page, testUserOnWrongServer }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await checkMasUserExistsByEmail(testUserOnWrongServer.kc_email);
    expect(existsBeforeLogin).toBe(false);
    
    // Perform the OIDC login flow
    await performOidcLogin(page, testUserOnWrongServer, screenshot_path);
   
    // Get error
    await page.locator('text=wrong_server');
    
    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-error-wrong-server.png` });
    
    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(testUserOnWrongServer.kc_email);
    expect(existsAfterLogin).toBe(false);
    
    console.log(`Successfully authenticated and verified user ${testUserOnWrongServer.kc_username} (${testUserOnWrongServer.kc_email})`);
  });

});
