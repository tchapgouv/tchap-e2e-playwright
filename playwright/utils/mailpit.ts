import { MailpitClient } from 'mailpit-api';
import { MAIL_URL, MAILPIT_PWD, MAILPIT_USER } from './config';


/**
 * Extract verification code from email content
 * @param content - The email content (text or HTML)
 * @returns The extracted verification code
 */
function extractCodeFromContent(content: string): string {
  // Match pattern like "Code: 123456" or similar
  const codeMatch = content.match(/.*:\s*(\d+)/);
  if (!codeMatch) {
    throw new Error('Unable to extract verification code from email content');
  }
  return codeMatch[1];
}

export async function getMailpitClient(){
  const mailpit = await new MailpitClient(MAIL_URL, MAILPIT_USER != "" ? {username: MAILPIT_USER, password : MAILPIT_PWD} : undefined);
  await mailpit.getInfo();
  return mailpit;
}


/**
 * Get the most recent verification code from Mailpit for a specific recipient
 * @param toEmail - The recipient email address to filter messages
 * @returns The verification code from the most recent email
 */
export async function getLatestVerificationCode(toEmail: string): Promise<string> {
  try {

    const {message, content} = await waitForMessage(toEmail , 20000, "Votre code de vérification est");

    console.log('[Mailpit] Email content preview:', content.substring(0, 200));

    const verificationCode = extractCodeFromContent(content);
    console.log(`[Mailpit] Extracted verification code: ${verificationCode}`);

    return verificationCode;
  } catch (error) {
    console.error('[Mailpit] Error fetching verification code:', error);
    throw error;
  }
}

/**
 * Extract password reset link from email content
 * @param content - The email content (text or HTML)
 * @returns The extracted password reset URL
 */
function extractResetLinkFromContent(content: string): string {
  // Match URLs that contain password/recovery or similar patterns
  // Look for full URLs in the email
  console.log(content);

  const urlMatch = content.match(/(https?:\/\/[^\s<>"]+(?:account\/password\/recovery)[^\s<>"]*)/i);
  if (!urlMatch) {
    throw new Error('Unable to extract password reset link from email content');
  }
  return urlMatch[1];
}


function extractResetLinkLegacyFromContent(content: string): string {
  // Match URLs that contain password/recovery or similar patterns
  // Look for full URLs in the email
  console.log(content);

  const urlMatch = content.match(/(https?:\/\/[^\s<>"]+(?:password_reset)[^\s<>"]*)/i);
  if (!urlMatch) {
    throw new Error('Unable to extract password reset link from email content');
  }
  return urlMatch[1];
}

export async function getPasswordResetLinkLegacy(toEmail: string): Promise<string> {
  try {

    const {message, content} = await waitForMessage(toEmail , 30000, "Changement de mot de passe");

    console.log('[Mailpit] Email content preview:', content.substring(0, 300));

    const resetLink = extractResetLinkLegacyFromContent(content);
    console.log(`[Mailpit] Extracted password reset link: ${resetLink}`);

    return resetLink;
  } catch (error) {
    console.error('[Mailpit] Error fetching password reset link:', error);
    throw error;
  }
}

export async function getPasswordResetLink(toEmail: string): Promise<string> {
  try {

    const {message, content} = await waitForMessage(toEmail , 20000, "Réinitialisez le mot de passe");

    console.log('[Mailpit] Email content preview:', content.substring(0, 300));

    const resetLink = extractResetLinkFromContent(content);
    console.log(`[Mailpit] Extracted password reset link: ${resetLink}`);

    return resetLink;
  } catch (error) {
    console.error('[Mailpit] Error fetching password reset link:', error);
    throw error;
  }
}

/**
 * Get the password reset link from the most recent email for a specific recipient
 * @param toEmail - The recipient email address to filter messages
 * @returns The password reset URL from the most recent email
 */
export async function getCreateAccountLegacyLink(toEmail: string): Promise<string> {
  try {
    const {message, content} = await waitForMessage(toEmail , 25000, "Vérifiez votre adresse email");

    const resetLink = extractCreateAccountLegacyLink(content);
    console.log(`[Mailpit] Extracted password reset link: ${resetLink}`);

    return resetLink;
  } catch (error) {
    console.error('[Mailpit] Error fetching password reset link:', error);
    throw error;
  }
}

function extractCreateAccountLegacyLink(content: string): string {
  // Match URLs that contain password/recovery or similar patterns
  // Look for full URLs in the email
  console.log(content);

  const urlMatch = content.match(/(https?:\/\/[^\s<>"]+(?:email\/submit_token)[^\s<>"]*)/i);
  if (!urlMatch) {
    throw new Error('Unable to extract Create Account Legacy Link from email content');
  }
  return urlMatch[1];
}


/**
 * Search for messages and get content with retry
 */
export async function waitForMessage(toEmail: string, maxWaitTimeMs = 10000, subject:string): Promise<{message: any, content: string}> {

  const mailpit = await getMailpitClient();

  const startTime = Date.now();
  let retryCount = 0;
  const retryDelay = 1000; // 1 second delay

  while (Date.now() - startTime < maxWaitTimeMs) {
    try {
      const messages = await mailpit.searchMessages({
        query: `to:${toEmail} subject:${subject}`,
        start: 0,
        limit: 1,
      });

      if (messages.messages && messages.messages.length > 0) {
        const latestMessage = messages.messages[0];
        console.log(`[Mailpit] Found email for ${toEmail}: ${latestMessage.Subject} (ID: ${latestMessage.ID})`);
        
        // Get the full message content
        const message = await mailpit.getMessageSummary(latestMessage.ID);
        let content = message.Text;
        
        if (!content) {
          throw new Error('Email content is empty');
        }

        console.log('[Mailpit] Email content preview:', content.substring(0, 300));
        
        return { message, content };
      }

      // No message found, retry
      retryCount++;
      console.log(`[Mailpit] Waiting for emails found for ${toEmail} with subject ${subject} , retrying... (${retryCount})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    } catch (error) {
      // Error occurred, retry
      retryCount++;
      console.log(`[Mailpit] Error searching for emails:`, error);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // Max time reached without success
  throw new Error(`No emails found for ${toEmail} after ${maxWaitTimeMs}ms`);
}