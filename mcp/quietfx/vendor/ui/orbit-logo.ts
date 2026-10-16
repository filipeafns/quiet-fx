export const ORBIT_COUNT = 12;
export const ORBIT_WIDTH = 480;
export const ORBIT_HEIGHT = 350;

export type OrbitPose = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

// Measured from the supplied mark, clockwise from its top ellipse.
// Keeping the vertical radius fixed preserves the reference's upright discs.
const ANCHORS = [
  [0, -118.8, 49.5],
  [113.54, -103, 38],
  [190.05, -65.3, 17],
  [227.65, 0, 6],
  [190.05, 65.3, 17],
  [113.54, 103, 38],
  [0, 118.8, 49.5],
  [-113.54, 103, 38],
  [-190.05, 65.3, 17],
  [-227.65, 0, 6],
  [-190.05, -65.3, 17],
  [-113.54, -103, 38],
] as const;

function wrap(value: number, period: number) {
  return ((value % period) + period) % period;
}

function interpolate(a: number, b: number, c: number, d: number, t: number) {
  return (
    b +
    0.5 *
      t *
      (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)))
  );
}

/**
 * One full phase turn carries each ellipse around the original silhouette.
 * Indices wrap after truncation; non-finite indices or phases fall back to zero.
 */
export function orbitPose(index: number, phaseTurns: number): OrbitPose {
  const identity = Number.isFinite(index) ? Math.trunc(index) : 0;
  const phase = Number.isFinite(phaseTurns) ? wrap(phaseTurns, 1) : 0;
  const position = wrap(
    wrap(identity, ORBIT_COUNT) + phase * ORBIT_COUNT,
    ORBIT_COUNT,
  );
  const current = Math.floor(position);
  const progress = position - current;
  const a = ANCHORS[wrap(current - 1, ORBIT_COUNT)];
  const b = ANCHORS[current];
  const c = ANCHORS[wrap(current + 1, ORBIT_COUNT)];
  const d = ANCHORS[wrap(current + 2, ORBIT_COUNT)];

  return {
    cx: ORBIT_WIDTH / 2 + interpolate(a[0], b[0], c[0], d[0], progress),
    cy: ORBIT_HEIGHT / 2 + interpolate(a[1], b[1], c[1], d[1], progress),
    rx: interpolate(a[2], b[2], c[2], d[2], progress),
    ry: 49.5,
  };
}

/** Hit testing uses the currently rendered ellipse, including its thin edge. */
export function orbitHit(x: number, y: number, pose: OrbitPose): boolean {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(pose.cx) ||
    !Number.isFinite(pose.cy) ||
    !Number.isFinite(pose.rx) ||
    !Number.isFinite(pose.ry) ||
    pose.rx <= 0 ||
    pose.ry <= 0
  ) {
    return false;
  }

  return ((x - pose.cx) / pose.rx) ** 2 + ((y - pose.cy) / pose.ry) ** 2 <= 1;
}
