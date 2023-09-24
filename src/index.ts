import debug from "debug";
import express from "express";
import http from "http";
import {Server as SocketIO} from "socket.io";
import {getElements, getFilePath, handleData, roomExists, saveFile} from "./data";
import {createSceneInitEvent} from "./events";
import multer from "multer";
import {EXCALIDRAW_PATH, FILE_CACHE_MAX_AGE_SEC, FILE_UPLOAD_MAX_BYTES, FILES_PATH, FILES_TEMP_PATH} from "./constants";

import cors from "cors";
import {WSEvent} from "./types";
import bodyParser from "body-parser";

const upload = multer({dest: FILES_TEMP_PATH, limits: {fileSize: FILE_UPLOAD_MAX_BYTES, files: 1}})

const serverDebug = debug("server");
const ioDebug = debug("io");
const socketDebug = debug("socket");


require("dotenv").config(
    process.env.NODE_ENV !== "development"
        ? {path: ".env.production"}
        : {path: ".env.development"},
);

const app = express();
const port =
    process.env.PORT || (process.env.NODE_ENV !== "development" ? 80 : 3002); // default port to listen

console.log('using port', port)

app.use(cors({}))
app.use(express.static("public"));
app.use(bodyParser.json())

app.post('/rooms/:roomId/files/:fileId', upload.single('file'), async function (req, res, next) {
    const exists = await roomExists(req.params.roomId);
    if (!exists) {
        res.status(404);
        res.end();
        return;
    }

    await saveFile(req.file!.path, req.params.roomId, req.params.fileId);
    res.status(200);
    res.end();
})
app.get('/rooms/:roomId/elements', (req, res, next) => {
    const elements = getElements(req.params.roomId)
    res.json(elements);
    res.end();
})

app.put('/rooms/:roomId/elements', (req, res, next) => {
    const elements = req.body;
    const {roomId} = req.params;
    // console.log('elements', elements);
    handleData(roomId, elements)
    res.end();
})
    app.get('/rooms/:roomId/files/:fileId', upload.single('file'), async function (req, res, next) {
    const {roomId, fileId} = req.params;
    const exists = roomExists(roomId);
    if (!exists) {
        res.status(404);
        res.end();
        return;
    }

    //await saveFile(req.file!.path, req.params.roomId, req.params.fileId);

    res.sendFile(getFilePath(roomId, fileId), {headers: {'content-type': 'application/octet-stream', 'cache-control': `public, max-age=${FILE_CACHE_MAX_AGE_SEC}`}})

})
app.use(express.static(EXCALIDRAW_PATH))
// app.get("/", (req, res) => {
//
// });

const server = http.createServer(app);


server.listen(port, () => {
    serverDebug(`listening on port: ${port}`);
});

try {
    const io = new SocketIO(server, {
        transports: ["websocket", "polling"],
        cors: {
            allowedHeaders: ["Content-Type", "Authorization"],
            origin: process.env.CORS_ORIGIN || "*",
            credentials: true,
        },
        allowEIO3: true,
    });

    io.on("connection", (socket) => {
        ioDebug("connection established!");
        io.to(`${socket.id}`).emit("init-room");
        socket.on("join-room", async (roomID) => {
            socketDebug(`${socket.id} has joined ${roomID}`);
            await socket.join(roomID);
            const sockets = await io.in(roomID).fetchSockets();
            console.log(`socket ${socket.id} joining room ${roomID}`)
            if (sockets.length <= 1) {
                io.to(`${socket.id}`).emit("first-in-room");
                // load elements for first user in room.
                // io.to(`${socket.id}`).emit('client-broadcast', JSON.stringify(createSceneInitEvent(getElements(roomID))));
            } else {
                socketDebug(`${socket.id} new-user emitted to room ${roomID}`);
                socket.broadcast.to(roomID).emit("new-user", socket.id);
            }

            io.in(roomID).emit(
                "room-user-change",
                sockets.map((socket) => socket.id),
            );
        });

        socket.on(
            "server-broadcast",
            (roomID: string, encryptedData: string, iv: Uint8Array) => {
                const data = JSON.parse(encryptedData) as WSEvent;
                handleData(roomID, data.payload.elements);
                socketDebug(`${socket.id} sends update to ${roomID}`);
                socket.broadcast.to(roomID).emit("client-broadcast", encryptedData, iv);
            },
        );

        socket.on(
            "server-volatile-broadcast",
            (roomID: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
                socketDebug(`${socket.id} sends volatile update to ${roomID}`);
                socket.volatile.broadcast
                    .to(roomID)
                    .emit("client-broadcast", encryptedData, iv);
            },
        );

        socket.on("disconnecting", async () => {
            socketDebug(`${socket.id} has disconnected`);
            for (const roomID in socket.rooms) {
                const otherClients = (await io.in(roomID).fetchSockets()).filter(
                    (_socket) => _socket.id !== socket.id,
                );

                if (otherClients.length > 0) {
                    socket.broadcast.to(roomID).emit(
                        "room-user-change",
                        otherClients.map((socket) => socket.id),
                    );
                }
            }
        });

        socket.on("disconnect", () => {
            socket.removeAllListeners();
            socket.disconnect();
        });
    });
} catch (error) {
    console.error(error);
}