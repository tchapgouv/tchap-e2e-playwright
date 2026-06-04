import { createClient, type StateEvents, type MatrixClient } from 'matrix-js-sdk';

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
  power_level_content_override?:any
  creation_content?:any
  room_version?:string;
}

export class MatrixApi {
  private client: MatrixClient;
  private baseUrl: string;

  public constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.client = createClient({
      baseUrl: `${baseUrl}`,
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
      baseUrl: `${this.baseUrl}`,
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
        type: 'm.room.join_rules',
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
        type: 'im.vector.room.access_rules',
        state_key: '',
        content: content,
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
      room_version: options.room_version
    });

    return response.room_id;
  }

  public async upgradeRoom(roomId: string,  newVersion: string): Promise<{
    replacement_room: string;
}> {
     return await this.client.upgradeRoom(roomId, newVersion);
  }


  /**
   * Get room state
   */
  public async getRoomState(roomId: string): Promise<Record<string, any>> {
    const state: Record<string, any> = {};

    const eventTypes = [
      'm.room.encryption',
      'm.room.join_rules',
      'im.vector.room.access_rules',
      'm.room.create',
      'm.room.name',
    ];

    for (const eventType of eventTypes) {
      try {
        const event = await this.client.getStateEvent(roomId, eventType, '');
        state[eventType] = event;
      } catch (e) {
        console.log('event not found', eventType);
      }
    }

    return state;
  }

  /**
   * Check if room is encrypted
   */
  public async isRoomEncrypted(roomId: string): Promise<boolean> {
    const state = await this.getRoomState(roomId);
    return 'm.room.encryption' in state;
  }

  /**
   * Get join rule
   */
  public async getJoinRule(roomId: string): Promise<any> {
    const state = await this.getRoomState(roomId);
    return state['m.room.join_rules']?.join_rule || null;
  }

  /**
   * Get access rules
   */
  public async getAccessRules(roomId: string): Promise<any> {
    const state = await this.getRoomState(roomId);
    return state['im.vector.room.access_rules'] || null;
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
  public getClient(){
    return this.client;
  }

 }
