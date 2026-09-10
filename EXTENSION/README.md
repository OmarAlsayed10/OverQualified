# OverQualified Job Radar — browser extension

Captures the job you are viewing, sends it to your OverQualified account, and shows
which of your CVs fits it best.

## What it does today (v0.2)

- Detects a job on LinkedIn, Wuzzuf, Bayt and Indeed
- Stores it in the shared `Job` table and ranks your CVs against it
- Downloads the chosen CV as a PDF so you can attach it yourself
- Watches the application form and answers its questions as they appear
- Shows each answer with a copy button; you paste and submit

**It never writes to the job site's page.** No auto-fill, no auto-submit, no
file auto-attach. Every value reaches the form through your own paste, and you
click the site's own Submit button. That is deliberate - see "Why copy instead
of auto-fill" below.

## Why copy instead of auto-fill

Two reasons, and the second is the practical one.

**Detection.** A programmatic fill dispatches a synthetic event carrying
`isTrusted: false`. Only the browser can set that flag to true, and any page can
read it. Your Ctrl+V is a real paste event, indistinguishable from any other
because it *is* any other.

**Reliability.** LinkedIn is React. Assigning `input.value` directly is often
ignored by React's synthetic event system, so a programmatic fill silently does
nothing. Paste is handled natively.

Dropdowns and radio groups cannot be pasted into at all, so those show as
"Choose: 1 month" instructions instead of a copy button.

## Install (development)

1. `chrome://extensions` (or `edge://extensions`)
2. Turn on **Developer mode**
3. **Load unpacked** and pick this `EXTENSION/` folder
4. Copy the extension ID Chrome shows on the card
5. In `BACKEND/.env` add that ID as an allowed origin, then restart the backend:

```
EXTENSION_ORIGINS=chrome-extension://<the-id-you-copied>
```

## Connect it to your account

1. Click the extension icon — the side panel opens
2. Set **API address** (default `http://localhost:3001`)
3. Click **Connect account** — a tab opens on the backend showing an 8-character code
4. You must already be logged in to OverQualified in that browser; click **Connect**
5. The panel picks up the approval within a couple of seconds

The panel stores a 90-day token scoped to `extension`. That token cannot be used on
normal account routes — `authenticateToken` rejects it.

## Use it

1. Open a job page on a supported site - the panel scans it automatically
2. Pick a CV (the best-scoring one is preselected), optionally **Download CV**
3. Click **Prepare answers**, then open the site's own Apply button
4. Questions appear in the panel as you step through the form
5. Copy each answer, paste it, pick any dropdowns, click the site's Submit

Answers come from three places, shown under each one:

| Source | Cost | Meaning |
|---|---|---|
| from your profile | free | years of experience, notice period, salary, visa |
| reused from a past application | free | you answered this question before |
| generated | credits | free-text answer written against this CV and job |

Edit any answer before copying. Edits are saved and reused next time **if** you
have turned on learning consent on your account.

`structured data` on the job card means it was read from the page's JSON-LD (reliable).
`page selectors` means JSON-LD was missing and CSS selectors were used (fragile).

## Files

| File | Role |
|---|---|
| `manifest.json` | permissions, which sites, which scripts |
| `src/detector.js` | pure DOM reading - job posting and form questions. No `chrome.*`, so it is unit-testable |
| `src/content.js` | chrome glue: message handlers and the form observer |
| `src/background.js` | service worker: storage, network, pairing, downloads |
| `src/sidepanel.html/.js/.css` | the UI docked beside the page |
| `tests/` | 19 jsdom tests over `detector.js` |

## Notes

- No build step. Plain HTML/JS/CSS loaded directly by the browser.
- Reload the extension from `chrome://extensions` after editing any file.
- Content scripts only attach on page load — reload an already-open job tab once.
