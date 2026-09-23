import { useEffect, useRef, useState } from "react";

type Options = {
  enabled: boolean;
  volume: number;
  scene: "lounge" | "table" | "shop";
};
export type MusicStatus =
  "idle" | "playing" | "muted" | "paused" | "unavailable";

// Original 16-bar lounge arrangement. No external audio services or downloads.
const chords = [
  [48, 55, 59, 62, 64],
  [45, 52, 55, 59, 60],
  [50, 57, 60, 64, 65],
  [43, 53, 57, 59, 64],
  [52, 59, 62, 66, 67],
  [45, 55, 61, 64, 67],
  [50, 57, 60, 64, 65],
  [43, 53, 57, 59, 64],
  [48, 55, 59, 62, 64],
  [48, 55, 58, 62, 64],
  [41, 53, 57, 60, 64],
  [46, 56, 60, 62, 65],
  [52, 55, 59, 62, 67],
  [45, 55, 61, 64, 67],
  [50, 57, 60, 64, 65],
  [43, 53, 57, 59, 64],
];
const melody = [
  [76, -1, 74, 71, 67, -1, 69, 71],
  [72, -1, 71, 67, 64, -1, 67, -1],
  [69, -1, 72, 76, 77, -1, 76, 72],
  [71, -1, 69, 67, 64, -1, 62, -1],
  [71, -1, 74, 78, 79, -1, 78, 74],
  [73, -1, 76, 79, 76, -1, 73, -1],
  [77, -1, 76, 72, 69, -1, 72, 74],
  [71, -1, 69, 67, 65, -1, 62, -1],
  [76, -1, 79, 83, 81, -1, 79, 76],
  [74, -1, 76, 70, 67, -1, 64, -1],
  [69, -1, 72, 76, 79, -1, 76, 72],
  [74, -1, 72, 68, 65, -1, 62, -1],
  [67, -1, 71, 74, 76, -1, 74, 71],
  [73, -1, 76, 79, 76, -1, 73, -1],
  [77, -1, 76, 72, 69, -1, 65, 62],
  [67, -1, 69, 71, 74, -1, 71, -1],
];
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class LoungeMusic {
  context: AudioContext;
  output: GainNode;
  private bus: GainNode;
  private noise: AudioBuffer;
  private timer: ReturnType<typeof setInterval> | undefined;
  private step = 0;
  private nextTime = 0;
  private options: Options;
  private disposed = false;
  constructor(context: AudioContext, options: Options) {
    this.context = context;
    this.options = options;
    this.bus = context.createGain();
    this.output = context.createGain();
    this.output.gain.value = 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.ratio.value = 3;
    this.bus
      .connect(compressor)
      .connect(this.output)
      .connect(context.destination);
    // Quiet room reflections soften the generated piano and vibraphone.
    const delay = context.createDelay(1);
    delay.delayTime.value = 0.19;
    const wet = context.createGain();
    wet.gain.value = 0.14;
    const lowpass = context.createBiquadFilter();
    lowpass.frequency.value = 2200;
    this.bus.connect(delay).connect(lowpass).connect(wet).connect(compressor);
    this.noise = context.createBuffer(
      1,
      Math.floor(context.sampleRate * 0.14),
      context.sampleRate,
    );
    let seed = 73;
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      data[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
    }
  }
  configure(options: Options) {
    this.options = options;
    const now = this.context.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setTargetAtTime(
      options.enabled ? (options.volume / 100) * 0.72 : 0,
      now,
      0.08,
    );
  }
  async start() {
    if (this.disposed) return;
    await this.context.resume();
    if (this.disposed) return;
    this.configure(this.options);
    if (!this.timer) {
      this.nextTime = this.context.currentTime + 0.04;
      this.tick();
      this.timer = setInterval(() => this.tick(), 40);
    }
  }
  private note(
    midi: number,
    time: number,
    duration: number,
    gain: number,
    type: "piano" | "bass" | "vibe",
  ) {
    const harmonics =
      type === "bass"
        ? [
            [1, 1],
            [2, 0.25],
          ]
        : type === "vibe"
          ? [
              [1, 1],
              [3, 0.06],
            ]
          : [
              [1, 1],
              [2, 0.35],
              [3, 0.12],
              [4, 0.05],
            ];
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(gain, time + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    envelope.connect(this.bus);
    let remaining = harmonics.length;
    for (const [multiple, amplitude] of harmonics) {
      const osc = this.context.createOscillator();
      const partial = this.context.createGain();
      osc.frequency.value = hz(midi) * multiple;
      partial.gain.value = amplitude;
      osc.connect(partial).connect(envelope);
      osc.start(time);
      osc.stop(time + duration + 0.02);
      osc.onended = () => {
        osc.disconnect();
        partial.disconnect();
        if (--remaining === 0) envelope.disconnect();
      };
    }
  }
  private brush(time: number, accent: boolean) {
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    const filter = this.context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = accent ? 1900 : 4700;
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(accent ? 0.06 : 0.022, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    source.connect(filter).connect(envelope).connect(this.bus);
    source.start(time);
    source.stop(time + 0.14);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
  }
  private tick() {
    if (
      this.context.state !== "running" ||
      !this.options.enabled ||
      this.options.volume === 0
    ) {
      this.nextTime = this.context.currentTime + 0.04;
      return;
    }
    if (this.nextTime < this.context.currentTime)
      this.nextTime = this.context.currentTime + 0.04;
    const beat =
      60 /
      (this.options.scene === "table"
        ? 100
        : this.options.scene === "shop"
          ? 86
          : 90);
    while (this.nextTime < this.context.currentTime + 0.16) {
      const bar = Math.floor(this.step / 8) % chords.length;
      const eighth = this.step % 8;
      const chord = chords[bar];
      const time = this.nextTime;
      if (eighth % 2 === 0) {
        const bass = [
          chord[0] - 12,
          chord[0] - 5,
          chord[0],
          chords[(bar + 1) % chords.length][0] - 13,
        ][eighth / 2];
        this.note(bass, time, beat * 0.83, 0.23, "bass");
      }
      if ([0, 3, 6].includes(eighth)) {
        chord
          .slice(1)
          .forEach((n, i) =>
            this.note(n, time + i * 0.012, beat * 1.8, 0.036, "piano"),
          );
      }
      const lead = melody[bar][eighth];
      if (lead >= 0)
        this.note(
          lead,
          time,
          beat * 1.35,
          this.options.scene === "table" ? 0.055 : 0.075,
          "vibe",
        );
      this.brush(time, eighth === 2 || eighth === 6);
      this.nextTime += beat * (eighth % 2 === 0 ? 0.59 : 0.41);
      this.step = (this.step + 1) % (chords.length * 8);
    }
  }
  dispose() {
    this.disposed = true;
    clearInterval(this.timer);
    this.output.disconnect();
    void this.context.close();
  }
}

export function useSoundtrack(options: Options) {
  const player = useRef<LoungeMusic | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const [status, setStatus] = useState<MusicStatus>("idle");
  const unlock = () => {
    try {
      if (!player.current) {
        const Constructor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        player.current = new LoungeMusic(new Constructor(), latest.current);
        player.current.context.onstatechange = () => {
          if (!latest.current.enabled || latest.current.volume === 0)
            setStatus("muted");
          else
            setStatus(
              player.current?.context.state === "running"
                ? "playing"
                : "paused",
            );
        };
      }
      void player.current
        .start()
        .then(() =>
          setStatus(
            latest.current.enabled && latest.current.volume > 0
              ? "playing"
              : "muted",
          ),
        )
        .catch(() => setStatus("unavailable"));
    } catch {
      setStatus("unavailable");
    }
  };
  useEffect(() => {
    const gesture = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".music-toggle")
      )
        return;
      if (!document.hidden) unlock();
    };
    const visibility = () => {
      if (document.hidden) void player.current?.context.suspend();
      else if (player.current) unlock();
    };
    window.addEventListener("pointerdown", gesture);
    window.addEventListener("keydown", gesture);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pointerdown", gesture);
      window.removeEventListener("keydown", gesture);
      document.removeEventListener("visibilitychange", visibility);
      if (player.current) player.current.context.onstatechange = null;
      player.current?.dispose();
    };
  }, []);
  useEffect(() => {
    player.current?.configure(options);
    if (player.current)
      setStatus(
        options.enabled && options.volume > 0
          ? player.current.context.state === "running"
            ? "playing"
            : "paused"
          : "muted",
      );
  }, [options.enabled, options.volume, options.scene]);
  return { status, unlock };
}
