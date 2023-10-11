require("dotenv").config(
    process.env.NODE_ENV !== "development"
        ? {path: ".env.production"}
        : {path: ".env"},
);
import debug from "debug";
import express from "express";
import http from "http";
import {EXCALIDRAW_PATH} from "./constants";
import cors from "cors";
import bodyParser from "body-parser";
import {shouldReauthenticate, usePassport} from "./passport";
import {useSocketIo} from "./useSocketIO";
import {apiRoutes} from "./useApiRoutes";
import proxy from 'express-http-proxy';

const serverDebug = debug("server");


const port =
    process.env.PORT || (process.env.NODE_ENV !== "development" ? 80 : 3002); // default port to listen

console.log('using port', port)

const app = express();
app.use(cors({}))
app.use(bodyParser.json({limit: '5mb'}))


const passport = usePassport(app);

app.use('/api', apiRoutes);

app.use((req, res, next) => {
    if (shouldReauthenticate(req.user)) {
        // set url to redirect to when logging in.
        const url = req.originalUrl || req.url;
        (req.session as any).returnTo = url;
        return res.redirect('/auth/login')
    } else {
        next();
    }
})
// proxy requests directly through to webpack dev server running on excalidraw repo when running locally
if (process.env.NODE_ENV === 'development') {
    app.use('/', proxy('localhost:3000'))
} else {
    app.use(express.static(EXCALIDRAW_PATH))
}

app.use(function (err: any, req: any, res: any, next: any) {
    // set locals, only providing error in development
    console.error('unhandled error occurred', err);
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.end('Error')
    res.end();
});

const server = http.createServer(app);


server.listen(port, () => {
    serverDebug(`listening on port: ${port}`);
});

useSocketIo(server, passport);
