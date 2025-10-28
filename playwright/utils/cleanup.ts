import { AdminApi } from "./api-admin";

export enum CLEANUP {
    ROOM = "room",
}

const cleanRoom = (adminAPi: AdminApi, roomId, roomName) => {

}


export const cleanupList = {
  room: cleanRoom,
};
