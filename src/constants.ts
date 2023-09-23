export const DATA_PATH = './data';
export const FILES_TEMP_PATH = `${DATA_PATH}/files/temp`;
export const FILES_PATH = `${DATA_PATH}/files`;
export const SQLITE_PATH = `${DATA_PATH}/mydb.sqlite`;
export const EXCALIDRAW_PATH = `excalidraw`;

export const BUFFER_TIME = 5000;

// Server and Client constants that must be synced
// -------------------------------------------------------------------------------------------------------------------------
export const FILE_CACHE_MAX_AGE_SEC = 31536000;
export const DELETED_ELEMENT_TIMEOUT = 24 * 60 * 60 * 1000; // 1 day
export const FILE_UPLOAD_MAX_BYTES = 1024* 1024 * 3

// -------------------------------------------------------------------------------------------------------------------------