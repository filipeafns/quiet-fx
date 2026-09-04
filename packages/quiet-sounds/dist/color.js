export const clamp01 = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
// Fixed digital-level range shared by every cue. Waveform height is normalized;
// its color is not. This is a designed sound-character scale, not Kelvin or SPL.
export function signalLevel(peak) {
    const x = clamp01((20 * Math.log10(Math.max(1e-9, peak)) + 46) / 22);
    return x * x * (3 - 2 * x);
}
const stops = [
    [147, 211, 239],
    [112, 170, 239],
    [151, 144, 224],
    [198, 137, 199],
    [232, 130, 142],
    [225, 85, 78],
];
export function heatPosition(level, toneShare = 0.5) {
    return Math.pow(clamp01(level), 1.8 - clamp01(toneShare) * 1.2);
}
export function signalRGB(level, toneShare = 0.5) {
    const t = heatPosition(level, toneShare) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(t)), f = t - i;
    const pale = 0.34 * (1 - clamp01(level));
    return stops[i].map((v, j) => Math.round((v + (stops[i + 1][j] - v) * f) * (1 - pale) + 255 * pale));
}
export const signalColor = (level, toneShare = 0.5) => `rgb(${signalRGB(level, toneShare).join(' ')})`;
export function soundStyle(rendered) {
    const color = signalColor(signalLevel(rendered?.peak || 0), rendered?.toneShare ?? 0.5);
    return {
        '--sound-color': color,
        '--sound-wash': `color-mix(in srgb, ${color} 13%, white)`,
        '--sound-hover': `color-mix(in srgb, ${color} 8%, white)`,
    };
}
