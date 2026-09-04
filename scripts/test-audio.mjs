import ts from 'typescript';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const dir = path.resolve(process.env.QUIET_WORK_DIR || 'work', 'audio-qa');
mkdirSync(dir, { recursive: true });
for (const f of ['engine', 'catalog']) {
  const source = readFileSync(`lib/audio/${f}.ts`, 'utf8');
  const js = ts
    .transpile(source, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    })
    .replace(/from '\.\/(engine)'/g, "from './$1.mjs'");
  writeFileSync(`${dir}/${f}.mjs`, js);
}
const { CUES, DEFAULTS, KEYS, makePatch } = await import(
  pathToFileURL(`${dir}/catalog.mjs`)
);
const {
  renderPatch,
  wavBytes,
  validatePatch,
  waveform,
  durationOf,
  SoundPlayer,
} = await import(pathToFileURL(`${dir}/engine.mjs`));
assert.equal(CUES.length, 72);
assert.equal(new Set(CUES.map((c) => c.id)).size, 72);
let validated = 0,
  rendered = 0,
  peak = 0;
for (const cue of CUES)
  for (const mode of ['Major', 'Minor', 'Pentatonic'])
    for (const key of KEYS)
      for (const voice of ['Soft', 'Felt', 'Glass', 'Pluck'])
        for (const variant of [
          'Light',
          'Normal',
          'Deep',
          'Short',
          'Long',
          'Airy',
        ]) {
          assert.ok(
            validatePatch(
              makePatch(cue, { ...DEFAULTS, mode, key, voice, variant }),
            ),
            `${cue.id} ${mode} ${key} ${voice} ${variant}`,
          );
          validated++;
        }
for (const cue of CUES)
  for (const variant of ['Light', 'Normal', 'Deep', 'Short', 'Long', 'Airy'])
    for (const voice of ['Soft', 'Felt', 'Glass', 'Pluck'])
      for (const shape of ['Natural', 'Taper', 'Swell', 'Ripple', 'Double'])
        for (const extreme of [
          { duration: 0.45, softness: 0, texture: 0 },
          { duration: 2.5, softness: 100, texture: 100 },
        ]) {
          const p = makePatch(cue, {
            ...DEFAULTS,
            variant,
            voice,
            shape,
            ...extreme,
          });
          assert.ok(
            validatePatch(p),
            JSON.stringify({ id: cue.id, variant, voice, shape, ...extreme }),
          );
          validated++;
        }
for (const id of ['wood-tap', 'glass-touch']) {
  const cue = CUES.find((c) => c.id === id);
  for (const key of KEYS) {
    const p = makePatch(cue, { ...DEFAULTS, key });
    assert.ok(
      Math.abs(
        p.layers[1].frequency / p.layers[0].frequency -
          (id === 'wood-tap' ? 2.76 : 2.41),
      ) < 0.0001,
    );
  }
}
const gliding = makePatch(
  CUES.find((c) => c.id === 'send'),
  { ...DEFAULTS, voice: 'Pluck' },
).layers.filter((l) => l.kind === 'tone');
assert.ok(
  Math.abs(
    gliding[0].glideTo / gliding[0].frequency -
      gliding[1].glideTo / gliding[1].frequency,
  ) < 1e-8,
);
for (const cue of CUES)
  for (const variant of ['Light', 'Normal', 'Deep', 'Short', 'Long', 'Airy']) {
    const p = makePatch(cue, { ...DEFAULTS, variant }),
      r = renderPatch(p);
    assert.ok(r.peak > 0 && r.peak < 0.2);
    assert.ok(r.data.every(Number.isFinite));
    peak = Math.max(peak, r.peak);
    assert.deepEqual(r.data, renderPatch(p).data);
    const wav = wavBytes(r);
    assert.equal(wav.length, 44 + r.data.length * 2);
    const v = new DataView(wav.buffer);
    assert.equal(v.getUint32(24, true), 48000);
    assert.equal(v.getUint16(34, true), 16);
    for (let i = 0; i < r.data.length; i += 101)
      assert.ok(
        Math.abs(v.getInt16(44 + i * 2, true) / 32767 - r.data[i]) <=
          1 / 65534 + 1e-9,
      );
    assert.equal(Math.abs(r.data.at(-1)), 0);
    rendered++;
    if (variant === 'Normal') writeFileSync(`${dir}/${cue.id}.wav`, wav);
  }
const invalid = makePatch(CUES[0], DEFAULTS);
assert.equal(validatePatch({ ...invalid, layers: [null] }), false);
assert.equal(validatePatch({ ...invalid, layers: [] }), false);
assert.equal(validatePatch({ ...invalid, masterGain: Infinity }), false);
assert.equal(
  validatePatch({
    ...invalid,
    layers: [{ ...invalid.layers[0], frequency: -1 }],
  }),
  false,
);
const tail = {
  ...invalid,
  shimmer: { delay: 0.4, feedback: 0.65, wet: 0.5, lowpass: 4000 },
};
assert.ok(durationOf(tail) > 10);
const r = renderPatch(tail);
assert.ok(
  r.data.subarray(r.data.length - 200).every((x) => Math.abs(x) < 0.00001),
);
const remainder = new Float32Array(101);
remainder[100] = 1;
assert.equal(waveform(remainder, 100).at(-1), 1);
const a = renderPatch(
  makePatch(
    CUES.find((c) => c.id === 'page-turn'),
    { ...DEFAULTS, seed: 1 },
  ),
);
const b = renderPatch(
  makePatch(
    CUES.find((c) => c.id === 'page-turn'),
    { ...DEFAULTS, seed: 2 },
  ),
);
assert.notDeepEqual(a.data, b.data);
// AudioContext fake exercises cancellation of asynchronous resume and source lifecycles.
let resume;
class FakeContext {
  currentTime = 0;
  state = 'suspended';
  destination = {};
  createGain() {
    return {
      gain: { setTargetAtTime() {}, cancelScheduledValues() {} },
      connect() {},
      disconnect() {},
    };
  }
  createAnalyser() {
    return { fftSize: 0, connect() {} };
  }
  resume() {
    return new Promise(
      (r) =>
        (resume = () => {
          this.state = 'running';
          r();
        }),
    );
  }
  createBuffer(_c, _l, _s) {
    return { copyToChannel() {} };
  }
  createBufferSource() {
    return {
      connect() {},
      disconnect() {},
      start() {},
      stop() {},
      onended: null,
    };
  }
}
globalThis.AudioContext = FakeContext;
const player = new SoundPlayer();
assert.equal(player.unlock(), false);
assert.equal(player.play(a), null);
const pending = player.enable();
player.mute();
resume();
assert.equal(await pending, false);
assert.equal(player.muted, true);
const next = player.enable();
resume();
assert.equal(await next, true);
player.play(a);
assert.equal(player.active.size, 1);
player.play(b);
assert.equal(player.active.size, 1);
player.play(a, 0, false, 0.55);
player.play(b, 0, false, 0.55);
assert.equal(player.active.size, 3);
assert.deepEqual(
  [...player.active].map((voice) => voice.gain.gain.value),
  [1, 0.55, 0.55],
);
player.play(a);
assert.equal(player.active.size, 1);
assert.equal([...player.active][0].gain.gain.value, 1);
player.stop();
assert.equal(player.active.size, 0);
// Compare all variants of each cue: parameters, length and PCM must produce distinct bytes.
for (const cue of CUES) {
  const hashes = new Set();
  for (const variant of ['Light', 'Normal', 'Deep', 'Short', 'Long', 'Airy']) {
    const r = renderPatch(makePatch(cue, { ...DEFAULTS, variant }));
    hashes.add(
      createHash('sha256').update(new Uint8Array(r.data.buffer)).digest('hex'),
    );
  }
  assert.equal(hashes.size, 6, cue.id + ' variants must differ');
}
// Lossy export must accept even clips shorter than a single MP3 frame.
const exportSource = readFileSync('lib/audio/export.ts', 'utf8').replace(
  "'@breezystack/lamejs'",
  JSON.stringify(
    pathToFileURL(
      path.resolve('node_modules/@breezystack/lamejs/dist/lamejs.js'),
    ).href,
  ),
);
writeFileSync(
  `${dir}/export.mjs`,
  ts.transpile(exportSource, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  }),
);
const { mp3Bytes } = await import(pathToFileURL(`${dir}/export.mjs`));
for (const id of ['tap', 'sparkle', 'page-turn']) {
  const r = renderPatch(
    makePatch(
      CUES.find((c) => c.id === id),
      DEFAULTS,
    ),
  );
  const mp3 = await mp3Bytes(r);
  assert.ok(mp3.length > 100);
  assert.equal(mp3[0], 255);
  writeFileSync(`${dir}/${id}.mp3`, mp3);
}
const tiny = await mp3Bytes({
  data: new Float32Array(624).fill(0.002),
  sampleRate: 48000,
  duration: 0.013,
  peak: 0.002,
  rms: 0.002,
});
assert.ok(tiny.length > 100);
writeFileSync(`${dir}/tiny.mp3`, tiny);
const report = {
  validatedPatches: validated,
  renderedAudio: rendered,
  maxPeakDbFS: 20 * Math.log10(peak),
  sampleRate: 48000,
  bits: 16,
  checks: [
    'material partial ratios',
    'Pluck glide ratios',
    'variant PCM uniqueness',
    'duration and shape extremes',
    'MP3 including sub-frame clips',
    'suspended playback refusal',
    'all cue/mode/key/voice/variant combinations',
    'deterministic PCM',
    'seed variation',
    'WAV quantization',
    'clean endpoints',
    'long echo tails',
    'invalid imports',
    'waveform remainder',
    'async enable cancellation',
    'interruptible sources',
    'overlapping voices and per-voice gain',
  ],
};
writeFileSync(`${dir}/results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
