import ts from 'typescript';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = path.resolve(process.env.QUIET_WORK_DIR || 'work', 'sequence-qa');
mkdirSync(dir, { recursive: true });
for (const name of ['engine', 'catalog', 'color', 'sequences']) {
  const source = readFileSync(`lib/audio/${name}.ts`, 'utf8');
  writeFileSync(
    `${dir}/${name}.mjs`,
    ts
      .transpile(source, {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      })
      .replace(/from '\.\/(engine|catalog)'/g, "from './$1.mjs'"),
  );
}
const { CUES, DEFAULTS, makePatch } = await import(
  pathToFileURL(`${dir}/catalog.mjs`)
);
const { renderPatch, wavBytes } = await import(
  pathToFileURL(`${dir}/engine.mjs`)
);
const { signalLevel, heatPosition, signalRGB } = await import(
  pathToFileURL(`${dir}/color.mjs`)
);
const { CHAT_ACTIONS, buildConversation, conversationPose, conversationStage } =
  await import(pathToFileURL(`${dir}/sequences.mjs`));
assert.equal(CHAT_ACTIONS.length, 8);
assert.equal(new Set(CHAT_ACTIONS.map((a) => a.cue)).size, 8);
let cases = 0,
  maxPeak = 0;
for (const action of [...CHAT_ACTIONS.map((a) => a.id), 'flow'])
  for (const variant of ['Normal', 'Short', 'Long'])
    for (const offset of [-150, 0, 150]) {
      const r = buildConversation(action, { ...DEFAULTS, variant }, 1, offset);
      assert.ok(r.rendered.data.every(Number.isFinite));
      assert.ok(r.rendered.peak > 0 && r.rendered.peak < 0.2);
      assert.equal(r.rendered.data.at(-1), 0);
      for (const e of r.events)
        assert.ok(e.at >= 0 && e.at < r.rendered.duration);
      assert.ok(r.rendered.duration >= r.motionDuration);
      assert.equal(r.events.length, action === 'flow' ? 10 : 1);
      maxPeak = Math.max(maxPeak, r.rendered.peak);
      cases++;
    }
const flow = buildConversation('flow', DEFAULTS);
writeFileSync(`${dir}/conversation-flow.wav`, wavBytes(flow.rendered));
assert.deepEqual(
  flow.events.map((e) => Number(e.at.toFixed(2))).sort((a, b) => a - b),
  [0.05, 2.39, 4.48, 6.18, 7.33, 8.32, 10.18, 11.22, 14.17, 15.33],
);
const normal = buildConversation('cards', DEFAULTS),
  fast = buildConversation('cards', DEFAULTS, 1.5),
  slow = buildConversation('cards', DEFAULTS, 0.5);
assert.ok(Math.abs(fast.motionDuration * 1.5 - normal.motionDuration) < 1e-9);
assert.ok(Math.abs(slow.motionDuration * 0.5 - normal.motionDuration) < 1e-9);
const late = buildConversation('cards', DEFAULTS, 1, 150),
  early = buildConversation('cards', DEFAULTS, 1, -150);
assert.ok(Math.abs(late.events[0].at - normal.events[0].at - 0.15) < 1e-9);
assert.equal(early.lead, 0.15);
const replacement = buildConversation('upload', DEFAULTS, 1, 0, 'sparkle');
assert.ok(replacement.rendered.peak > 0);
const upload = buildConversation('upload', DEFAULTS),
  retry = buildConversation('retry', DEFAULTS);
const hasEnergyNear = (r, seconds) =>
  r.data
    .subarray(Math.floor(seconds * 48000), Math.floor((seconds + 0.05) * 48000))
    .some((v) => Math.abs(v) > 0.002);
assert.ok(
  hasEnergyNear(upload.rendered, (12.04 - upload.start) * upload.scale),
);
assert.ok(hasEnergyNear(retry.rendered, (16.07 - retry.start) * retry.scale));
for (const action of CHAT_ACTIONS) {
  const p = conversationPose(action.end);
  assert.ok(Object.values(p).every(Number.isFinite));
}
assert.equal(conversationPose(4).message, 0);
assert.equal(conversationPose(4.8).message, 1);
assert.equal(conversationPose(12.3).uploaded, 1);
assert.equal(conversationPose(15.6).retrying, 1);
assert.equal(conversationPose(16.4).retry, 1);
assert.equal(conversationPose(16.4).deliveryControl, 0);
assert.equal(conversationStage(17), 'retry');
for (let t = 0; t <= 17.6; t += 1 / 60) {
  const p = conversationPose(t);
  for (const [key, value] of Object.entries(p))
    if (!['scroll', 'retryTurn'].includes(key))
      assert.ok(value >= 0 && value <= 1);
}
assert.equal(signalLevel(0), 0);
assert.equal(signalLevel(NaN), 0);
let prior = 0;
for (let db = -80; db <= 0; db++) {
  const level = signalLevel(10 ** (db / 20));
  assert.ok(level >= prior);
  prior = level;
  for (const share of [0, 0.5, 1]) {
    const rgb = signalRGB(level, share);
    assert.ok(rgb.every((v) => Number.isInteger(v) && v >= 0 && v <= 255));
  }
}
assert.ok(heatPosition(0.5, 1) > heatPosition(0.5, 0));
const pureTone = renderPatch({
  ...makePatch(CUES[0], DEFAULTS),
  layers: [
    { kind: 'tone', frequency: 440, peak: 0.03, attack: 0.005, decay: 0.1 },
  ],
});
const pureNoise = renderPatch({
  ...makePatch(CUES[0], DEFAULTS),
  layers: [
    {
      kind: 'noise',
      filterFrequency: 1200,
      peak: 0.06,
      attack: 0.005,
      decay: 0.1,
    },
  ],
});
assert.equal(pureTone.toneShare, 1);
assert.equal(pureNoise.toneShare, 0);
const report = {
  sequenceRenders: cases,
  actions: 8,
  fullFlowEvents: 10,
  maxPeakDbFS: 20 * Math.log10(maxPeak),
  referenceDuration: 17.6,
  checks: [
    'reference beat ordering',
    'upload completion and retry recovery audio',
    'speed and positive/negative offsets',
    'sound replacement',
    'finite PCM and clean endpoints',
    '60fps pose bounds',
    'tone/noise energy',
    'fixed monotonic signal scale',
    'finite RGB gamut',
  ],
};
writeFileSync(`${dir}/results.json`, JSON.stringify(report, null, 2));
console.log(report);
