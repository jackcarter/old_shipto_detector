import {
  baseDomain,
  isIgnoredDomain,
  loadSettings,
  saveSettings
} from "./shared/settings.js";

const currentDomainNode = document.getElementById("current-domain");
const watchCountNode = document.getElementById("watch-count");
const matchStatusNode = document.getElementById("match-status");
const enabledToggle = document.getElementById("enabled-toggle");
const ignoreSiteButton = document.getElementById("ignore-site-button");
const optionsButton = document.getElementById("options-button");
const messageNode = document.getElementById("message");

let activeTab = null;

function setMessage(text) {
  messageNode.textContent = text || "";
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function getPageStatus(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "shipto:get-page-status" });
  } catch {
    return null;
  }
}

async function render() {
  const settings = await loadSettings();
  activeTab = await getActiveTab();
  const domain = activeTab?.url ? baseDomain(new URL(activeTab.url).hostname) : "Unsupported page";
  const pageStatus = activeTab?.id ? await getPageStatus(activeTab.id) : null;
  const hostname = activeTab?.url ? new URL(activeTab.url).hostname : "";

  currentDomainNode.textContent = domain;
  watchCountNode.textContent = String(settings.addresses.length);
  enabledToggle.checked = settings.enabled;

  const ignored = pageStatus?.ignored || isIgnoredDomain(hostname || domain, settings.ignoredDomains);
  const matched = pageStatus?.match;
  ignoreSiteButton.textContent = ignored ? "Site ignored" : "Ignore this site";
  ignoreSiteButton.disabled = !settings.enabled || ignored || !activeTab?.id;

  if (!settings.enabled) {
    matchStatusNode.textContent = "Paused";
  } else if (ignored) {
    matchStatusNode.textContent = "Ignored on this domain";
  } else if (matched) {
    matchStatusNode.textContent = `Matched "${matched.pattern}"`;
  } else if (pageStatus) {
    matchStatusNode.textContent = "No watchlist matches";
  } else {
    matchStatusNode.textContent = "Open a normal website tab";
  }
}

enabledToggle.addEventListener("change", async () => {
  const settings = await loadSettings();
  settings.enabled = enabledToggle.checked;
  await saveSettings(settings);
  setMessage(settings.enabled ? "Scanning resumed." : "Scanning paused.");
  await render();
});

ignoreSiteButton.addEventListener("click", async () => {
  if (!activeTab?.url) {
    return;
  }

  const settings = await loadSettings();
  const domain = baseDomain(new URL(activeTab.url).hostname);

  if (!settings.ignoredDomains.includes(domain)) {
    settings.ignoredDomains.push(domain);
    await saveSettings(settings);
  }

  setMessage(`Ignoring ${domain}.`);
  await render();
});

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

render().catch((error) => {
  console.error("Old Address Detector popup failed to render", error);
  setMessage("Unable to load status.");
});
