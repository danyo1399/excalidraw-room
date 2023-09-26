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

