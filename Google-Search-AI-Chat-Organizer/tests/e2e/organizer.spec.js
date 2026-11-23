const { test, expect, chromium } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const extensionPath = path.resolve(__dirname, "../..");

function fixtureHtml(options) {
  const stableRow = options.stable
    ? '<a class="history-row" href="/search?q=first&udm=50&mtid=thread-123"><span>chat_bubble</span><span>Подтверждённый диалог</span></a>'
    : "";
  const unknownRow = options.includeUnknown
    ? '<div class="history-row" role="button" tabindex="0"><span>Одиночный поисковый запрос</span></div>'
    : "";

  return [
    "<!doctype html>",
    '<html><head><meta charset="utf-8"><title>Google Search fixture</title>',
    "<style>",
    "html,body{margin:0;min-height:100%;font:14px Arial,sans-serif}",
    "nav{position:fixed;left:0;top:0;width:261px;height:995px;background:#202124;color:white}",
    "nav .nav-link{display:block;height:40px;width:241px;margin-left:8px}",
    "#scroller{position:absolute;left:8px;top:166px;width:241px;height:780px;overflow-y:auto}",
    "#scroll-inner{min-height:8572px;width:241px}",
    "#recent{display:block;width:240px;height:40px;cursor:pointer}",
    ".history-row{display:block;width:241px;height:40px;line-height:40px;cursor:pointer;color:white}",
    "main{margin-left:300px;padding:40px}",
    "</style></head><body>",
    "<nav>",
    '<a class="nav-link" href="/">Новый чат</a>',
    '<div class="nav-link" role="button">Поиск цепочек</div>',
    '<div id="scroller"><div id="scroll-inner">',
    '<button id="recent" role="button">Недавнее</button>',
    stableRow,
    unknownRow,
    "</div></div>",
    '<div class="nav-link" role="button">Настройки</div>',
    "</nav>",
    "<main>",
    '<section data-message-author-role="user">PRIVATE USER CONTENT</section>',
    '<section data-message-author-role="assistant">PRIVATE ASSISTANT CONTENT</section>',
    '<section data-message-author-role="user">PRIVATE FOLLOW-UP CONTENT</section>',
    "</main></body></html>"
  ].join("");
}

async function launchExtension() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsaco-pw-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [
      "--disable-extensions-except=" + extensionPath,
      "--load-extension=" + extensionPath
    ]
  });

  return {
    context,
    cleanup: async () => {
      await context.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  };
}

async function openFixture(context, url, options) {
  await context.route("https://www.google.com/search?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: fixtureHtml(options)
    })
  );

  const page = await context.newPage();
  await page.goto(url);
  return page;
}

test("MV3 extension mounts on AI Mode, isolates unknown rows and restores native history", async () => {
  const launched = await launchExtension();
  try {
    const page = await openFixture(
      launched.context,
      "https://www.google.com/search?udm=50&q=fixture",
      { stable: true, includeUnknown: true }
    );

    const host = page.locator("#google-search-ai-chat-organizer");
    await expect(host).toBeVisible({ timeout: 10000 });

    await expect.poll(
      () => page.locator("#scroller").evaluate((el) => getComputedStyle(el).visibility),
      { timeout: 10000 }
    ).toBe("hidden");

    const state = await host.evaluate((el) => {
      const root = el.shadowRoot;
      return {
        confirmed: root.querySelectorAll(".folder.unassigned .chat-row").length,
        unclassified: root.querySelectorAll(".folder.unclassified .chat-row").length,
        status: root.querySelector(".status") ? root.querySelector(".status").textContent : "",
        position: el.style.position,
        left: el.style.left,
        top: el.style.top,
        width: el.style.width,
        height: el.style.height
      };
    });

    expect(state.confirmed).toBe(1);
    expect(state.unclassified).toBe(1);
    expect(state.status).toContain("1 подтверждено");
    expect(state.position).toBe("fixed");
    expect(state.left).toBe("8px");
    expect(state.top).toBe("166px");
    expect(state.width).toBe("241px");
    expect(state.height).toBe("780px");

    await page.evaluate(() => {
      window.__nativeRowClicks = 0;
      document.querySelector("#scroller a.history-row").addEventListener("click", (event) => {
        event.preventDefault();
        window.__nativeRowClicks += 1;
      });
    });

    await host.evaluate((el) => {
      el.shadowRoot.querySelector(".folder.unassigned .chat-link").click();
    });
    await expect.poll(() => page.evaluate(() => window.__nativeRowClicks)).toBe(1);

    await host.evaluate((el) => {
      el.shadowRoot.querySelector('button[title="Свернуть органайзер и показать родной список Google"]').click();
    });
    await expect.poll(
      () => page.locator("#scroller").evaluate((el) => getComputedStyle(el).visibility)
    ).not.toBe("hidden");
  } finally {
    await launched.cleanup();
  }
});

test("ordinary Google Search never mounts or hides the organizer history", async () => {
  const launched = await launchExtension();
  try {
    const page = await openFixture(
      launched.context,
      "https://www.google.com/search?q=ordinary-search",
      { stable: true, includeUnknown: true }
    );

    await page.waitForTimeout(1200);
    await expect(page.locator("#google-search-ai-chat-organizer")).toHaveCount(0);
    await expect(page.locator("#scroller")).toHaveCSS("visibility", "visible");
  } finally {
    await launched.cleanup();
  }
});

test("AI Mode with only unclassified rows never creates active chat records", async () => {
  const launched = await launchExtension();
  try {
    const page = await openFixture(
      launched.context,
      "https://www.google.com/search?udm=50&q=single-turn",
      { stable: false, includeUnknown: true }
    );

    const host = page.locator("#google-search-ai-chat-organizer");
    await expect(host).toBeVisible({ timeout: 10000 });
    await expect.poll(
      () => host.evaluate((el) =>
        el.shadowRoot.querySelectorAll(".folder.unclassified .chat-row").length
      )
    ).toBe(1);

    const activeCount = await host.evaluate((el) =>
      el.shadowRoot.querySelectorAll(".folder.unassigned .chat-row").length
    );
    expect(activeCount).toBe(0);
  } finally {
    await launched.cleanup();
  }
});
