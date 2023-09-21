import {getElements} from "./data";

export function createSceneInitEvent(elements: any) {
    return {type: 'SCENE_INIT', payload: {elements}}
}