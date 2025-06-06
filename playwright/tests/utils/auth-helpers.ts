import { Page } from '@playwright/test';
import { createKeycloakUser, deleteKeycloakUser } from './keycloak-admin';
import { waitForMasUser, createMasUserWithPassword, deactivateMasUser } from './mas-admin';
import { ELEMENT_URL, generateTestUser, KEYCLOAK_URL, MAS_URL, SCREENSHOTS_DIR } from './config';

/**
 * Test user type
 */
export interface TestUser {
  kc_username: string;
  kc_email: string;
  kc_password: string;
  keycloakId?: string;
  masId?: string;
}

/**
 * Create a test user in Keycloak
 */
export async function createKeycloakTestUser(user:TestUser): Promise<TestUser> {
  const keycloakId = await createKeycloakUser(user.kc_username, user.kc_email, user.kc_password);
  return { ...user, keycloakId };
}

/**
 * Clean up a test user
 */
export async function cleanupKeycloakTestUser(user: TestUser): Promise<void> {
  if (user.keycloakId) {
    await deleteKeycloakUser(user.keycloakId);
  }
}

/**
 * Perform OIDC login via Keycloak
 * This function handles the entire authentication flow:
 * 1. Navigate to MAS login page
 * 2. Click on the OIDC provider button
 * 3. Fill in credentials on the Keycloak login page
 * 4. Wait for successful authentication and redirect back to MAS
 */
export async function performOidcLogin(page: Page, user: TestUser, screenshot_path:string): Promise<void> {
  // Navigate to the login page
  await page.goto('/login');
  
  // Take a screenshot of the login page
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/01-login-page.png` });
  
  // Find and click the OIDC provider button (adjust the selector as needed)
  // This is based on the login.html template which shows provider buttons
  //const oidcButton = page.locator('a.cpd-button[href*="/upstream/authorize/"]');
  //catch proconnect button with class proconnect-button
  const oidcButton = page.locator('button.proconnect-button');
  await oidcButton.click();
  
  // Wait for navigation to Keycloak
  await page.waitForURL(url => url.toString().includes(KEYCLOAK_URL));
  
  // Take a screenshot of the Keycloak login page
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/02-keycloak-login.png` });
  
  // Fill in the username and password
  await page.locator('#username').fill(user.kc_username);
  await page.locator('#password').fill(user.kc_password);
  
  // Click the login button
  await page.locator('button[type="submit"]').click();
  
  // Wait for redirect back to MAS
  await page.waitForURL(url => url.toString().includes(MAS_URL));
  
  // Take a screenshot after successful login
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/03-after-login.png` });
}

/**
 * Perform OIDC login starting from Element client
 * This function handles the entire authentication flow:
 * 1. Navigate to Element login page
 * 2. Click on "Continuer" button
 * 3. Get redirected to MAS login page
 * 4. Continue with the standard OIDC flow
 */
export async function performOidcLoginFromElement(page: Page, user: TestUser, screenshot_path: string, tchap_legacy:boolean=false): Promise<void> {
  // Navigate to Element login page
  await page.goto(`${ELEMENT_URL}/#/login`);
  
  // Take a screenshot of the Element login page
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/01-element-login-page.png` });
  
  if(tchap_legacy){
    // Click on "Continuer" button
    await page.getByRole('button').filter({ hasText: 'Créez un compte' }).click();
  }else{
    // Click on "Continuer" button
    await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
  }

  // Wait for navigation to MAS
  await page.waitForURL(url => url.toString().includes(MAS_URL));
  
  // Take a screenshot of the MAS login page
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/02-mas-login-page.png` });
  
  // Find and click the OIDC provider button
  const oidcButton = page.locator('a.cpd-button[href*="/upstream/authorize/"]');
  await oidcButton.click();
  
  // Wait for navigation to Keycloak
  await page.waitForURL(url => url.toString().includes(KEYCLOAK_URL));
  
  // Take a screenshot of the Keycloak login page
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/03-keycloak-login.png` });
  
  // Fill in the username and password
  await page.locator('#username').fill(user.kc_username);
  await page.locator('#password').fill(user.kc_password);
  
  // Click the login button
  await page.locator('button[type="submit"]').click();
  
  // Wait for redirect back to MAS
  await page.waitForURL(url => url.toString().includes(MAS_URL));
  
  // Take a screenshot after successful login
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/04-after-login.png` });
}


/**
 * Verify that a user was created in MAS after OIDC authentication
 */
export async function verifyUserInMas(user: TestUser): Promise<void> {
  const masUser = await waitForMasUser(user.kc_email);
  user.masId = masUser.id;
}

/**
 * Create a test user directly in MAS with password
 */
export async function createMasTestUser(domain:string): Promise<TestUser> {
  const user = generateTestUser(domain);
  const masId = await createMasUserWithPassword(user.kc_username, user.kc_email, user.kc_password);
  return { ...user, masId };
}

/**
 * Clean up a MAS test user
 */
export async function cleanupMasTestUser(user: TestUser): Promise<void> {
  if (user.masId) {
    await deactivateMasUser(user.masId);
  }
}

/**
 * Perform password login to MAS
 * This function handles the direct authentication flow:
 * 1. Navigate to MAS login page
 * 2. Fill in username and password
 * 3. Submit the form
 * 4. Wait for successful authentication
 */
export async function performPasswordLogin(page: Page, user: TestUser, screenshot_path:string): Promise<void> {
  console.log(`[Auth] Performing password login for user: ${user.kc_username}`);
  
  // Navigate to the login page
  await page.goto('/login');
  
  // Take a screenshot of the login page
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/01-password-login-page.png` });
  
  // Fill in the username and password
  await page.locator('input[name="username"]').fill(user.kc_username);
  await page.locator('input[name="password"]').fill(user.kc_password);
  
  // Take a screenshot before submitting
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/02-password-login-filled.png` });
  
  // Click the login button (submit the form)
  await page.locator('button[type="submit"]').click();
  
  // Wait for successful login (redirect to dashboard or home page)
  await page.waitForURL(url => !url.toString().includes('/login'));
  
  // Take a screenshot after successful login
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/03-password-login-success.png` });
  
  console.log(`[Auth] Password login successful for user: ${user.kc_username}`);
}
