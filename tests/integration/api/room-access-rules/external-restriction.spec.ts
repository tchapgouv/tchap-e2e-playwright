import { test, expect } from '@playwright/test';
import type { MatrixApi } from '../../../../utils/matrix-api';
import { createPrivateEncryptedRoom, loginWithExternalNewUser, loginWithFederatedNewUser, loginWithNewUser } from './room-utils';
import { deactivateMasUser } from '../../../../utils/mas-admin';
import { EXTERNAL_MAS_URL, TEST_USER_PREFIX } from '../../../../utils/config';



test.describe('API - External restriction', () => {
  let matrix: MatrixApi;
  let mxId: string;
  let masId: string;

  test.beforeAll(async () => {
    const externalUser = await loginWithExternalNewUser();
    mxId = externalUser.mxId;
    matrix = externalUser.matrix;
    masId = externalUser.masId
  });

  test('External users can not create rooms', async () => {
    await expect(createPrivateEncryptedRoom(matrix))
    .rejects
    .toMatchObject({ httpStatus: 403 });
  });


  test('External users get empty results when searching user directory ', async () => {
    //create new user to search for
    const user = await loginWithNewUser();

     await expect(matrix.getClient().searchUserDirectory({term:user.username}))
     .resolves
     .toMatchObject({"results": []})

     await deactivateMasUser(user.masId);
  });

  test.afterAll(async () => {
    await deactivateMasUser(masId, EXTERNAL_MAS_URL);
  });
});
