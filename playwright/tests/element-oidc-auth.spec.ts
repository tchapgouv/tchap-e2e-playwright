import { test, expect } from '../fixtures/auth-fixture';
import { 
  verifyUserInMas, 
  performOidcLoginFromElement
} from './utils/auth-helpers';
import { checkMasUserExistsByEmail, createMasUserWithPassword } from './utils/mas-admin';
import { SCREENSHOTS_DIR, TCHAP_LEGACY } from './utils/config';

test.describe('Element OIDC register flows', () => {
  test('element : login via oidc', async ({ page, userLegacy: userLegacy }) => {
    const screenshot_path = 'element_register_oidc';

    userLegacy.masId = await createMasUserWithPassword(userLegacy.kc_username, userLegacy.kc_email, userLegacy.kc_password);

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await checkMasUserExistsByEmail(userLegacy.kc_email);
    expect(existsBeforeLogin).toBe(true);
    
    // Perform the OIDC login flow
    await performOidcLoginFromElement(page, userLegacy,screenshot_path, TCHAP_LEGACY);
    
    // Click the create account button
    await page.locator('button[type="submit"]').click();

    // Verify we're successfully logged in, confirgmation page
    await expect(page.locator('text=Continuer')).toBeVisible();
    
    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/05-confirmation.png` });
    
    await page.locator('button[type="submit"]').filter({hasText:'Continuer'}).click();

    await expect(page.locator('text=Configuration')).toBeVisible({timeout: 10000});

    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/06-auth-success.png` });
    
    // Verify the user was created in MAS
    await verifyUserInMas(userLegacy);
    
    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(userLegacy.kc_email);
    expect(existsAfterLogin).toBe(true);
    
    console.log(`Successfully authenticated and verified user ${userLegacy.kc_username} (${userLegacy.kc_email})`);
  });
});
