import { test, expect, APIRequestContext } from '@playwright/test';
import { BASE_URL, TEST_USER_PASSWORD } from '../../utils/config';
import { MatrixApi } from '../../utils/matrix-api';
import { createMasUserWithPassword, deactivateMasUser } from '../../utils/mas-admin';

test.describe('API - private encrypted room', () => {
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


  test('Create private encrypted room', async ({ request }) => {
    const matrix = new MatrixApi(BASE_URL, request);
    await matrix.login(username, TEST_USER_PASSWORD);

    roomId = await matrix.createRoom({
      name: 'Private Room',
      joinRule: 'private',
      preset: 'private_chat',
      visibility: 'private',
      accessRules: {
        rule: 'restricted',
        force_unencrypted_at_creation: false,
        visibility: 'private',
      },
    });

    expect(roomId).toBeDefined();

    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules).toBeDefined();
    expect(accessRules.rule).toBe('restricted');
    expect(accessRules.force_unencrypted_at_creation).toBe(false);
    expect(accessRules.visibility).toBe('private');

    expect(await matrix.isRoomEncrypted(roomId)).toBe(true);
    expect(await matrix.getJoinRule(roomId)).toBe('private');
  });

  test('Modify joinRule invite', async ({ request }) => {
    const matrix = new MatrixApi(BASE_URL, request);
    await matrix.login(username, TEST_USER_PASSWORD);

    roomId = await matrix.createRoom({
      name: 'Private Room',
      joinRule: 'private',
      preset: 'private_chat',
      visibility: 'private',
      accessRules: {
        rule: 'restricted',
        force_unencrypted_at_creation: false,
        visibility: 'private',
      },
    });

    expect(roomId).toBeDefined();


    expect(await matrix.isRoomEncrypted(roomId)).toBe(true);
    expect(await matrix.getJoinRule(roomId)).toBe('private');

    await matrix.sendStateEvent(
      roomId,
      'm.room.join_rules',
      { join_rule: 'invite' }
    );

    expect(await matrix.getJoinRule(roomId)).toBe('invite');

    await matrix.sendStateEvent(
      roomId,
      'm.room.join_rules',
      { join_rule: 'private' }
    );

  });


  test('Make private encrypted room open to external user', async ({ request }) => {
    const matrix = new MatrixApi(BASE_URL, request);
    await matrix.login(username, TEST_USER_PASSWORD);

    roomId = await matrix.createRoom({
      name: 'Private Room',
      joinRule: 'private',
      preset: 'private_chat',
      visibility: 'private',
      accessRules: {
        rule: 'restricted',
        force_unencrypted_at_creation: false,
        visibility: 'private',
      },
    });

    expect(roomId).toBeDefined();

    await matrix.sendStateEvent(
      roomId,
      'im.vector.room.access_rules',
      { rule: 'unrestricted' }
    );
    
    expect((await matrix.getAccessRules(roomId)).rule).toBe('unrestricted');

  });

});
