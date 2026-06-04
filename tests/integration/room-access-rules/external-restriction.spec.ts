import { test, expect } from '@playwright/test';
import type { MatrixApi } from '../../../utils/matrix-api';
import { createPrivateEncryptedRoom, loginWithExternalNewUser } from './room-utils';
import { deactivateMasUser } from '../../../utils/mas-admin';
import { EXTERNAL_MAS_URL } from '../../../utils/config';



test.describe('API - External restriction', () => {
  let matrix: MatrixApi;
  let mxId: string;
  let masId: string;

  test.beforeAll(async () => {
    const user = await loginWithExternalNewUser();
    mxId = user.mxId;
    matrix = user.matrix;
    masId = user.masId
  });

  test('External users can not create rooms', async () => {
   
    await expect(createPrivateEncryptedRoom(matrix))
    .rejects
    .toMatchObject({ httpStatus: 403 });


  });

  test.afterAll(async () => {
    await deactivateMasUser(masId, EXTERNAL_MAS_URL);
  });
});
