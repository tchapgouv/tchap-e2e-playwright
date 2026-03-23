import { APIRequestContext } from '@playwright/test';
import { SYNAPSE_ADMIN_TOKEN, BASE_URL } from './config';

/**
 * Helper function to set account expiration using the Synapse admin API
 * 
 * @param request - Playwright API request context
 * @param userId - Matrix user ID (e.g. @username:domain)
 * @param expirationTs - Expiration timestamp (in seconds since epoch)
 * @param enableRenewalEmails - Whether to send renewal emails
 * @returns Promise resolving to the API response
 */
export async function setAccountExpiration(
  request: APIRequestContext,
  userId: string,
  expirationTs: number,
  enableRenewalEmails: boolean = true
): Promise<any> {
  console.log(`[Synapse API] Setting expiration for user: ${userId} to timestamp: ${expirationTs}`);
  
  const response = await request.post(
    `${BASE_URL}/_synapse/client/email_account_validity/admin`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SYNAPSE_ADMIN_TOKEN}`
      },
      data: {
        user_id: userId,
        expiration_ts: expirationTs,
        enable_renewal_emails: enableRenewalEmails
      }
    }
  );

  if (!response.ok()) {
    const errorText = await response.text();
    console.error(`[Synapse API] Failed to set account expiration: ${response.status()} - ${errorText}`);
    throw new Error(`Failed to set account expiration: ${response.status()} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Synapse API] Account expiration set successfully: ${JSON.stringify(result)}`);
  return result;
}