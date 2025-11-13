import { BrowserContext, Page } from '@playwright/test';
import { createKeycloakUser, deleteKeycloakUser } from './keycloak-admin';
import { waitForMasUser, createMasUserWithPassword, deactivateMasUser } from './mas-admin';
import { ELEMENT_URL, KEYCLOAK_URL, MAS_URL, SCREENSHOTS_DIR, TEST_USER_PASSWORD, TEST_USER_PREFIX } from './config';
import { Credentials } from './api';
import { ScreenCheckerFixture } from '../fixtures/auth-fixture';

/**
 * Test user type
 */
export interface TestUser {
  username: string;
  email: string;
  password: string;
  keycloakId?: string;
  masId?: string;
}

/**
 * Different type of user can be used
 */
export enum TypeUser {
  MAS_PASSWORD_USER,
  MAS_OIDC_USER,
  INVITED_USER,
  OIDC_USER,
}

/**
 * Create a test user in Keycloak
 */
export async function createKeycloakTestUser(user:TestUser): Promise<TestUser> {
  const keycloakId = await createKeycloakUser(user.username, user.email, user.password);
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
  await page.locator('#username').fill(user.username);
  await page.locator('#password').fill(user.password);
  
  // Click the login button
  await page.locator('button[type="submit"]').click();
  
  // Wait for redirect back to MAS
  await page.waitForURL(url => url.toString().includes(MAS_URL));
  
  // Take a screenshot after successful login
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/03-after-login.png` });
}

/**
 * Perform OIDC login starting from Element client
 */
export async function performOidcLoginFromTchap(page: Page, user: TestUser, screenshot_path: string, tchap_legacy:boolean=false): Promise<void> {

  //we go to the welcome and then to the login page because sometimes the email field disapears
  await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'networkidle' });

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/01-tchap-login-page.png` });
  
  await page.getByRole('link').filter({hasText : "Se connecter par email"}).click();

  await page.locator('input').fill(user.email);

  // Click on "Continuer" button
  await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

  // Wait for navigation to MAS
  await page.waitForURL(url => url.toString().includes(MAS_URL));
  
  // Take a screenshot of the MAS login page
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/02-mas-login-page.png` });
  
  // Find and click the OIDC provider button
  //const oidcButton = page.locator('a.cpd-button[href*="/upstream/authorize/"]');
  const oidcButton = page.locator('button.proconnect-button');

  await oidcButton.click();
  
  // Wait for navigation to Keycloak
  await page.waitForURL(url => url.toString().includes(KEYCLOAK_URL));
  
  // Take a screenshot of the Keycloak login page
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/03-keycloak-login.png` });
  
  // Fill in the username and password
  await page.locator('#username').fill(user.username);
  await page.locator('#password').fill(user.password);
  
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
  const masUser = await waitForMasUser(user.email);
  user.masId = masUser.id;
}

/**
 * Create a test user directly in MAS with password
 */
export async function createMasTestUser(domain:string): Promise<TestUser> {
  const user = generateTestUserData(domain);
  const masId = await createMasUserWithPassword(user.username, user.email, user.password);
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
  console.log(`[Auth] Performing password login for user: ${user.username}`);
  
  // Navigate to the login page
  await page.goto('/login');
  
  // Take a screenshot of the login page
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/01-password-login-page.png` });
  
  // Fill in the username and password
  await page.locator('input[name="username"]').fill(user.username);
  await page.locator('input[name="password"]').fill(user.password);
  
  // Take a screenshot before submitting
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/02-password-login-filled.png` });
  
  // Click the login button (submit the form)
  await page.locator('button[type="submit"]').click();
  
  // Wait for successful login (redirect to dashboard or home page)
  await page.waitForURL(url => !url.toString().includes('/login'));
  
  // Take a screenshot after successful login
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshot_path}/03-password-login-success.png` });
  
  console.log(`[Auth] Password login successful for user: ${user.username}`);
}



  // Add this function to extract the verification code
export async function extractVerificationCode(context: BrowserContext, waitForScreen:ScreenCheckerFixture): Promise<string> {
    // Create a new page for mail.tchapgouv.com
    const page = await context.newPage();

    // Navigate to mail.tchapgouv.com
    await page.goto('https://mail.tchapgouv.com');

    // Wait for the page to load and click on the first email
    await page.waitForSelector('.msglist-message');
    
    await waitForScreen(page, 'mail.tchapgouv.com');

    const firstIncompingMail = await page.locator('.col-md-5').first();

    let codeText = await firstIncompingMail.textContent();
    if (!codeText) {
      throw new Error('Unable to extract verification code');
    }
    console.log(codeText);
    codeText = codeText.trim();
    console.log(codeText);
    const codeMatch = codeText.match(/.*: (\d+)/);
    if (!codeMatch) {
      throw new Error('Unable to extract verification code from text');
    }
    const verificationCode = codeMatch[1];
    console.log("verification code extracted : ", verificationCode);

    return verificationCode;
}


/**
 * Same as performPasswordLogin but without the screenshots
 */
export async function performSimplePasswordLogin(
  page: Page,
  user: TestUser,
  screenshot_path: string
): Promise<void> {
  console.log(`[Auth] Performing password login for user: ${user.username}`);

  // Navigate to the login page
  await page.goto("/login");

  // Fill in the username and password
  await page.locator('input[name="username"]').fill(user.username);
  await page.locator('input[name="password"]').fill(user.password);

  // Click the login button (submit the form)
  await page.locator('button[type="submit"]').click();

  // Wait for successful login (redirect to dashboard or home page)
  await page.waitForURL((url) => !url.toString().includes("/login"));

  console.log(`[Auth] Password login successful for user: ${user.username}`);
}

// Generate a unique username and email for testing
export function generateTestUserData(domain:string) {
  const timestamp = new Date().getTime();
  const randomSuffix = Math.floor(Math.random() * 10000);
  const kc_username = `${TEST_USER_PREFIX}_${timestamp}_${randomSuffix}`;
  const kc_email = `${kc_username}@${domain}`;
  
  console.log("Using kc_email: ", kc_email);

  return {
    username: kc_username,
    email: kc_email,
    password: TEST_USER_PASSWORD
  };
}

// Generate a unique username and email for testing
export function generateExternTestUser() {
  const timestamp = new Date().getTime();
  const randomSuffix = Math.floor(Math.random() * 10000);
  const username = `${TEST_USER_PREFIX}_${timestamp}_${randomSuffix}`;
  const email = `${username}@tchapgouv.com`;
  
  console.log("Using email: ", email);


  return {
    username,
    email,
    password: TEST_USER_PASSWORD
  };
}


// Taken from element-mmodules
/** Adds an initScript to the given page which will populate localStorage appropriately so that Element will use the given credentials. */
export async function populateLocalStorageWithCredentials(page: Page, credentials: Credentials) {
  await page.addInitScript(
      ({ credentials }) => {
          window.localStorage.setItem("mx_hs_url", credentials.homeserverBaseUrl);
          window.localStorage.setItem("mx_user_id", credentials.userId);
          window.localStorage.setItem("mx_access_token", credentials.accessToken);
          window.localStorage.setItem("mx_device_id", credentials.deviceId);
          window.localStorage.setItem("mx_is_guest", "false");
          window.localStorage.setItem("mx_has_pickle_key", "false");
          window.localStorage.setItem("mx_has_access_token", "true");

          window.localStorage.setItem(
              "mx_local_settings",
              JSON.stringify({
                  // Retain any other settings which may have already been set
                  ...JSON.parse(window.localStorage.getItem("mx_local_settings") ?? "{}"),
                  // Ensure the language is set to a consistent value
                  language: "en",
              }),
          );
      },
      { credentials },
  );
}
