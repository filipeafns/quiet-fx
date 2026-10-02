import { z } from 'zod';
import { SOUNDS, SOURCE, SOURCE_COMMIT } from './catalog.mjs';
import { KEYS, MODES, VOICES, VARIANTS, SHAPES, CATEGORIES } from '../vendor/index.js';

const settings = z.object({
  key: z.enum(KEYS), mode: z.enum(MODES), voice: z.enum(VOICES),
  variant: z.enum(VARIANTS), shape: z.enum(SHAPES),
  softness: z.number(), brightness: z.number(), duration: z.number(),
  texture: z.number(), seed: z.number(),
}).strict();
const layer = z.object({
  kind: z.enum(['tone', 'noise']), event: z.string().optional(),
  attack: z.number(), decay: z.number(), peak: z.number(),
  offset: z.number().optional(), waveform: z.string().optional(),
  frequency: z.number().optional(), anchorFrequency: z.number().optional(),
  glideTo: z.number().optional(), glideTime: z.number().optional(),
  detune: z.number().optional(), filterType: z.string().optional(),
  filterFrequency: z.number().optional(), filterTo: z.number().optional(),
  filterQ: z.number().optional(),
}).strict();
const patch = z.object({
  id: z.string(), name: z.string(), seed: z.number(), masterGain: z.number(),
  layers: z.array(layer),
  shimmer: z.object({ delay: z.number(), feedback: z.number(), wet: z.number(), lowpass: z.number() }).strict().optional(),
  source: z.literal('Quiet'), settings,
}).strict();
const sound = z.object({
  id: z.enum(SOUNDS.map(sound => sound.id)), name: z.string(),
  category: z.enum(CATEGORIES), description: z.string(), use: z.string(),
  duration: z.number().positive(), tags: z.array(z.string()),
  license: z.literal('MIT'), provenance: z.string(),
  format: z.literal('WAV'), loop: z.literal(false),
}).strict();
const collection = z.object({
  id: z.string(), name: z.string(), description: z.string(),
  ids: z.array(z.enum(SOUNDS.map(sound => sound.id))),
}).strict();
const search = kind => z.object({
  kind: z.literal(kind), sounds: z.array(sound), total: z.number().int().nonnegative(),
  query: z.string(), collection: collection.nullable(),
}).strict();
export const outputSchemas = {
  search_sounds: search('search'),
  get_collection: search('search'),
  show_sound_picker: search('picker'),
  list_collections: z.object({ kind: z.literal('collections'), collections: z.array(collection) }).strict(),
  get_sound_assets: z.object({
    kind: z.literal('assets'),
    collection: z.object({
      schemaVersion: z.literal(1), name: z.string(),
      library: z.object({
        name: z.literal('quiet-fx'), version: z.literal('0.4.1'),
        repository: z.literal(SOURCE), sourceCommit: z.literal(SOURCE_COMMIT),
      }).strict(),
      license: z.literal('MIT'), sampleRate: z.literal(48000), settings,
      sounds: z.array(sound.extend({ file: z.string(), patch })),
    }).strict(),
    integration: z.string(),
  }).strict(),
};
