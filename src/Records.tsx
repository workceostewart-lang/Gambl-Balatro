import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { tracks } from "./data/tracks";
import { useMusic } from "./MusicProvider";

export function Records({
  onBack,
  onPlay,
}: {
  onBack: () => void;
  onPlay: (id: string) => void;
}) {
  const { isOn, currentTrackId } = useMusic();
  const back = useRef<HTMLButtonElement>(null);
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    back.current?.focus();
  }, []);
  return (
    <section className="records-screen" aria-labelledby="records-title">
      <div className="records-panel">
        <header className="records-heading">
          <button ref={back} className="secondary" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 id="records-title">Records</h1>
          <span aria-hidden="true">♫</span>
        </header>
        <ol className="record-list" aria-label="Soundtrack records">
          {tracks.map((track, index) => (
            <li key={track.id}>
              <button
                ref={(el) => {
                  rows.current[index] = el;
                }}
                className={`record-row ${isOn && currentTrackId === track.id ? "playing" : ""}`}
                aria-pressed={isOn && currentTrackId === track.id}
                onClick={() => onPlay(track.id)}
                onKeyDown={(event) => {
                  const target =
                    event.key === "ArrowDown"
                      ? (index + 1) % tracks.length
                      : event.key === "ArrowUp"
                        ? (index + tracks.length - 1) % tracks.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? tracks.length - 1
                            : -1;
                  if (target >= 0) {
                    event.preventDefault();
                    rows.current[target]?.focus();
                  }
                }}
              >
                <span className="record-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="record-title">{track.title}</span>
                {isOn && currentTrackId === track.id && (
                  <span className="record-playing" aria-label="Playing">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
                <span className="record-duration">{track.duration}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <footer className="records-credit">
        Music sourced from Pixabay and StockTune, all royalty-free, titles
        credited to their original artists.
      </footer>
    </section>
  );
}
