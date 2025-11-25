import { test, expect } from '../../fixtures/auth-fixture';
import { 
  verifyUserInMas, 
  performOidcLoginFromTchap
} from '../../utils/auth-helpers';
import { checkMasUserExistsByEmail, createMasUserWithPassword } from '../../utils/mas-admin';
import { SCREENSHOTS_DIR, TCHAP_LEGACY } from '../../utils/config';


//flaky on await expect(page.locator('text=Configuration')).toBeVisible({timeout: 20000});
test.describe('Tchap : Login via OIDC', () => {
  test('tchap match account by username', async ({ page, oidcUser: existingOidcUser }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    existingOidcUser.masId = await createMasUserWithPassword(existingOidcUser.username, existingOidcUser.email, existingOidcUser.password);

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await checkMasUserExistsByEmail(existingOidcUser.email);
    expect(existsBeforeLogin).toBe(true);
    
    // Perform the OIDC login flow
    await performOidcLoginFromTchap(page, existingOidcUser,screenshot_path, TCHAP_LEGACY);
    
    // Click the create account button
    await page.locator('button[type="submit"]').click();

    // Verify we're successfully logged in, confirgmation page
    await expect(page.locator('text=Continuer')).toBeVisible();
    
    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/05-confirmation.png` });
    
    await page.locator('button[type="submit"]').filter({hasText:'Continuer'}).click();

    //flaky condition
    await expect(page.locator('text=Bienvenue')).toBeVisible({timeout: 20000});

    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/06-auth-success.png` });
    
    // Verify the user was created in MAS
    await verifyUserInMas(existingOidcUser);
    
    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(existingOidcUser.email);
    expect(existsAfterLogin).toBe(true);
    
    console.log(`Successfully authenticated and verified user ${existingOidcUser.username} (${existingOidcUser.email})`);
  });
});
