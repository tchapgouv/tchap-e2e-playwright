import { expect } from '@playwright/test';
import { MatrixApi } from '../../utils/matrix-api';
import type { StateEvents } from 'matrix-js-sdk';
import { BASE_URL, STANDARD_EMAIL_DOMAIN, TEST_USER_PASSWORD } from '../../utils/config';
import { createMasUserWithPassword } from '../../utils/mas-admin';

/**
 * Helper function to login with a new user
 * Creates a new MAS user and returns the userId, username, and authenticated MatrixApi instance
 */
export async function loginWithNewUser(): Promise<{
  userId: string;
  username: string;
  matrix: MatrixApi;
}> {
  const username = `user.${Date.now()}`;
  const userId = await createMasUserWithPassword(
    username,
    `${username}@${STANDARD_EMAIL_DOMAIN}`,
    TEST_USER_PASSWORD
  );

  const matrix = new MatrixApi(BASE_URL);
  await matrix.login(username, TEST_USER_PASSWORD);

  return { userId, username, matrix };
}

/**
 * Helper function to test that sending a state event returns an error with the expected status code
 */
export async function expectErrorWhenSendStateEvent(
  matrix: MatrixApi,
  roomId: string,
  eventType: string,
  content: Record<string, any>,
  expectedStatus: number = 403
): Promise<void> {
  try {
    await matrix.sendStateEvent(roomId, eventType, content);
    throw new Error(`Expected ${expectedStatus} error but request succeeded`);
  } catch (error: any) {
    expect(error.httpStatus).toBe(expectedStatus);
  }
}
