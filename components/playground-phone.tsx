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
  ArrowDownLeft,
  ArrowUp,
  AudioLines,
  Check,
  File,
  Layers,
  Mic,
  Paperclip,
  Play,
  Plus,
  RotateCcw,
  Square,
  WifiOff,
} from 'lucide-react';
import { CUES, makePatch, type Settings } from '@/lib/audio/catalog';
import { renderPatch } from '@/lib/audio/engine';
import { signalColor, signalLevel, soundStyle } from '@/lib/audio/color';
import {
  CHAT_ACTIONS,
  buildConversation,
  conversationPose,
  type ChatActionId,
} from '@/lib/audio/sequences';
import type { PlaygroundAudio } from './playground-audio';
import './playground-phone.css';

type Message = {
  id: number;
  kind: 'text' | 'voice' | 'attachment' | 'cards';
  direction: 'incoming' | 'outgoing';
  text: string;
  state: 'pending' | 'complete' | 'failed';
};
const WAVE = [4, 8, 13, 7, 17, 21, 10, 16, 24, 12, 19, 9, 15, 6, 11, 4];
const REPLIES = [
  'A little softer. Just like that.',
  'That has a nice rhythm to it.',
  'Let’s try something light and airy.',
  'This feels just right.',
];

export function PlaygroundPhone({
  settings,
  audio,
}: {
  settings: Settings;
  audio: PlaygroundAudio;
}) {
  const cardStyles = useMemo(
    () =>
      ['mist', 'glass-touch', 'felt-tap'].map(
        (id) =>
          soundStyle(
            renderPatch(
              makePatch(
                CUES.find((cue) => cue.id === id)!,
                settings,
              ),
            ),
          ) as CSSProperties,
      ),
    [settings],
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(false);
  const [flowing, setFlowing] = useState(false);
  const [typing, setTyping] = useState(false);
  const node = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const serial = useRef(0);
  const request = useRef(0);
  const mounted = useRef(true);
  const reply = useRef(0);
  const finishCurrent = useRef<((completed: boolean) => void) | null>(null);
  const latestMessages = useRef(messages);
  useEffect(() => {
    latestMessages.current = messages;
  }, [messages]);

  useEffect(() => {
    mounted.current = true;
    request.current++;
    return () => {
      mounted.current = false;
      finishCurrent.current = null;
    };
  }, []);

  useEffect(() => {
    if (viewport.current)
      viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [messages.length, typing]);

  const settle = useCallback((id: number, state: Message['state']) => {
    setMessages((items) =>
      items.map((item) => (item.id === id ? { ...item, state } : item)),
    );
    node.current
      ?.querySelector<HTMLElement>(`[data-phone-message="${id}"]`)
      ?.style.setProperty('--message-progress', '1');
  }, []);

  async function run(
    action: ChatActionId | 'flow',
    text?: string,
    retryId?: number,
  ) {
    finishCurrent.current?.(false);
    const token = ++request.current;
    const isFlow = action === 'flow';
    const timeline = buildConversation(action, settings);
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const pending = new Map<number, { action: ChatActionId; at: number }>();
    const fired = new Set<string>();
    let ended = false;
    let previousSample = 0;
    let heldLevel = 0;
    let lastElapsed = 0;
    const alive = () => mounted.current && token === request.current;

    const insert = (id: ChatActionId, at: number, copy?: string) => {
      if (id === 'new') {
        setMessages([]);
        setTyping(false);
        return;
      }
      if (id === 'retry') {
        const failedId =
          retryId ??
          [...latestMessages.current]
            .reverse()
            .find((item) => item.state === 'failed')?.id;
        if (failedId !== undefined) {
          setMessages((items) =>
            items.map((item) =>
              item.id === failedId ? { ...item, state: 'pending' } : item,
            ),
          );
          pending.set(failedId, { action: id, at });
        }
        return;
      }
      const messageId = ++serial.current;
      const kind =
        id === 'voice'
          ? 'voice'
          : id === 'upload'
            ? 'attachment'
            : id === 'cards'
              ? 'cards'
              : 'text';
      const message: Message = {
        id: messageId,
        kind,
        direction: id === 'receive' || id === 'cards' ? 'incoming' : 'outgoing',
        text:
          copy ||
          (id === 'receive'
            ? REPLIES[reply.current++ % REPLIES.length]
            : id === 'failure'
              ? 'One more idea…'
              : id === 'upload'
                ? 'Sound ideas.pdf'
                : 'A little more feeling.'),
        state: 'pending',
      };
      setMessages((items) => [...items, message].slice(-18));
      pending.set(messageId, { action: id, at });
      if (id === 'receive') setTyping(true);
    };

    const finish = (completed: boolean) => {
      if (ended || !alive()) return;
      ended = true;
      for (const [id, item] of pending) {
        const state =
          item.action === 'failure' ||
          (!completed && (item.action === 'send' || item.action === 'retry'))
            ? 'failed'
            : 'complete';
        settle(id, state);
      }
      pending.clear();
      setTyping(false);
      setRunning(false);
      setFlowing(false);
      node.current?.style.setProperty('--phone-level', '0');
      node.current?.removeAttribute('data-sounding');
      finishCurrent.current = null;
    };
    finishCurrent.current = finish;
    setRunning(true);
    setFlowing(isFlow);
    if (isFlow) setMessages([]);
    else
      insert(
        action,
        CHAT_ACTIONS.find((item) => item.id === action)!.start,
        text,
      );

    const beats = [
      ...CHAT_ACTIONS.map((item) => ({
        id: item.id,
        at: item.start,
        text: undefined as string | undefined,
      })),
      { id: 'send' as const, at: 5.48, text: 'Something light and airy.' },
      { id: 'send' as const, at: 6.63, text: 'Show me a few directions.' },
    ].sort((a, b) => a.at - b.at);
    try {
      const played = await audio.play(
        timeline.rendered,
        (elapsed) => {
          if (!alive() || ended) return;
          const virtual = Math.min(
            timeline.end,
            timeline.start +
              Math.max(0, elapsed - timeline.lead) / timeline.scale,
          );
          if (isFlow)
            for (const beat of beats) {
              const key = `${beat.id}-${beat.at}`;
              if (virtual >= beat.at && !fired.has(key)) {
                fired.add(key);
                insert(beat.id, beat.at, beat.text);
              }
            }
          for (const [id, item] of pending) {
            const spec = CHAT_ACTIONS.find(
              (entry) => entry.id === item.action,
            )!;
            // Remap each inserted item to the original choreography so repeated
            // user actions keep the same sound contact as the full sequence.
            const pose = conversationPose(
              spec.start + virtual - item.at,
              reduced,
            );
            const arrival = {
              new: pose.chips,
              send: pose.send1,
              receive: pose.message,
              cards: pose.cards,
              voice: pose.voice,
              upload: pose.upload,
              failure: pose.failure,
              retry: 1,
            }[item.action];
            const completion =
              item.action === 'upload'
                ? pose.uploaded
                : item.action === 'retry'
                  ? pose.retry
                  : arrival;
            node.current
              ?.querySelector<HTMLElement>(`[data-phone-message="${id}"]`)
              ?.style.setProperty('--message-progress', String(arrival));
            if (completion >= 0.999) {
              settle(id, spec.id === 'failure' ? 'failed' : 'complete');
              pending.delete(id);
              if (item.action === 'receive') setTyping(false);
            }
          }
          const index = Math.floor(elapsed * timeline.rendered.sampleRate);
          let peak = 0;
          for (
            let i = Math.max(0, previousSample - 240);
            i < Math.min(index, timeline.rendered.data.length);
            i++
          )
            peak = Math.max(peak, Math.abs(timeline.rendered.data[i]));
          previousSample = index;
          heldLevel = Math.max(
            signalLevel(peak),
            heldLevel * Math.exp(-(elapsed - lastElapsed) / 0.08),
          );
          lastElapsed = elapsed;
          const audible = timeline.events.filter(
            (event) =>
              elapsed >= event.at && elapsed < event.at + event.duration,
          );
          const energy = audible.reduce((sum, event) => sum + event.energy, 0);
          const toneShare = energy
            ? audible.reduce(
                (sum, event) => sum + event.energy * event.toneShare,
                0,
              ) / energy
            : 0.5;
          node.current?.style.setProperty('--phone-level', String(heldLevel));
          node.current?.style.setProperty(
            '--phone-color',
            signalColor(heldLevel, toneShare),
          );
          node.current?.toggleAttribute('data-sounding', heldLevel > 0.015);
        },
        finish,
      );
      if (!played) finish(false);
    } catch {
      finish(false);
    }
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void run('send', text);
  }

  return (
    <div
      className="playground-phone"
      ref={node}
      data-running={running || undefined}
    >
      <div className="pg-phone-top">
        <span className="pg-phone-avatar">
          <AudioLines size={16} />
        </span>
        <strong>Messages</strong>
        <button
          type="button"
          title="Receive a message"
          aria-label="Receive a message"
          onClick={() => void run('receive')}
        >
          <ArrowDownLeft size={15} />
        </button>
        <button
          type="button"
          title="New conversation"
          aria-label="New conversation"
          onClick={() => void run('new')}
        >
          <Plus size={16} />
        </button>
      </div>
      <div
        className="pg-phone-thread"
        ref={viewport}
        role="log"
        aria-label="Simulated conversation"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.length === 0 && (
          <div className="pg-phone-empty">
            <AudioLines size={30} />
            <span>Say something.</span>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            data-phone-message={message.id}
            className={`pg-phone-message pg-phone-${message.direction} pg-phone-kind-${message.kind} pg-phone-state-${message.state}`}
          >
            {message.kind === 'text' && (
              <div className="pg-phone-bubble">{message.text}</div>
            )}
            {message.kind === 'voice' && (
              <button
                type="button"
                className="pg-phone-voice"
                aria-label="Replay voice note sound"
                onClick={() => void audio.cue('chat-insert-voice-note')}
              >
                <Play size={11} fill="currentColor" />
                <span className="pg-phone-wave" aria-hidden="true">
                  {WAVE.map((height, i) => (
                    <i key={i} style={{ height }} />
                  ))}
                </span>
                <span>0:08</span>
              </button>
            )}
            {message.kind === 'attachment' && (
              <div className="pg-phone-attachment">
                <File size={19} />
                <span>
                  <strong>{message.text}</strong>
                  <small>
                    {message.state === 'pending' ? 'Adding…' : 'Added'}
                  </small>
                </span>
                {message.state === 'complete' && <Check size={13} />}
              </div>
            )}
            {message.kind === 'cards' && (
              <div className="pg-phone-cards">
                {['Air', 'Glass', 'Felt'].map((name, index) => (
                  <button
                    type="button"
                    key={name}
                    aria-label={`Play ${name} sound`}
                    style={cardStyles[index]}
                    onClick={() =>
                      void audio.cue(['mist', 'glass-touch', 'felt-tap'][index])
                    }
                  >
                    <span aria-hidden="true">
                      {WAVE.slice(index, index + 7).map((height, i) => (
                        <i key={i} style={{ height }} />
                      ))}
                    </span>
                    <strong>{name}</strong>
                  </button>
                ))}
              </div>
            )}
            {message.state === 'failed' && (
              <button
                type="button"
                className="pg-phone-retry"
                onClick={() => void run('retry', undefined, message.id)}
              >
                <RotateCcw size={10} /> Retry delivery
              </button>
            )}
            {message.state === 'pending' &&
              message.kind === 'text' &&
              message.direction === 'outgoing' && (
                <span className="pg-phone-delivery">Sending…</span>
              )}
          </div>
        ))}
        {typing && (
          <div className="pg-phone-typing" aria-label="Typing">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      <form
        className="pg-phone-composer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input
          aria-label="Message"
          placeholder="Message"
          value={draft}
          maxLength={240}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          className="pg-phone-send"
          disabled={!draft.trim()}
          title="Send message"
          aria-label="Send message"
        >
          <ArrowUp size={15} />
        </button>
      </form>
      <div className="pg-phone-tools">
        <button
          type="button"
          title="Add an attachment"
          aria-label="Add an attachment"
          onClick={() => void run('upload')}
        >
          <Paperclip size={15} />
        </button>
        <button
          type="button"
          title="Add a voice note"
          aria-label="Add a voice note"
          onClick={() => void run('voice')}
        >
          <Mic size={15} />
        </button>
        <button
          type="button"
          title="Insert sound cards"
          aria-label="Insert sound cards"
          onClick={() => void run('cards')}
        >
          <Layers size={14} />
        </button>
        <button
          type="button"
          title="Simulate delivery failure"
          aria-label="Simulate delivery failure"
          onClick={() => void run('failure')}
        >
          <WifiOff size={14} />
        </button>
        <button
          type="button"
          className="pg-phone-sequence"
          onClick={() => (flowing ? audio.stop() : void run('flow'))}
          aria-label={
            flowing
              ? 'Stop conversation sequence'
              : 'Play conversation sequence'
          }
        >
          {flowing ? (
            <Square size={10} fill="currentColor" />
          ) : (
            <Play size={10} fill="currentColor" />
          )}
          {flowing ? 'Stop' : 'Sequence'}
        </button>
      </div>
      <div className="pg-phone-home" aria-hidden="true" />
    </div>
  );
}
