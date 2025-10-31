import { test, expect } from '../../fixtures/auth-fixture';
import { SCREENSHOTS_DIR, ELEMENT_URL, MAS_URL } from '../../utils/config';


test.describe('Register', () => {

  test('without oauth2 session', async ({ context, page, simpleUser: user, screenChecker: screen }) => {
    
    await page.goto('/register');
    await page.getByRole('button').filter({ hasText: 'Continuer avec une adresse mail' }).click();
    
    //form is not submitted because no oauth2_authorization_grant 
    await screen(page, '/register/password');
    await expect(page.locator("h1", {hasText:"Unexpected error"})).toBeVisible();
    await expect(page.locator("p", {hasText:"Veuillez fermer cette fenêtre et relancer la création de compte depuis votre appareil Tchap"})).toBeVisible();

  });
});
