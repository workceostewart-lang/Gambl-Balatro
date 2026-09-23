export type Suit = "♠" | "♥" | "♣" | "♦";
export type Card = { id: string; rank: number; suit: Suit };
export const HANDS = [
  ["High Card", 5, 1, 10, 1],
  ["Pair", 10, 2, 15, 1],
  ["Two Pair", 20, 2, 20, 1],
  ["Three of a Kind", 30, 3, 20, 2],
  ["Straight", 30, 4, 30, 3],
  ["Flush", 35, 4, 15, 2],
  ["Full House", 40, 4, 25, 2],
  ["Four of a Kind", 60, 7, 30, 3],
  ["Straight Flush", 100, 8, 40, 4],
  ["Five of a Kind", 120, 12, 35, 3],
  ["Flush House", 140, 14, 40, 4],
  ["Flush Five", 160, 16, 50, 3],
] as const;
export type Joker = {
  id: string;
  name: string;
  description: string;
  symbol: string;
  price: number;
  kind: "mult" | "chips" | "xmult" | "flush" | "house" | "last" | "economy";
  value: number;
};
export const JOKERS: Joker[] = [
  {
    id: "lucky",
    name: "Lucky Chip",
    description: "+4 Mult on every hand",
    symbol: "♧",
    price: 4,
    kind: "mult",
    value: 4,
  },
  {
    id: "velvet",
    name: "Velvet Pocket",
    description: "+50 Chips on every hand",
    symbol: "♦",
    price: 5,
    kind: "chips",
    value: 50,
  },
  {
    id: "double",
    name: "Double Down",
    description: "×2 Mult on your last hand",
    symbol: "Ⅱ",
    price: 6,
    kind: "last",
    value: 2,
  },
  {
    id: "royal",
    name: "Royal Flushed",
    description: "+15 Mult on a Flush",
    symbol: "♛",
    price: 7,
    kind: "flush",
    value: 15,
  },
  {
    id: "roller",
    name: "High Roller",
    description: "×2.5 Mult on a Full House",
    symbol: "♜",
    price: 7,
    kind: "house",
    value: 2.5,
  },
  {
    id: "tip",
    name: "Dealer’s Tip",
    description: "Earn $4 at the end of a blind",
    symbol: "$",
    price: 5,
    kind: "economy",
    value: 4,
  },
  {
    id: "after",
    name: "After Hours",
    description: "×1.5 Mult on every hand",
    symbol: "☾",
    price: 8,
    kind: "xmult",
    value: 1.5,
  },
];
export function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function deck(seed: string): Card[] {
  const random = rng(seed);
  const cards: Card[] = [];
  for (const suit of ["♠", "♥", "♣", "♦"] as Suit[])
    for (let rank = 2; rank <= 14; rank++)
      cards.push({ id: `${suit}${rank}`, suit, rank });
  for (let i = 51; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
export const rankLabel = (rank: number) =>
  ({ 11: "J", 12: "Q", 13: "K", 14: "A" })[rank] ?? String(rank);
export const chipValue = (rank: number) =>
  rank === 14 ? 11 : Math.min(rank, 10);
export function evaluate(cards: Card[]) {
  if (!cards.length)
    return {
      index: 0,
      name: "Select your cards",
      scoring: [] as Card[],
      chips: 0,
      mult: 0,
    };
  if (cards.length > 5) throw new Error("Select up to five cards");
  const groups = new Map<number, Card[]>();
  cards.forEach((c) => groups.set(c.rank, [...(groups.get(c.rank) || []), c]));
  const sets = [...groups.values()].sort(
    (a, b) => b.length - a.length || b[0].rank - a[0].rank,
  );
  const ranks = [...groups.keys()].sort((a, b) => a - b);
  const flush =
    cards.length === 5 && cards.every((c) => c.suit === cards[0].suit);
  const straight =
    cards.length === 5 &&
    ranks.length === 5 &&
    (ranks[4] - ranks[0] === 4 || ranks.join(",") === "2,3,4,5,14");
  let index = 0;
  let selected: Card[] = [
    sets.slice().sort((a, b) => b[0].rank - a[0].rank)[0][0],
  ];
  if (sets[0].length === 5) {
    index = flush ? 11 : 9;
    selected = cards;
  } else if (sets[0].length === 3 && sets[1]?.length === 2) {
    index = flush ? 10 : 6;
    selected = cards;
  } else if (straight && flush) {
    index = 8;
    selected = cards;
  } else if (sets[0].length === 4) {
    index = 7;
    selected = sets[0];
  } else if (flush) {
    index = 5;
    selected = cards;
  } else if (straight) {
    index = 4;
    selected = cards;
  } else if (sets[0].length === 3) {
    index = 3;
    selected = sets[0];
  } else if (sets[0].length === 2 && sets[1]?.length === 2) {
    index = 2;
    selected = [...sets[0], ...sets[1]];
  } else if (sets[0].length === 2) {
    index = 1;
    selected = sets[0];
  }
  return {
    index,
    name: HANDS[index][0],
    scoring: cards.filter((c) => selected.includes(c)),
    chips: HANDS[index][1] as number,
    mult: HANDS[index][2] as number,
  };
}
export function score(
  cards: Card[],
  jokers: Joker[] = [],
  level = 1,
  lastHand = false,
  debuff?: Suit,
) {
  const hand = evaluate(cards);
  if (!cards.length) return { ...hand, total: 0 };
  let chips = hand.chips + (level - 1) * HANDS[hand.index][3];
  let mult = hand.mult + (level - 1) * HANDS[hand.index][4];
  hand.scoring.forEach((c) => {
    if (c.suit !== debuff) chips += chipValue(c.rank);
  });
  for (const j of jokers) {
    if (j.kind === "chips") chips += j.value;
    if (j.kind === "mult") mult += j.value;
    if (
      j.kind === "xmult" ||
      (j.kind === "last" && lastHand) ||
      (j.kind === "house" && hand.index === 6)
    )
      mult *= j.value;
    if (j.kind === "flush" && [5, 8, 10, 11].includes(hand.index))
      mult += j.value;
  }
  return { ...hand, chips, mult, total: Math.floor(chips * mult) };
}
export const BASES = [300, 800, 2000, 5000, 11000, 20000, 35000, 50000];
export type Run = {
  seed: string;
  ante: number;
  blind: number;
  round: number;
  money: number;
  hands: number;
  discards: number;
  pile: Card[];
  hand: Card[];
  jokers: Joker[];
  levels: number[];
  roundScore: number;
  stage: "blinds" | "playing" | "cashout" | "shop" | "lost" | "won";
  reward: number;
  interest: number;
  rerolls: number;
  offers: Joker[];
  bought: string[];
  lastScore: number;
};
export function newRun(seed: string): Run {
  return {
    seed,
    ante: 1,
    blind: 0,
    round: 1,
    money: 4,
    hands: 4,
    discards: 3,
    pile: [],
    hand: [],
    jokers: [],
    levels: HANDS.map(() => 1),
    roundScore: 0,
    stage: "blinds",
    reward: 0,
    interest: 0,
    rerolls: 0,
    offers: [],
    bought: [],
    lastScore: 0,
  };
}
export const target = (r: Run) =>
  BASES[Math.min(r.ante - 1, 7)] * [1, 1.5, 2][r.blind];
export const bossName = (r: Run) =>
  ["The Cold Deck", "The Marked Card", "The Loaded Dice", "The Shill"][
    (r.ante - 1) % 4
  ];
export const debuffSuit = (r: Run) =>
  r.blind === 2
    ? (["♠", "♥", "♣", "♦"] as Suit[])[(r.ante - 1) % 4]
    : undefined;
export function startBlind(r: Run): Run {
  const cards = deck(`${r.seed}:${r.ante}:${r.blind}`);
  return {
    ...r,
    stage: "playing",
    hand: cards.slice(0, 8),
    pile: cards.slice(8),
    hands: 4,
    discards: 3,
    roundScore: 0,
    lastScore: 0,
  };
}
export function play(r: Run, ids: string[], discard = false): Run {
  if (
    r.stage !== "playing" ||
    ids.length < 1 ||
    ids.length > 5 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !r.hand.some((c) => c.id === id)) ||
    (discard && r.discards === 0)
  )
    return r;
  const selected = r.hand.filter((c) => ids.includes(c.id));
  const result = score(
    selected,
    r.jokers,
    r.levels[evaluate(selected).index],
    r.hands === 1,
    debuffSuit(r),
  );
  const draw = r.pile.slice(0, selected.length);
  const n = {
    ...r,
    hand: [...r.hand.filter((c) => !ids.includes(c.id)), ...draw],
    pile: r.pile.slice(draw.length),
    hands: r.hands - (discard ? 0 : 1),
    discards: r.discards - (discard ? 1 : 0),
    roundScore: r.roundScore + (discard ? 0 : result.total),
    lastScore: discard ? r.lastScore : result.total,
  };
  if (!discard && n.roundScore >= target(r)) {
    n.stage = "cashout";
    n.interest = Math.min(5, Math.floor(r.money / 5));
    n.reward =
      3 +
      r.blind +
      n.hands +
      n.interest +
      r.jokers
        .filter((j) => j.kind === "economy")
        .reduce((a, j) => a + j.value, 0);
  } else if (n.hands === 0) n.stage = "lost";
  return n;
}
export function shopOffers(r: Run) {
  const random = rng(`${r.seed}:shop:${r.ante}:${r.blind}:${r.rerolls}`);
  return [...JOKERS]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((j) => ({ j, k: random() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, 2)
    .map((x) => x.j);
}
export function cashout(r: Run): Run {
  const next = {
    ...r,
    money: r.money + r.reward,
    stage: "shop" as const,
    rerolls: 0,
    bought: [],
  };
  return { ...next, offers: shopOffers(next) };
}
export function nextBlind(r: Run): Run {
  if (r.ante === 8 && r.blind === 2) return { ...r, stage: "won" };
  return {
    ...r,
    blind: (r.blind + 1) % 3,
    ante: r.ante + (r.blind === 2 ? 1 : 0),
    round: r.round + 1,
    stage: "blinds",
  };
}
