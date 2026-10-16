import type { Cue } from './catalog.js';
/** Authored material impressions, not recordings or physically calibrated models. */
export declare const MATERIAL_FAMILIES: readonly [{
    readonly id: "felt";
    readonly name: "Felt / Wood";
    readonly description: "Padded contacts and dry wooden body resonances.";
}, {
    readonly id: "porcelain";
    readonly name: "Porcelain";
    readonly description: "Fine contacts with a small, inharmonic ceramic ring.";
}, {
    readonly id: "elastic";
    readonly name: "Elastic";
    readonly description: "Soft tension, a rounded bend, and a controlled return.";
}];
export type MaterialFamilyId = (typeof MATERIAL_FAMILIES)[number]['id'];
export declare const MATERIAL_ROLES: readonly ["press", "release", "toggle", "confirm", "error", "notify", "transition", "complete"];
export type MaterialRole = (typeof MATERIAL_ROLES)[number];
export declare const MATERIAL_CUES: Cue[];
