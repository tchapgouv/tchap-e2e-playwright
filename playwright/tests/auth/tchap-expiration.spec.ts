import { test, expect } from '../../fixtures/auth-fixture';
import { 
  createMasTestUser,
  loginWithPassword,
  openRenewAccountEmail
} from '../../utils/auth-helpers';
import { getMasUserByEmail } from '../../utils/mas-admin';
import { STANDARD_EMAIL_DOMAIN } from '../../utils/config';
import { setAccountExpiration } from '../../utils/synapse-admin';

test.describe('Tchap : account expiration', () => {
  // Define the password for test users
  const PASSWORD = "Test123456sdksdfkljfs222!";

  test('should show expiration message when account is expired', async ({ 
    context,
    page,
    request,
    screenChecker: screen
  }) => {
    // Create a new user with password authentication
    const user = await createMasTestUser(STANDARD_EMAIL_DOMAIN);
    console.log(`Created test user: ${user.username} with email: ${user.email}`);
    
    // First, log in normally to verify the account works
    await loginWithPassword(page, user, screen);
    
    // Wait for successful login and navigation to home page
    await page.waitForSelector(".mx_MatrixChat", { timeout: 20000 });
    console.log('User successfully logged in');
    
    // Get the user's Matrix ID
    const masUser = await getMasUserByEmail(user.email);
    const matrixId = `@${masUser.attributes.username}:dev01.tchap.incubateur.net`;
    console.log(`User Matrix ID: ${matrixId}`);
    
    // Set an expiration timestamp in the past to make the account expired
    const expirationTs = Math.floor(Date.now()) - 3600000; // 1 hour in the past
    console.log(`Setting expiration timestamp to: ${expirationTs} (1 hour in the past)`);
    
    // Call the Synapse API to set account expiration
    await setAccountExpiration(request, matrixId, expirationTs, true);
    
    await page.getByLabel('Avatar').click();
    //await screenChecker(page, `/`)
    await page.getByRole('button', { name: 'Se déconnecter' }).click();

    // Wait a moment for the expiration to take effect
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  
    // Try to log in again with the expired account
    await loginWithPassword(page, user, screen);
    
    // Verify that an expiration message is shown
    await expect(page.getByText('Une erreur s’est produite')).toBeVisible();
    
    console.log('Verified that the expired account shows expiration message');
    
    // Clean up
    await page.close();
  });


   test('should show expiration message inside app when account is expired', async ({ 
    context,
    page,
    request,
    screenChecker: screen
  }) => {

    test.setTimeout(180_000);

    // Create a new user with password authentication
    const user = await createMasTestUser(STANDARD_EMAIL_DOMAIN);
    console.log(`Created test user: ${user.username} with email: ${user.email}`);
    
    // First, log in normally to verify the account works
    await loginWithPassword(page, user, screen);
    
    // Wait for successful login and navigation to home page
    await page.waitForSelector(".mx_MatrixChat", { timeout: 20000 });
    console.log('User successfully logged in');
    
    // Get the user's Matrix ID
    const masUser = await getMasUserByEmail(user.email);
    const matrixId = `@${masUser.attributes.username}:dev01.tchap.incubateur.net`;
    console.log(`User Matrix ID: ${matrixId}`);
    
    // Set an expiration timestamp in the past to make the account expired
    const expirationTs = Math.floor(Date.now()) - 3600000; // 1 hour in the past
    console.log(`Setting expiration timestamp to: ${expirationTs} (1 hour in the past)`);
    
    // Call the Synapse API to set account expiration
    await setAccountExpiration(request, matrixId, expirationTs, true);
    
    //trigger the expiration panel by searching a forum
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Rejoindre un forum', exact: true }).click();
    await page.getByRole('textbox', { name: 'Rechercher' }).fill("any");

    await expect(page.getByRole('heading', { name: 'Votre compte Tchap a expiré' })).toBeVisible({timeout:20000});

    console.log(`Account has been expired`);

    await page.getByRole('button', { name: 'Envoyer un nouvel email' }).click();
    await expect(page.getByText('Un nouvel email de renouvellement vous a été adressé')).toBeVisible();
    await page.getByRole('button', { name: 'Envoyer un nouvel email' }).click();
    await expect(page.getByText('Attendez')).toBeVisible();

    await openRenewAccountEmail(context, screen, user.email);

    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('heading', { name: 'Votre compte Tchap a été' })).toBeVisible();
    await page.getByRole('button', { name: 'Rafraîchir la page' }).click();

    await page.waitForSelector(".mx_MatrixChat", { timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Votre compte Tchap a été' })).not.toBeVisible();


  });

});