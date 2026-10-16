import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Test the actual source, including newly authored catalog material, without
// relying on a potentially older generated distribution or writing build output.
const modules = new Map();
async function sourceUrl(url) {
  const key = url.href;
  if (modules.has(key)) return modules.get(key);
  const source = ts.transpile(await readFile(url, 'utf8'), {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  });
  let code = source;
  const imports = [...source.matchAll(/\bfrom\s+(['"])(\.[^'"]+)\1/g)];
  for (const match of imports) {
    const dependency = new URL(`${match[2]}.ts`, url);
    const resolved = await sourceUrl(dependency);
    code = code.replace(match[0], `from '${resolved}'`);
  }
  const result = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  modules.set(key, result);
  return result;
}

const root = new URL('../lib/audio/', import.meta.url);
const {
  KIT_MOODS,
  KIT_FAMILIES,
  KIT_ROLES,
  MAX_KIT_BYTES,
  createKit,
  randomizeKit,
  retuneKit,
  validateKit,
  parseKit,
  serializeKit,
  updateKitSlot,
  getKitPatches,
} = await import(await sourceUrl(new URL('kits.ts', root)));
const { CUES, makePatch } = await import(
  await sourceUrl(new URL('catalog.ts', root))
);
const { renderPatch } = await import(
  await sourceUrl(new URL('engine.ts', root))
);
const clone = (value) => JSON.parse(JSON.stringify(value));
function invalid(kit, modify, reason) {
  const copy = clone(kit);
  modify(copy);
  assert.throws(() => validateKit(copy), /Invalid sound kit:/, reason);
}

let generated = 0;
const identities = new Set();
for (const mood of KIT_MOODS) {
  for (const family of KIT_FAMILIES) {
    for (const seed of [0, 1, 27, 999, 0xffffffff]) {
      const kit = createKit({ mood, family, seed });
      assert.deepEqual(
        kit,
        createKit({ mood, family, seed }),
        'Seeded generation is deterministic',
      );
      assert.deepEqual(
        parseKit(serializeKit(kit)),
        kit,
        'Portable settings round-trip exactly',
      );
      assert.deepEqual(Object.keys(kit.slots), KIT_ROLES);
      assert.equal(kit.family, family);
      const patches = getKitPatches(kit);
      for (const role of KIT_ROLES) {
        const slot = kit.slots[role];
        assert.equal(slot.cueId, `${family}-${role}`);
        assert.equal(slot.settings.key, kit.key);
        assert.equal(slot.settings.mode, kit.mode);
        assert.equal(slot.settings.voice, kit.voice);
        assert.deepEqual(
          patches[role],
          makePatch(
            CUES.find(({ id }) => id === slot.cueId),
            slot.settings,
          ),
          'Preview/export patches agree with the saved role configuration',
        );
      }
      identities.add(JSON.stringify(kit.slots));
      generated++;
    }
  }
}
assert.equal(
  identities.size,
  generated,
  'Seeds, moods and families produce distinct configurations',
);

// Listenability is assessed separately; these checks prove actual generated
// material renders finite, non-silent PCM for every family, mood and role.
for (const mood of KIT_MOODS) {
  for (const family of KIT_FAMILIES) {
    const patches = getKitPatches(createKit({ mood, family, seed: 42 }));
    for (const role of KIT_ROLES) {
      const rendered = renderPatch(patches[role], 12000);
      assert.ok(rendered.duration > 0 && rendered.duration < 10);
      assert.ok(Number.isFinite(rendered.peak) && rendered.peak > 0);
      assert.ok(Number.isFinite(rendered.rms) && rendered.rms > 0);
      assert.ok(rendered.data.every(Number.isFinite));
    }
  }
}

let kit = createKit({ mood: 'calm', family: 'felt', key: 'C', seed: 13 });
const untouched = clone(kit);
kit = updateKitSlot(kit, 'confirm', {
  cueId: 'sparkle',
  locked: true,
  settings: { key: 'F♯', voice: 'Glass', duration: 1.6, seed: 334 },
});
kit.locks = { family: true, key: true };
kit.metadata = {
  packId: 'studio-demo',
  author: 'Quiet FX',
  description: 'A test kit.',
};
assert.deepEqual(
  untouched,
  createKit({ mood: 'calm', family: 'felt', key: 'C', seed: 13 }),
);
const before = clone(kit);
const next = randomizeKit(kit, 987);
assert.deepEqual(kit, before, 'Shuffle never mutates the current kit');
assert.equal(next.mood, kit.mood);
assert.equal(next.family, kit.family);
assert.equal(next.key, kit.key);
assert.deepEqual(
  next.slots.confirm,
  kit.slots.confirm,
  'A role lock preserves cue AND every setting',
);
assert.notDeepEqual(next.slots.press, kit.slots.press, 'Unlocked roles vary');
assert.deepEqual(next.metadata, kit.metadata);
assert.notEqual(
  next.slots.confirm,
  kit.slots.confirm,
  'Returned slots do not alias the baseline',
);
assert.notEqual(next.metadata, kit.metadata);
const retuned = retuneKit(kit, {
  family: 'elastic',
  key: 'D',
  mood: 'playful',
});
assert.equal(
  retuned.family,
  'elastic',
  'Explicit controls override shuffle locks',
);
assert.equal(retuned.key, 'D');
assert.equal(retuned.mood, 'playful');
assert.equal(retuned.name, kit.name);
assert.deepEqual(retuned.slots.confirm, kit.slots.confirm);
assert.equal(retuned.slots.press.cueId, 'elastic-press');
assert.equal(retuned.slots.press.settings.key, 'D');
assert.deepEqual(retuned.locks, kit.locks);
assert.deepEqual(parseKit(serializeKit(kit)), kit);

const unlocked = clone(kit);
unlocked.locks = { family: false, key: false };
const paletteResults = Array.from({ length: 24 }, (_, seed) =>
  randomizeKit(unlocked, seed),
);
assert.ok(
  paletteResults.some((entry) => entry.family !== unlocked.family),
  'Unlocked family can change',
);
assert.ok(
  paletteResults.some((entry) => entry.key !== unlocked.key),
  'Unlocked key can change',
);
for (const entry of paletteResults)
  assert.deepEqual(entry.slots.confirm, kit.slots.confirm);
const allLocked = clone(kit);
for (const slot of Object.values(allLocked.slots)) slot.locked = true;
assert.deepEqual(randomizeKit(allLocked, 4321).slots, allLocked.slots);

invalid(
  kit,
  (value) => {
    value.schemaVersion = 2;
  },
  'Unsupported schema version',
);
invalid(kit, (value) => {
  value.type = 'other';
});
invalid(kit, (value) => {
  value.seed = -1;
});
invalid(kit, (value) => {
  value.seed = 1.5;
});
invalid(kit, (value) => {
  value.seed = 2 ** 32;
});
invalid(kit, (value) => {
  value.mood = 'angry';
});
invalid(kit, (value) => {
  value.family = 'unknown';
});
invalid(kit, (value) => {
  value.key = 'H';
});
invalid(kit, (value) => {
  value.locks.family = 'true';
});
invalid(kit, (value) => {
  value.slots.confirm.cueId = 'unknown';
});
invalid(kit, (value) => {
  delete value.slots.release;
});
invalid(kit, (value) => {
  value.slots.extra = value.slots.press;
});
invalid(kit, (value) => {
  value.name = '';
});
invalid(kit, (value) => {
  value.name = 'a'.repeat(65);
});
invalid(kit, (value) => {
  value.name = 'hello\nthere';
});
invalid(kit, (value) => {
  value.metadata.description = 'a'.repeat(241);
});
invalid(kit, (value) => {
  value.metadata.premium = true;
});
invalid(kit, (value) => {
  value.slots.press.locked = 1;
});
invalid(kit, (value) => {
  value.slots.press.settings.extra = 1;
});
invalid(kit, (value) => {
  value.slots.press.settings.voice = 'Unknown';
});
invalid(kit, (value) => {
  value.slots.press.settings.mode = 'Unknown';
});
invalid(kit, (value) => {
  value.slots.press.settings.variant = 'Unknown';
});
invalid(kit, (value) => {
  value.slots.press.settings.shape = 'Unknown';
});
for (const field of ['softness', 'brightness', 'texture']) {
  for (const value of [-1, 101, NaN, Infinity, -Infinity, '30', null])
    invalid(kit, (entry) => {
      entry.slots.press.settings[field] = value;
    });
}
for (const value of [0, 0.44, 2.51, NaN, Infinity])
  invalid(kit, (entry) => {
    entry.slots.press.settings.duration = value;
  });
for (const value of [-1, 0.5, 2 ** 32, NaN, Infinity])
  invalid(kit, (entry) => {
    entry.slots.press.settings.seed = value;
  });
for (const value of [undefined, null, [], true, 1, 'kit'])
  assert.throws(() => validateKit(value), /Invalid sound kit:/);
assert.throws(() => parseKit('{broken'), /valid JSON/);
assert.throws(() => parseKit(' '.repeat(MAX_KIT_BYTES + 1)), /bytes/);
assert.throws(
  () => parseKit('é'.repeat(MAX_KIT_BYTES / 2 + 1)),
  /bytes/,
  'Limit counts encoded bytes',
);
for (const key of ['__proto__', 'constructor', 'prototype']) {
  for (const path of [
    [],
    ['slots'],
    ['slots', 'press'],
    ['slots', 'press', 'settings'],
    ['metadata'],
  ]) {
    const value = clone(kit);
    let target = value;
    for (const part of path) target = target[part];
    Object.defineProperty(target, key, {
      value: { polluted: true },
      enumerable: true,
    });
    assert.throws(() => parseKit(JSON.stringify(value)), /unsupported field/);
  }
}
assert.equal({}.polluted, undefined);
const inherited = Object.create({ unsafe: true });
Object.assign(inherited, kit);
assert.throws(() => validateKit(inherited), /plain object/);
const accessor = clone(kit);
Object.defineProperty(accessor, 'name', {
  enumerable: true,
  get() {
    throw new Error('Must never run untrusted getters');
  },
});
assert.throws(() => validateKit(accessor), /unsupported property/);
const symbolic = clone(kit);
symbolic[Symbol('hidden')] = true;
assert.throws(() => validateKit(symbolic), /unsupported field/);
assert.throws(
  () => updateKitSlot(kit, 'press', { settings: { texture: Infinity } }),
  /Invalid sound kit:/,
);
assert.throws(
  () => updateKitSlot(kit, 'missing', { locked: true }),
  /Invalid sound kit:/,
);
assert.throws(() => retuneKit(kit, { mode: 'Dorian' }), /Invalid sound kit:/);
assert.throws(
  () => createKit({ mood: 'calm', seed: Infinity }),
  /Invalid sound kit:/,
);

console.log(
  `Sound kits: ${generated} deterministic configurations; all family/mood roles render; locks, round-trip and hostile imports pass.`,
);
