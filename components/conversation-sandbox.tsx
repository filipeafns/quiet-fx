'use client';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  AudioLines,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronLeft,
  File,
  Mic,
  Plus,
  Play,
  RotateCcw,
  Square,
} from 'lucide-react';
import { Segments, Range } from './studio-controls';
import { Wave, Spectrum } from './signal';
import { CUES, VARIANTS, makePatch, type Settings } from '@/lib/audio/catalog';
import { SoundPlayer, renderPatch, type Rendered } from '@/lib/audio/engine';
import { signalColor, signalLevel, soundStyle } from '@/lib/audio/color';
import {
  CHAT_ACTIONS,
  buildConversation,
  conversationPose,
  conversationStage,
  type ChatActionId,
} from '@/lib/audio/sequences';
function paintPhone(node: HTMLDivElement, time: number, reduced = false) {
  const pose = conversationPose(time, reduced);
  for (const [name, value] of Object.entries(pose))
    node.style.setProperty(`--${name}`, String(value));
  for (const item of node.querySelectorAll<HTMLElement>('[data-reveal]')) {
    const visible = pose[item.dataset.reveal as keyof typeof pose] > 0.001;
    item.style.visibility = visible ? 'visible' : 'hidden';
    item.setAttribute('aria-hidden', String(!visible));
  }
  const status = node.querySelector('[data-status]');
  if (status)
    status.textContent =
      pose.retry > 0.7
        ? 'Delivered'
        : pose.retrying
          ? 'Sending again…'
          : 'Not delivered';
  const attach = node.querySelector('[data-upload-label]');
  if (attach)
    attach.textContent =
      pose.uploaded > 0.6 ? 'Added to conversation' : 'Uploading…';
}
export function ConversationSandbox({
  settings,
  player,
  onEnable,
  onSignal,
  selectedId,
  onVariant,
  onSelectSound,
}: {
  settings: Settings;
  player: SoundPlayer;
  onEnable: () => Promise<boolean>;
  onSignal: (name: string, r: Rendered) => void;
  selectedId: string;
  onVariant: (variant: string) => void;
  onSelectSound: (id: string) => void;
}) {
  const [selected, setSelected] = useState<ChatActionId>('new'),
    [current, setCurrent] = useState<ChatActionId>('new'),
    [running, setRunning] = useState(false),
    [fullFlow, setFullFlow] = useState(false),
    [speed, setSpeed] = useState(1),
    [offset, setOffset] = useState(0),
    [mapping, setMapping] = useState('Dedicated sounds'),
    [liveToneShare, setLiveToneShare] = useState(0.5);
  const phone = useRef<HTMLDivElement>(null),
    stage = useRef<HTMLDivElement>(null),
    frame = useRef(0),
    request = useRef(0),
    lastPhase = useRef<ChatActionId>('new'),
    lastTone = useRef(0.5);
  const profiles = useMemo(
    () =>
      Object.fromEntries(
        CHAT_ACTIONS.map((action) => [
          action.id,
          renderPatch(
            makePatch(
              CUES.find(
                (c) =>
                  c.id ===
                  (mapping === 'Selected sound' ? selectedId : action.cue),
              )!,
              settings,
            ),
          ),
        ]),
      ),
    [settings, mapping, selectedId],
  );
  const active = CHAT_ACTIONS.find(
      (a) => a.id === (running ? current : selected),
    )!,
    profile = profiles[active.id];
  const stop = useCallback(() => {
    request.current++;
    cancelAnimationFrame(frame.current);
    player.stop();
    setRunning(false);
    setSelected(lastPhase.current);
    stage.current?.style.setProperty('--live-level', '0');
  }, [player]);
  useEffect(() => {
    if (phone.current) paintPhone(phone.current, 0);
    const stopped = () => {
      request.current++;
      cancelAnimationFrame(frame.current);
      setRunning(false);
      setSelected(lastPhase.current);
      stage.current?.style.setProperty('--live-level', '0');
    };
    player.stopListeners.add(stopped);
    return () => {
      player.stopListeners.delete(stopped);
      stop();
    };
  }, [player, stop]);
  // Parameter changes cancel the previous clock so motion never changes mid-gesture.
  useEffect(() => {
    player.stop();
  }, [player, settings, speed, offset, mapping, selectedId]);
  async function run(id: ChatActionId | 'flow') {
    stop();
    const token = request.current;
    const full = id === 'flow',
      chosen = full ? 'new' : id;
    setSelected(chosen);
    setCurrent(chosen);
    setFullFlow(full);
    lastPhase.current = chosen;
    const timeline = buildConversation(
      id,
      settings,
      speed,
      offset,
      mapping === 'Selected sound' ? selectedId : undefined,
    );
    if (phone.current) paintPhone(phone.current, timeline.start);
    if (!(await onEnable()) || token !== request.current) return;
    const audioAt = player.play(timeline.rendered);
    if (audioAt === null || !player.context) return;
    onSignal(
      full
        ? 'Conversation flow'
        : CUES.find(
            (c) =>
              c.id ===
              (mapping === 'Selected sound'
                ? selectedId
                : CHAT_ACTIONS.find((a) => a.id === id)!.cue),
          )!.name,
      timeline.rendered,
    );
    setRunning(true);
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    let previousSample = 0,
      heldLevel = 0,
      lastElapsed = 0;
    const draw = () => {
      if (!player.context || !phone.current) return;
      const elapsed = Math.max(0, player.context.currentTime - audioAt),
        virtual =
          timeline.start +
          Math.max(0, elapsed - timeline.lead) / timeline.scale;
      paintPhone(phone.current, Math.min(timeline.end, virtual), reduced);
      const phase = full ? conversationStage(virtual) : chosen;
      if (lastPhase.current !== phase) {
        lastPhase.current = phase;
        setCurrent(phase);
      }
      if (stage.current) {
        let peak = 0;
        const index = Math.floor(elapsed * 48000);
        for (
          let i = Math.max(0, previousSample - 480);
          i < Math.min(index, timeline.rendered.data.length);
          i++
        )
          peak = Math.max(peak, Math.abs(timeline.rendered.data[i]));
        previousSample = index;
        const level = Math.max(
          signalLevel(peak),
          heldLevel * Math.exp(-(elapsed - lastElapsed) / 0.07),
        );
        heldLevel = level;
        lastElapsed = elapsed;
        const audible = timeline.events.filter(
          (event) => elapsed >= event.at && elapsed < event.at + event.duration,
        );
        const energy = audible.reduce((sum, event) => sum + event.energy, 0);
        const share = energy
          ? audible.reduce(
              (sum, event) => sum + event.energy * event.toneShare,
              0,
            ) / energy
          : 0.5;
        if (Math.abs(share - lastTone.current) > 0.025) {
          lastTone.current = share;
          setLiveToneShare(share);
        }
        stage.current.style.setProperty(
          '--live-color',
          signalColor(level, share),
        );
        stage.current.style.setProperty('--live-level', String(level));
        stage.current.style.setProperty(
          '--sequence-progress',
          String(Math.min(1, elapsed / timeline.motionDuration)),
        );
      }
      if (elapsed < timeline.rendered.duration)
        frame.current = requestAnimationFrame(draw);
      else {
        setRunning(false);
        setSelected(phase);
        stage.current?.style.setProperty('--live-level', '0');
      }
    };
    frame.current = requestAnimationFrame(draw);
  }
  const reset = () => {
    stop();
    setFullFlow(false);
    setCurrent(selected);
    if (phone.current)
      paintPhone(
        phone.current,
        Math.max(0, CHAT_ACTIONS.find((a) => a.id === selected)!.start - 0.12),
      );
    stage.current?.style.setProperty('--sequence-progress', '0');
  };
  return (
    <div className="conversation-sandbox">
      <div className="sequence-workspace">
        <div className="sequence-menu">
          <div className="sequence-actions" aria-label="Conversation sequences">
            {CHAT_ACTIONS.map((action, index) => (
              <button
                key={action.id}
                className={
                  (active.id === action.id ? 'active ' : '') +
                  (index === 3 || index === 6 ? 'sequence-divider' : '')
                }
                style={soundStyle(profiles[action.id]) as CSSProperties}
                aria-pressed={active.id === action.id}
                onClick={() => void run(action.id)}
              >
                <i />
                <span>{action.name}</span>
                <Play size={11} />
              </button>
            ))}
          </div>
          <div
            className="sequence-sound"
            style={soundStyle(profile) as CSSProperties}
          >
            <Wave rendered={profile} />
            <button
              onClick={() =>
                onSelectSound(
                  mapping === 'Selected sound' ? selectedId : active.cue,
                )
              }
            >
              {
                CUES.find(
                  (c) =>
                    c.id ===
                    (mapping === 'Selected sound' ? selectedId : active.cue),
                )?.name
              }
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
        <div className="sequence-stage" ref={stage}>
          <div className="phone-aura" aria-hidden="true" />
          <div className="conversation-phone" ref={phone}>
            <div className="phone-top">
              <button
                aria-label="New conversation"
                onClick={() => void run('new')}
              >
                <ChevronLeft size={14} />
              </button>
              <AudioLines size={19} />
              <button
                aria-label="Retry delivery"
                onClick={() => void run('retry')}
              >
                <RotateCcw size={12} />
              </button>
            </div>
            <div className="phone-viewport">
              <div className="phone-welcome" data-reveal="welcome">
                <div className="welcome-symbol">
                  <AudioLines size={24} />
                </div>
                <h3>A little more feeling.</h3>
                <p>Start with something small.</p>
                <div className="starter-chips">
                  <span>Explore sounds</span>
                  <span>Find a rhythm</span>
                  <span>Keep it gentle</span>
                  <span>Try something</span>
                </div>
              </div>
              <div className="conversation-thread">
                <div
                  className="chat-message outgoing message-one"
                  data-reveal="send1"
                >
                  Let&apos;s make it a little softer.
                </div>
                <div className="incoming-row" data-reveal="incoming">
                  <span className="chat-avatar">
                    <AudioLines size={11} />
                  </span>
                  <div className="incoming-bubble">
                    <div className="typing-dots">
                      <i />
                      <i />
                      <i />
                    </div>
                    <span className="incoming-copy" data-reveal="message">
                      I have a few ideas.
                    </span>
                  </div>
                </div>
                <div
                  className="chat-message outgoing message-two"
                  data-reveal="send2"
                >
                  Something light and airy.
                </div>
                <div
                  className="chat-message outgoing message-three"
                  data-reveal="send3"
                >
                  Show me a few directions.
                </div>
                <div className="cards-intro" data-reveal="cards">
                  <span className="chat-avatar">
                    <AudioLines size={11} />
                  </span>
                  <span>Three directions to explore.</span>
                </div>
                <div className="chat-cards" data-reveal="cards">
                  {['Air', 'Glass', 'Felt'].map((name, i) => (
                    <div className={`chat-sound-card card-${i}`} key={name}>
                      <div className="mini-sound-form">
                        {[
                          0.2, 0.4, 0.8, 1, 0.6, 0.9, 0.45, 0.25, 0.1, 0.3,
                          0.65, 0.4, 0.15,
                        ].map((v, j) => (
                          <i
                            key={j}
                            style={{
                              height: 6 + v * 25,
                              color: signalColor(
                                0.2 + i * 0.3 + v * 0.15,
                                0.2 + i * 0.3,
                              ),
                            }}
                          />
                        ))}
                      </div>
                      <strong>{name}</strong>
                      <span>
                        {
                          [
                            'A quiet breath',
                            'A clear little note',
                            'A softer touch',
                          ][i]
                        }
                      </span>
                      <button
                        aria-label={`Explore ${name} sound`}
                        onClick={() =>
                          onSelectSound(['mist', 'glass-touch', 'felt-tap'][i])
                        }
                      >
                        <Play size={8} fill="currentColor" /> Listen
                      </button>
                    </div>
                  ))}
                </div>
                <div className="chat-voice" data-reveal="voice">
                  <span className="chat-avatar">
                    <AudioLines size={11} />
                  </span>
                  <div className="voice-capsule">
                    <button
                      aria-label="Replay voice note insertion"
                      onClick={() => void run('voice')}
                    >
                      <Play size={9} fill="currentColor" />
                    </button>
                    <div className="voice-wave">
                      {[
                        3, 7, 12, 18, 9, 22, 14, 25, 19, 10, 17, 12, 7, 15, 9,
                        5, 11, 6,
                      ].map((height, i) => (
                        <i key={i} style={{ height }} />
                      ))}
                    </div>
                    <span>0:08</span>
                  </div>
                </div>
                <div className="chat-attachment" data-reveal="upload">
                  <span className="attachment-icon">
                    <File size={16} />
                  </span>
                  <div>
                    <strong>Sound ideas.pdf</strong>
                    <span data-upload-label>Uploading…</span>
                  </div>
                  <Check size={13} className="upload-check" />
                  <div className="upload-progress">
                    <i />
                  </div>
                </div>
                <div className="failed-message" data-reveal="failure">
                  <div className="chat-message outgoing">
                    This feels just right.
                  </div>
                  <div
                    className="delivery-status"
                    data-reveal="deliveryControl"
                  >
                    <span data-status>Not delivered</span>
                    <button
                      aria-label="Retry the failed message"
                      onClick={() => void run('retry')}
                    >
                      <RotateCcw size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="phone-composer">
              <button
                aria-label="Add an attachment"
                onClick={() => void run('upload')}
              >
                <Plus size={14} />
              </button>
              <span className="composer-placeholder">Message</span>
              <span className="composer-draft">A little more feeling…</span>
              <button
                className="composer-mic"
                data-reveal="idle"
                aria-label="Insert a voice note"
                onClick={() => void run('voice')}
              >
                <Mic size={13} />
              </button>
              <button
                className="composer-send"
                data-reveal="draft"
                aria-label="Send a message"
                onClick={() => void run('send')}
              >
                <ArrowUp size={13} />
              </button>
            </div>
            <div className="phone-home" />
          </div>
          <div className="sequence-meter">
            <Spectrum
              player={player}
              active={running}
              toneShare={liveToneShare}
            />
          </div>
          <div className="sequence-track">
            <i />
          </div>
        </div>
      </div>
      <div className="sequence-transport">
        <button
          className="primary-button"
          onClick={() =>
            running ? stop() : void run(fullFlow ? 'flow' : selected)
          }
        >
          {running ? <Square size={13} /> : <Play size={13} />}{' '}
          {running ? 'Stop' : fullFlow ? 'Replay full flow' : 'Replay sequence'}
        </button>
        <button
          className="flow-button"
          disabled={running && fullFlow}
          onClick={() => void run('flow')}
        >
          <Play size={12} />
          Play full flow
        </button>
        <button
          className="icon-button"
          aria-label="Reset sequence"
          onClick={reset}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      <div className="sandbox-controls sequence-controls">
        <div>
          <span className="control-title">Sound</span>
          <Segments
            label="Sequence sound mapping"
            value={mapping}
            options={['Dedicated sounds', 'Selected sound']}
            onChange={setMapping}
          />
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
          label="Sequence sound variation"
          value={settings.variant}
          options={VARIANTS}
          onChange={onVariant}
        />
      </div>
    </div>
  );
}
