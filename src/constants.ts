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

export const PERSIST_BUFFER_TIME_MS = 10000;

// Server and Client constants that must be synced
// -------------------------------------------------------------------------------------------------------------------------
export const EXPIRES_IN_MS = 1000 * 60 * 60 * 12; // 12 hrs
export const REAUTHENTICATE_THRESHOLD_IN_MS = 1000 * 60 * 60 * 2; // 4 hours
export const SHOW_EXPIRY_WARNING_THRESHOLD_MS = 1000 * 60 * 10; // 5 minutes


// Server and Client constants that must be synced
// -------------------------------------------------------------------------------------------------------------------------
export const FILE_CACHE_MAX_AGE_SEC = 31536000;
export const DELETED_ELEMENT_TIMEOUT = 24 * 60 * 60 * 1000; // 1 day
export const FILE_UPLOAD_MAX_BYTES = 1024* 1024 * 9

// -------------------------------------------------------------------------------------------------------------------------