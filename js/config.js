/* ==========================================================================
   CONFIG — the one place you should need to edit for names, dates & codes.
   ========================================================================== */

const CONFIG = {
  // Names
  girlfriendName: "Bebu",
  myName: "Chaitu",

  // Site title shown on the welcome screen
  siteTitle: "21",
  subtitle: "For Bebu",

  // Birthday date (YYYY-MM-DD), always interpreted in Indian Standard Time.
  // Everything below happens ON this calendar day — none of it spills into
  // the next day. Do not let UTC math shift this to the 15th.
  birthday: "2026-09-14",
  timezone: "Asia/Kolkata",
  utcOffset: "+05:30",

  // The moment Chapter 2 (the personal gift) unlocks — one hour after
  // midnight, still the night of her birthday.
  chapter2RevealTime: "2026-09-14T01:00:00+05:30",

  // The morning interlude + Ranjha become available any time after this —
  // not exactly at this minute. Between chapter2RevealTime and this, only
  // Chapter 2 may be available (see countdown.js isNightLockActive).
  // Chapter 3 itself unlocks later, at noon — see its unlockAt in data.js.
  morningInterludeTime: "2026-09-14T09:00:00+05:30",

  // Birthday ambient music. Starts on the BEGIN click (a real user gesture,
  // so autoplay restrictions don't block it). Ducks/pauses automatically
  // whenever a voice note, Ranjha, Aye Udi, or the final audio plays.
  birthdayMusicSrc: "assets/audio/birtday music.mp3",

  // The morning music moment right after the "good morning" interlude —
  // not a numbered chapter, just a shared song.
  ranjhaAudioSrc: "assets/audio/Ranjha.mp3",

  // Developer/testing mode — see README "Developer / testing mode".
  // MUST be false before you send the site to her.
  devMode: false,
};
