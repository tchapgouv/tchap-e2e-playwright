import { test, expect } from '@playwright/test';
import { AccessRulesEventType, type MatrixApi } from '../../../../utils/matrix-api';
import { MasAdminClient } from '../../../../utils/mas-admin';
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

    const accessRules = await matrix.getAccessRulesEvent(roomId);
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
      AccessRulesEventType,
      { rule: 'unrestricted' },
      403
    );
  });

  test('Should return 403 error when changing encryption', async () => {
    const roomId = await createPublicRoom(matrix);

    await expectErrorWhenSendStateEvent(matrix, roomId, EventType.RoomEncryption, {}, 403);
  });

  test('Should create public room with default retention of 3 months', async () => {
    const roomId = await createPublicRoom(matrix);
    expect(roomId).toBeDefined();

    const roomRetention = await matrix.getRoomRetentionEvent(roomId)
    expect(roomRetention).toBeDefined();
    expect(roomRetention.max_lifetime).toBe(3 * 30 * 24 * 60 * 60 * 1000);
  });

  test('Should fail to create public room with custom retention superior to 3 months', async () => {
    await expect(createPublicRoom(matrix, 'Public Room', 4 * 30 * 24 * 60 * 60 * 1000)).rejects.toThrow()
  });

  test('Should fail to set retention to a value superior to 3 months or to unset it', async () => {
    const roomId = await createPublicRoom(matrix);
    expect(roomId).toBeDefined();

    await expect(matrix.sendStateEvent(roomId, "m.room.retention", { max_lifetime: 4 * 30 * 24 * 60 * 60 * 1000 }))
      .rejects
      .toThrow();

    await expect(matrix.sendStateEvent(roomId, "m.room.retention", { }))
      .rejects
      .toThrow();
  });

  test('Should allow to set retention to a value inferior to 3 months', async () => {
    const roomId = await createPublicRoom(matrix);
    expect(roomId).toBeDefined();

    await expect(matrix.sendStateEvent(roomId, "m.room.retention", { max_lifetime: 2 * 30 * 24 * 60 * 60 * 1000 }))
      .resolves
      .toBeDefined();
  });

  test.afterAll(async () => {
    masAdminClient.deactivateUser(masId);
  });
});
