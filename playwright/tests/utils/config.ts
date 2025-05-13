import dotenv from 'dotenv';
import path from 'path';


// Determine which environment to use
const env = process.env.TEST_ENV || 'local';
console.log(`Loading environment configuration for: ${env}`);

// Load environment variables from the appropriate .env file
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

// Load environment variables from .env file
//dotenv.config();

// URLs
export const MAS_URL = process.env.MAS_URL || 'https://auth.tchapgouv.com';
export const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://sso.tchapgouv.com';
export const ELEMENT_URL = process.env.ELEMENT_URL || 'https://element.tchapgouv.com';

export const TCHAP_LEGACY:boolean = Boolean(process.env.TCHAP_LEGACY);

// Keycloak Admin Credentials
export const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || 'admin';
export const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
export const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'proconnect-mock';

// MAS Admin API Credentials
export const MAS_ADMIN_CLIENT_ID = process.env.MAS_ADMIN_CLIENT_ID || '01J44RKQYM4G3TNVANTMTDYTX6';
export const MAS_ADMIN_CLIENT_SECRET = process.env.MAS_ADMIN_CLIENT_SECRET || 'phoo8ahneir3ohY2eigh4xuu6Oodaewi';

// Test User Credentials
export const TEST_USER_PREFIX = process.env.TEST_USER_PREFIX || 'user.test';
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123456';

// Email domains for test users
export const STANDARD_EMAIL_DOMAIN = process.env.STANDARD_EMAIL_DOMAIN || 'tchapgouv.com';
export const INVITED_EMAIL_DOMAIN = process.env.INVITED_EMAIL_DOMAIN || 'invited.externe.com';
export const NOT_INVITED_EMAIL_DOMAIN = process.env.NOT_INVITED_EMAIL_DOMAIN || 'not.invited.externe.com';
export const WRONG_SERVER_EMAIL_DOMAIN = process.env.WRONG_SERVER_EMAIL_DOMAIN || 'wrong.server.com';
export const NUMERIQUE_EMAIL_DOMAIN = process.env.NUMERIQUE_EMAIL_DOMAIN || 'numerique.gouv.fr';

// Screenshots directory
export const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || 'playwright-results';

// Browser locale
export const BROWSER_LOCALE = process.env.BROWSER_LOCALE || 'fr-FR';

// Generate a unique username and email for testing
export function generateTestUser(domain:string) {
  const timestamp = new Date().getTime();
  const randomSuffix = Math.floor(Math.random() * 10000);
  const kc_username = `${TEST_USER_PREFIX}_${timestamp}_${randomSuffix}`;
  const kc_email = `${kc_username}@${domain}`;
  
  return {
    kc_username: kc_username,
    kc_email: kc_email,
    kc_password: TEST_USER_PASSWORD
  };
}

// Generate a unique username and email for testing
export function generateExternTestUser() {
  const timestamp = new Date().getTime();
  const randomSuffix = Math.floor(Math.random() * 10000);
  const username = `${TEST_USER_PREFIX}_${timestamp}_${randomSuffix}`;
  const email = `${username}@tchapgouv.com`;
  
  return {
    username,
    email,
    password: TEST_USER_PASSWORD
  };
}
