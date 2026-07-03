import { createClient, type StateEvents, type MatrixClient, EventType } from 'matrix-js-sdk';

export interface AccessRules {
  rule: 'restricted' | 'direct' | 'unrestricted';
  force_unencrypted_at_creation?: boolean;
  visibility?: 'public' | 'private';
}

export interface RoomCreationOptions {
  name: string;
  topic?: string;
  accessRules?: AccessRules;
  encryption?: boolean;
  visibility?: 'public' | 'private';
  joinRule?: 'invite' | 'knock' | 'public' | 'private';
  preset: 'public_chat' | 'private_chat' | 'trusted_private_chat';
  is_direct?: boolean;
  power_level_content_override?: any;
  creation_content?: any;
  room_version?: string;
  retention_max_lifetime?: number;
}

export const AccessRulesEventType = 'im.vector.room.access_rules';

export class MatrixApi {
  private client: MatrixClient;
  private matrixUrl: string;

  public constructor(matrixUrl: string, masUrl: string) {
    this.matrixUrl = matrixUrl;
    // create client with MAS URL to ease local login on preprod server
    this.client = createClient({
      baseUrl: `${masUrl}`,
    });
  }

  /**
   * Login a user
   * @
   */
  public async login(username: string, password: string): Promise<string> {
    const response = await this.client.loginRequest({
      type: 'm.login.password',
      user: username,
      password: password,
    });

    // Create a new MatrixClient instance with the token
    this.client = createClient({
      baseUrl: `${this.matrixUrl}`,
      accessToken: response.access_token,
      userId: response.user_id,
      deviceId: response.device_id,
    });

    return response.user_id;
  }

  /**
   * Create a room
   */
  public async createRoom(options: RoomCreationOptions): Promise<string> {
    const initialState: any[] = [];

    // Add join_rule
    if (options.joinRule) {
      initialState.push({
        type: EventType.RoomJoinRules,
        state_key: '',
        content: { join_rule: options.joinRule },
      });
    }

    // Add access control rules
    if (options.accessRules) {
      const content: any = {};
      if (options.accessRules.rule) {
        content.rule = options.accessRules.rule;
      }
      if (options.accessRules.force_unencrypted_at_creation !== undefined) {
        content.force_unencrypted_at_creation = options.accessRules.force_unencrypted_at_creation;
      }
      if (options.accessRules.visibility) {
        content.visibility = options.accessRules.visibility;
      }

      initialState.push({
        type: AccessRulesEventType,
        state_key: '',
        content: content,
      });
    }

    if (options.retention_max_lifetime) {
      initialState.push({
        type: 'm.room.retention',
        state_key: '',
        content: { max_lifetime: options.retention_max_lifetime },
      });
    }

    const response = await this.client.createRoom({
      name: options.name,
      topic: options.topic,
      visibility: options.visibility as any,
      preset: options.preset as any,
      initial_state: initialState as any,
      is_direct: options.is_direct,
      power_level_content_override: options.power_level_content_override,
      creation_content: options.creation_content,
      room_version: options.room_version,
    });

    return response.room_id;
  }

  public async upgradeRoom(
    roomId: string,
    newVersion: string
  ): Promise<{
    replacement_room: string;
  }> {
    return await this.client.upgradeRoom(roomId, newVersion);
  }


  /**
   * Check if room is encrypted
   */
  public async isRoomEncrypted(roomId: string): Promise<boolean> {
    try {
      return await this.client.getStateEvent(roomId, EventType.RoomEncryption, '') !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get join rule
   */
  public async getJoinRule(roomId: string): Promise<string | null> {
    try {
      return (await this.client.getStateEvent(roomId, EventType.RoomJoinRules, ''))?.join_rule || null;
    } catch (e) {
      console.log('event join rules not found');
      return null;
    }
  }

  /**
   * Get access rules
   */
  public async getAccessRulesEvent(roomId: string): Promise<Record<string, any> | null> {
    try {
      return await this.client.getStateEvent(roomId, AccessRulesEventType, '');
    } catch (e) {
      console.log('event access rules not found');
      return null;
    }
  }

  /**
   * Get room retention
   */
  public async getRoomRetentionEvent(roomId: string): Promise<Record<string, any> | null> {
    try {
      return await this.client.getStateEvent(roomId, 'm.room.retention', '');
    } catch (e) {
      console.log('event room retention not found');
      return null;
    }
  }

  /**
   * Send a state event to a room
   */
  public async sendStateEvent<K extends keyof StateEvents>(
    roomId: string,
    eventType: K,
    content: StateEvents[K],
    stateKey: string = ''
  ): Promise<any> {
    return this.client.sendStateEvent(roomId, eventType, content, stateKey);
  }

  /**
   * Logout
   */
  public async logout(): Promise<void> {
    await this.client.logout();
  }

  /**
   * get authenticated Matrix client
   * @returns MatrixClient
   */
  public getClient() {
    return this.client;
  }
}
