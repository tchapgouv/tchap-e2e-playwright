import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { BROWSER_LOCALE } from './utils/config';

// Load environment variables from .env file
dotenv.config();

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Maximum time one test can run for */
  timeout: 10 * 1000,
  /* Run tests in files in parallel */
  fullyParallel: process.env.TEST_IN_PARALLEL === 'true' ? true : false,

  /* Define how many workers */
  // Limit the number of workers on CI, use default locally
  workers: process.env.CI ? 2 : 1,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  retries: process.env.CI ? 2 : 2,
  /* Reporter to use */
  reporter: 'html',
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.MAS_URL || 'https://auth.tchapgouv.com',
    
    /* Set locale to French */
    locale: BROWSER_LOCALE,
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'on-first-retry',
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
  },
  
  /* Configure projects for major browsers */
  projects: [
   /* e2e tests do not work well on firefox nor webkit (bit flaky)
     {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Edge'] },
    },
    */ 
     {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      },
      
    
  ],
});
