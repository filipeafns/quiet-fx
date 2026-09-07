import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const source = stripTypeScriptTypes(
  await readFile(new URL('../lib/playground.ts', import.meta.url), 'utf8'),
);
const { PIECES, arrangePieces, clampPosition, initialPieces, pieceInfo } =
  await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  );
for (const width of [320, 375, 576, 768, 1096, 1440, 1920]) {
  const originals = PIECES.flatMap((piece, i) =>
    Array.from({ length: 2 }, (_, n) => ({
      id: `${i}-${n}`,
      kind: piece.kind,
      x: 0,
      y: 0,
    })),
  );
  const arranged = arrangePieces(originals, width);
  for (const [i, item] of arranged.entries()) {
    const size = pieceInfo(item.kind);
    assert(
      item.x >= 0 && item.x + size.width <= width,
      `${width}: ${item.kind} remains reachable`,
    );
    assert(item.y >= 16);
    for (const other of arranged.slice(i + 1)) {
      const otherSize = pieceInfo(other.kind);
      assert(
        item.x + size.width <= other.x ||
          other.x + otherSize.width <= item.x ||
          item.y + size.height <= other.y ||
          other.y + otherSize.height <= item.y,
        'Initial arrangement must not overlap',
      );
    }
  }
  assert.deepEqual(
    originals.map((p) => p.x),
    originals.map(() => 0),
    'Arrangement preserves the original canvas state',
  );
  assert.deepEqual(
    initialPieces(width),
    initialPieces(width),
    'Reset restores a deterministic layout',
  );
  for (const { kind, width: pieceWidth } of PIECES) {
    for (const [x, y] of [
      [-1000, -1000],
      [1e5, 1e5],
      [NaN, Infinity],
    ]) {
      const point = clampPosition(x, y, width, kind);
      assert(Number.isFinite(point.x) && Number.isFinite(point.y));
      assert(point.x >= 0 && point.x + pieceWidth <= width);
      assert(point.y >= 16 && point.y <= 6000);
    }
  }
}
console.log(
  'Playground: responsive placement, dense arrangements, bounds and reset passed.',
);
