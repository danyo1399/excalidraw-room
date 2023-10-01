import {Server as SocketIO} from "socket.io";
import {isAuthenticated, sessionMiddleware} from "./passport";
import {IncomingMessageEx, WSEvent} from "./types";
import {handleData} from "./data";
import debug from "debug";
import http from "http";
import {PassportStatic} from "passport";


const ioDebug = debug("io");
const socketDebug = debug("socket");
export function useSocketIo(server: http.Server, passport: PassportStatic) {



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
        io.engine.use(sessionMiddleware);
        io.engine.use(passport.session());
        io.use((socket, next) => {
            const req = socket.request as IncomingMessageEx;

            if(isAuthenticated(req.user)) {

                socket.use((__, next) => {
                    if(isAuthenticated(req.user)) {
                        return next();
                    } else {
                        socket.disconnect();
                        return next();
                    }
                });
                return next();
            } else {
                return next(new Error("thou shall not pass"));
            }
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
}