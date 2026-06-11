import { test, expect } from '@playwright/test';
import type { MatrixApi } from '../../../../utils/matrix-api';
import {
  createPrivateEncryptedRoom,
  externalUserOptions,
  loginWithNewUser,
  standardUserOptions,
} from './room-utils';
import { deactivateMasUser, MasAdminClient } from '../../../../utils/mas-admin';
import { EXTERNAL_MAS_URL, TEST_USER_PREFIX } from '../../../../utils/config';

test.describe('API - External restriction', () => {
  let matrix: MatrixApi;
  let masId: string;
  let masAdmin: MasAdminClient;

  test.beforeAll(async () => {
    masAdmin = await MasAdminClient.createExternalMAS();
    const externalUser = await loginWithNewUser(masAdmin, externalUserOptions());
    matrix = externalUser.matrix;
    masId = externalUser.masId;
  });

  test('External users can not create rooms', async () => {
    await expect(createPrivateEncryptedRoom(matrix)).rejects.toMatchObject({ httpStatus: 403 });
  });

  test('External users get empty results when searching user directory ', async () => {
    //create new user to search for
    const masAdmin = await MasAdminClient.createDefaultMAS();
    const user = await loginWithNewUser(masAdmin, standardUserOptions());

    await expect(
      matrix.getClient().searchUserDirectory({ term: user.username })
    ).resolves.toMatchObject({ results: [] });

    await deactivateMasUser(user.masId);
  });

  test.afterAll(async () => {
    await deactivateMasUser(masId, EXTERNAL_MAS_URL);
  });
});
