import type { APIRequestContext } from '@playwright/test';
import { SYNAPSE_ADMIN_TOKEN, MATRIX_URL } from './config';

/**
 * Helper function to set account expiration using the Synapse admin API
 *
 * @param request - Playwright API request context
 * @param matrixId - Matrix user ID (e.g. @username:domain)
 * @param expirationTs - Expiration timestamp (in seconds since epoch)
 * @param enableRenewalEmails - Whether to send renewal emails
 * @returns Promise resolving to the API response
 */
export async function setAccountExpiration(
  request: APIRequestContext,
  localpart: string,
  expirationTs: number,
  enableRenewalEmails: boolean = true
): Promise<any> {
  
  const matrixId = createMxId(localpart);

  console.log(`[Synapse API] Setting expiration for user: ${matrixId} to timestamp: ${expirationTs}`);

  const response = await request.post(
    `${MATRIX_URL}/_synapse/client/email_account_validity/admin`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SYNAPSE_ADMIN_TOKEN}`,
      },
      data: {
        user_id: matrixId,
        expiration_ts: expirationTs,
        enable_renewal_emails: enableRenewalEmails,
      },
    }
  );

  if (!response.ok()) {
    const errorText = await response.text();
    console.error(
      `[Synapse API] Failed to set account expiration: ${response.status()} - ${errorText}`
    );
    throw new Error(`Failed to set account expiration: ${response.status()} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Synapse API] Account expiration set successfully: ${JSON.stringify(result)}`);
  return result;
}


/**
 * Helper function to get user account details using the Synapse admin API
 *
 * @param request - Playwright API request context
 * @param matrixId - Matrix user ID (e.g. @username:domain)
 * @returns Promise resolving to the user account details
 */
export async function getUserDetails(
  request: APIRequestContext,
  localpart: string
): Promise<any> {

  const matrixId = createMxId(localpart);

  const response = await request.get(
    `${MATRIX_URL}/_synapse/admin/v2/users/${encodeURIComponent(matrixId)}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SYNAPSE_ADMIN_TOKEN}`,
      },
    }
  );

  if (!response.ok()) {
    const errorText = await response.text();
    console.error(
      `[Synapse API] Failed to get user details: ${response.status()} - ${errorText}`
    );
    throw new Error(`Failed to get user details: ${response.status()} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Synapse API] User details retrieved: ${JSON.stringify(result)}`);
  return result;
}




/**
 * Helper function to extract the email threepid of a user from its Synapse account details
 *
 * @param userDetails - User account details as returned by getUserDetails()
 * @returns Promise resolving to the user's email address, or null if no email threepid is found
 */
export async function getUserThreepidEmail(userDetails: any): Promise<string | null> {
  console.log(`[Synapse API] Extracting threepid email for user: ${userDetails.name}`);
  const emailThreepid = userDetails.threepids?.find(
    (threepid: any) => threepid.medium === 'email'
  );
  if (!emailThreepid) {
    return null;
  }
  return emailThreepid.address;
}

export function createMxId(username:string) : string{
  return `@${username}:${MATRIX_URL.replace("https://matrix.", "")}`
}