import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const browserName = process.env.MUSIC_BROWSER || "msedge";
const base = process.env.TEST_URL || "http://127.0.0.1:5176";
const browser = await (browserName === "webkit" ? webkit : chromium).launch({
  headless: true,
  ...(browserName === "webkit" ? {} : { channel: browserName }),
});
const catalog = JSON.parse(
  "[" +
    readFileSync("src/data/tracks.ts", "utf8")
      .split("= [")[1]
      .split("];")[0]
      .replace(/([a-zA-Z]+):/g, '"$1":')
      .replace(/,\s*}/g, "}")
      .replace(/,\s*$/, "") +
    "]",
);
const credit =
  "Music sourced from Pixabay and StockTune, all royalty-free, titles credited to their original artists.";
const report = [];
try {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 667, height: 375 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(20000);
    const errors = [];
    const missing = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() === 404) missing.push(r.url());
    });
    await page.addInitScript(() => {
      window.__music = [];
      window.__plays = [];
      const NativeAudio = window.Audio;
      window.Audio = function (...args) {
        const a = new NativeAudio(...args);
        window.__music.push(a);
        return a;
      };
      window.Audio.prototype = NativeAudio.prototype;
      const nativePlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        window.__plays.push({
          src: this.src,
          active: navigator.userActivation?.isActive,
        });
        return nativePlay.call(this);
      };
      if (!localStorage.getItem("gb-settings"))
        localStorage.setItem(
          "gb-settings",
          JSON.stringify({
            sound: true,
            music: true,
            musicVolume: 63,
            volume: 60,
            motion: false,
          }),
        );
    });
    await page.goto(base);
    await page
      .getByRole("button", { name: "Play Music", exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(() => window.__plays.length),
      0,
      "Reload must wait for an explicit music click",
    );
    for (const track of catalog) {
      const r = await page.request.get(
        base + "/audio/music/" + encodeURIComponent(track.file),
      );
      assert.equal(r.status(), 200, track.file);
      assert.match(r.headers()["content-type"], /audio/i, track.file);
      assert((await r.body()).length > 100000);
    }
    await page.getByRole("button", { name: "Play Music", exact: true }).click();
    await page.getByRole("button", { name: "Music On", exact: true }).waitFor();
    await page.waitForFunction(
      () => window.__music[0].currentTime > 0.15 && !window.__music[0].paused,
    );
    const first = await page.evaluate(() => ({
      src: window.__music[0].src,
      duration: window.__music[0].duration,
      time: window.__music[0].currentTime,
      active: window.__plays[0].active,
    }));
    assert(first.active, "First play must occur during user activation");
    const toggle = await page
      .getByRole("button", { name: "Music On", exact: true })
      .boundingBox();
    const records = await page
      .getByRole("button", { name: "Go to Records", exact: true })
      .boundingBox();
    assert(
      records.x >= toggle.x + toggle.width &&
        Math.abs(records.y - toggle.y) < 3,
      "Records must be immediately right of toggle",
    );
    await page.getByRole("button", { name: "Music On", exact: true }).click();
    assert(await page.evaluate(() => window.__music[0].paused));
    await page
      .getByRole("button", { name: "Play Music", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Go to Records", exact: true })
      .click();
    await page.getByRole("heading", { name: "Records", exact: true }).waitFor();
    const names = await page.locator(".record-title").allTextContents();
    assert.deepEqual(
      names,
      catalog.map((t) => t.title),
    );
    assert.deepEqual(
      await page.locator(".record-duration").allTextContents(),
      catalog.map((t) => t.duration),
    );
    assert(
      !(await page
        .locator(".record-list")
        .innerText()
        .then((t) => /\.mp3|Pixabay|StockTune/.test(t))),
    );
    const footer = page.getByText(credit, { exact: true });
    await footer.waitFor();
    const visibleCredit = await footer.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
    });
    assert(visibleCredit, "Credit must stay visible");
    const durations = [];
    for (let i = 0; i < catalog.length; i++) {
      await page.locator(".record-row").nth(i).click();
      await page.waitForFunction(
        (file) =>
          window.__music[0].src.endsWith(file) &&
          !window.__music[0].paused &&
          window.__music[0].currentTime > 0.1,
        catalog[i].file,
      );
      assert.equal(
        await page.locator(".record-row.playing .record-title").textContent(),
        catalog[i].title,
      );
      durations.push(await page.evaluate(() => window.__music[0].duration));
    }
    const beforeRepeat = await page.evaluate(() => ({
      time: window.__music[0].currentTime,
      plays: window.__plays.length,
    }));
    await page.locator(".record-row").last().click();
    assert.equal(
      await page.evaluate(() => window.__plays.length),
      beforeRepeat.plays,
    );
    assert(
      (await page.evaluate(() => window.__music[0].currentTime)) >=
        beforeRepeat.time,
    );
    // Keyboard arrow focus + native Enter click.
    await page.locator(".record-row").first().focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      (file) =>
        window.__music[0].src.endsWith(file) && !window.__music[0].paused,
      catalog[1].file,
    );
    const chosen = await page.evaluate(() => window.__music[0].src);
    const played = [chosen];
    for (let i = 0; i < 5; i++) {
      const last = played.at(-1);
      await page.evaluate(() =>
        window.__music[0].dispatchEvent(new Event("ended")),
      );
      await page.waitForFunction(
        (old) =>
          window.__music[0].src !== old &&
          window.__music[0].currentSrc === window.__music[0].src &&
          window.__music[0].readyState >= 3 &&
          !window.__music[0].paused,
        last,
      );
      played.push(await page.evaluate(() => window.__music[0].src));
    }
    assert.equal(
      new Set(played).size,
      6,
      "All six songs must play before repeating",
    );
    const last = played.at(-1);
    await page.waitForFunction(
      () =>
        Number.isFinite(window.__music[0].duration) &&
        window.__music[0].readyState >= 3 &&
        window.__music[0].currentSrc === window.__music[0].src,
    );
    await page.evaluate(
      () => (window.__music[0].currentTime = window.__music[0].duration - 0.18),
    );
    await page.waitForFunction(
      (old) =>
        window.__music[0].src !== old &&
        window.__music[0].currentSrc === window.__music[0].src &&
        window.__music[0].readyState >= 3 &&
        !window.__music[0].paused,
      last,
    ); // Real media-ended event.
    await page.screenshot({
      path: `test-results/records-${browserName}-${viewport.width}x${viewport.height}.jpg`,
      type: "jpeg",
      quality: 75,
    });
    await page.getByRole("button", { name: "Back", exact: true }).click();
    const continuity = await page.evaluate(() => ({
      src: window.__music[0].src,
      plays: window.__plays.length,
      time: window.__music[0].currentTime,
    }));
    await page.getByRole("button", { name: "Play Solo", exact: true }).click();
    await page.getByRole("button", { name: "Deal Me In" }).click();
    await page.getByRole("button", { name: "Select", exact: true }).click();
    await page
      .getByRole("button", { name: "Go to Records", exact: true })
      .click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.locator(".card-hand").waitFor();
    assert.equal(await page.evaluate(() => window.__music.length), 1);
    assert.equal(
      await page.evaluate(() => window.__plays.length),
      continuity.plays,
    );
    assert.equal(
      await page.evaluate(() => window.__music[0].src),
      continuity.src,
    );
    assert(
      (await page.evaluate(() => window.__music[0].currentTime)) >
        continuity.time,
    );
    await page.getByRole("button", { name: "Mute sound" }).click();
    assert(await page.evaluate(() => window.__music[0].muted));
    await page.getByRole("button", { name: "Enable sound" }).click();
    assert(!(await page.evaluate(() => window.__music[0].muted)));
    await page
      .locator(".topbar")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    await page.getByRole("slider", { name: "Music volume" }).fill("23");
    await page.waitForFunction(
      () => Math.abs(window.__music[0].volume - 0.23) < 0.001,
    );
    await page.getByRole("button", { name: "Close dialog" }).click();
    assert.equal(await page.evaluate(() => window.__music.length), 1);
    // Enter a controlled shop fixture, then test continuity into the next round.
    await page.evaluate(() => {
      const r = JSON.parse(localStorage.getItem("gb-run-v1"));
      r.stage = "shop";
      r.offers = [];
      localStorage.setItem("gb-run-v1", JSON.stringify(r));
    });
    await page.reload();
    assert.equal(await page.evaluate(() => window.__plays.length), 0);
    await page.getByRole("button", { name: "Play Music", exact: true }).click();
    await page.getByRole("button", { name: "Music On", exact: true }).waitFor();
    await page.getByRole("button", { name: "Continue Run" }).click();
    await page
      .getByText("A little edge goes a long way.", { exact: true })
      .waitFor();
    const shop = await page.evaluate(() => ({
      src: window.__music[0].src,
      plays: window.__plays.length,
    }));
    await page
      .getByRole("button", { name: "Go to Records", exact: true })
      .click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page
      .getByText("A little edge goes a long way.", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Next Round" }).click();
    assert.equal(await page.evaluate(() => window.__music[0].src), shop.src);
    assert.equal(await page.evaluate(() => window.__plays.length), shop.plays);
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("gb-settings")).musicVolume,
      ),
      23,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    report.push({
      browser: browserName,
      viewport,
      files: 6,
      durations,
      firstClick: true,
      shuffle: true,
      realEnded: true,
      continuity: true,
      creditVisible: true,
      keyboard: true,
      muteVolume: true,
      errors,
      missing,
    });
    await page.close();
  }
} finally {
  await browser.close();
  mkdirSync("test-results", { recursive: true });
  writeFileSync(
    `test-results/music-${browserName}.json`,
    JSON.stringify(report, null, 2),
  );
}
console.log(JSON.stringify(report, null, 2));
