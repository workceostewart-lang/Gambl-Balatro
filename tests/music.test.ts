import { describe, expect, it, vi } from "vitest";
import { MusicPlayer, ShuffleQueue } from "../src/music-player";
import { tracks } from "../src/data/tracks";

class FakeAudio extends EventTarget {
  src = "";
  preload = "";
  volume = 1;
  muted = false;
  paused = true;
  currentTime = 0;
  error = null;
  setAttribute() {}
  removeAttribute() {}
  load() {}
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
}
const setup = () => {
  const audio = new FakeAudio();
  return {
    audio,
    player: new MusicPlayer(audio as unknown as HTMLAudioElement),
  };
};
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("music shuffle", () => {
  it("plays every track once per cycle and never repeats across boundaries", () => {
    const ids = tracks.map((track) => track.id);
    const queue = new ShuffleQueue(ids);
    let last: string | null = null;
    for (let cycle = 0; cycle < 100; cycle++) {
      const played = [];
      for (let i = 0; i < 6; i++) {
        const next = queue.next(last);
        expect(next).not.toBe(last);
        played.push(next);
        last = next;
      }
      expect(new Set(played).size).toBe(6);
    }
  });
  it("continues with all five other tracks after a manual selection", () => {
    const ids = tracks.map((track) => track.id);
    const queue = new ShuffleQueue(ids);
    queue.select(ids[3]);
    let last = ids[3];
    const played = [];
    for (let i = 0; i < 5; i++) {
      last = queue.next(last);
      played.push(last);
    }
    expect(new Set(played)).toEqual(new Set(ids.filter((id) => id !== ids[3])));
  });
});
describe("one shared music player", () => {
  it("starts off and calls audio.play synchronously", async () => {
    const { player, audio } = setup();
    expect(player.getSnapshot().isOn).toBe(false);
    expect(audio.play).not.toHaveBeenCalled();
    player.play();
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.src).toMatch(/^\/audio\/music\/.+\.mp3$/);
    await settle();
    expect(player.getSnapshot().isOn).toBe(true);
  });
  it("does not restart a currently playing Records selection", async () => {
    const { player, audio } = setup();
    player.play(tracks[0].id);
    await settle();
    audio.currentTime = 20;
    player.play(tracks[0].id);
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.currentTime).toBe(20);
  });
  it("stops, resets position, and does not autoplay on navigation/configuration", async () => {
    const { player, audio } = setup();
    player.play();
    await settle();
    player.configure(true, 25);
    expect(audio.muted).toBe(true);
    expect(audio.volume).toBe(0.25);
    expect(audio.play).toHaveBeenCalledTimes(1);
    player.stop();
    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBe(0);
    expect(player.getSnapshot().isOn).toBe(false);
    audio.dispatchEvent(new Event("ended"));
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it("automatically advances the queue only after ended", async () => {
    const { player, audio } = setup();
    player.play();
    await settle();
    const first = player.getSnapshot().currentTrackId;
    audio.dispatchEvent(new Event("ended"));
    await settle();
    expect(player.getSnapshot().currentTrackId).not.toBe(first);
    expect(audio.play).toHaveBeenCalledTimes(2);
  });
  it("a rejected play promise logs and shows an actionable error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { player, audio } = setup();
    audio.play.mockRejectedValueOnce(new Error("blocked"));
    player.play();
    await settle();
    expect(player.getSnapshot().isOn).toBe(false);
    expect(player.getSnapshot().error).toContain("retry");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
  it("ignores rejection from an interrupted earlier request", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { player, audio } = setup();
    let reject!: (error: Error) => void;
    audio.play.mockImplementationOnce(
      () =>
        new Promise((_resolve, r) => {
          reject = r;
        }),
    );
    player.play(tracks[0].id);
    player.play(tracks[1].id);
    await settle();
    reject(new Error("AbortError"));
    await settle();
    expect(player.getSnapshot().currentTrackId).toBe(tracks[1].id);
    expect(player.getSnapshot().isOn).toBe(true);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("stopping a pending request prevents its late promise from turning music on", async () => {
    const { player, audio } = setup();
    let resolve!: () => void;
    audio.play.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    player.play();
    player.stop();
    resolve();
    await settle();
    expect(player.getSnapshot().isOn).toBe(false);
  });
});
