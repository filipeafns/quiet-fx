'use client';
import { useEffect, useRef, useState } from 'react';
import { DialRoot, useDialKit } from 'dialkit';
import 'dialkit/styles.css';
import {
  ArrowRight,
  Check,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Square,
  Layers,
} from 'lucide-react';
import { ConversationSandbox } from './conversation-sandbox';
import { Spectrum } from './signal';
import { Segments, Range } from './studio-controls';
import {
  CUES,
  type Cue,
  type Settings,
  makePatch,
  VARIANTS,
} from '@/lib/audio/catalog';
import { renderPatch, SoundPlayer, type Rendered } from '@/lib/audio/engine';
const scenes = [
  {
    id: 'card-flip',
    name: 'Card flip',
    type: 'card',
    caption: 'Rotate · catch the air · settle',
    contact: 0.29,
  },
  {
    id: 'deck-riffle',
    name: 'Deck riffle',
    type: 'deck',
    caption: 'Ten edges. Ten tiny releases.',
    contact: 0.04,
  },
  {
    id: 'page-turn',
    name: 'Page turn',
    type: 'book',
    caption: 'Bend · brush · lay the page down',
    contact: 0.42,
  },
  {
    id: 'whoosh-in',
    name: 'Panel reveal',
    type: 'panel',
    caption: 'The sound of a little room opening up.',
    contact: 0,
  },
  {
    id: 'book-close',
    name: 'Book close',
    type: 'book-close',
    caption: 'An air cushion, then contact.',
    contact: 0.21,
  },
  {
    id: 'toggle-on',
    name: 'Switch',
    type: 'toggle',
    caption: 'A small change of state.',
    contact: 0,
  },
];
type SandboxProps = {
  settings: Settings;
  player: SoundPlayer;
  onEnable: () => Promise<boolean>;
  onSignal: (name: string, r: Rendered) => void;
  selectedId: string;
  onVariant: (variant: string) => void;
  onSelectSound: (id: string) => void;
};
export function MotionSandbox(props: SandboxProps) {
  const [view, setView] = useState('Sequences');
  return (
    <>
      <div className="sandbox-view">
        <Segments
          label="Sandbox view"
          value={view}
          options={['Sequences', 'Motion studies']}
          onChange={(value) => {
            props.player.stop();
            setView(value);
          }}
        />
      </div>
      {view === 'Sequences' ? (
        <ConversationSandbox {...props} />
      ) : (
        <MotionStudies {...props} />
      )}
    </>
  );
}
function MotionStudies({
  settings,
  player,
  onEnable,
  onSignal,
  selectedId,
  onVariant,
}: {
  settings: Settings;
  player: SoundPlayer;
  onEnable: () => Promise<boolean>;
  onSignal: (name: string, r: Rendered) => void;
  selectedId: string;
  onVariant: (variant: string) => void;
}) {
  const [sceneIndex, setSceneIndex] = useState(0),
    [mapping, setMapping] = useState('Scene sound'),
    [speed, setSpeed] = useState(1),
    [offset, setOffset] = useState(0),
    [running, setRunning] = useState(false),
    [tuning, setTuning] = useState(false),
    [toneShare, setToneShare] = useState(0.5);
  const params = useDialKit('Motion detail', {
    travel: [160, 60, 260],
    rotation: [180, 90, 180],
    spread: [12, 4, 24],
    depth: [700, 400, 1200],
  });
  const scene = scenes[sceneIndex];
  const request = useRef(0),
    start = useRef(0),
    frame = useRef(0),
    stage = useRef<HTMLDivElement>(null),
    card = useRef<HTMLDivElement>(null),
    sheet = useRef<HTMLDivElement>(null),
    panel = useRef<HTMLDivElement>(null),
    deck = useRef<HTMLDivElement>(null),
    switchRef = useRef<HTMLDivElement>(null);
  const stop = () => {
    request.current++;
    cancelAnimationFrame(frame.current);
    player.stop();
    setRunning(false);
  };
  function reset() {
    stop();
    card.current?.removeAttribute('style');
    sheet.current?.removeAttribute('style');
    panel.current?.removeAttribute('style');
    switchRef.current?.removeAttribute('style');
    if (switchRef.current?.parentElement)
      switchRef.current.parentElement.style.background = '';
    if (deck.current)
      Array.from(deck.current.children).forEach(
        (c, i) =>
          ((c as HTMLElement).style.transform = `translateY(${-i * 3}px)`),
      );
    stage.current?.style.setProperty('--progress', '0');
  }
  useEffect(
    () => () => {
      request.current++;
      cancelAnimationFrame(frame.current);
      player.stop();
    },
    [player],
  );
  useEffect(() => {
    const stopped = () => {
      request.current++;
      cancelAnimationFrame(frame.current);
      setRunning(false);
    };
    player.stopListeners.add(stopped);
    return () => {
      player.stopListeners.delete(stopped);
    };
  }, [player]);
  async function run() {
    stop();
    const token = request.current;
    if (!(await onEnable()) || token !== request.current) return;
    const cue: Cue = CUES.find(
      (c) => c.id === (mapping === 'Selected sound' ? selectedId : scene.id),
    )!;
    const local = { ...settings, duration: settings.duration / speed };
    const patch = makePatch(cue, local);
    // Semantic event timing comes from the original scene structure. Added voice
    // harmonics and shape repeats must not replace a card's contact or release.
    const motionPatch = makePatch(
      CUES.find((c) => c.id === scene.id)!,
      {
        ...local,
        voice: 'Soft',
        shape: 'Natural',
      },
    );
    motionPatch.layers = motionPatch.layers.slice(
      0,
      CUES.find((c) => c.id === scene.id)!.recipe.layers.length,
    );
    // All motion phases derive from the baked recipe, including variant time scaling.
    const gestureEnd = Math.max(
      ...motionPatch.layers.map((l) => (l.offset || 0) + l.attack + l.decay),
    );
    const lead = Math.max(0, -offset / 1000),
      audioDelay = Math.max(0, offset / 1000);
    const r = renderPatch(patch);
    const audioAt = player.play(r, audioDelay, true);
    if (audioAt === null || !player.context) return;
    setToneShare(r.toneShare ?? 0.5);
    onSignal(patch.name, r);
    start.current = audioAt - audioDelay + lead;
    setRunning(true);
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const duration =
      scene.type === 'card'
        ? Math.max(0.3, gestureEnd)
        : Math.max(
            0.25,
            gestureEnd,
            scene.type === 'deck'
              ? (motionPatch.layers.at(-1)?.offset || 0) + 0.1 / speed
              : 0,
          );
    const render = () => {
      const elapsed = player.context!.currentTime - start.current;
      const progress = Math.max(0, Math.min(1, elapsed / duration));
      const ease = 1 - Math.pow(1 - progress, 3);
      if (card.current) {
        const contact =
          motionPatch.layers.find((l) => l.kind === 'tone')?.offset ||
          duration * 0.82;
        const flip = Math.max(0, Math.min(1, elapsed / contact));
        card.current.style.transform = reduced
          ? `rotateY(${flip >= 1 ? 180 : 0}deg)`
          : `rotateY(${(flip < 0.5 ? 2 * flip * flip : 1 - Math.pow(-2 * flip + 2, 2) / 2) * params.rotation}deg) translateY(${-Math.sin(flip * Math.PI) * 24}px)`;
      }
      if (deck.current) {
        Array.from(deck.current.children).forEach((child, i) => {
          const event = motionPatch.layers[i];
          const release = event?.offset ?? (i * 0.045) / speed;
          const p = reduced
            ? elapsed >= release
              ? 1
              : 0
            : Math.max(0, Math.min(1, (elapsed - release) / (0.1 / speed)));
          (child as HTMLElement).style.transform =
            `translate(${p * params.travel}px, ${-i * 3 + p * 10}px) rotate(${(p * (i - 4.5) * params.spread) / 5}deg)`;
        });
      }
      if (sheet.current) {
        const contact =
          scene.type === 'book-close'
            ? motionPatch.layers.find((l) => l.kind === 'tone')?.offset ||
              duration * 0.55
            : motionPatch.layers.at(-1)?.offset || duration * 0.8;
        const p = Math.max(0, Math.min(1, elapsed / contact));
        sheet.current.style.transform = `rotateY(${-180 * (reduced ? (p >= 1 ? 1 : 0) : 0.5 - 0.5 * Math.cos(p * Math.PI))}deg)`;
      }
      if (panel.current) {
        panel.current.style.transform = `translateX(${reduced ? 0 : (1 - ease) * params.travel}px)`;
        panel.current.style.opacity = String(ease);
      }
      if (switchRef.current) {
        switchRef.current.style.transform = `translateX(${(reduced ? (progress > 0.2 ? 1 : 0) : ease) * 42}px)`;
        switchRef.current.parentElement!.style.background =
          progress > 0.2 ? '#383838' : '#e1e1e3';
      }
      if (stage.current)
        stage.current.style.setProperty('--progress', String(progress));
      if (elapsed < Math.max(duration, r.duration + audioDelay - lead))
        frame.current = requestAnimationFrame(render);
      else setRunning(false);
    };
    frame.current = requestAnimationFrame(render);
  }
  return (
    <div className="sandbox">
      <div className="scene-tabs">
        {scenes.map((s, i) => (
          <button
            key={s.id}
            className={i === sceneIndex ? 'active' : ''}
            onClick={() => {
              reset();
              setSceneIndex(i);
            }}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div
        className="motion-stage"
        ref={stage}
        style={{ perspective: params.depth }}
      >
        <div className="stage-label">
          <button
            title="Tune motion with DialKit"
            aria-label="Tune motion"
            className={'icon-button ' + (tuning ? 'active' : '')}
            onClick={() => setTuning(!tuning)}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
        {scene.type === 'card' && (
          <div className="flip-wrap">
            <div className="flip-card" ref={card}>
              <div className="card-face front">
                <AudioMark />
              </div>
              <div className="card-face back">
                <Check size={34} />
              </div>
            </div>
          </div>
        )}
        {scene.type === 'deck' && (
          <div className="deck" ref={deck}>
            {Array.from({ length: 10 }, (_, i) => (
              <div
                className="deck-card"
                key={i}
                style={{ transform: `translateY(${-i * 3}px)` }}
              >
                <Layers size={28} />
              </div>
            ))}
          </div>
        )}
        {(scene.type === 'book' || scene.type === 'book-close') && (
          <div className="book">
            <div className="book-left">
              <h3>
                Quiet
                <br />
                things.
              </h3>
              <p>
                There is a kind of detail
                <br />
                you feel before you
                <br />
                notice it.
              </p>
            </div>
            <div className="book-right">
              <div className="book-lines" />
            </div>
            <div
              className={
                'turning-page ' + (scene.type === 'book-close' ? 'cover' : '')
              }
              ref={sheet}
            >
              <span>{scene.type === 'book-close' ? 'Quiet' : ''}</span>
            </div>
          </div>
        )}
        {scene.type === 'panel' && (
          <div className="panel-demo" ref={panel}>
            <div className="panel-icon">
              <Check size={23} />
            </div>
            <strong>A little more space.</strong>
            <p>Your collection is ready.</p>
            <div className="mini-line" />
            <div className="mini-line short" />
            <span>
              VIEW COLLECTION <ArrowRight size={14} />
            </span>
          </div>
        )}
        {scene.type === 'toggle' && (
          <div className="toggle-demo">
            <div className="toggle-track">
              <div className="toggle-thumb" ref={switchRef} />
            </div>
            <strong>Notifications</strong>
          </div>
        )}

        <div className="motion-progress">
          <i />
        </div>
      </div>
      <div className="motion-spectrum">
        <Spectrum player={player} active={running} toneShare={toneShare} />
      </div>
      <div className="sandbox-play">
        <button className="primary-button" onClick={running ? stop : run}>
          {running ? <Square size={14} /> : <Play size={14} />}{' '}
          {running ? 'Stop' : 'Play interaction'}
        </button>
        <button
          className="icon-button"
          title="Reset motion"
          aria-label="Reset motion"
          onClick={reset}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="sandbox-controls">
        <div>
          <span className="control-title">Sound mapping</span>
          <Segments
            label="Sound mapping"
            value={mapping}
            onChange={setMapping}
            options={['Scene sound', 'Selected sound']}
          />
          {mapping === 'Selected sound' && (
            <p className="mapped-name">
              {CUES.find((c) => c.id === selectedId)?.name}
            </p>
          )}
        </div>
        <Range
          label="Playback speed"
          value={speed}
          min={0.5}
          max={1.5}
          step={0.1}
          suffix="×"
          onChange={setSpeed}
        />
        <Range
          label="Sound offset"
          value={offset}
          min={-150}
          max={150}
          step={5}
          suffix=" ms"
          onChange={setOffset}
        />
      </div>
      <div className="sandbox-variations">
        <Segments
          label="Motion sound variation"
          value={settings.variant}
          options={VARIANTS}
          onChange={onVariant}
        />
      </div>
      {tuning && (
        <DialRoot
          position="bottom-left"
          defaultOpen
          theme="light"
          productionEnabled
        />
      )}
    </div>
  );
}
function AudioMark() {
  return (
    <div className="audio-mark">
      {[16, 29, 49, 65, 49, 29, 16].map((h, i) => (
        <i key={i} style={{ height: h }} />
      ))}
    </div>
  );
}
