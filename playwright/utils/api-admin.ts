import { Credentials } from "./api";
import { ADMIN_PASSWORD, ADMIN_USERNAME } from "./config";

/**
 * A client-server API for interacting with a Matrix homeserver.
 */
export class AdminApi {
  private static instance: AdminApi | null = null;
  private baseUrl: string;
  private adminUri: string;
  private credentials: Omit<Credentials, "homeserverBaseUrl">;

  private isInitialized = false;

  public constructor(baseUrl: string) {
    this.adminUri = `${baseUrl}/_synapse/admin`;
    this.baseUrl = baseUrl;
    this.credentials = {
      password: ADMIN_PASSWORD,
      accessToken: "",
      userId: "",
      deviceId: '',
      homeServer: "",
      username: ADMIN_USERNAME,
    };
  }

  public static getInstance(baseUrl: string) {
    if (!AdminApi.instance) {
      AdminApi.instance = new AdminApi(baseUrl);
    }
    return AdminApi.instance;
  }

  /**
   * Initialize the AdminApi with credentials (called only once)
   * we dont use apirequestcontext since it is the user outside of the connected one
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    // Fetch or set credentials here
    // Example: login and get admin credentials
    try {
      const response = await fetch(`${this.baseUrl}/_matrix/client/v3/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "m.login.password",
          identifier: {
            type: "m.id.user",
            user: ADMIN_USERNAME,
          },
          password: ADMIN_PASSWORD,
        }),
      });

      const json = await response.json();
      this.credentials = {
        password: ADMIN_PASSWORD,
        accessToken: json.access_token,
        userId: json.user_id,
        deviceId: json.device_id,
        homeServer:
          json.home_server || json.user_id.split(":").slice(1).join(":"),
        username: ADMIN_USERNAME,
      };

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize AdminApi:", error);
      throw error;
    }
  }

  /**
   * Delete a room
   * @param roomId - The user ID to register.
   */
  public async deleteRoom(
    roomId: string,
    roomName: string
  ): Promise<Omit<Credentials, "homeserverBaseUrl">> {
    const json = await fetch(`${this.adminUri}/v1/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.credentials.accessToken}`,
      },
      body: JSON.stringify({
        new_room_user_id: roomId,
        room_name: roomName,
        message: "Clean up room",
        block: true,
        purge: true,
      }),
    });

    const result = await json.json();
    console.log("result", result);

    return result;
  }
}
