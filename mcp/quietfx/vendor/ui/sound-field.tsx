'use client';
import { useEffect, useRef, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CUES } from '@/lib/audio/catalog';
import { signalColor, signalLevel } from '@/lib/audio/color';
import { waveform, type Rendered, type SoundPlayer } from '@/lib/audio/engine';

const SPACING = 20;
const REGION = SPACING * 4;
function arrangeSounds(seed: number) {
  const sounds = [...CUES];
  for (let i = sounds.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [sounds[i], sounds[j]] = [sounds[j], sounds[i]];
  }
  return sounds;
}
const INITIAL_SOUNDS = arrangeSounds(127);
type Point = { x: number; y: number };
type Pulse = Point & {
  at: number;
  rendered: Rendered;
  envelope: number[];
};
export function SoundField({
  player,
  onAudition,
  onStop,
}: {
  player: SoundPlayer;
  onAudition: (
    id: string,
    takeOver: boolean,
    audition: boolean,
  ) => { rendered: Rendered; at: number | null };
  onStop: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    surface = useRef<HTMLButtonElement>(null),
    order = useRef(INITIAL_SOUNDS),
    point = useRef<Point | null>(null),
    profile = useRef<Rendered | null>(null),
    pulses = useRef<Pulse[]>([]),
    size = useRef({ width: 0, height: 300 }),
    frame = useRef(0),
    paint = useRef<() => void>(() => {}),
    ownsAudio = useRef(false),
    lastCell = useRef(''),
    lastPlay = useRef(-Infinity);
  const [label, setLabel] = useState(''),
    [visible, setVisible] = useState(false),
    [shuffles, setShuffles] = useState(0);

  useEffect(() => {
    const node = canvas.current;
    const ctx = node?.getContext('2d');
    if (!node || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const draw = () => {
      frame.current = 0;
      const { width, height } = size.current;
      ctx.clearRect(0, 0, width, height);
      const p = point.current,
        r = profile.current;
      if (!p || !r) return;
      const now = player.context?.currentTime || 0;
      pulses.current = pulses.current.filter(
        (pulse) => now - pulse.at < pulse.rendered.duration + 0.2,
      );
      const active = pulses.current.map((pulse) => {
        const elapsed = Math.max(0, now - pulse.at);
        const sample = Math.min(
          pulse.envelope.length - 1,
          Math.floor(
            (elapsed / pulse.rendered.duration) * pulse.envelope.length,
          ),
        );
        const level = signalLevel(
          (pulse.envelope[sample] || 0) * pulse.rendered.peak,
        );
        return { ...pulse, elapsed, level };
      });
      for (let y = SPACING / 2; y < height; y += SPACING) {
        for (let x = SPACING / 2; x < width; x += SPACING) {
          const distance = Math.hypot(x - p.x, y - p.y);
          let strength = Math.max(0, 1 - distance / 125) ** 2 * 0.58;
          let level = signalLevel(r.peak) * 0.65;
          let tone = r.toneShare;
          for (const pulse of active) {
            const d = Math.hypot(x - pulse.x, y - pulse.y);
            const radius = reduced.matches ? 55 : 16 + pulse.elapsed * 165;
            const ring = Math.exp(-(((d - radius) / 28) ** 2));
            const fade = Math.max(
              0,
              1 - pulse.elapsed / Math.max(0.45, pulse.rendered.duration + 0.2),
            );
            const influence = ring * fade * (0.25 + pulse.level * 0.75);
            if (influence > strength) {
              strength = influence;
              level = pulse.level;
              tone = pulse.rendered.toneShare;
            }
          }
          if (strength < 0.015) continue;
          ctx.globalAlpha = Math.min(1, strength);
          ctx.fillStyle = signalColor(level, tone);
          ctx.beginPath();
          ctx.arc(
            x,
            y,
            reduced.matches ? 2 : 2 + strength * 1.5,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (pulses.current.length) frame.current = requestAnimationFrame(draw);
    };
    paint.current = () => {
      if (!frame.current) frame.current = requestAnimationFrame(draw);
    };
    const resize = () => {
      const bounds = node.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      size.current = { width: bounds.width, height: bounds.height };
      node.width = Math.round(bounds.width * ratio);
      node.height = Math.round(bounds.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint.current();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    const stopped = () => {
      ownsAudio.current = false;
      lastCell.current = '';
      pulses.current = [];
      profile.current = null;
      setLabel('');
      paint.current();
    };
    player.stopListeners.add(stopped);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
      player.stopListeners.delete(stopped);
      if (ownsAudio.current) player.stop();
    };
  }, [player]);

  function explore(p: Point, force = false) {
    point.current = p;
    setVisible(true);
    const cols = Math.ceil(size.current.width / REGION);
    const column = Math.floor(p.x / REGION),
      row = Math.floor(p.y / REGION);
    const cell = `${column}:${row}`;
    const now = performance.now();
    if (force || cell !== lastCell.current) {
      const cue = order.current[(row * cols + column) % order.current.length];
      if (!cue) return;
      const audition = force || now - lastPlay.current >= 100;
      if (audition) lastPlay.current = now;
      const result = onAudition(cue.id, !ownsAudio.current, audition);
      // Taking audio ownership can synchronously clear the previous field state.
      lastCell.current = cell;
      profile.current = result.rendered;
      setLabel(cue.name);
      if (result.at !== null) {
        ownsAudio.current = true;
        pulses.current.push({
          ...p,
          ...result,
          at: result.at,
          envelope: waveform(result.rendered.data, 96),
        });
        pulses.current = pulses.current.slice(-4);
      }
    }
    paint.current();
  }
  function leave() {
    point.current = null;
    lastCell.current = '';
    pulses.current = [];
    setVisible(false);
    paint.current();
  }
  function localPoint(clientX: number, clientY: number) {
    const rect = surface.current!.getBoundingClientRect();
    return {
      x: Math.max(1, Math.min(rect.width - 1, clientX - rect.left)),
      y: Math.max(1, Math.min(rect.height - 1, clientY - rect.top)),
    };
  }
  return (
    <section className="sound-field" aria-label="Explore the sound library">
      <Button
        ref={surface}
        variant="ghost"
        className="field-surface"
        aria-label="Sound field. Hover or tap to mix sounds. Use arrow keys to explore and Enter to replay."
        onPointerMove={(e) => {
          if (e.pointerType !== 'touch')
            explore(localPoint(e.clientX, e.clientY));
        }}
        onPointerLeave={leave}
        onBlur={leave}
        onClick={(e) =>
          explore(
            e.detail === 0
              ? point.current || { x: size.current.width / 2, y: 150 }
              : localPoint(e.clientX, e.clientY),
            true,
          )
        }
        onKeyDown={(e) => {
          if (e.altKey || e.ctrlKey || e.metaKey) return;
          const moves: Record<string, Point> = {
            ArrowLeft: { x: -REGION, y: 0 },
            ArrowRight: { x: REGION, y: 0 },
            ArrowUp: { x: 0, y: -REGION },
            ArrowDown: { x: 0, y: REGION },
          };
          const move = moves[e.key];
          if (!move) return;
          e.preventDefault();
          const p = point.current || { x: size.current.width / 2, y: 150 };
          explore(
            {
              x: Math.max(1, Math.min(size.current.width - 1, p.x + move.x)),
              y: Math.max(1, Math.min(299, p.y + move.y)),
            },
            true,
          );
        }}
      >
        <canvas ref={canvas} aria-hidden="true" />
      </Button>
      <div className="field-footer">
        <span
          className="field-cue"
          data-visible={visible && !!label}
          aria-live="polite"
        >
          {label}
        </span>
        <Button
          variant="ghost"
          className="field-randomize"
          onClick={() => {
            onStop();
            leave();
            order.current = arrangeSounds(
              crypto.getRandomValues(new Uint32Array(1))[0],
            );
            setShuffles((n) => n + 1);
          }}
        >
          <Shuffle size={14} />
          Randomize
        </Button>
      </div>
      <output className="sr-only">
        {shuffles ? 'Sound field randomized.' : ''}
      </output>
    </section>
  );
}
