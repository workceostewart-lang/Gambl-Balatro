import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const cards = () =>
  page
    .locator(".game-card")
    .evaluateAll((cs) =>
      cs.map((c) => ({
        slug: c.dataset.game,
        title: c.querySelector("h3,h2")?.textContent,
        url: c.querySelector("a")?.getAttribute("href"),
      })),
    );
await page.goto("https://fantomzone.app");
await page.waitForSelector(".game-card");
const before = await cards();
await page.goto("http://127.0.0.1:5174");
await page.waitForSelector('[data-game="gamble-balatro"]');
const after = await cards();
for (const old of before) {
  const next = after.find((c) => c.slug === old.slug);
  if (!next || next.title !== old.title || next.url !== old.url)
    throw Error("Existing game changed: " + old.slug);
}
const tile = page.locator('[data-game="gamble-balatro"]');
await tile.locator("img").evaluate((img) => img.decode());
const image = await tile
  .locator("img")
  .evaluate((img) => ({
    width: img.naturalWidth,
    height: img.naturalHeight,
    src: img.getAttribute("src"),
  }));
if (!image.width) throw Error("Cover failed");
if (
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
)
  throw Error("Hub overflows mobile viewport");
await tile.screenshot({
  path: "test-results/hub-tile.jpg",
  type: "jpeg",
  quality: 80,
});
await tile.locator("a").click();
await page.waitForURL("https://balatro.fantomzone.app/");
await page.getByRole("button", { name: "Play Solo", exact: true }).waitFor();
writeFileSync(
  "test-results/hub-report.json",
  JSON.stringify(
    {
      existingGamesPreserved: before.length,
      newGame: after.find((c) => c.slug === "gamble-balatro"),
      cover: image,
      mobileNavigation: "passed",
      baseline: before,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    existingGamesPreserved: before.length,
    cover: image,
    mobileNavigation: "passed",
  }),
);
await browser.close();
