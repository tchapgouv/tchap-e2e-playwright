import { MailpitClient } from 'mailpit-api';
import { expect } from '@playwright/test';
import { MAILPIT_URL, MAILPIT_USERNAME, MAILPIT_PASSWORD } from './config';


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

/**
 * Get the most recent verification code from Mailpit for a specific recipient
 * @param toEmail - The recipient email address to filter messages
 * @returns The verification code from the most recent email
 */
export async function getLatestVerificationCode(toEmail: string): Promise<string> {
  try {
    // Initialize Mailpit client with optional BASIC auth
    const mailpitAuth = MAILPIT_USERNAME && MAILPIT_PASSWORD 
      ? { username: MAILPIT_USERNAME, password: MAILPIT_PASSWORD }
      : undefined;
    const mailpit = new MailpitClient(MAILPIT_URL, mailpitAuth);
    console.log("mailpit url", MAILPIT_URL);

    const info = await mailpit.getInfo();
    console.log("mailpit info", info);

    // Wait for email to arrive (10 retries with 1 second interval)
    await expect.poll(async () => {
      const messages = await mailpit.searchMessages({
        query: `to:${toEmail}`,
        start: 0,
        limit: 1,
      });
      return messages.messages?.length ?? 0;
    }, {
      message: `No emails found for recipient: ${toEmail} after waiting`,
      timeout: 20000,      // 10 seconds total
      intervals: [1000],   // 1 second between each attempt
    }).toBeGreaterThan(0);

    // Get the messages again after polling confirms they exist
    const messages = await mailpit.searchMessages({
      query: `to:${toEmail}`,
      start: 0,
      limit: 1,
    });

    const latestMessage = messages.messages![0];
    console.log(`[Mailpit] Found email for ${toEmail}: ${latestMessage.Subject} (ID: ${latestMessage.ID})`);

    // Get the full message content
    const message = await mailpit.getMessageSummary(latestMessage.ID);

    // Try to extract code from text content first, fallback to HTML
    let content = message.Text || message.HTML || '';
    
    if (!content) {
      throw new Error('Email content is empty');
    }

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

/**
 * Get the password reset link from the most recent email for a specific recipient
 * @param toEmail - The recipient email address to filter messages
 * @returns The password reset URL from the most recent email
 */
export async function getPasswordResetLink(toEmail: string): Promise<string> {
  try {
    // Initialize Mailpit client with optional BASIC auth
    const mailpitAuth = MAILPIT_USERNAME && MAILPIT_PASSWORD 
      ? { username: MAILPIT_USERNAME, password: MAILPIT_PASSWORD }
      : undefined;
    const mailpit = new MailpitClient(MAILPIT_URL, mailpitAuth);
    await mailpit.getInfo();

    // Wait for email to arrive (10 retries with 1 second interval)
    await expect.poll(async () => {
      const messages = await mailpit.searchMessages({
        query: `to:${toEmail}`,
        start: 0,
        limit: 1,
      });
      return messages.messages?.length ?? 0;
    }, {
      message: `No emails found for recipient: ${toEmail} after waiting`,
      timeout: 20000,      // 10 seconds total
      intervals: [1000],   // 1 second between each attempt
    }).toBeGreaterThan(0);

    // Get the messages again after polling confirms they exist
    const messages = await mailpit.searchMessages({
      query: `to:${toEmail}`,
      start: 0,
      limit: 1,
    });

    const latestMessage = messages.messages![0];
    console.log(`[Mailpit] Found password reset email for ${toEmail}: ${latestMessage.Subject} (ID: ${latestMessage.ID})`);

    // Get the full message content
    const message = await mailpit.getMessageSummary(latestMessage.ID);
    let content = message.Text;
    
    if (!content) {
      throw new Error('Email content is empty');
    }

    console.log('[Mailpit] Email content preview:', content.substring(0, 300));

    const resetLink = extractResetLinkFromContent(content);
    console.log(`[Mailpit] Extracted password reset link: ${resetLink}`);

    return resetLink;
  } catch (error) {
    console.error('[Mailpit] Error fetching password reset link:', error);
    throw error;
  }
}