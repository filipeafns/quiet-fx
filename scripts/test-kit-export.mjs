import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { registryItemSchema } from 'shadcn/schema';

const modules = new Map();
const importCode = (code) =>
  import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
function compile(source) {
  return ts.transpile(source, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  });
}
async function sourceUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  const source = compile(await readFile(url, 'utf8'));
  let code = source;
  const ast = ts.createSourceFile(
    'source.js',
    source,
    ts.ScriptTarget.ES2022,
    true,
  );
  const edits = [];
  for (const statement of ast.statements) {
    if (
      !ts.isImportDeclaration(statement) &&
      !ts.isExportDeclaration(statement)
    )
      continue;
    const specifier = statement.moduleSpecifier;
    if (
      !specifier ||
      !ts.isStringLiteral(specifier) ||
      !specifier.text.startsWith('.')
    )
      continue;
    const dependency = await sourceUrl(new URL(`${specifier.text}.ts`, url));
    edits.push({
      start: specifier.getStart(ast),
      end: specifier.end,
      replacement: JSON.stringify(dependency),
    });
  }
  for (const edit of edits.reverse()) {
    code = code.slice(0, edit.start) + edit.replacement + code.slice(edit.end);
  }
  const result = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  modules.set(url.href, result);
  return result;
}
const root = new URL('../', import.meta.url);
const { buildKitPackageFiles, buildRegistryItem } = await import(
  await sourceUrl(new URL('lib/kit-export.ts', root))
);
const { KIT_ROLES, createKit, updateKitSlot, getKitPatches, parseKit } =
  await import(await sourceUrl(new URL('lib/audio/kits.ts', root)));
const { renderPatch, wavBytes } = await import(
  await sourceUrl(new URL('lib/audio/engine.ts', root))
);
const engineTs = await readFile(new URL('lib/audio/engine.ts', root), 'utf8');
const engineJs = compile(engineTs);
const license = await readFile(
  new URL('public/licenses/QUIET-MIT.txt', root),
  'utf8',
);

let kit = createKit({
  mood: 'playful',
  family: 'elastic',
  seed: 123,
  key: 'F♯',
});
kit = updateKitSlot(kit, 'confirm', {
  cueId: kit.slots.press.cueId,
  settings: { duration: 1.72, brightness: 73, seed: 9988 },
  locked: true,
});
const original = JSON.stringify(kit);
const patches = getKitPatches(kit);
const serializedPatches = JSON.parse(JSON.stringify(patches));
const files = buildKitPackageFiles(kit, { engineJs, license });
assert.equal(
  JSON.stringify(kit),
  original,
  'Building an export does not mutate editor state',
);
assert.deepEqual(parseKit(files['kit.json']), kit);
assert.deepEqual(JSON.parse(files['patches.json']), serializedPatches);
assert.deepEqual(
  Object.keys(files).filter((name) => name.startsWith('sounds/')),
  KIT_ROLES.map((role) => `sounds/${role}.wav`),
  'WAV names follow roles, preserving duplicate cue selections',
);
for (const role of KIT_ROLES) {
  const bytes = files[`sounds/${role}.wav`];
  assert.deepEqual(
    bytes,
    wavBytes(renderPatch(patches[role])),
    'WAV matches the audition patch exactly',
  );
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(header.getUint32(24, true), 48000);
  assert.equal(header.getUint16(22, true), 1);
  assert.equal(header.getUint16(34, true), 16);
}
assert.notDeepEqual(files['sounds/press.wav'], files['sounds/confirm.wav']);
assert.equal(files['quiet-engine.js'], engineJs);
assert.equal(files.LICENSE, license);
assert.equal(JSON.parse(files['package.json']).dependencies, undefined);
assert.ok(!files['index.js'].includes('assert {'));
assert.ok(!files['index.js'].includes('with {'));
assert.ok(!files['index.js'].includes('fetch('));
const archive = unzipSync(
  zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, contents]) => [
        name,
        typeof contents === 'string' ? strToU8(contents) : contents,
      ]),
    ),
  ),
);
assert.deepEqual(Object.keys(archive), Object.keys(files));
assert.equal(strFromU8(archive['kit.json']), files['kit.json']);
assert.deepEqual(archive['sounds/confirm.wav'], files['sounds/confirm.wav']);

const registry = buildRegistryItem(kit, engineTs, license);
assert.ok(
  registryItemSchema.safeParse(registry).success,
  'Registry passes the installed official shadcn schema',
);
assert.deepEqual(
  registry.files.map((file) => file.target),
  [
    '~/lib/quiet-fx/engine.ts',
    '~/lib/quiet-fx/kit.ts',
    '~/lib/quiet-fx/LICENSE',
  ],
);
assert.equal(registry.files.length, 3);
assert.deepEqual(
  registry.files.map((file) => file.type),
  ['registry:lib', 'registry:lib', 'registry:file'],
);
assert.equal(
  registry.files[2].content,
  license,
  'A separate plain-text license survives source transformations',
);
assert.equal(registry.type, 'registry:lib');
assert.deepEqual(registry.dependencies, []);
for (const file of registry.files) {
  assert.ok(file.content.includes('MIT License'));
  assert.ok(file.content.includes('Permission is hereby granted'));
  assert.ok(!file.content.includes('from "@uiarc'));
  assert.ok(!file.content.includes('from "shadcn'));
}

// Typecheck the delivered TypeScript itself, not only the generating template.
const virtualRoot = resolve('work/kit-export-typecheck');
const virtual = new Map(
  registry.files
    .filter((file) => file.path.endsWith('.ts'))
    .map((file) => [
      resolve(virtualRoot, file.path.split('/').at(-1)),
      file.content,
    ]),
);
const options = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  types: [],
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
};
const host = ts.createCompilerHost(options);
const read = host.readFile.bind(host);
const exists = host.fileExists.bind(host);
const directoryExists = host.directoryExists.bind(host);
host.readFile = (path) => virtual.get(path) ?? read(path);
host.fileExists = (path) => virtual.has(path) || exists(path);
host.directoryExists = (path) => path === virtualRoot || directoryExists(path);
host.getSourceFile = (path, languageVersion) => {
  const source = host.readFile(path);
  return source === undefined
    ? undefined
    : ts.createSourceFile(path, source, languageVersion);
};
const program = ts.createProgram([...virtual.keys()], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.deepEqual(
  diagnostics.map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  ),
  [],
  'Downloaded registry TypeScript compiles under strict settings',
);

const contexts = [];
let manualResume = false;
class AudioContextDouble {
  state = 'suspended';
  currentTime = 10;
  destination = {};
  sources = [];
  buffers = [];
  resumes = [];
  closes = 0;
  constructor() {
    contexts.push(this);
  }
  createGain() {
    const gain = {
      value: 1,
      setTargetAtTime(value) {
        gain.value = value;
      },
      cancelScheduledValues() {},
    };
    return { gain, connect() {}, disconnect() {} };
  }
  createAnalyser() {
    return { fftSize: 0, connect() {}, disconnect() {} };
  }
  createBuffer(channels, length, sampleRate) {
    assert.equal(channels, 1);
    const buffer = {
      sampleRate,
      data: new Float32Array(length),
      copyToChannel(data, channel) {
        assert.equal(channel, 0);
        this.data.set(data);
      },
    };
    this.buffers.push(buffer);
    return buffer;
  }
  createBufferSource() {
    const source = {
      buffer: null,
      onended: null,
      started: false,
      stopped: false,
      connect() {},
      disconnect() {},
      start() {
        this.started = true;
      },
      stop() {
        this.stopped = true;
      },
    };
    this.sources.push(source);
    return source;
  }
  resume() {
    if (!manualResume) {
      this.state = 'running';
      return Promise.resolve();
    }
    return new Promise((resolve, reject) =>
      this.resumes.push({
        resolve: () => {
          if (this.state !== 'closed') this.state = 'running';
          resolve();
        },
        reject,
      }),
    );
  }
  close() {
    this.state = 'closed';
    this.closes++;
    return Promise.resolve();
  }
  finish() {
    for (const source of this.sources) source.onended?.();
  }
}
class DocumentDouble {
  hidden = false;
  listeners = new Map();
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) {
    this.listeners.get(type)?.delete(fn);
  }
  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
  count() {
    return [...this.listeners.values()].reduce(
      (sum, group) => sum + group.size,
      0,
    );
  }
}
const originalGlobals = Object.fromEntries(
  ['AudioContext', 'document', 'navigator'].map((name) => [
    name,
    Object.getOwnPropertyDescriptor(globalThis, name),
  ]),
);
const doc = new DocumentDouble();
const activation = { isActive: true };
Object.defineProperty(globalThis, 'AudioContext', {
  configurable: true,
  value: AudioContextDouble,
});
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: doc,
});
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { userActivation: activation },
});
const needle = 'export function renderPatch(p, sampleRate = 48000) {';
assert.ok(engineJs.includes(needle));
const instrumented = `${engineJs.replace(needle, `${needle}\n  renderCalls++;`)}\nexport let renderCalls = 0;`;
const instrumentedUrl = `data:text/javascript;base64,${Buffer.from(instrumented).toString('base64')}`;
const instrumentedEngine = await import(instrumentedUrl);
const packageModule = await importCode(
  files['index.js'].replace(
    '"./quiet-engine.js"',
    JSON.stringify(instrumentedUrl),
  ),
);
const registryModule = await importCode(
  compile(registry.files[1].content).replace(
    '"./engine"',
    JSON.stringify(instrumentedUrl),
  ),
);
assert.deepEqual(packageModule.kitPatches, serializedPatches);
assert.deepEqual(registryModule.kitPatches, serializedPatches);
assert.ok(Object.isFrozen(packageModule.kitPatches.confirm.layers[0]));
assert.equal(contexts.length, 0, 'Import never creates an AudioContext');

try {
  for (const exported of [packageModule, registryModule]) {
    const initialContexts = contexts.length;
    const initialRenders = instrumentedEngine.renderCalls;
    const player = exported.createKitPlayer({ muted: true, volume: 0.2 });
    assert.equal(
      contexts.length,
      initialContexts,
      'Creation does not unlock audio',
    );
    assert.equal(await player.play('press'), false, 'Host mute is honored');
    assert.equal(contexts.length, initialContexts);
    player.setMuted(false);
    activation.isActive = false;
    assert.equal(
      await player.play('press'),
      false,
      'No gesture means no initial audio context',
    );
    assert.equal(contexts.length, initialContexts);
    activation.isActive = true;
    assert.equal(await player.play('confirm'), true);
    const context = contexts.at(-1);
    assert.deepEqual(
      context.buffers.at(-1).data,
      renderPatch(patches.confirm).data,
      'Delivered runtime plays the exact audition PCM',
    );
    context.finish();
    assert.equal(await player.play('confirm'), true);
    assert.equal(
      instrumentedEngine.renderCalls,
      initialRenders + 1,
      'A repeated role uses its render cache',
    );
    context.finish();
    const beforeUnmute = context.sources.length;
    player.setMuted(true);
    assert.equal(await player.play('confirm'), false);
    player.setMuted(false);
    assert.equal(
      context.sources.length,
      beforeUnmute,
      'Unmuting never plays by itself',
    );
    assert.equal(
      await player.play('confirm'),
      true,
      'Unmuting a running context allows the next requested sound',
    );
    context.finish();
    assert.deepEqual(
      await Promise.all([
        player.play('press'),
        player.play('release'),
        player.play('toggle'),
      ]),
      [true, true, true],
      'Same-tick play calls overlap when audio is already running',
    );
    assert.equal(await player.play('notify'), false, 'Polyphony is bounded');
    assert.equal(await player.play('notify', { interrupt: true }), true);
    assert.ok(
      context.sources.slice(-4, -1).every((source) => source.stopped),
      'Interrupt stops all three active voices',
    );
    doc.hidden = true;
    doc.emit('visibilitychange');
    assert.ok(context.sources.at(-1).stopped);
    assert.equal(await player.play('press'), false);
    doc.hidden = false;
    assert.equal(await player.play('press'), true);
    doc.emit('keydown', { key: 'Escape' });
    assert.ok(context.sources.at(-1).stopped);
    assert.equal(await player.play('missing'), false);
    assert.throws(() => player.setVolume(NaN), /finite/);
    player.setVolume(0.1);
    await player.dispose();
    await player.dispose();
    assert.equal(context.closes, 1, 'Dispose is idempotent');
    assert.equal(await player.play('confirm'), false);
    assert.equal(doc.count(), 0, 'Disposal removes every owned listener');

    for (const cancellation of ['stop', 'mute', 'dispose', 'hide', 'reject']) {
      manualResume = true;
      const owner = exported.createKitPlayer();
      const pending = owner.play('confirm');
      const pendingContext = contexts.at(-1);
      if (cancellation === 'stop') owner.stop();
      if (cancellation === 'mute') owner.setMuted(true);
      if (cancellation === 'dispose') await owner.dispose();
      if (cancellation === 'hide') {
        doc.hidden = true;
        doc.emit('visibilitychange');
      }
      if (cancellation === 'reject')
        pendingContext.resumes[0].reject(new Error('Blocked'));
      else pendingContext.resumes[0].resolve();
      assert.equal(
        await pending,
        false,
        `Pending unlock cannot outlive ${cancellation}`,
      );
      assert.equal(pendingContext.sources.length, 0);
      doc.hidden = false;
      await owner.dispose();
      assert.equal(doc.count(), 0);
      manualResume = false;
    }
    manualResume = true;
    const concurrent = exported.createKitPlayer();
    const older = concurrent.play('press');
    const newer = concurrent.play('confirm');
    const context2 = contexts.at(-1);
    assert.equal(
      context2.resumes.length,
      1,
      'Concurrent first plays share one audio unlock',
    );
    context2.resumes[0].resolve();
    assert.equal(await older, true);
    assert.equal(await newer, true);
    assert.equal(
      context2.sources.length,
      2,
      'Same-tick requests remain overlapping after a shared unlock',
    );
    await concurrent.dispose();
    for (const resolutionOrder of [
      [0, 1],
      [1, 0],
    ]) {
      const replacementOwner = exported.createKitPlayer();
      const cancelled = replacementOwner.play('press');
      const replacement = replacementOwner.play('confirm', { interrupt: true });
      const replacementContext = contexts.at(-1);
      assert.equal(
        replacementContext.resumes.length,
        2,
        'An interrupting first play starts a fresh unlock',
      );
      for (const index of resolutionOrder)
        replacementContext.resumes[index].resolve();
      assert.equal(
        await cancelled,
        false,
        'The superseded first play is cancelled',
      );
      assert.equal(
        await replacement,
        true,
        'The interrupting replacement survives the previous unlock cancellation',
      );
      assert.equal(replacementContext.sources.length, 1);
      assert.deepEqual(
        replacementContext.buffers[0].data,
        renderPatch(patches.confirm).data,
      );
      await replacementOwner.dispose();
    }
    manualResume = false;
    const immediatelyRunning = exported.createKitPlayer();
    assert.deepEqual(
      await Promise.all([
        immediatelyRunning.play('press'),
        immediatelyRunning.play('confirm'),
      ]),
      [true, true],
      'A context reporting running before resume settles still shares its pending unlock',
    );
    await immediatelyRunning.dispose();
  }
  assert.throws(
    () => packageModule.createKitPlayer({ maxVoices: 9 }),
    /maxVoices/,
  );
  assert.throws(
    () => packageModule.createKitPlayer({ volume: Infinity }),
    /finite/,
  );
  assert.equal(doc.count(), 0);
  assert.throws(
    () =>
      buildKitPackageFiles(kit, { engineJs: '<html>missing</html>', license }),
    /engine/,
  );
  assert.throws(() => buildRegistryItem(kit, engineTs, ''), /license/);
} finally {
  for (const [name, descriptor] of Object.entries(originalGlobals)) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
}

console.log(
  'Kit exports: exact role WAV/PCM/recipes, ZIP round-trip, official registry schema, strict delivered TypeScript, mute/gesture/cache/polyphony/cancellation/disposal pass.',
);
