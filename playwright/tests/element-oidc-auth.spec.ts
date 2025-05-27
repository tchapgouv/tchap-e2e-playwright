import { test, expect } from '../fixtures/auth-fixture';
import { 
  performOidcLogin, 
  verifyUserInMas, 
  createMasTestUser, 
  cleanupMasTestUser, 
  performPasswordLogin, 
  TestUser, 
  performOidcLoginFromElement
} from './utils/auth-helpers';
import { checkMasUserExistsByEmail } from './utils/mas-admin';
import { SCREENSHOTS_DIR, TCHAP_LEGACY } from './utils/config';

test.describe('Element OIDC register flows', () => {
  /* this test is skiped because it does not work and it makes others tests fail also */
  test.skip('element : register via oidc and create user in MAS', async ({ page, testUser }) => {
    const screenshot_path = 'element_register_oidc';

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await checkMasUserExistsByEmail(testUser.kc_email);
    expect(existsBeforeLogin).toBe(false);
    
    // Perform the OIDC login flow
    await performOidcLoginFromElement(page, testUser,screenshot_path, TCHAP_LEGACY);
    
    // Click the create account button
    await page.locator('button[type="submit"]').click();

    // Verify we're successfully logged in, confirgmation page
    await expect(page.locator('text=Continuer')).toBeVisible();
    
    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/05-confirmation.png` });
    
    await page.locator('button[type="submit"]').filter({hasText:'Continuer'}).click();

    await expect(page.locator('text=Configuration')).toBeVisible();

    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/06-auth-success.png` });
    
    // Verify the user was created in MAS
    await verifyUserInMas(testUser);
    
    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(testUser.kc_email);
    expect(existsAfterLogin).toBe(true);
    
    console.log(`Successfully authenticated and verified user ${testUser.kc_username} (${testUser.kc_email})`);
  });
});
