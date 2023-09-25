import process from 'process'
import path from 'path'

export const BASE_PATH = process.env.ENV_BASE_PATH || process.cwd()
export const DATA_PATH = path.resolve(BASE_PATH, 'data');
export const FILES_TEMP_PATH = path.resolve(DATA_PATH, 'files', 'temp');
export const FILES_PATH = path.resolve(DATA_PATH, 'files');
export const SQLITE_PATH = path.resolve(DATA_PATH, 'mydb.sqlite');
export const EXCALIDRAW_PATH = path.resolve(BASE_PATH, `excalidraw`);
export const SCENE_BACKUP_PATH = path.resolve(DATA_PATH, `backup`);

console.log('Paths', {BASE_PATH, DATA_PATH, FILES_TEMP_PATH, FILES_PATH, SQLITE_PATH, EXCALIDRAW_PATH, BACKUP_PATH: SCENE_BACKUP_PATH})

export const BUFFER_TIME = 5000;

// Server and Client constants that must be synced
// -------------------------------------------------------------------------------------------------------------------------
export const FILE_CACHE_MAX_AGE_SEC = 31536000;
export const DELETED_ELEMENT_TIMEOUT = 24 * 60 * 60 * 1000; // 1 day
export const FILE_UPLOAD_MAX_BYTES = 1024* 1024 * 3

// -------------------------------------------------------------------------------------------------------------------------