import {Element, WSEvent} from "./types";
import { Database } from "bun:sqlite";

const BUFFER_TIME = 5000;
const db = new Database("mydb.sqlite");

db.run(`create table if not exists SCENES
(
    ROOM_ID  TEXT
        constraint SCENES_pk
            primary key,
    ELEMENTS TEXT
);

`)

async function saveToDb(roomID: string, elements: Record<string, Element>) {
    db.run(`
    INSERT INTO SCENES(ROOM_ID, ELEMENTS) VALUES($room, $elements)
  ON CONFLICT(ROOM_ID) DO UPDATE SET ELEMENTS=$elements;
    `, {$room: roomID, $elements: JSON.stringify(elements)})
}


function loadAll() {
    const scenes = db.query(`select * from SCENES`).all();
    console.log('loaded', scenes)
    for(let row of scenes) {
        buffer[row.ROOM_ID] =JSON.parse(row.ELEMENTS)
    }
}

const buffer: Record<string, Record<string, Element>> = {};
loadAll();

const timers = new Set<string>();
export const handleData = (roomId: string, evt: WSEvent) => {

    if (!buffer[roomId]) {
        buffer[roomId] = {};
    }
    const scene = buffer[roomId];
    let updated = false;
    for (const ele of evt.payload.elements) {
        if (!scene[ele.id] ||
            scene[ele.id].version < ele.version ||
            (scene[ele.id].version == ele.version && scene[ele.id].versionNonce < ele.versionNonce)) {
            scene[ele.id] = ele;
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
    console.log('lol getting elements', {scene, roomID})

    if(scene) return Object.values(scene);
    return []
}