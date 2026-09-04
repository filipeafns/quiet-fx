import { CUES, makePatch, timingScale, type Settings } from './catalog';
import { renderPatch, type Rendered } from './engine';
export const CHAT_ACTIONS = [
  {
    id: 'new',
    name: 'New conversation',
    cue: 'chat-new-conversation',
    start: 0,
    end: 0.8,
    sound: 0.05,
  },
  {
    id: 'receive',
    name: 'Receive a message',
    cue: 'chat-receive-message',
    start: 3.58,
    end: 4.98,
    sound: 4.48,
  },
  {
    id: 'send',
    name: 'Send a message',
    cue: 'chat-send-message',
    start: 1.68,
    end: 2.94,
    sound: 2.39,
  },
  {
    id: 'cards',
    name: 'Insert cards',
    cue: 'chat-insert-cards',
    start: 8.32,
    end: 9.18,
    sound: 8.32,
  },
  {
    id: 'voice',
    name: 'Insert voice note',
    cue: 'chat-insert-voice-note',
    start: 10.18,
    end: 10.85,
    sound: 10.18,
  },
  {
    id: 'upload',
    name: 'Upload attachment',
    cue: 'chat-upload-attachment',
    start: 11.22,
    end: 12.62,
    sound: 11.22,
  },
  {
    id: 'failure',
    name: 'Delivery failure',
    cue: 'chat-delivery-failure',
    start: 13.33,
    end: 14.8,
    sound: 14.17,
  },
  {
    id: 'retry',
    name: 'Retry delivery',
    cue: 'chat-retry-delivery',
    start: 15.33,
    end: 16.7,
    sound: 15.33,
  },
] as const;
export type ChatActionId = (typeof CHAT_ACTIONS)[number]['id'];
export const FLOW_DURATION = 17.6;
export const progress = (time: number, start: number, duration: number) =>
  Math.max(0, Math.min(1, (time - start) / duration));
export const smooth = (time: number, start: number, duration: number) => {
  const p = progress(time, start, duration);
  return p * p * (3 - 2 * p);
};
export function buildConversation(
  actionId: ChatActionId | 'flow',
  settings: Settings,
  speed = 1,
  offset = 0,
  replaceCue?: string,
) {
  const action = CHAT_ACTIONS.find((a) => a.id === actionId) || CHAT_ACTIONS[0];
  const start = actionId === 'flow' ? 0 : Math.max(0, action.start - 0.12),
    end = actionId === 'flow' ? FLOW_DURATION : action.end;
  const scale = timingScale(settings) / speed,
    local = { ...settings, duration: settings.duration / speed };
  const events =
    actionId === 'flow'
      ? [
          ...CHAT_ACTIONS,
          { ...CHAT_ACTIONS[2], sound: 6.18 },
          { ...CHAT_ACTIONS[2], sound: 7.33 },
        ]
      : [action];
  const clips = events.map((event) => {
    const cue = CUES.find((c) => c.id === (replaceCue || event.cue))!;
    const patch = makePatch(cue, local);
    if (!replaceCue && event.id === 'upload')
      for (const layer of patch.layers)
        if (layer.event === 'complete')
          layer.offset = (layer.offset || 0) + 0.4 * scale;
    if (!replaceCue && event.id === 'retry')
      for (const layer of patch.layers)
        if (layer.event === 'complete')
          layer.offset = (layer.offset || 0) + 0.635 * scale;
    return {
      at: (event.sound - start) * scale + Math.max(0, offset / 1000),
      audio: renderPatch(patch),
      cue: event.cue,
    };
  });
  const lead = Math.max(0, -offset / 1000),
    motionDuration = (end - start) * scale + lead;
  const duration =
    Math.max(motionDuration, ...clips.map((c) => c.at + c.audio.duration)) +
    0.06;
  const data = new Float32Array(Math.ceil(duration * 48000));
  let energy = 0,
    toneEnergy = 0;
  for (const c of clips) {
    const index = Math.round(c.at * 48000);
    for (let i = 0; i < c.audio.data.length; i++)
      data[index + i] += c.audio.data[i];
    const e = c.audio.rms ** 2 * c.audio.data.length;
    energy += e;
    toneEnergy += e * (c.audio.toneShare || 0);
  }
  let peak = 0,
    sum = 0;
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.max(-0.95, Math.min(0.95, data[i]));
    peak = Math.max(peak, Math.abs(data[i]));
    sum += data[i] ** 2;
  }
  const rendered: Rendered = {
    data,
    sampleRate: 48000,
    duration: data.length / 48000,
    peak,
    rms: Math.sqrt(sum / data.length),
    toneShare: toneEnergy / Math.max(energy, 1e-15),
  };
  return {
    rendered,
    start,
    end,
    scale,
    lead,
    motionDuration,
    events: clips.map((c) => ({
      at: c.at,
      cue: c.cue,
      duration: c.audio.duration,
      toneShare: c.audio.toneShare || 0,
      energy: c.audio.rms ** 2 * c.audio.data.length,
    })),
  };
}
export function conversationStage(time: number): ChatActionId {
  if (time >= 15.33) return 'retry';
  if (time >= 13.33) return 'failure';
  if (time >= 11.22) return 'upload';
  if (time >= 10.18) return 'voice';
  if (time >= 8.32) return 'cards';
  if (time >= 5.48) return 'send';
  if (time >= 3.58) return 'receive';
  if (time >= 1.68) return 'send';
  return 'new';
}
// Named reference beats, kept separate from the audio layer list.
export function conversationPose(t: number, reduced = false) {
  const rise = (start: number, duration: number) =>
    reduced ? (t >= start + duration ? 1 : 0) : smooth(t, start, duration);
  const cards = rise(8.32, 0.41),
    voice = rise(10.18, 0.28),
    upload = rise(11.22, 0.3),
    failure = rise(14.17, 0.18),
    retry = rise(16.07, 0.28);
  const sending =
    (t >= 1.68 && t < 2.4) ||
    (t >= 5.48 && t < 6.19) ||
    (t >= 6.63 && t < 7.34) ||
    (t >= 13.33 && t < 14.18);
  return {
    welcome: 1 - rise(1.68, 0.22),
    chips: rise(0.12, 0.3),
    send1: rise(2.39, 0.24),
    send2: rise(6.18, 0.24),
    send3: rise(7.33, 0.24),
    incoming: rise(3.58, 0.17),
    message: rise(4.48, 0.24),
    cards,
    card2: rise(8.41, 0.32),
    card3: rise(8.5, 0.3),
    voice,
    upload,
    uploadProgress: progress(t, 11.44, 0.61),
    uploaded: rise(12.05, 0.2),
    failure,
    retry,
    deliveryControl: failure * (1 - retry),
    retrying: t >= 15.33 && t < 16.07 ? 1 : 0,
    retryTurn: reduced ? 0 : Math.max(0, t - 15.33) * 620,
    idle: sending ? 0 : 1,
    scroll: -(
      cards * 50 +
      voice * 43 +
      upload * 56 +
      failure * 65 -
      retry * 40
    ),
    draft: sending ? 1 : 0,
    typing: reduced ? 0.5 : (Math.sin(t * 8) + 1) / 2,
  };
}
