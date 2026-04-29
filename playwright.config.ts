import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { BROWSER_LOCALE } from "./utils/config";
import path from "path";

// Determine which environment to use
const env = process.env.ENV || "local";
console.log(`Loading environment configuration for: ${env}`);

// Load environment variables from the appropriate .env file
dotenv.config({ path: path.resolve(__dirname, `.env.${env}`) });

console.log("[playwright conf] process.env", process.env);
/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests",
  /* Maximum time one test can run for */
  timeout: 15 * 1000,
  /* Run tests in files in parallel */
  fullyParallel: process.env.TEST_IN_PARALLEL === "true",

  /* Define how many workers */
  // Limit the number of workers on CI, use default locally
  workers: process.env.CI ? 2 : 1,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 2,
  /* Reporter to use */
  reporter: "html",
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.MAS_URL || "https://auth.tchapgouv.com",

    /* Set locale to French */
    locale: BROWSER_LOCALE,

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "on-first-retry",

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

    /* when using archlinux to use ui testing, bundled browser are not correctly installed
     Directly use the installed chromium
         {
      name: "chromium",
      use: { ...devices["Desktop Chrome"],
              launchOptions: {
                executablePath: "/usr/bin/chromium",
              },
      },
    },
      },

    */
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
