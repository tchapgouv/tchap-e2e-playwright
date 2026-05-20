import { test, expect } from '@playwright/test';
import { BASE_URL, TEST_USER_PASSWORD } from '../../utils/config';
import { MatrixApi } from '../../utils/matrix-api';
import { createMasUserWithPassword, deactivateMasUser } from '../../utils/mas-admin';
import { expectStateEventError } from './room-utils';

export async function createPublicRoom(
  matrix: MatrixApi,
  name: string = 'Public Room'
): Promise<string> {
  return matrix.createRoom({
    name,
    joinRule: 'public',
    preset: 'public_chat',
    visibility: 'public',
    accessRules: {
      rule: 'restricted',
      force_unencrypted_at_creation: false,
      visibility: 'public',
    },
  });
}

test.describe('API - Public Room', () => {
  let userId: string;
  let username: string;
  let roomId: string;
  let matrix: MatrixApi;

  test.beforeAll(async () => {
    username = `user.pub.${Date.now()}`;
    userId = await createMasUserWithPassword(
      username,
      `${username}@test.local`,
      TEST_USER_PASSWORD
    );

    matrix = new MatrixApi(BASE_URL);
    await matrix.login(username, TEST_USER_PASSWORD);
  });

  test('Should create public room with correct properties', async () => {
    roomId = await createPublicRoom(matrix);
    expect(roomId).toBeDefined();

    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules).toBeDefined();
    expect(accessRules.rule).toBe('restricted');
    expect(accessRules.force_unencrypted_at_creation).toBe(false);
    expect(accessRules.visibility).toBe('public');
    expect(await matrix.isRoomEncrypted(roomId)).toBe(false);
    expect(await matrix.getJoinRule(roomId)).toBe('public');
  });

  test('Should return 403 error when changing access rules to unrestricted', async () => {
    roomId = await createPublicRoom(matrix);

    await expectStateEventError(
      matrix,
      roomId,
      'im.vector.room.access_rules',
      { rule: 'unrestricted' },
      403
    );
  });

  test('Should return 403 error when changing encryption', async () => {
    roomId = await createPublicRoom(matrix);

    await expectStateEventError(matrix, roomId, 'm.room.encryption', {}, 403);
  });

  test.afterAll(async () => {
    await deactivateMasUser(userId);
  });
});
