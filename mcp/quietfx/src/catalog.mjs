import { CUES, DEFAULTS, makePatch, durationOf } from '../vendor/index.js';

export const SOURCE = 'https://github.com/filipeafns/quiet-fx';
export const SOURCE_COMMIT = '94cb0a0547aa03db30704a9d3a16886a044a47eb';
export const COLLECTIONS = [
  {
    id: 'essentials',
    name: 'Interface essentials',
    description: 'A small vocabulary for everyday interactions.',
    ids: ['tap', 'select', 'toggle-on', 'toggle-off', 'confirm', 'decline'],
  },
  {
    id: 'calm',
    name: 'Calm productivity',
    description: 'Gentle feedback that stays out of the way.',
    ids: ['touch', 'focus', 'mist', 'notify', 'complete', 'finish'],
  },
  {
    id: 'conversation',
    name: 'Conversation',
    description: 'From the first message to a graceful recovery.',
    ids: CUES.filter((c) => c.id.startsWith('chat-')).map((c) => c.id),
  },
  {
    id: 'motion',
    name: 'Tactile motion',
    description: 'Paper, surfaces, and objects coming to rest.',
    ids: [
      'whoosh-in',
      'whoosh-out',
      'card-flip',
      'page-turn',
      'snap',
      'soft-impact',
    ],
  },
];
const groups = {
  confirmation: ['confirm', 'complete', 'finish', 'lilt'],
  error: ['decline', 'chat-delivery-failure'],
  notification: ['notify', 'attention', 'receive', 'chat-receive-message'],
  button: ['tap', 'touch', 'lift', 'select', 'toggle-on', 'toggle-off'],
  transition: [
    'whoosh-in',
    'whoosh-out',
    'drift',
    'swipe',
    'expand',
    'collapse',
  ],
  calm: ['mist', 'touch', 'ember', 'focus', 'cloth-brush', 'notify'],
  playful: ['sparkle', 'lilt', 'ripple', 'prism', 'card-flip'],
  warm: ['ember', 'wood-tap', 'felt-tap', 'touch', 'pearl'],
};
const synonyms = {
  success: 'confirmation',
  done: 'confirmation',
  completion: 'confirmation',
  confirm: 'confirmation',
  fail: 'error',
  failure: 'error',
  warning: 'error',
  alert: 'notification',
  notifications: 'notification',
  click: 'button',
  buttons: 'button',
  toggle: 'button',
  minimalist: 'calm',
  minimal: 'calm',
  relaxed: 'calm',
  relaxing: 'calm',
  subtle: 'gentle',
  quiet: 'gentle',
  soft: 'gentle',
  happy: 'playful',
  cheerful: 'playful',
  animation: 'transition',
  animations: 'transition',
  transitions: 'transition',
  chat: 'message',
  messages: 'message',
  onboarding: 'welcome',
};
export const SOUNDS = CUES.map((cue) => ({
  id: cue.id,
  name: cue.name,
  category: cue.category,
  description: cue.description,
  use: cue.use,
  duration: +durationOf(makePatch(cue, DEFAULTS)).toFixed(3),
  tags: [
    'gentle',
    ...Object.entries(groups)
      .filter(([, ids]) => ids.includes(cue.id))
      .map(([tag]) => tag),
  ],
  license: 'MIT',
  provenance: `${SOURCE}/tree/${SOURCE_COMMIT}`,
  format: 'WAV',
  loop: false,
}));
export function searchSounds({
  query = '',
  category,
  mood,
  collection_id,
  max_duration,
  limit = 72,
} = {}) {
  const collection = collection_id
    ? COLLECTIONS.find((c) => c.id === collection_id)
    : null;
  if (collection_id && !collection)
    throw new Error(`Unknown collection: ${collection_id}`);
  const seconds = query.match(
    /(?:under|less than|below)\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)\b/i,
  );
  const cap = max_duration ?? (seconds ? Number(seconds[1]) : undefined);
  const text = query.replace(
    /(?:under|less than|below)\s+\d+(?:\.\d+)?\s*(?:seconds?|sec|s)\b/gi,
    '',
  );
  const stop = new Set([
    'a',
    'an',
    'the',
    'for',
    'my',
    'me',
    'some',
    'find',
    'sounds',
    'sound',
    'effects',
    'effect',
    'i',
    'want',
    'with',
    'and',
    'please',
    'ui',
  ]);
  const tokens = [text, mood || '']
    .join(' ')
    .toLowerCase()
    .split(/[^\p{L}\p{N}-]+/u)
    .filter((t) => t && !stop.has(t))
    .map((t) => synonyms[t] || t);
  const matches = SOUNDS.filter(
    (s) =>
      (!category || s.category === category) &&
      (!collection || collection.ids.includes(s.id)) &&
      (cap === undefined || s.duration <= cap),
  )
    .map((s) => {
      const hay =
        `${s.id} ${s.name} ${s.category} ${s.description} ${s.use} ${s.tags.join(' ')}`.toLowerCase();
      const score = tokens.reduce(
        (n, t) =>
          n +
          (s.id === t ? 8 : s.tags.includes(t) ? 5 : hay.includes(t) ? 1 : 0),
        0,
      );
      return { sound: s, score, matches: tokens.every((t) => hay.includes(t)) };
    })
    .filter((r) => r.matches)
    .sort((a, b) => b.score - a.score);
  return {
    sounds: matches.slice(0, limit).map((r) => r.sound),
    total: matches.length,
    query,
    collection: collection || null,
  };
}
export function makeCollection({
  ids,
  name = 'My Quiet FX collection',
  voice = 'Soft',
  variant = 'Normal',
}) {
  const unique = [...new Set(ids)];
  if (!unique.length || unique.length > 72)
    throw new Error('Choose between 1 and 72 sounds.');
  const settings = { ...DEFAULTS, voice, variant };
  const sounds = unique.map((id) => {
    const cue = CUES.find((c) => c.id === id);
    if (!cue) throw new Error(`Unknown sound: ${id}`);
    const patch = makePatch(cue, settings);
    return {
      ...SOUNDS.find((s) => s.id === id),
      duration: +durationOf(patch).toFixed(3),
      file: `audio/${id}.wav`,
      patch,
    };
  });
  return {
    schemaVersion: 1,
    name,
    library: {
      name: 'quiet-fx',
      version: '0.4.1',
      repository: SOURCE,
      sourceCommit: SOURCE_COMMIT,
    },
    license: 'MIT',
    sampleRate: 48000,
    settings,
    sounds,
  };
}
export function integrationGuide(collection) {
  return `Use these ${collection.sounds.length} selected Quiet FX sounds in my project.\n\nInstall the existing MIT library: npm install github:filipeafns/quiet-fx#v0.4.1\n\nThe collection JSON below contains the exact selected recipes. Save it as quietfx-collection.json in the approved project. Import renderPatch and SoundPlayer from quiet-fx, render and cache each sound.patch, and play only after a user gesture. Use one player, a 0.35 monitor gain, an accessible mute control, and stop on Escape, hidden page, or unmount. Sound must supplement visible feedback. Do not attach sounds to every hover by default.\n\nIf I also provide a ZIP, it contains only these selected WAVs under audio/, this manifest and the MIT license. Copy audio/ only into the project I authorize. Clipboard text does not transfer WAV files. The same recipes can instead synthesize the sounds without any audio downloads. Preserve LICENSE.\n\nSelected IDs: ${collection.sounds.map((s) => s.id).join(', ')}. Map these to appropriate interactions; ask about ambiguous placement before editing unrelated areas.\n\n${JSON.stringify(collection, null, 2)}`;
}
