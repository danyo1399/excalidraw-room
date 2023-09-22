import {getElements} from "./data";
import {Element} from "./types";

export function createSceneInitEvent(elements: Element[]) {
    return {type: 'SCENE_INIT', payload: {elements}}
}