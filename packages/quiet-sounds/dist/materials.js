/** Authored material impressions, not recordings or physically calibrated models. */
export const MATERIAL_FAMILIES = [
    {
        id: 'felt',
        name: 'Felt / Wood',
        description: 'Padded contacts and dry wooden body resonances.',
    },
    {
        id: 'porcelain',
        name: 'Porcelain',
        description: 'Fine contacts with a small, inharmonic ceramic ring.',
    },
    {
        id: 'elastic',
        name: 'Elastic',
        description: 'Soft tension, a rounded bend, and a controlled return.',
    },
];
export const MATERIAL_ROLES = [
    'press',
    'release',
    'toggle',
    'confirm',
    'error',
    'notify',
    'transition',
    'complete',
];
const materials = {
    felt: {
        base: 196,
        ratios: [1, 2.76, 4.63, 7.17],
        levels: [0.067, 0.021, 0.008, 0.003],
        decays: [0.18, 0.11, 0.072, 0.043],
        attack: 0.003,
        contact: 1350,
        contactDecay: 0.034,
        contactLevel: 0.073,
        gain: 0.49,
    },
    porcelain: {
        base: 523.25113,
        ratios: [1, 2.41, 4.13, 5.87],
        levels: [0.047, 0.023, 0.009, 0.0035],
        decays: [0.34, 0.21, 0.12, 0.069],
        attack: 0.0015,
        contact: 4700,
        contactDecay: 0.017,
        contactLevel: 0.037,
        gain: 0.48,
    },
    elastic: {
        base: 196,
        ratios: [1, 2.07, 3.82, 5.13],
        levels: [0.068, 0.009, 0.004, 0.0018],
        decays: [0.25, 0.095, 0.052, 0.031],
        attack: 0.002,
        contact: 1050,
        contactDecay: 0.027,
        contactLevel: 0.035,
        gain: 0.46,
        fm: { ratio: 1.48, depth: 1.1, decay: 0.025 },
    },
};
function strike(family, options = {}) {
    const material = materials[family];
    const { note = 0, force = 1, damping = 1, offset = 0, contact = 1 } = options;
    const base = material.base * 2 ** (note / 12);
    const body = material.ratios.map((ratio, index) => ({
        kind: 'tone',
        waveform: 'sine',
        frequency: base * ratio,
        anchorFrequency: base,
        attack: material.attack * (1 + index * 0.12),
        decay: material.decays[index] * damping,
        peak: material.levels[index] * force,
        offset,
        ...(index === 0 && material.fm
            ? {
                fm: { ...material.fm, decay: material.fm.decay * damping },
                glideTo: base * 0.88,
                glideTime: 0.065 * damping,
            }
            : {}),
    }));
    body.push({
        kind: 'noise',
        filterType: 'bandpass',
        filterFrequency: material.contact,
        filterTo: material.contact * 0.72,
        filterQ: 0.75,
        attack: material.attack * 0.55,
        decay: material.contactDecay * damping,
        peak: material.contactLevel * force * contact,
        offset,
    });
    return body;
}
const roleInfo = {
    press: {
        name: 'Press',
        description: 'A single grounded contact.',
        use: 'Pressing a button or control.',
    },
    release: {
        name: 'Release',
        description: 'A lighter contact releases its weight.',
        use: 'Releasing a pressed control.',
    },
    toggle: {
        name: 'Toggle',
        description: 'Two close contacts settle into a new position.',
        use: 'Changing a setting or selection.',
    },
    confirm: {
        name: 'Confirm',
        description: 'A small contact opens into a fifth.',
        use: 'Confirming a deliberate action.',
    },
    error: {
        name: 'Error',
        description: 'Two damped contacts step gently downward.',
        use: 'A recoverable error that needs attention.',
    },
    notify: {
        name: 'Notify',
        description: 'One clear contact with a slightly longer ring.',
        use: 'A useful, nonurgent notification.',
    },
    transition: {
        name: 'Transition',
        description: 'A short brush resolves into contact.',
        use: 'A panel or object moving into place.',
    },
    complete: {
        name: 'Complete',
        description: 'An opening fifth settles onto its root.',
        use: 'Completion at the end of a longer flow.',
    },
};
function layersFor(family, role) {
    const material = materials[family];
    switch (role) {
        case 'press':
            return strike(family);
        case 'release':
            return strike(family, {
                note: 2,
                force: 0.61,
                damping: 0.68,
                contact: 0.8,
            });
        case 'toggle':
            return [
                ...strike(family, { force: 0.57, damping: 0.47 }),
                ...strike(family, {
                    note: 5,
                    force: 0.76,
                    damping: 0.67,
                    offset: 0.045,
                }),
            ];
        case 'confirm':
            return [
                ...strike(family, { force: 0.65, damping: 0.8 }),
                ...strike(family, { note: 7, force: 0.79, offset: 0.125 }),
            ];
        case 'error':
            return [
                ...strike(family, {
                    note: -2,
                    force: 0.67,
                    damping: 0.72,
                    contact: 0.7,
                }),
                ...strike(family, {
                    note: -5,
                    force: 0.59,
                    damping: 0.86,
                    offset: 0.155,
                    contact: 0.65,
                }),
            ];
        case 'notify':
            return strike(family, {
                note: 7,
                force: 0.77,
                damping: 1.22,
                contact: 0.62,
            });
        case 'transition':
            return [
                {
                    kind: 'noise',
                    filterType: 'bandpass',
                    filterFrequency: material.contact * 0.35,
                    filterTo: material.contact * 1.25,
                    filterQ: 0.6,
                    attack: 0.045,
                    decay: 0.16,
                    peak: material.contactLevel * 0.66,
                },
                ...strike(family, {
                    force: 0.63,
                    damping: 0.77,
                    offset: 0.19,
                    contact: 0.6,
                }),
            ];
        case 'complete':
            return [
                ...strike(family, { note: 7, force: 0.56, damping: 0.78 }),
                ...strike(family, {
                    force: 0.85,
                    damping: 1.18,
                    offset: 0.185,
                    contact: 0.75,
                }),
            ];
    }
}
export const MATERIAL_CUES = MATERIAL_FAMILIES.flatMap((family) => MATERIAL_ROLES.map((role) => ({
    id: `${family.id}-${role}`,
    name: `${family.name} ${roleInfo[role].name.toLowerCase()}`,
    category: 'Materials',
    description: `${family.description} ${roleInfo[role].description}`,
    use: roleInfo[role].use,
    source: 'Quiet',
    root: 0,
    family: family.id,
    role,
    recipe: {
        layers: layersFor(family.id, role),
        masterGain: materials[family.id].gain,
    },
})));
