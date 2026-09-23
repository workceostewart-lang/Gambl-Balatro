import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({
  headless: true,
  channel: process.platform === "win32" ? "msedge" : undefined,
});
const results = [];
for (const viewport of [
  { width: 1280, height: 720 },
  { width: 667, height: 375 },
  { width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__meters = [];
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (destination, ...rest) {
      if (destination instanceof AudioDestinationNode) {
        const meter = this.context.createAnalyser();
        meter.fftSize = 2048;
        connect.call(this, meter);
        window.__meters.push(meter);
      }
      return connect.call(this, destination, ...rest);
    };
    if (!localStorage.getItem("gb-settings"))
      localStorage.setItem(
        "gb-settings",
        JSON.stringify({ sound: true, motion: false, volume: 60 }),
      );
  });
  const rms = () =>
    page.evaluate(() => {
      const m = window.__meters[0];
      if (!m) return 0;
      const data = new Float32Array(m.fftSize);
      m.getFloatTimeDomainData(data);
      return Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);
    });
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5176");
  await page.getByRole("button", { name: "Play music", exact: true }).click();
  await page
    .getByRole("button", { name: "Pause music", exact: true })
    .waitFor();
  await page.waitForTimeout(1400);
  const playing = await rms();
  assert(playing > 0.001, "Music must produce non-silent output: " + playing);
  await page.getByRole("button", { name: "Pause music", exact: true }).click();
  await page.waitForTimeout(1200);
  const muted = await rms();
  assert(muted < 0.0001, "Mute must silence output: " + muted);
  await page.getByRole("button", { name: "Play music", exact: true }).click();
  await page
    .getByRole("button", { name: "Pause music", exact: true })
    .waitFor();
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  const volume = page.getByRole("slider", { name: "Music volume" });
  await volume.fill("0");
  await volume.dispatchEvent("input");
  await page.waitForTimeout(1200);
  assert((await rms()) < 0.0001, "Zero volume must silence music");
  await volume.fill("70");
  await volume.dispatchEvent("input");
  await page.waitForTimeout(1200);
  assert((await rms()) > 0.001, "Restoring volume must restore audio");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Mute sound" }).click();
  await page.waitForTimeout(1200);
  assert((await rms()) < 0.0001, "Master mute must silence music");
  await page.getByRole("button", { name: "Enable sound" }).click();
  await page.waitForTimeout(1200);
  assert((await rms()) > 0.001, "Master unmute must restore music");
  await page.reload();
  await page.getByRole("button", { name: "Play Solo", exact: true }).click();
  await page
    .getByRole("button", { name: "Pause music", exact: true })
    .waitFor();
  await page.waitForTimeout(1200);
  assert((await rms()) > 0.001, "Any first interaction must unlock audio");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("gb-settings")),
  );
  assert.equal(saved.musicVolume, 70);
  assert.equal(saved.music, true);
  assert.equal(errors.length, 0);
  results.push({
    viewport,
    playingRms: playing,
    mutedRms: muted,
    persistence: "passed",
    gesture: "passed",
    errors,
  });
  await page.close();
}
await browser.close();
mkdirSync("test-results", { recursive: true });
writeFileSync(
  "test-results/music-report.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
