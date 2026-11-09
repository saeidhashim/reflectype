# reflectype

Watch something. Write your perspective.

Every day each genre has one video. Pick a genre, watch, write your own take, then export a share card and a ready-to-paste text for LinkedIn. You post it yourself. Nothing is posted for you.

This is **v1**: the full flow works, with placeholder videos.

## What works
- Home with today's date and a loose set of 12 genre buttons (draft list, edit in `js/data.js`).
- Video page: video on one side, a writing area on the other. Your text autosaves in your browser (local storage), per genre and per day.
- Paste and drop are turned off in the writing box. Anything you type is accepted. This is a nudge, not an AI detector.
- Notebook view (desktop only): an open-notebook layout with the video page on the left and ruled writing page on the right. Phones use the normal stacked page.
- Export:
  - Text to copy: your text, a blank line, five hashtags, then the brand handle.
  - A share card (PNG, drawn in the browser) with reflectype's own artwork, the genre, title and date.
- One video per genre per day: entries rotate by date.

## Not in v1 (on purpose)
- Real videos. Entries in `js/data.js` are placeholders. To add a video, set `youtubeId` on an entry (embedding is only for videos that allow it).
- Video thumbnails or frames on the card. Reuse rights are not settled, so the card uses original artwork only.
- Real LinkedIn mentions. Copied `@handle` is plain text. LinkedIn creates a mention when the person types `@` and picks the page from its list. The export screen tells them so.
- Accounts, streaks, history, autoposting.

## Set the brand handle
Edit `brandHandle` in `js/data.js` (currently `@yourbrand`).

## Run it
No build step. Open `index.html`, or serve the folder: `python3 -m http.server`.

## Tests
- `node test/core.test.js` checks the daily pick, the copy layout and the genre data.
- `python3 test/e2e.py` drives headless Chrome through the flow (needs `google-chrome` and `pip install websocket-client`).
