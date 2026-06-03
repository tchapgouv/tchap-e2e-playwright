import { test, expect } from '@playwright/test';
import type { MatrixApi } from '../../../utils/matrix-api';
import { deactivateMasUser } from '../../../utils/mas-admin';
import { createPrivateEncryptedRoom, createPublicRoom, expectErrorWhenSendStateEvent, loginWithNewUser } from './room-utils';

test.describe('API - Room', () => {
  let matrix: MatrixApi;
  let userId: string;

  test.beforeAll(async () => {
    const userData = await loginWithNewUser();
    userId = userData.userId;
    matrix = userData.matrix;
  });

  test('Should create private room without access rules', async () => {
    const roomId = await matrix.createRoom({
      name: 'name',
      joinRule: 'invite',
      preset: 'private_chat',
      visibility: 'private',
    });
    expect(roomId).toBeDefined();

    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules).toBeDefined();
    expect(accessRules.rule).toBe('restricted');
    expect(accessRules.visibility).toBe('private');
    expect(accessRules.force_unencrypted_at_creation).toBe(undefined);
    expect(await matrix.isRoomEncrypted(roomId)).toBe(true);
    expect(await matrix.getJoinRule(roomId)).toBe('invite');
  });

  test('Should create public room without access rules', async () => {
    const roomId = await matrix.createRoom({
      name: 'name',
      joinRule: 'public',
      preset: 'public_chat',
      visibility: 'public',
    });
    expect(roomId).toBeDefined();

    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules).toBeDefined();
    expect(accessRules.rule).toBe('restricted');
    expect(accessRules.visibility).toBe('public');
    expect(accessRules.force_unencrypted_at_creation).toBe(undefined);
    expect(await matrix.isRoomEncrypted(roomId)).toBe(false);
    expect(await matrix.getJoinRule(roomId)).toBe('public');
  });

  test('Should create direct room without access rules', async () => {
    const roomId = await matrix.createRoom({
      name: 'name',
      joinRule: 'invite',
      preset: 'trusted_private_chat',
      visibility: 'private',
      is_direct: true,
    });
    expect(roomId).toBeDefined();

    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules).toBeDefined();
    expect(accessRules.rule).toBe('direct');
    expect(accessRules.visibility).toBe('private');
    expect(accessRules.force_unencrypted_at_creation).toBe(undefined);
    expect(await matrix.isRoomEncrypted(roomId)).toBe(true);
    expect(await matrix.getJoinRule(roomId)).toBe('invite');
  });

  test('Should return 403 error when updating visibility from private to public', async () => {
    const roomId = await createPrivateEncryptedRoom(matrix);
    
    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules.visibility).toBe('private');
    expect(accessRules.rule).toBe('restricted');

    //update visibility from private to public is forbidden
    await expectErrorWhenSendStateEvent(
      matrix,
      roomId,
      'im.vector.room.access_rules',
      { rule: 'restricted', visibility:'public' },
      403
    );
  });

  test('Should return 403 error when removing "public" visibility', async () => {
    const roomId = await createPublicRoom(matrix);
    
    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules.visibility).toBe('public');
    expect(accessRules.rule).toBe('restricted');

    //set a visibility when undefined should not be possible
    await expectErrorWhenSendStateEvent(
      matrix,
      roomId,
      'im.vector.room.access_rules',
      { rule: 'restricted', visibility :undefined },
      403
    );
  });

  test('Should return 403 error when changing force_unencrypted_at_creation', async () => {
    const roomId = await matrix.createRoom({
      name: 'name',
      joinRule: 'invite',
      preset: 'trusted_private_chat',
      is_direct: true,
    });
  
    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules.force_unencrypted_at_creation).toBe(undefined);

    await expectErrorWhenSendStateEvent(
      matrix,
      roomId,
      'im.vector.room.access_rules',
      { rule: 'restricted', force_unencrypted_at_creation:true },
      403
    );
  });

  test('Should keep access rules when upgrading room from v1 to V9', async () => {
    const roomId = await matrix.createRoom({
      name: "name",
      joinRule: 'invite',
      preset: 'private_chat',
      visibility: 'private',
      encryption: false,
      accessRules: {
        rule: 'unrestricted',
        force_unencrypted_at_creation: true,
        visibility: 'private',
      },
      room_version:"1"
    });
  
    const accessRules = await matrix.getAccessRules(roomId);
    expect(accessRules.rule).toBe('unrestricted');
    expect(accessRules.force_unencrypted_at_creation).toBe(true);
    expect(accessRules.visibility).toBe('private');

    const upgradeResponse = await matrix.upgradeRoom(roomId, "9");

    //check that access rule exists in the upgraded room with correct value
    const replacementRoomId = upgradeResponse.replacement_room;
    console.log("Ugraded room id", replacementRoomId)
    const upgradedAccessRules = await matrix.getAccessRules(replacementRoomId);
    expect(upgradedAccessRules.rule).toBe('unrestricted');
    expect(upgradedAccessRules.force_unencrypted_at_creation).toBe(true);
    expect(upgradedAccessRules.visibility).toBe('private');
    
  });

  test.afterAll(async () => {
    await deactivateMasUser(userId);
  });
});
