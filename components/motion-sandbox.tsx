'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The application canvas needs a keyboard focus target for selection, Escape and deletion after removing a piece. */
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Smartphone,
  Layers,
  BookOpen,
  PanelRight,
  Book,
  ToggleRight,
  MousePointer2,
  Clapperboard,
  RectangleHorizontal,
  GripHorizontal,
  X,
  RotateCcw,
  LayoutGrid,
  Move,
  Plus,
} from 'lucide-react';
import { Segments } from './studio-controls';
import { PlaygroundPhone } from './playground-phone';
import { PlaygroundStudy } from './playground-studies';
import { usePlaygroundAudio } from './playground-audio';
import { VARIANTS, type Settings } from '@/lib/audio/catalog';
import type { Rendered, SoundPlayer } from '@/lib/audio/engine';
import {
  PIECES,
  pieceInfo,
  initialPieces,
  clampPosition,
  type Piece,
  type PieceKind,
} from '@/lib/playground';
import './motion-playground.css';

const icons = {
  phone: Smartphone,
  card: RectangleHorizontal,
  deck: Layers,
  page: BookOpen,
  panel: PanelRight,
  book: Book,
  switch: ToggleRight,
  button: MousePointer2,
  player: Clapperboard,
};
type Drag = {
  kind: PieceKind;
  id?: string;
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
  grabX: number;
  grabY: number;
  clientX: number;
  clientY: number;
  x: number;
  y: number;
  moved: boolean;
  inside: boolean;
  tilt: number;
};
const LIMIT = 24;

export function MotionSandbox(props: {
  settings: Settings;
  player: SoundPlayer;
  onEnable: () => Promise<boolean>;
  onSignal: (name: string, r: Rendered) => void;
  onVariant: (variant: string) => void;
}) {
  const audio = usePlaygroundAudio(props);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [mode, setMode] = useState<'canvas' | 'grid'>('canvas');
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<Drag | null>(null);
  const [revision, setRevision] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const workspace = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const width = useRef(1100);
  const initialized = useRef(false);
  const counter = useRef(0);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const controls = useRef({ pieces, mode, selected });
  useEffect(() => {
    controls.current = { pieces, mode, selected };
  }, [pieces, mode, selected]);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      width.current = entry.contentRect.width;
      if (!initialized.current) {
        initialized.current = true;
        setPieces(initialPieces(width.current));
      } else {
        setPieces((items) =>
          items.map((item) => ({
            ...item,
            ...clampPosition(item.x, item.y, width.current, item.kind),
          })),
        );
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const remove = (id: string) => {
    audio.stop();
    setPieces((items) => items.filter((item) => item.id !== id));
    setSelected(null);
    setAnnouncement('Component removed');
    canvas.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!workspace.current?.contains(document.activeElement)) return;
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="slider"]',
        )
      )
        return;
      if (event.key === 'Escape') {
        suppressClick.current = !!drag.current && !drag.current.id;
        drag.current = null;
        setDragging(null);
        setSelected(null);
        audio.stop();
      }
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        controls.current.selected
      ) {
        event.preventDefault();
        audio.stop();
        const id = controls.current.selected;
        setPieces((items) => items.filter((item) => item.id !== id));
        setSelected(null);
        setAnnouncement('Component removed');
        canvas.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [audio]);

  const add = (kind: PieceKind, position?: { x: number; y: number }) => {
    if (controls.current.pieces.length >= LIMIT) {
      setAnnouncement('Canvas is full. Remove a component to add another.');
      return;
    }
    const id = `piece-${++counter.current}`;
    const stagger = (counter.current % 4) * 24;
    const point = clampPosition(
      position?.x ?? (width.current - 296) / 2 + stagger,
      position?.y ?? (viewport.current?.scrollTop || 0) + 48 + stagger,
      width.current,
      kind,
    );
    setPieces((items) => [...items, { id, kind, ...point }]);
    setSelected(id);
    setAnnouncement(`${pieceInfo(kind).name} added`);
    requestAnimationFrame(() => {
      const node = canvas.current?.querySelector<HTMLElement>(
        `[data-piece-id="${id}"] .pg-drag-handle`,
      );
      node?.focus({ preventScroll: true });
      if (controls.current.mode === 'grid')
        node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };
  const begin = (
    event: ReactPointerEvent<HTMLButtonElement>,
    kind: PieceKind,
    piece?: Piece,
  ) => {
    if (event.button !== 0 || (!piece && pieces.length >= LIMIT)) return;
    suppressClick.current = false;
    if (piece) setSelected(piece.id);
    if (piece && mode === 'grid') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      kind,
      id: piece?.id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: piece?.x || 0,
      originalY: piece?.y || 0,
      grabX:
        event.clientX -
        (canvas.current?.getBoundingClientRect().left || 0) -
        (piece?.x || 0),
      grabY:
        event.clientY -
        (canvas.current?.getBoundingClientRect().top || 0) -
        (piece?.y || 0),
      clientX: event.clientX,
      clientY: event.clientY,
      x: piece?.x || 0,
      y: piece?.y || 0,
      moved: false,
      inside: false,
      tilt: 0,
    };
  };
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.startX,
      dy = event.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    const visible = viewport.current!.getBoundingClientRect();
    const inside =
      event.clientX >= visible.left &&
      event.clientX <= visible.right &&
      event.clientY >= visible.top &&
      event.clientY <= visible.bottom;
    if (inside && event.clientY > visible.bottom - 40)
      viewport.current!.scrollTop += 12;
    if (inside && event.clientY < visible.top + 40)
      viewport.current!.scrollTop -= 12;
    const rect = canvas.current!.getBoundingClientRect();
    const point = d.id
      ? clampPosition(
          event.clientX - rect.left - d.grabX,
          event.clientY - rect.top - d.grabY,
          width.current,
          d.kind,
        )
      : clampPosition(
          event.clientX - rect.left - 148,
          event.clientY - rect.top - 36,
          width.current,
          d.kind,
        );
    const next = {
      ...d,
      ...point,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: true,
      inside,
      tilt: Math.max(-3, Math.min(3, (event.clientX - d.clientX) * 0.2)),
    };
    drag.current = next;
    setDragging(next);
    event.preventDefault();
  };
  const finish = (
    event: ReactPointerEvent<HTMLButtonElement>,
    cancelled = false,
  ) => {
    const d = drag.current;
    drag.current = null;
    setDragging(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!d?.moved) return;
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    if (cancelled) return;
    if (d.id)
      setPieces((items) =>
        items.map((item) =>
          item.id === d.id ? { ...item, x: d.x, y: d.y } : item,
        ),
      );
    else if (d.inside) add(d.kind, { x: d.x, y: d.y });
  };
  const reset = () => {
    audio.stop();
    drag.current = null;
    setDragging(null);
    setPieces(initialPieces(width.current));
    setSelected(null);
    setRevision((value) => value + 1);
    viewport.current?.scrollTo({ top: 0, left: 0 });
    setAnnouncement('Playground reset');
  };
  const canvasHeight = Math.max(
    640,
    ...pieces.map(
      (item) =>
        (dragging?.id === item.id ? dragging.y : item.y) +
        pieceInfo(item.kind).height +
        56,
    ),
  );
  return (
    <div className="motion-playground" ref={workspace}>
      <div className="pg-toolbar">
        <div className="pg-variants">
          <span className="control-label">Variant</span>
          <Segments
            label="Sound variant"
            value={props.settings.variant}
            options={VARIANTS}
            onChange={(value) => {
              audio.stop();
              props.onVariant(value);
            }}
          />
        </div>
        <div className="pg-workspace-actions">
          <fieldset className="pg-layout-toggle" aria-label="Workspace layout">
            <button
              aria-label="Free canvas"
              title="Free canvas"
              aria-pressed={mode === 'canvas'}
              onClick={() => {
                drag.current = null;
                setDragging(null);
                setMode('canvas');
              }}
            >
              <Move size={15} />
              <span>Canvas</span>
            </button>
            <button
              aria-label="Grid view"
              title="Grid view"
              aria-pressed={mode === 'grid'}
              onClick={() => {
                drag.current = null;
                setDragging(null);
                setMode('grid');
              }}
            >
              <LayoutGrid size={15} />
              <span>Grid</span>
            </button>
          </fieldset>
          <button className="pg-reset" onClick={reset} title="Reset playground">
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        </div>
      </div>
      <div className="pg-workspace">
        <aside className="pg-shelf" aria-label="Components">
          <h2>Components</h2>
          <div className="pg-shelf-list">
            {PIECES.map((item) => {
              const Icon = icons[item.kind];
              return (
                <button
                  key={item.kind}
                  className="pg-shelf-item"
                  aria-label={`Add ${item.name}`}
                  title={`Drag or click to add ${item.name}`}
                  disabled={pieces.length >= LIMIT}
                  onPointerDown={(e) => begin(e, item.kind)}
                  onPointerMove={move}
                  onPointerUp={(e) => finish(e)}
                  onPointerCancel={(e) => finish(e, true)}
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    add(item.kind);
                  }}
                >
                  <span className="pg-shelf-icon">
                    <Icon size={20} strokeWidth={1.5} />
                  </span>
                  <span>{item.name}</span>
                  <Plus className="pg-add-icon" size={13} />
                </button>
              );
            })}
          </div>
        </aside>
        <div className="pg-viewport" ref={viewport}>
          <div
            className={`pg-canvas pg-${mode}${dragging?.inside ? ' pg-drop-active' : ''}`}
            ref={canvas}
            role="application"
            tabIndex={0}
            aria-label="Interactive sound playground"
            style={
              mode === 'canvas'
                ? { minHeight: `max(100%, ${canvasHeight}px)` }
                : undefined
            }
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) {
                setSelected(null);
                e.currentTarget.focus({ preventScroll: true });
              }
            }}
          >
            {pieces.map((piece) => {
              const item = pieceInfo(piece.kind);
              const activeDrag = dragging?.id === piece.id ? dragging : null;
              return (
                <section
                  key={`${revision}-${piece.id}`}
                  data-piece-id={piece.id}
                  aria-label={item.name}
                  className={`pg-piece pg-piece-${piece.kind}${selected === piece.id ? ' pg-selected' : ''}${activeDrag ? ' pg-lifted' : ''}`}
                  style={
                    mode === 'canvas'
                      ? {
                          transform: `translate3d(${activeDrag?.x ?? piece.x}px, ${activeDrag?.y ?? piece.y}px, 0)`,
                          zIndex: activeDrag
                            ? 30
                            : selected === piece.id
                              ? 10
                              : undefined,
                        }
                      : undefined
                  }
                  onPointerDownCapture={(e) => {
                    setSelected(piece.id);
                    if (
                      !(e.target as HTMLElement).closest(
                        'button, input, textarea, select, [contenteditable="true"]',
                      )
                    )
                      canvas.current?.focus({ preventScroll: true });
                  }}
                >
                  <div
                    className="pg-piece-surface"
                    style={
                      activeDrag
                        ? {
                            transform: `translateY(-8px) scale(1.025) rotate(${activeDrag.tilt}deg)`,
                          }
                        : undefined
                    }
                  >
                    <div className="pg-piece-bar">
                      <button
                        className="pg-drag-handle"
                        aria-label={`Move ${item.name}`}
                        title={
                          mode === 'canvas'
                            ? 'Drag to move. Arrow keys to nudge.'
                            : item.name
                        }
                        onFocus={() => setSelected(piece.id)}
                        onPointerDown={(e) => begin(e, piece.kind, piece)}
                        onPointerMove={move}
                        onPointerUp={(e) => finish(e)}
                        onPointerCancel={(e) => finish(e, true)}
                        onKeyDown={(e) => {
                          if (
                            mode !== 'canvas' ||
                            ![
                              'ArrowLeft',
                              'ArrowRight',
                              'ArrowUp',
                              'ArrowDown',
                            ].includes(e.key)
                          )
                            return;
                          e.preventDefault();
                          const step = e.shiftKey ? 32 : 8;
                          const point = clampPosition(
                            piece.x +
                              (e.key === 'ArrowRight'
                                ? step
                                : e.key === 'ArrowLeft'
                                  ? -step
                                  : 0),
                            piece.y +
                              (e.key === 'ArrowDown'
                                ? step
                                : e.key === 'ArrowUp'
                                  ? -step
                                  : 0),
                            width.current,
                            piece.kind,
                          );
                          setPieces((items) =>
                            items.map((p) =>
                              p.id === piece.id ? { ...p, ...point } : p,
                            ),
                          );
                        }}
                      >
                        <span>{item.name}</span>
                        <GripHorizontal size={15} />
                      </button>
                      <button
                        className="pg-remove"
                        aria-label={`Remove ${item.name}`}
                        title="Remove component"
                        onClick={() => remove(piece.id)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="pg-piece-content">
                      {piece.kind === 'phone' ? (
                        <PlaygroundPhone
                          settings={props.settings}
                          audio={audio}
                        />
                      ) : (
                        <PlaygroundStudy
                          kind={piece.kind}
                          settings={props.settings}
                          audio={audio}
                        />
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
            {!pieces.length && (
              <div className="pg-empty">Add a component to start playing.</div>
            )}
          </div>
        </div>
      </div>
      {dragging?.moved && !dragging.id && (
        <div
          className="pg-drag-preview"
          aria-hidden="true"
          style={{
            left: dragging.clientX,
            top: dragging.clientY,
            transform: `translate(-50%, -36px) rotate(${dragging.tilt}deg)`,
          }}
        >
          <div>
            {(() => {
              const Icon = icons[dragging.kind];
              return <Icon size={32} strokeWidth={1.2} />;
            })()}
            <span>{pieceInfo(dragging.kind).name}</span>
          </div>
        </div>
      )}
      <output className="sr-only" aria-live="polite">
        {announcement}
      </output>
    </div>
  );
}
