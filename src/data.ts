const BUFFER_TIME = 5000;
type Element = {
    version: number, versionNonce: number, isDeleted: boolean
    id: string,
    type: string,
    __precedingElement__: string;
    updated: string,
    locked: boolean
}
export type WSEvent = {
    type: string, payload: {
        elements: Element[]
    }
}

const buffer: Record<string, Record<string, Element>> = {};
const timers = new Set<string>();
export const handleData = (roomId: string, evt: WSEvent) => {

    if (!buffer[roomId]) {
        buffer[roomId] = {};
    }
    const scene = buffer[roomId];
    let updated = false;
    for (const ele of evt.payload.elements) {
        if (!scene[ele.id] ||
            scene[ele.id].version < ele.version ||
            (scene[ele.id].version == ele.version && scene[ele.id].versionNonce < ele.versionNonce)) {
            scene[ele.id] = ele;
            updated = true;
        }
    }
    if(updated && !timers.has(roomId)) {
        timers.add(roomId);
        setTimeout(() => persist(roomId), BUFFER_TIME )
    }
}

function persist(roomId: string) {
    const scene = buffer[roomId];
    if(scene) {
        console.log('lol this is where we do the db save', {roomId, scene: Object.keys(scene)})
    }

timers.delete(roomId);
}