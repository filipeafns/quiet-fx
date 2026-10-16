import { hash, type Layer, type Patch } from './engine';
export type Cue = {
  id: string;
  name: string;
  category: string;
  description: string;
  use: string;
  source: 'Quiet';
  root: number;
  recipe: { layers: Layer[]; masterGain: number; shimmer?: Patch['shimmer'] };
};
export type Settings = {
  key: string;
  mode: string;
  voice: string;
  variant: string;
  shape: string;
  softness: number;
  brightness: number;
  duration: number;
  texture: number;
  seed: number;
};
export const KEYS = [
  'C',
  'C♯',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
];
export const MODES = ['Major', 'Minor', 'Pentatonic'];
export const VOICES = ['Soft', 'Felt', 'Glass', 'Pluck'];
export const VARIANTS = ['Light', 'Normal', 'Deep', 'Short', 'Long', 'Airy'];
export const SHAPES = ['Natural', 'Taper', 'Swell', 'Ripple', 'Double'];
export const DEFAULTS: Settings = {
  key: 'C',
  mode: 'Major',
  voice: 'Soft',
  variant: 'Normal',
  shape: 'Natural',
  softness: 32,
  brightness: 45,
  duration: 1,
  texture: 42,
  seed: 1,
};
const tone = (
  frequency: number,
  attack = 0.006,
  decay = 0.13,
  peak = 0.065,
  offset = 0,
): Layer => ({
  kind: 'tone',
  waveform: 'sine',
  frequency,
  attack,
  decay,
  peak,
  offset,
});
const noise = (
  filterFrequency: number,
  attack = 0.004,
  decay = 0.05,
  peak = 0.095,
  offset = 0,
  filterTo?: number,
): Layer => ({
  kind: 'noise',
  filterType: 'bandpass',
  filterFrequency,
  filterQ: 0.8,
  attack,
  decay,
  peak,
  offset,
  filterTo,
});
const n = (semitone: number) => 261.625565 * Math.pow(2, semitone / 12);
function cue(
  id: string,
  name: string,
  category: string,
  description: string,
  use: string,
  layers: Layer[],
  gain = 0.53,
): Cue {
  return {
    id,
    name,
    category,
    description,
    use,
    source: 'Quiet',
    root: 0,
    recipe: { layers, masterGain: gain },
  };
}
const extension: Cue[] = [
  cue(
    'focus',
    'Focus',
    'Interface',
    'A soft wooden point of focus.',
    'Moving deliberately between items.',
    [noise(1100, 0.003, 0.032, 0.09), tone(523.25, 0.004, 0.055, 0.023)],
  ),
  cue(
    'snap',
    'Magnetic snap',
    'Interface',
    'A low body and a crisp contact.',
    'A dragged object finding its anchor.',
    [tone(261.63, 0.001, 0.065, 0.07), noise(2300, 0.001, 0.026, 0.08, 0.007)],
  ),
  cue(
    'detent',
    'Dial step',
    'Interface',
    'A dry, precise tactile increment.',
    'Stepping through a dial or slider.',
    [noise(2100, 0.001, 0.014, 0.1), tone(785, 0.001, 0.014, 0.02)],
  ),
  cue(
    'toggle-on',
    'Switch on',
    'Interface',
    'Two contacts that open upward.',
    'Enabling a setting.',
    [noise(1400, 0.001, 0.017, 0.1), tone(523.25, 0.002, 0.05, 0.04, 0.035)],
  ),
  cue(
    'toggle-off',
    'Switch off',
    'Interface',
    'A short contact that settles lower.',
    'Disabling a setting.',
    [noise(2000, 0.001, 0.016, 0.085), tone(261.63, 0.002, 0.055, 0.04, 0.028)],
  ),
  cue(
    'lock',
    'Lock',
    'Interface',
    'Two close clicks and a low seat.',
    'Locking a selection or constraint.',
    [
      noise(2900, 0.001, 0.02, 0.08),
      noise(1500, 0.001, 0.024, 0.1, 0.045),
      tone(196.0, 0.002, 0.035, 0.03, 0.047),
    ],
  ),
  cue(
    'unlock',
    'Unlock',
    'Interface',
    'A small latch releasing upward.',
    'Removing a constraint.',
    [
      noise(1400, 0.001, 0.02, 0.09),
      {
        ...tone(261.63, 0.003, 0.08, 0.035, 0.04),
        glideTo: 392,
        glideTime: 0.05,
      },
    ],
  ),
  cue(
    'undo',
    'Undo',
    'Signals',
    'A compact descending pair.',
    'Stepping back one action.',
    [tone(783.99, 0.005, 0.085, 0.05), tone(523.25, 0.005, 0.14, 0.05, 0.075)],
  ),
  cue(
    'notify',
    'Soft notice',
    'Signals',
    'A bell with a quiet harmonic halo.',
    'A useful, nonurgent update.',
    [tone(783.99, 0.008, 0.2, 0.06), tone(1567.98, 0.01, 0.12, 0.014, 0.035)],
  ),
  cue(
    'complete',
    'Resolve',
    'Signals',
    'A suspended fourth resolves to the root.',
    'Completion after a longer operation.',
    [
      tone(698.46, 0.008, 0.1, 0.04),
      tone(783.99, 0.008, 0.1, 0.04, 0.1),
      tone(1046.5, 0.008, 0.2, 0.05, 0.2),
    ],
  ),
  cue(
    'connect',
    'Connect',
    'Signals',
    'Two voices converge into a fifth.',
    'A device or workspace connecting.',
    [
      { ...tone(392, 0.016, 0.16, 0.045), glideTo: 523.25, glideTime: 0.11 },
      tone(783.99, 0.012, 0.2, 0.04, 0.14),
    ],
  ),
  cue(
    'disconnect',
    'Disconnect',
    'Signals',
    'A fifth retracts into a low root.',
    'A connection closing without an error.',
    [
      tone(783.99, 0.008, 0.13, 0.04),
      tone(523.25, 0.008, 0.13, 0.04, 0.075),
      tone(261.63, 0.012, 0.12, 0.03, 0.15),
    ],
  ),
  cue(
    'whoosh-in',
    'Whoosh in',
    'Motion',
    'Air opens, travels, then comes to rest.',
    'A panel entering the scene.',
    [
      noise(400, 0.07, 0.27, 0.13, 0, 3500),
      noise(1200, 0.04, 0.13, 0.05, 0.21, 600),
    ],
  ),
  cue(
    'whoosh-out',
    'Whoosh out',
    'Motion',
    'A shrinking breath of filtered air.',
    'A panel leaving the scene.',
    [noise(3200, 0.035, 0.25, 0.13, 0, 350)],
  ),
  cue(
    'card-flip',
    'Card flip',
    'Motion',
    'Air through rotation, then a fine contact.',
    'One card turning over.',
    [
      noise(900, 0.045, 0.17, 0.1, 0, 4200),
      noise(2900, 0.001, 0.026, 0.11, 0.29),
      tone(392, 0.002, 0.04, 0.018, 0.29),
    ],
  ),
  cue(
    'card-place',
    'Card place',
    'Motion',
    'A soft edge and a muted surface knock.',
    'A card landing on a table.',
    [
      noise(2200, 0.001, 0.027, 0.1),
      tone(196, 0.001, 0.075, 0.05),
      noise(900, 0.003, 0.035, 0.04, 0.014),
    ],
  ),
  cue(
    'deck-riffle',
    'Deck riffle',
    'Motion',
    'Ten separate edges in a cascading rhythm.',
    'Releasing a small deck of cards.',
    Array.from({ length: 10 }, (_, i) =>
      noise(
        1400 + i * 160,
        0.001,
        0.023,
        0.07 + (i % 3) * 0.009,
        0.04 + i * 0.045,
      ),
    ),
  ),
  cue(
    'deck-fan',
    'Deck fan',
    'Motion',
    'Six overlapping edges spread into air.',
    'Fanning cards across a surface.',
    [
      noise(800, 0.05, 0.28, 0.065, 0, 2600),
      ...Array.from({ length: 6 }, (_, i) =>
        noise(1700 + i * 170, 0.002, 0.035, 0.07, i * 0.055),
      ),
    ],
  ),
  cue(
    'page-turn',
    'Page turn',
    'Motion',
    'A page bends, brushes, and settles.',
    'Turning a page in a book.',
    [
      noise(600, 0.045, 0.19, 0.13, 0, 2400),
      noise(3400, 0.04, 0.16, 0.09, 0.12, 1200),
      noise(1800, 0.002, 0.055, 0.07, 0.42),
    ],
  ),
  cue(
    'page-stack',
    'Page flutter',
    'Motion',
    'Seven light page edges, individually heard.',
    'Scrubbing through a stack of pages.',
    Array.from({ length: 7 }, (_, i) =>
      noise(1200 + i * 130, 0.004, 0.065, 0.09 - i * 0.004, i * 0.07),
    ),
  ),
  cue(
    'book-close',
    'Book close',
    'Motion',
    'An air cushion ending in a padded thump.',
    'A book or folio coming to rest.',
    [
      noise(650, 0.06, 0.12, 0.065),
      tone(130.81, 0.002, 0.16, 0.08, 0.21),
      noise(1600, 0.002, 0.055, 0.1, 0.21),
    ],
  ),
  cue(
    'soft-impact',
    'Soft impact',
    'Motion',
    'A rounded, low contact with a tiny edge.',
    'An object gently meeting a surface.',
    [
      { ...tone(196, 0.002, 0.13, 0.07), glideTo: 98, glideTime: 0.09 },
      noise(950, 0.002, 0.045, 0.06),
    ],
  ),
  cue(
    'swipe',
    'Swipe',
    'Motion',
    'A thin lateral brush, light and quick.',
    'A fast horizontal transition.',
    [noise(1000, 0.02, 0.12, 0.1, 0, 4200)],
  ),
  cue(
    'fold',
    'Paper fold',
    'Motion',
    'Friction rises into a crisp crease.',
    'Folding or unfolding a panel.',
    [
      noise(1700, 0.055, 0.12, 0.095, 0, 3200),
      noise(4300, 0.002, 0.045, 0.075, 0.22),
    ],
  ),
];
// Authored Quiet foundations. Material resonances and short motifs form the palette.
const foundation: Cue[] = [
  cue(
    'sparkle',
    'Sparkle',
    'Tonal',
    'A scattered glimmer that gathers into one clear point.',
    'A tiny moment of delight.',
    [
      tone(n(19), 0.008, 0.085, 0.047),
      tone(n(28), 0.005, 0.072, 0.025, 0.037),
      tone(n(24), 0.009, 0.105, 0.046, 0.092),
      tone(n(31), 0.004, 0.055, 0.02, 0.14),
      tone(n(36), 0.008, 0.13, 0.026, 0.196),
      noise(6200, 0.009, 0.075, 0.018, 0.065),
    ],
  ),
  cue(
    'halo',
    'Halo',
    'Tonal',
    'A rounded tone with a slowly opening harmonic edge.',
    'A reveal or welcome.',
    [
      tone(n(12), 0.046, 0.25, 0.07),
      tone(n(19), 0.065, 0.21, 0.022, 0.03),
      noise(750, 0.035, 0.18, 0.032),
    ],
  ),
  cue(
    'glint',
    'Glint',
    'Tonal',
    'A brief point of glass with an offset overtone.',
    'A small highlight.',
    [tone(n(31), 0.002, 0.083, 0.04), tone(n(19), 0.004, 0.14, 0.051, 0.009)],
  ),
  cue(
    'mist',
    'Mist',
    'Tonal',
    'A soft root carried on a breath of air.',
    'An unobtrusive arrival.',
    [
      tone(n(7), 0.065, 0.19, 0.057),
      noise(1100, 0.08, 0.2, 0.035, 0, 3200),
      tone(n(14), 0.05, 0.12, 0.015, 0.08),
    ],
  ),
  cue(
    'pearl',
    'Pearl',
    'Tonal',
    'A rounded pluck and a quiet octave reply.',
    'A selection coming to rest.',
    [
      {
        ...tone(n(12), 0.005, 0.115, 0.064),
        glideTo: n(12) * 0.97,
        glideTime: 0.065,
      },
      tone(n(24), 0.004, 0.065, 0.021, 0.032),
    ],
  ),
  cue(
    'orbit',
    'Orbit',
    'Tonal',
    'A root, a sixth, and a return to the root.',
    'A cyclical action finishing.',
    [
      tone(n(12), 0.012, 0.13, 0.045),
      tone(n(21), 0.012, 0.1, 0.035, 0.082),
      tone(n(12), 0.014, 0.18, 0.05, 0.185),
    ],
  ),
  cue(
    'aurora',
    'Aurora',
    'Tonal',
    'Three gentle voices unfold across a wide register.',
    'A larger reveal.',
    [
      tone(n(7), 0.085, 0.32, 0.047),
      tone(n(16), 0.075, 0.28, 0.036, 0.056),
      tone(n(24), 0.07, 0.24, 0.027, 0.12),
    ],
  ),
  cue(
    'drift',
    'Drift',
    'Tonal',
    'An open fifth folds into a lower register.',
    'A relaxed transition.',
    [
      { ...tone(n(19), 0.035, 0.23, 0.036), glideTo: n(7), glideTime: 0.21 },
      tone(n(0), 0.07, 0.19, 0.034, 0.08),
    ],
  ),
  cue(
    'ripple',
    'Ripple',
    'Tonal',
    'Three soft contacts spreading outward.',
    'A change moving through a group.',
    [
      tone(n(12), 0.008, 0.085, 0.053),
      tone(n(19), 0.012, 0.11, 0.034, 0.074),
      tone(n(24), 0.017, 0.17, 0.022, 0.175),
    ],
  ),
  cue(
    'ember',
    'Ember',
    'Tonal',
    'A low warm body, with a delicate rough edge.',
    'Quiet ambient feedback.',
    [
      tone(n(0), 0.024, 0.17, 0.075),
      { ...tone(n(12), 0.014, 0.12, 0.021), waveform: 'triangle' },
      noise(650, 0.021, 0.085, 0.025),
    ],
  ),
  cue(
    'prism',
    'Prism',
    'Tonal',
    'A compact spread of upper harmonics.',
    'A focused highlight.',
    [
      tone(n(24), 0.006, 0.12, 0.038),
      tone(n(28), 0.011, 0.15, 0.028, 0.016),
      tone(n(31), 0.017, 0.17, 0.018, 0.036),
    ],
  ),
  cue(
    'lilt',
    'Lilt',
    'Tonal',
    'A dotted, upward two-step with a soft landing.',
    'A small positive state change.',
    [
      tone(n(9), 0.008, 0.08, 0.049),
      tone(n(16), 0.009, 0.075, 0.035, 0.105),
      tone(n(12), 0.012, 0.16, 0.05, 0.145),
    ],
  ),
  cue(
    'tap',
    'Tap',
    'Interface',
    'A short rounded tap, with a fine edge.',
    'A deliberate button action.',
    [tone(n(7), 0.002, 0.032, 0.055), noise(1300, 0.001, 0.019, 0.07, 0.003)],
  ),
  cue(
    'touch',
    'Touch',
    'Interface',
    'A padded fingertip impression.',
    'A soft press.',
    [noise(650, 0.005, 0.027, 0.12), tone(n(-5), 0.004, 0.041, 0.025)],
  ),
  cue(
    'lift',
    'Lift',
    'Interface',
    'A thin click with a small upward spring.',
    'Releasing a pressed control.',
    [
      noise(3400, 0.002, 0.016, 0.07),
      {
        ...tone(n(19), 0.002, 0.046, 0.024, 0.012),
        glideTo: n(24),
        glideTime: 0.03,
      },
    ],
  ),
  cue(
    'notch',
    'Notch',
    'Interface',
    'A dry pair of close mechanical edges.',
    'Stepping through a scale.',
    [noise(1800, 0.001, 0.012, 0.07), noise(3200, 0.001, 0.008, 0.04, 0.009)],
  ),
  cue(
    'hover',
    'Hover',
    'Interface',
    'A fine breath at the edge of a tone.',
    'A deliberate preview.',
    [noise(1900, 0.012, 0.039, 0.026), tone(n(19), 0.009, 0.048, 0.021)],
  ),
  cue(
    'select',
    'Select',
    'Interface',
    'A low contact followed by a clear tiny note.',
    'Selecting an item.',
    [noise(900, 0.002, 0.021, 0.071), tone(n(16), 0.004, 0.068, 0.031, 0.012)],
  ),
  cue(
    'deselect',
    'Deselect',
    'Interface',
    'A small note retracts into a muted edge.',
    'Clearing a selection.',
    [tone(n(12), 0.003, 0.047, 0.029), noise(1100, 0.003, 0.027, 0.05, 0.025)],
  ),
  cue(
    'expand',
    'Expand',
    'Interface',
    'Air opens around a gentle rising body.',
    'Expanding a control.',
    [
      noise(550, 0.031, 0.1, 0.042, 0, 2100),
      { ...tone(n(0), 0.018, 0.11, 0.036), glideTo: n(7), glideTime: 0.095 },
    ],
  ),
  cue(
    'collapse',
    'Collapse',
    'Interface',
    'A soft inward fold with a low endpoint.',
    'Collapsing a control.',
    [
      noise(2200, 0.013, 0.074, 0.042, 0, 650),
      tone(n(-5), 0.005, 0.069, 0.039, 0.06),
    ],
  ),
  cue(
    'drag',
    'Drag',
    'Interface',
    'A short friction grip.',
    'Picking up a draggable object.',
    [
      noise(800, 0.007, 0.045, 0.086, 0, 1600),
      tone(n(-12), 0.008, 0.048, 0.039),
    ],
  ),
  cue(
    'dock',
    'Dock',
    'Interface',
    'A low seat and a quiet latch.',
    'A dragged object docking.',
    [
      tone(n(-5), 0.002, 0.089, 0.066),
      noise(1700, 0.002, 0.029, 0.067, 0.014),
      noise(3200, 0.001, 0.013, 0.025, 0.042),
    ],
  ),
  cue(
    'soft-key',
    'Soft key',
    'Interface',
    'A padded strike and delicate key return.',
    'Typing or repeated input.',
    [
      noise(1100, 0.001, 0.018, 0.085),
      noise(2600, 0.001, 0.015, 0.029, 0.028),
      tone(n(7), 0.002, 0.024, 0.015),
    ],
  ),
  cue(
    'confirm',
    'Confirm',
    'Signals',
    'A fifth opens into a rounded tonic.',
    'Confirming a successful action.',
    [
      tone(n(7), 0.009, 0.07, 0.05),
      tone(n(12), 0.016, 0.15, 0.071, 0.088),
      tone(n(24), 0.011, 0.08, 0.015, 0.09),
    ],
  ),
  cue(
    'decline',
    'Decline',
    'Signals',
    'A compact descending third, without alarm.',
    'A recoverable refusal.',
    [
      tone(n(4), 0.006, 0.095, 0.047),
      tone(n(0), 0.009, 0.13, 0.046, 0.105),
      noise(700, 0.004, 0.024, 0.034),
    ],
  ),
  cue(
    'send',
    'Send',
    'Signals',
    'A quick lift with a small air trail.',
    'Sending a message.',
    [
      { ...tone(n(7), 0.01, 0.11, 0.046), glideTo: n(19), glideTime: 0.08 },
      noise(1700, 0.023, 0.085, 0.031, 0.03, 4200),
    ],
  ),
  cue(
    'receive',
    'Receive',
    'Signals',
    'A bright point settles into a warmer note.',
    'Receiving a message.',
    [tone(n(24), 0.004, 0.08, 0.029), tone(n(16), 0.009, 0.14, 0.045, 0.065)],
  ),
  cue(
    'begin',
    'Begin',
    'Signals',
    'A small open interval, ready to continue.',
    'Starting user-initiated work.',
    [tone(n(0), 0.02, 0.11, 0.044), tone(n(14), 0.025, 0.13, 0.035, 0.045)],
  ),
  cue(
    'pause',
    'Pause',
    'Signals',
    'Two evenly spaced, padded notes.',
    'Pausing a process.',
    [tone(n(7), 0.009, 0.065, 0.035), tone(n(7), 0.009, 0.065, 0.028, 0.094)],
  ),
  cue(
    'resume',
    'Resume',
    'Signals',
    'A quiet repeated note steps forward.',
    'Resuming a process.',
    [tone(n(7), 0.007, 0.06, 0.031), tone(n(12), 0.009, 0.1, 0.044, 0.061)],
  ),
  cue(
    'attention',
    'Attention',
    'Signals',
    'A soft, separated pair with a little lift.',
    'An update worth noticing.',
    [tone(n(19), 0.013, 0.13, 0.039), tone(n(16), 0.016, 0.17, 0.031, 0.205)],
  ),
  cue(
    'found',
    'Found',
    'Signals',
    'A short search-like pickup resolves clearly.',
    'Finding a match.',
    [
      tone(n(14), 0.003, 0.042, 0.024),
      tone(n(16), 0.003, 0.051, 0.025, 0.037),
      tone(n(19), 0.008, 0.115, 0.046, 0.086),
    ],
  ),
  cue(
    'finish',
    'Finish',
    'Signals',
    'A low tonic supports a final, gentle octave.',
    'Finishing a longer flow.',
    [
      tone(n(7), 0.012, 0.09, 0.029),
      tone(n(4), 0.015, 0.1, 0.031, 0.076),
      tone(n(0), 0.021, 0.22, 0.054, 0.158),
      tone(n(12), 0.028, 0.19, 0.031, 0.172),
    ],
  ),
  cue(
    'felt-tap',
    'Felt tap',
    'Materials',
    'A dense, padded contact.',
    'Soft surfaces and fabric objects.',
    [noise(480, 0.005, 0.053, 0.14), tone(n(-12), 0.008, 0.075, 0.046)],
  ),
  cue(
    'wood-tap',
    'Wood tap',
    'Materials',
    'Two dry body resonances with a small edge.',
    'A warm wooden contact.',
    [
      tone(n(0), 0.001, 0.045, 0.048),
      {
        ...tone(n(0) * 2.76, 0.001, 0.026, 0.02),
        waveform: 'triangle',
        anchorFrequency: n(0),
      },
      noise(1450, 0.001, 0.027, 0.08),
    ],
  ),
  cue(
    'glass-touch',
    'Glass touch',
    'Materials',
    'A quiet glass body with a fine upper partial.',
    'Delicate rigid surfaces.',
    [
      tone(n(24), 0.003, 0.19, 0.036),
      { ...tone(n(24) * 2.41, 0.002, 0.065, 0.014), anchorFrequency: n(24) },
      noise(4100, 0.001, 0.013, 0.023),
    ],
  ),
  cue(
    'paper-slide',
    'Paper slide',
    'Materials',
    'A thin sheet brushing across a surface.',
    'Paper moving laterally.',
    [
      noise(1800, 0.033, 0.135, 0.067, 0, 3300),
      noise(4200, 0.023, 0.065, 0.023, 0.12, 1600),
    ],
  ),
  cue(
    'cloth-brush',
    'Cloth brush',
    'Materials',
    'A low, diffuse swipe of fabric.',
    'Soft material transitions.',
    [
      noise(520, 0.047, 0.18, 0.1, 0, 1700),
      noise(1200, 0.075, 0.12, 0.027, 0.06, 500),
    ],
  ),
  cue(
    'zip',
    'Zip',
    'Materials',
    'A fast row of tiny catches, gently fading.',
    'A short closure or reveal.',
    Array.from({ length: 9 }, (_, i) =>
      noise(1300 + i * 190, 0.001, 0.012, 0.045 - i * 0.002, i * 0.018),
    ),
  ),
];
const conversation: Cue[] = [
  cue(
    'chat-new-conversation',
    'Conversation',
    'Sequences',
    'A little air opens into a warm fifth.',
    'Opening a new conversation.',
    [
      noise(650, 0.025, 0.09, 0.045, 0, 1500),
      tone(n(0), 0.015, 0.11, 0.034, 0.025),
      tone(n(7), 0.02, 0.14, 0.033, 0.095),
    ],
    0.48,
  ),
  cue(
    'chat-receive-message',
    'Message arrival',
    'Sequences',
    'A tiny contact settles into a rounded note.',
    'An incoming message becoming visible.',
    [
      noise(1100, 0.003, 0.025, 0.045),
      tone(n(19), 0.006, 0.065, 0.03, 0.012),
      tone(n(12), 0.012, 0.12, 0.041, 0.085),
    ],
    0.48,
  ),
  cue(
    'chat-send-message',
    'Message lift',
    'Sequences',
    'A padded press followed by a brief rising breath.',
    'Sending a message.',
    [
      noise(800, 0.003, 0.022, 0.055),
      {
        ...tone(n(7), 0.008, 0.1, 0.036, 0.015),
        glideTo: n(19),
        glideTime: 0.07,
      },
      noise(1200, 0.02, 0.085, 0.035, 0.035, 2800),
    ],
    0.48,
  ),
  cue(
    'chat-insert-cards',
    'Card cascade',
    'Sequences',
    'Three paper edges with a small body at each end.',
    'Cards arriving in a conversation.',
    [
      noise(1500, 0.012, 0.065, 0.047, 0, 2900),
      noise(1750, 0.012, 0.065, 0.041, 0.09, 3100),
      noise(1900, 0.012, 0.065, 0.037, 0.18, 3300),
      tone(n(-12), 0.003, 0.035, 0.028, 0.02),
      tone(n(-5), 0.003, 0.035, 0.028, 0.205),
    ],
    0.49,
  ),
  cue(
    'chat-insert-voice-note',
    'Voice capsule',
    'Sequences',
    'A felt contact grows into an open interval.',
    'A voice note forming.',
    [
      noise(900, 0.005, 0.035, 0.047),
      tone(n(0), 0.014, 0.09, 0.038, 0.025),
      tone(n(7), 0.018, 0.1, 0.03, 0.09),
    ],
    0.48,
  ),
  cue(
    'chat-upload-attachment',
    'Attachment',
    'Sequences',
    'A latch and air trail, then a two-note completion.',
    'An attachment uploading and finishing.',
    [
      noise(1300, 0.002, 0.025, 0.054),
      tone(n(0), 0.009, 0.07, 0.035, 0.012),
      noise(850, 0.035, 0.12, 0.036, 0.065, 2100),
      { ...tone(n(7), 0.008, 0.07, 0.031, 0.42), event: 'complete' },
      { ...tone(n(12), 0.012, 0.12, 0.038, 0.485), event: 'complete' },
    ],
    0.48,
  ),
  cue(
    'chat-delivery-failure',
    'Delivery pause',
    'Sequences',
    'Two muted contacts and a gentle unresolved fall.',
    'A message failing to send.',
    [
      noise(650, 0.004, 0.03, 0.047),
      noise(800, 0.004, 0.03, 0.034, 0.085),
      {
        ...tone(n(7), 0.01, 0.125, 0.032, 0.025),
        glideTo: n(2),
        glideTime: 0.085,
      },
    ],
    0.46,
  ),
  cue(
    'chat-retry-delivery',
    'Delivery return',
    'Sequences',
    'A returning breath with a small forward step.',
    'Retrying delivery.',
    [
      noise(700, 0.015, 0.07, 0.044, 0, 1600),
      tone(n(2), 0.008, 0.065, 0.03, 0.035),
      { ...tone(n(7), 0.01, 0.1, 0.038, 0.105), event: 'complete' },
    ],
    0.48,
  ),
];
export const CUES = [...foundation, ...extension, ...conversation];
export const CATEGORIES = [
  'All',
  'Interface',
  'Signals',
  'Tonal',
  'Motion',
  'Materials',
  'Sequences',
];
const variantSettings: Record<
  string,
  { gain: number; time: number; pitch: number; bright: number; attack: number }
> = {
  Light: { gain: 0.78, time: 0.83, pitch: 12, bright: 1.06, attack: 1.2 },
  Normal: { gain: 1, time: 1, pitch: 0, bright: 1, attack: 1 },
  Deep: { gain: 0.97, time: 1.12, pitch: -12, bright: 0.55, attack: 1.12 },
  Short: { gain: 0.96, time: 0.56, pitch: 0, bright: 1.08, attack: 0.75 },
  Long: { gain: 0.91, time: 1.78, pitch: 0, bright: 0.85, attack: 1.35 },
  Airy: { gain: 0.83, time: 1.28, pitch: 0, bright: 0.9, attack: 1.6 },
};
export function makePatch(cue: Cue, s: Settings): Patch {
  const v = variantSettings[s.variant] || variantSettings.Normal,
    time = s.duration * v.time,
    bright = Math.pow(2, (s.brightness - 45) / 70) * v.bright;
  const scale =
    s.mode === 'Minor'
      ? [0, 2, 3, 5, 7, 8, 10]
      : s.mode === 'Pentatonic'
        ? [0, 2, 4, 7, 9]
        : [0, 2, 4, 5, 7, 9, 11];
  const tune = (frequency: number) => {
    const midi = 69 + 12 * Math.log2(frequency / 440),
      relative = midi - cue.root,
      oct = Math.floor(relative / 12),
      pc = relative - oct * 12,
      nearest = [...scale, 12].reduce((a, b) =>
        Math.abs(pc - a) < Math.abs(pc - b) ? a : b,
      );
    return Math.min(
      16000,
      Math.max(
        30,
        440 *
          Math.pow(
            2,
            (oct * 12 + nearest + KEYS.indexOf(s.key) + v.pitch - 69) / 12,
          ),
      ),
    );
  };
  let layers = cue.recipe.layers.map((l) => {
    const r: Layer = {
      ...l,
      offset: (l.offset || 0) * time,
      attack: Math.max(
        0.0003,
        l.attack * time * v.attack + s.softness * 0.00004,
      ),
      decay: Math.max(0.003, l.decay * time),
      peak: l.peak * v.gain,
    };
    if (l.kind === 'tone') {
      const frequency = Math.min(
        16000,
        tune(l.anchorFrequency || l.frequency || 440) *
          ((l.frequency || 440) / (l.anchorFrequency || l.frequency || 440)),
      );
      r.frequency = frequency;
      r.waveform = s.voice === 'Felt' ? 'triangle' : l.waveform || 'sine';
      if (l.glideTo)
        r.glideTo = Math.min(
          17000,
          Math.max(25, (frequency * l.glideTo) / (l.frequency || 440)),
        );
      if (l.glideTime) r.glideTime = l.glideTime * time;
      if (s.voice === 'Felt') {
        r.peak *= 0.82;
        r.decay *= 0.77;
      }
      if (s.voice === 'Glass') {
        r.decay *= 1.2;
        r.detune = (l.detune || 0) + 4;
      }
      if (s.voice === 'Pluck') {
        r.attack = Math.min(0.004, r.attack);
        r.decay *= 0.65;
      }
    } else {
      r.filterFrequency = Math.min(14000, (l.filterFrequency || 1800) * bright);
      if (l.filterTo) r.filterTo = Math.min(14000, l.filterTo * bright);
      r.peak *= 0.4 + s.texture * 0.013;
    }
    if (s.shape === 'Taper') {
      r.attack = Math.min(0.002, r.attack);
      r.decay *= 0.75;
    }
    if (s.shape === 'Swell') {
      const span = r.attack + r.decay;
      r.attack = span * 0.58;
      r.decay = span * 0.7;
    }
    return r;
  });
  if (s.voice === 'Glass' || s.voice === 'Pluck') {
    layers.push(
      ...layers
        .filter((l) => l.kind === 'tone')
        .map((l) => ({
          ...l,
          frequency: Math.min(
            17000,
            l.frequency! * (s.voice === 'Glass' ? 2 : 3),
          ),
          glideTo: l.glideTo
            ? Math.min(17000, l.glideTo * (s.voice === 'Glass' ? 2 : 3))
            : undefined,
          peak: l.peak * (s.voice === 'Glass' ? 0.16 : 0.065),
          decay: l.decay * 0.48,
        })),
    );
  }
  const eventEnd = Math.max(
    ...layers.map((l) => (l.offset || 0) + l.attack + l.decay),
  );
  if (s.variant === 'Airy') {
    layers.push(
      noise(1850, 0.018 * time, Math.min(1, eventEnd * 0.85), 0.042, 0, 4300),
    );
  }
  if (s.shape === 'Ripple') {
    layers = layers.flatMap((l) => [
      l,
      { ...l, offset: (l.offset || 0) + 0.075 * time, peak: l.peak * 0.38 },
      { ...l, offset: (l.offset || 0) + 0.155 * time, peak: l.peak * 0.17 },
    ]);
  }
  if (s.shape === 'Double') {
    layers = layers.flatMap((l) => [
      l,
      {
        ...l,
        offset: (l.offset || 0) + Math.max(0.035, eventEnd * 0.67),
        peak: l.peak * 0.6,
      },
    ]);
  }
  layers = layers.map((layer) => ({
    ...layer,
    decay: Math.max(0.001, layer.decay),
  }));
  return {
    id: cue.id,
    name: cue.name,
    seed: hash(cue.id + ':' + s.seed),
    masterGain: cue.recipe.masterGain,
    layers,
    source: 'Quiet',
    settings: { ...s },
  };
}

export function timingScale(settings: Settings) {
  return settings.duration * (variantSettings[settings.variant]?.time || 1);
}
