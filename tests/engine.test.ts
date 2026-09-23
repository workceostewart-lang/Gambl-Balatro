import { describe, it, expect } from "vitest";
import {
  deck,
  evaluate,
  score,
  JOKERS,
  newRun,
  startBlind,
  play,
  cashout,
  nextBlind,
  shopOffers,
  type Card,
  type Suit,
} from "../src/engine";
const cards = (
  ranks: number[],
  suits: Suit[] = ["♠", "♥", "♣", "♦", "♠"],
): Card[] =>
  ranks.map((rank, i) => ({ id: `test-${i}`, rank, suit: suits[i] }));
describe("PRD poker hands", () => {
  const examples: [number[], number][] = [
    [[14, 9, 7, 4, 2], 0],
    [[10, 10, 7, 4, 2], 1],
    [[10, 10, 7, 7, 2], 2],
    [[8, 8, 8, 4, 2], 3],
    [[2, 3, 4, 5, 14], 4],
    [[9, 9, 9, 4, 4], 6],
    [[8, 8, 8, 8, 2], 7],
    [[8, 8, 8, 8, 8], 9],
  ];
  for (const [ranks, index] of examples)
    it(`detects hand ${index}`, () =>
      expect(evaluate(cards(ranks)).index).toBe(index));
  for (const [ranks, index] of [
    [[14, 9, 7, 4, 2], 5],
    [[10, 11, 12, 13, 14], 8],
    [[8, 8, 8, 4, 4], 10],
    [[8, 8, 8, 8, 8], 11],
  ] as [number[], number][])
    it(`detects suited hand ${index}`, () =>
      expect(evaluate(cards(ranks, ["♥", "♥", "♥", "♥", "♥"])).index).toBe(
        index,
      ));
  it("does not count pair kickers", () => {
    const s = score(cards([10, 10, 14, 8, 2]));
    expect(s.chips).toBe(30);
    expect(s.total).toBe(60);
    expect(s.scoring).toHaveLength(2);
  });
  it("scores only highest card for High Card", () =>
    expect(score(cards([14, 8, 5])).total).toBe(16));
  it("does not call duplicate ranks a straight", () =>
    expect(evaluate(cards([3, 4, 5, 6, 6])).index).toBe(1));
  it("preserves user card order in scoring", () => {
    const hand = cards([9, 3, 9]);
    expect(evaluate(hand).scoring).toEqual([hand[0], hand[2]]);
  });
  it("raises hand levels using the exact PRD increments", () =>
    expect(score(cards([10, 10]), [], 2).total).toBe(135));
  it("applies jokers from left to right", () => {
    const pair = cards([10, 10]);
    const plus = JOKERS[0],
      times = JOKERS[6];
    expect(score(pair, [plus, times]).total).toBe(270);
    expect(score(pair, [times, plus]).total).toBe(210);
  });
  it("debuffed cards keep hand classification but add no chips", () => {
    const hand = cards([10, 10], ["♠", "♥"]);
    expect(score(hand, [], 1, false, "♠").total).toBe(40);
  });
});
describe("deterministic solo loop", () => {
  it("deals 52 unique cards reproducibly", () => {
    const a = deck("test");
    expect(a).toEqual(deck("test"));
    expect(new Set(a.map((c) => c.id)).size).toBe(52);
    expect(a).not.toEqual(deck("different"));
  });
  it("draws eight and depletes deck on discard", () => {
    const r = startBlind(newRun("test"));
    expect(r.hand.length).toBe(8);
    expect(r.pile.length).toBe(44);
    const n = play(
      r,
      r.hand.slice(0, 5).map((c) => c.id),
      true,
    );
    expect(n.hand).toHaveLength(8);
    expect(n.pile).toHaveLength(39);
    expect(n.discards).toBe(2);
    expect(n.hands).toBe(4);
  });
  it("rejects invalid, duplicate and oversized selections", () => {
    const r = startBlind(newRun("test"));
    for (const ids of [
      [],
      ["fake"],
      [r.hand[0].id, r.hand[0].id],
      r.hand.slice(0, 6).map((c) => c.id),
    ])
      expect(play(r, ids)).toBe(r);
  });
  it("caps discards at three", () => {
    let r = startBlind(newRun("test"));
    for (let i = 0; i < 3; i++) r = play(r, [r.hand[0].id], true);
    expect(play(r, [r.hand[0].id], true)).toBe(r);
  });
  it("loses when all hands run out", () => {
    let r = startBlind(newRun("test"));
    for (let i = 0; i < 4; i++) r = play(r, [r.hand[0].id]);
    expect(r.stage).toBe("lost");
  });
  it("pays blind reward, unused hands, capped interest, and economy", () => {
    const r = {
      ...startBlind(newRun("test")),
      money: 30,
      hand: cards([10, 11, 12, 13, 14], ["♥", "♥", "♥", "♥", "♥"]),
      jokers: [JOKERS[5]],
    };
    const won = play(
      r,
      r.hand.map((c) => c.id),
    );
    expect(won.stage).toBe("cashout");
    expect(won.reward).toBe(15);
    expect(cashout(won).money).toBe(45);
  });
  it("creates deterministic shops", () =>
    expect(shopOffers(newRun("test"))).toEqual(shopOffers(newRun("test"))));
  it("advances boss into next ante and finishes ante eight", () => {
    expect(nextBlind({ ...newRun("test"), blind: 2 }).ante).toBe(2);
    expect(nextBlind({ ...newRun("test"), ante: 8, blind: 2 }).stage).toBe(
      "won",
    );
  });
});
