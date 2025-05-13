import { APIRequestContext, request } from '@playwright/test';
import { 
  MAS_URL, 
  MAS_ADMIN_CLIENT_ID, 
  MAS_ADMIN_CLIENT_SECRET 
} from './config';

// Create a reusable API request context
let apiContext: APIRequestContext | null = null;

async function getApiContext(): Promise<APIRequestContext> {
  if (!apiContext) {
    //console.log(`[MAS API] Creating new API context with baseURL: ${MAS_URL}`);
    apiContext = await request.newContext({
      baseURL: MAS_URL,
      ignoreHTTPSErrors: true
    });
  }
  return apiContext;
}

/**
 * Get an admin access token for MAS
 */
export async function getMasAdminToken(): Promise<string> {
  //console.log(`[MAS API] Requesting admin token with client ID: ${MAS_ADMIN_CLIENT_ID}`);
  const apiRequestContext = await getApiContext();
  const authHeader = Buffer.from(`${MAS_ADMIN_CLIENT_ID}:${MAS_ADMIN_CLIENT_SECRET}`).toString('base64');
  
  const response = await apiRequestContext.post('/oauth2/token', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authHeader}`
    },
    form: {
      grant_type: 'client_credentials',
      scope: 'urn:mas:admin'
    }
  });

  if (!response.ok()) {
    const errorText = await response.text();
    console.error(`[MAS API] Failed to get admin token: ${response.status()} - ${errorText}`);
    throw new Error(`Failed to get MAS admin token: ${response.status()} - ${errorText}`);
  }

  const data = await response.json() as { access_token: string };
  //console.log(`[MAS API] Successfully obtained admin token ${data.access_token}`);
  return data.access_token;
}

/**
 * Get user details from MAS by email
 */
export async function getMasUserByEmail(email: string): Promise<any | null> {
  //console.log(`[MAS API] Getting user details for email: ${email}`);
  const token = await getMasAdminToken();
  const apiRequestContext = await getApiContext();
  
  // Step 1: Get user ID from email
  const emailResponse = await apiRequestContext.get(
    `/api/admin/v1/user-emails?filter[email]=${encodeURIComponent(email)}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!emailResponse.ok()) {
    const errorText = await emailResponse.text();
    console.error(`[MAS API] Failed to get user email: ${emailResponse.status()} - ${errorText}`);
    throw new Error(`Failed to get MAS user email: ${emailResponse.status()} - ${errorText}`);
  }

  const emailResult = await emailResponse.json();
  if (emailResult.data.length === 0) {
    console.log(`[MAS API] No user found with email: ${email}`);
    return null;
  }

  // Extract user_id from the attributes
  const userId = emailResult.data[0].attributes.user_id;
  //console.log(`[MAS API] Found user ID: ${userId} for email: ${email}`);

  // Step 2: Get complete user details using the user ID
  const userResponse = await apiRequestContext.get(
    `/api/admin/v1/users/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!userResponse.ok()) {
    const errorText = await userResponse.text();
    console.error(`[MAS API] Failed to get user details: ${userResponse.status()} - ${errorText}`);
    throw new Error(`Failed to get MAS user details: ${userResponse.status()} - ${errorText}`);
  }

  const userResult = await userResponse.json();
  const user = userResult.data;
  
  //console.log(`[MAS API] User found: Yes`);
  console.log(`[MAS API] User found : ID: ${user.id}, Username: ${user.attributes.username || 'N/A'}`);
  
  return user;
}

/**
 * Check if a user exists in MAS by email
 */
export async function checkMasUserExistsByEmail(email: string): Promise<boolean> {
  console.log(`[MAS API] Checking if user exists with email: ${email}`);
  try {
    const user = await getMasUserByEmail(email);
    const exists = user !== null;
    //console.log(`[MAS API] User with email ${email} exists: ${exists}`);
    return exists;
  } catch (error) {
    console.error(`[MAS API] Error checking user existence: ${error}`);
    return false;
  }
}

/**
 * Wait for a user to be created in MAS
 * This is useful after OIDC authentication, as there might be a slight delay
 * before the user is fully created in MAS
 */
export async function waitForMasUser(email: string, maxAttempts = 10, delayMs = 1000): Promise<any> {
  console.log(`[MAS API] Waiting for user with email ${email} to be created (max ${maxAttempts} attempts)`);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`[MAS API] Attempt ${attempt + 1}/${maxAttempts} to find user`);
    try {
      const user = await getMasUserByEmail(email);
      if (user) {
        console.log(`[MAS API] User found on attempt ${attempt + 1}`);
        return user;
      }
      console.log(`[MAS API] User not found on attempt ${attempt + 1}, waiting ${delayMs}ms before next attempt`);
    } catch (error) {
      console.warn(`[MAS API] Attempt ${attempt + 1}/${maxAttempts} failed: ${error}`);
    }
    
    // Wait before the next attempt
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  const errorMsg = `User with email ${email} not found in MAS after ${maxAttempts} attempts`;
  console.error(`[MAS API] ${errorMsg}`);
  throw new Error(errorMsg);
}

/**
 * Create a user in MAS with a password
 */
export async function createMasUserWithPassword(username: string, email: string, password: string): Promise<string> {
  console.log(`[MAS API] Creating user with username:${username}, email:${email}, password:${password}`);
  const token = await getMasAdminToken();
  const apiRequestContext = await getApiContext();
  
  const response = await apiRequestContext.post('/api/admin/v1/users', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: {
      "username": username,
      "skip_homeserver_check": false
    }
  });
  
  if (!response.ok()) {
    const errorText = await response.text();
    console.error(`[MAS API] Failed to create user: ${response.status()} - ${errorText}`);
    throw new Error(`Failed to create MAS user: ${response.status()} - ${errorText}`);
  }

  const data = await response.json();
  //console.log(data.data)
  const userId = data.data.id;

  const responsePwd = await apiRequestContext.post(`/api/admin/v1/users/${userId}/set-password`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: {
      "password": password,
      "skip_password_check": true
    }
  });

  if (!responsePwd.ok()) {
    const errorText = await responsePwd.text();
    console.error(`[MAS API] Failed to set password for user: ${responsePwd.status()} - ${errorText}`);
    throw new Error(`Failed to set password for user: ${responsePwd.status()} - ${errorText}`);
  }

  const responseEmail = await apiRequestContext.post(`/api/admin/v1/user-emails`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: {
      "user_id": userId,
      "email": email
    }
  });

  if (!responseEmail.ok()) {
    const errorText = await responseEmail.text();
    console.error(`[MAS API] Failed to set email for user: ${responseEmail.status()} - ${errorText}`);
    throw new Error(`Failed to set email for user: ${responseEmail.status()} - ${errorText}`);
  }

  // Verify the user exists in MAS
  const existsBeforeLogin = await checkMasUserExistsByEmail(email);
  
  console.log(`[MAS API] User created successfully with ID: ${userId}`);
  return existsBeforeLogin ? userId : "error";
}

/**
 * Delete a user from MAS
 */
export async function deactivateMasUser(userId: string): Promise<void> {
  console.log(`[MAS API] Deleting user with ID: ${userId}`);
  const token = await getMasAdminToken();
  const apiRequestContext = await getApiContext();
  
  const response = await apiRequestContext.post(`/api/admin/v1/users/${userId}/deactivate`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok()) {
    const errorText = await response.text();
    console.error(`[MAS API] Failed to delete user: ${response.status()} - ${errorText}`);
    throw new Error(`Failed to delete MAS user: ${response.status()} - ${errorText}`);
  }
  
  console.log(`[MAS API] User deleted successfully`);
}

/**
 * Check if a oauth link exists
 */
export async function oauthLinkExistsByUserId(userId: string): Promise<boolean> {
  const token = await getMasAdminToken();
  const apiRequestContext = await getApiContext();
  
  const response = await apiRequestContext.get(`/api/admin/v1/upstream-oauth-links?filter[user]=${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok()) {
    const errorText = await response.text();
    console.error(`[MAS API] Failed to delete user: ${response.status()} - ${errorText}`);
    throw new Error(`Failed to delete MAS user: ${response.status()} - ${errorText}`);
  }
  const data = await response.json();
  //console.log(data.data)
  const links = data.data;
  console.log(`[MAS API] Oauth links for user ${userId} : ${JSON.stringify(links)}`);
  return links.length == 1
}

/**
 * Check if a oauth link exists
 */
export async function oauthLinkExistsBySubject(subject: string): Promise<boolean> {
  const token = await getMasAdminToken();
  const apiRequestContext = await getApiContext();
  
  const response = await apiRequestContext.get(`/api/admin/v1/upstream-oauth-links?filter[subject]=${subject}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok()) {
    const errorText = await response.text();
    console.error(`[MAS API] Failed to delete user: ${response.status()} - ${errorText}`);
    throw new Error(`Failed to delete MAS user: ${response.status()} - ${errorText}`);
  }
  const data = await response.json();
  //console.log(data.data)
  const links = data.data;
  console.log(`[MAS API] Oauth links for user ${subject} : ${JSON.stringify(links)}`);
  return links.length == 1
}

/**
 * Dispose the API context when done
 */
export async function disposeApiContext(): Promise<void> {
  if (apiContext) {
    //console.log(`[MAS API] Disposing API context`);
    await apiContext.dispose();
    apiContext = null;
    //console.log(`[MAS API] API context disposed`);
  } else {
    console.log(`[MAS API] No API context to dispose`);
  }
}
