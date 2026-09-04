'use client';
import { useEffect, useRef } from 'react';
import { SoundPlayer, waveform, type Rendered } from '@/lib/audio/engine';
import { signalColor, signalLevel } from '@/lib/audio/color';
export function Wave({
  rendered,
  large = false,
  spanSeconds,
}: {
  rendered?: Rendered;
  large?: boolean;
  spanSeconds?: number;
}) {
  const bins = rendered ? waveform(rendered.data, large ? 110 : 48) : [];
  const ratio =
    rendered && spanSeconds ? Math.min(1, rendered.duration / spanSeconds) : 1;
  return (
    <svg
      className={large ? 'signal-wave large' : 'signal-wave'}
      viewBox={`0 0 ${large ? 440 : 192} 80`}
      preserveAspectRatio="none"
      aria-label="Audio waveform; height normalized, color follows signal intensity and tonal character"
    >
      <line
        x1="0"
        y1="40"
        x2={large ? 440 : 192}
        y2="40"
        stroke="currentColor"
        opacity=".1"
      />
      {bins.map((v, i) => (
        <line
          key={i}
          x1={(i * 4 + 1) * ratio}
          x2={(i * 4 + 1) * ratio}
          y1={Number((40 - Math.max(0.6, v * 33)).toFixed(3))}
          y2={Number((40 + Math.max(0.6, v * 33)).toFixed(3))}
          stroke={`var(--wave-stroke, ${signalColor(signalLevel(v * (rendered?.peak || 0)), rendered?.toneShare)})`}
          strokeWidth={large ? 1.7 : 2}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
export function Spectrum({
  player,
  active,
  toneShare = 0.5,
}: {
  player: SoundPlayer | null;
  active: boolean;
  toneShare?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    const analyser = player?.analyser;
    const bins = new Float32Array(analyser?.frequencyBinCount || 512),
      time = new Float32Array(analyser?.fftSize || 1024);
    const draw = () => {
      ctx.clearRect(0, 0, 600, 90);
      const running =
        active && analyser && player?.context?.state === 'running';
      let peak = 0;
      if (running) {
        analyser.getFloatFrequencyData(bins);
        analyser.getFloatTimeDomainData(time);
        for (const v of time) peak = Math.max(peak, Math.abs(v));
      } else bins.fill(-Infinity);
      const gain = Math.max(0.001, player?.volume || 0.35),
        level = signalLevel(peak / gain),
        sampleRate = player?.context?.sampleRate || 48000;
      for (let i = 0; i < 72; i++) {
        // Log frequency axis (60 Hz to 16 kHz); height is measured FFT magnitude.
        const low = 60 * Math.pow(16000 / 60, i / 72),
          high = 60 * Math.pow(16000 / 60, (i + 1) / 72);
        const from = Math.max(
            1,
            Math.floor((low * 2 * bins.length) / sampleRate),
          ),
          to = Math.min(
            bins.length,
            Math.max(
              from + 1,
              Math.ceil((high * 2 * bins.length) / sampleRate),
            ),
          );
        let band = -Infinity;
        for (let bin = from; bin < to; bin++) band = Math.max(band, bins[bin]);
        const magnitude = running
          ? Math.max(0, Math.min(1, (band - 20 * Math.log10(gain) + 90) / 66))
          : 0;
        const h = Math.max(1, magnitude * 78);
        ctx.fillStyle = running
          ? signalColor(level * (0.35 + 0.65 * magnitude), toneShare)
          : '#e8ecf2';
        ctx.beginPath();
        ctx.roundRect(i * 8.3, 88 - h, 3.2, h, 2);
        ctx.fill();
      }
      if (active) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [player, active, toneShare]);
  return (
    <canvas
      ref={ref}
      width={600}
      height={90}
      className="spectrum"
      aria-label="Live frequency spectrum, low to high. Blue is softer; coral and red are stronger or more tonal."
    />
  );
}
