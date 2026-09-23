import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const errors = [];
const results = [];
for (const [width, height] of [
  [1440, 900],
  [667, 375],
  [740, 360],
  [390, 844],
]) {
  const p = await browser.newPage({ viewport: { width, height } });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await p.getByRole("button", { name: "Play Solo", exact: true }).click();
  await p.getByRole("button", { name: "Deal Me In" }).click();
  await p.getByRole("button", { name: "Select", exact: true }).click();
  // Controlled winning hand: exercise the full UI cash-out/shop cycle.
  await p.evaluate(() => {
    const r = JSON.parse(localStorage.getItem("gb-run-v1"));
    r.hand = [10, 11, 12, 13, 14, 2, 3, 4].map((rank, i) => ({
      rank,
      suit: i < 5 ? "♥" : "♠",
      id: "fixture-" + i,
    }));
    localStorage.setItem("gb-run-v1", JSON.stringify(r));
  });
  await p.reload();
  await p.getByRole("button", { name: "Continue Run" }).click();
  for (const rank of ["A", "K", "Q", "J", "10"])
    await p
      .getByRole("button", { name: rank + " of Hearts", exact: true })
      .click();
  await p.getByRole("button", { name: "Play Hand", exact: true }).click();
  await p.getByText("Well played.", { exact: true }).waitFor();
  await p.getByRole("button", { name: "Cash Out & Shop" }).click();
  await p
    .getByText("A little edge goes a long way.", { exact: true })
    .waitFor();
  await p.screenshot({
    path: `test-results/shop-${width}x${height}.jpg`,
    type: "jpeg",
    quality: 75,
  });
  const buttons = await p
    .locator(".shop-items button,.next-round")
    .evaluateAll((bs) =>
      bs.map((b) => {
        const r = b.getBoundingClientRect();
        return {
          text: b.textContent,
          visible:
            r.x >= 0 &&
            r.y >= 0 &&
            r.right <= innerWidth + 1 &&
            r.bottom <= innerHeight + 1,
        };
      }),
    );
  for (const b of buttons)
    if (!b.visible)
      errors.push(`Shop control clipped at ${width}x${height}: ${b.text}`);
  await p.getByRole("button", { name: "Upgrade · $3" }).click();
  await p.getByRole("button", { name: "Purchased", exact: true }).waitFor();
  const buy = p.getByRole("button", { name: /Buy for/ }).first();
  if (await buy.isEnabled()) await buy.click();
  await p.getByRole("button", { name: "Next Round" }).click();
  await p.getByRole("button", { name: "Select", exact: true }).click();
  if ((await p.locator(".blind-title").textContent()) !== "BIG BLIND")
    errors.push("Did not advance to Big Blind");
  results.push({
    viewport: `${width}x${height}`,
    shop: buttons,
    cashout: "passed",
    upgrade: "passed",
    advance: "passed",
  });
  await p.close();
}
const p = await browser.newPage({ viewport: { width: 844, height: 390 } });
await p.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
await p.evaluate(() => document.fonts.ready);
await p.screenshot({
  path: "test-results/menu-landscape-final.jpg",
  type: "jpeg",
  quality: 75,
});
await p.setViewportSize({ width: 1440, height: 900 });
await p.screenshot({
  path: "test-results/menu-desktop-final.jpg",
  type: "jpeg",
  quality: 75,
});
await browser.close();
writeFileSync(
  "test-results/shop-report.json",
  JSON.stringify({ results, errors }, null, 2),
);
console.log(JSON.stringify({ cases: results.length, errors }));
if (errors.length) process.exitCode = 1;
