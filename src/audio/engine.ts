/**
 * All sound in The Threshold is generated in the browser.
 *
 * There are no audio files in this repository: ambience, footsteps, fire, dice,
 * spells and Corvin's lute motif are synthesised with the Web Audio API at
 * runtime.  That keeps the bundle tiny, sidesteps licensing entirely, and lets
 * the score react continuously to the fog, the medallion and the fight.
 *
 * Nothing starts until `unlock()` is called from a real user gesture.
 */

import { CORVIN_MOTIF, MOTIF_VARIANTS, type MotifNote } from './motif';

export type AmbienceId = 'none' | 'inn-outside' | 'inn-inside' | 'road' | 'shrine' | 'gate' | 'title';
export type MusicCue = 'none' | 'title' | 'inn-lute' | 'tension' | 'combat' | 'reveal' | 'credits';

export type SfxId =
  | 'ui-hover'
  | 'ui-select'
  | 'ui-back'
  | 'door'
  | 'footstep-wood'
  | 'footstep-mud'
  | 'footstep-stone'
  | 'dice-throw'
  | 'dice-impact'
  | 'dice-settle'
  | 'crit'
  | 'fumble'
  | 'medallion-pulse'
  | 'medallion-freeze'
  | 'lute-strum'
  | 'lute-broken'
  | 'whisper'
  | 'wolf-howl'
  | 'wolf-close'
  | 'spell-frost'
  | 'spell-psychic'
  | 'spell-command'
  | 'spell-heal'
  | 'spell-thaumaturgy'
  | 'inspire'
  | 'hit'
  | 'hit-heavy'
  | 'down'
  | 'shutter'
  | 'thunder'
  | 'chest-open'
  | 'lockpick';

/** Sounds worth subtitling for players who cannot hear them. */
const SFX_SUBTITLES: Partial<Record<SfxId, string>> = {
  'wolf-howl': '(a wolf, far off)',
  'wolf-close': '(an answer, much closer)',
  'medallion-pulse': '(the medallion pulses, cold)',
  'medallion-freeze': '(frost cracks across the glass)',
  whisper: '(whispering, just under hearing)',
  door: '(a door, badly hung)',
  shutter: '(a shutter opens by itself)',
  thunder: '(thunder, somewhere behind the trees)',
  'lute-broken': '(a lute string, broken)',
  crit: '(the die stops on twenty)',
  fumble: '(the die stops on one)',
  'chest-open': '(a lid gives way)',
  lockpick: '(tumblers, one after another)',
};

interface Layer {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
}

type SubtitleHandler = (text: string) => void;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private pluckCache = new Map<number, AudioBuffer>();
  private ambience: { id: AmbienceId; layer: Layer } | null = null;
  private music: { cue: MusicCue; timer: number | null; layer: Layer } | null = null;
  private subtitleHandler: SubtitleHandler | null = null;
  private volumes = { master: 0.8, music: 0.6, sfx: 0.85, muted: false };
  private suspended = false;

  get ready(): boolean {
    return this.ctx !== null;
  }

  /** Must be called from a click/keypress. Safe to call repeatedly. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.volumes.muted ? 0 : this.volumes.master;
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.volumes.music;
    this.musicBus.connect(this.master);

    this.ambienceBus = ctx.createGain();
    this.ambienceBus.gain.value = this.volumes.sfx * 0.8;
    this.ambienceBus.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.volumes.sfx;
    this.sfxBus.connect(this.master);

    this.noiseBuffer = this.makeNoiseBuffer(4);
  }

  onSubtitle(handler: SubtitleHandler | null): void {
    this.subtitleHandler = handler;
  }

  setVolumes(next: Partial<typeof this.volumes>): void {
    Object.assign(this.volumes, next);
    if (!this.ctx || !this.master || !this.musicBus || !this.sfxBus || !this.ambienceBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.muted ? 0 : this.volumes.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
    this.ambienceBus.gain.setTargetAtTime(this.volumes.sfx * 0.8, t, 0.05);
  }

  /** Pause everything while the tab is hidden — CPU and courtesy. */
  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    if (!this.ctx) return;
    if (suspended && this.ctx.state === 'running') void this.ctx.suspend();
    if (!suspended && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  dispose(): void {
    this.stopAmbience();
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }

  /* ------------------------------------------------------------- primitives */

  private makeNoiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Slight brown tint: gentler than white noise, reads as weather not static.
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }

  private noiseSource(loop = true): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = loop;
    return src;
  }

  /**
   * Karplus–Strong plucked string, rendered once per pitch and cached.
   * This is Corvin's lute.
   */
  private pluckBuffer(frequency: number, damping = 0.996, seconds = 2.2): AudioBuffer {
    const key = Math.round(frequency * 10) + damping * 1e6;
    const cached = this.pluckCache.get(key);
    if (cached) return cached;

    const ctx = this.ctx!;
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    const delay = Math.max(2, Math.floor(rate / frequency));
    const line = new Float32Array(delay);
    for (let i = 0; i < delay; i++) line[i] = Math.random() * 2 - 1;

    let index = 0;
    for (let i = 0; i < length; i++) {
      const current = line[index];
      const next = line[(index + 1) % delay];
      const value = (current + next) * 0.5 * damping;
      line[index] = value;
      index = (index + 1) % delay;
      data[i] = current * Math.exp(-i / (rate * seconds * 0.55));
    }
    this.pluckCache.set(key, buffer);
    return buffer;
  }

  private env(
    node: AudioNode,
    bus: GainNode,
    { attack = 0.005, decay = 0.25, peak = 1, when = 0 }: { attack?: number; decay?: number; peak?: number; when?: number },
  ): GainNode {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    const t = ctx.currentTime + when;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    node.connect(gain);
    gain.connect(bus);
    return gain;
  }

  private tone(
    frequency: number,
    type: OscillatorType,
    options: { attack?: number; decay?: number; peak?: number; when?: number; detune?: number; slideTo?: number; bus?: GainNode },
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    const t = ctx.currentTime + (options.when ?? 0);
    osc.frequency.setValueAtTime(frequency, t);
    if (options.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.slideTo), t + (options.decay ?? 0.3));
    if (options.detune) osc.detune.value = options.detune;
    this.env(osc, options.bus ?? this.sfxBus!, options);
    osc.start(t);
    osc.stop(t + (options.attack ?? 0.005) + (options.decay ?? 0.3) + 0.05);
  }

  private noiseBurst(options: {
    when?: number;
    decay?: number;
    peak?: number;
    filter?: BiquadFilterType;
    frequency?: number;
    q?: number;
    sweepTo?: number;
    bus?: GainNode;
  }): void {
    const ctx = this.ctx!;
    const src = this.noiseSource(false);
    const filter = ctx.createBiquadFilter();
    filter.type = options.filter ?? 'bandpass';
    const t = ctx.currentTime + (options.when ?? 0);
    filter.frequency.setValueAtTime(options.frequency ?? 900, t);
    if (options.sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(40, options.sweepTo), t + (options.decay ?? 0.3));
    filter.Q.value = options.q ?? 1;
    src.connect(filter);
    this.env(filter, options.bus ?? this.sfxBus!, { attack: 0.004, decay: options.decay ?? 0.25, peak: options.peak ?? 0.6, when: options.when });
    src.start(t);
    src.stop(t + (options.decay ?? 0.3) + 0.1);
  }

  private pluck(frequency: number, options: { when?: number; peak?: number; bus?: GainNode; damping?: number; detune?: number } = {}): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.pluckBuffer(frequency, options.damping ?? 0.996);
    if (options.detune) src.detune.value = options.detune;
    const gain = ctx.createGain();
    gain.gain.value = options.peak ?? 0.5;
    const body = ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.value = 2600;
    src.connect(body);
    body.connect(gain);
    gain.connect(options.bus ?? this.musicBus!);
    const t = ctx.currentTime + (options.when ?? 0);
    src.start(t);
    src.stop(t + 2.4);
  }

  /* ----------------------------------------------------------------- sfx */

  play(id: SfxId, options: { gain?: number; when?: number } = {}): void {
    const subtitle = SFX_SUBTITLES[id];
    if (subtitle) this.subtitleHandler?.(subtitle);
    if (!this.ctx || this.suspended) return;
    const g = options.gain ?? 1;
    const when = options.when ?? 0;

    switch (id) {
      case 'ui-hover':
        this.tone(1180, 'sine', { decay: 0.05, peak: 0.05 * g, when });
        break;
      case 'ui-select':
        this.tone(660, 'triangle', { decay: 0.12, peak: 0.14 * g, when });
        this.tone(990, 'sine', { decay: 0.18, peak: 0.06 * g, when: when + 0.02 });
        break;
      case 'ui-back':
        this.tone(420, 'triangle', { decay: 0.14, peak: 0.12 * g, when, slideTo: 300 });
        break;
      case 'door':
        this.noiseBurst({ frequency: 320, decay: 0.9, peak: 0.35 * g, q: 3, sweepTo: 120, when });
        this.tone(90, 'sine', { decay: 0.6, peak: 0.16 * g, when });
        break;
      case 'shutter':
        this.noiseBurst({ frequency: 900, decay: 0.35, peak: 0.3 * g, q: 2, sweepTo: 300, when });
        this.noiseBurst({ frequency: 1600, decay: 0.12, peak: 0.25 * g, when: when + 0.28 });
        break;
      case 'footstep-wood':
        this.noiseBurst({ frequency: 260, decay: 0.09, peak: 0.28 * g, q: 1.6, when });
        this.tone(120, 'sine', { decay: 0.07, peak: 0.1 * g, when });
        break;
      case 'footstep-mud':
        this.noiseBurst({ frequency: 520, decay: 0.14, peak: 0.24 * g, q: 0.7, sweepTo: 180, when });
        break;
      case 'footstep-stone':
        this.noiseBurst({ frequency: 1500, decay: 0.06, peak: 0.2 * g, q: 2.5, when });
        break;
      case 'dice-throw':
        this.noiseBurst({ frequency: 2200, decay: 0.16, peak: 0.2 * g, q: 0.8, sweepTo: 700, when });
        break;
      case 'dice-impact':
        this.noiseBurst({ frequency: 1500 + Math.random() * 900, decay: 0.07, peak: 0.5 * g, q: 3, when });
        this.tone(180 + Math.random() * 80, 'triangle', { decay: 0.06, peak: 0.14 * g, when });
        break;
      case 'dice-settle':
        this.noiseBurst({ frequency: 700, decay: 0.2, peak: 0.14 * g, q: 1.2, sweepTo: 260, when });
        break;
      case 'crit':
        [660, 880, 1320].forEach((f, i) => this.tone(f, 'sine', { decay: 0.9, peak: 0.14 * g, when: when + i * 0.06 }));
        break;
      case 'fumble':
        this.tone(150, 'sawtooth', { decay: 0.7, peak: 0.12 * g, when, slideTo: 60 });
        break;
      case 'medallion-pulse':
        this.tone(72, 'sine', { decay: 1.6, peak: 0.24 * g, when });
        this.tone(1210, 'sine', { decay: 1.1, peak: 0.05 * g, when: when + 0.05 });
        break;
      case 'medallion-freeze':
        this.noiseBurst({ frequency: 5200, decay: 0.9, peak: 0.28 * g, q: 0.6, sweepTo: 900, when, filter: 'highpass' });
        this.tone(58, 'sine', { decay: 2.2, peak: 0.26 * g, when });
        break;
      case 'lute-strum':
        CORVIN_MOTIF.slice(0, 4).forEach((note, i) => this.pluck(note.frequency, { when: when + i * 0.09, peak: 0.3 * g, bus: this.sfxBus! }));
        break;
      case 'lute-broken':
        this.pluck(146.8, { peak: 0.4 * g, bus: this.sfxBus!, damping: 0.93 });
        this.noiseBurst({ frequency: 2400, decay: 0.3, peak: 0.2 * g, q: 4, when: when + 0.05 });
        break;
      case 'whisper':
        for (let i = 0; i < 5; i++) {
          this.noiseBurst({
            frequency: 700 + Math.random() * 2200,
            decay: 0.28 + Math.random() * 0.3,
            peak: 0.08 * g,
            q: 8,
            when: when + i * 0.11,
          });
        }
        break;
      case 'wolf-howl':
        this.tone(310, 'sawtooth', { decay: 1.5, peak: 0.1 * g, when, slideTo: 250 });
        this.tone(465, 'sine', { decay: 1.6, peak: 0.05 * g, when: when + 0.1, slideTo: 372 });
        break;
      case 'wolf-close':
        this.tone(220, 'sawtooth', { decay: 0.9, peak: 0.18 * g, when, slideTo: 160 });
        this.noiseBurst({ frequency: 600, decay: 0.5, peak: 0.16 * g, q: 1.2, when: when + 0.05 });
        break;
      case 'spell-frost':
        this.noiseBurst({ frequency: 6200, decay: 0.7, peak: 0.24 * g, q: 0.7, sweepTo: 1400, when, filter: 'highpass' });
        this.tone(320, 'sine', { decay: 0.8, peak: 0.1 * g, when, slideTo: 110 });
        break;
      case 'spell-psychic':
        this.tone(196, 'sawtooth', { decay: 1.1, peak: 0.14 * g, when, slideTo: 92, detune: -18 });
        this.tone(293.7, 'square', { decay: 0.9, peak: 0.06 * g, when: when + 0.04, slideTo: 140, detune: 24 });
        this.play('whisper', { gain: 0.7 * g, when });
        break;
      case 'spell-command':
        this.tone(110, 'square', { decay: 0.5, peak: 0.16 * g, when });
        this.tone(220, 'sine', { decay: 0.7, peak: 0.1 * g, when: when + 0.03 });
        break;
      case 'spell-heal':
        [523.3, 659.3, 784].forEach((f, i) => this.pluck(f, { when: when + i * 0.05, peak: 0.26 * g, bus: this.sfxBus! }));
        break;
      case 'spell-thaumaturgy':
        this.tone(88, 'sine', { decay: 1.4, peak: 0.24 * g, when });
        this.noiseBurst({ frequency: 420, decay: 1.1, peak: 0.18 * g, q: 0.5, sweepTo: 160, when });
        break;
      case 'inspire':
        [392, 523.3, 587.3, 784].forEach((f, i) => this.pluck(f, { when: when + i * 0.07, peak: 0.28 * g, bus: this.sfxBus! }));
        break;
      case 'hit':
        this.noiseBurst({ frequency: 420, decay: 0.16, peak: 0.4 * g, q: 1.1, when });
        this.tone(110, 'triangle', { decay: 0.14, peak: 0.2 * g, when });
        break;
      case 'hit-heavy':
        this.noiseBurst({ frequency: 260, decay: 0.34, peak: 0.5 * g, q: 0.8, sweepTo: 90, when });
        this.tone(70, 'sine', { decay: 0.4, peak: 0.3 * g, when });
        break;
      case 'down':
        this.tone(140, 'sine', { decay: 1.2, peak: 0.22 * g, when, slideTo: 48 });
        this.noiseBurst({ frequency: 300, decay: 0.6, peak: 0.24 * g, q: 0.6, when: when + 0.05 });
        break;
      case 'thunder':
        this.noiseBurst({ frequency: 180, decay: 2.4, peak: 0.42 * g, q: 0.4, sweepTo: 55, when, filter: 'lowpass' });
        break;
      case 'chest-open':
        this.noiseBurst({ frequency: 700, decay: 0.5, peak: 0.3 * g, q: 2, sweepTo: 240, when });
        this.tone(150, 'triangle', { decay: 0.3, peak: 0.14 * g, when: when + 0.1 });
        break;
      case 'lockpick':
        for (let i = 0; i < 3; i++) {
          this.noiseBurst({ frequency: 3200, decay: 0.05, peak: 0.22 * g, q: 6, when: when + i * 0.16 });
        }
        break;
    }
  }

  /* ------------------------------------------------------------ ambience */

  setAmbience(id: AmbienceId): void {
    if (!this.ctx || this.ambience?.id === id) return;
    this.stopAmbience();
    if (id === 'none') return;

    const ctx = this.ctx;
    const layer: Layer = { gain: ctx.createGain(), sources: [] };
    layer.gain.gain.value = 0.0001;
    layer.gain.connect(this.ambienceBus!);

    const bed = (frequency: number, q: number, gain: number, type: BiquadFilterType = 'bandpass'): void => {
      const src = this.noiseSource();
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = frequency;
      filter.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(filter);
      filter.connect(g);
      g.connect(layer.gain);
      src.start();
      layer.sources.push(src);

      // Slow breathing so the bed never sits perfectly still.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = gain * 0.5;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      lfo.start();
      layer.sources.push(lfo);
    };

    switch (id) {
      case 'title':
        bed(220, 0.6, 0.05, 'lowpass');
        break;
      case 'inn-outside':
        bed(900, 0.4, 0.16, 'highpass'); // rain
        bed(160, 0.7, 0.1, 'lowpass'); // wind under the eaves
        break;
      case 'inn-inside':
        bed(300, 0.9, 0.07, 'lowpass'); // room tone
        bed(1400, 6, 0.02); // muffled conversation
        break;
      case 'road':
        bed(140, 0.6, 0.11, 'lowpass');
        bed(2600, 0.5, 0.03, 'highpass');
        break;
      case 'shrine':
        bed(110, 0.5, 0.13, 'lowpass');
        bed(520, 9, 0.02);
        break;
      case 'gate':
        bed(70, 0.4, 0.18, 'lowpass');
        break;
      default:
        break;
    }

    layer.gain.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
    this.ambience = { id, layer };
  }

  private stopAmbience(): void {
    if (!this.ambience || !this.ctx) return;
    const { layer } = this.ambience;
    layer.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
    const sources = layer.sources;
    window.setTimeout(() => {
      sources.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      });
      layer.gain.disconnect();
    }, 1400);
    this.ambience = null;
  }

  /* --------------------------------------------------------------- music */

  setMusic(cue: MusicCue): void {
    if (!this.ctx || this.music?.cue === cue) return;
    this.stopMusic();
    if (cue === 'none') return;

    const ctx = this.ctx;
    const layer: Layer = { gain: ctx.createGain(), sources: [] };
    layer.gain.gain.value = 0.0001;
    layer.gain.connect(this.musicBus!);
    layer.gain.gain.setTargetAtTime(1, ctx.currentTime, 0.8);

    const variant = MOTIF_VARIANTS[cue] ?? MOTIF_VARIANTS.title;
    let step = 0;

    const tick = (): void => {
      if (!this.ctx) return;
      if (this.suspended) {
        // Hidden tab: hold the phrase and check back, instead of letting the
        // note loop die and the music never return.
        this.music = { cue, timer: window.setTimeout(tick, 600), layer };
        return;
      }
      const notes: MotifNote[] = variant.notes;
      const note = notes[step % notes.length];
      const detune = variant.detune ? (Math.random() - 0.5) * variant.detune : 0;
      this.pluck(note.frequency * variant.transpose, {
        peak: note.velocity * variant.gain,
        bus: layer.gain,
        damping: variant.damping,
        detune,
      });
      if (variant.drone && step % 8 === 0) {
        this.tone(note.frequency * variant.transpose * 0.5, 'sine', {
          decay: 3.4,
          peak: 0.05 * variant.gain,
          bus: layer.gain,
        });
      }
      step++;
      const interval = note.duration * variant.tempo * 1000;
      this.music = { cue, timer: window.setTimeout(tick, interval), layer };
    };

    this.music = { cue, timer: null, layer };
    tick();
  }

  private stopMusic(): void {
    if (!this.music || !this.ctx) return;
    if (this.music.timer !== null) window.clearTimeout(this.music.timer);
    const { layer } = this.music;
    layer.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.5);
    window.setTimeout(() => layer.gain.disconnect(), 1600);
    this.music = null;
  }

  /** One-shot performance of the full motif — used when Corvin actually plays. */
  performMotif(variantKey: keyof typeof MOTIF_VARIANTS = 'inn-lute'): void {
    if (!this.ctx) return;
    const variant = MOTIF_VARIANTS[variantKey];
    let when = 0;
    for (const note of variant.notes) {
      this.pluck(note.frequency * variant.transpose, {
        when,
        peak: note.velocity * variant.gain * 1.3,
        bus: this.sfxBus!,
        damping: variant.damping,
      });
      when += note.duration * variant.tempo;
    }
  }
}

export const audio = new AudioEngine();
