import { test, expect } from '@playwright/test';
import type { MatrixApi } from '../../../../utils/matrix-api';
import { MasAdminClient } from '../../../../utils/mas-admin';
import {
  createPrivateUnencryptedRoom,
  createPrivateEncryptedRoom,
  loginWithNewUser,
  addNewUserToRoom,
  addModeratorToRoom,
  addAdminToRoom,
  standardUserOptions,
  externalUserOptions,
} from '../room-access-rules/room-utils';
import { EventType } from 'matrix-js-sdk';

test.describe('API - Manage Last Admin', () => {
  let matrix: MatrixApi;
  let masId: string;
  let masAdminClient: MasAdminClient;
  let externalMasClient: MasAdminClient;

  test.beforeAll(async () => {
    masAdminClient = await MasAdminClient.createDefaultMAS();
    externalMasClient = await MasAdminClient.createExternalMAS();
    const user = await loginWithNewUser(masAdminClient, standardUserOptions());
    matrix = user.matrix;
    masId = user.masId;
  });

  test('Scenario 1: Last admin leaves private room - users_default becomes 100', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);

    const user1 = await addNewUserToRoom(matrix, roomId, masAdminClient, standardUserOptions());

    // Check initial state, users_default PL should be 0
    const initialPowerLevels = await matrix
      .getClient()
      .getStateEvent(roomId, EventType.RoomPowerLevels, '');
    const initialUsersDefault = initialPowerLevels.users_default;
    expect(initialUsersDefault).toBe(0);

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // users_default PL should be 100
    const finalPowerLevels = await user1.matrix
      .getClient()
      .getStateEvent(roomId, EventType.RoomPowerLevels, '');
    expect(finalPowerLevels.users_default).toBe(100);

    await masAdminClient.deactivateUser(user1.masId);
  });

  test('Scenario 2: Admin leaves - another admin remains - no changes', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);

    // Create and promote a second admin
    const admin2 = await addAdminToRoom(matrix, roomId, masAdminClient);

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // Check that users_default remains 0 (no change needed)
    const finalPowerLevels = await admin2.matrix
      .getClient()
      .getStateEvent(roomId, EventType.RoomPowerLevels, '');
    expect(finalPowerLevels.users_default).toBe(0);

    // Check that admin2 remains admin
    expect(finalPowerLevels.users[admin2.mxId]).toBe(100);

    masAdminClient.deactivateUser(admin2.masId);
  });

  test('Scenario 3: Last admin leaves - moderator promoted to admin', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);

    const user = await addNewUserToRoom(matrix, roomId, masAdminClient, standardUserOptions());
    const moderator = await addModeratorToRoom(matrix, roomId, masAdminClient);

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // Check that moderator is promoted to admin (PL=100)
    const finalPowerLevels = await moderator.matrix
      .getClient()
      .getStateEvent(roomId, EventType.RoomPowerLevels, '');
    expect(finalPowerLevels.users[moderator.mxId]).toBe(100);

    await masAdminClient.deactivateUser(moderator.masId);
    await masAdminClient.deactivateUser(user.masId);
  });

  test('Scenario 4: Last admin leaves external room - internal users promoted', async () => {
    // Create external room
    const roomId = await matrix.createRoom({
      name: 'External Room',
      joinRule: 'invite',
      preset: 'private_chat',
      visibility: 'private',
      accessRules: {
        rule: 'unrestricted',
        visibility: 'private',
      },
    });

    const internal1 = await addNewUserToRoom(matrix, roomId, masAdminClient, standardUserOptions());
    const external1 = await addNewUserToRoom(
      matrix,
      roomId,
      externalMasClient,
      externalUserOptions()
    );

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // check PL for internal users
    for (const u of [internal1]) {
      const finalPowerLevels = await u.matrix
        .getClient()
        .getStateEvent(roomId, EventType.RoomPowerLevels, '');
      expect(finalPowerLevels.users[u.mxId]).toBe(100);
    }

    await masAdminClient.deactivateUser(internal1.masId);
    await externalMasClient.deactivateUser(external1.masId);
  });

  test('Scenario 5: Last admin leaves external room - moderators promoted', async () => {
    // Create external room
    const roomId = await matrix.createRoom({
      name: 'External Room with Mods',
      joinRule: 'invite',
      preset: 'private_chat',
      visibility: 'private',
      accessRules: {
        rule: 'unrestricted',
        visibility: 'private',
      },
    });

    const user = await addNewUserToRoom(matrix, roomId, masAdminClient, standardUserOptions());
    const mod1 = await addModeratorToRoom(matrix, roomId, masAdminClient);
    const external1 = await addNewUserToRoom(
      matrix,
      roomId,
      externalMasClient,
      externalUserOptions()
    );

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // Check that moderators are promoted to admin (PL=100)
    const finalPowerLevels = await mod1.matrix
      .getClient()
      .getStateEvent(roomId, EventType.RoomPowerLevels, '');
    expect(finalPowerLevels.users[mod1.mxId]).toBe(100);

    // clean
    await masAdminClient.deactivateUser(mod1.masId);
    await masAdminClient.deactivateUser(user.masId);
    await externalMasClient.deactivateUser(external1.masId);
  });

  test('Scenario 6: Admin leaves an empty external unencrypted room - no error', async () => {
    // Create empty an unencrypted room
    const roomId = await createPrivateUnencryptedRoom(matrix);

    // Change the state of the room to invite an external
    await matrix.sendStateEvent(roomId, 'im.vector.room.access_rules', {
      rule: 'unrestricted',
      visibility: 'private',
      force_unencrypted_at_creation: true,
    });

    // Admin (mxId) leaves - should not throw error
    await expect(matrix.getClient().leave(roomId)).resolves.toBeDefined();

    // Check that room is no longer accessible to admin
    const room = await matrix.getClient().getRoom(roomId);
    expect(room).toBeNull();
  });

  test('Scenario 7: Admin leaves an empty encrypted external room - no error', async () => {
    // Create empty an unencrypted room
    const roomId = await createPrivateEncryptedRoom(matrix);

    // Change the state of the room to invite an external
    await matrix.sendStateEvent(roomId, 'im.vector.room.access_rules', {
      rule: 'unrestricted',
      visibility: 'private',
    });

    // Admin (mxId) leaves - should not throw error
    await expect(matrix.getClient().leave(roomId)).resolves.toBeDefined();

    // Check that room is no longer accessible to admin
    const room = await matrix.getClient().getRoom(roomId);
    expect(room).toBeNull();
  });

  test.afterAll(async () => {
    await masAdminClient.deactivateUser(masId);
  });
});
