import { test, expect } from '@playwright/test';
import { BASE_URL, TEST_USER_PASSWORD } from '../../utils/config';
import { MatrixApi } from '../../utils/matrix-api';
import { createMasUserWithPassword, deactivateMasUser } from '../../utils/mas-admin';
import { expectStateEventError } from './room-utils';

export async function createPrivateEncryptedRoom(
  matrix: MatrixApi,
  name: string = 'Private Room'
): Promise<string> {
  return matrix.createRoom({
    name,
    joinRule: 'private',
    preset: 'private_chat',
    visibility: 'private',
    accessRules: {
      rule: 'restricted',
      force_unencrypted_at_creation: false,
      visibility: 'private',
    },
  });
}

test.describe('API - Private Encrypted Room', () => {
  let userId: string;
  let username: string;
  let roomId: string;
  let matrix: MatrixApi;

  test.beforeAll(async () => {
    username = `user.enc.${Date.now()}`;
    userId = await createMasUserWithPassword(
      username,
      `${username}@test.local`,
      TEST_USER_PASSWORD
    );

    matrix = new MatrixApi(BASE_URL);
    await matrix.login(username, TEST_USER_PASSWORD);
  });

  test('Should create private encrypted room with correct properties', async () => {
    roomId = await createPrivateEncryptedRoom(matrix);
    expect(roomId).toBeDefined();

    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules).toBeDefined();
    expect(accessRules.rule).toBe('restricted');
    expect(accessRules.force_unencrypted_at_creation).toBe(false);
    expect(accessRules.visibility).toBe('private');

    expect(await matrix.isRoomEncrypted(roomId)).toBe(true);
    expect(await matrix.getJoinRule(roomId)).toBe('private');
  });

  test('Should modify joinRule between invite and private', async () => {
    roomId = await createPrivateEncryptedRoom(matrix);

    await matrix.sendStateEvent(roomId, 'm.room.join_rules', { join_rule: 'invite' });

    expect(await matrix.getJoinRule(roomId)).toBe('invite');

    await matrix.sendStateEvent(roomId, 'm.room.join_rules', { join_rule: 'private' });

    expect(await matrix.getJoinRule(roomId)).toBe('private');
  });

  test('Should change access rules from restricted to unrestricted', async () => {
    roomId = await createPrivateEncryptedRoom(matrix);

    await matrix.sendStateEvent(roomId, 'im.vector.room.access_rules', { rule: 'unrestricted' });

    expect((await matrix.getAccessRules(roomId)).rule).toBe('unrestricted');
  });

  test('Should return 403 error when changing access rules back to restricted', async () => {
    roomId = await createPrivateEncryptedRoom(matrix);

    await matrix.sendStateEvent(roomId, 'im.vector.room.access_rules', { rule: 'unrestricted' });
    expect((await matrix.getAccessRules(roomId)).rule).toBe('unrestricted');

    await expectStateEventError(
      matrix,
      roomId,
      'im.vector.room.access_rules',
      { rule: 'restricted' },
      403
    );
  });

  test.afterAll(async () => {
    await deactivateMasUser(userId);
  });
});
