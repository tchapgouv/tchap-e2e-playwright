import { test, expect } from '@playwright/test';
import type { MatrixApi } from '../../../utils/matrix-api';
import { deactivateMasUser } from '../../../utils/mas-admin';
import {
  createPrivateUnencryptedRoom,
  createPrivateEncryptedRoom,
  loginWithNewUser,
  addExternalUserToRoom as addExternalNewUserToRoom,
  addUserToRoom as addNewUserToRoom,
  addModeratorToRoom,
  addAdminToRoom,
} from '../room-access-rules/room-utils';
import { EXTERNAL_MAS_URL } from '../../../utils/config';
import { EventType } from 'matrix-js-sdk';

test.describe('API - Manage Last Admin', () => {
  let matrix: MatrixApi;
  let mxId: string;
  let masId: string;

  test.beforeAll(async () => {
    const user = await loginWithNewUser();
    mxId = user.mxId;
    matrix = user.matrix;
    masId = user.masId;
  });

  test('Should leave an unencrypted room opened to external', async () => {
    const roomId = await createPrivateUnencryptedRoom(matrix);

    // Change the state of the room to invite an external
    await matrix.sendStateEvent(roomId, 'im.vector.room.access_rules', {
      rule: 'unrestricted',
      visibility: 'private',
      force_unencrypted_at_creation: true,
    });

    const externalUser = await addExternalNewUserToRoom(matrix, roomId);

    // room owner leaves the room
    await matrix.getClient().leave(roomId);

    // as owner has left the room, we expect getRoom to return null, the value is defined but is null
    const room = await matrix.getClient().getRoom(roomId);
    expect(room).toBeNull();

    await deactivateMasUser(externalUser.masId, EXTERNAL_MAS_URL);
  });

  test('Should leave an encrypted room opened to external', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);

    // Change the state of the room to invite an external
    await matrix.sendStateEvent(roomId, 'im.vector.room.access_rules', {
      rule: 'unrestricted',
      visibility: 'private',
    });

    const externalUser = await addExternalNewUserToRoom(matrix, roomId);

    // Leave the room
    await matrix.getClient().leave(roomId);

    // as owner has left the room, we expect getRoom to return null, the value is defined but is null
    const room = await matrix.getClient().getRoom(roomId);
    expect(room).toBeNull();

    await deactivateMasUser(externalUser.masId, EXTERNAL_MAS_URL);
  });

  test('Scenario 1: Last admin leaves private room - users_default becomes 100', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);

    const user1 = await addNewUserToRoom(matrix, roomId);

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

    await deactivateMasUser(user1.masId);
  });

  test('Scenario 2: Admin leaves - another admin remains - no changes', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);

    // Create and promote a second admin
    const admin2 = await addAdminToRoom(matrix, roomId);

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // Check that users_default remains 0 (no change needed)
    const finalPowerLevels = await admin2.matrix
      .getClient()
      .getStateEvent(roomId, EventType.RoomPowerLevels, '');
    expect(finalPowerLevels.users_default).toBe(0);

    // Check that admin2 remains admin
    expect(finalPowerLevels.users[admin2.mxId]).toBe(100);

    await deactivateMasUser(admin2.masId);
  });

  test('Scenario 3: Last admin leaves - moderator promoted to admin', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);

    const user = await addNewUserToRoom(matrix, roomId);
    const moderator = await addModeratorToRoom(matrix, roomId);

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // Check that moderator is promoted to admin (PL=100)
    const finalPowerLevels = await moderator.matrix
      .getClient()
      .getStateEvent(roomId, EventType.RoomPowerLevels, '');
    expect(finalPowerLevels.users[moderator.mxId]).toBe(100);

    await deactivateMasUser(moderator.masId);
    await deactivateMasUser(user.masId);
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

    const internal1 = await addNewUserToRoom(matrix, roomId);
    const external1 = await addExternalNewUserToRoom(matrix, roomId);

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // check PL for internal users
    for (const u of [internal1]) {
      const finalPowerLevels = await u.matrix
        .getClient()
        .getStateEvent(roomId, EventType.RoomPowerLevels, '');
      expect(finalPowerLevels.users[u.mxId]).toBe(100);
    }

    await deactivateMasUser(internal1.masId);
    await deactivateMasUser(external1.masId, EXTERNAL_MAS_URL);
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

    const user = await addNewUserToRoom(matrix, roomId);
    const mod1 = await addModeratorToRoom(matrix, roomId);
    const external1 = await addExternalNewUserToRoom(matrix, roomId);

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // Check that moderators are promoted to admin (PL=100)
    const finalPowerLevels = await mod1.matrix
      .getClient()
      .getStateEvent(roomId, EventType.RoomPowerLevels, '');
    expect(finalPowerLevels.users[mod1.mxId]).toBe(100);

    // clean
    await deactivateMasUser(mod1.masId);
    await deactivateMasUser(user.masId);
    await deactivateMasUser(external1.masId, EXTERNAL_MAS_URL);
  });

  test('Scenario 6: Admin leaves empty external room - no error', async () => {
    // Create empty external room
    const roomId = await matrix.createRoom({
      name: 'Empty External Room',
      joinRule: 'invite',
      preset: 'private_chat',
      visibility: 'private',
      accessRules: {
        rule: 'unrestricted',
        visibility: 'private',
      },
    });

    // Admin (mxId) leaves - should not throw error
    await expect(matrix.getClient().leave(roomId)).resolves.toBeDefined();

    // Check that room is no longer accessible to admin
    const room = await matrix.getClient().getRoom(roomId);
    expect(room).toBeNull();
  });

  test.afterAll(async () => {
    await deactivateMasUser(masId);
  });
});
