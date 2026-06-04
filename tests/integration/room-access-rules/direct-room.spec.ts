import { test, expect } from '@playwright/test';
import type { MatrixApi } from '../../../utils/matrix-api';
import { deactivateMasUser } from '../../../utils/mas-admin';
import { createPrivateEncryptedRoom, createPrivateUnencryptedRoom, expectErrorWhenSendStateEvent, loginWithFederatedNewUser, loginWithNewUser } from './room-utils';
import { EventType, JoinRule } from 'matrix-js-sdk';
import { cpSync } from 'fs';

export async function createDirectRoom(
  matrix: MatrixApi,
  name: string = 'Direct Room'
): Promise<string> {
  return matrix.createRoom({
    name,
    joinRule: 'invite',
    preset: 'trusted_private_chat',
    visibility: 'private',
    encryption: false,
    accessRules: {
      rule: 'direct',
      force_unencrypted_at_creation: false,
      visibility: 'private',
    },
    is_direct: true,
  });
}

test.describe('API - Direct Room', () => {
  let matrix: MatrixApi;
  let mxId: string;
  let masId: string;

  test.beforeAll(async () => {
    const user = await loginWithNewUser();
    mxId = user.mxId;
    matrix = user.matrix;
    masId = user.masId
  });

  test('Should create direct room with correct properties', async () => {
    const roomId = await createDirectRoom(matrix);
    expect(roomId).toBeDefined();

    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules).toBeDefined();
    expect(accessRules.rule).toBe('direct');
    expect(accessRules.force_unencrypted_at_creation).toBe(false);
    expect(accessRules.visibility).toBe('private');
    expect(await matrix.isRoomEncrypted(roomId)).toBe(true);
    expect(await matrix.getJoinRule(roomId)).toBe('invite');
  });

  test('Should return 403 error when changing joining rule', async () => {
    const roomId = await createDirectRoom(matrix);

    await expectErrorWhenSendStateEvent(
      matrix,
      roomId,
      EventType.RoomJoinRules,
      { join_rule: JoinRule.Public },
      403
    );
  });

  test('Should return 403 error when changing access rules', async () => {
    const roomId = await createDirectRoom(matrix);

    await expectErrorWhenSendStateEvent(
      matrix,
      roomId,
      'im.vector.room.access_rules',
      { rule: 'unrestricted' },
      403
    );

    await expectErrorWhenSendStateEvent(
      matrix,
      roomId,
      'im.vector.room.access_rules',
      { rule: 'restricted' },
      403
    );
  });

  test('Should create room on federated server', async () => {

    const roomId = await createPrivateUnencryptedRoom(matrix);
    const accessRules = await matrix.getAccessRules(roomId);

    const federatedUser = await loginWithFederatedNewUser();

    // Invite federatedUser into the room
    await matrix.getClient().invite(roomId, federatedUser.mxId);

    // federatedUser joins the room
    await federatedUser.matrix.getClient().joinRoom(roomId);

    // Start the client sync
    await federatedUser.matrix.getClient().startClient();

    // Verify the federated user can access the room state
    const federatedAccessRules = await federatedUser.matrix.getAccessRules(roomId);
    expect(federatedAccessRules).toEqual(accessRules);

    // User sends a message to the room
    const messageEventId = await matrix.getClient().sendTextMessage(roomId, 'Hello from original user');
    expect(messageEventId).toBeDefined();

    // Get the room and verify it has events
    const room = await federatedUser.matrix.getClient().getRoom(roomId);
    expect(room).toBeDefined();
    const events = await room?.getLiveTimeline().getEvents();
    expect(events && events.length).toBeGreaterThan(0);

  });

  test.afterAll(async () => {
    await deactivateMasUser(masId);
  });
});
