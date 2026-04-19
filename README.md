# Old Address Detector

Old Address Detector is a Manifest V3 Chrome extension that warns you when a watchlisted shipping address appears on checkout or order pages.

## What it does

- Scans `http` and `https` pages for watchlisted address strings.
- Shows a visible warning banner when it finds a match.
- Lets you paste a simple one-line-per-address watchlist, pause scanning, and ignore domains.
- Starts with major webmail services ignored by default to avoid noisy inbox warnings.
- Stores all settings in Chrome sync storage.

## Local development

1. Create a local virtualenv: `python3 -m venv .venv`
2. Install dev dependencies: `.venv/bin/pip install -r requirements-dev.txt`
3. Generate icons and store images: `.venv/bin/python scripts/generate_assets.py`
4. In Chrome, open `chrome://extensions`.
5. Enable Developer mode.
6. Click `Load unpacked` and choose this folder.

## Packaging

Run:

```bash
./scripts/package_extension.sh
```

That creates an upload-ready ZIP in `dist/`.

## Repo notes

- Store listing assets live in `assets/store/`.
- Extension runtime icons live in `assets/icons/`.
- The store submission checklist and copy live in `store/`.
