import { test, expect } from '@playwright/test';
import { BASE_URL, TEST_USER_PASSWORD } from '../../utils/config';
import { MatrixApi } from '../../utils/matrix-api';
import { createMasUserWithPassword, deactivateMasUser } from '../../utils/mas-admin';

export async function createDirectRoom(
  matrix: MatrixApi,
  name: string = 'Direct Room',
): Promise<string> {
  return matrix.createRoom({
    name,
    joinRule: 'private',
    preset: 'trusted_private_chat',
    visibility: 'private',
    encryption: false,
    accessRules: {
      rule: 'direct',
      force_unencrypted_at_creation: false,
      visibility: 'private',
    },
    is_direct:true
  });
}

test.describe('API - Direct Room', () => {
  let userId: string;
  let username: string;
  let roomId: string;
  let matrix: MatrixApi;

  test.beforeAll(async () => {
    username = `user.unenc.${Date.now()}`;
    userId = await createMasUserWithPassword(
      username,
      `${username}@test.local`,
      TEST_USER_PASSWORD,
    );

    matrix = new MatrixApi(BASE_URL);
    await matrix.login(username, TEST_USER_PASSWORD);
  });

  test('Should create direct room with correct properties', async () => {
    roomId = await createDirectRoom(matrix);
    expect(roomId).toBeDefined();

    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules).toBeDefined();
    expect(accessRules.rule).toBe('direct');
    expect(accessRules.force_unencrypted_at_creation).toBe(false);
    expect(accessRules.visibility).toBe('private');
    expect(await matrix.isRoomEncrypted(roomId)).toBe(true);
    expect(await matrix.getJoinRule(roomId)).toBe('private');
  });

  test.skip('Should return 403 error when changing joining rule to invite', async () => {
    roomId = await createDirectRoom(matrix);

    try {
      await matrix.sendStateEvent(
        roomId,
        'im.vector.room.access_rules',
        { rule: 'invite' },
      );
      throw new Error('Expected 403 error but request succeeded');
    } catch (error: any) {
      expect(error.status || error.statusCode).toBe(403);
    }
  });

  test.skip('Should return 403 error when changing access rules to unrestricted', async () => {
    roomId = await createDirectRoom(matrix);

    try {
      await matrix.sendStateEvent(
        roomId,
        'im.vector.room.access_rules',
        { rule: 'unrestricted' },
      );
      throw new Error('Expected 403 error but request succeeded');
    } catch (error: any) {
      expect(error.status || error.statusCode).toBe(403);
    }
  });

  test.skip('Should return 403 error when changing access rules to restricted', async () => {
    roomId = await createDirectRoom(matrix);

    try {
      await matrix.sendStateEvent(
        roomId,
        'im.vector.room.access_rules',
        { rule: 'restricted' },
      );
      throw new Error('Expected 403 error but request succeeded');
    } catch (error: any) {
      expect(error.status || error.statusCode).toBe(403);
    }
  });

  test.afterAll(async () => {
    await deactivateMasUser(userId);
  });
});
