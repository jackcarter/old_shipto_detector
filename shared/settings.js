export const SETTINGS_KEY = "shiptoSentinelSettings";
export const SETTINGS_VERSION = 2;
export const DEFAULT_IGNORED_DOMAINS = [
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

export const DEFAULT_SETTINGS = {
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

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function baseDomain(hostname) {
  const parts = String(hostname || "").toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) {
    return parts.join(".");
  }

  return parts.slice(-2).join(".");
}

export function normalizeDomain(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export function isIgnoredDomain(hostname, ignoredDomains) {
  const normalizedHost = normalizeDomain(hostname);
  return ignoredDomains.some((domain) => {
    const ignored = normalizeDomain(domain);
    return normalizedHost === ignored || normalizedHost.endsWith(`.${ignored}`);
  });
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

export function sanitizeSettings(rawSettings) {
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

export async function loadSettings() {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  return sanitizeSettings(stored[SETTINGS_KEY]);
}

export async function saveSettings(settings) {
  const sanitized = sanitizeSettings(settings);
  await chrome.storage.sync.set({ [SETTINGS_KEY]: sanitized });
  return sanitized;
}
