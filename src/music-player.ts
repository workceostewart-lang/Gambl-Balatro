import { tracks, trackUrl } from "./data/tracks";

export type MusicState = Readonly<{
  isOn: boolean;
  currentTrackId: string | null;
  error: string | null;
}>;

/** Shuffle bag: every ID plays once per cycle, including across cycle boundaries. */
export class ShuffleQueue {
  private remaining: string[] = [];
  constructor(
    private ids: readonly string[],
    private random = Math.random,
  ) {}
  private shuffle(values: string[]) {
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }
  next(lastId: string | null): string {
    if (!this.ids.length) throw new Error("No music tracks configured");
    if (!this.remaining.length) {
      this.remaining = this.shuffle([...this.ids]);
      if (this.remaining[0] === lastId && this.remaining.length > 1) {
        const swap =
          1 + Math.floor(this.random() * (this.remaining.length - 1));
        [this.remaining[0], this.remaining[swap]] = [
          this.remaining[swap],
          this.remaining[0],
        ];
      }
    }
    return this.remaining.shift()!;
  }
  select(id: string) {
    if (!this.ids.includes(id)) throw new Error("Unknown music track");
    // An explicit selection starts a cycle anchored by the chosen track.
    this.remaining = this.shuffle(
      this.ids.filter((candidate) => candidate !== id),
    );
  }
}

export class MusicPlayer {
  readonly audio: HTMLAudioElement;
  private queue = new ShuffleQueue(tracks.map((track) => track.id));
  private state: MusicState = {
    isOn: false,
    currentTrackId: null,
    error: null,
  };
  private listeners = new Set<() => void>();
  private request = 0;
  private wanted = false;
  constructor(audio: HTMLAudioElement = new Audio()) {
    this.audio = audio;
    audio.preload = "metadata";
    audio.setAttribute("playsinline", "");
    audio.addEventListener("ended", this.ended);
    audio.addEventListener("error", this.failed);
    // Never restore playback automatically: Safari requires a fresh user click.
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(next: Partial<MusicState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener());
  }
  private remember(isOn: boolean) {
    try {
      const old = JSON.parse(localStorage.getItem("gb-settings") || "{}");
      localStorage.setItem(
        "gb-settings",
        JSON.stringify({ ...old, music: isOn }),
      );
    } catch {
      /* Playback still works without storage. */
    }
  }
  configure(muted: boolean, volume: number) {
    this.audio.muted = muted;
    this.audio.volume = Math.min(
      1,
      Math.max(0, Number.isFinite(volume) ? volume / 100 : 0.6),
    );
  }
  /** Synchronous call chain from the click handler to HTMLAudioElement.play(). */
  play = (trackId?: string) => {
    if (
      trackId &&
      trackId === this.state.currentTrackId &&
      this.wanted &&
      !this.audio.paused
    )
      return;
    const id = trackId ?? this.queue.next(this.state.currentTrackId);
    const track = tracks.find((candidate) => candidate.id === id);
    if (!track) throw new Error("Unknown music track");
    if (trackId) this.queue.select(trackId);
    this.start(track.id);
  };
  private start(trackId: string) {
    const track = tracks.find((candidate) => candidate.id === trackId)!;
    const request = ++this.request;
    this.wanted = true;
    this.audio.src = trackUrl(track);
    this.update({ currentTrackId: track.id, isOn: false, error: null });
    try {
      // This runs immediately, before any await/effect/timer, on user clicks.
      const playback = this.audio.play();
      void playback
        .then(() => {
          if (request !== this.request || !this.wanted) return;
          this.update({ isOn: true, error: null });
          this.remember(true);
        })
        .catch((error) => this.reject(error, request));
    } catch (error) {
      this.reject(error, request);
    }
  }
  stop = () => {
    ++this.request;
    this.wanted = false;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.update({ isOn: false, error: null });
    this.remember(false);
  };
  toggle = () => {
    if (this.wanted) this.stop();
    else this.play();
    return this.wanted;
  };
  private ended = () => {
    if (this.wanted) this.start(this.queue.next(this.state.currentTrackId));
  };
  private failed = () => {
    if (this.audio.error && this.wanted)
      this.reject(this.audio.error, this.request);
  };
  private reject(error: unknown, request: number) {
    if (request !== this.request) return; // Ignore the old track's aborted play promise.
    this.wanted = false;
    this.audio.pause();
    console.error("Music playback failed", {
      trackId: this.state.currentTrackId,
      error,
    });
    this.update({
      isOn: false,
      error:
        "Music could not start. Tap Play Music to retry, or select another record.",
    });
    this.remember(false);
  }
  dispose() {
    ++this.request;
    this.wanted = false;
    this.audio.pause();
    this.audio.removeEventListener("ended", this.ended);
    this.audio.removeEventListener("error", this.failed);
    this.audio.removeAttribute("src");
    this.audio.load();
    this.listeners.clear();
  }
}
