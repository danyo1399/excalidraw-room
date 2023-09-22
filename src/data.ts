import {Element, Scene, WSEvent} from "./types";
import { Database } from "bun:sqlite";
import {migrate} from "./migrations";
import * as fs from 'fs';

fs.mkdirSync('./data', {recursive: true})
const dbPath = './data/mydb.sqlite';
const BUFFER_TIME = 5000;
const db: Database = new Database(dbPath);

migrate(db);



async function saveToDb(roomID: string, scene: Scene) {
    db.run(`
    INSERT INTO SCENES(ROOM_ID, ELEMENTS, UPDATED_DATE) VALUES($room, $elements, $timestamp )
  ON CONFLICT(ROOM_ID) DO UPDATE SET ELEMENTS=$elements;
    `, {$room: roomID, $elements: JSON.stringify(scene), $timestamp: Date.now()})
}


function loadAll() {
    const scenes = db.query(`select * from SCENES`).all();
    for(let row of scenes) {
        buffer[row.ROOM_ID] =JSON.parse(row.ELEMENTS)
    }
}

const buffer: Record<string, Scene> = {};
loadAll();

const timers = new Set<string>();
export const handleData = (roomId: string, evt: WSEvent) => {

    if (!buffer[roomId]) {
        buffer[roomId] = {lastUpdated: new Date().toJSON(), elements: {}};
    } else {
        buffer[roomId].lastUpdated = new Date().toJSON();
    }
    const scene = buffer[roomId];
    let updated = false;
    for (const remote of evt.payload.elements) {
        const local = scene.elements[remote.id];

        if (!local ||
            local.version < remote.version ||
            (local.version == remote.version && local.versionNonce > remote.versionNonce)) {
            scene.elements[remote.id] = remote;
            updated = true;
        }
    }
    if(updated && !timers.has(roomId)) {
        timers.add(roomId);
        setTimeout(() => persist(roomId), BUFFER_TIME )
    }
}

async function persist(roomId: string) {
    const scene = buffer[roomId];
    if(scene) {
        await saveToDb(roomId, scene);
        console.log('lol this is where we do the db save', {roomId, scene})
    }

timers.delete(roomId);
}

export function getElements(roomID: string) {
    const scene = buffer[roomID];

    if(scene) return Object.values(scene.elements);
    return []
}