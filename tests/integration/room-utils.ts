import { expect } from '@playwright/test';
import type { MatrixApi } from '../../utils/matrix-api';

/**
 * Helper function to test that sending a state event returns an error with the expected status code
 */
export async function expectStateEventError(
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
