import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import {
  CUES,
  DEFAULTS,
  makePatch,
  renderPatch,
} from '../packages/quiet-sounds/dist/index.js';

const runtimeUrl = new URL(
  '../packages/quiet-sounds/dist/index.js',
  import.meta.url,
).href;
const source = ts
  .transpile(
    await readFile(new URL('../lib/install-setup.ts', import.meta.url), 'utf8'),
    { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  )
  .replace("from './audio/catalog'", `from '${runtimeUrl}'`);
const importCode = (code) =>
  import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const { INSTALL_COMMAND, buildInstallSetup, buildLibraryJson } =
  await importCode(source);
assert.equal(INSTALL_COMMAND, 'npm install github:filipeafns/quiet-fx#v0.4.1');

// Execute the generated module with the actual library. Only browser audio I/O is fake.
const contexts = [];
let manualResume = false;
class AudioContextDouble {
  state = 'suspended';
  currentTime = 10;
  destination = {};
  starts = [];
  resumes = [];
  closes = 0;
  constructor() {
    contexts.push(this);
  }
  createGain() {
    return {
      gain: { value: 1, setTargetAtTime() {}, cancelScheduledValues() {} },
      connect() {},
      disconnect() {},
    };
  }
  createAnalyser() {
    return { fftSize: 0, connect() {}, disconnect() {} };
  }
  createBuffer(channels, length, sampleRate) {
    assert.equal(channels, 1);
    return {
      sampleRate,
      data: new Float32Array(length),
      copyToChannel(data, channel) {
        assert.equal(channel, 0);
        this.data.set(data);
      },
    };
  }
  createBufferSource() {
    const context = this;
    return {
      buffer: null,
      connect() {},
      disconnect() {},
      stop() {},
      start(at) {
        context.starts.push({ at, buffer: this.buffer });
      },
    };
  }
  resume() {
    if (!manualResume) {
      this.state = 'running';
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.resumes.push({
        resolve: () => {
          if (this.state !== 'closed') this.state = 'running';
          resolve();
        },
        reject,
      });
    });
  }
  close() {
    this.state = 'closed';
    this.closes += 1;
    return Promise.resolve();
  }
}
const previousAudioContext = globalThis.AudioContext;
globalThis.AudioContext = AudioContextDouble;
let moduleId = 0;
const loadSetup = (setup) =>
  importCode(
    setup.code.replace("from 'quiet-fx'", `from '${runtimeUrl}'`) +
      `\n// Test module ${moduleId++}`,
  );
const custom = Object.freeze({
  ...DEFAULTS,
  key: 'F♯',
  mode: 'Minor',
  voice: 'Glass',
  variant: 'Airy',
  shape: 'Double',
  softness: 61,
  brightness: 72,
  duration: 1.65,
  texture: 79,
  seed: 241,
});

try {
  const cases = [
    DEFAULTS,
    { ...DEFAULTS, key: 'F♯' },
    { ...DEFAULTS, mode: 'Minor' },
    { ...DEFAULTS, mode: 'Pentatonic', variant: 'Long' },
    { ...DEFAULTS, duration: 0.65, seed: 88 },
    custom,
  ];
  for (const [index, settings] of cases.entries()) {
    const cueId = index % 2 ? 'sparkle' : 'mist';
    const input = Object.freeze({ ...settings });
    const before = JSON.stringify(input);
    const setup = buildInstallSetup(cueId, input);
    assert.equal(setup.install, INSTALL_COMMAND);
    for (const [assistant, prompt] of [
      ['Codex', setup.codexPrompt],
      ['Claude', setup.claudePrompt],
    ]) {
      assert.ok(prompt.startsWith(`${assistant},`));
      assert.ok(
        prompt.includes(setup.code),
        'Prompt contains the entire live setup',
      );
      assert.ok(prompt.includes(INSTALL_COMMAND));
      assert.ok(prompt.includes('https://quiefx.dev/docs/index.md'));
    }
    const count = contexts.length;
    const setupModule = await loadSetup(setup);
    assert.equal(
      contexts.length,
      count,
      'Importing setup never opens or autoplays audio',
    );
    assert.equal(setupModule.quietCueId, cueId);
    assert.deepEqual(
      setupModule.quietSettings,
      input,
      'All settings survive code generation',
    );
    const owner = setupModule.createQuietSound();
    assert.equal(
      contexts.length,
      count,
      'Creating an owner waits for a playback gesture',
    );
    assert.equal(await owner.play(), true);
    assert.equal(contexts.length, count + 1);
    const context = contexts.at(-1);
    const expected = renderPatch(
      makePatch(
        CUES.find((cue) => cue.id === cueId),
        input,
      ),
    );
    assert.deepEqual(
      context.starts[0].buffer.data,
      expected.data,
      'Generated playback matches configured PCM',
    );
    assert.equal(context.starts[0].buffer.sampleRate, expected.sampleRate);
    assert.equal(await owner.play(), true);
    assert.equal(
      contexts.length,
      count + 1,
      'Repeated playback reuses one player/context',
    );
    assert.deepEqual(context.starts[1].buffer.data, expected.data);
    await owner.dispose();
    await owner.dispose();
    assert.equal(context.closes, 1, 'Disposal is idempotent');
    assert.equal(
      await owner.play(),
      false,
      'Disposed setup cannot create new audio',
    );
    assert.equal(contexts.length, count + 1);
    const remounted = setupModule.createQuietSound();
    assert.equal(
      await remounted.play(),
      true,
      'A remount creates a working owner from the cached ESM module',
    );
    assert.equal(contexts.length, count + 2);
    assert.deepEqual(contexts.at(-1).starts[0].buffer.data, expected.data);
    await remounted.dispose();
    assert.equal(
      JSON.stringify(input),
      before,
      'Generating and playing leaves studio settings unchanged',
    );
  }

  manualResume = true;
  const setupModule = await loadSetup(buildInstallSetup('sparkle', custom));
  const owner = setupModule.createQuietSound();
  const cancelled = owner.play();
  const context = contexts.at(-1);
  owner.stop();
  context.resumes[0].resolve();
  assert.equal(await cancelled, false);
  assert.equal(
    context.starts.length,
    0,
    'Stopped unlock does not replay a queued gesture',
  );

  const stale = owner.play();
  const latest = owner.play();
  context.resumes[1].resolve();
  assert.equal(await stale, false);
  context.resumes[2].resolve();
  assert.equal(await latest, true);
  assert.equal(
    context.starts.length,
    1,
    'Only the newest overlapping unlock plays',
  );

  const pending = owner.play();
  await owner.dispose();
  context.resumes[3].resolve();
  assert.equal(await pending, false);
  assert.equal(context.starts.length, 1, 'Disposal cancels pending playback');
  assert.equal(context.state, 'closed');

  const blockedModule = await loadSetup(buildInstallSetup('sparkle', DEFAULTS));
  const blockedOwner = blockedModule.createQuietSound();
  const blocked = blockedOwner.play();
  const blockedContext = contexts.at(-1);
  blockedContext.resumes[0].reject(new Error('Audio permission denied'));
  assert.equal(
    await blocked,
    false,
    'Rejected browser unlock fails without unhandled rejection',
  );
  assert.equal(blockedContext.starts.length, 0);
  await blockedOwner.dispose();
} finally {
  if (previousAudioContext === undefined) delete globalThis.AudioContext;
  else globalThis.AudioContext = previousAudioContext;
}

const entries = Object.freeze(
  CUES.map((cue, index) =>
    Object.freeze({
      cueId: cue.id,
      settings: Object.freeze({
        ...DEFAULTS,
        ...(cue.id === 'sparkle' ? custom : {}),
        seed: index + 12,
      }),
    }),
  ),
);
const original = JSON.stringify(entries);
const output = buildLibraryJson(entries, 'sparkle');
assert.equal(
  output,
  buildLibraryJson(entries, 'sparkle'),
  'Export is deterministic',
);
const library = JSON.parse(output);
assert.equal(library.schemaVersion, 1);
assert.equal(library.version, '0.4.1');
assert.equal(library.source, 'https://quiefx.dev');
assert.equal(library.selectedCueId, 'sparkle');
assert.equal(library.install, INSTALL_COMMAND);
assert.equal(library.patches.length, 72, 'The complete library is exported');
assert.equal(new Set(library.patches.map(({ id }) => id)).size, 72);
for (const [index, patch] of library.patches.entries()) {
  const entry = entries[index];
  assert.equal(patch.id, entry.cueId);
  assert.deepEqual(patch.settings, entry.settings);
  const expected = makePatch(
    CUES.find((cue) => cue.id === entry.cueId),
    entry.settings,
  );
  assert.deepEqual(
    patch,
    JSON.parse(JSON.stringify(expected)),
    'Every patch preserves its per-cue override',
  );
}
assert.deepEqual(library.selectedCue, {
  id: 'sparkle',
  name: 'Sparkle',
  settings: entries.find(({ cueId }) => cueId === 'sparkle').settings,
});
assert.deepEqual(
  renderPatch(library.patches[0]).data,
  renderPatch(makePatch(CUES[0], entries[0].settings)).data,
  'The exported library remains directly renderable with the existing package API',
);
assert.equal(
  JSON.stringify(entries),
  original,
  'Export does not mutate library inputs',
);
assert.throws(
  () => buildInstallSetup('missing', DEFAULTS),
  /Unknown Quiet FX sound/,
);
assert.throws(
  () => buildLibraryJson([entries[0], entries[0]], entries[0].cueId),
  /Duplicate/,
);
assert.throws(
  () => buildLibraryJson(entries, 'missing'),
  /selected Quiet FX sound/,
);
console.log(
  'Install setup: generated PCM, complete settings, gesture cancellation, disposal, assistant prompts and 72-patch library export passed.',
);
