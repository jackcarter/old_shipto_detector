# Privacy Disclosure Draft

## Single purpose

Warn users when a watchlisted shipping address appears on checkout or shipping-related web pages.

## User data handling

- The extension reads page text on visited `http` and `https` pages so it can compare that text against the user’s saved watchlist.
- The extension stores watchlisted address strings, ignored domains, and the global enabled or paused state in Chrome sync storage.
- The extension does not transmit user data to a remote server.
- The extension does not use analytics, ads, or third-party tracking code.
- The extension does not collect payment information, browsing history for resale, or personally identifying data outside of what the user explicitly saves in the watchlist.

## Permissions rationale

- `storage`: saves watchlisted addresses, ignored domains, and enabled state.
- `http://*/*` and `https://*/*` host access: required to scan checkout and shipping pages across different shopping sites and display warnings when a saved address appears.
