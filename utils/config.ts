import dotenv from 'dotenv';
import path from 'node:path';


// URLs
export const MAS_URL = process.env.MAS_URL || '';
export const KEYCLOAK_URL = process.env.KEYCLOAK_URL || '';
export const ELEMENT_URL = process.env.ELEMENT_URL || '';
export const BASE_URL = process.env.BASE_URL || '';
export const MAIL_URL = process.env.MAIL_URL || '';

export const MAILPIT_USER = process.env.MAILPIT_USER || '';
export const MAILPIT_PWD = process.env.MAILPIT_PWD || '';

// Keycloak Admin Credentials
export const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || 'admin';
export const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
export const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'proconnect-mock';

// MAS Admin API Credentials
export const MAS_ADMIN_CLIENT_ID = process.env.MAS_ADMIN_CLIENT_ID || '01J44RKQYM4G3TNVANTMTDYTX6';
export const MAS_ADMIN_CLIENT_SECRET =
  process.env.MAS_ADMIN_CLIENT_SECRET || 'phoo8ahneir3ohY2eigh4xuu6Oodaewi';

// Test User Credentials
export const TEST_USER_PREFIX = process.env.TEST_USER_PREFIX || 'user.test';
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123456';

// Email domains for test users
export const STANDARD_EMAIL_DOMAIN = process.env.STANDARD_EMAIL_DOMAIN || '';
export const INVITED_EMAIL_DOMAIN = process.env.INVITED_EMAIL_DOMAIN || '';
export const NOT_INVITED_EMAIL_DOMAIN = process.env.NOT_INVITED_EMAIL_DOMAIN || '';
export const WRONG_SERVER_EMAIL_DOMAIN = process.env.WRONG_SERVER_EMAIL_DOMAIN || '';
export const NUMERIQUE_EMAIL_DOMAIN = process.env.NUMERIQUE_EMAIL_DOMAIN || '';

// Screenshots directory
export const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || 'playwright-results';

// Browser locale
export const BROWSER_LOCALE = process.env.BROWSER_LOCALE || 'fr-FR';

export const USE_MAS = process.env.USE_MAS === 'true' || false;

// TODO Move all below to env file
// Fixed tests data, that can be used across environement
export const FIX_USER_USERNAME = 'Michelle_test';
export const FIX_USER_PASSWORD = 'Michelle1313!';
export const FIX_USER_EMAIL = 'Michelle1313!';

export const SYNAPSE_ADMIN_TOKEN = process.env.SYNAPSE_ADMIN_TOKEN || '';
