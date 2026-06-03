import { expect } from '@playwright/test';
import { MatrixApi } from '../../../utils/matrix-api';
import { BASE_URL, STANDARD_EMAIL_DOMAIN, TEST_USER_PASSWORD } from '../../../utils/config';
import { createMasUserWithPassword } from '../../../utils/mas-admin';

/**
 * Helper function to login with a new user
 * Creates a new MAS user and returns the userId, username, and authenticated MatrixApi instance
 */
export async function loginWithNewUser(): Promise<{
  userId: string;
  username: string;
  matrix: MatrixApi;
}> {
  const username = `user.${Date.now()}`;
  const userId = await createMasUserWithPassword(
    username,
    `${username}@${STANDARD_EMAIL_DOMAIN}`,
    TEST_USER_PASSWORD
  );

  const matrix = new MatrixApi(BASE_URL);
  await matrix.login(username, TEST_USER_PASSWORD);

  return { userId, username, matrix };
}

/**
 * Helper function to test that sending a state event returns an error with the expected status code
 */
export async function expectErrorWhenSendStateEvent(
  matrix: MatrixApi,
  roomId: string,
  eventType: string,
  content: Record<string, any>,
  expectedStatus: number = 403
): Promise<void> {
  await expect(matrix.sendStateEvent(roomId, eventType, content))
    .rejects
    .toMatchObject({ httpStatus: expectedStatus });
}

export async function createPrivateEncryptedRoom(
  matrix: MatrixApi,
  name: string = 'Private Room'
): Promise<string> {
  return matrix.createRoom({
    name,
    joinRule: 'invite',
    preset: 'private_chat',
    visibility: 'private',
    accessRules: {
      rule: 'restricted',
      force_unencrypted_at_creation: false,
      visibility: 'private',
    },
  });
}

export async function createPrivateUnencryptedRoom(
  matrix: MatrixApi,
  name: string = 'Private Unencrypted Room'
): Promise<string> {
  return matrix.createRoom({
    name,
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
}


export async function createPublicRoom(
  matrix: MatrixApi,
  name: string = 'Public Room'
): Promise<string> {
  return matrix.createRoom({
    name,
    joinRule: 'public',
    preset: 'public_chat',
    visibility: 'public',
    accessRules: {
      rule: 'restricted',
      force_unencrypted_at_creation: false,
      visibility: 'public',
    },
    power_level_content_override:{
      events:
      {
         "m.room.name": 50,
          "m.room.avatar": 50,
          "m.room.power_levels": 100,
          "m.room.history_visibility": 100,
          "m.room.canonical_alias": 50,
          "m.room.tombstone": 100,
          "m.room.server_acl": 100,
          "m.room.encryption": 100,
          "org.matrix.msc3401.call.member": 0
      },
    }
  });
}
