import {Element, Scene, WSEvent} from "./types";
import sqlite from "better-sqlite3";
import {migrate} from "./migrations";
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as fs from 'fs';
import {
    BUFFER_TIME,
    DATA_PATH,
    DELETED_ELEMENT_TIMEOUT, EXCALIDRAW_PATH,
    FILES_PATH,
    SQLITE_PATH
} from "./constants";


fs.mkdirSync(DATA_PATH, {recursive: true})
fs.mkdirSync(FILES_PATH, {recursive: true})
fs.mkdirSync(EXCALIDRAW_PATH, {recursive: true})


const db = sqlite(SQLITE_PATH);
db.pragma('journal_mode = WAL');

migrate(db);


export async function saveFile(path: string, roomId: string, fileId: string) {
    await fsp.rename(path, `${FILES_PATH}/${roomId}_${fileId}`)
}

export function getFilePath(roomId: string, fileId: string) {
    return path.resolve(`${FILES_PATH}/${roomId}_${fileId}`);
}

async function saveToDb(roomID: string, scene: Scene) {
    db.prepare(`
        INSERT INTO SCENES(ROOM_ID, ELEMENTS, UPDATED_DATE)
        VALUES ($room, $elements, $timestamp) ON CONFLICT(ROOM_ID) DO
        UPDATE SET ELEMENTS=$elements;
    `).run({room: roomID, elements: JSON.stringify(scene), timestamp: Date.now()})
}


export function roomExists(roomID: string) {
    return !!db.prepare(`select 1 room_exists
                         from SCENES
                         where ROOM_ID = ?`).get(roomID)
}


function loadAll() {
    const scenes: { ROOM_ID: string, ELEMENTS: string }[] = db.prepare(`select *
                                                                        from SCENES`).all() as any;
    for (let row of scenes) {
        buffer[row.ROOM_ID] = JSON.parse(row.ELEMENTS)
    }
}

const buffer: Record<string, Scene> = {};
loadAll();

const timers = new Set<string>();
export const handleData = (roomId: string, elements: Element[]) => {

    if (!buffer[roomId]) {
        console.log('creating room ', roomId);
        buffer[roomId] = {lastUpdated: new Date().toJSON(), elements: {}};
    } else {
        buffer[roomId].lastUpdated = new Date().toJSON();
    }
    const scene = buffer[roomId];
    let updated = false;
    for (const remote of elements) {
        const local = scene.elements[remote.id];

        const shouldDiscard = local != null &&
            (
                local.version > remote.version ||
                // resolve conflicting edits deterministically by taking the one with
                // the lowest versionNonce
                (local.version === remote.version && local.versionNonce < remote.versionNonce)
            );

        if (!shouldDiscard) {
            scene.elements[remote.id] = remote;
            updated = true;
        }
    }
    if (updated && !timers.has(roomId)) {
        timers.add(roomId);
        setTimeout(() => persist(roomId), BUFFER_TIME)
    }
}

async function persist(roomId: string) {
    const scene = buffer[roomId];

    if (scene) {
        // remove deleted elements
        const deleteBeforeDate = Date.now() - DELETED_ELEMENT_TIMEOUT;
        const elements = Object.values(scene.elements);
        for (const ele of elements) {
            if (ele.isDeleted && ele.updated < deleteBeforeDate) {
                console.log('lol deleting ele', ele.id)
                delete scene.elements[ele.id];
            }
        }

        await saveToDb(roomId, scene);
        // console.log('lol this is where we do the db save', {roomId, elements: Object.values(scene.elements).map(getElementSubset)})
    }

    timers.delete(roomId);
}

export function getElements(roomID: string) {
    const scene = buffer[roomID];
    if (scene == null) return null;
    return Object.values(scene.elements);
}

function getElementSubset(ele: Element) {
    return {id: ele.id, version: ele.version, updated: ele.updated, isDeleted: ele.isDeleted,}
}