'use client';
/* oxlint-disable react/react-compiler -- This memo owns an imperative audio-clock service; current options are read from a ref without replacing active timelines. */
import { useEffect, useMemo, useRef } from 'react';
import { CUES, makePatch, type Settings } from '@/lib/audio/catalog';
import {
  renderPatch,
  type Rendered,
  type SoundPlayer,
} from '@/lib/audio/engine';

type Frame = (elapsed: number) => void;
type End = (completed: boolean) => void;
export type PlaygroundAudio = {
  play: (rendered: Rendered, onFrame?: Frame, onEnd?: End) => Promise<boolean>;
  cue: (id: string, onFrame?: Frame, onEnd?: End) => Promise<boolean>;
  hover: (id: string) => void;
  stop: () => void;
};

// One clock and one owner prevent queued gestures and competing scene timelines.
export function usePlaygroundAudio(options: {
  settings: Settings;
  player: SoundPlayer;
  onEnable: () => Promise<boolean>;
  onSignal: (name: string, rendered: Rendered) => void;
}): PlaygroundAudio {
  const { player } = options;
  const current = useRef(options);
  useEffect(() => {
    current.current = options;
  }, [options]);
  const audio = useMemo(() => {
    const state = {
      generation: 0,
      frame: 0,
      ending: undefined as End | undefined,
    };
    const cancel = () => {
      state.generation++;
      cancelAnimationFrame(state.frame);
      const callback = state.ending;
      state.ending = undefined;
      callback?.(false);
    };
    const play = async (rendered: Rendered, onFrame?: Frame, onEnd?: End) => {
      player.stop();
      const token = state.generation;
      if (!(await current.current.onEnable()) || token !== state.generation)
        return false;
      const at = player.play(rendered, 0, false);
      if (at === null || !player.context) return false;
      state.ending = onEnd;
      const tick = () => {
        if (token !== state.generation || !player.context) return;
        const elapsed = Math.max(0, player.context.currentTime - at);
        onFrame?.(Math.min(elapsed, rendered.duration));
        if (elapsed < rendered.duration)
          state.frame = requestAnimationFrame(tick);
        else {
          state.ending = undefined;
          onEnd?.(true);
        }
      };
      state.frame = requestAnimationFrame(tick);
      return true;
    };
    return {
      play,
      hover: (id: string) => {
        // Hover never interrupts a sequence or waits for a later audio unlock.
        if (
          player.context?.state !== 'running' ||
          player.muted ||
          player.active.size
        )
          return;
        const cue = CUES.find((item) => item.id === id);
        if (cue)
          player.play(
            renderPatch(makePatch(cue, current.current.settings)),
            0,
            false,
            0.45,
          );
      },
      cue: async (id: string, onFrame?: Frame, onEnd?: End) => {
        const cue = CUES.find((item) => item.id === id);
        if (!cue) return false;
        const rendered = renderPatch(makePatch(cue, current.current.settings));
        const played = await play(rendered, onFrame, onEnd);
        if (played) current.current.onSignal(cue.name, rendered);
        return played;
      },
      stop: () => player.stop(),
      cancel,
    };
  }, [player]);
  useEffect(() => {
    player.stopListeners.add(audio.cancel);
    return () => {
      player.stop();
      player.stopListeners.delete(audio.cancel);
    };
  }, [audio, player]);
  return audio;
}
