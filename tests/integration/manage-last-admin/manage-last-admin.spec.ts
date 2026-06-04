import { test, expect } from '@playwright/test';
import type { MatrixApi } from '../../../utils/matrix-api';
import { deactivateMasUser } from '../../../utils/mas-admin';
import { loginWithExternalNewUser, createPrivateUnencryptedRoom, createPrivateEncryptedRoom, loginWithNewUser } from '../room-access-rules/room-utils';



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

    // Leave the room
    await matrix.getClient().leave(roomId);

    const room = await matrix.getClient().getRoom(roomId);
    expect(room).toBeNull();
  });

  test('Should leave an encrypted room opened to external', async () => {

    const roomId = await createPrivateEncryptedRoom(matrix);

    const externalUser = await loginWithExternalNewUser();

    // Change the state of the room to invite an external
    await matrix.sendStateEvent(roomId, 'im.vector.room.access_rules', {rule: 'unrestricted', visibility: 'private'});

    // Invite externalUser into the room
    await matrix.getClient().invite(roomId, externalUser.mxId);

    // Leave the room
    await matrix.getClient().leave(roomId);

    const room = await matrix.getClient().getRoom(roomId);
    expect(room).toBeNull();
  });



  test.afterAll(async () => {
    await deactivateMasUser(masId);
  });
});
