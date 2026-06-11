import { test, expect } from '@playwright/test';
import {
  createPrivateEncryptedRoom,
  externalUserOptions,
  loginWithNewUser,
  standardUserOptions,
} from './room-utils';
import { MasAdminClient } from '../../../../utils/mas-admin';

test.describe('API - External restriction', () => {
  let externalUser: any;
  let externalMasAdmin: MasAdminClient;

  test.beforeAll(async () => {
    externalMasAdmin = await MasAdminClient.createExternalMAS();
    externalUser = await loginWithNewUser(externalMasAdmin, externalUserOptions());
  });

  test('External users can not create rooms', async () => {
    await expect(createPrivateEncryptedRoom(externalUser.matrix)).rejects.toMatchObject({
      httpStatus: 403,
    });
  });

  test('External users get empty results when searching user directory ', async () => {
    //create new user to search for
    const masAdmin = await MasAdminClient.createDefaultMAS();
    const user = await loginWithNewUser(masAdmin, standardUserOptions());

    await expect(
      externalUser.matrix.getClient().searchUserDirectory({ term: user.username })
    ).resolves.toMatchObject({ results: [] });

    await masAdmin.deactivateUser(user.masId);
  });

  test.afterAll(async () => {
    await externalMasAdmin.deactivateUser(externalUser.masId);
  });
});
