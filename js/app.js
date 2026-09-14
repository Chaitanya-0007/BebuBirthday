/* ==========================================================================
   app.js — screens, chapter rendering, progress, coupons, the morning/
   Ranjha sequence, the final reveal, and the (optional) dev panel.
   ========================================================================== */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let lastUnlockedSnapshot = "";
  let currentOverlayChapterId = null;

  /* ---------------------------------------------------------------------
     Screens
     --------------------------------------------------------------------- */
  function showScreen(id) {
    $$(".screen").forEach((s) => {
      const isTarget = s.id === id;
      s.hidden = !isTarget;
      s.classList.toggle("is-active", isTarget);
    });
    window.scrollTo({ top: 0, behavior: "auto" });
    const heading = document.querySelector(`#${id} h1, #${id} h2`);
    if (heading) heading.setAttribute("tabindex", "-1"), heading.focus({ preventScroll: true });
  }

  function revealMusicToggle() {
    const btn = $("#music-toggle");
    if (btn) btn.hidden = false;
  }

  /**
   * True exactly once, the first time she comes back after the morning
   * interlude time has passed — after that, localStorage remembers she's
   * already seen it (and Ranjha) so she goes straight to the dashboard.
   */
  function shouldShowMorningInterlude() {
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_KEYS.morningInterludeSeen) === "true";
    } catch {
      /* ignore */
    }
    if (seen) return false;
    return getNow() >= new Date(CONFIG.morningInterludeTime).getTime();
  }

  function goPastLanding() {
    if (shouldShowMorningInterlude()) {
      showScreen("screen-morning");
    } else {
      enterDashboard();
    }
  }

  function enterDashboard() {
    AudioManager.stopActive();
    revealMusicToggle();
    showScreen("screen-dashboard");
    renderDashboard();
  }

  /* ---------------------------------------------------------------------
     Landing (grand welcome)
     --------------------------------------------------------------------- */
  function initLanding() {
    $("#landing-kicker").textContent = `FOR ${CONFIG.girlfriendName.toUpperCase()}`;
    $("#landing-title").textContent = CONFIG.siteTitle;
    $("#dash-name").textContent = CONFIG.girlfriendName;

    $("#begin-btn").addEventListener("click", () => {
      revealMusicToggle();
      BackgroundMusic.start();
      burstParticles({ hearts: true, count: 26 });
      window.setTimeout(goPastLanding, prefersReducedMotion() ? 0 : 380);
    });
  }

  /* ---------------------------------------------------------------------
     Morning interlude → Ranjha moment (neither is a numbered chapter)
     --------------------------------------------------------------------- */
  function initMorningInterlude() {
    $("#morning-continue-btn").addEventListener("click", () => {
      try {
        localStorage.setItem(STORAGE_KEYS.morningInterludeSeen, "true");
      } catch {
        /* ignore */
      }
      enterRanjhaScreen();
    });
  }

  function enterRanjhaScreen() {
    AudioManager.stopActive();
    showScreen("screen-ranjha");
    const container = $("#ranjha-content");
    container.innerHTML = `
      <p class="morning__line">Let's start the day with a song special to us.</p>
      ${audioCardMarkup("SONG", "Ranjha")}
      <button class="btn btn--ghost ranjha-skip" data-ranjha-skip>Skip</button>
      <div class="ranjha-continue" data-ranjha-continue hidden>
        <p class="morning__line">Okay.<br />Now let's actually start your birthday.</p>
        <button class="btn btn--primary" data-ranjha-go>CONTINUE <span aria-hidden="true">&#10084;&#65039;</span></button>
      </div>
    `;

    const audio = mountAudioPlayer($(".audio-card", container), CONFIG.ranjhaAudioSrc);
    audio.play().catch(() => {
      /* she can still tap play, or just skip — never a broken experience */
    });

    const reveal = () => {
      $("[data-ranjha-continue]", container).hidden = false;
    };
    audio.addEventListener("ended", reveal);
    $("[data-ranjha-skip]", container).addEventListener("click", reveal);
    $("[data-ranjha-go]", container).addEventListener("click", enterDashboard);
  }

  /* ---------------------------------------------------------------------
     Dashboard / chapter grid
     --------------------------------------------------------------------- */
  function computeUnlockedSnapshot() {
    return CHAPTERS.map((c) => (getChapterStatus(c) === "LOCKED" ? "0" : "1")).join("");
  }

  function updateDashboardHeaderForDate() {
    const eyebrow = $(".dash__eyebrow");
    const heading = $(".dash__heading");
    if (!eyebrow || !heading) return;
    if (isAfterBirthdayDay()) {
      eyebrow.innerHTML = `THE BIRTHDAY JOURNEY <span aria-hidden="true">&#10084;</span>`;
      heading.innerHTML = `Bebu's 21st.<br />Made for one person.`;
    }
  }

  function renderDashboard() {
    updateDashboardHeaderForDate();
    const grid = $("#chapter-grid");
    grid.innerHTML = CHAPTERS.map(renderChapterCard).join("");
    lastUnlockedSnapshot = computeUnlockedSnapshot();

    $$(".chapter-card", grid).forEach((card) => {
      card.addEventListener("click", () => {
        const id = Number(card.dataset.id);
        const chapter = CHAPTERS.find((c) => c.id === id);
        if (chapter) openChapter(chapter);
      });
    });

    updateProgress();
  }

  function renderChapterCard(chapter) {
    const status = getChapterStatus(chapter);
    const num = String(chapter.id).padStart(2, "0");
    let statusHTML;

    if (status === "LOCKED") {
      const opensLine = chapter.manualUnlock
        ? ""
        : `<span class="chapter-card__opens">${formatOpensAt(chapter.unlockAt)}</span>`;
      statusHTML = `
        <span class="chapter-card__lock" aria-hidden="true">&#128274;</span>
        <span class="chapter-card__status">LOCKED</span>
        ${opensLine}`;
    } else if (status === "OPENED") {
      statusHTML = `<span class="chapter-card__status chapter-card__status--opened">&#10003; Read again</span>`;
    } else {
      statusHTML = `<span class="chapter-card__status chapter-card__status--open">OPEN</span>`;
    }

    return `
      <button class="chapter-card chapter-card--${status.toLowerCase()}" data-id="${chapter.id}" role="listitem" aria-label="Chapter ${num}: ${chapter.cardTitle}">
        <span class="chapter-card__num">${num}</span>
        <span class="chapter-card__title">${chapter.cardTitle}</span>
        <span class="chapter-card__footer">${statusHTML}</span>
      </button>`;
  }

  function updateProgress() {
    const opened = getOpenedChapters().length;
    $("#progress-label").textContent = `${opened} / ${CHAPTERS.length}`;
    $("#progress-fill").style.width = `${Math.round((opened / CHAPTERS.length) * 100)}%`;
  }

  /* ---------------------------------------------------------------------
     Ticking: re-render on unlock transitions, no live countdown text
     --------------------------------------------------------------------- */
  function tick() {
    const snapshot = computeUnlockedSnapshot();
    if (snapshot !== lastUnlockedSnapshot && !$("#screen-dashboard").hidden) {
      renderDashboard();
    } else {
      lastUnlockedSnapshot = snapshot;
    }

    // If she's sitting on the dashboard right as the morning interlude time
    // arrives, transition her into it live instead of waiting for a reload.
    if (!$("#screen-dashboard").hidden && shouldShowMorningInterlude()) {
      showScreen("screen-morning");
    }

    if (currentOverlayChapterId != null) {
      const chapter = CHAPTERS.find((c) => c.id === currentOverlayChapterId);
      if (chapter && (chapter.type === "final" || chapter.type === "surprise")) {
        const status = getChapterStatus(chapter);
        if (status !== "LOCKED" && $("#chapter-content").dataset.renderedAsLocked === "true") {
          openChapter(chapter);
        }
      }
    }

    if (CONFIG.devMode) updateDevClocks();
  }

  /* ---------------------------------------------------------------------
     Chapter overlay
     --------------------------------------------------------------------- */
  function openChapter(chapter) {
    AudioManager.stopActive();
    const status = getChapterStatus(chapter);
    const content = $("#chapter-content");
    content.innerHTML = "";
    content.dataset.renderedAsLocked = String(status === "LOCKED");
    currentOverlayChapterId = chapter.id;

    if (status === "LOCKED") {
      content.innerHTML = renderLockedView(chapter);
    } else {
      content.innerHTML = renderChapterBody(chapter);
      afterRenderChapter(chapter, content);
      markChapterOpened(chapter.id);
      updateProgress();
    }

    const overlay = $("#chapter-overlay");
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    document.body.classList.add("no-scroll");
    $("#chapter-close").focus();
  }

  function closeChapter() {
    AudioManager.stopActive();
    const overlay = $("#chapter-overlay");
    overlay.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    window.setTimeout(() => {
      // Guard against a quick reopen racing this delayed callback: only
      // hide if nothing re-opened the overlay in the meantime.
      if (!overlay.classList.contains("is-open")) {
        overlay.hidden = true;
      }
    }, 250);
    currentOverlayChapterId = null;
    renderDashboard();
  }

  function renderLockedView(chapter) {
    const c = chapter.content || {};
    const opensLine = chapter.manualUnlock
      ? ""
      : `<p class="locked-view__opens">${formatOpensAt(chapter.unlockAt)}</p>`;
    return `
      <div class="locked-view">
        <p class="locked-view__num">${String(chapter.id).padStart(2, "0")}</p>
        <span class="locked-view__icon" aria-hidden="true">&#128274;</span>
        <p class="locked-view__title">${chapter.cardTitle}</p>
        <p class="locked-view__line">${c.lockedLine || "LOCKED"}</p>
        ${opensLine}
      </div>`;
  }

  /* ---------------------------------------------------------------------
     Per-type renderers
     --------------------------------------------------------------------- */
  function renderChapterBody(chapter) {
    switch (chapter.type) {
      case "message":
        return renderMessage(chapter);
      case "photo":
        return renderPhoto(chapter);
      case "song":
        return renderSong(chapter);
      case "letter":
        return renderLetter(chapter);
      case "tiles":
        return renderTiles(chapter);
      case "diary":
        return renderDiary(chapter);
      case "memoryCoupon":
        return renderMemoryCoupon(chapter);
      case "surprise":
        return renderSurprise(chapter);
      case "delivery":
        return renderDelivery(chapter);
      case "reveal":
        return renderReveal(chapter);
      case "bridge":
        return renderBridge(chapter);
      case "storyJourney":
        return renderStoryJourney(chapter);
      case "final":
        return renderFinal(chapter);
      default:
        return `<p>Unknown chapter type.</p>`;
    }
  }

  function afterRenderChapter(chapter, root) {
    wireImageFallback(root);
    switch (chapter.type) {
      case "song":
        mountAudioPlayer($(".audio-card", root), chapter.content.src);
        break;
      case "diary":
        wireDiary(root);
        break;
      case "memoryCoupon":
        wireMemoryCoupon(chapter, root);
        break;
      case "surprise":
        wireSurprise(chapter, root);
        break;
      case "delivery":
        wireDelivery(chapter, root);
        break;
      case "reveal":
        wireReveal(chapter, root);
        break;
      case "bridge":
        wireBridge(chapter, root);
        break;
      case "storyJourney":
        wireStoryJourney(chapter, root);
        break;
      case "final":
        wireFinal(chapter, root);
        break;
    }
  }

  const eyebrowNum = (n) => String(n).padStart(2, "0");

  function renderMessage(chapter) {
    const c = chapter.content;
    const atmosphere = c.atmosphere ? " chapter-type--atmosphere" : "";
    const image = c.image
      ? `<div class="photo-frame msg__image">
           <img src="${c.image}" alt="${c.alt || ""}" class="photo-frame__img" loading="lazy" />
           <div class="photo-frame__fallback" aria-hidden="true">&#128444;</div>
         </div>`
      : c.images
      ? `<div class="msg__gallery">
           ${c.images
             .map(
               (img) => `
             <div class="photo-frame msg__gallery-item">
               <img src="${img.src}" alt="${img.alt || ""}" class="photo-frame__img" loading="lazy" />
               <div class="photo-frame__fallback" aria-hidden="true">&#128444;</div>
             </div>`
             )
             .join("")}
         </div>`
      : "";
    const pullQuote = c.pullQuote ? `<p class="msg__pull-quote">${c.pullQuote}</p>` : "";
    const body = (c.body || []).map((p) => `<p class="msg__paragraph">${p}</p>`).join("");
    const list = c.list
      ? `<ol class="msg__list">${c.list.map((i) => `<li>${i}</li>`).join("")}</ol>`
      : "";
    return `
      <article class="chapter-type chapter-type--message${atmosphere}">
        ${c.atmosphere ? "" : `<p class="chapter-eyebrow">${c.eyebrow || eyebrowNum(chapter.id)}</p>`}
        <h2 class="chapter-heading">${c.heading}</h2>
        ${image}
        ${pullQuote}
        ${body}
        ${list}
      </article>`;
  }

  function renderPhoto(chapter) {
    const c = chapter.content;
    return `
      <article class="chapter-type chapter-type--photo">
        <p class="chapter-eyebrow">${eyebrowNum(chapter.id)}</p>
        <h2 class="chapter-heading">${chapter.title}</h2>
        <div class="photo-frame">
          <img src="${c.image}" alt="${c.alt || ""}" class="photo-frame__img" loading="lazy" />
          <div class="photo-frame__fallback" aria-hidden="true">&#128444;</div>
        </div>
        <p class="chapter-caption">${c.caption}</p>
      </article>`;
  }

  function wireImageFallback(root) {
    $$("img", root).forEach((img) => {
      img.addEventListener("error", () => {
        img.closest(".photo-frame, .diary-entry__frame")?.classList.add("is-broken");
      });
    });
    $$(".photo-frame__img", root).forEach((img) => {
      if (img.closest(".story-photo")) return;
      img.addEventListener("click", () => img.classList.toggle("is-zoomed"));
    });
  }

  function audioCardMarkup(label, title) {
    return `
      <div class="audio-card">
        <p class="audio-card__label">${label}</p>
        <p class="audio-card__title">${title}</p>
        <div class="audio-card__controls">
          <button class="audio-card__play" data-play-btn aria-label="Play">&#9654;</button>
          <div class="audio-card__timeline">
            <input class="audio-card__progress" data-progress type="range" min="0" max="100" value="0" aria-label="Seek" />
            <div class="audio-card__times">
              <span data-current-time>0:00</span>
              <span data-duration-time>0:00</span>
            </div>
          </div>
          <button class="audio-card__restart" data-restart-btn aria-label="Restart">&#8635;</button>
        </div>
        <p class="audio-card__error" data-error hidden></p>
      </div>`;
  }

  function renderSong(chapter) {
    const c = chapter.content;
    const pre = c.preLines ? `<div class="song-pre">${linesMarkup(c.preLines)}</div>` : "";
    const lostVideo = c.lostVideoTop
      ? `<div class="lost-video">
           <p class="lost-video__top">${c.lostVideoTop}</p>
           <p class="lost-video__bottom">${c.lostVideoBottom}</p>
         </div>`
      : "";
    const note = c.note ? `<p class="msg__paragraph">${c.note}</p>` : "";
    const post = c.postLine ? `<p class="final-line song-post">${c.postLine}</p>` : "";
    return `
      <article class="chapter-type chapter-type--song">
        <p class="chapter-eyebrow">${c.eyebrow || eyebrowNum(chapter.id)}</p>
        <h2 class="chapter-heading">${c.heading || chapter.title}</h2>
        ${pre}
        ${lostVideo}
        ${note}
        ${audioCardMarkup(c.label || "SONG", c.title)}
        ${post}
      </article>`;
  }

  function renderLetter(chapter) {
    const c = chapter.content;
    return `
      <article class="chapter-type chapter-type--letter">
        <div class="letter">
          <h2 class="letter__heading">${c.heading}</h2>
          ${c.paragraphs.map((p) => `<p class="letter__paragraph">${p}</p>`).join("")}
          <p class="letter__signoff">${c.signOff.replace(/\n/g, "<br />")}</p>
        </div>
      </article>`;
  }

  function renderTiles(chapter) {
    const c = chapter.content;
    return `
      <article class="chapter-type chapter-type--tiles">
        <p class="chapter-eyebrow">${c.eyebrow || eyebrowNum(chapter.id)}</p>
        <h2 class="chapter-heading">${c.heading}</h2>
        ${c.intro ? `<p class="msg__paragraph">${c.intro}</p>` : ""}
        <div class="tiles-grid">
          ${c.tiles
            .map(
              (t, i) => `
                <div class="vision-tile" style="animation-delay:${0.1 + i * 0.08}s">
                  <span class="vision-tile__num">${String(i + 1).padStart(2, "0")}</span>
                  <span class="vision-tile__text">${t}</span>
                </div>`
            )
            .join("")}
        </div>
      </article>`;
  }

  /* ---------------------------------------------------------------------
     A Year of Us — vertical photo diary
     --------------------------------------------------------------------- */
  function renderDiary(chapter) {
    const c = chapter.content;
    const entries = c.entries
      .map(
        (e) => `
        <figure class="diary-entry">
          <div class="photo-frame diary-entry__frame">
            <img src="${e.image}" alt="${e.alt || ""}" class="photo-frame__img" loading="lazy" />
            <div class="photo-frame__fallback" aria-hidden="true">&#128444;</div>
          </div>
          <figcaption class="diary-entry__caption">${e.caption}</figcaption>
        </figure>`
      )
      .join("");
    return `
      <article class="chapter-type chapter-type--diary">
        <p class="chapter-eyebrow">${eyebrowNum(chapter.id)}</p>
        <h2 class="chapter-heading">${c.heading}</h2>
        ${c.subheading ? `<p class="chapter-caption diary-subheading">${c.subheading}</p>` : ""}
        <div class="diary">${entries}</div>
      </article>`;
  }

  function wireDiary(root) {
    const entries = $$(".diary-entry", root);
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      entries.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (items) => {
        items.forEach((item) => {
          if (item.isIntersecting) {
            item.target.classList.add("is-visible");
            observer.unobserve(item.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    entries.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------------------
     Memory + open-ended coupon (Chapters 19 & 20)
     --------------------------------------------------------------------- */
  function getKeptCoupons() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.coupons) || "[]");
    } catch {
      return [];
    }
  }

  function couponBlockMarkup(coupon, kept, key) {
    const preamble = coupon.preamble ? `<div class="coupon-preamble">${linesMarkup(coupon.preamble)}</div>` : "";
    return `
      ${preamble}
      <div class="coupon ${kept ? "coupon--redeemed" : ""}">
        <p class="coupon__code">${coupon.code}</p>
        <h2 class="coupon__title">${coupon.title}</h2>
        <p class="coupon__desc">${coupon.description}</p>
        <button class="btn btn--primary coupon__btn" data-keep-btn data-coupon-key="${key}" ${kept ? "disabled" : ""}>
          ${kept ? coupon.keepMessage : coupon.keepButtonLabel}
        </button>
        <div class="coupon__kept-note" data-kept-note ${kept ? "" : "hidden"}>
          ${(coupon.keepSubtext || []).map((l) => `<p>${l}</p>`).join("")}
        </div>
      </div>`;
  }

  function renderMemoryCoupon(chapter) {
    const c = chapter.content;
    const kept = getKeptCoupons();
    const body = (c.body || []).map((p) => `<p class="msg__paragraph">${p}</p>`).join("");
    const coupons = (c.coupons || [])
      .map((coupon, i) => couponBlockMarkup(coupon, kept.includes(`${chapter.id}-${i}`), `${chapter.id}-${i}`))
      .join("");
    const closing = c.closingLines
      ? `<div class="chapter-goodnight">${linesMarkup(c.closingLines, "final-line--closing")}</div>`
      : "";
    return `
      <article class="chapter-type chapter-type--memory-coupon">
        <p class="chapter-eyebrow">${c.eyebrow || eyebrowNum(chapter.id)}</p>
        <h2 class="chapter-heading">${c.heading}</h2>
        ${body}
        ${coupons}
        ${closing}
      </article>`;
  }

  function wireMemoryCoupon(chapter, root) {
    $$("[data-keep-btn]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.couponKey;
        const kept = new Set(getKeptCoupons());
        if (kept.has(key)) return;
        kept.add(key);
        try {
          localStorage.setItem(STORAGE_KEYS.coupons, JSON.stringify([...kept]));
        } catch {
          /* ignore */
        }
        const index = Number(key.split("-").pop());
        const couponData = chapter.content.coupons[index];
        btn.textContent = couponData.keepMessage;
        btn.disabled = true;
        const card = btn.closest(".coupon");
        card.classList.add("coupon--redeemed");
        card.querySelector("[data-kept-note]").hidden = false;
        burstParticles({ hearts: true, count: 24 });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Chapter 2 — the personal surprise: a staged reveal (open it → wear it
     → listen → goodnight), never naming the object itself.
     --------------------------------------------------------------------- */
  function getSurpriseStage() {
    try {
      return localStorage.getItem(STORAGE_KEYS.surpriseStage) || "open";
    } catch {
      return "open";
    }
  }

  function setSurpriseStage(stage) {
    try {
      localStorage.setItem(STORAGE_KEYS.surpriseStage, stage);
    } catch {
      /* ignore */
    }
  }

  function renderSurprise(chapter) {
    return `
      <article class="chapter-type chapter-type--surprise">
        <p class="chapter-eyebrow">${eyebrowNum(chapter.id)}</p>
        <h2 class="chapter-heading">${chapter.title}</h2>
        <div class="final-scene" data-surprise-scene></div>
      </article>`;
  }

  function wireSurprise(chapter, root) {
    renderSurpriseStage(chapter, $("[data-surprise-scene]", root));
  }

  function renderSurpriseStage(chapter, scene) {
    const c = chapter.content;
    const stage = getSurpriseStage();

    if (stage === "open") {
      scene.innerHTML = `
        <div class="final-block">
          ${linesMarkup(c.openLines)}
          <button class="btn btn--primary final-continue" data-surprise-next style="animation-delay:${c.openLines.length * 0.5 + 0.3}s">${c.openButtonLabel}</button>
        </div>`;
      $("[data-surprise-next]", scene).addEventListener("click", () => {
        setSurpriseStage("wear");
        burstParticles({ hearts: true, count: 24 });
        renderSurpriseStage(chapter, scene);
      });
    } else if (stage === "wear") {
      scene.innerHTML = `
        <div class="final-block">
          ${linesMarkup(c.wearLines)}
          <button class="btn btn--primary final-continue" data-surprise-next style="animation-delay:${c.wearLines.length * 0.5 + 0.3}s">${c.wearButtonLabel}</button>
        </div>`;
      $("[data-surprise-next]", scene).addEventListener("click", () => {
        setSurpriseStage("listen");
        renderSurpriseStage(chapter, scene);
      });
    } else if (stage === "listen") {
      scene.innerHTML = `
        <div class="final-block">
          <p class="final-line">${c.listenLine}</p>
          ${audioCardMarkup(c.audioLabel || "VOICE NOTE", c.audioTitle || "")}
        </div>`;
      const audio = mountAudioPlayer($(".audio-card", scene), c.audioSrc);
      audio.addEventListener("ended", () => {
        setSurpriseStage("done");
        renderSurpriseStage(chapter, scene);
      });
      const skip = document.createElement("button");
      skip.className = "btn btn--ghost final-continue";
      skip.textContent = "Continue";
      skip.addEventListener("click", () => {
        setSurpriseStage("done");
        renderSurpriseStage(chapter, scene);
      });
      $(".final-block", scene).appendChild(skip);
    } else {
      scene.innerHTML = `
        <div class="chapter-goodnight">
          ${linesMarkup(c.goodnightLines, "final-line--closing")}
        </div>`;
    }
  }

  /* ---------------------------------------------------------------------
     Delivery (Chapter 11 — real-world manual unlock)
     --------------------------------------------------------------------- */
  function getDeliveryStage() {
    try {
      return localStorage.getItem(STORAGE_KEYS.deliveryStage) || "A";
    } catch {
      return "A";
    }
  }

  function setDeliveryStage(stage) {
    try {
      localStorage.setItem(STORAGE_KEYS.deliveryStage, stage);
    } catch {
      /* ignore */
    }
  }

  function renderDelivery() {
    return `
      <article class="chapter-type chapter-type--delivery">
        <div class="final-scene" data-delivery-scene></div>
      </article>`;
  }

  function wireDelivery(chapter, root) {
    renderDeliveryStage(chapter, $("[data-delivery-scene]", root));
  }

  function renderDeliveryStage(chapter, scene) {
    const c = chapter.content;
    const stage = getDeliveryStage();

    if (stage === "A") {
      scene.innerHTML = `
        <div class="final-block">
          ${linesMarkup(c.stageA.lines)}
          <button class="btn btn--primary final-continue" data-next style="animation-delay:${c.stageA.lines.length * 0.5 + 0.3}s">${c.stageA.buttonLabel}</button>
        </div>`;
      $("[data-next]", scene).addEventListener("click", () => {
        setDeliveryStage("B");
        renderDeliveryStage(chapter, scene);
      });
    } else if (stage === "B") {
      scene.innerHTML = `
        <div class="final-block">
          ${linesMarkup(c.stageB.lines)}
          <p class="final-line" style="animation-delay:${c.stageB.lines.length * 0.5 + 0.3}s">${c.stageB.prompt}</p>
          <button class="btn btn--primary final-continue" data-next style="animation-delay:${(c.stageB.lines.length + 1) * 0.5 + 0.3}s">${c.stageB.buttonLabel}</button>
        </div>`;
      $("[data-next]", scene).addEventListener("click", () => {
        setDeliveryStage("C");
        burstParticles({ hearts: true, count: 30 });
        renderDeliveryStage(chapter, scene);
      });
    } else {
      scene.innerHTML = `
        <div class="final-block">
          ${linesMarkup(c.stageC.lines, "final-line--closing")}
        </div>`;
      burstParticles({ hearts: true, count: 30 });
    }
  }

  /* ---------------------------------------------------------------------
     Reveal — tap-through anticipation building to a payoff
     (Chapters 8, 9, 10: a teaser line, a few small reveals, then the
     full established content — instead of dumping everything at once.)
     --------------------------------------------------------------------- */
  function renderReveal(chapter) {
    const c = chapter.content;
    return `
      <article class="chapter-type chapter-type--reveal">
        <p class="chapter-eyebrow">${c.eyebrow || eyebrowNum(chapter.id)}</p>
        <h2 class="chapter-heading">${c.heading}</h2>
        <div class="final-scene" data-reveal-scene></div>
      </article>`;
  }

  function wireReveal(chapter, root) {
    const scene = $("[data-reveal-scene]", root);
    const c = chapter.content;
    let stepIndex = -1;

    function stepBlockMarkup(text, image, alt, delay) {
      const img = image
        ? `<div class="photo-frame reveal-step__image">
             <img src="${image}" alt="${alt || ""}" class="photo-frame__img" loading="lazy" />
             <div class="photo-frame__fallback" aria-hidden="true">&#128444;</div>
           </div>`
        : "";
      return `<div class="reveal-step" style="animation-delay:${delay}s">
        <p class="final-line">${text}</p>
        ${img}
      </div>`;
    }

    function renderStage() {
      const isLast = stepIndex >= c.steps.length - 1;
      const delay = 0.15;
      const html =
        stepIndex === -1
          ? stepBlockMarkup(c.teaser, null, null, delay)
          : stepBlockMarkup(c.steps[stepIndex].reveal, c.steps[stepIndex].image, c.steps[stepIndex].imageAlt, delay);
      const buttonLabel = isLast ? c.payoffLabel : c.steps[stepIndex + 1].label;
      scene.innerHTML = `
        <div class="final-block">
          ${html}
          <button class="btn btn--ghost final-continue" data-reveal-btn style="animation-delay:${delay + 0.15}s">${buttonLabel}</button>
        </div>`;
      wireImageFallback(scene);
      $("[data-reveal-btn]", scene).addEventListener("click", () => {
        if (isLast) {
          showPayoff();
        } else {
          stepIndex++;
          renderStage();
        }
      });
    }

    function showPayoff() {
      const p = c.payoff || {};
      const image = p.image
        ? `<div class="photo-frame">
             <img src="${p.image}" alt="${p.alt || ""}" class="photo-frame__img" loading="lazy" />
             <div class="photo-frame__fallback" aria-hidden="true">&#128444;</div>
           </div>`
        : "";
      const body = (p.body || []).map((t) => `<p class="msg__paragraph">${t}</p>`).join("");
      scene.innerHTML = `
        <div class="reveal-payoff">
          ${p.heading ? `<h3 class="chapter-heading chapter-heading--sm">${p.heading}</h3>` : ""}
          ${image}
          ${body}
        </div>`;
      wireImageFallback(scene);
      burstParticles({ hearts: true, count: 14 });
    }

    renderStage();
  }

  /* ---------------------------------------------------------------------
     Story Journey — shared by Chapters 3 through 7. A small deterministic
     state machine: exactly one story beat lives in the DOM at a time.
     Every transition fully replaces `stage.innerHTML`, so old nodes (and
     any listeners on them) are discarded by the browser — there is no
     path to duplicated story text or stacked listeners, even on rapid or
     repeated clicks (each action button is also bound with {once:true}
     as a second layer of protection against a single element firing
     twice).
     --------------------------------------------------------------------- */
  function renderStoryJourney(chapter) {
    const c = chapter.content;
    return `
      <article class="chapter-type chapter-type--story-journey">
        <p class="chapter-eyebrow">${c.eyebrow || eyebrowNum(chapter.id)}</p>
        <h2 class="chapter-heading">${c.heading}</h2>
        <div class="story-stage" data-story-stage></div>
      </article>`;
  }

  function timestampCardMarkup(ts, delay) {
    return `
      <div class="memory-timestamp" style="animation-delay:${delay}s">
        ${ts.label ? `<p class="memory-timestamp__label">${ts.label}</p>` : ""}
        <p class="memory-timestamp__date">${ts.date}</p>
        ${ts.time ? `<p class="memory-timestamp__time">${ts.time}</p>` : ""}
      </div>`;
  }

  function storyLinesMarkup(lines, startDelay = 0.15, step = 0.45) {
    return lines
      .map((line, i) => {
        const delay = startDelay + i * step;
        if (line && typeof line === "object") {
          return `<p class="final-line${line.emphasis ? " final-line--emphasis" : ""}" style="animation-delay:${delay}s">${line.text}</p>`;
        }
        return `<p class="final-line" style="animation-delay:${delay}s">${line}</p>`;
      })
      .join("");
  }

  function storyActionButton(label, delay, isFinal) {
    return `<button class="btn ${isFinal ? "btn--primary" : "btn--ghost"} final-continue" data-story-next style="animation-delay:${delay}s">${label}</button>`;
  }

  function nextChapterHintMarkup(chapter, delay) {
    const nextChapter = CHAPTERS.find((c) => c.id === chapter.id + 1);
    if (!nextChapter || nextChapter.manualUnlock) return "";
    if (getChapterStatus(nextChapter) !== "LOCKED") return "";
    return `<p class="next-chapter-hint" style="animation-delay:${delay}s">Chapter ${String(nextChapter.id).padStart(2, "0")} — ${formatOpensAt(nextChapter.unlockAt)}</p>`;
  }

  function wireStoryJourney(chapter, root) {
    const stage = $("[data-story-stage]", root);
    const eyebrowEl = $(".chapter-eyebrow", root);
    const headingEl = $(".chapter-heading", root);
    const states = chapter.content.states;
    let index = 0;

    function goNext() {
      if (states[index].isFinal) {
        closeChapter();
        return;
      }
      index++;
      render();
    }

    function bindNext(delayAfter) {
      const btn = $("[data-story-next]", stage);
      if (btn) btn.addEventListener("click", goNext, { once: true });
      return delayAfter;
    }

    function render() {
      const s = states[index];
      let html = "";
      let delay = 0.15;

      if (s.badge) {
        html += `<p class="story-badge" style="animation-delay:${delay}s">${s.badge}<span class="fest-card__dots"><span></span><span></span><span></span></span></p>`;
        delay += 0.5;
      }

      if (s.visualType === "opening") {
        html += storyLinesMarkup(s.lines, delay);
        delay += s.lines.length * 0.45 + 0.3;
        html += timestampCardMarkup(s.timestamp, delay);
        delay += 0.6;
        html += storyActionButton(s.action, delay);
      } else if (s.visualType === "fragments") {
        html += storyLinesMarkup(s.lines, delay);
        delay += s.lines.length * 0.45 + 0.2;
        html += `<div class="memory-fragments">${s.fragments
          .map((f, i) => `<span class="memory-fragment" style="animation-delay:${delay + i * 0.15}s">${f}</span>`)
          .join("")}</div>`;
        delay += s.fragments.length * 0.15 + 0.4;
        if (s.afterLines) {
          html += storyLinesMarkup(s.afterLines, delay);
          delay += s.afterLines.length * 0.45 + 0.3;
        }
        html += storyActionButton(s.action, delay, s.isFinal);
      } else if (s.visualType === "statusCheck") {
        html += storyLinesMarkup(s.lines, delay);
        delay += s.lines.length * 0.45 + 0.25;
        html += `<div class="status-check">${s.items
          .map(
            (it, i) =>
              `<p class="status-check__item ${it.ok ? "is-ok" : "is-missing"}" style="animation-delay:${delay + i * 0.25}s">${it.label} <span class="status-check__mark">${it.ok ? "&#10003;" : "&#10007;"}</span></p>`
          )
          .join("")}</div>`;
        delay += s.items.length * 0.25 + 0.4;
        html += `<p class="punch-line punch-line--alert" style="animation-delay:${delay}s">${s.punchLine}</p>`;
        delay += 0.6;
        html += storyActionButton(s.action, delay, s.isFinal);
      } else if (s.visualType === "photo") {
        html += storyLinesMarkup(s.lines, delay);
        delay += s.lines.length * 0.45 + 0.3;
        html += `
          <button type="button" class="story-photo" data-story-photo-tap style="animation-delay:${delay}s">
            <span class="story-photo__label" data-story-photo-label>${s.imageLabel}</span>
            <div class="photo-frame story-photo__frame">
              <img src="${s.image}" alt="${s.imageAlt || ""}" class="photo-frame__img" loading="lazy" />
              <div class="photo-frame__fallback" aria-hidden="true">&#128444;</div>
            </div>
          </button>`;
        if (s.afterLines) {
          html += `<div class="story-photo-after" data-story-photo-after hidden>${storyLinesMarkup(s.afterLines, 0.1, 0.35)}</div>`;
        }
        html += storyActionButton(s.action, delay + 0.3, s.isFinal);
      } else if (s.visualType === "festCard") {
        html += storyLinesMarkup(s.lines, delay);
        delay += s.lines.length * 0.45 + 0.3;
        html += `
          <div class="fest-card" style="animation-delay:${delay}s">
            <p class="fest-card__title">${s.cardTitle}</p>
            <p class="fest-card__loading">${s.cardLoading}<span class="fest-card__dots"><span></span><span></span><span></span></span></p>
          </div>`;
        delay += 0.9;
        html += storyActionButton(s.action, delay, s.isFinal);
      } else if (s.visualType === "jacketPicker") {
        html += storyLinesMarkup(s.lines, delay);
        delay += s.lines.length * 0.45 + 0.3;
        html += `<div class="jacket-picker" data-jacket-picker>${s.jackets
          .map(
            (label, i) => `
              <button type="button" class="jacket-card" data-jacket-card style="animation-delay:${delay + i * 0.15}s">
                <span class="jacket-card__silhouette" aria-hidden="true"></span>
                <span class="jacket-card__label">${label}</span>
              </button>`
          )
          .join("")}</div>`;
        delay += s.jackets.length * 0.15 + 0.35;
        html += `<div class="jacket-reveal" data-jacket-reveal hidden></div>`;
        html += storyActionButton(s.action, delay, s.isFinal);
      } else if (s.visualType === "punchReveal") {
        html += `<p class="punch-line" style="animation-delay:${delay}s">${s.punchLine}</p>`;
        delay += 0.6;
        if (s.punchFollowup) {
          html += `<p class="punch-followup" style="animation-delay:${delay}s">${s.punchFollowup}</p>`;
          delay += 0.5;
        }
        delay += 0.2;
        html += storyLinesMarkup(s.lines, delay);
        delay += s.lines.length * 0.45 + 0.3;
        html += storyActionButton(s.action, delay, s.isFinal);
      } else if (s.visualType === "timestampStory") {
        html += storyLinesMarkup(s.intro, delay);
        delay += s.intro.length * 0.45 + 0.25;
        html += timestampCardMarkup(s.timestamp, delay);
        delay += 0.7;
        html += storyLinesMarkup(s.lines, delay, 0.35);
        delay += s.lines.length * 0.35 + 0.3;
        html += storyActionButton(s.action, delay);
      } else if (s.visualType === "lines") {
        html += storyLinesMarkup(s.lines, delay);
        delay += s.lines.length * 0.45 + 0.3;
        html += storyActionButton(s.action, delay, s.isFinal);
      } else if (s.visualType === "hug") {
        html += storyLinesMarkup(s.lines, delay);
        delay += s.lines.length * 0.45 + 0.25;
        html += `<div class="hug-sequence">`;
        html += `<p class="hug-beat" style="animation-delay:${delay}s">${s.beats[0]}</p>`;
        delay += 0.55;
        html += `<p class="hug-beat hug-beat--twist" style="animation-delay:${delay}s">${s.beats[1]}</p>`;
        delay += 0.6;
        html += `<p class="final-line" style="animation-delay:${delay}s">${s.quoteIntro}</p>`;
        delay += 0.5;
        html += `<p class="hug-quote" style="animation-delay:${delay}s">“${s.quote}”</p>`;
        delay += 0.6;
        html += `<p class="hug-beat" style="animation-delay:${delay}s">${s.closingBeat}</p>`;
        delay += 0.55;
        html += `</div>`;
        html += storyLinesMarkup(s.closingLines, delay);
        delay += s.closingLines.length * 0.45 + 0.3;
        html += storyActionButton(s.action, delay);
      } else if (s.visualType === "thoughts") {
        html += storyLinesMarkup(s.lines, delay);
        delay += s.lines.length * 0.45 + 0.2;
        html += `<div class="thought-fragments">${s.thoughts
          .map((t, i) => `<p class="thought-fragment" style="animation-delay:${delay + i * 0.4}s">${t}</p>`)
          .join("")}</div>`;
        delay += s.thoughts.length * 0.4 + 0.3;
        html += storyLinesMarkup(s.closingLines, delay);
        delay += s.closingLines.length * 0.45 + 0.3;
        html += storyActionButton(s.action, delay);
      } else if (s.visualType === "trail") {
        html += storyLinesMarkup(s.lines, delay);
        delay += s.lines.length * 0.45 + 0.25;
        html += `<div class="memory-trail">${s.trail
          .map((t, i) => `<p class="memory-trail__item" style="animation-delay:${delay + i * 0.35}s">${t}</p>`)
          .join("")}</div>`;
        delay += s.trail.length * 0.35 + 0.3;
        html += storyLinesMarkup(s.closingLines, delay, 0.4);
        delay += s.closingLines.length * 0.4 + 0.3;
        html += storyActionButton(s.action, delay, s.isFinal);
      } else if (s.visualType === "final") {
        html += storyLinesMarkup(s.lines, delay);
        delay += s.lines.length * 0.45 + 0.25;
        html += `<p class="final-line final-line--closing story-timestamp-inline" style="animation-delay:${delay}s">${s.timestampLine}</p>`;
        delay += 0.6;
        html += storyLinesMarkup(s.closingLines, delay, 0.4);
        delay += s.closingLines.length * 0.4 + 0.3;
        html += storyActionButton(s.action, delay, true);
      }

      if (s.isFinal) {
        html += nextChapterHintMarkup(chapter, delay + 0.3);
      }

      stage.innerHTML = `<div class="final-block story-beat">${html}</div>`;
      wireImageFallback(stage);

      if (eyebrowEl) eyebrowEl.hidden = index > 0;
      if (headingEl) headingEl.hidden = index > 0;

      const overlay = document.getElementById("chapter-overlay");
      if (overlay) overlay.scrollTop = 0;

      // Reveals a next-action button that started out `hidden`. Its CSS
      // fade-in animation was authored for its ORIGINAL animation-delay
      // (computed from the beat's other content); simply clearing `hidden`
      // would replay that same delay from scratch, leaving the button
      // invisible-but-present for a second or two after the real reveal —
      // which reads as "the button doesn't show up until I click a bunch
      // of times". Dropping the animation makes it appear the instant the
      // photo/jacket reveal actually happens.
      function revealActionButton(btn) {
        if (!btn) return;
        btn.hidden = false;
        btn.style.animation = "none";
        btn.style.opacity = "1";
      }

      const photoTap = $("[data-story-photo-tap]", stage);
      if (photoTap) {
        const actionBtn = $("[data-story-next]", stage);
        const afterBox = $("[data-story-photo-after]", stage);
        if (actionBtn) actionBtn.hidden = true;
        photoTap.addEventListener(
          "click",
          () => {
            photoTap.classList.add("is-revealed");
            $("[data-story-photo-label]", photoTap).textContent = "";
            if (afterBox) afterBox.hidden = false;
            revealActionButton(actionBtn);
          },
          { once: true }
        );
      }

      const jacketPicker = $("[data-jacket-picker]", stage);
      if (jacketPicker) {
        const actionBtn = $("[data-story-next]", stage);
        const revealBox = $("[data-jacket-reveal]", stage);
        if (actionBtn) actionBtn.hidden = true;
        $$("[data-jacket-card]", jacketPicker).forEach((card) => {
          card.addEventListener(
            "click",
            () => {
              $$("[data-jacket-card]", jacketPicker).forEach((c) => {
                c.disabled = true;
                c.classList.add(c === card ? "jacket-card--picked" : "jacket-card--dim");
              });
              revealBox.hidden = false;
              revealBox.innerHTML = storyLinesMarkup(s.revealLines, 0.05, 0.35);
              revealActionButton(actionBtn);
            },
            { once: true }
          );
        });
      }

      bindNext();
    }

    render();
  }

  /* ---------------------------------------------------------------------
     Bridge — a single quiet line before the final chapter (Chapter 20)
     --------------------------------------------------------------------- */
  function renderBridge(chapter) {
    return `
      <article class="chapter-type chapter-type--bridge">
        <div class="final-scene" data-bridge-scene></div>
      </article>`;
  }

  function wireBridge(chapter, root) {
    const scene = $("[data-bridge-scene]", root);
    const c = chapter.content;
    scene.innerHTML = `
      <div class="final-block">
        ${linesMarkup(c.lines)}
        <button class="btn btn--ghost final-continue" data-bridge-continue style="animation-delay:${c.lines.length * 0.5 + 0.3}s">${c.buttonLabel}</button>
      </div>`;
    $("[data-bridge-continue]", scene).addEventListener("click", closeChapter);
  }

  /* ---------------------------------------------------------------------
     Final chapter (21) — quiet transition, then the last audio
     --------------------------------------------------------------------- */
  function getFinalStage() {
    try {
      return localStorage.getItem(STORAGE_KEYS.finalRevealSeen) || "intro";
    } catch {
      return "intro";
    }
  }

  function setFinalStage(stage) {
    try {
      localStorage.setItem(STORAGE_KEYS.finalRevealSeen, stage);
    } catch {
      /* ignore */
    }
  }

  function renderFinal(chapter) {
    return `
      <article class="chapter-type chapter-type--final">
        <div class="final-scene" data-final-scene></div>
      </article>`;
  }

  function wireFinal(chapter, root) {
    renderFinalStage(chapter, $("[data-final-scene]", root));
  }

  function linesMarkup(lines, extraClass = "") {
    return lines
      .map(
        (line, i) =>
          `<p class="final-line ${extraClass}" style="animation-delay:${i * 0.5 + 0.15}s">${line}</p>`
      )
      .join("");
  }

  function renderFinalStage(chapter, scene) {
    const c = chapter.content;
    const stage = getFinalStage();

    if (stage === "intro") {
      scene.innerHTML = `
        <div class="final-block">
          ${linesMarkup(c.openingLines)}
          <button class="btn btn--ghost final-continue" data-continue style="animation-delay:${c.openingLines.length * 0.5 + 0.3}s">Continue</button>
        </div>`;
      $("[data-continue]", scene).addEventListener("click", () => {
        setFinalStage("anticipation");
        renderFinalStage(chapter, scene);
      });
    } else if (stage === "anticipation") {
      scene.innerHTML = `
        <div class="final-block">
          ${linesMarkup(c.anticipationLines, "final-line--closing")}
          <button class="btn btn--primary final-continue" data-listen style="animation-delay:${c.anticipationLines.length * 0.5 + 0.3}s">Continue</button>
        </div>`;
      $("[data-listen]", scene).addEventListener("click", () => {
        setFinalStage("listen");
        renderFinalStage(chapter, scene);
      });
    } else if (stage === "listen") {
      scene.innerHTML = `
        <div class="final-block">
          ${c.afterClickLine ? `<p class="final-line">${c.afterClickLine}</p>` : ""}
          ${audioCardMarkup("VOICE NOTE", c.playButtonLabel || "Play")}
        </div>`;
      const audio = mountAudioPlayer($(".audio-card", scene), c.finalAudio);
      audio.addEventListener("ended", () => {
        setFinalStage("done");
        renderFinalStage(chapter, scene);
      });
      const skip = document.createElement("button");
      skip.className = "btn btn--ghost final-continue";
      skip.textContent = "Continue";
      skip.addEventListener("click", () => {
        setFinalStage("done");
        renderFinalStage(chapter, scene);
      });
      $(".final-block", scene).appendChild(skip);
    } else {
      scene.innerHTML = `
        <div class="final-block">
          ${linesMarkup(c.closingLines, "final-line--closing")}
        </div>`;
      burstParticles({ hearts: true, count: 44 });
    }
  }

  /* ---------------------------------------------------------------------
     Particles / confetti (hearts) — respects prefers-reduced-motion
     --------------------------------------------------------------------- */
  const canvas = document.getElementById("fx-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  let particles = [];
  let rafId = null;

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function burstParticles({ count = 20 } = {}) {
    if (!ctx || prefersReducedMotion()) return;
    const glyphs = ["❤", "✦", "✧"];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 20,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(1 + Math.random() * 1.8),
        size: 10 + Math.random() * 14,
        life: 0,
        maxLife: 90 + Math.random() * 60,
        glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
        rotation: (Math.random() - 0.5) * 0.6,
      });
    }
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      const t = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.font = `${p.size}px serif`;
      ctx.fillStyle = "#e7c98f";
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * t);
      ctx.fillText(p.glyph, 0, 0);
      ctx.restore();
    });
    particles = particles.filter((p) => p.life < p.maxLife);
    if (particles.length > 0) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ---------------------------------------------------------------------
     Dev panel
     --------------------------------------------------------------------- */
  function populateDevChapterSelect() {
    const select = $("#dev-chapter-select");
    if (!select) return;
    select.innerHTML = CHAPTERS.map(
      (c) => `<option value="${c.id}">${String(c.id).padStart(2, "0")} — ${c.title}</option>`
    ).join("");
  }

  function openChapterById(id) {
    const chapter = CHAPTERS.find((c) => c.id === id);
    if (!chapter) return;
    if ($("#screen-dashboard").hidden) enterDashboard();
    openChapter(chapter);
  }

  function initDevPanel() {
    if (!CONFIG.devMode) return;
    const panel = $("#dev-panel");
    panel.hidden = false;
    populateDevChapterSelect();

    panel.addEventListener("click", (e) => {
      const action = e.target?.dataset?.dev;
      if (!action) return;

      if (action === "unlock-all") {
        window.__DEV_UNLOCK_ALL__ = true;
        renderDashboard();
      } else if (action === "restore-time") {
        window.__DEV_UNLOCK_ALL__ = false;
        window.__DEV_FAKE_NOW__ = null;
        renderDashboard();
      } else if (action === "simulate-time") {
        const select = $("#dev-time-select");
        const [days, hours, minutes] = select.value.split(",").map(Number);
        window.__DEV_UNLOCK_ALL__ = false;
        window.__DEV_FAKE_NOW__ = new Date(unlockTime(days, hours, minutes)).getTime();
        renderDashboard();
        updateDevClocks();
      } else if (action === "open-chapter") {
        const select = $("#dev-chapter-select");
        window.__DEV_UNLOCK_ALL__ = true;
        openChapterById(Number(select.value));
      } else if (action === "test-surprise") {
        window.__DEV_UNLOCK_ALL__ = true;
        openChapterById(2);
      } else if (action === "test-morning") {
        showScreen("screen-morning");
      } else if (action === "test-ranjha") {
        enterRanjhaScreen();
      } else if (action === "test-delivery") {
        window.__DEV_UNLOCK_CH11__ = !window.__DEV_UNLOCK_CH11__;
        const btn = $("#dev-test-delivery-btn");
        if (btn) btn.textContent = `TEST MANUAL DELIVERY: ${window.__DEV_UNLOCK_CH11__ ? "ON" : "OFF"}`;
        renderDashboard();
      } else if (action === "reset-everything") {
        const ok = window.confirm(
          "Reset all developer progress? This clears opened chapters, kept coupons, the final reveal state, the delivery-test stage, and the morning-interlude flag, then reloads the page."
        );
        if (!ok) return;
        Object.values(STORAGE_KEYS).forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch {
            /* ignore */
          }
        });
        window.__DEV_UNLOCK_ALL__ = false;
        window.__DEV_UNLOCK_CH11__ = false;
        window.__DEV_FAKE_NOW__ = null;
        window.location.reload();
      } else if (action === "close") {
        panel.hidden = true;
      }
    });
  }

  function updateDevClocks() {
    const browserEl = $("#dev-browser-time");
    const istEl = $("#dev-ist-time");
    if (!browserEl || !istEl) return;
    const simulating = window.__DEV_FAKE_NOW__ != null;
    const now = new Date(getNow());
    browserEl.textContent = simulating ? "SIMULATED TIME:" : `Browser: ${now.toLocaleString()}`;
    istEl.textContent = `IST: ${now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;
  }

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initLanding();
    initMorningInterlude();
    BackgroundMusic.init();
    initDevPanel();

    $("#chapter-close").addEventListener("click", closeChapter);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#chapter-overlay").hidden) closeChapter();
    });

    startGlobalTicker(tick);
  });
})();
