const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

const extensionPath = path.resolve(__dirname, "..");
const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), "gsaco-extension-test-"));
const stableHtml = fs.readFileSync(path.join(__dirname, "fixtures", "history-stable-id.html"), "utf8");
const qOnlyHtml = fs.readFileSync(path.join(__dirname, "fixtures", "history-q-only.html"), "utf8");

async function routeFixture(page, html) {
  await page.route("https://www.google.com/search**", (route) => route.fulfill({
    status: 200,
    contentType: "text/html; charset=utf-8",
    body: html
  }));
}

async function waitForOrganizer(page, expectedDisplay) {
  await page.waitForSelector("#google-search-ai-chat-organizer", { state: "attached", timeout: 15000 });
  await page.waitForFunction((display) => {
    const host = document.querySelector("#google-search-ai-chat-organizer");
    return host && host.style.display === display;
  }, expectedDisplay, { timeout: 15000 });
}

(async () => {
  let context;
  try {
    context = await chromium.launchPersistentContext(profilePath, {
      headless: false,
      viewport: { width: 1280, height: 900 },
      locale: "ru-RU",
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions-except=" + extensionPath,
        "--load-extension=" + extensionPath
      ]
    });

    const page = await context.newPage();
    const browserErrors = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));

    // Stable-ID history plus a real-looking open multi-turn AI Mode conversation.
    await routeFixture(page, stableHtml);
    await page.goto("https://www.google.com/search?udm=50&q=fixture#thread=thread-101", { waitUntil: "domcontentloaded" });
    await waitForOrganizer(page, "block");

    await page.waitForFunction(() => {
      const host = document.querySelector("#google-search-ai-chat-organizer");
      const count = host && host.shadowRoot && host.shadowRoot.querySelector(".chat-row .message-count");
      return count && count.textContent === "2";
    }, { timeout: 10000 });

    const initial = await page.locator("#google-search-ai-chat-organizer").evaluate((host) =>
      Array.from(host.shadowRoot.querySelectorAll(".chat-link")).map((link) => link.textContent)
    );
    assert.deepEqual(initial, ["Многоходовой диалог", "Ещё один диалог"]);

    const nativeVisibility = await page.locator("#history-region").evaluate((node) => getComputedStyle(node).visibility);
    assert.equal(nativeVisibility, "hidden", "native history is hidden only after the stable-ID scan");

    await page.locator("#google-search-ai-chat-organizer").evaluate((host) => {
      const filter = host.shadowRoot.querySelector("select[aria-label='Фильтр по количеству реплик пользователя']");
      filter.value = "multi";
      filter.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const multiTurn = await page.locator("#google-search-ai-chat-organizer").evaluate((host) =>
      Array.from(host.shadowRoot.querySelectorAll(".chat-link")).map((link) => link.textContent)
    );
    assert.deepEqual(multiTurn, ["Многоходовой диалог"], "2+ filter keeps only the read multi-turn session");

    // Collapse/restore must reveal the native Google list, then reopen the organizer.
    await page.locator("#google-search-ai-chat-organizer").evaluate((host) => {
      const button = Array.from(host.shadowRoot.querySelectorAll("button"))
        .find((node) => node.title.includes("Свернуть органайзер"));
      button.click();
    });
    await page.waitForFunction(() =>
      getComputedStyle(document.querySelector("#history-region")).visibility !== "hidden"
    );
    await page.locator("#google-search-ai-chat-organizer").evaluate((host) => {
      const button = host.shadowRoot.querySelector(".bar");
      button.click();
    });
    await page.waitForFunction(() =>
      getComputedStyle(document.querySelector("#history-region")).visibility === "hidden"
    );

    // q + udm without a thread identity is not a conversation and must not be covered.
    const qPage = await context.newPage();
    await routeFixture(qPage, qOnlyHtml);
    await qPage.goto("https://www.google.com/search?udm=50&q=single%20prompt", { waitUntil: "domcontentloaded" });
    await waitForOrganizer(qPage, "none");
    const qNativeVisibility = await qPage.locator("#history-region").evaluate((node) => getComputedStyle(node).visibility);
    assert.notEqual(qNativeVisibility, "hidden", "native list stays visible for unclassified rows");

    if (browserErrors.length) throw new Error("Browser page errors: " + browserErrors.join(" | "));
    console.log("Playwright extension smoke tests passed: stable identity, user-turn count, filter, collapse/restore and q-only native fallback.");
  } catch (error) {
    console.error(error.stack || error);
    process.exitCode = 1;
  } finally {
    if (context) await context.close();
    fs.rmSync(profilePath, { recursive: true, force: true });
  }
})();
