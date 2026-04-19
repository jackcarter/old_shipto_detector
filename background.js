import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  sanitizeSettings
} from "./shared/settings.js";

async function ensureSettings() {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const merged = sanitizeSettings(stored[SETTINGS_KEY] || DEFAULT_SETTINGS);

  if (!stored[SETTINGS_KEY]) {
    await chrome.storage.sync.set({ [SETTINGS_KEY]: merged });
    return;
  }

  if (JSON.stringify(stored[SETTINGS_KEY]) !== JSON.stringify(merged)) {
    await chrome.storage.sync.set({ [SETTINGS_KEY]: merged });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureSettings().catch((error) => {
    console.error("Old Address Detector failed to initialize settings", error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  ensureSettings().catch((error) => {
    console.error("Old Address Detector failed to validate settings", error);
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "open-options-page") {
    chrome.runtime.openOptionsPage().then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
