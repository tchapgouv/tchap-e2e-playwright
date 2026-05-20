import { test, expect, APIRequestContext } from '@playwright/test';
import { BASE_URL, TEST_USER_PASSWORD } from '../../utils/config';
import { MatrixApi } from '../../utils/matrix-api';
import { createMasUserWithPassword, deactivateMasUser } from '../../utils/mas-admin';

test.describe('API - room creation', () => {
  let userId: string;
  let username: string;
  let roomId: string;

  test.beforeAll(async ({  }) => {
    username = `user.unenc.${Date.now()}`;
    userId = await createMasUserWithPassword(
      username,
      `${username}@test.local`,
      TEST_USER_PASSWORD
    );
  });

  test.afterAll(async ({  }) => {
    await deactivateMasUser(userId);
  });


  test('Matrix: Create private unencrypted room', async ({ request }) => {
    const matrix = new MatrixApi(BASE_URL, request);
    await matrix.login(username, TEST_USER_PASSWORD);

    roomId = await matrix.createRoom({
      name: 'Private Unencrypted Room',
      joinRule: 'invite',
      preset: 'private_chat',
      visibility: 'private',
      encryption: false,
      accessRules: {
        rule: 'restricted',
        force_unencrypted_at_creation: true,
        visibility: 'private',
      },
    });

    expect(roomId).toBeDefined();

    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules).toBeDefined();
    expect(accessRules.rule).toBe('restricted');
    expect(accessRules.force_unencrypted_at_creation).toBe(true);
    expect(accessRules.visibility).toBe('private');

    const isEncrypted = await matrix.isRoomEncrypted(roomId);
    expect(isEncrypted).toBe(false);

    const joinRule = await matrix.getJoinRule(roomId);
    expect(joinRule).toBe('invite');
  });

});
