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
    test.setTimeout(15000);
    
    const roomId = await createPrivateUnencryptedRoom(matrix);
    const accessRules = await matrix.getAccessRules(roomId);

    const federatedMas = await MasAdminClient.createFederatedMAS();
    const federatedUser = await loginWithNewUser(federatedMas, federatedUserOptions());

    //start sync
    //await matrix.getClient().startClient(); //no need

    // Start the federatedUser client sync to read messages
    await federatedUser.matrix.getClient().startClient();

    // Invite federatedUser into the room
    await matrix.getClient().invite(roomId, federatedUser.mxId);

    // federatedUser joins the room
    await federatedUser.matrix.getClient().joinRoom(roomId);

    // Verify the federated room has the same accessRules
    const federatedAccessRules = await federatedUser.matrix.getAccessRules(roomId);
    expect(federatedAccessRules).toEqual(accessRules);

    // User sends a message to the room
    const messageEventId = await matrix
      .getClient()
      .sendTextMessage(roomId, 'Hello from original user');
    expect(messageEventId).toBeDefined();

    //wait for message to be read in from federated user
    await expect.poll(async () => {
      const room = federatedUser.matrix.getClient().getRoom(roomId);
      if (!room) return 0;
      const allEvents = room.getLiveTimeline().getEvents();

      // Filter for m.room.message events only
      const messageEvents = allEvents.filter(event => {
        return event.getType() === 'm.room.message';
      });
      console.log(`#all events received:${allEvents.length}, # m.room.message received: ${messageEvents.length}`);
      return messageEvents.length;
    }, {
      message: 'Expected room to have events',
      timeout: 10000, // 10 secondes total
      intervals: [1000] // Vérifie toutes les 1000ms (1 seconde)
    }).toBeGreaterThan(0);
    

    federatedMas.deactivateUser(federatedUser.masId);
  });

  test.afterAll(async () => {
    masAdmin.deactivateUser(masId);
  });
});
