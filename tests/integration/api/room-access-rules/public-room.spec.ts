import { test, expect } from '@playwright/test';
import type { MatrixApi } from '../../../../utils/matrix-api';
import {MasAdminClient } from '../../../../utils/mas-admin';
import {
  createPublicRoom,
  expectErrorWhenSendStateEvent,
  loginWithNewUser,
  standardUserOptions,
} from './room-utils';
import { EventType } from 'matrix-js-sdk';

test.describe('API - Public Room', () => {
  let masId: string;
  let matrix: MatrixApi;
  let masAdminClient: MasAdminClient;

  test.beforeAll(async () => {
    masAdminClient = await MasAdminClient.createDefaultMAS();
    const userData = await loginWithNewUser(masAdminClient, standardUserOptions());
    masId = userData.masId;
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
    masAdminClient.deactivateUser(masId);
  });
});
