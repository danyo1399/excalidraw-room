import {getElements, getFilePath, handleData, roomExists, saveFile} from "./data";
import {FILE_CACHE_MAX_AGE_SEC, FILE_UPLOAD_MAX_BYTES, FILES_TEMP_PATH} from "./constants";
import express from "express";
import multer from "multer";
import {isAuthenticated} from "./passport";

const upload = multer({dest: FILES_TEMP_PATH, limits: {fileSize: FILE_UPLOAD_MAX_BYTES, files: 1}})

export const apiRoutes = express.Router()
apiRoutes.use((req, res, next) => {
    if(!isAuthenticated(req.user)) {
        res.status(401);
        res.end();
    } else {
        next();
    }
})

apiRoutes.post('/rooms/:roomId/files/:fileId', upload.single('file'), async function (req, res, next) {
    const exists = roomExists(req.params.roomId);
    if (!exists) {
        res.status(404);
        res.end();
        return;
    }

    await saveFile(req.file!.path, req.params.roomId, req.params.fileId);
    res.status(200);
    res.end();
})
apiRoutes.get('/rooms/:roomId/elements', (req, res, next) => {
    const elements = getElements(req.params.roomId)
    res.json(elements);
    res.end();
})

apiRoutes.put('/rooms/:roomId/elements', (req, res, next) => {
    const elements = req.body;
    const {roomId} = req.params;
    handleData(roomId, elements)
    res.end();
})
apiRoutes.get('/rooms/:roomId/files/:fileId', upload.single('file'), async function (req, res, next) {
    const {roomId, fileId} = req.params;
    const exists = roomExists(roomId);
    if (!exists) {
        res.status(404);
        res.end();
        return;
    }

    res.sendFile(getFilePath(roomId, fileId), {
        headers: {
            'content-type': 'application/octet-stream',
            'cache-control': `public, max-age=${FILE_CACHE_MAX_AGE_SEC}`
        }
    })
});