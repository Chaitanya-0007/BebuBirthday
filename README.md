# 21 — For Bebu

A private, static, mobile-first birthday website: a cinematic 21-chapter
journey through her 21st birthday (September 14, 2026, India Standard
Time). No password — she's greeted with a minimal, mysterious welcome
screen instead — and the dashboard only ever shows a vague card title for
anything that would spoil a surprise.

No backend, no database, no login system, no paid APIs, no build step.
Plain HTML, CSS and JavaScript, deployable for free on GitHub Pages.

---

## 1. Quick orientation — which files you'll touch

**You will edit these often:**

| File | What it controls |
|---|---|
| `js/config.js` | Names, the birthday date, the Chapter 2 / morning-interlude timings, dev mode. |
| `js/data.js` | All 21 chapters — every heading, paragraph, photo path, audio path, coupon copy. |
| `js/unlocks.js` | The one manual switch — flip Chapter 11 on when the real-world delivery arrives. |
| `assets/images/`, `assets/audio/` | The actual photos and audio files. |

**You should basically never need to edit these:**

| File | What it does |
|---|---|
| `index.html` | Page structure / screens. |
| `css/style.css` | Visual design. |
| `js/app.js` | Screen logic, rendering, the morning/Ranjha sequence, coupons, dev panel. |
| `js/audio.js` | The custom audio player and background-music manager. |
| `js/countdown.js` | Unlock-time math (`getChapterStatus`, the overnight lock). |

---

## 2. The one-day timeline

Everything below happens **within September 14, 2026 itself** — nothing
spills into the 15th. This is controlled from `js/config.js`:

```js
birthday: "2026-09-14",
chapter2RevealTime: "2026-09-14T01:00:00+05:30",   // Chapter 2 unlocks
morningInterludeTime: "2026-09-14T08:00:00+05:30", // chapters 3+ can resume
```

- **Midnight (00:00):** Chapter 1 unlocks — the birthday opening.
- **1:00 AM:** Chapter 2 unlocks — the personal audio + gift moment.
- **1:00 AM – 8:00 AM:** a global "night-lock" keeps every other chapter
  (3 onward, including a manually-unlocked Chapter 11) LOCKED no matter
  what — enforced in `isNightLockActive()` in `js/countdown.js`, not by
  editing every chapter's own time.
- **~8:00 AM:** the one-time "Good morning" interlude appears (not a
  chapter), followed immediately by the Ranjha music moment (also not a
  chapter) — then the dashboard, with chapters 3–21 unlocking through the
  rest of the day.
- **After Sept 14 has fully ended:** the dashboard heading itself changes
  to "THE BIRTHDAY JOURNEY" framing (see `isAfterBirthdayDay()` /
  `updateDashboardHeaderForDate()`). Nothing resets — everything she's
  already unlocked or opened stays that way forever.

To reschedule an ordinary daytime chapter, edit its `unlockAt` in
`js/data.js`:

```js
unlockAt: unlockTime(0, 9, 0),   // day offset from CONFIG.birthday, hour, minute — 9:00 AM on the 14th
```

Locked chapters show a fixed **"Opens at 9:00 AM"** style time (not a
ticking countdown) — calmer, and matches "a journey, not a game."

---

## 3. Chapter 11 — the manual real-world delivery unlock

Chapter 11 ("Go Downstairs 👀") has no scheduled time — it's tied to a
real delivery that might arrive early or late. Open `js/unlocks.js`:

```js
const UNLOCKS = {
  chapter11: false,
};
```

When it actually arrives: change `chapter11` to `true`, save, push to
GitHub Pages, and ask her to refresh. That's it — no backend, no fake
synchronization between your phone and hers. In dev mode, **TEST MANUAL
DELIVERY** previews it with a temporary in-memory flag that never touches
this file.

---

## 4. Developer / testing mode

Set `devMode: true` in `js/config.js` to see the **DEVELOPER MODE** panel
(top-left, deliberately plain/technical). It's completely absent from the
page when `devMode` is `false`.

- **UNLOCK ALL / RESTORE REAL TIME** — bypass (or restore) every time
  check at once, including the overnight lock and Chapter 11's flag.
- **Test Chapter** dropdown + **OPEN CHAPTER** — jump into any of the 21
  chapters directly.
- **TEST CHAPTER 2**, **TEST MORNING**, **TEST RANJHA** — preview those
  specific moments on demand.
- **TEST MANUAL DELIVERY** — dev-only override for Chapter 11.
- **RESET EVERYTHING** — asks for confirmation, clears all local
  progress, reloads. Never touches `js/data.js`, `js/config.js`, or
  `js/unlocks.js`.

**Set `devMode` back to `false` before sending the site to her** — this
is the single most important pre-flight check.

---

## 5. Adding or changing photos / audio

Paths currently in use (all editable in `js/data.js` / `js/config.js`):

- `assets/audio/pendent audio.mp3` — Chapter 2
- `assets/audio/birtday music.mp3` — background music (`CONFIG.birthdayMusicSrc`)
- `assets/audio/Ranjha.mp3` — the morning music moment (`CONFIG.ranjhaAudioSrc`)
- `assets/audio/aye_udi_udi.mp3` — Chapter 14
- `assets/audio/audio 2 last chapter.mp3` — Chapter 21, the final message
- Real relationship photos in `assets/images/` are used throughout
  Chapters 5, 10, 12, and 13 (the "A Year of Us" diary) — see `js/data.js`
  for the exact filenames each chapter expects.

Filenames with spaces work fine as-is (browsers encode them
automatically) — you don't need to rename anything already in place.
If a file is missing or fails to load, the site shows a tasteful
placeholder or a disabled audio state instead of a broken element or a
console error.

---

## 6. Putting this online for free (GitHub Pages)

**Before you upload anything: confirm `devMode: false` in `js/config.js`.**

1. Create a free GitHub account, then a new **public** repository.
2. Upload every file and folder from this project into it.
3. **Settings → Pages** → Source: **Deploy from a branch** → **main** /
   **/ (root)** → Save.
4. Wait a minute or two; the same screen shows your live URL:
   `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`
5. Open it yourself first, then send it to her.

To update anything later (new content, flipping `chapter11` on), just
upload the changed file again the same way.

---

## 7. Privacy

This is a **static site in a public GitHub repository** — anyone with the
link can view it, and anyone who knows how to browse GitHub can see every
file, including photos and audio. Don't upload anything you wouldn't
want a stranger to be able to find, and don't put real passwords or
sensitive documents in this repository.

---

## 8. Troubleshooting

- **A photo/audio doesn't load.** Check the exact filename and
  capitalization in `js/data.js` against what's actually in
  `assets/images/` or `assets/audio/` — these are case-sensitive.
- **Nothing unlocks even though the time has passed.** The device's clock
  needs to be roughly correct — the whole system trusts the visitor's
  device to know "what time is it right now," converted to IST.
- **A chapter that should be locked overnight isn't.** Check you're not
  between 1:00 AM and 8:00 AM in dev mode with `UNLOCK ALL` still active
  — use `RESTORE REAL TIME` to confirm real behavior.

---

Made with care, for one very specific person. Happy 21st, Bebu. ❤️
