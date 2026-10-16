import ts from 'typescript';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = path.resolve(process.env.QUIET_WORK_DIR || 'work', 'material-qa');
mkdirSync(dir, { recursive: true });
for (const name of ['engine', 'materials', 'catalog']) {
  writeFileSync(
    `${dir}/${name}.mjs`,
    ts
      .transpile(readFileSync(`lib/audio/${name}.ts`, 'utf8'), {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      })
      .replace(/from '\.\/(engine|materials|catalog)'/g, "from './$1.mjs'"),
  );
}
const {
  CUES,
  DEFAULTS,
  KEYS,
  MODES,
  VOICES,
  VARIANTS,
  SHAPES,
  makePatch,
  MATERIAL_CUES,
  MATERIAL_FAMILIES,
  MATERIAL_ROLES,
} = await import(pathToFileURL(`${dir}/catalog.mjs`));
const { renderPatch, validatePatch, wavBytes } = await import(
  pathToFileURL(`${dir}/engine.mjs`)
);

assert.equal(MATERIAL_CUES.length, 24);
assert.deepEqual(
  MATERIAL_FAMILIES.map(({ id }) => id),
  ['felt', 'porcelain', 'elastic'],
);
assert.deepEqual(MATERIAL_ROLES, [
  'press',
  'release',
  'toggle',
  'confirm',
  'error',
  'notify',
  'transition',
  'complete',
]);
assert.equal(new Set(CUES.map(({ id }) => id)).size, CUES.length);
for (const family of MATERIAL_FAMILIES) {
  for (const role of MATERIAL_ROLES) {
    const cue = CUES.find(({ id }) => id === `${family.id}-${role}`);
    assert.ok(cue, `${family.id}-${role}`);
    assert.equal(cue.family, family.id);
    assert.equal(cue.role, role);
    assert.equal(cue.category, 'Materials');
    assert.equal(cue.source, 'Quiet');
  }
}

// Fixed before this expansion: all 72 original cues, six variants, four voices.
// This covers the PCM contract rather than merely preserving labels or recipe JSON.
const legacy = CUES.filter((cue) => !cue.family);
assert.equal(legacy.length, 72);
const legacyHash = createHash('sha256');
let legacyRenders = 0;
for (const cue of legacy)
  for (const variant of VARIANTS)
    for (const voice of VOICES) {
      legacyHash.update(`${cue.id}:${variant}:${voice}`);
      legacyHash.update(
        Buffer.from(
          renderPatch(makePatch(cue, { ...DEFAULTS, variant, voice })).data
            .buffer,
        ),
      );
      legacyRenders++;
    }
assert.equal(
  legacyHash.digest('hex'),
  'c7eca9e6ce15bbf213bc65302907c40ecbc87899d870edeb732223f294713ccd',
);

let validated = 0;
for (const cue of MATERIAL_CUES)
  for (const key of KEYS)
    for (const mode of MODES)
      for (const voice of VOICES)
        for (const variant of VARIANTS) {
          assert.ok(
            validatePatch(
              makePatch(cue, { ...DEFAULTS, key, mode, voice, variant }),
            ),
            cue.id,
          );
          validated++;
        }
const extremes = [
  { duration: 0.45, softness: 0, brightness: 0, texture: 0 },
  { duration: 2.5, softness: 100, brightness: 100, texture: 100 },
];
for (const cue of MATERIAL_CUES)
  for (const voice of VOICES)
    for (const variant of VARIANTS)
      for (const shape of SHAPES)
        for (const extreme of extremes) {
          const patch = makePatch(cue, {
            ...DEFAULTS,
            voice,
            variant,
            shape,
            ...extreme,
          });
          assert.ok(
            validatePatch(patch),
            JSON.stringify({ id: cue.id, voice, variant, shape, ...extreme }),
          );
          validated++;
        }

const digest = (rendered) =>
  createHash('sha256').update(Buffer.from(rendered.data.buffer)).digest('hex');
let rendered = 0,
  maxPeak = 0,
  maxDuration = 0,
  maxAbsMean = 0;
function inspect(cue, settings) {
  const patch = makePatch(cue, settings);
  const result = renderPatch(patch);
  assert.ok(result.data.every(Number.isFinite), cue.id);
  assert.ok(
    result.peak > 0 && result.peak < 0.12,
    `${cue.id}: peak ${result.peak}`,
  );
  assert.ok(
    result.duration > 0.02 && result.duration < 5,
    `${cue.id}: duration ${result.duration}`,
  );
  assert.ok(Math.abs(result.data[0]) < 0.00001, `${cue.id}: onset`);
  assert.equal(Math.abs(result.data.at(-1)), 0, `${cue.id}: tail`);
  const mean =
    result.data.reduce((sum, sample) => sum + sample, 0) / result.data.length;
  assert.ok(Math.abs(mean) < 0.001, `${cue.id}: DC mean ${mean}`);
  maxPeak = Math.max(maxPeak, result.peak);
  maxDuration = Math.max(maxDuration, result.duration);
  maxAbsMean = Math.max(maxAbsMean, Math.abs(mean));
  rendered++;
  return result;
}
for (const cue of MATERIAL_CUES) {
  const hashes = new Set();
  for (const voice of VOICES)
    for (const variant of VARIANTS) {
      inspect(cue, { ...DEFAULTS, voice, variant });
      if (voice === 'Soft')
        hashes.add(
          digest(renderPatch(makePatch(cue, { ...DEFAULTS, variant }))),
        );
    }
  // Glass + Long maximizes partial count and tail length; every shape is also rendered
  // at both extremes. The full Cartesian parameter set above remains schema-validated.
  for (const shape of SHAPES)
    for (const extreme of extremes)
      inspect(cue, {
        ...DEFAULTS,
        voice: 'Glass',
        variant: 'Long',
        shape,
        ...extreme,
      });
  inspect(cue, {
    ...DEFAULTS,
    key: 'B',
    variant: 'Light',
    voice: 'Pluck',
    shape: 'Ripple',
    ...extremes[0],
  });
  assert.equal(hashes.size, 6, `${cue.id}: variant PCM distinction`);
  const patch = makePatch(cue, DEFAULTS);
  const first = renderPatch(patch);
  assert.equal(
    digest(first),
    digest(renderPatch(patch)),
    `${cue.id}: deterministic`,
  );
  assert.notEqual(
    digest(first),
    digest(renderPatch(makePatch(cue, { ...DEFAULTS, seed: 2 }))),
    `${cue.id}: noise seed`,
  );
  const wav = wavBytes(first);
  const view = new DataView(wav.buffer);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 48000);
  assert.equal(view.getUint16(34, true), 16);
}
for (const role of MATERIAL_ROLES) {
  const hashes = MATERIAL_FAMILIES.map(({ id }) =>
    digest(
      renderPatch(
        makePatch(
          MATERIAL_CUES.find((cue) => cue.id === `${id}-${role}`),
          DEFAULTS,
        ),
      ),
    ),
  );
  assert.equal(new Set(hashes).size, 3, `${role}: material PCM distinction`);
}
for (const family of MATERIAL_FAMILIES) {
  const hashes = MATERIAL_CUES.filter(({ family: id }) => id === family.id).map(
    (cue) => digest(renderPatch(makePatch(cue, DEFAULTS))),
  );
  assert.equal(new Set(hashes).size, 8, `${family.id}: role PCM distinction`);
}

// Ratios stay related to one body instead of independently snapping each partial to a scale.
for (const family of MATERIAL_FAMILIES) {
  const cue = MATERIAL_CUES.find(({ id }) => id === `${family.id}-press`);
  const original = cue.recipe.layers.filter(({ kind }) => kind === 'tone');
  for (const key of KEYS) {
    const layers = makePatch(cue, { ...DEFAULTS, key }).layers.filter(
      ({ kind }) => kind === 'tone',
    );
    for (let i = 1; i < original.length; i++) {
      assert.ok(
        Math.abs(
          layers[i].frequency / layers[0].frequency -
            original[i].frequency / original[0].frequency,
        ) < 1e-8,
      );
    }
  }
}
const elastic = makePatch(
  MATERIAL_CUES.find(({ id }) => id === 'elastic-press'),
  DEFAULTS,
);
assert.ok(elastic.layers.some(({ fm }) => fm));
const noFm = {
  ...elastic,
  layers: elastic.layers.map(({ fm: _fm, ...layer }) => layer),
};
assert.notEqual(digest(renderPatch(elastic)), digest(renderPatch(noFm)));
for (const fm of [
  null,
  {},
  { ratio: NaN, depth: 1, decay: 0.02 },
  { ratio: 1, depth: Infinity, decay: 0.02 },
  { ratio: 1, depth: 1, decay: 0 },
]) {
  assert.equal(
    validatePatch({ ...elastic, layers: [{ ...elastic.layers[0], fm }] }),
    false,
  );
}
const noise = elastic.layers.find(({ kind }) => kind === 'noise');
assert.equal(
  validatePatch({
    ...elastic,
    layers: [{ ...noise, fm: { ratio: 1, depth: 1, decay: 0.02 } }],
  }),
  false,
);
const report = {
  families: 3,
  newCues: 24,
  legacyRenders,
  validatedPatches: validated,
  renderedAudio: rendered,
  maxPeakDbFS: 20 * Math.log10(maxPeak),
  maxDuration,
  maxAbsMean,
  checks: [
    'legacy PCM fingerprint',
    'family and role coverage',
    'all keys/modes/voices/variants',
    'shapes and parameter extremes',
    'finite PCM and endpoints',
    'bounded sample peak and DC',
    'deterministic render and noise seeds',
    'variant/family/role byte distinction',
    'WAV contract',
    'inharmonic ratios',
    'FM changes PCM and rejects invalid parameters',
  ],
  limitation:
    'Numerical checks do not establish perceived distinction or listening quality.',
};
writeFileSync(`${dir}/results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
