import {
  loadSettings,
  saveSettings
} from "./shared/settings.js";

const enabledToggle = document.getElementById("enabled-toggle");
const addressForm = document.getElementById("address-form");
const addressesInput = document.getElementById("addresses-input");
const ignoredSitesList = document.getElementById("ignored-sites-list");
const saveMessage = document.getElementById("save-message");
const exportButton = document.getElementById("export-button");

let currentSettings = null;

function flashMessage(text) {
  saveMessage.textContent = text;
  window.clearTimeout(flashMessage.timer);
  flashMessage.timer = window.setTimeout(() => {
    saveMessage.textContent = "";
  }, 2400);
}

function renderIgnoredSites() {
  if (!currentSettings.ignoredDomains.length) {
    ignoredSitesList.innerHTML = `<div class="empty-state">No ignored domains.</div>`;
    return;
  }

  ignoredSitesList.innerHTML = "";

  currentSettings.ignoredDomains.forEach((domain) => {
    const row = document.createElement("div");
    row.className = "pill";
    row.innerHTML = `
      <span>${domain}</span>
      <button type="button" aria-label="Remove ${domain}">Remove</button>
    `;

    row.querySelector("button").addEventListener("click", async () => {
      currentSettings.ignoredDomains = currentSettings.ignoredDomains.filter((item) => item !== domain);
      currentSettings = await saveSettings(currentSettings);
      render();
      flashMessage(`Re-enabled ${domain}.`);
    });

    ignoredSitesList.appendChild(row);
  });
}

function render() {
  enabledToggle.checked = currentSettings.enabled;
  addressesInput.value = currentSettings.addresses.join("\n");
  renderIgnoredSites();
}

enabledToggle.addEventListener("change", async () => {
  currentSettings.enabled = enabledToggle.checked;
  currentSettings = await saveSettings(currentSettings);
  flashMessage(currentSettings.enabled ? "Scanning enabled." : "Scanning paused.");
});

addressForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  currentSettings.addresses = addressesInput.value
    .split("\n")
    .map((pattern) => pattern.trim())
    .filter(Boolean);

  if (!currentSettings.addresses.length) {
    flashMessage("Add at least one address string.");
    return;
  }

  currentSettings = await saveSettings(currentSettings);
  render();
  flashMessage("Saved address list.");
});

exportButton.addEventListener("click", async () => {
  const blob = new Blob([JSON.stringify(currentSettings, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "old-address-detector-settings.json";
  anchor.click();
  URL.revokeObjectURL(url);
});

loadSettings()
  .then((settings) => {
    currentSettings = settings;
    render();
  })
  .catch((error) => {
    console.error("Old Address Detector options failed to load", error);
    flashMessage("Unable to load settings.");
  });
