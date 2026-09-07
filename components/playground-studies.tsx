'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { ArrowUpRight, Check, Pause, Play, Plus } from 'lucide-react';
import { CUES, makePatch, type Settings } from '@/lib/audio/catalog';
import { renderPatch } from '@/lib/audio/engine';
import { signalColor, signalLevel } from '@/lib/audio/color';
import type { PlaygroundAudio } from './playground-audio';
import './playground-studies.css';

export type PlaygroundStudyKind =
  | 'card'
  | 'deck'
  | 'page'
  | 'panel'
  | 'book'
  | 'switch'
  | 'button'
  | 'player';

type StudyProps = {
  kind: PlaygroundStudyKind;
  settings: Settings;
  audio: PlaygroundAudio;
};

const cues = {
  card: 'card-flip',
  deck: 'deck-riffle',
  page: 'page-turn',
  panel: 'whoosh-in',
  book: 'book-close',
  switch: 'toggle-on',
  button: 'confirm',
} as const;

const names = {
  card: ['Flip card', 'Flip card back'],
  deck: ['Fan the card deck', 'Close the card deck'],
  page: ['Turn page', 'Turn page back'],
  panel: ['Open panel', 'Close panel'],
  book: ['Close book', 'Open book'],
  switch: ['Enable focus mode', 'Disable focus mode'],
  button: ['Save changes', 'Make another change'],
} as const;

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => 0.5 - Math.cos(clamp(n) * Math.PI) / 2;
const interpolate = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

export function PlaygroundStudy({ kind, settings, audio }: StudyProps) {
  if (kind === 'player')
    return <VideoStudy audio={audio} settings={settings} />;
  return <MotionStudy kind={kind} settings={settings} audio={audio} />;
}

function MotionStudy({
  kind,
  settings,
  audio,
}: Omit<StudyProps, 'kind'> & {
  kind: Exclude<PlaygroundStudyKind, 'player'>;
}) {
  const stage = useRef<HTMLButtonElement>(null);
  const pose = useRef(Array<number>(10).fill(0));
  const target = useRef(false);
  const request = useRef(0);
  const mounted = useRef(true);
  const [engaged, setEngaged] = useState(false);
  const [active, setActive] = useState(false);
  const hoverSound = useMemo(
    () =>
      renderPatch(
        makePatch(
          CUES.find((cue) => cue.id === cues[kind])!,
          settings,
        ),
      ),
    [kind, settings],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function paint(values: number[], reduced: boolean) {
    pose.current = values;
    const node = stage.current;
    if (!node) return;
    const progress = values[0];
    const moving = node.querySelector<HTMLElement>('[data-study-move]');
    if (kind === 'card' && moving) {
      moving.style.transform = `translateY(${-Math.sin(progress * Math.PI) * (reduced ? 0 : 12)}px) rotateY(${progress * 180}deg)`;
    } else if (kind === 'deck') {
      node
        .querySelectorAll<HTMLElement>('[data-study-card]')
        .forEach((card, i) => {
          const p = values[i];
          card.style.transform = `translate(${(i - 4.5) * (1.1 + p * 10)}px, ${-i * 1.7 + Math.abs(i - 4.5) * p * 2.8}px) rotate(${(i - 4.5) * p * 5.5}deg)`;
        });
    } else if ((kind === 'page' || kind === 'book') && moving) {
      moving.style.transform = `rotateY(${kind === 'page' ? -180 * progress : -150 * (1 - progress)}deg)`;
    } else if (kind === 'panel' && moving) {
      moving.style.transform = `translateX(${(1 - progress) * 147}px)`;
    } else if (kind === 'switch' && moving) {
      moving.style.transform = `translateX(${progress * 40}px)`;
      moving.parentElement!.style.backgroundColor = `rgb(${Math.round(219 - progress * 170)} ${Math.round(219 - progress * 170)} ${Math.round(222 - progress * 170)})`;
    } else if (kind === 'button' && moving) {
      moving.style.transform = `scale(${1 - Math.sin(progress * Math.PI) * (reduced ? 0 : 0.055)})`;
    }
  }

  async function run() {
    const token = ++request.current;
    const next = !target.current;
    const from = [...pose.current];
    target.current = next;
    setEngaged(next);
    setActive(true);
    const id =
      kind === 'switch' && !next
        ? 'toggle-off'
        : kind === 'panel' && !next
          ? 'whoosh-out'
          : kind === 'book' && !next
            ? 'page-turn'
            : kind === 'button' && !next
              ? 'tap'
              : cues[kind];
    const cue = CUES.find((candidate) => candidate.id === id)!;
    const rendered = renderPatch(makePatch(cue, settings));
    // Motion follows the source events, unaffected by added voice harmonics or
    // repeated sound shapes. Variant and duration changes still retime the scene.
    const motion = makePatch(cue, {
      ...settings,
      voice: 'Soft',
      shape: 'Natural',
    });
    const layers = motion.layers.slice(0, cue.recipe.layers.length);
    const duration = Math.max(
      ...layers.map(
        (layer) => (layer.offset || 0) + layer.attack + layer.decay,
      ),
    );
    const contact =
      kind === 'card' || (kind === 'book' && next)
        ? layers.find((layer) => layer.kind === 'tone')?.offset || duration
        : kind === 'page' || kind === 'book'
          ? layers.at(-1)?.offset || duration
          : duration;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    stage.current?.style.setProperty(
      '--pg-study-color',
      signalColor(signalLevel(rendered.peak), rendered.toneShare),
    );
    const current = () => mounted.current && token === request.current;
    const endpoint = Array<number>(10).fill(next ? 1 : 0);
    const started = await audio.play(
      rendered,
      (elapsed) => {
        if (!current()) return;
        const values = from.map((value, index) => {
          const offset = kind === 'deck' ? layers[index]?.offset || 0 : 0;
          const naturalSpan =
            kind === 'deck'
              ? (layers[index]?.attack || 0.001) +
                (layers[index]?.decay || 0.023) +
                0.008
              : contact;
          const span = Math.min(naturalSpan, rendered.duration - offset);
          const progress = clamp((elapsed - offset) / Math.max(0.001, span));
          return interpolate(
            value,
            endpoint[index],
            reduced ? Number(progress >= 1) : ease(progress),
          );
        });
        paint(values, reduced);
      },
      () => {
        if (!current()) return;
        // A different piece or a settings change finishes this visual state.
        // A same-piece reversal has already changed the token, so it keeps its
        // current pose and continues in the other direction without snapping.
        paint(endpoint, reduced);
        setActive(false);
      },
    );
    if (!started && current()) {
      paint(endpoint, true);
      setActive(false);
    }
  }

  return (
    <button
      ref={stage}
      type="button"
      className={`pg-study pg-study-${kind}`}
      data-active={active || undefined}
      data-engaged={engaged || undefined}
      style={
        {
          '--pg-study-color': signalColor(
            signalLevel(hoverSound.peak),
            hoverSound.toneShare,
          ),
        } as CSSProperties
      }
      aria-label={names[kind][engaged ? 1 : 0]}
      aria-pressed={kind === 'switch' ? undefined : engaged}
      role={kind === 'switch' ? 'switch' : undefined}
      aria-checked={kind === 'switch' ? engaged : undefined}
      onClick={() => void run()}
      onPointerEnter={(event) => {
        if (kind === 'button' && event.pointerType === 'mouse')
          audio.hover('hover');
      }}
    >
      {kind === 'card' && (
        <span className="pg-study-flip" data-study-move>
          <span className="pg-study-card-face pg-study-card-front">
            <AudioMark />
          </span>
          <span className="pg-study-card-face pg-study-card-back">
            <Check size={30} strokeWidth={1.4} />
          </span>
        </span>
      )}
      {kind === 'deck' && (
        <span className="pg-study-deck">
          {Array.from({ length: 10 }, (_, index) => (
            <span
              key={index}
              className="pg-study-deck-card"
              data-study-card
              style={{
                transform: `translate(${(index - 4.5) * 1.1}px, ${-index * 1.7}px)`,
              }}
            >
              <span className="pg-study-deck-dot" />
            </span>
          ))}
        </span>
      )}
      {kind === 'page' && (
        <span className="pg-study-open-book">
          <span className="pg-study-paper pg-study-paper-left">
            <span className="pg-study-paper-title">
              A quieter
              <br />
              kind of detail.
            </span>
            <PaperLines />
          </span>
          <span className="pg-study-paper pg-study-paper-right">
            <PaperLines />
          </span>
          <span className="pg-study-page" data-study-move>
            <span className="pg-study-page-front">
              <PaperLines />
            </span>
            <span className="pg-study-page-back">
              <PaperLines />
            </span>
          </span>
        </span>
      )}
      {kind === 'book' && (
        <span className="pg-study-closed-book">
          <span className="pg-study-book-pages">
            <PaperLines />
          </span>
          <span className="pg-study-cover" data-study-move>
            <span className="pg-study-cover-front">
              <AudioMark />
              <span>Quiet</span>
            </span>
            <span className="pg-study-cover-back" />
          </span>
        </span>
      )}
      {kind === 'panel' && (
        <span className="pg-study-window">
          <span className="pg-study-window-head">
            <i />
            <i />
            <i />
          </span>
          <span className="pg-study-window-content">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="pg-study-drawer" data-study-move>
            <span className="pg-study-drawer-icon">
              <Plus size={20} strokeWidth={1.4} />
            </span>
            <span className="pg-study-drawer-title">A little more room.</span>
            <span className="pg-study-drawer-line" />
            <span className="pg-study-drawer-line short" />
            <ArrowUpRight size={17} className="pg-study-drawer-arrow" />
          </span>
        </span>
      )}
      {kind === 'switch' && (
        <span className="pg-study-switch-wrap">
          <span className="pg-study-switch-track">
            <span className="pg-study-switch-thumb" data-study-move />
          </span>
          <span className="pg-study-switch-label">Focus mode</span>
        </span>
      )}
      {kind === 'button' && (
        <span className="pg-study-save" data-study-move>
          {engaged ? <Check size={16} /> : <Plus size={16} />}
          <span>{engaged ? 'Saved' : 'Save changes'}</span>
        </span>
      )}
    </button>
  );
}

function AudioMark() {
  return (
    <span className="pg-study-audio-mark" aria-hidden="true">
      {[8, 17, 27, 35, 27, 17, 8].map((height, index) => (
        <i key={index} style={{ height }} />
      ))}
    </span>
  );
}

function PaperLines() {
  return (
    <span className="pg-study-paper-lines" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}

const clipDuration = 12;
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function subscribeReducedMotion(onChange: () => void) {
  const motion = window.matchMedia(reducedMotionQuery);
  motion.addEventListener('change', onChange);
  return () => motion.removeEventListener('change', onChange);
}
const getReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;
const getServerReducedMotion = () => true;
function VideoStudy({
  audio,
  settings,
}: {
  audio: PlaygroundAudio;
  settings: Settings;
}) {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const elapsed = useRef(0);
  const frame = useRef(0);
  const mounted = useRef(true);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  );
  const hoverSound = useMemo(
    () =>
      renderPatch(
        makePatch(
          CUES.find((cue) => cue.id === 'begin')!,
          settings,
        ),
      ),
    [settings],
  );

  useEffect(() => {
    mounted.current = true;
    const hidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      mounted.current = false;
      cancelAnimationFrame(frame.current);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    const tick = (now: number) => {
      const next = Math.min(
        clipDuration,
        elapsed.current + (now - previous) / 1000,
      );
      previous = now;
      elapsed.current = next;
      setPosition(next);
      if (next < clipDuration) frame.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [playing]);

  function toggle() {
    const next = !playing;
    if (next && elapsed.current >= clipDuration) {
      elapsed.current = 0;
      setPosition(0);
    }
    setPlaying(next);
    void audio.cue(
      next ? (elapsed.current === 0 ? 'begin' : 'resume') : 'pause',
    );
  }

  return (
    <div
      className="pg-study pg-study-player"
      data-active={playing || undefined}
      style={
        {
          '--pg-study-color': signalColor(
            signalLevel(hoverSound.peak),
            hoverSound.toneShare,
          ),
        } as CSSProperties
      }
    >
      <div className="pg-study-video">
        <button
          type="button"
          className="pg-study-video-screen"
          onClick={toggle}
          aria-label={playing ? 'Pause video' : 'Play video'}
        >
          <svg
            viewBox="0 0 264 132"
            aria-hidden="true"
            className="pg-study-landscape"
          >
            <circle cx="195" cy="33" r="15" fill="#f7f7f5" />
            <g transform={`translate(${reduced ? 0 : -position * 1.1} 0)`}>
              <path d="M-25 132V104L59 31L153 132Z" fill="#c4c6c5" />
              <path d="M58 132L188 59L293 114V132Z" fill="#a3a6a4" />
              <path d="M-20 132V122L80 95L197 127L290 96V132Z" fill="#777b78" />
            </g>
          </svg>
          {!playing && (
            <span className="pg-study-video-play">
              <Play size={18} fill="currentColor" />
            </span>
          )}
        </button>
        <div className="pg-study-video-controls">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause video' : 'Play video'}
          >
            {playing ? (
              <Pause size={14} fill="currentColor" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max={clipDuration}
            step="0.1"
            value={position}
            aria-label="Video position"
            aria-valuetext={`${Math.floor(position)} seconds of ${clipDuration}`}
            onChange={(event) => {
              elapsed.current = Number(event.target.value);
              setPosition(elapsed.current);
            }}
            onPointerUp={() => {
              if (mounted.current) void audio.cue('detent');
            }}
            onKeyUp={(event) => {
              if (event.key.startsWith('Arrow')) void audio.cue('detent');
            }}
          />
          <span>0:{String(Math.floor(position)).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
}
