import {Element, Scene, WSEvent} from "./types";
import sqlite from "better-sqlite3";
import {migrate} from "./migrations";
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as fs from 'fs';
import {
    SCENE_BACKUP_PATH,
    BUFFER_TIME,
    DATA_PATH,
    DELETED_ELEMENT_TIMEOUT, EXCALIDRAW_PATH,
    FILES_PATH,
    SQLITE_PATH
} from "./constants";

fs.mkdirSync(SCENE_BACKUP_PATH, {recursive: true})
fs.mkdirSync(DATA_PATH, {recursive: true})
fs.mkdirSync(FILES_PATH, {recursive: true})
fs.mkdirSync(EXCALIDRAW_PATH, {recursive: true})
fs.mkdirSync(EXCALIDRAW_PATH, {recursive: true})


const db = sqlite(SQLITE_PATH);
db.pragma('journal_mode = WAL');

migrate(db);

function getSplitPath(path: string) {
    const prefix = path.substring(0,2);
    const suffix = path.substring(2);
    return {prefix, suffix, path: `${prefix}/${suffix}`}
}
export async function saveFile(path: string, roomId: string, fileId: string) {
    const parts = getSplitPath(roomId);
    const basePath = `${FILES_PATH}/${parts.prefix}`
    await fsp.mkdir(basePath, {recursive: true})
    await fsp.rename(path, `${basePath}/${roomId}_${fileId}`)
}

export function getFilePath(roomId: string, fileId: string) {
    const parts = getSplitPath(roomId);
    const basePath = `${FILES_PATH}/${parts.prefix}`
    return path.resolve(`${basePath}/${roomId}_${fileId}`);
}

async function saveToDb(roomID: string, scene: Scene) {
    const sceneJson = JSON.stringify(scene);
    db.prepare(`
        INSERT INTO SCENES(ROOM_ID, SCENE, UPDATED_DATE)
        VALUES ($room, $scene, $timestamp) ON CONFLICT(ROOM_ID) DO
        UPDATE SET SCENE=$scene;
    `).run({room: roomID, scene: sceneJson, timestamp: Date.now()})

    const parts = getSplitPath(roomID);
    const basePath = `${SCENE_BACKUP_PATH}/${parts.prefix}`
    await fsp.mkdir(basePath, {recursive: true})
    await fsp.writeFile(`${basePath}/${roomID}.json`, sceneJson)

}


export function roomExists(roomID: string) {
    return !!db.prepare(`select 1 room_exists
                         from SCENES
                         where ROOM_ID = ?`).get(roomID)
}


function loadAll() {
    const scenes: { ROOM_ID: string, SCENE: string }[] = db.prepare(`select *
                                                                        from SCENES`).all() as any;
    for (let row of scenes) {
        buffer[row.ROOM_ID] = JSON.parse(row.SCENE)
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
    let preceedingElementId = '^';
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

        scene.elements[remote.id].__precedingElement__ = preceedingElementId;

        preceedingElementId = remote.id;
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