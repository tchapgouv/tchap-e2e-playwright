import { test, expect } from '@playwright/test';
import { BASE_URL, TEST_USER_PASSWORD } from '../../utils/config';
import type { MatrixApi } from '../../utils/matrix-api';
import { createMasUserWithPassword, deactivateMasUser } from '../../utils/mas-admin';
import { expectErrorWhenSendStateEvent, loginWithNewUser } from './room-utils';
import { EventType } from 'matrix-js-sdk';

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
    power_level_content_override:{
      events:
      {
         "m.room.name": 50,
          "m.room.avatar": 50,
          "m.room.power_levels": 100,
          "m.room.history_visibility": 100,
          "m.room.canonical_alias": 50,
          "m.room.tombstone": 100,
          "m.room.server_acl": 100,
          "m.room.encryption": 100,
          "org.matrix.msc3401.call.member": 0
      },
    }
  });
}

test.describe('API - Public Room', () => {
  let userId: string;
  let matrix: MatrixApi;

  test.beforeAll(async () => {
    const userData = await loginWithNewUser();
    userId = userData.userId;
    matrix = userData.matrix;
  });

  test('Should create public room with correct properties', async () => {
    const roomId = await createPublicRoom(matrix);
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
    const roomId = await createPublicRoom(matrix);

    await expectErrorWhenSendStateEvent(
      matrix,
      roomId,
      'im.vector.room.access_rules',
      { rule: 'unrestricted' },
      403
    );
  });

  test('Should return 403 error when changing encryption', async () => {
    const roomId = await createPublicRoom(matrix);

    await expectErrorWhenSendStateEvent(matrix, roomId, EventType.RoomEncryption, {}, 403);
  });

  test.afterAll(async () => {
    await deactivateMasUser(userId);
  });
});
