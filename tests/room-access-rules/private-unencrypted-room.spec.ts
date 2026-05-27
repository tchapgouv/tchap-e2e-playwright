import { test, expect } from '@playwright/test';
import { BASE_URL, TEST_USER_PASSWORD } from '../../utils/config';
import type { MatrixApi } from '../../utils/matrix-api';
import { createMasUserWithPassword, deactivateMasUser } from '../../utils/mas-admin';
import { expectErrorWhenSendStateEvent, loginWithNewUser } from './room-utils';
import { EventType, JoinRule } from 'matrix-js-sdk';

export async function createPrivateUnencryptedRoom(
  matrix: MatrixApi,
  name: string = 'Private Unencrypted Room'
): Promise<string> {
  return matrix.createRoom({
    name,
    joinRule: 'invite',
    preset: 'private_chat',
    visibility: 'private',
    encryption: false,
    accessRules: {
      rule: 'restricted',
      force_unencrypted_at_creation: true,
      visibility: 'private',
    },
  });
}

test.describe('API - Private Unencrypted Room', () => {
  let matrix: MatrixApi;
  let userId: string;

  test.beforeAll(async () => {
    const userData = await loginWithNewUser();
    userId = userData.userId;
    matrix = userData.matrix;
  });

  test('Should create private unencrypted room with correct properties', async () => {
    const roomId = await createPrivateUnencryptedRoom(matrix);
    expect(roomId).toBeDefined();

    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules).toBeDefined();
    expect(accessRules.rule).toBe('restricted');
    expect(accessRules.force_unencrypted_at_creation).toBe(true);
    expect(accessRules.visibility).toBe('private');

    expect(await matrix.isRoomEncrypted(roomId)).toBe(false);
    expect(await matrix.getJoinRule(roomId)).toBe('invite');
  });

  test('Should modify joinRule between invite and public', async () => {
    const roomId = await createPrivateUnencryptedRoom(matrix);

    await matrix.sendStateEvent(roomId, EventType.RoomJoinRules, { join_rule: JoinRule.Public });

    expect(await matrix.getJoinRule(roomId)).toBe('public');

    await matrix.sendStateEvent(roomId, EventType.RoomJoinRules, { join_rule: JoinRule.Invite });

    expect(await matrix.getJoinRule(roomId)).toBe('invite');
  });

  test('Should change access rules from restricted to unrestricted', async () => {
    const roomId = await createPrivateUnencryptedRoom(matrix);

    await matrix.sendStateEvent(roomId, 'im.vector.room.access_rules', { rule: 'unrestricted' });

    expect((await matrix.getAccessRules(roomId)).rule).toBe('unrestricted');
  });

  test('Should return 403 error when changing access rules back to restricted', async () => {
    const roomId = await createPrivateUnencryptedRoom(matrix);

    await matrix.sendStateEvent(roomId, 'im.vector.room.access_rules', { rule: 'unrestricted' });

    await expectErrorWhenSendStateEvent(
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
