import { type Settings } from './catalog.js';
import { type Patch } from './engine.js';
export declare const KIT_VERSION: 1;
export declare const MAX_KIT_BYTES = 32768;
export declare const KIT_ROLES: readonly ["press", "release", "toggle", "confirm", "error", "notify", "transition", "complete"];
export declare const KIT_MOODS: readonly ["calm", "focused", "playful", "expressive"];
export declare const KIT_FAMILIES: readonly ["felt", "porcelain", "elastic"];
export type KitRole = (typeof KIT_ROLES)[number];
export type KitMood = (typeof KIT_MOODS)[number];
export type KitFamily = (typeof KIT_FAMILIES)[number];
export type KitSlot = {
    cueId: string;
    settings: Settings;
    locked: boolean;
};
export type KitLocks = {
    family: boolean;
    key: boolean;
};
export type KitMetadata = {
    packId?: string;
    author?: string;
    description?: string;
};
export type SoundKit = {
    type: 'quiet-fx-kit';
    schemaVersion: typeof KIT_VERSION;
    name: string;
    mood: KitMood;
    seed: number;
    family: KitFamily;
    key: string;
    mode: string;
    voice: string;
    locks: KitLocks;
    slots: Record<KitRole, KitSlot>;
    metadata?: KitMetadata;
};
export type CreateKitOptions = {
    mood: KitMood;
    seed: number;
    family?: KitFamily;
    key?: string;
    mode?: string;
    voice?: string;
    locks?: Partial<KitLocks>;
};
/** Validate and defensively copy an imported or edited kit. Throws on invalid input. */
export declare function validateKit(value: unknown): SoundKit;
export declare function parseKit(json: string): SoundKit;
export declare function serializeKit(kit: SoundKit): string;
/** Generate one coherent palette. The exact seed and choices reproduce it. */
export declare function createKit(options: CreateKitOptions): SoundKit;
/** Shuffle the chosen mood, preserving complete locked roles and palette locks. */
export declare function randomizeKit(previous: SoundKit, newSeed: number): SoundKit;
/** Explicit palette edits regenerate unlocked roles. Locks only constrain shuffle. */
export declare function retuneKit(previous: SoundKit, changes: Partial<Pick<SoundKit, 'mood' | 'family' | 'key' | 'mode' | 'voice'>>): SoundKit;
/** Update a role without mutating a saved baseline or any other slot. */
export declare function updateKitSlot(previous: SoundKit, role: KitRole, changes: {
    cueId?: string;
    settings?: Partial<Settings>;
    locked?: boolean;
}): SoundKit;
/** One source of patches for audition, sequence playback and every export format. */
export declare function getKitPatches(kit: SoundKit): Record<KitRole, Patch>;
