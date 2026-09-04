/** Deterministic PCM renderer and browser player. Original synthesis code: MIT. */
export type Layer = {
    kind: 'tone' | 'noise';
    /** Semantic anchor for sequences, independent of added harmonics. */
    event?: string;
    attack: number;
    decay: number;
    peak: number;
    offset?: number;
    waveform?: OscillatorType;
    frequency?: number;
    /** Optional body frequency for preserving inharmonic material resonances. */
    anchorFrequency?: number;
    glideTo?: number;
    glideTime?: number;
    detune?: number;
    filterType?: BiquadFilterType;
    filterFrequency?: number;
    filterTo?: number;
    filterQ?: number;
};
export type Patch = {
    id: string;
    name: string;
    seed: number;
    masterGain: number;
    layers: Layer[];
    shimmer?: {
        delay: number;
        feedback: number;
        wet: number;
        lowpass: number;
    };
    source?: string;
    settings?: Record<string, unknown>;
};
export type Rendered = {
    data: Float32Array;
    sampleRate: number;
    duration: number;
    peak: number;
    rms: number;
    /** Fraction of dry layer energy produced by pitched oscillators, before mixing. */
    toneShare?: number;
};
export declare function hash(s: string): number;
export declare function durationOf(p: Patch): number;
export declare function renderPatch(p: Patch, sampleRate?: number): Rendered;
export declare function waveform(data: Float32Array, count?: number): number[];
export declare function wavBytes(r: Rendered): Uint8Array<ArrayBuffer>;
export declare function validatePatch(v: unknown): v is Patch;
export declare class SoundPlayer {
    context: AudioContext | null;
    analyser: AnalyserNode | null;
    master: GainNode | null;
    active: Set<{
        node: AudioBufferSourceNode;
        gain: GainNode;
    }>;
    volume: number;
    muted: boolean;
    generation: number;
    stopListeners: Set<() => void>;
    unlock(): boolean;
    enable(): Promise<boolean>;
    setVolume(v: number): void;
    mute(): void;
    stop(): void;
    play(r: Rendered, delay?: number, interrupt?: boolean, voiceGain?: number): number | null;
}
