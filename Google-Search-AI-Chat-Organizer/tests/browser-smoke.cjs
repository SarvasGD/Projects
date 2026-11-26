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

    try {
      await page.waitForFunction(() => {
        const host = document.querySelector("#google-search-ai-chat-organizer");
        const counts = host && host.shadowRoot && Array.from(host.shadowRoot.querySelectorAll(".chat-row .message-count")).map((node) => node.textContent);
        return counts && counts.includes("2");
      }, { timeout: 10000 });
    } catch (error) {
      const diagnostic = await page.evaluate(() => {
        const host = document.querySelector("#google-search-ai-chat-organizer");
        const diag = document.querySelector("#gsaco-detection-diagnostic");
        return {
          href: location.href,
          title: document.title,
          host: host ? { display: host.style.display, links: Array.from(host.shadowRoot.querySelectorAll(".chat-link")).map((node) => node.textContent), counts: Array.from(host.shadowRoot.querySelectorAll(".message-count")).map((node) => node.textContent) } : null,
          diagnostic: diag ? diag.shadowRoot.textContent : null,
          mainRoles: Array.from(document.querySelectorAll("main [data-message-author-role]")).map((node) => node.getAttribute("data-message-author-role"))
        };
      });
      throw new Error("Conversation capture diagnostics: " + JSON.stringify(diagnostic) + " ; " + error.message);
    }

    const initial = await page.locator("#google-search-ai-chat-organizer").evaluate((host) =>
      Array.from(host.shadowRoot.querySelectorAll(".chat-link")).map((link) => ({
        title: link.textContent,
        key: link.dataset.chatKey
      }))
    );
    assert.deepEqual(initial, [
      { title: "Многоходовой диалог с полным названием строки истории", key: "id:thread-101" },
      { title: "Ещё один диалог", key: "id:123" }
    ], "opened session must update the existing history row, not create a duplicate");


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
    assert.deepEqual(multiTurn, ["Многоходовой диалог с полным названием строки истории"], "2+ filter keeps only the read multi-turn session");

    // External Google-side add/rename/delete should be reflected by MutationObserver sync.
    await page.locator("#google-search-ai-chat-organizer").evaluate((host) => {
      const filter = host.shadowRoot.querySelector("select[aria-label='Фильтр по количеству реплик пользователя']");
      filter.value = "all";
      filter.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.locator("#history-region a[href*='mtid=123']").evaluate((row) => {
      row.textContent = "Переименовано непосредственно в Google";
    });
    await page.locator("#history-region").evaluate((region) => {
      const added = document.createElement("a");
      added.href = "/search?mtid=thread-103";
      added.textContent = "Новый чат из Google";
      region.appendChild(added);
    });
    await page.waitForFunction(() => {
      const host = document.querySelector("#google-search-ai-chat-organizer");
      const names = Array.from(host.shadowRoot.querySelectorAll(".chat-link")).map((link) => link.textContent);
      return names.includes("Переименовано непосредственно в Google") && names.includes("Новый чат из Google");
    }, { timeout: 10000 });
    await page.locator("#history-region a[href*='mtid=123']").evaluate((row) => row.remove());
    await page.waitForFunction(() => {
      const host = document.querySelector("#google-search-ai-chat-organizer");
      return !Array.from(host.shadowRoot.querySelectorAll(".chat-link"))
        .some((link) => link.textContent === "Переименовано непосредственно в Google");
    }, { timeout: 10000 });

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
    console.log("Playwright extension smoke tests passed: mtid identity, explicit DOM ID, user-turn count, filter, external sync, collapse/restore and q-only fallback.");
  } catch (error) {
    console.error(error.stack || error);
    process.exitCode = 1;
  } finally {
    if (context) await context.close();
    fs.rmSync(profilePath, { recursive: true, force: true });
  }
})();
