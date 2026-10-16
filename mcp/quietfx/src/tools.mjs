import { z } from 'zod';
import {
  SOUNDS,
  COLLECTIONS,
  searchSounds,
  makeCollection,
  integrationGuide,
} from './catalog.mjs';
import { VOICES, VARIANTS, CATEGORIES } from '../vendor/index.js';

const search = {
  query: z
    .string()
    .max(300)
    .default('')
    .describe(
      'Interaction, mood or use case, e.g. subtle confirmation under 1s.',
    ),
  category: z.enum(CATEGORIES).optional(),
  mood: z.enum(['calm', 'playful', 'warm', 'gentle']).optional(),
  collection_id: z.string().max(80).optional(),
  max_duration: z.number().positive().max(30).optional(),
  limit: z.number().int().min(1).max(72).default(24),
};
const selection = {
  ids: z
    .array(z.enum(SOUNDS.map((s) => s.id)))
    .min(1)
    .max(72)
    .describe(
      'Only IDs the user explicitly selected or requested. Duplicates are removed.',
    ),
  name: z.string().trim().min(1).max(80).default('My Quiet FX collection'),
  voice: z.enum(VOICES).default('Soft'),
  variant: z.enum(VARIANTS).default('Normal'),
};
export const toolDefinitions = {
  search_sounds: {
    title: 'Search Quiet FX sounds',
    description:
      'Find original Quiet FX sound effects by interaction, mood, category, collection or maximum duration. Returns metadata and stable IDs. No playback or selection changes.',
    input: search,
    run: (args) => ({ kind: 'search', ...searchSounds(args) }),
  },
  list_collections: {
    title: 'Browse sound collections',
    description:
      'List curated starter collections with stable sound IDs. Collections are suggestions, not saved user selections.',
    input: {},
    run: () => ({ kind: 'collections', collections: COLLECTIONS }),
  },
  get_collection: {
    title: 'Get a sound collection',
    description:
      'Get the sounds in one curated collection without adding them to the user selection.',
    input: { collection_id: z.string().max(80) },
    run: (args) => ({ kind: 'search', ...searchSounds(args) }),
  },
  show_sound_picker: {
    title: 'Open Quiet FX',
    description:
      'Show the interactive Quiet FX sound field and multi-select picker. User can audition sounds, browse collections, keep a selection across filters, download selected WAVs, and copy integration instructions. Never autoplays.',
    input: search,
    ui: true,
    run: (args) => ({ kind: 'picker', ...searchSounds(args) }),
  },
  get_sound_assets: {
    title: 'Prepare selected sounds',
    description:
      'Return a deterministic manifest with original MIT sound recipes and coding integration instructions for explicit user-selected IDs. No file writes, uploads, account storage or downloads are performed. The picker renders the exact recipes into a WAV ZIP locally.',
    input: selection,
    run: (args) => {
      const collection = makeCollection(args);
      return {
        kind: 'assets',
        collection,
        integration: integrationGuide(collection),
      };
    },
  },
};
export async function callTool(name, args = {}) {
  const definition = toolDefinitions[name];
  if (!definition) throw new Error(`Unknown tool: ${name}`);
  const parsed = z.object(definition.input).strict().parse(args);
  const structuredContent = definition.run(parsed);
  return {
    content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}
