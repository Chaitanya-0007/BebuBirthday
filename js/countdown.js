/* ==========================================================================
   countdown.js — all the time / unlock logic.
   Everything here is driven by fixed IST timestamps, never the visitor's
   local clock offset. We only ever use their clock for "what time is it
   right now", which is universal (a Date object is a UTC instant).
   ========================================================================== */

const STORAGE_KEYS = {
  opened: "bday21_opened_chapters",
  coupons: "bday21_redeemed_coupons",
  answers: "bday21_question_answers",
  music: "bday21_music_on",
  lastVisited: "bday21_last_visited",
  finalRevealSeen: "bday21_final_reveal_seen",
  morningInterludeSeen: "bday21_morning_interlude_seen",
  deliveryStage: "bday21_delivery_stage",
  surpriseStage: "bday21_surprise_stage",
};

/**
 * Build an ISO 8601 string in IST for N days after CONFIG.birthday's
 * midnight, at the given hour/minute. Keeps every chapter's unlock time
 * derivable from a single CONFIG.birthday edit.
 */
function unlockTime(daysAfterBirthday, hours, minutes = 0) {
  const [y, m, d] = CONFIG.birthday.split("-").map(Number);
  // Use UTC-based date math purely to roll the calendar day over correctly;
  // the actual clock time is attached afterwards as a literal IST string.
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + daysAfterBirthday);
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`;
  return `${dateStr}T${pad(hours)}:${pad(minutes)}:00${CONFIG.utcOffset}`;
}

/**
 * The single source of truth for "what time is it right now" everywhere
 * in the app. In production this is always the real clock. In dev mode
 * only, `window.__DEV_FAKE_NOW__` (a timestamp in ms) can override it so
 * you can simulate any point in the day without touching your system
 * clock — see the dev panel's "Simulate Time" control in app.js.
 */
function getNow() {
  if (CONFIG.devMode && window.__DEV_FAKE_NOW__ != null) {
    return window.__DEV_FAKE_NOW__;
  }
  return Date.now();
}

/** Returns milliseconds remaining until the ISO timestamp (negative if past). */
function msUntil(isoString) {
  return new Date(isoString).getTime() - getNow();
}

/** "Opens at 1:00 AM" — a calm, fixed clock time rather than a ticking
 *  countdown. This is a diary, not a game show. */
function formatOpensAt(isoString) {
  const time = new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: CONFIG.timezone,
  });
  return `Opens at ${time}`;
}

/** True once her birthday day (in IST) has fully ended. */
function isAfterBirthdayDay() {
  return getNow() >= new Date(unlockTime(1, 0, 0)).getTime();
}

function getOpenedChapters() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.opened) || "[]");
  } catch {
    return [];
  }
}

function markChapterOpened(id) {
  try {
    const opened = new Set(getOpenedChapters());
    opened.add(id);
    localStorage.setItem(STORAGE_KEYS.opened, JSON.stringify([...opened]));
  } catch {
    /* localStorage unavailable — progress just won't persist */
  }
}

/**
 * True from the moment Chapter 2 unlocks until the morning interlude time.
 * During this window NOTHING except Chapter 2 may become available —
 * regardless of any individual chapter's own unlockAt, and regardless of a
 * manual-unlock flag (e.g. Chapter 11). This is a global safety net, not a
 * substitute for scheduling chapters 3+ after the morning interlude in the
 * first place.
 */
function isNightLockActive() {
  const now = getNow();
  return (
    now >= new Date(CONFIG.chapter2RevealTime).getTime() &&
    now < new Date(CONFIG.morningInterludeTime).getTime()
  );
}

/**
 * LOCKED    — not unlockable yet (by time, by night-lock, or by a manual flag)
 * AVAILABLE — unlockable now but the visitor hasn't opened it yet
 * OPENED    — unlockable now and it's marked opened in localStorage
 */
function getChapterStatus(chapter) {
  const opened = () => (getOpenedChapters().includes(chapter.id) ? "OPENED" : "AVAILABLE");

  if (CONFIG.devMode && window.__DEV_UNLOCK_ALL__) {
    return opened();
  }

  // Chapter 1 and Chapter 2 are exempt — everything else pauses overnight
  // between the Chapter 2 reveal and the morning interlude.
  if (isNightLockActive() && chapter.id > 2) {
    return "LOCKED";
  }

  if (chapter.manualUnlock) {
    const devUnlocked = CONFIG.devMode && window.__DEV_UNLOCK_CH11__;
    if (!UNLOCKS.chapter11 && !devUnlocked) return "LOCKED";
    return opened();
  }

  if (msUntil(chapter.unlockAt) > 0) return "LOCKED";
  return opened();
}

/**
 * Runs `callback` every second, and again immediately once any watched
 * timestamp crosses from future to past — so newly-unlocked chapters
 * update live without a page refresh.
 */
function startGlobalTicker(callback) {
  callback();
  return setInterval(callback, 1000);
}
