import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const source = stripTypeScriptTypes(
  await readFile(new URL('../lib/orbit-logo.ts', import.meta.url), 'utf8'),
);
const { ORBIT_COUNT, ORBIT_WIDTH, ORBIT_HEIGHT, orbitPose, orbitHit } =
  await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  );

const measured = [
  [240, 56.2, 49.5],
  [353.54, 72, 38],
  [430.05, 109.7, 17],
  [467.65, 175, 6],
  [430.05, 240.3, 17],
  [353.54, 278, 38],
  [240, 293.8, 49.5],
  [126.46, 278, 38],
  [49.95, 240.3, 17],
  [12.35, 175, 6],
  [49.95, 109.7, 17],
  [126.46, 72, 38],
];
const fields = ['cx', 'cy', 'rx', 'ry'];
function near(actual, expected, tolerance = 1e-9, message = '') {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${message}: ${actual} vs ${expected}`,
  );
}
function nearPose(actual, expected, tolerance = 1e-9) {
  for (const field of fields)
    near(actual[field], expected[field], tolerance, field);
}

assert.equal(ORBIT_COUNT, measured.length);
assert.equal(ORBIT_WIDTH, 480);
assert.equal(ORBIT_HEIGHT, 350);
for (const [index, [cx, cy, rx]] of measured.entries()) {
  nearPose(orbitPose(index, 0), { cx, cy, rx, ry: 49.5 });
  for (const phase of [-27.9, -1, -0.2, 0, 0.371, 1, 12.9]) {
    nearPose(orbitPose(index, phase), orbitPose(index, phase + 1));
    nearPose(
      orbitPose(index, phase + 1 / ORBIT_COUNT),
      orbitPose(index + 1, phase),
    );
  }

  // Position and one-sided velocity remain continuous through the loop seam.
  const epsilon = 1e-6;
  const before = orbitPose(index, 1 - epsilon);
  const seam = orbitPose(index, 0);
  const after = orbitPose(index, epsilon);
  nearPose(before, orbitPose(index, -epsilon));
  nearPose(after, orbitPose(index, 1 + epsilon));
  for (const field of fields) {
    near(before[field], after[field], 0.003, `${field} loop position`);
    near(
      (seam[field] - before[field]) / epsilon,
      (after[field] - seam[field]) / epsilon,
      0.03,
      `${field} loop velocity`,
    );
  }

  for (let step = 0; step <= 2400; step++) {
    const pose = orbitPose(index, step / 2400);
    assert(fields.every((field) => Number.isFinite(pose[field])));
    assert(pose.rx >= 6 && pose.rx <= 49.5);
    assert.equal(pose.ry, 49.5);
    assert(pose.cx - pose.rx >= 0 && pose.cx + pose.rx <= ORBIT_WIDTH);
    assert(pose.cy - pose.ry >= 0 && pose.cy + pose.ry <= ORBIT_HEIGHT);
  }
}

nearPose(orbitPose(-1, 0), orbitPose(11, 0));
nearPose(orbitPose(13.8, 0), orbitPose(1, 0));
nearPose(orbitPose(NaN, Infinity), orbitPose(0, 0));
nearPose(orbitPose(Infinity, -Infinity), orbitPose(0, 0));
assert(
  fields.every((field) =>
    Number.isFinite(orbitPose(Number.MAX_VALUE, Number.MAX_VALUE)[field]),
  ),
);

for (const index of [0, 2, 3, 9]) {
  const pose = orbitPose(index, 0);
  assert(orbitHit(pose.cx, pose.cy, pose));
  assert(orbitHit(pose.cx + pose.rx * 0.999, pose.cy, pose));
  assert(!orbitHit(pose.cx + pose.rx * 1.001, pose.cy, pose));
  assert(orbitHit(pose.cx, pose.cy + pose.ry * 0.999, pose));
  assert(!orbitHit(pose.cx, pose.cy + pose.ry * 1.001, pose));
  assert(!orbitHit(pose.cx + pose.rx * 0.8, pose.cy + pose.ry * 0.8, pose));
  assert(!orbitHit(240, 175, pose), 'The hollow center does not play');
  assert(!orbitHit(NaN, pose.cy, pose));
  assert(!orbitHit(pose.cx, Infinity, pose));
  assert(!orbitHit(pose.cx, pose.cy, { ...pose, rx: 0 }));
  assert(!orbitHit(pose.cx, pose.cy, { ...pose, ry: -1 }));
  assert(!orbitHit(pose.cx, pose.cy, { ...pose, cx: NaN }));
}
assert(orbitHit(16, 10, { cx: 10, cy: 10, rx: 6, ry: 49.5 }));

function crossings() {
  const steps = 12000;
  const counts = Array(ORBIT_COUNT).fill(0);
  let previous = counts.map((_, index) =>
    orbitHit(240, 56.2, orbitPose(index, -2 / steps)),
  );
  let gaps = 0;
  for (let step = 0; step <= steps; step++) {
    const inside = counts.map((_, index) =>
      orbitHit(240, 56.2, orbitPose(index, (2 * step) / steps)),
    );
    for (let index = 0; index < ORBIT_COUNT; index++) {
      if (inside[index] && !previous[index]) counts[index]++;
    }
    assert(
      inside.filter(Boolean).length <= 1,
      'A stationary cursor catches individual ellipses',
    );
    if (!inside.some(Boolean)) gaps++;
    previous = inside;
  }
  assert(gaps > 0, 'There are silent gaps between crossings');
  assert.deepEqual(counts, Array(ORBIT_COUNT).fill(2));
  return { counts, gaps };
}
assert.deepEqual(
  crossings(),
  crossings(),
  'Stationary-cursor music is deterministic',
);

console.log(
  'Orbit logo: measured geometry, continuous loops, bounds, hit tests and 24 stationary-cursor crossings passed.',
);
