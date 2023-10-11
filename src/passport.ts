import passport from 'passport';
import session, {Session, SessionData} from 'express-session';

import OpenIDConnectStrategy from 'passport-openidconnect';
import {Express} from "express";
import {IncomingMessage} from "http";
import {Nil, SessionEx, User} from "./types";
import {config} from "./config";
import {EXPIRES_IN_MS, REAUTHENTICATE_THRESHOLD_IN_MS, SHOW_EXPIRY_WARNING_THRESHOLD_MS} from "./constants";


function getDisplayName(str: string) {
    const idx = str.indexOf('@');
    if (idx === -1) return str;
    return str.substring(0, idx)
}

passport.use(new OpenIDConnectStrategy({
            // azure dev ad
            issuer: config.auth.issuer,
            authorizationURL: config.auth.authorizationURL,
            tokenURL: config.auth.tokenURL,
            userInfoURL: config.auth.userInfoURL,
            clientID: config.auth.clientID,
            clientSecret: config.auth.clientSecret,
            callbackURL: config.auth.callbackUrl,
            scope: config.auth.scopes
        },
        function verify(issuer: any, profile: any, cb: any) {
            console.log('lol verify', {issuer, profile})
            const user: User = {
                profile: {displayName: profile.displayName || getDisplayName(profile.username), ...profile},
                expires: Date.now() + EXPIRES_IN_MS,
                showExpiryWarningThresholdMs: SHOW_EXPIRY_WARNING_THRESHOLD_MS
            };

            return cb(null, user)
        })
)

passport.serializeUser(function (user, done) {
    process.nextTick(() => {
        done(null, user);
    })
});

passport.deserializeUser(function (user, done) {
    process.nextTick(() => {
        return done(null, user as any);
    })

});


export function isAuthenticated(user: any | Nil) {
    const typedUser: User = user;
    return Date.now() < (typedUser?.expires || 0)
}

export function shouldReauthenticate(user: any | Nil) {
    const typedUser: User = user;
    const timeLeft = (typedUser?.expires || 0) - Date.now()
    return timeLeft < REAUTHENTICATE_THRESHOLD_IN_MS
}


export const sessionMiddleware = session({
    secret: config.secretKey,
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored

});

export function usePassport(app: Express) {

    app.use(passport.initialize());
    app.use(sessionMiddleware);
    app.use(passport.authenticate('session'));


    app.use(function (req, res, next) {
        const session = req.session as SessionEx;
        const msgs = session.messages || [];
        res.locals.messages = msgs;
        res.locals.hasMessages = !!msgs.length;
        session.messages = [];
        next();
    });


    app.get('/auth/login', passport.authenticate('openidconnect'));

    app.use('/auth/callback', (req, res, next) => {
        // for some reason the auth callback verify wipes the session
        (req as any).returnTo = (req as any).session.returnTo

        next()
    })
    app.get('/auth/callback',
        passport.authenticate('openidconnect', {
            failureRedirect: '/auth/failed', failureMessage: true,
        }), (req, res) => {

            res.redirect((req as any).returnTo || '/')
        }
    )

    app.get('/auth/failed', (req, res) => {
        const anyReq: any = req;
        res.send(anyReq?.session?.messages.join() || 'Something went wrong')
    })

    app.get('/auth/user', (req, res) => {
            res.json({...req.user, isAuthenticated: !!isAuthenticated(req.user)})
        },
    )

    return passport;
}