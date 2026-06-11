import { test, expect } from '@playwright/test';
import type { MatrixApi } from '../../../../utils/matrix-api';
import { MasAdminClient } from '../../../../utils/mas-admin';
import {
  createPrivateUnencryptedRoom,
  federatedUserOptions,
  loginWithNewUser,
  standardUserOptions,
} from './room-utils';

test.describe('API - Federation', () => {
  let matrix: MatrixApi;
  let mxId: string;
  let masId: string;
  let masAdmin: MasAdminClient;

  test.beforeAll(async () => {
    masAdmin = await MasAdminClient.createDefaultMAS();
    const user = await loginWithNewUser(masAdmin, standardUserOptions());
    matrix = user.matrix;
    masId = user.masId;
  });

  test('Should create room on federated server', async () => {
    const roomId = await createPrivateUnencryptedRoom(matrix);
    const accessRules = await matrix.getAccessRules(roomId);

    const federatedMas = await MasAdminClient.createFederatedMAS();
    const federatedUser = await loginWithNewUser(federatedMas, federatedUserOptions());

    //start sync
    await matrix.getClient().startClient();

    // Start the client sync
    await federatedUser.matrix.getClient().startClient();

    // Invite federatedUser into the room
    await matrix.getClient().invite(roomId, federatedUser.mxId);

    // federatedUser joins the room
    await federatedUser.matrix.getClient().joinRoom(roomId);

    // Verify the federated user can access the room state
    const federatedAccessRules = await federatedUser.matrix.getAccessRules(roomId);
    expect(federatedAccessRules).toEqual(accessRules);


    
    // User sends a message to the room
    const messageEventId = await matrix
      .getClient()
      .sendTextMessage(roomId, 'Hello from original user');
    expect(messageEventId).toBeDefined();

    // Get the room and verify it has events
    const room = await federatedUser.matrix.getClient().getRoom(roomId);
    expect(room).toBeDefined();

    // We should wait a bit here

    // Get the room again to ease events retrieval
    const events = await matrix.getClient().getRoom(roomId).getLiveTimeline().getEvents();

    expect(events.length).toBeGreaterThan(0);

    federatedMas.deactivateUser(federatedUser.masId);
  });

  test.afterAll(async () => {
    masAdmin.deactivateUser(masId);
  });
});
