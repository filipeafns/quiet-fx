import {
  CUES,
  DEFAULTS,
  KEYS,
  MODES,
  SHAPES,
  VARIANTS,
  VOICES,
  makePatch,
  type Settings,
} from './catalog';
import { hash, type Patch } from './engine';

export const KIT_VERSION = 1 as const;
export const MAX_KIT_BYTES = 32_768;
export const KIT_ROLES = [
  'press',
  'release',
  'toggle',
  'confirm',
  'error',
  'notify',
  'transition',
  'complete',
] as const;
export const KIT_MOODS = ['calm', 'focused', 'playful', 'expressive'] as const;
export const KIT_FAMILIES = ['felt', 'porcelain', 'elastic'] as const;
export type KitRole = (typeof KIT_ROLES)[number];
export type KitMood = (typeof KIT_MOODS)[number];
export type KitFamily = (typeof KIT_FAMILIES)[number];
export type KitSlot = { cueId: string; settings: Settings; locked: boolean };
export type KitLocks = { family: boolean; key: boolean };
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

type MoodProfile = {
  families: readonly KitFamily[];
  modes: readonly string[];
  voices: readonly string[];
  softness: number;
  brightness: number;
  texture: number;
  duration: number;
  words: readonly string[];
};
const MOODS: Record<KitMood, MoodProfile> = {
  calm: {
    families: ['felt', 'porcelain'],
    modes: ['Pentatonic', 'Major'],
    voices: ['Soft', 'Felt'],
    softness: 70,
    brightness: 30,
    texture: 28,
    duration: 1.05,
    words: ['Still', 'Gentle', 'Quiet', 'Soft'],
  },
  focused: {
    families: ['felt', 'porcelain', 'elastic'],
    modes: ['Minor', 'Pentatonic'],
    voices: ['Soft', 'Pluck'],
    softness: 42,
    brightness: 46,
    texture: 24,
    duration: 0.78,
    words: ['Clear', 'Steady', 'Exact', 'Simple'],
  },
  playful: {
    families: ['elastic', 'porcelain'],
    modes: ['Major', 'Pentatonic'],
    voices: ['Soft', 'Pluck'],
    softness: 38,
    brightness: 61,
    texture: 46,
    duration: 0.98,
    words: ['Bright', 'Little', 'Bouncing', 'Sunny'],
  },
  expressive: {
    families: ['porcelain', 'elastic', 'felt'],
    modes: ['Major', 'Minor', 'Pentatonic'],
    voices: ['Soft', 'Glass', 'Pluck'],
    softness: 34,
    brightness: 64,
    texture: 53,
    duration: 1.2,
    words: ['Open', 'Vivid', 'Warm', 'Rising'],
  },
};
const NOUNS = [
  'Orbit',
  'Current',
  'Bloom',
  'Signal',
  'Drift',
  'Arc',
  'Loop',
  'Form',
];
const ROLE_DURATION: Record<KitRole, number> = {
  press: 0.78,
  release: 0.76,
  toggle: 0.9,
  confirm: 1,
  error: 0.93,
  notify: 1.04,
  transition: 1.16,
  complete: 1.12,
};
const UINT_MAX = 0xffffffff;
const SLOT_KEYS = ['cueId', 'settings', 'locked'];
const SETTINGS_KEYS = Object.keys(DEFAULTS);
const ROOT_KEYS = [
  'type',
  'schemaVersion',
  'name',
  'mood',
  'seed',
  'family',
  'key',
  'mode',
  'voice',
  'locks',
  'slots',
  'metadata',
];

function fail(path: string, message: string): never {
  throw new Error(`Invalid sound kit: ${path} ${message}.`);
}

// Never spread an untrusted object. Reject prototypes, accessors and unknown
// fields before reading values, then construct a fresh allowlisted value.
function record(value: unknown, path: string, allowed: readonly string[]) {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    fail(path, 'must be an object');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    fail(path, 'must be a plain object');
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key))
      fail(path, 'contains an unsupported field');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!('value' in descriptor) || !descriptor.enumerable)
      fail(path, 'contains an unsupported property');
  }
  return value as Record<string, unknown>;
}
function choice<T extends string>(
  value: unknown,
  values: readonly T[],
  path: string,
): T {
  if (typeof value !== 'string' || !values.includes(value as T))
    fail(path, 'has an unsupported value');
  return value as T;
}
function number(
  value: unknown,
  min: number,
  max: number,
  path: string,
  integer = false,
) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    fail(
      path,
      `must be ${integer ? 'an integer' : 'a number'} from ${min} to ${max}`,
    );
  return value as number;
}
function boolean(value: unknown, path: string) {
  if (typeof value !== 'boolean') fail(path, 'must be true or false');
  return value as boolean;
}
function text(value: unknown, max: number, path: string) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > max ||
    Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
  )
    fail(path, `must be nonempty text of at most ${max} characters`);
  return value as string;
}
function readSettings(value: unknown, path: string): Settings {
  const s = record(value, path, SETTINGS_KEYS);
  return {
    key: choice(s.key, KEYS, `${path}.key`),
    mode: choice(s.mode, MODES, `${path}.mode`),
    voice: choice(s.voice, VOICES, `${path}.voice`),
    variant: choice(s.variant, VARIANTS, `${path}.variant`),
    shape: choice(s.shape, SHAPES, `${path}.shape`),
    softness: number(s.softness, 0, 100, `${path}.softness`),
    brightness: number(s.brightness, 0, 100, `${path}.brightness`),
    duration: number(s.duration, 0.45, 2.5, `${path}.duration`),
    texture: number(s.texture, 0, 100, `${path}.texture`),
    seed: number(s.seed, 0, UINT_MAX, `${path}.seed`, true),
  };
}

/** Validate and defensively copy an imported or edited kit. Throws on invalid input. */
export function validateKit(value: unknown): SoundKit {
  const kit = record(value, 'kit', ROOT_KEYS);
  if (kit.type !== 'quiet-fx-kit') fail('type', 'must be quiet-fx-kit');
  if (kit.schemaVersion !== KIT_VERSION)
    fail('schemaVersion', 'is not supported');
  const locks = record(kit.locks, 'locks', ['family', 'key']);
  const slots = record(kit.slots, 'slots', KIT_ROLES);
  const result: SoundKit = {
    type: 'quiet-fx-kit',
    schemaVersion: KIT_VERSION,
    name: text(kit.name, 64, 'name'),
    mood: choice(kit.mood, KIT_MOODS, 'mood'),
    seed: number(kit.seed, 0, UINT_MAX, 'seed', true),
    family: choice(kit.family, KIT_FAMILIES, 'family'),
    key: choice(kit.key, KEYS, 'key'),
    mode: choice(kit.mode, MODES, 'mode'),
    voice: choice(kit.voice, VOICES, 'voice'),
    locks: {
      family: boolean(locks.family, 'locks.family'),
      key: boolean(locks.key, 'locks.key'),
    },
    slots: {} as Record<KitRole, KitSlot>,
  };
  for (const role of KIT_ROLES) {
    const slot = record(slots[role], `slots.${role}`, SLOT_KEYS);
    const cueId = text(slot.cueId, 100, `slots.${role}.cueId`);
    if (!CUES.some((cue) => cue.id === cueId))
      fail(`slots.${role}.cueId`, 'is not in the installed library');
    result.slots[role] = {
      cueId,
      settings: readSettings(slot.settings, `slots.${role}.settings`),
      locked: boolean(slot.locked, `slots.${role}.locked`),
    };
  }
  if (Object.hasOwn(kit, 'metadata')) {
    const meta = record(kit.metadata, 'metadata', [
      'packId',
      'author',
      'description',
    ]);
    const clean: KitMetadata = {};
    if (Object.hasOwn(meta, 'packId'))
      clean.packId = text(meta.packId, 80, 'metadata.packId');
    if (Object.hasOwn(meta, 'author'))
      clean.author = text(meta.author, 80, 'metadata.author');
    if (Object.hasOwn(meta, 'description'))
      clean.description = text(meta.description, 240, 'metadata.description');
    result.metadata = clean;
  }
  return result;
}

export function parseKit(json: string): SoundKit {
  if (
    typeof json !== 'string' ||
    json.length > MAX_KIT_BYTES ||
    new TextEncoder().encode(json).byteLength > MAX_KIT_BYTES
  )
    fail('file', `must be at most ${MAX_KIT_BYTES} bytes`);
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    fail('file', 'must contain valid JSON');
  }
  return validateKit(value);
}

export function serializeKit(kit: SoundKit): string {
  return `${JSON.stringify(validateKit(kit), null, 2)}\n`;
}

function random(seed: number) {
  let state = hash(`quiet-kit-v1:${seed}`) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Generate one coherent palette. The exact seed and choices reproduce it. */
export function createKit(options: CreateKitOptions): SoundKit {
  const mood = choice(options.mood, KIT_MOODS, 'mood');
  const seed = number(options.seed, 0, UINT_MAX, 'seed', true);
  const profile = MOODS[mood];
  const next = random(seed);
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(next() * items.length)];
  // Consume the same random fields even when a caller supplies a palette value.
  const generatedFamily = pick(profile.families);
  const generatedKey = pick(KEYS);
  const generatedMode = pick(profile.modes);
  const generatedVoice = pick(profile.voices);
  const family = choice(
    options.family ?? generatedFamily,
    KIT_FAMILIES,
    'family',
  );
  const key = choice(options.key ?? generatedKey, KEYS, 'key');
  const mode = choice(options.mode ?? generatedMode, MODES, 'mode');
  const voice = choice(options.voice ?? generatedVoice, VOICES, 'voice');
  const name = `${pick(profile.words)} ${pick(NOUNS)}`;
  const baseSoftness = profile.softness + Math.round((next() - 0.5) * 14);
  const baseBrightness = profile.brightness + Math.round((next() - 0.5) * 14);
  const slots = {} as SoundKit['slots'];
  for (const role of KIT_ROLES) {
    const variant =
      role === 'press' || role === 'release'
        ? 'Light'
        : mood === 'calm' && role === 'transition'
          ? 'Airy'
          : 'Normal';
    slots[role] = {
      cueId: `${family}-${role}`,
      locked: false,
      settings: {
        ...DEFAULTS,
        key,
        mode,
        voice,
        variant,
        shape: 'Natural',
        softness: clamp(baseSoftness + Math.round((next() - 0.5) * 8), 0, 100),
        brightness: clamp(
          baseBrightness + Math.round((next() - 0.5) * 8),
          0,
          100,
        ),
        texture: clamp(
          profile.texture + Math.round((next() - 0.5) * 12),
          0,
          100,
        ),
        duration:
          Math.round(
            clamp(
              profile.duration * ROLE_DURATION[role] + (next() - 0.5) * 0.12,
              0.45,
              2.5,
            ) * 100,
          ) / 100,
        seed: hash(`quiet-kit-v1:${seed}:${family}:${role}`),
      },
    };
  }
  return validateKit({
    type: 'quiet-fx-kit',
    schemaVersion: KIT_VERSION,
    name,
    mood,
    seed,
    family,
    key,
    mode,
    voice,
    locks: { family: false, key: false, ...options.locks },
    slots,
  });
}

function retainLockedSlots(previous: SoundKit, next: SoundKit): SoundKit {
  for (const role of KIT_ROLES) {
    if (previous.slots[role].locked) next.slots[role] = previous.slots[role];
  }
  if (previous.metadata) next.metadata = previous.metadata;
  return validateKit(next);
}

/** Shuffle the chosen mood, preserving complete locked roles and palette locks. */
export function randomizeKit(previous: SoundKit, newSeed: number): SoundKit {
  const kit = validateKit(previous);
  return retainLockedSlots(
    kit,
    createKit({
      mood: kit.mood,
      seed: newSeed,
      ...(kit.locks.family ? { family: kit.family } : {}),
      ...(kit.locks.key ? { key: kit.key } : {}),
      locks: kit.locks,
    }),
  );
}

/** Explicit palette edits regenerate unlocked roles. Locks only constrain shuffle. */
export function retuneKit(
  previous: SoundKit,
  changes: Partial<
    Pick<SoundKit, 'mood' | 'family' | 'key' | 'mode' | 'voice'>
  >,
): SoundKit {
  const kit = validateKit(previous);
  const allowed = record(changes, 'changes', [
    'mood',
    'family',
    'key',
    'mode',
    'voice',
  ]);
  const next = createKit({
    mood: kit.mood,
    seed: kit.seed,
    family: kit.family,
    key: kit.key,
    mode: kit.mode,
    voice: kit.voice,
    locks: kit.locks,
    ...allowed,
  } as CreateKitOptions);
  next.name = kit.name;
  return retainLockedSlots(kit, next);
}

/** Update a role without mutating a saved baseline or any other slot. */
export function updateKitSlot(
  previous: SoundKit,
  role: KitRole,
  changes: { cueId?: string; settings?: Partial<Settings>; locked?: boolean },
): SoundKit {
  const kit = validateKit(previous);
  choice(role, KIT_ROLES, 'role');
  const change = record(changes, 'slot changes', SLOT_KEYS);
  const settings = Object.hasOwn(change, 'settings')
    ? record(change.settings, 'slot changes.settings', SETTINGS_KEYS)
    : {};
  kit.slots[role] = {
    ...kit.slots[role],
    ...change,
    settings: { ...kit.slots[role].settings, ...settings },
  } as KitSlot;
  return validateKit(kit);
}

/** One source of patches for audition, sequence playback and every export format. */
export function getKitPatches(kit: SoundKit): Record<KitRole, Patch> {
  const validated = validateKit(kit);
  const patches = {} as Record<KitRole, Patch>;
  for (const role of KIT_ROLES) {
    const slot = validated.slots[role];
    patches[role] = makePatch(
      CUES.find((cue) => cue.id === slot.cueId)!,
      slot.settings,
    );
  }
  return patches;
}
