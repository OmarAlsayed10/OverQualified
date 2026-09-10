# Testing the extension

Three layers. Run the first two on every change; the third before a release.

## 1. Detector unit tests - `npm test`

```bash
cd EXTENSION && npm test
```

10 tests over `src/detector.js` using jsdom. This is the layer that matters most:
**selector packs break whenever LinkedIn or Wuzzuf ships a redesign**, and this is
the only thing that catches it.

Covered: JSON-LD parsing (plain, `@graph`, array), nested `addressCountry`,
malformed JSON falling back to selectors, the LinkedIn pack, the default pack on
an unknown host, no-job pages, description capping, url/board tagging.

To add a site: add its selectors to `SELECTOR_PACK` in `src/detector.js`, then a
test that feeds a snippet of that site's markup to `readJob()`.

### Why `elementText` exists

jsdom does not implement `innerText` - it is a rendering-dependent property and
jsdom does no layout. The detector uses `node.innerText ?? node.textContent`, so
browsers keep the better behaviour (hidden elements skipped, block-level line
breaks) while tests still run.

## 2. Backend tests - from `BACKEND/`

```bash
cd BACKEND && npx jest src/features/extension
```

Covers `parseCapturedJob`: whitespace normalisation, markup stripping, rejecting
non-http urls (`javascript:` payloads), rejecting a missing title, optional-field
defaults, and description capping. Everything the content script sends is
third-party page content, so it is treated as hostile input.

## 3. Manual end-to-end

1. `chrome://extensions` -> Developer mode -> Load unpacked -> pick `EXTENSION/`
2. Copy the extension ID, put it in `BACKEND/.env` as
   `EXTENSION_ORIGINS=chrome-extension://<id>`, restart the backend
3. Log in to OverQualified in the same browser
4. Click the icon -> **Connect account** -> approve in the tab that opens
5. Open a LinkedIn job -> **Scan this page** -> **Save to radar**
6. Confirm the row landed: `SELECT * FROM "Job" WHERE source LIKE 'extension:%';`

### Debugging each context separately

The three contexts have separate consoles - a common source of confusion:

| Context | Where its console lives |
|---|---|
| content script | the job page's own DevTools console |
| service worker | `chrome://extensions` -> "service worker" link |
| side panel | right-click inside the panel -> Inspect |

After editing `detector.js` or `content.js`, reload the extension **and** reload
the job tab - content scripts only attach at page load.
