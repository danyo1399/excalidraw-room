export type Scene = {
    lastUpdated: string;
    elements: Record<string, Element>
}
export type Element = {
    version: number, versionNonce: number, isDeleted: boolean
    id: string,
    type: string,
    __precedingElement__: string;
    updated: number,
    locked: boolean
}
export type WSEvent = {
    type: string, payload: {
        elements: Element[]
    }
}