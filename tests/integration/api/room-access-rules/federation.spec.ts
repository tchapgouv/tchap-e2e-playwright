import { test, expect } from '@playwright/test';
import type { MatrixApi } from '../../../../utils/matrix-api';
import { deactivateMasUser } from '../../../../utils/mas-admin';
import { createPrivateEncryptedRoom, createPrivateUnencryptedRoom, expectErrorWhenSendStateEvent, loginWithFederatedNewUser, loginWithNewUser } from './room-utils';
import { EventType, JoinRule } from 'matrix-js-sdk';
import { cpSync } from 'fs';


test.describe('API - Federation', () => {
  let matrix: MatrixApi;
  let mxId: string;
  let masId: string;

  test.beforeAll(async () => {
    const user = await loginWithNewUser();
    mxId = user.mxId;
    matrix = user.matrix;
    masId = user.masId
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
