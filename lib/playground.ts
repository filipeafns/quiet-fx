export type PieceKind =
  | 'phone'
  | 'card'
  | 'deck'
  | 'page'
  | 'panel'
  | 'book'
  | 'switch'
  | 'button'
  | 'player';
export type Piece = { id: string; kind: PieceKind; x: number; y: number };
export const PIECES: {
  kind: PieceKind;
  name: string;
  width: number;
  height: number;
}[] = [
  { kind: 'phone', name: 'Conversation', width: 296, height: 544 },
  { kind: 'card', name: 'Card flip', width: 296, height: 256 },
  { kind: 'deck', name: 'Deck riffle', width: 296, height: 256 },
  { kind: 'page', name: 'Page turn', width: 296, height: 256 },
  { kind: 'panel', name: 'Panel reveal', width: 296, height: 256 },
  { kind: 'book', name: 'Book close', width: 296, height: 256 },
  { kind: 'switch', name: 'Switch', width: 296, height: 256 },
  { kind: 'button', name: 'Button', width: 296, height: 256 },
  { kind: 'player', name: 'Video player', width: 296, height: 256 },
];
export const pieceInfo = (kind: PieceKind) =>
  PIECES.find((item) => item.kind === kind)!;
export function clampPosition(
  x: number,
  y: number,
  width: number,
  kind: PieceKind,
) {
  const margin = Math.min(16, Math.max(0, (width - pieceInfo(kind).width) / 2));
  return {
    x: Math.max(
      margin,
      Math.min(
        Number.isFinite(x) ? x : margin,
        width - pieceInfo(kind).width - margin,
      ),
    ),
    y: Math.max(16, Math.min(Number.isFinite(y) ? y : 16, 6000)),
  };
}
export function arrangePieces(pieces: Piece[], width: number): Piece[] {
  const columns = Math.max(1, Math.floor((width - 32 + 24) / 320));
  const heights = Array.from({ length: columns }, () => 24);
  return pieces.map((piece) => {
    const column = heights.indexOf(Math.min(...heights));
    const position = { x: 24 + column * 320, y: heights[column] };
    heights[column] += pieceInfo(piece.kind).height + 24;
    return {
      ...piece,
      ...clampPosition(position.x, position.y, width, piece.kind),
    };
  });
}
export function initialPieces(width: number): Piece[] {
  return arrangePieces(
    (['phone', 'card', 'deck', 'switch', 'player'] as PieceKind[]).map(
      (kind, index) => ({ id: `initial-${index}`, kind, x: 0, y: 0 }),
    ),
    width,
  );
}
