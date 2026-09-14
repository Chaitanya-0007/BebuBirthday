/* ==========================================================================
   unlocks.js — manual production unlock flags.

   Chapter 11 has no fixed unlock time because it's tied to a real-world
   delivery that might arrive early or late. When it actually arrives:

     1. Change chapter11 below from false to true.
     2. Save this file and push it to GitHub Pages.
     3. Ask Bebu to refresh the website.

   allChapters is a manual override that immediately unlocks every chapter
   (ignoring every unlockAt time and the night-lock window) regardless of
   the real clock. Flip it to true when you want the whole site open right
   now instead of on its usual schedule.

   This file is intentionally tiny and only ever touched by hand — do not
   wire anything else into it, and do not let developer-mode testing
   (window.__DEV_UNLOCK_CH11__, see app.js) write back into this object.
   ========================================================================== */

const UNLOCKS = {
  chapter11: true,
  allChapters: true,
};
