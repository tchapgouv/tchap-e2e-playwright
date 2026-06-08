import { test, expect } from '@playwright/test';
import type { MatrixApi } from '../../../utils/matrix-api';
import { deactivateMasUser } from '../../../utils/mas-admin';
import { loginWithExternalNewUser, createPrivateUnencryptedRoom, createPrivateEncryptedRoom, loginWithNewUser, setUserPowerLevel } from '../room-access-rules/room-utils';
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
    masId = user.masId
  });

  test('Should leave an unencrypted room opened to external', async () => {

    const roomId = await createPrivateUnencryptedRoom(matrix);

    const externalUser = await loginWithExternalNewUser();

    // Change the state of the room to invite an external
    await matrix.sendStateEvent(roomId, 'im.vector.room.access_rules', {rule: 'unrestricted', visibility: 'private', force_unencrypted_at_creation: true});

    // Invite externalUser into the room
    await matrix.getClient().invite(roomId, externalUser.mxId);

    // externalUser joins the room
    await externalUser.matrix.getClient().joinRoom(roomId);

    // room owner leaves the room
    await matrix.getClient().leave(roomId);

    // as owner has left the room, we expect getRoom to return null, the value is defined but is null
    const room = await matrix.getClient().getRoom(roomId);
    expect(room).toBeNull();

    await deactivateMasUser(externalUser.masId, EXTERNAL_MAS_URL);
  });

  test('Should leave an encrypted room opened to external', async () => {

    const roomId = await createPrivateEncryptedRoom(matrix);

    const externalUser = await loginWithExternalNewUser();

    // Change the state of the room to invite an external
    await matrix.sendStateEvent(roomId, 'im.vector.room.access_rules', {rule: 'unrestricted', visibility: 'private'});

    // Invite externalUser into the room
    await matrix.getClient().invite(roomId, externalUser.mxId);

     // externalUser joins the room
    await externalUser.matrix.getClient().joinRoom(roomId);

    // Leave the room
    await matrix.getClient().leave(roomId);

    // as owner has left the room, we expect getRoom to return null, the value is defined but is null
    const room = await matrix.getClient().getRoom(roomId);
    expect(room).toBeNull();

    await deactivateMasUser(externalUser.masId, EXTERNAL_MAS_URL);
  });


  test('Scenario 1: Last admin leaves private room - users_default becomes 100', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);

    const user1 = await loginWithNewUser();
    const user2 = await loginWithNewUser();

    await matrix.getClient().invite(roomId, user1.mxId);
    await matrix.getClient().invite(roomId, user2.mxId);

    await user1.matrix.getClient().joinRoom(roomId);
    await user2.matrix.getClient().joinRoom(roomId);

    // Check initial state, users_default PL should be 0
    const initialPowerLevels = await matrix.getClient().getStateEvent(
      roomId, EventType.RoomPowerLevels, ''
    );
    const initialUsersDefault = initialPowerLevels.users_default;
    expect(initialUsersDefault).toBe(0);

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // users_default PL should be 100
    const finalPowerLevels = await user1.matrix.getClient().getStateEvent(
      roomId, EventType.RoomPowerLevels, ''
    );
    expect(finalPowerLevels.users_default).toBe(100);

    // clean
    await deactivateMasUser(user1.masId);
    await deactivateMasUser(user2.masId);
  });

  test('Scenario 2: Admin leaves - another admin remains - no changes', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);

    // Create and promote a second admin
    const admin2 = await loginWithNewUser();
    await matrix.getClient().invite(roomId, admin2.mxId);
    await admin2.matrix.getClient().joinRoom(roomId);

    // Promote admin2 to PL=100
    await setUserPowerLevel(matrix, roomId, admin2.mxId, 100);

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // Check that users_default remains 0 (no change needed)
    const finalPowerLevels = await admin2.matrix.getClient().getStateEvent(
      roomId, EventType.RoomPowerLevels, ''
    );
    expect(finalPowerLevels.users_default).toBe(0);

    // Check that admin2 remains admin
    expect(finalPowerLevels.users[admin2.mxId]).toBe(100);

    // clean
    await deactivateMasUser(admin2.masId);
  });

  test('Scenario 3: Last admin leaves - moderator promoted to admin', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);

    const moderator = await loginWithNewUser();
    const user = await loginWithNewUser();

    await matrix.getClient().invite(roomId, moderator.mxId);
    await matrix.getClient().invite(roomId, user.mxId);
    await moderator.matrix.getClient().joinRoom(roomId);
    await user.matrix.getClient().joinRoom(roomId);

    // Promote moderator to PL=50
    await setUserPowerLevel(matrix, roomId, moderator.mxId, 50);

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // Check that moderator is promoted to admin (PL=100)
    const finalPowerLevels = await moderator.matrix.getClient().getStateEvent(
      roomId, EventType.RoomPowerLevels, ''
    );
    expect(finalPowerLevels.users[moderator.mxId]).toBe(100);

    // clean
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
        visibility: 'private'
      }
    });

    const internal1 = await loginWithNewUser();
    const external1 = await loginWithExternalNewUser();

    // Invite everyone
    for (const u of [internal1, external1]) {
      await matrix.getClient().invite(roomId, u.mxId);
      await u.matrix.getClient().joinRoom(roomId);
    }

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

     // check PL for internal users
    for (const u of [internal1]) {
      const finalPowerLevels = await u.matrix.getClient().getStateEvent(
      roomId, EventType.RoomPowerLevels, ''
      );
      expect(finalPowerLevels.users[u.mxId]).toBe(100);

    }

    // clean
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
        visibility: 'private'
      }
    });

    const mod1 = await loginWithNewUser();
    const user = await loginWithNewUser();
    const external1 = await loginWithExternalNewUser();

    // Invite everyone
    for (const u of [mod1, user, external1]) {
      await matrix.getClient().invite(roomId, u.mxId);
      await u.matrix.getClient().joinRoom(roomId);
    }

    // Promote mods to PL=50
    await setUserPowerLevel(matrix, roomId, mod1.mxId, 50);

    // Admin (mxId) leaves
    await matrix.getClient().leave(roomId);

    // Check that moderators are promoted to admin (PL=100)
    const finalPowerLevels = await mod1.matrix.getClient().getStateEvent(
      roomId, EventType.RoomPowerLevels, ''
    );
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
        visibility: 'private'
      }
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
