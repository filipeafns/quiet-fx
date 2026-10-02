export function hash(s) {
    let n = 2166136261;
    for (let i = 0; i < s.length; i++)
        n = Math.imul(n ^ s.charCodeAt(i), 16777619);
    return n >>> 0;
}
export function durationOf(p) {
    return (Math.max(...p.layers.map((l) => (l.offset || 0) + l.attack + l.decay)) +
        (p.shimmer
            ? p.shimmer.delay *
                Math.max(2, Math.ceil(Math.log(0.00001) / Math.log(Math.max(0.00001, p.shimmer.feedback))) + 1)
            : 0) +
        0.015);
}
export function renderPatch(p, sampleRate = 48000) {
    const duration = durationOf(p), data = new Float32Array(Math.ceil(duration * sampleRate));
    let state = p.seed || 1;
    let toneEnergy = 0, noiseEnergy = 0;
    const random = () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return ((state >>> 0) / 4294967296) * 2 - 1;
    };
    p.layers.forEach((l) => {
        const start = Math.round((l.offset || 0) * sampleRate), total = Math.ceil((l.attack + l.decay) * sampleRate);
        let phase = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        let b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
        for (let i = 0; i < total; i++) {
            const t = i / sampleRate;
            const env = t < l.attack
                ? Math.pow(0.0001, 1 - t / l.attack)
                : Math.pow(0.0001, (t - l.attack) / Math.max(0.001, l.decay));
            let v = 0;
            if (l.kind === 'tone') {
                let hz = l.frequency || 440;
                if (l.glideTo)
                    hz *= Math.pow(l.glideTo / hz, Math.min(1, t / (l.glideTime || l.attack + l.decay)));
                phase += (hz * Math.pow(2, (l.detune || 0) / 1200)) / sampleRate;
                const s = Math.sin(phase * 2 * Math.PI);
                v =
                    l.waveform === 'triangle'
                        ? (2 / Math.PI) * Math.asin(s)
                        : l.waveform === 'square'
                            ? Math.tanh(s * 3)
                            : l.waveform === 'sawtooth'
                                ? 2 * (phase % 1) - 1
                                : s;
            }
            else {
                if (i % 64 === 0) {
                    const f = Math.min(sampleRate * 0.45, (l.filterFrequency || 1800) *
                        Math.pow((l.filterTo || l.filterFrequency || 1800) /
                            (l.filterFrequency || 1800), t / (l.attack + l.decay)));
                    const w = (2 * Math.PI * f) / sampleRate, c = Math.cos(w), alpha = Math.sin(w) / (2 * (l.filterQ || 0.707)), a0 = 1 + alpha;
                    if (l.filterType === 'bandpass') {
                        b0 = alpha / a0;
                        b1 = 0;
                        b2 = -alpha / a0;
                    }
                    else if (l.filterType === 'highpass') {
                        b0 = (1 + c) / 2 / a0;
                        b1 = -(1 + c) / a0;
                        b2 = b0;
                    }
                    else {
                        b0 = (1 - c) / 2 / a0;
                        b1 = (1 - c) / a0;
                        b2 = b0;
                    }
                    a1 = (-2 * c) / a0;
                    a2 = (1 - alpha) / a0;
                }
                const x = random();
                v = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
                x2 = x1;
                x1 = x;
                y2 = y1;
                y1 = v;
            }
            const contribution = v * env * l.peak * p.masterGain;
            if (l.kind === 'tone')
                toneEnergy += contribution * contribution;
            else
                noiseEnergy += contribution * contribution;
            if (start + i < data.length)
                data[start + i] += contribution;
        }
    });
    if (p.shimmer) {
        const d = Math.max(1, Math.round(p.shimmer.delay * sampleRate)), delay = new Float32Array(data.length), a = 1 - Math.exp((-2 * Math.PI * p.shimmer.lowpass) / sampleRate);
        let low = 0;
        for (let i = d; i < data.length; i++) {
            low += a * (data[i - d] + delay[i - d] * p.shimmer.feedback - low);
            delay[i] = low;
        }
        for (let i = 0; i < data.length; i++)
            data[i] += delay[i] * p.shimmer.wet;
    }
    let peak = 0, sum = 0;
    for (let i = 0; i < data.length; i++) {
        data[i] =
            Math.max(-0.95, Math.min(0.95, data[i])) *
                Math.min(1, (data.length - 1 - i) / 64);
        peak = Math.max(peak, Math.abs(data[i]));
        sum += data[i] * data[i];
    }
    return {
        data,
        sampleRate,
        duration: data.length / sampleRate,
        peak,
        rms: Math.sqrt(sum / data.length),
        toneShare: toneEnergy / Math.max(1e-15, toneEnergy + noiseEnergy),
    };
}
export function waveform(data, count = 100) {
    const bins = Array.from({ length: count }, (_, i) => {
        let max = 0;
        for (let j = Math.floor((i * data.length) / count); j < Math.floor(((i + 1) * data.length) / count); j++)
            max = Math.max(max, Math.abs(data[j]));
        return max;
    });
    const max = Math.max(...bins, 0.00001);
    return bins.map((v) => v / max);
}
export function wavBytes(r) {
    const out = new ArrayBuffer(44 + r.data.length * 2), v = new DataView(out);
    const str = (p, s) => {
        for (let i = 0; i < s.length; i++)
            v.setUint8(p + i, s.charCodeAt(i));
    };
    str(0, 'RIFF');
    v.setUint32(4, 36 + r.data.length * 2, true);
    str(8, 'WAVE');
    str(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, r.sampleRate, true);
    v.setUint32(28, r.sampleRate * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    str(36, 'data');
    v.setUint32(40, r.data.length * 2, true);
    for (let i = 0; i < r.data.length; i++)
        v.setInt16(44 + i * 2, Math.round(r.data[i] * 32767), true);
    return new Uint8Array(out);
}
export function validatePatch(v) {
    if (!v || typeof v !== 'object')
        return false;
    const p = v;
    const finite = (x, min, max) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
    return (typeof p.id === 'string' &&
        /^[a-z0-9_-]{1,60}$/.test(p.id) &&
        typeof p.name === 'string' &&
        p.name.length <= 80 &&
        finite(p.seed, 0, 4294967295) &&
        finite(p.masterGain, 0, 1) &&
        Array.isArray(p.layers) &&
        p.layers.length > 0 &&
        p.layers.length <= 64 &&
        p.layers.every((l) => !!l &&
            typeof l === 'object' &&
            (l.kind === 'tone' || l.kind === 'noise') &&
            finite(l.attack, 0.0001, 2) &&
            finite(l.decay, 0.001, 3) &&
            finite(l.peak, 0, 0.5) &&
            (l.offset === undefined || finite(l.offset, 0, 5)) &&
            (l.detune === undefined || finite(l.detune, -1200, 1200)) &&
            (l.glideTime === undefined || finite(l.glideTime, 0.001, 5)) &&
            (l.filterQ === undefined || finite(l.filterQ, 0.1, 8)) &&
            (l.kind === 'tone'
                ? finite(l.frequency, 20, 18000) &&
                    ['sine', 'triangle', 'square', 'sawtooth'].includes(l.waveform || 'sine')
                : finite(l.filterFrequency, 20, 18000) &&
                    ['lowpass', 'bandpass', 'highpass'].includes(l.filterType || 'lowpass')) &&
            (l.glideTo === undefined || finite(l.glideTo, 20, 18000)) &&
            (l.filterTo === undefined || finite(l.filterTo, 20, 18000))) &&
        (!p.shimmer ||
            (finite(p.shimmer.delay, 0.01, 0.4) &&
                finite(p.shimmer.feedback, 0, 0.65) &&
                finite(p.shimmer.wet, 0, 0.5) &&
                finite(p.shimmer.lowpass, 100, 12000))));
}
export class SoundPlayer {
    context = null;
    analyser = null;
    master = null;
    active = new Set();
    volume = 0.35;
    muted = true;
    generation = 0;
    stopListeners = new Set();
    unlock() {
        if (!this.context || this.context.state === 'closed') {
            this.context = new AudioContext({ latencyHint: 'interactive' });
            this.master = this.context.createGain();
            this.analyser = this.context.createAnalyser();
            this.analyser.fftSize = 1024;
            this.master.connect(this.analyser);
            this.analyser.connect(this.context.destination);
        }
        this.muted = false;
        this.setVolume(this.volume);
        if (this.context.state !== 'running')
            void this.context.resume().catch(() => { });
        return this.context.state === 'running';
    }
    async enable() {
        const generation = this.generation;
        if (!this.context || this.context.state === 'closed') {
            this.context = new AudioContext({ latencyHint: 'interactive' });
            this.master = this.context.createGain();
            this.analyser = this.context.createAnalyser();
            this.analyser.fftSize = 1024;
            this.master.connect(this.analyser);
            this.analyser.connect(this.context.destination);
        }
        await this.context.resume();
        if (generation !== this.generation)
            return false;
        this.muted = false;
        this.setVolume(this.volume);
        return true;
    }
    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        if (this.context && this.master)
            this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, 0.008);
    }
    mute() {
        this.muted = true;
        this.stop();
        this.setVolume(this.volume);
    }
    stop() {
        this.generation++;
        for (const listener of this.stopListeners)
            listener();
        const ctx = this.context;
        if (!ctx)
            return;
        for (const s of this.active) {
            s.gain.gain.cancelScheduledValues(ctx.currentTime);
            s.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.003);
            try {
                s.node.stop(ctx.currentTime + 0.02);
            }
            catch { }
        }
        this.active.clear();
    }
    play(r, delay = 0, interrupt = true, voiceGain = 1) {
        if (!this.context ||
            !this.master ||
            this.muted ||
            this.context.state !== 'running')
            return null;
        if (interrupt)
            this.stop();
        const ctx = this.context, b = ctx.createBuffer(1, r.data.length, r.sampleRate);
        b.copyToChannel(new Float32Array(r.data), 0);
        const node = ctx.createBufferSource(), gain = ctx.createGain();
        gain.gain.value = Number.isFinite(voiceGain)
            ? Math.max(0, Math.min(1, voiceGain))
            : 1;
        node.buffer = b;
        node.connect(gain);
        gain.connect(this.master);
        const entry = { node, gain };
        this.active.add(entry);
        node.onended = () => {
            node.disconnect();
            gain.disconnect();
            this.active.delete(entry);
        };
        const at = ctx.currentTime + 0.012 + delay;
        node.start(at);
        return at;
    }
}
