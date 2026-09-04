import type { Rendered } from './engine.js';
export declare const clamp01: (n: number) => number;
export declare function signalLevel(peak: number): number;
export declare function heatPosition(level: number, toneShare?: number): number;
export declare function signalRGB(level: number, toneShare?: number): number[];
export declare const signalColor: (level: number, toneShare?: number) => string;
export declare function soundStyle(rendered?: Rendered): {
    '--sound-color': string;
    '--sound-wash': string;
    '--sound-hover': string;
};
