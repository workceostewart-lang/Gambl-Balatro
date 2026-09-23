import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Club,
  Crown,
  Expand,
  Flag,
  Globe,
  HelpCircle,
  Layers,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Spade,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { TableScene } from "./TableScene";
import {
  HANDS,
  JOKERS,
  bossName,
  cashout,
  debuffSuit,
  evaluate,
  newRun,
  nextBlind,
  play,
  rankLabel,
  score,
  shopOffers,
  startBlind,
  target,
  type Card,
  type Run,
} from "./engine";
import "./style.css";
import "@fontsource/cinzel/latin-500.css";
import "@fontsource/cinzel/latin-600.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";

const money = (n: number) => `$${n}`;
const number = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);
function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* A run remains playable when browser storage is unavailable. */
  }
}
function loadRun(): Run | null {
  const r = read<Run | null>("gb-run-v1", null);
  return r &&
    typeof r.seed === "string" &&
    Array.isArray(r.hand) &&
    Array.isArray(r.levels) &&
    Array.isArray(r.jokers) &&
    ["playing", "blinds", "shop", "cashout", "lost", "won"].includes(r.stage)
    ? r
    : null;
}
const modes = [
  {
    name: "Solo Run",
    sub: "Your deck. Your destiny.",
    icon: Spade,
    tag: "THE CLASSIC",
    id: "solo",
  },
  {
    name: "vs CPU",
    sub: "Challenge the house.",
    icon: Monitor,
    tag: "IN DEVELOPMENT",
    id: "cpu",
  },
  {
    name: "Multiplayer",
    sub: "A table for your friends.",
    icon: Globe,
    tag: "IN DEVELOPMENT",
    id: "online",
  },
  {
    name: "How to Play",
    sub: "Learn the winning hand.",
    icon: BookOpen,
    tag: "START HERE",
    id: "guide",
  },
];
function CardFace({
  card,
  selected,
  onClick,
  disabled = false,
}: {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${rankLabel(card.rank)} of ${{ "♠": "Spades", "♥": "Hearts", "♣": "Clubs", "♦": "Diamonds" }[card.suit]}`}
      className={`playing-card ${["♥", "♦"].includes(card.suit) ? "red" : ""} ${selected ? "selected" : ""}`}
    >
      <span className="corner">
        {rankLabel(card.rank)}
        <small>{card.suit}</small>
      </span>
      <span className="card-suit">{card.suit}</span>
      <span className="corner bottom">
        {rankLabel(card.rank)}
        <small>{card.suit}</small>
      </span>
      {selected && (
        <span className="selected-check">
          <Check size={12} />
        </span>
      )}
    </button>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function App() {
  const [run, setRun] = useState<Run | null>(loadRun);
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [modal, setModal] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<"rank" | "suit">("rank");
  const [settings, setSettings] = useState(() =>
    read("gb-settings", {
      sound: true,
      motion: !matchMedia("(prefers-reduced-motion: reduce)").matches,
      volume: 60,
    }),
  );
  const [notice, setNotice] = useState("");
  const [guideStep, setGuideStep] = useState(0);
  const [seed, setSeed] = useState("");
  const [stats, setStats] = useState(() =>
    read("gb-stats", { runs: 0, best: 0, wins: 0 }),
  );
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    save("gb-run-v1", run);
  }, [run]);
  useEffect(() => {
    save("gb-settings", settings);
  }, [settings]);
  useEffect(() => {
    save("gb-stats", stats);
  }, [stats]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  function sound(high = false) {
    if (!settings.sound) return;
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
      const ctx = audio.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(high ? 660 : 330, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        high ? 880 : 190,
        ctx.currentTime + 0.1,
      );
      gain.gain.setValueAtTime((settings.volume / 100) * 0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {
      /* Sound is optional. */
    }
  }
  function begin() {
    const next = newRun(
      seed.trim() || crypto.randomUUID().slice(0, 8).toUpperCase(),
    );
    setRun(next);
    setSelected([]);
    setScreen("game");
    setModal("");
    setStats((s) => ({ ...s, runs: s.runs + 1 }));
    sound(true);
  }
  function toggle(id: string) {
    sound();
    setSelected((s) =>
      s.includes(id)
        ? s.filter((x) => x !== id)
        : s.length < 5
          ? [...s, id]
          : s,
    );
  }
  function action(discard = false) {
    if (!run) return;
    const next = play(run, selected, discard);
    setRun(next);
    setSelected([]);
    if (!discard) {
      setStats((s) => ({ ...s, best: Math.max(s.best, next.lastScore) }));
      sound(true);
    } else sound();
  }
  async function fullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        const orientation = screenOrientation();
        if (orientation.lock)
          await orientation.lock("landscape").catch(() => {});
      } else await document.exitFullscreen();
    } catch {
      setNotice(
        "Fullscreen is unavailable here. The table still fits your browser; rotate your phone for landscape.",
      );
    }
  }
  function screenOrientation() {
    return window.screen.orientation as ScreenOrientation & {
      lock?: (mode: string) => Promise<void>;
    };
  }
  const picked = run?.hand.filter((c) => selected.includes(c.id)) || [];
  const evaluated = evaluate(picked);
  const preview = run
    ? score(
        picked,
        run.jokers,
        run.levels[evaluated.index],
        run.hands === 1,
        debuffSuit(run),
      )
    : null;
  function modalBody() {
    if (modal === "settings")
      return (
        <>
          <p className="muted">Make yourself comfortable at the table.</p>
          <label className="setting-row">
            <span>
              <b>Sound effects</b>
              <small>Card selections and scoring tones</small>
            </span>
            <input
              type="checkbox"
              checked={settings.sound}
              onChange={(e) =>
                setSettings({ ...settings, sound: e.target.checked })
              }
            />
          </label>
          <label className="setting-row">
            <span>
              Effects volume <b>{settings.volume}%</b>
            </span>
            <input
              aria-label="Effects volume"
              type="range"
              min="0"
              max="100"
              value={settings.volume}
              onChange={(e) =>
                setSettings({ ...settings, volume: +e.target.value })
              }
            />
          </label>
          <label className="setting-row">
            <span>
              <b>Table motion</b>
              <small>Turn off for a quieter, lighter experience</small>
            </span>
            <input
              type="checkbox"
              checked={settings.motion}
              onChange={(e) =>
                setSettings({ ...settings, motion: e.target.checked })
              }
            />
          </label>
          <button className="secondary full" onClick={() => void fullscreen()}>
            <Expand size={17} /> Toggle Fullscreen
          </button>
          <p className="fine">
            Progress saves automatically on this device. Landscape is
            recommended on mobile.
          </p>
        </>
      );
    if (modal === "new")
      return (
        <>
          <div className="setup-deck">
            <span className="deck-emblem">♠</span>
            <div>
              <p className="eyebrow">THE ORIGINAL</p>
              <h3>The House Deck</h3>
              <p>52 cards · 4 hands · 3 discards</p>
            </div>
          </div>
          <p className="muted">
            Beat three blinds per ante. Build your Joker engine. Make it through
            all eight.
          </p>
          <label className="input-label" htmlFor="seed">
            Custom seed <span>optional</span>
          </label>
          <input
            id="seed"
            placeholder="Let the cards decide"
            value={seed}
            maxLength={32}
            onChange={(e) => setSeed(e.target.value)}
          />
          {run && !["lost", "won"].includes(run.stage) && (
            <p className="warning">
              Starting a new run replaces your saved run.
            </p>
          )}
          <button className="primary full" onClick={begin}>
            <Play size={17} fill="currentColor" /> Deal Me In{" "}
            <ArrowRight size={17} />
          </button>
          <p className="fine">No bets. No real money. Just one more hand.</p>
        </>
      );
    if (modal === "guide")
      return (
        <>
          <div className="guide-progress">
            {["The goal", "Your hand", "The score", "The engine"].map(
              (s, i) => (
                <button
                  key={s}
                  className={guideStep === i ? "active" : ""}
                  onClick={() => setGuideStep(i)}
                >
                  {i + 1}
                </button>
              ),
            )}
          </div>
          <p className="eyebrow">LESSON {guideStep + 1} OF 4</p>
          <h3>
            {
              [
                "Beat the blind. Keep the run alive.",
                "Eight cards. Five choices.",
                "Chips × Mult = your score.",
                "Jokers change everything.",
              ][guideStep]
            }
          </h3>
          <p className="guide-copy">
            {
              [
                "Each blind sets a score target. Reach it within four hands to earn money and visit the shop. Clear Small, Big, and Boss Blinds across eight antes to win.",
                "Tap up to five cards to select them. Play a poker hand, or use a discard to draw replacements. You get three discards per blind. Only cards making the hand score: a Pair’s kickers do not count.",
                "A Pair begins at 10 Chips × 2 Mult. Two 10s add 20 Chips: (10 + 20) × 2 = 60 points. See your exact score preview on the left before playing.",
                "Buy Jokers in the shop with money earned from blinds. +Mult before ×Mult makes a stronger engine. Use the arrows to reorder Jokers. Hand upgrades increase base Chips and Mult.",
              ][guideStep]
            }
          </p>
          <div className="example-score">
            <span className="blue">{guideStep === 3 ? "30" : "30"} Chips</span>
            <b>×</b>
            <span className="red-box">{guideStep === 3 ? "6" : "2"} Mult</span>
            <b>=</b>
            <strong>{guideStep === 3 ? "180" : "60"}</strong>
          </div>
          <button
            className="primary full"
            onClick={() =>
              guideStep < 3 ? setGuideStep(guideStep + 1) : setModal("new")
            }
          >
            {guideStep < 3 ? "Next Lesson" : "Start a Solo Run"}
            <ArrowRight size={18} />
          </button>
          <p className="fine">
            Interactive eight-step tutorial is planned. This quick guide covers
            the current solo build.
          </p>
        </>
      );
    if (modal === "hands")
      return (
        <div className="hand-list">
          {HANDS.slice(0, 9).map((h, i) => (
            <div key={h[0]}>
              <span>
                {h[0]} <small>Lv. {run?.levels[i] || 1}</small>
              </span>
              <b>
                <em>{h[1] + ((run?.levels[i] || 1) - 1) * h[3]}</em> ×{" "}
                {h[2] + ((run?.levels[i] || 1) - 1) * h[4]}
              </b>
            </div>
          ))}
        </div>
      );
    if (modal === "collection")
      return (
        <>
          <p className="muted">
            Meet the first seven original Jokers in this playable build.
          </p>
          <div className="collection">
            {JOKERS.map((j) => (
              <div key={j.id}>
                <span>{j.symbol}</span>
                <div>
                  <b>{j.name}</b>
                  <small>{j.description}</small>
                </div>
                <strong>${j.price}</strong>
              </div>
            ))}
          </div>
        </>
      );
    if (modal === "cpu" || modal === "online")
      return (
        <>
          <div className="coming-icon">
            {modal === "cpu" ? <Monitor size={42} /> : <Globe size={42} />}
          </div>
          <p className="eyebrow">NEXT AT THE TABLE</p>
          <h3>
            {modal === "cpu" ? "A worthy opponent." : "Bring your own rivals."}
          </h3>
          <p className="guide-copy">
            {modal === "cpu"
              ? "Easy, Medium, and Hard opponents with shared seeds and Boss Blind showdowns are planned. This release focuses on the menu, mobile table, and solo foundation."
              : "Private room codes, heads-up matches, and tables of up to eight players are planned. Online matches are not connected in this release."}
          </p>
          <button className="primary full" onClick={() => setModal("new")}>
            Play Solo Now <ArrowRight size={18} />
          </button>
        </>
      );
    if (modal === "stats")
      return (
        <>
          <div className="stats-grid">
            <div>
              <strong>{stats.runs}</strong>
              <span>Runs started</span>
            </div>
            <div>
              <strong>{number(stats.best)}</strong>
              <span>Best hand</span>
            </div>
            <div>
              <strong>{stats.wins}</strong>
              <span>Runs won</span>
            </div>
          </div>
          <p className="fine">Your records are stored on this device.</p>
        </>
      );
    if (modal === "pause")
      return (
        <>
          <p className="muted">Your run is saved. Take your time.</p>
          <button className="primary full" onClick={() => setModal("")}>
            Back to the Table <Play size={17} />
          </button>
          <button className="secondary full" onClick={() => setModal("hands")}>
            Poker Hands <BookOpen size={17} />
          </button>
          <button
            className="secondary full"
            onClick={() => {
              setScreen("menu");
              setModal("");
            }}
          >
            Save & Main Menu <ArrowLeft size={17} />
          </button>
          <p className="fine">Seed: {run?.seed} · Same seed, same draws.</p>
        </>
      );
    return null;
  }
  return (
    <div className={`app ${settings.motion ? "" : "reduced-motion"} ${screen}`}>
      <TableScene motion={settings.motion} />
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <a href="https://fantomzone.app" className="hub-link">
          <ArrowLeft size={15} />
          <span className="fz">FZ</span> FANTOMZONE{" "}
          <span className="hub-word">/ THE GAMBL SERIES</span>
        </a>
        <div className="top-actions">
          <span className="edition">
            <i /> THE HIGH LIMIT LOUNGE
          </span>
          <button
            className="icon-button"
            aria-label={settings.sound ? "Mute sound" : "Enable sound"}
            onClick={() => setSettings({ ...settings, sound: !settings.sound })}
          >
            {settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="icon-button"
            aria-label="Fullscreen"
            onClick={() => void fullscreen()}
          >
            <Expand size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Settings"
            onClick={() => setModal("settings")}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>
      {screen === "menu" ? (
        <main className="menu-content">
          <section className="hero">
            <div className="hero-copy">
              <div className="series-label">
                <span /> A FANTOMZONE ORIGINAL <span />
              </div>
              <p className="gamble-title">GAMBL</p>
              <h1>
                BALATRO<span>♦</span>
              </h1>
              <p className="tagline">
                Build your hand.
                <br />
                <em>Break the house.</em>
              </p>
              <p className="hero-description">
                A poker roguelike where every card counts.
                <br />
                Stack your Jokers. Bend the odds. Go all in.
              </p>
              <div className="hero-cta">
                <button className="primary" onClick={() => setModal("new")}>
                  <Play size={18} fill="currentColor" /> Play Solo{" "}
                  <ArrowRight size={18} />
                </button>
                {run && !["lost", "won"].includes(run.stage) ? (
                  <button
                    className="text-button"
                    onClick={() => {
                      setScreen("game");
                      setSelected([]);
                    }}
                  >
                    Continue Run <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    className="text-button"
                    onClick={() => {
                      setGuideStep(0);
                      setModal("guide");
                    }}
                  >
                    How to Play <ChevronRight size={16} />
                  </button>
                )}
              </div>
              <div className="hero-meta">
                <span>
                  <Shield size={13} /> No real money
                </span>
                <span>
                  <Monitor size={13} /> Desktop & mobile
                </span>
              </div>
            </div>
            <div className="hero-art">
              <img
                src="/casino-art.png"
                alt="An original casino Joker, a fan of playing cards, and gold poker chips on emerald felt"
              />
              <div className="art-vignette" />
              <div className="art-caption">
                <span>♠</span> THE HOUSE ALWAYS WINS.
                <br />
                <em>Until you sit down.</em>
              </div>
            </div>
            <div className="hero-side-note">
              EST. 2026 &nbsp; / &nbsp; PLAY YOUR OWN ODDS
            </div>
          </section>
          <section className="modes" aria-label="Choose a game mode">
            <div className="section-line">
              <span>TAKE YOUR SEAT</span>
              <i />
              <span>01 — 04</span>
            </div>
            <div className="mode-grid">
              {modes.map((m, i) => (
                <button
                  key={m.id}
                  className={`mode-card mode-${m.id}`}
                  onClick={() => {
                    setGuideStep(0);
                    setModal(m.id === "solo" ? "new" : m.id);
                  }}
                >
                  <div className="mode-top">
                    <m.icon size={25} strokeWidth={1.3} />
                    <span>{m.tag}</span>
                  </div>
                  <div className="mode-bottom">
                    <div>
                      <h2>{m.name}</h2>
                      <p>{m.sub}</p>
                    </div>
                    <ArrowRight size={20} />
                  </div>
                  <span className="mode-index">0{i + 1}</span>
                </button>
              ))}
            </div>
          </section>
          <footer className="menu-footer">
            <div>
              <button onClick={() => setModal("collection")}>
                <Layers size={15} /> Joker Collection
              </button>
              <span>·</span>
              <button onClick={() => setModal("stats")}>
                <Flag size={15} /> Your Records
              </button>
              <span>·</span>
              <button onClick={() => setModal("settings")}>
                <Settings size={15} /> Settings
              </button>
            </div>
            <p>
              <span className="tiny-diamond">♦</span> A LITTLE LUCK. A LOT OF
              STRATEGY. <span className="version">v0.1 · SOLO PREVIEW</span>
            </p>
          </footer>
        </main>
      ) : (
        run && (
          <main className="game-content">
            <aside className="scoreboard" aria-label="Scoreboard">
              <div className="blind-title">
                {run.blind === 2
                  ? bossName(run)
                  : run.blind === 1
                    ? "BIG BLIND"
                    : "SMALL BLIND"}
              </div>
              <div className="blind-target">
                <div
                  className={`poker-chip ${run.blind === 2 ? "boss-chip" : ""}`}
                >
                  ♠
                </div>
                <div>
                  <span>Score at least</span>
                  <strong>{number(target(run))}</strong>
                  <small>Reward {"$".repeat(3 + run.blind)}</small>
                </div>
              </div>
              <div className="round-score">
                <span>ROUND SCORE</span>
                <strong>{number(run.roundScore)}</strong>
                <div className="score-track">
                  <i
                    style={{
                      width: `${Math.min(100, (run.roundScore / target(run)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="score-preview">
                <div>
                  {preview?.name}
                  <small>
                    {picked.length > 0
                      ? `Lv. ${run.levels[evaluated.index]}`
                      : "Up to 5"}
                  </small>
                </div>
                <div className="formula">
                  <b className="blue">{number(preview?.chips || 0)}</b>
                  <span>×</span>
                  <b className="red-box">{number(preview?.mult || 0)}</b>
                </div>
                <span className="preview-total">
                  {number(preview?.total || 0)} points
                </span>
              </div>
              <div className="counters">
                <div>
                  Hands<strong>{run.hands}</strong>
                </div>
                <div>
                  Discards<strong>{run.discards}</strong>
                </div>
              </div>
              <div className="bank">
                <span>Bank</span>
                <strong>{money(run.money)}</strong>
              </div>
              <div className="run-progress">
                <span>
                  Ante <b>{run.ante}/8</b>
                </span>
                <span>
                  Round <b>{run.round}</b>
                </span>
              </div>
              <div className="score-actions">
                <button onClick={() => setModal("hands")}>
                  <BookOpen size={14} /> Hands
                </button>
                <button onClick={() => setModal("pause")}>
                  <Pause size={14} /> Menu
                </button>
              </div>
            </aside>
            <div className="table-area">
              <div className="joker-header">
                <span>
                  YOUR JOKERS <b>{run.jokers.length}/5</b>
                </span>
                <span className="seed-label">SEED {run.seed}</span>
              </div>
              <div className="joker-row">
                {Array.from({ length: 5 }, (_, i) => {
                  const j = run.jokers[i];
                  return j ? (
                    <div className="joker-card" key={i} title={j.description}>
                      <span>{j.symbol}</span>
                      <b>{j.name}</b>
                      <small>{j.description}</small>
                      <div className="joker-controls">
                        <button
                          aria-label={`Move ${j.name} left`}
                          disabled={i === 0}
                          onClick={() => {
                            const js = [...run.jokers];
                            [js[i - 1], js[i]] = [js[i], js[i - 1]];
                            setRun({ ...run, jokers: js });
                          }}
                        >
                          ←
                        </button>
                        <button
                          aria-label={`Sell ${j.name} for ${money(Math.floor(j.price / 2))}`}
                          onClick={() => {
                            setRun({
                              ...run,
                              jokers: run.jokers.filter((_, k) => k !== i),
                              money: run.money + Math.floor(j.price / 2),
                            });
                            setNotice(
                              `${j.name} sold for $${Math.floor(j.price / 2)}`,
                            );
                          }}
                        >
                          Sell ${Math.floor(j.price / 2)}
                        </button>
                        <button
                          aria-label={`Move ${j.name} right`}
                          disabled={i === run.jokers.length - 1}
                          onClick={() => {
                            const js = [...run.jokers];
                            [js[i], js[i + 1]] = [js[i + 1], js[i]];
                            setRun({ ...run, jokers: js });
                          }}
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="joker-empty" key={i}>
                      <span>♧</span>
                      <small>JOKER</small>
                    </div>
                  );
                })}
              </div>
              {run.stage === "playing" ? (
                <>
                  <div className="play-center">
                    <span className="table-watermark">
                      GAMBL <b>BALATRO</b>
                    </span>
                    {run.lastScore > 0 ? (
                      <div className="last-hand" key={run.lastScore}>
                        <span>LAST HAND</span>
                        <strong>+{number(run.lastScore)}</strong>
                      </div>
                    ) : (
                      <p>Make your first move.</p>
                    )}
                    {run.blind === 2 && (
                      <p className="boss-rule">
                        {debuffSuit(run)} cards give no chips this blind.
                      </p>
                    )}
                  </div>
                  <div className="hand-area">
                    <div className="hand-label">
                      <span>
                        YOUR HAND <b>{selected.length}/5 selected</b>
                      </span>
                      <span>{run.pile.length} cards in deck</span>
                    </div>
                    <div className="card-hand">
                      {[...run.hand]
                        .sort((a, b) =>
                          sort === "rank"
                            ? b.rank - a.rank || a.suit.localeCompare(b.suit)
                            : a.suit.localeCompare(b.suit) || b.rank - a.rank,
                        )
                        .map((c) => (
                          <CardFace
                            key={c.id}
                            card={c}
                            selected={selected.includes(c.id)}
                            onClick={() => toggle(c.id)}
                          />
                        ))}
                    </div>
                    <div className="hand-actions">
                      <button
                        className="primary play-hand"
                        disabled={!selected.length}
                        onClick={() => action()}
                      >
                        <Play size={16} fill="currentColor" /> Play Hand
                      </button>
                      <div className="sort-control">
                        <span>SORT</span>
                        <button
                          className={sort === "rank" ? "active" : ""}
                          onClick={() => setSort("rank")}
                        >
                          Rank
                        </button>
                        <button
                          className={sort === "suit" ? "active" : ""}
                          onClick={() => setSort("suit")}
                        >
                          Suit
                        </button>
                      </div>
                      <button
                        className="discard"
                        disabled={!selected.length || run.discards === 0}
                        onClick={() => action(true)}
                      >
                        <RotateCcw size={16} /> Discard
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="stage-panel">
                  {run.stage === "blinds" && (
                    <>
                      <p className="eyebrow">ANTE {run.ante} / 8</p>
                      <h2>Choose your next challenge.</h2>
                      <p className="muted">
                        Every blind is a new deal. Every Joker stays with you.
                      </p>
                      <div className="blind-choices">
                        {["Small Blind", "Big Blind", bossName(run)].map(
                          (name, i) => (
                            <div
                              key={name}
                              className={`blind-choice ${i === run.blind ? "current" : ""} ${i < run.blind ? "cleared" : ""}`}
                            >
                              <div
                                className={`poker-chip ${i === 2 ? "boss-chip" : ""}`}
                              >
                                {i < run.blind ? (
                                  <Check />
                                ) : i === 2 ? (
                                  "♛"
                                ) : (
                                  "♠"
                                )}
                              </div>
                              <h3>{name}</h3>
                              <strong>
                                {number(target({ ...run, blind: i }))}
                              </strong>
                              <small>
                                {i < run.blind
                                  ? "CLEARED"
                                  : i === run.blind
                                    ? "UP NEXT"
                                    : "COMING UP"}
                              </small>
                              {i === run.blind && (
                                <button
                                  className="primary full"
                                  onClick={() => {
                                    setRun(startBlind(run));
                                    sound();
                                  }}
                                >
                                  Select <ArrowRight size={15} />
                                </button>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </>
                  )}
                  {run.stage === "cashout" && (
                    <div className="cashout">
                      <div className="win-icon">
                        <Crown size={36} />
                      </div>
                      <p className="eyebrow">BLIND CLEARED</p>
                      <h2>Well played.</h2>
                      <div className="receipt">
                        <p>
                          <span>Blind reward</span>
                          <b>${3 + run.blind}</b>
                        </p>
                        <p>
                          <span>{run.hands} unused hands</span>
                          <b>${run.hands}</b>
                        </p>
                        <p>
                          <span>Interest</span>
                          <b>${run.interest}</b>
                        </p>
                        {run.jokers.some((j) => j.kind === "economy") && (
                          <p>
                            <span>Dealer’s Tip</span>
                            <b>
                              $
                              {run.jokers.filter((j) => j.kind === "economy")
                                .length * 4}
                            </b>
                          </p>
                        )}
                        <p className="receipt-total">
                          <span>Take home</span>
                          <b>${run.reward}</b>
                        </p>
                      </div>
                      <button
                        className="primary full"
                        onClick={() => {
                          setRun(cashout(run));
                          sound(true);
                        }}
                      >
                        Cash Out & Shop <ArrowRight size={17} />
                      </button>
                    </div>
                  )}
                  {run.stage === "shop" && (
                    <>
                      <div className="shop-heading">
                        <div>
                          <p className="eyebrow">THE HOUSE BOUTIQUE</p>
                          <h2>A little edge goes a long way.</h2>
                        </div>
                        <button
                          className="secondary"
                          disabled={run.money < 5 + run.rerolls}
                          onClick={() => {
                            const n = {
                              ...run,
                              money: run.money - 5 - run.rerolls,
                              rerolls: run.rerolls + 1,
                              bought: [],
                            };
                            setRun({ ...n, offers: shopOffers(n) });
                          }}
                        >
                          Reroll ${5 + run.rerolls}
                        </button>
                      </div>
                      <div className="shop-items">
                        {run.offers.map((j) => (
                          <div className="shop-item" key={j.id}>
                            <span className="shop-symbol">{j.symbol}</span>
                            <h3>{j.name}</h3>
                            <p>{j.description}</p>
                            <button
                              className="primary full"
                              disabled={
                                run.money < j.price ||
                                run.jokers.length >= 5 ||
                                run.bought.includes(j.id)
                              }
                              onClick={() => {
                                setRun({
                                  ...run,
                                  money: run.money - j.price,
                                  jokers: [...run.jokers, { ...j }],
                                  bought: [...run.bought, j.id],
                                });
                                sound(true);
                              }}
                            >
                              {run.bought.includes(j.id)
                                ? "Purchased"
                                : `Buy for $${j.price}`}
                            </button>
                          </div>
                        ))}
                        <div className="shop-item stack-item">
                          <span className="shop-symbol">▥</span>
                          <h3>Chip Stack</h3>
                          <p>Level up a poker hand.</p>
                          <select aria-label="Hand to level up" id="level-hand">
                            {HANDS.slice(0, 9).map((h, i) => (
                              <option value={i} key={h[0]}>
                                {h[0]} · Lv. {run.levels[i]}
                              </option>
                            ))}
                          </select>
                          <button
                            className="secondary full"
                            disabled={
                              run.money < 3 || run.bought.includes("stack")
                            }
                            onClick={() => {
                              const i = +(
                                document.getElementById(
                                  "level-hand",
                                ) as HTMLSelectElement
                              ).value;
                              const levels = [...run.levels];
                              levels[i]++;
                              setRun({
                                ...run,
                                levels,
                                money: run.money - 3,
                                bought: [...run.bought, "stack"],
                              });
                              sound(true);
                            }}
                          >
                            {run.bought.includes("stack")
                              ? "Purchased"
                              : "Upgrade · $3"}
                          </button>
                        </div>
                      </div>
                      <button
                        className="primary next-round"
                        onClick={() => {
                          const n = nextBlind(run);
                          setRun(n);
                          if (n.stage === "won")
                            setStats((s) => ({ ...s, wins: s.wins + 1 }));
                        }}
                      >
                        Next Round <ArrowRight size={17} />
                      </button>
                    </>
                  )}
                  {(run.stage === "lost" || run.stage === "won") && (
                    <div className="end-screen">
                      <Crown size={44} />
                      <p className="eyebrow">
                        {run.stage === "won"
                          ? "THE HOUSE IS YOURS"
                          : "THE HOUSE TAKES THIS ONE"}
                      </p>
                      <h2>
                        {run.stage === "won"
                          ? "Against all odds."
                          : "One more hand?"}
                      </h2>
                      <p>
                        Ante {run.ante} · Round {run.round} ·{" "}
                        {number(run.roundScore)} points
                      </p>
                      <button
                        className="primary full"
                        onClick={() => setModal("new")}
                      >
                        Start a New Run <ArrowRight size={17} />
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setScreen("menu")}
                      >
                        Main Menu
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        )
      )}
      {modal && (
        <Modal
          title={
            (
              {
                new: "Take Your Seat",
                settings: "Table Settings",
                guide: "The Dealer’s Guide",
                hands: "Poker Hands",
                collection: "Joker Collection",
                stats: "Your Records",
                cpu: "Play vs CPU",
                online: "Private Tables",
                pause: "Take a Breather",
              } as Record<string, string>
            )[modal] || ""
          }
          onClose={() => setModal("")}
        >
          {modalBody()}
        </Modal>
      )}
      {notice && (
        <div role="status" className="toast">
          {notice}
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {screen === "game" && run
          ? `Round score ${run.roundScore}. ${run.hands} hands remaining. ${run.stage}.`
          : ""}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
