import {Element, Scene, WSEvent} from "./types";
import sqlite from "better-sqlite3";
import {migrate} from "./migrations";
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as fs from 'fs';
import {
    SCENE_BACKUP_PATH,
    PERSIST_BUFFER_TIME_MS,
    DATA_PATH,
    DELETED_ELEMENT_TIMEOUT, EXCALIDRAW_PATH,
    FILES_PATH,
    SQLITE_PATH
} from "./constants";
import {hasSceneChanged, reconcileElements} from "./reconciliation";

fs.mkdirSync(SCENE_BACKUP_PATH, {recursive: true})
fs.mkdirSync(DATA_PATH, {recursive: true})
fs.mkdirSync(FILES_PATH, {recursive: true})
fs.mkdirSync(EXCALIDRAW_PATH, {recursive: true})
fs.mkdirSync(EXCALIDRAW_PATH, {recursive: true})


const db = sqlite(SQLITE_PATH);
db.pragma('journal_mode = WAL');

migrate(db);

function getSplitPath(path: string) {
    const prefix = path.substring(0, 2);
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
        UPDATE SET SCENE=$scene, UPDATED_DATE=$timestamp;
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
        sceneBuffer[row.ROOM_ID] = JSON.parse(row.SCENE)
    }
}

function getRoom(roomId: string) {
    const record = db.prepare(`select * from SCENES where ROOM_ID = ?`).get(roomId) as any;
    if(record != null) {
        const scene: Scene = JSON.parse(record.SCENE);
        return scene;
    }
    return null;
}

const sceneBuffer: Record<string, Scene> = {};

const roomPersistQueue = new Set<string>();

function initialiseRoomBuffer(roomId: string) {
    if (!sceneBuffer[roomId]) {
        console.log('loading room from db', roomId);
        const scene = getRoom(roomId);
        if(scene != null) {
            sceneBuffer[roomId] = scene;
        }
    }
}

export const handleRoomUpdates = (roomId: string, elements: Element[]) => {
    initialiseRoomBuffer(roomId);
    if (!sceneBuffer[roomId]) {
            console.log('creating room ', roomId);
            sceneBuffer[roomId] = {lastUpdated: new Date().toJSON(), elements: []};
    } else {
        sceneBuffer[roomId].lastUpdated = new Date().toJSON();
    }

    const scene = sceneBuffer[roomId];

    const reconsiledElements = reconcileElements(scene.elements, elements);

    const updated = hasSceneChanged(scene.elements, reconsiledElements);
    if(updated) {
        scene.elements = reconsiledElements;
    }

    if (updated && !roomPersistQueue.has(roomId)) {
        roomPersistQueue.add(roomId);
        setTimeout(() => persist(roomId), PERSIST_BUFFER_TIME_MS)
    }
}

async function persist(roomID: string) {
    initialiseRoomBuffer(roomID);
    const scene = sceneBuffer[roomID];

    if (scene) {
        // remove deleted elements
        const deleteBeforeDate = Date.now() - DELETED_ELEMENT_TIMEOUT;
        scene.elements = scene.elements.filter(ele => !ele.isDeleted || ele.updated > deleteBeforeDate)

        await saveToDb(roomID, scene);
    }

    roomPersistQueue.delete(roomID);
}

export function getElements(roomID: string) {
    initialiseRoomBuffer(roomID);
    const scene = sceneBuffer[roomID];
    if (scene == null) return null;
    return scene.elements || [];
}
