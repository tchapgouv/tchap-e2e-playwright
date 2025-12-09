import { test, expect } from '../../fixtures/auth-fixture';
import { 
  verifyUserInMas, 
  performOidcLoginFromTchap
} from '../../utils/auth-helpers';
import { checkMasUserExistsByEmail, createMasUserWithPassword } from '../../utils/mas-admin';
import { SCREENSHOTS_DIR, TCHAP_LEGACY } from '../../utils/config';


//flaky on await expect(page.locator('text=Configuration')).toBeVisible({timeout: 20000});
test.describe('Tchap : Login via OIDC', () => {
  
  test('tchap match account by email', async ({ page, oidcUser: oidcUser }) => {
    const screenshot_path = test.info().title.replace(" ", "_");

    oidcUser.masId = await createMasUserWithPassword(oidcUser.username, oidcUser.email, oidcUser.password);

    // Verify the test user doesn't exist in MAS yet
    const existsBeforeLogin = await checkMasUserExistsByEmail(oidcUser.email);
    expect(existsBeforeLogin).toBe(true);
    
    // Perform the OIDC login flow
    await performOidcLoginFromTchap(page, oidcUser,screenshot_path, TCHAP_LEGACY);

    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/05-confirmation.png` });
    
    await page.locator('button[type="submit"]').filter({hasText:'Continuer'}).click();

    //flaky condition
    await expect(page.locator('text=Bienvenue')).toBeVisible({timeout: 20000});

    // Take a screenshot of the authenticated state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/06-auth-success.png` });
    
    // Verify the user was created in MAS
    await verifyUserInMas(oidcUser);
    
    // Double-check with the API
    const existsAfterLogin = await checkMasUserExistsByEmail(oidcUser.email);
    expect(existsAfterLogin).toBe(true);
    
    console.log(`Successfully authenticated and verified user ${oidcUser.username} (${oidcUser.email})`);
  });
});
