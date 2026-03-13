import { test, expect } from '@playwright/test';
import { BASE_URL, MAS_URL } from '../../../utils/config';

test.describe('Tchap : Legacy SSO Flow', () => {
  
  test('verify legacy SSO redirect chain for registration', async ({ request }) => {
    // The initial legacy SSO URL
    const email = 'user@exemple.com';
    const initialUrl = `${BASE_URL}/_matrix/client/r0/login/sso/redirect?redirectUrl=tchap%3A%2F%2Fconnect&org.matrix.msc3824.action=REGISTER&login_hint=${encodeURIComponent(email)}`;
    //login_hint is not taken into account in MAS for compat-sso flow

    console.log(`[Legacy SSO] Step 1: Calling initial URL: ${initialUrl}`);
    
    // Step 1: Call the initial URL without following redirects
    const response1 = await request.get(initialUrl, {
      maxRedirects: 0,
    });
    
    console.log(`[Legacy SSO] Response 1 status: ${response1.status()}`);
    expect(response1.status()).toEqual(303);
    
    // Get the first redirect location (should be complete-compat-sso)
    const completeCompatSsoUrl = response1.headers()['location'];
    expect(completeCompatSsoUrl).toBeTruthy();
    console.log(`[Legacy SSO] First redirect to: ${completeCompatSsoUrl}`);

    // Verify this is the complete-compat-sso URL with correct parameters
    expect(completeCompatSsoUrl).toContain(`${MAS_URL}/complete-compat-sso/`);
    expect(completeCompatSsoUrl).toContain('action=register');
    expect(completeCompatSsoUrl).toContain('org.matrix.msc3824.action=register');
        
    // Step 2: Follow the first redirect to complete-compat-sso
    console.log(`[Legacy SSO] Step 2: Following redirect to complete-compat-sso`);
    const response2 = await request.get(completeCompatSsoUrl!, {
      maxRedirects: 0,
    });
    console.log(`[Legacy SSO] Response 2 status: ${response2.status()}`);
    expect(response2.status()).toEqual(303);

    // Get the second redirect location (should be register page)
    const registerUrl = response2.headers()['location'];
    expect(registerUrl).toBeTruthy();
    console.log(`[Legacy SSO] Second redirect to: ${registerUrl}`);
    
    // Verify this is the register URL with correct parameters
    expect(registerUrl).toContain(`/register`);
    expect(registerUrl).toContain('kind=continue_compat_sso_login');

    console.log(`[Legacy SSO] Successfully verified the complete redirect chain`);
  });
});
