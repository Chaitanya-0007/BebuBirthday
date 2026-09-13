/* ==========================================================================
   audio.js — custom audio player UI (no native controls) + background music.
   Only one voice note / song plays at a time; background music ducks out
   whenever one is playing and resumes afterwards if it was enabled.
   ========================================================================== */

const AudioManager = (() => {
  let activeAudio = null;

  function setActive(audioEl) {
    if (activeAudio && activeAudio !== audioEl) {
      activeAudio.pause();
    }
    activeAudio = audioEl;
    BackgroundMusic.duck();
  }

  function clearIfActive(audioEl) {
    if (activeAudio === audioEl) {
      activeAudio = null;
      BackgroundMusic.unduck();
    }
  }

  /**
   * Stops whatever foreground audio is currently tracked, regardless of
   * whether the chapter/screen that created it is still on screen. This is
   * the fix for audio "leaking" across transitions: mountAudioPlayer()
   * creates plain `new Audio()` objects that are never attached to the
   * DOM, so a DOM query like `$$("audio", someContainer)` can never find
   * them — calling that on chapter close silently paused nothing, leaving
   * the voice note/song playing invisibly and the background music ducked
   * forever. Call this instead whenever leaving a screen that might have
   * audio playing; the audio's own "pause" handler (see mountAudioPlayer)
   * clears `activeAudio` and un-ducks the background music once the pause
   * actually fires.
   */
  function stopActive() {
    if (activeAudio) {
      activeAudio.pause();
    }
  }

  function getActive() {
    return activeAudio;
  }

  return { setActive, clearIfActive, stopActive, getActive };
})();

const BackgroundMusic = (() => {
  let audio = null;
  let userEnabled = false;
  let duckedForVoice = false;
  let toggleButtons = [];

  function init() {
    audio = new Audio(CONFIG.birthdayMusicSrc);
    audio.loop = true;
    audio.volume = 0.22;
    audio.preload = "none";

    try {
      userEnabled = localStorage.getItem(STORAGE_KEYS.music) === "on";
    } catch {
      userEnabled = false;
    }

    renderButtons();
  }

  /**
   * Called from the BEGIN button's click handler — a genuine user gesture,
   * so autoplay restrictions don't block it. Skips starting if she has
   * explicitly turned music off in a previous visit; otherwise attempts to
   * play and fails silently (button stays OFF) if the track isn't in place
   * yet, or if the browser still refuses for some reason.
   */
  function start() {
    let explicitlyOff = false;
    try {
      explicitlyOff = localStorage.getItem(STORAGE_KEYS.music) === "off";
    } catch {
      /* ignore */
    }
    if (explicitlyOff || userEnabled) return;

    userEnabled = true;
    audio.play().catch(() => {
      userEnabled = false;
      try {
        localStorage.setItem(STORAGE_KEYS.music, "off");
      } catch {
        /* ignore */
      }
      refreshButtons();
    });
    try {
      localStorage.setItem(STORAGE_KEYS.music, "on");
    } catch {
      /* ignore */
    }
    refreshButtons();
  }

  function renderButtons() {
    document.querySelectorAll("[data-music-toggle]").forEach((btn) => {
      toggleButtons.push(btn);
      updateButton(btn);
      btn.addEventListener("click", toggle);
    });
  }

  function updateButton(btn) {
    btn.textContent = userEnabled ? "♪ ON" : "♪ OFF";
    btn.setAttribute("aria-pressed", String(userEnabled));
    btn.setAttribute("aria-label", userEnabled ? "Turn background music off" : "Turn background music on");
  }

  function refreshButtons() {
    toggleButtons.forEach(updateButton);
  }

  function toggle() {
    userEnabled = !userEnabled;
    try {
      localStorage.setItem(STORAGE_KEYS.music, userEnabled ? "on" : "off");
    } catch {
      /* ignore */
    }
    if (userEnabled && !duckedForVoice) {
      audio.play().catch(() => {
        userEnabled = false;
        refreshButtons();
      });
    } else {
      audio.pause();
    }
    refreshButtons();
  }

  function duck() {
    duckedForVoice = true;
    if (audio) audio.pause();
  }

  function unduck() {
    duckedForVoice = false;
    if (userEnabled && audio) {
      audio.play().catch(() => {});
    }
  }

  return { init, start, toggle, duck, unduck };
})();

/**
 * Wires up a custom audio player inside `container`.
 * Expects these child elements (data attributes), all optional except audio:
 *   [data-audio-src]     -- not required, src passed directly
 *   [data-play-btn]      -- play/pause button
 *   [data-restart-btn]   -- restart button
 *   [data-progress]      -- <input type="range">
 *   [data-current-time]  -- text node holder
 *   [data-duration-time] -- text node holder
 *   [data-error]         -- hidden error message holder
 */
function mountAudioPlayer(container, src) {
  const audio = new Audio();
  audio.preload = "metadata";
  audio.src = src;

  const playBtn = container.querySelector("[data-play-btn]");
  const restartBtn = container.querySelector("[data-restart-btn]");
  const progress = container.querySelector("[data-progress]");
  const currentTimeEl = container.querySelector("[data-current-time]");
  const durationEl = container.querySelector("[data-duration-time]");
  const errorEl = container.querySelector("[data-error]");

  let seeking = false;

  const fmt = (s) => {
    if (!isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${sec}`;
  };

  audio.addEventListener("loadedmetadata", () => {
    if (progress) progress.max = String(Math.floor(audio.duration) || 0);
    if (durationEl) durationEl.textContent = fmt(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (seeking) return;
    if (progress) progress.value = String(Math.floor(audio.currentTime));
    if (currentTimeEl) currentTimeEl.textContent = fmt(audio.currentTime);
  });

  audio.addEventListener("play", () => {
    if (playBtn) playBtn.textContent = "⏸";
    if (playBtn) playBtn.setAttribute("aria-label", "Pause");
    AudioManager.setActive(audio);
  });

  audio.addEventListener("pause", () => {
    if (playBtn) playBtn.textContent = "▶";
    if (playBtn) playBtn.setAttribute("aria-label", "Play");
    AudioManager.clearIfActive(audio);
  });

  audio.addEventListener("ended", () => {
    if (progress) progress.value = "0";
    if (currentTimeEl) currentTimeEl.textContent = "0:00";
    AudioManager.clearIfActive(audio);
  });

  audio.addEventListener("error", () => {
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = "Something went wrong loading this voice note.";
    }
    if (playBtn) playBtn.disabled = true;
  });

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    });
  }

  if (progress) {
    progress.addEventListener("input", () => {
      seeking = true;
      if (currentTimeEl) currentTimeEl.textContent = fmt(Number(progress.value));
    });
    progress.addEventListener("change", () => {
      audio.currentTime = Number(progress.value);
      seeking = false;
    });
  }

  return audio;
}
