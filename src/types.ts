import {IncomingMessage} from "http";
import {Session, SessionData} from "express-session";

export type Scene = {
    lastUpdated: string;
    elements: readonly Element[]
}
export const PRECEDING_ELEMENT_KEY = "__precedingElement__";

export type Element = {
    version: number, versionNonce: number, isDeleted: boolean
    id: string,
    type: string,
    [PRECEDING_ELEMENT_KEY]?: string;
    updated: number,
    locked: boolean
}
export type WSEvent = {
    type: string, payload: {
        elements: Element[]
    }
}

export type User = {expires: number, profile: any, showExpiryWarningThresholdMs: number}
export type IncomingMessageEx = IncomingMessage & {session: any, user: any}
export type SessionEx = {messages?: string[], } & Session & Partial<SessionData>

export type Nil = null | undefined;