import { expect } from '@playwright/test';
import { MatrixApi } from '../../../../utils/matrix-api';
import {
  MATRIX_URL,
  EXTERNAL_MATRIX_URL,
  EXTERNAL_MAS_URL,
  INVITED_EMAIL_DOMAIN,
  MAS_URL,
  OTHER_MATRIX_URL,
  OTHER_EMAIL_DOMAIN,
  OTHER_MAS_URL,
  STANDARD_EMAIL_DOMAIN,
  TEST_USER_PASSWORD,
  TEST_USER_PREFIX,
} from '../../../../utils/config';
import type { MasAdminClient } from '../../../../utils/mas-admin';
import { EventType } from 'matrix-js-sdk';

/**
 * Options for loginWithNewUser function
 */
interface CreateUserOptions {
  domain: string;
  username_prefix: string;
  password: string;
  matrix_url: string;
  mas_url: string;
  displayName?: string;
}

export function standardUserOptions(overrides: Partial<CreateUserOptions> = {}): CreateUserOptions {
  return {
    domain: STANDARD_EMAIL_DOMAIN,
    password: TEST_USER_PASSWORD,
    matrix_url: MATRIX_URL,
    mas_url: MAS_URL,
    displayName: undefined,
    username_prefix: TEST_USER_PREFIX,
    ...overrides,
  };
}
export function externalUserOptions(overrides: Partial<CreateUserOptions> = {}): CreateUserOptions {
  return {
    domain: INVITED_EMAIL_DOMAIN,
    password: TEST_USER_PASSWORD,
    matrix_url: EXTERNAL_MATRIX_URL,
    mas_url: EXTERNAL_MAS_URL,
    displayName: undefined,
    username_prefix: TEST_USER_PREFIX,
    ...overrides,
  };
}

export function federatedUserOptions(
  overrides: Partial<CreateUserOptions> = {}
): CreateUserOptions {
  return {
    domain: OTHER_EMAIL_DOMAIN,
    password: TEST_USER_PASSWORD,
    matrix_url: OTHER_MATRIX_URL,
    mas_url: OTHER_MAS_URL,
    displayName: undefined,
    username_prefix: TEST_USER_PREFIX,
    ...overrides,
  };
}
/**
 * Helper function to login with a new user
 * Creates a new MAS user and returns the userId, username, and authenticated MatrixApi instance
 */
export async function loginWithNewUser(
  masAdminClient: MasAdminClient,
  opts: CreateUserOptions
): Promise<{
  mxId: string;
  username: string;
  matrix: MatrixApi;
  masId: string;
}> {
  const username = `${opts.username_prefix}${Date.now()}`;

  const masId = await masAdminClient.createUserWithPassword(
    username,
    `${username}@${opts.domain}`,
    opts.password,
    opts.displayName
  );

  const matrix = new MatrixApi(opts.matrix_url, opts.mas_url);
  const mxId = await matrix.login(username, opts.password);

  return { mxId, username, matrix, masId };
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
  await expect(matrix.sendStateEvent(roomId, eventType, content)).rejects.toMatchObject({
    httpStatus: expectedStatus,
  });
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
    power_level_content_override: {
      events: {
        'm.room.name': 50,
        'm.room.avatar': 50,
        'm.room.power_levels': 100,
        'm.room.history_visibility': 100,
        'm.room.canonical_alias': 50,
        'm.room.tombstone': 100,
        'm.room.server_acl': 100,
        'm.room.encryption': 100,
        'org.matrix.msc3401.call.member': 0,
      },
    },
  });
}

/**
 * Sets the power level for a specific user in a room by updating the existing power levels event.
 * This function first fetches the current power levels, then updates the specified user's PL.
 *
 * @param matrix - The Matrix API instance
 * @param roomId - The room ID
 * @param userId - The user ID to set power level for
 * @param powerLevel - The power level to set (e.g., 50 for moderator, 100 for admin)
 */
export async function setUserPowerLevel(
  matrix: MatrixApi,
  roomId: string,
  userId: string,
  powerLevel: number
): Promise<void> {
  // Get current power levels
  const currentPowerLevels = await matrix
    .getClient()
    .getStateEvent(roomId, EventType.RoomPowerLevels, '');

  // Create updated power levels content
  const updatedPowerLevels = {
    ...currentPowerLevels,
    users: {
      ...currentPowerLevels.users,
      [userId]: powerLevel,
    },
  };

  // Send the updated power levels event
  await matrix
    .getClient()
    .sendStateEvent(roomId, EventType.RoomPowerLevels, updatedPowerLevels, '');
}

/**
 * Sets the power level for users_default
 *
 * @param matrix - The Matrix API instance
 * @param roomId - The room ID
 * @param powerLevel - The power level to set (e.g., 50 for moderator, 100 for admin)
 */
export async function setDefaultPowerLevel(
  matrix: MatrixApi,
  roomId: string,
  defaultPowerLevel: number
): Promise<void> {
  // Get current power levels
  const currentPowerLevels = await matrix
    .getClient()
    .getStateEvent(roomId, EventType.RoomPowerLevels, '');

  const updatedPowerLevels = {
    ...currentPowerLevels,
    users_default: defaultPowerLevel,
  };

  await matrix
    .getClient()
    .sendStateEvent(roomId, EventType.RoomPowerLevels, updatedPowerLevels, '');
}

/**
 * Creates a new user and adds them to a room with default power level.
 *
 * @param matrix - The Matrix API instance of the room admin/creator
 * @param roomId - The room ID to add the user to
 * @returns Promise resolving to the created user object (mxId, matrix, masId)
 */
export async function addNewUserToRoom(
  matrix: MatrixApi,
  roomId: string,
  masAdminClient: MasAdminClient,
  createUserOptions: CreateUserOptions
): Promise<{ mxId: string; matrix: MatrixApi; masId: string }> {
  // Create new user
  const user = await loginWithNewUser(masAdminClient, createUserOptions);

  // Invite user to room
  await matrix.getClient().invite(roomId, user.mxId);

  // User joins room
  await user.matrix.getClient().joinRoom(roomId);

  return user;
}

/**
 * Creates a new user and adds them to a room as a moderator (PL=50).
 *
 * @param matrix - The Matrix API instance of the room admin/creator
 * @param roomId - The room ID to add the moderator to
 * @returns Promise resolving to the created moderator user object (mxId, matrix, masId)
 */
export async function addModeratorToRoom(
  matrix: MatrixApi,
  roomId: string,
  masAdminClient: MasAdminClient
): Promise<{ mxId: string; matrix: MatrixApi; masId: string }> {
  // Create and add user to room
  const user = await addNewUserToRoom(matrix, roomId, masAdminClient, standardUserOptions());

  // Set user's power level to 50 (moderator)
  await setUserPowerLevel(matrix, roomId, user.mxId, 50);

  return user;
}

/**
 * Creates another admin to a room as a admin (PL=100).
 *
 * @param matrix - The Matrix API instance of the room admin/creator
 * @param roomId - The room ID to add the moderator to
 * @returns Promise resolving to the created admin user object (mxId, matrix, masId)
 */
export async function addAdminToRoom(
  matrix: MatrixApi,
  roomId: string,
  masAdminClient: MasAdminClient
): Promise<{ mxId: string; matrix: MatrixApi; masId: string }> {
  // Create and add user to room
  const user = await addNewUserToRoom(matrix, roomId, masAdminClient, standardUserOptions());

  // Set user's power level to 100 (admin)
  await setUserPowerLevel(matrix, roomId, user.mxId, 100);

  return user;
}
