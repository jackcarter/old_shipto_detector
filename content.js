const SETTINGS_KEY = "shiptoSentinelSettings";
const SETTINGS_VERSION = 2;
const DEFAULT_IGNORED_DOMAINS = [
  "gmail.com",
  "mail.google.com",
  "googlemail.com",
  "outlook.live.com",
  "outlook.office.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "mail.yahoo.com",
  "yahoo.com",
  "icloud.com",
  "mail.com",
  "proton.me",
  "mail.proton.me",
  "protonmail.com",
  "fastmail.com",
  "aol.com",
  "mail.aol.com",
  "gmx.com",
  "hey.com"
];
const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  enabled: true,
  addresses: [
    "123 main st",
    "123 main street",
    "456 elm ave",
    "456 elm avenue",
    "apt 9b"
  ],
  ignoredDomains: [...DEFAULT_IGNORED_DOMAINS]
};

const BANNER_ID = "shipto-sentinel-banner-host";
const MAX_TEXT_LENGTH = 40000;
const CHECK_DEBOUNCE_MS = 350;

let hiddenForPage = false;
let checkTimer = null;
let observer = null;
let currentMatchSignature = "";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function baseDomain(hostname) {
  const parts = String(hostname || "").toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) {
    return parts.join(".");
  }

  return parts.slice(-2).join(".");
}

function normalizeDomain(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function isIgnoredDomain(hostname, ignoredDomains) {
  const normalizedHost = normalizeDomain(hostname);
  return ignoredDomains.some((domain) => {
    const ignored = normalizeDomain(domain);
    return normalizedHost === ignored || normalizedHost.endsWith(`.${ignored}`);
  });
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function sanitizeSettings(rawSettings) {
  const source = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
  const rawAddresses = Array.isArray(source.addresses) ? source.addresses : DEFAULT_SETTINGS.addresses;
  const migratedAddresses = rawAddresses.flatMap((entry) => {
    if (typeof entry === "string") {
      return [normalizeText(entry)];
    }

    if (Array.isArray(entry?.patterns)) {
      return entry.patterns.map((pattern) => normalizeText(pattern));
    }

    return [];
  });
  const storedIgnoredDomains = Array.isArray(source.ignoredDomains)
    ? source.ignoredDomains.map((domain) => normalizeDomain(domain)).filter(Boolean)
    : [];
  const ignoredDomains =
    source.version === SETTINGS_VERSION
      ? storedIgnoredDomains
      : uniqueStrings([...DEFAULT_IGNORED_DOMAINS, ...storedIgnoredDomains]);

  return {
    version: SETTINGS_VERSION,
    enabled: source.enabled !== false,
    addresses: uniqueStrings(migratedAddresses.filter(Boolean)),
    ignoredDomains
  };
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  return sanitizeSettings(stored[SETTINGS_KEY]);
}

async function saveSettings(settings) {
  await chrome.storage.sync.set({
    [SETTINGS_KEY]: sanitizeSettings(settings)
  });
}

function collectPageText() {
  const chunks = [];
  const bodyText = normalizeText(document.body?.innerText || "");
  if (bodyText) {
    chunks.push(bodyText);
  }

  const fields = Array.from(
    document.querySelectorAll("input, textarea, select, [contenteditable='true']")
  );

  for (const field of fields) {
    const attrParts = [
      field.value,
      field.placeholder,
      field.getAttribute("aria-label"),
      field.getAttribute("name"),
      field.getAttribute("autocomplete"),
      field.getAttribute("data-testid")
    ];

    if (field.id) {
      const label = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
      if (label?.innerText) {
        attrParts.push(label.innerText);
      }
    }

    const text = normalizeText(attrParts.filter(Boolean).join(" "));
    if (text) {
      chunks.push(text);
    }
  }

  return chunks.join(" ").slice(0, MAX_TEXT_LENGTH);
}

function removeBanner() {
  const existing = document.getElementById(BANNER_ID);
  if (existing) {
    existing.remove();
  }

  currentMatchSignature = "";
}

function buildBanner(match) {
  const host = document.createElement("div");
  host.id = BANNER_ID;
  const shadowRoot = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
    }

    .panel {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 2147483647;
      width: min(360px, calc(100vw - 24px));
      background: linear-gradient(145deg, #10213b 0%, #1c3558 55%, #24476d 100%);
      color: #f9fafb;
      border-radius: 18px;
      box-shadow: 0 18px 40px rgba(11, 24, 42, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.14);
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow: hidden;
    }

    .topline {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 18px 8px;
    }

    .badge {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(160deg, #ef4444 0%, #f97316 100%);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
      font-size: 18px;
    }

    .eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #fdba74;
      margin-bottom: 3px;
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      line-height: 1.25;
      margin: 0;
    }

    .body {
      padding: 0 18px 16px;
      color: #dbe7f3;
      font-size: 13px;
      line-height: 1.5;
    }

    .match {
      color: #fff;
      font-weight: 700;
    }

    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding: 0 18px 18px;
    }

    button {
      appearance: none;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      padding: 11px 12px;
      transition: transform 120ms ease, opacity 120ms ease, background 120ms ease;
    }

    button:hover {
      transform: translateY(-1px);
    }

    button.primary {
      background: linear-gradient(145deg, #fb923c 0%, #f97316 100%);
      color: #1f2937;
    }

    button.secondary {
      background: rgba(255, 255, 255, 0.12);
      color: #f9fafb;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 0 18px 16px;
    }

    .footer button {
      flex: 1;
      padding: 0;
      background: transparent;
      color: #cbd5e1;
      font-size: 12px;
      text-align: left;
    }
  `;

  const wrapper = document.createElement("div");
  wrapper.className = "panel";
  wrapper.innerHTML = `
    <div class="topline">
      <div class="badge">!</div>
      <div>
        <div class="eyebrow">Old Address Detector</div>
        <p class="title">Watchlisted shipping address detected</p>
      </div>
    </div>
    <div class="body">
      Found a watchlisted address string on this page.
      Matching text: <span class="match">"${match.pattern}"</span>.
    </div>
    <div class="actions">
      <button class="primary" data-action="manage">Manage addresses</button>
      <button class="secondary" data-action="ignore">Ignore this site</button>
    </div>
    <div class="footer">
      <button type="button" data-action="pause">Pause extension</button>
      <button type="button" data-action="dismiss" style="text-align:right;">Hide for now</button>
    </div>
  `;

  wrapper.addEventListener("click", async (event) => {
    const target = event.target.closest("button[data-action]");
    if (!target) {
      return;
    }

    const action = target.getAttribute("data-action");

    if (action === "dismiss") {
      hiddenForPage = true;
      removeBanner();
      return;
    }

    if (action === "ignore") {
      const settings = await loadSettings();
      const domain = baseDomain(location.hostname);

      if (!settings.ignoredDomains.includes(domain)) {
        settings.ignoredDomains.push(domain);
        await saveSettings(settings);
      }

      removeBanner();
      return;
    }

    if (action === "pause") {
      const settings = await loadSettings();
      settings.enabled = false;
      await saveSettings(settings);
      removeBanner();
      return;
    }

    if (action === "manage") {
      chrome.runtime.sendMessage({ type: "open-options-page" });
    }
  });

  shadowRoot.append(style, wrapper);
  return host;
}

function showBanner(match) {
  if (!document.body || hiddenForPage) {
    return;
  }

  const signature = `${match.label}:${match.pattern}`;
  if (currentMatchSignature === signature && document.getElementById(BANNER_ID)) {
    return;
  }

  removeBanner();
  currentMatchSignature = signature;
  document.documentElement.appendChild(buildBanner(match));
}

function findMatch(pageText, settings) {
  for (const pattern of settings.addresses) {
    if (pageText.includes(pattern)) {
      return { pattern };
    }
  }

  return null;
}

async function runCheck() {
  if (!document.body) {
    return;
  }

  const settings = await loadSettings();
  const domain = location.hostname;

  if (!settings.enabled || isIgnoredDomain(domain, settings.ignoredDomains)) {
    removeBanner();
    return;
  }

  const pageText = collectPageText();
  if (!pageText) {
    removeBanner();
    return;
  }

  const match = findMatch(pageText, settings);
  if (match) {
    showBanner(match);
    return;
  }

  removeBanner();
}

function scheduleCheck() {
  window.clearTimeout(checkTimer);
  checkTimer = window.setTimeout(() => {
    runCheck().catch((error) => {
      console.error("Old Address Detector check failed", error);
    });
  }, CHECK_DEBOUNCE_MS);
}

function startObserver() {
  if (!document.body) {
    return;
  }

  observer = new MutationObserver(() => {
    scheduleCheck();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["value", "placeholder", "aria-label"]
  });

  document.addEventListener("input", scheduleCheck, true);
  document.addEventListener("change", scheduleCheck, true);
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !changes[SETTINGS_KEY]) {
    return;
  }

  hiddenForPage = false;
  scheduleCheck();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "shipto:get-page-status") {
    loadSettings()
      .then((settings) => {
        const domain = baseDomain(location.hostname);
        const pageText = collectPageText();
        const match = findMatch(pageText, settings);

        sendResponse({
          domain: baseDomain(domain),
          enabled: settings.enabled,
          ignored: isIgnoredDomain(domain, settings.ignoredDomains),
          watchCount: settings.addresses.length,
          match
        });
      })
      .catch((error) => {
        console.error("Old Address Detector status lookup failed", error);
        sendResponse({
          domain: baseDomain(location.hostname),
          enabled: true,
          ignored: false,
          watchCount: DEFAULT_SETTINGS.addresses.length,
          match: null
        });
      });

    return true;
  }

  return false;
});

function init() {
  scheduleCheck();

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        scheduleCheck();
        startObserver();
      },
      { once: true }
    );
    return;
  }

  startObserver();
}

init();
