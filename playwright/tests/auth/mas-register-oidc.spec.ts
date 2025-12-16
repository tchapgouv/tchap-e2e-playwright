import { test, expect } from '../../fixtures/auth-fixture';
import { 
  performOidcLogin, 
  verifyUserInMas, 
  createMasTestUser, 
  cleanupMasTestUser, 
  performPasswordLogin, 
  TestUser 
} from '../../utils/auth-helpers';
import { checkMasUserExistsByEmail, createMasUserWithPassword, getMasUserByEmail, deactivateMasUser } from '../../utils/mas-admin';
import { SCREENSHOTS_DIR } from '../../utils/config';

test.describe('MAS register OIDC', () => {

  test('mas register oidc - with allowed account', async ({ page, oidcUser: oidcUser }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await checkMasUserExistsByEmail(oidcUser.email);
    expect(existsBeforeLogin).toBe(false);
    
    // Perform the OIDC login flow
    await performOidcLogin(page, oidcUser,screenshot_path);

    // Verify we're successfully logged in
    // This could be checking for a specific element that's only visible when logged in
    await expect(page.locator('text=Connecté')).toBeVisible();
    
    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-authenticated.png` });
    
    // Verify the user was created in MAS
    await verifyUserInMas(oidcUser);
    
    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(oidcUser.email);
    expect(existsAfterLogin).toBe(true);
    
    console.log(`Successfully authenticated and verified user ${oidcUser.username} (${oidcUser.email})`);
  });
  
  test('mas register oidc - with extern without invit', async ({ page, oidcExternalUserWitoutInvit: oidcExternalUserWitoutInvit }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await checkMasUserExistsByEmail(oidcExternalUserWitoutInvit.email);
    expect(existsBeforeLogin).toBe(false);
    
    // Perform the OIDC login flow
    await performOidcLogin(page, oidcExternalUserWitoutInvit, screenshot_path);
    
    // Get error
    await expect(page.locator('text=invitation_missing')).toBeVisible();;
    
    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-error-no-invit.png` });
    
    
    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(oidcExternalUserWitoutInvit.email);
    expect(existsAfterLogin).toBe(false);
    
    console.log(`Successfully authenticated and verified user ${oidcExternalUserWitoutInvit.username} (${oidcExternalUserWitoutInvit.email})`);
  });

  test('mas register oidc - with extern with invit', async ({ page, oidcExternalUserWithInvit: oidcExternalUserWithInvit }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await checkMasUserExistsByEmail(oidcExternalUserWithInvit.email);
    expect(existsBeforeLogin).toBe(false);
    
    // Perform the OIDC login flow
    await performOidcLogin(page, oidcExternalUserWithInvit, screenshot_path);
  
    // Verify we're successfully logged in
    await expect(page.locator('text=Connecté')).toBeVisible();
    
    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-authenticated-external.png` });
    
    // Verify the user was created in MAS
    await verifyUserInMas(oidcExternalUserWithInvit);
    
    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(oidcExternalUserWithInvit.email);
    expect(existsAfterLogin).toBe(true);
    
    console.log(`Successfully authenticated and verified external user ${oidcExternalUserWithInvit.username} (${oidcExternalUserWithInvit.email})`);
  });

  test('mas register oidc - on wrong homeserver', async ({ page, oidcUserOnWrongServer: oidcUserOnWrongServer }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await checkMasUserExistsByEmail(oidcUserOnWrongServer.email);
    expect(existsBeforeLogin).toBe(false);
    
    // Perform the OIDC login flow
    await performOidcLogin(page, oidcUserOnWrongServer, screenshot_path);
   
    // Get error
    await expect(page.locator('text=wrong_server')).toBeVisible();
    
    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-error-wrong-server.png` });
    
    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(oidcUserOnWrongServer.email);
    expect(existsAfterLogin).toBe(false);
    
    console.log(`Successfully authenticated and verified user ${oidcUserOnWrongServer.username} (${oidcUserOnWrongServer.email})`);
  });

});
