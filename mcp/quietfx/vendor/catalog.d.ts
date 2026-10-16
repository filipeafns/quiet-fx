import { type Layer, type Patch } from './engine.js';
export type Cue = {
    id: string;
    name: string;
    category: string;
    description: string;
    use: string;
    source: 'Quiet';
    root: number;
    recipe: {
        layers: Layer[];
        masterGain: number;
        shimmer?: Patch['shimmer'];
    };
};
export type Settings = {
    key: string;
    mode: string;
    voice: string;
    variant: string;
    shape: string;
    softness: number;
    brightness: number;
    duration: number;
    texture: number;
    seed: number;
};
export declare const KEYS: string[];
export declare const MODES: string[];
export declare const VOICES: string[];
export declare const VARIANTS: string[];
export declare const SHAPES: string[];
export declare const DEFAULTS: Settings;
export declare const CUES: Cue[];
export declare const CATEGORIES: string[];
export declare function makePatch(cue: Cue, s: Settings): Patch;
export declare function timingScale(settings: Settings): number;
