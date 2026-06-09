import dotenv from 'dotenv';
import path from 'node:path';

// Determine which environment to use
export const env = process.env.ENV || 'local';
console.log(`Loading environment configuration for: ${env}`);

// Load environment variables from the appropriate .env file
dotenv.config({ path: path.resolve(__dirname, `../.env.${env}`) });

// Load environment variables from .env file
//dotenv.config();

// MAS URLs
export const MAS_URL = process.env.MAS_URL || '';
export const OTHER_MAS_URL = process.env.OTHER_MAS_URL || '';
export const EXTERNAL_MAS_URL = process.env.EXTERNAL_MAS_URL || '';


export const KEYCLOAK_URL = process.env.KEYCLOAK_URL || '';
export const ELEMENT_URL = process.env.ELEMENT_URL || '';

//SYNAPSE 
export const MATRIX_URL = process.env.MATRIX_URL || '';
export const OTHER_MATRIX_URL = process.env.OTHER_MATRIX_URL || '';
export const EXTERNAL_MATRIX_URL = process.env.EXTERNAL_MATRIX_URL || '';

export const MAIL_URL = process.env.MAIL_URL || '';
export const MAILPIT_USER = process.env.MAILPIT_USER || '';
export const MAILPIT_PWD = process.env.MAILPIT_PWD || '';

// Keycloak Admin Credentials
export const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || 'admin';
export const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
export const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'proconnect-mock';

// MAS Admin API Credentials
export const MAS_ADMIN_URL = process.env.MAS_ADMIN_URL || MAS_URL;
export const MAS_ADMIN_CLIENT_ID = process.env.MAS_ADMIN_CLIENT_ID || '';
export const MAS_ADMIN_CLIENT_SECRET = process.env.MAS_ADMIN_CLIENT_SECRET || '';

export const OTHER_MAS_ADMIN_URL = process.env.OTHER_MAS_ADMIN_URL || OTHER_MAS_URL;
export const OTHER_MAS_ADMIN_CLIENT_ID = process.env.OTHER_MAS_ADMIN_CLIENT_ID || '';
export const OTHER_MAS_ADMIN_SECRET = process.env.OTHER_MAS_ADMIN_SECRET || '';

export const EXTERNAL_MAS_ADMIN_URL = process.env.EXTERNAL_MAS_ADMIN_URL || EXTERNAL_MAS_URL;
export const EXTERNAL_MAS_ADMIN_CLIENT_ID = process.env.EXTERNAL_MAS_ADMIN_CLIENT_ID || '';
export const EXTERNAL_MAS_ADMIN_SECRET = process.env.EXTERNAL_MAS_ADMIN_SECRET || '';

// Test User Credentials
export const TEST_USER_PREFIX = process.env.TEST_USER_PREFIX || 'user.test';
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123456';

// Email domains for test users
export const STANDARD_EMAIL_DOMAIN = process.env.STANDARD_EMAIL_DOMAIN || '';
export const OTHER_EMAIL_DOMAIN = process.env.OTHER_EMAIL_DOMAIN || '';
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
