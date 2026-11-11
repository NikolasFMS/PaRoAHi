(() => {
  const D = window.PRH_DATA,
    G = window.PRH_GAME;
  const $ = (id) => document.getElementById(id);
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const PREF_KEY = `prh_ghp_${G.SLUG}_prefs_v2`;
  const LEGACY_PREF_KEY = "parks-roll-hike-helper-prefs-v1";
  const DEFAULT_SETTINGS = { trackScores: true, trackParkUse: true };
  const readPreferences = () => {
    try {
      const current = localStorage.getItem(PREF_KEY);
      if (current) return { ...DEFAULT_SETTINGS, ...JSON.parse(current) };
      const legacy = localStorage.getItem(LEGACY_PREF_KEY);
      if (legacy) {
        const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(legacy) };
        try { localStorage.setItem(PREF_KEY, JSON.stringify(parsed)); } catch {}
        return parsed;
      }
      return { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  };
  const storePreferences = (value) => {
    prefs = { ...prefs, ...value };
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch {}
  };
  const keyIcon = {
    forest: "forest",
    mountain: "mountain",
    flower: "flower",
    park: null,
    binoculars: "binoculars",
    water: "water",
    pencil: "pencil",
    canteen: "water",
    arrowhead: null,
    bear: "bear",
    turtle: "turtle",
    fish: "fish",
    bird: "bird",
  };
  let pendingChoice = null,
    prefs = readPreferences();
  let game = G.load(),
    setupRange = "small",
    setupCount = 2,
    setupPark = G.randomPark().id,
    setupRandom = true,
    setupNames = ["Игрок 1", "Игрок 2", "Игрок 3", "Игрок 4"],
    toastHandle = null;

  // --- 1. Wake Lock API (Режим «Экран не гаснет») ---
  let wakeLockSentinel = null;
  let isWakeLockRequested = false;

  const updateWakeLockUI = (active) => {
    const btn = $("wakeLockBtn");
    const text = $("wakeLockText");
    if (!btn || !text) return;
    btn.classList.toggle("active", active);
    text.textContent = active ? "Бодрствует" : "Экран: авто";
    btn.title = active
      ? "Экран смартфона не погаснет во время игры (нажмите для выключения)"
      : "Режим «Экран не гаснет» (нажмите, чтобы экран оставался включённым)";
  };

  const requestWakeLock = async () => {
    if (!("wakeLock" in navigator)) {
      showToast("Wake Lock API не поддерживается в этом браузере");
      return false;
    }
    try {
      wakeLockSentinel = await navigator.wakeLock.request("screen");
      isWakeLockRequested = true;
      wakeLockSentinel.addEventListener("release", () => {
        wakeLockSentinel = null;
        if (!isWakeLockRequested) updateWakeLockUI(false);
      });
      updateWakeLockUI(true);
      return true;
    } catch (err) {
      console.warn("Wake Lock request error:", err);
      updateWakeLockUI(false);
      return false;
    }
  };

  const releaseWakeLock = async () => {
    isWakeLockRequested = false;
    if (wakeLockSentinel) {
      try {
        await wakeLockSentinel.release();
      } catch {}
      wakeLockSentinel = null;
    }
    updateWakeLockUI(false);
  };

  const toggleWakeLock = async () => {
    if (wakeLockSentinel) {
      await releaseWakeLock();
      showToast("Режим «Экран не гаснет» отключён");
    } else {
      const ok = await requestWakeLock();
      if (ok) showToast("Экран не погаснет во время игры! ☀️");
      else showToast("Не удалось включить режим бодрствования экрана");
    }
  };

  // --- 2. Тема «Ночной лагерь» (Campfire Dark Mode) ---
  const applyTheme = (themeName) => {
    const isCampfire = themeName === "campfire";
    document.body.classList.toggle("theme-campfire", isCampfire);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.content = isCampfire ? "#1a1612" : "#f6edcf";
    }
    const btn = $("themeToggleBtn");
    if (btn) {
      btn.textContent = isCampfire ? "☀️" : "🔥";
      btn.title = isCampfire
        ? "Переключить на дневную тему"
        : "Тема «Ночной лагерь» (у костра)";
    }
  };

  const toggleTheme = () => {
    const current = prefs.theme === "campfire" ? "default" : "campfire";
    storePreferences({ theme: current });
    applyTheme(current);
    showToast(
      current === "campfire"
        ? "Тема «Ночной лагерь» активирована 🔥"
        : "Дневная тема восстановлена ☀️"
    );
  };

  // --- 3. Анимация кубиков, звук и тактильная отдача ---
  const triggerHaptic = (pattern = 30) => {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {}
  };

  const playDiceSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [0, 0.08, 0.17].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(140 + idx * 35, now + delay);
        osc.frequency.exponentialRampToValueAtTime(45, now + delay + 0.06);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.07);
      });
    } catch {}
  };

  const animateDiceRoll = () => {
    triggerHaptic([30, 40, 40]);
    playDiceSound();
    const diceEls = document.querySelectorAll("#dicePool .die");
    diceEls.forEach((el) => {
      el.classList.remove("rolling");
      void el.offsetWidth;
      el.classList.add("rolling");
    });
  };

  // --- 4. Журнал ходов дня (Action History Drawer) ---
  let historyDrawerOpen = false;

  const toggleHistoryDrawer = () => {
    historyDrawerOpen = !historyDrawerOpen;
    const drawer = $("actionHistoryDrawer");
    const content = $("historyContent");
    const arrow = $("historyArrow");
    const btn = $("historyToggleBtn");
    if (!drawer || !content) return;
    drawer.classList.toggle("open", historyDrawerOpen);
    content.hidden = !historyDrawerOpen;
    btn.setAttribute("aria-expanded", String(historyDrawerOpen));
    if (arrow) arrow.textContent = historyDrawerOpen ? "▼" : "▲";
  };

  const renderActionHistory = () => {
    if (!game) return;
    const drawer = $("actionHistoryDrawer");
    if (!drawer) return;
    const history = game.actionHistory || [];
    // Filter actions for current round (ignore system initial items)
    const currentDayActions = history.filter(
      (a) => a.round === game.round && a.kind !== "system" && a.who !== "Старт",
    );
    const countBadge = $("historyCount");
    if (countBadge) countBadge.textContent = currentDayActions.length;

    const listEl = $("historyList");
    if (!listEl) return;

    if (currentDayActions.length === 0) {
      listEl.innerHTML =
        '<div class="history-empty">Ходов в этом дне пока нет. Бросьте кубики и выберите ход!</div>';
      return;
    }

    // Sort newest turn at top
    const sorted = [...currentDayActions].sort(
      (a, b) =>
        (b.turn || 0) - (a.turn || 0) ||
        (b.timestamp || b.time || 0) - (a.timestamp || a.time || 0),
    );

    const items = sorted
      .map((act) => {
        const isLead = act.lead || act.kind === "lead" || act.dieId === 5;

        // Parse die ID safely if missing from legacy records
        let dieId = act.dieId;
        if (!dieId) {
          if (isLead) dieId = 5;
          else if (act.text) {
            const match = act.text.match(/кубик (\d+)/i);
            if (match) dieId = Number(match[1]);
          }
        }

        const playerName = act.playerName || act.who || "Игрок";
        const badgeCls = isLead ? "history-badge lead" : "history-badge";
        const badgeText = isLead
          ? "Ведущий"
          : dieId
            ? `Кубик ${dieId}`
            : "Поход";

        const timeVal = act.timestamp || act.time;
        const time = timeVal
          ? new Date(timeVal).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "";

        const faceLabel =
          act.faceLabel ||
          (isLead
            ? "Кубик ведущего"
            : dieId
              ? `Кубик похода ${dieId}`
              : "Ход похода");
        const summaryText = act.summary || act.text || "";

        let chosenRow = "";
        if (act.chosenIcon) {
          const isUnusable = act.chosenIcon === "__unusable";
          const currentLandmark = park() ? park().landmark : "Достопримечательность";
          const labelMap = {
            bear: "Медведь",
            turtle: "Черепаха",
            fish: "Рыба",
            bird: "Птица",
            sun: "Солнце (+1 ☀)",
            water: "Вода",
            canteen: "Вода",
            pencil: "Карандаш",
            binoculars: "Бинокль",
            flower: "Цветок",
            forest: "Дерево",
            mountain: "Гора",
            arrowhead: currentLandmark,
            park: currentLandmark,
            __unusable: "Солнце (+1 ☀, замена)"
          };
          const label = act.chosenLabel || labelMap[act.chosenIcon] || act.chosenIcon;
          chosenRow = `<div class="history-chosen-row"><span class="chosen-tag">${isUnusable ? "Замена на солнце:" : "Выбрано:"}</span> <strong>${esc(label)}</strong></div>`;
        }

        return `<div class="history-item">
        <div class="history-item-header">
          <span class="${badgeCls}">${badgeText}</span>
          <strong class="history-player">${esc(playerName)}</strong>
          <span class="history-time">${time}</span>
        </div>
        <div class="history-item-body">
          <div class="history-face">${esc(faceLabel)}</div>
          ${chosenRow}
          <div class="history-desc">${esc(summaryText)}</div>
        </div>
      </div>`;
      })
      .join("");

    listEl.innerHTML = items;
  };

  // --- 5. Мини-игра «Выбор первого игрока» (Finger Chooser / Chwazi) ---
  let fingerChooserTimer = null;
  const activeFingers = new Map();
  const FINGER_COLORS = [
    "#2d6a4f", "#e76f51", "#2a9d8f", "#e9c46a", "#457b9d", "#9b5de5"
  ];

  const openFingerChooser = () => {
    $("fingerChooserOverlay").hidden = false;
    $("chooserInstruction").textContent =
      `Приложите пальцы (${setupCount} игроков) к экрану и удерживайте 2 секунды...`;
    $("fingerTouchArea").innerHTML =
      '<div class="touch-prompt">Поместите пальцы в эту область</div>';
    activeFingers.clear();
    clearTimeout(fingerChooserTimer);
  };

  const closeFingerChooser = () => {
    $("fingerChooserOverlay").hidden = true;
    activeFingers.clear();
    clearTimeout(fingerChooserTimer);
  };

  const updateTouchCircles = () => {
    const area = $("fingerTouchArea");
    if (!area) return;
    const prompt = area.querySelector(".touch-prompt");
    if (activeFingers.size > 0 && prompt) {
      prompt.style.display = "none";
    } else if (activeFingers.size === 0 && prompt) {
      prompt.style.display = "block";
    }
  };

  const evaluateFingerChooser = () => {
    clearTimeout(fingerChooserTimer);
    const count = activeFingers.size;
    const prompt = $("chooserInstruction");
    if (count < 2) {
      if (prompt) prompt.textContent = "Нужно хотя бы 2 пальца на экране...";
      return;
    }
    if (prompt) prompt.textContent = "Держите! Выбираем первого игрока...";

    fingerChooserTimer = setTimeout(() => {
      if (activeFingers.size < 2) return;
      const keys = Array.from(activeFingers.keys());
      const winnerId = keys[Math.floor(Math.random() * keys.length)];
      triggerHaptic([60, 40, 100]);

      activeFingers.forEach((finger, id) => {
        if (id === winnerId) {
          finger.el.classList.add("winner");
        } else {
          finger.el.classList.add("faded");
        }
      });

      const winnerIndex = Math.floor(Math.random() * setupCount);
      const winnerName = setupNames[winnerIndex] || `Игрок ${winnerIndex + 1}`;
      $("firstPlayerSelect").value = String(winnerIndex);
      if (prompt) prompt.innerHTML = `🎉 Первым ходит <strong>${esc(winnerName)}</strong>!`;

      setTimeout(() => {
        closeFingerChooser();
        showToast(`Первый игрок выбран: ${winnerName}! 🎲`);
      }, 1600);
    }, 2000);
  };

  const pickRandomWheelPlayer = () => {
    const winnerIndex = Math.floor(Math.random() * setupCount);
    const winnerName = setupNames[winnerIndex] || `Игрок ${winnerIndex + 1}`;
    $("firstPlayerSelect").value = String(winnerIndex);
    triggerHaptic(50);
    closeFingerChooser();
    showToast(`Случайный первый игрок: ${winnerName}! 🎲`);
  };
  const settings = () => ({
    ...DEFAULT_SETTINGS,
    ...prefs,
    ...((game && game.settings) || {}),
    trackSuns: false,
    nightChecklist: false,
  });
  const park = () =>
    D.parks.find((p) => p.id === (game && game.parkId)) ||
    D.parks.find((p) => p.id === setupPark) ||
    D.parks[0];
  const iconHTML = (key, small = false) => {
    if (key === "sun")
      return '<span class="sun-emoji" aria-label="солнце">☀</span>';
    if (key === "park" || key === "arrowhead") {
      const p = park();
      const lSrc = p && p.landmarkIcon && D.assets[p.landmarkIcon];
      if (lSrc) {
        return `<img ${small ? 'class="small-symbol"' : ""} class="icons landmark-symbol" src="${lSrc}" alt="${esc(p.landmark)}">`;
      }
      return '<span class="site-text" aria-label="достопримечательность">✦</span>';
    }
    if (key === "canteen") key = "water";
    const src = D.assets[key] || D.assets[keyIcon[key]];
    if (!src) return `<span class="site-text">${esc(key)}</span>`;
    return `<img ${small ? 'class="small-symbol"' : ""} class="icons" src="${src}" alt="${esc(key)}">`;
  };
  const getFaceLabel = (face) => {
    if (!face) return "";
    const p = park();
    const lName = p ? p.landmark : "Ориентир";
    if (
      face.icons.length === 1 &&
      (face.icons[0] === "arrowhead" || face.icons[0] === "park")
    ) {
      return lName;
    }
    if (
      face.icons.length === 2 &&
      (face.icons.includes("arrowhead") || face.icons.includes("park")) &&
      face.icons.includes("sun")
    ) {
      return `${lName} + солнце`;
    }
    return face.label;
  };
  const showToast = (text) => {
    const t = $("toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toastHandle);
    toastHandle = setTimeout(() => t.classList.remove("show"), 2700);
  };
  const scrollToRouteCard = () => {
    setTimeout(() => {
      const card = document.querySelector(".route-card");
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
  };
  const showModal = (html) => {
    $("modalBody").innerHTML = html;
    $("modalBackdrop").hidden = false;
    document.body.classList.add("modal-open");
    const m = document.querySelector(".modal");
    if (m) {
      m.scrollTop = 0;
      setTimeout(() => {
        m.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    }
  };
  const hideModal = () => {
    $("modalBackdrop").hidden = true;
    document.body.classList.remove("modal-open");
  };
  const goScreen = (id) => {
    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.toggle("active", s.id === `screen-${id}`));
    $("topbar").hidden = id === "splash";
    $("appFooter").hidden = !["board", "night", "summary"].includes(id);
    if (!["board", "night", "summary"].includes(id))
      window.scrollTo({ top: 0, behavior: "smooth" });
    else if (id === "board")
      scrollToRouteCard();
  };
  const setStartButton = () => {
    const resumable = game && ["day", "night", "summary"].includes(game.phase);
    $("startButton").innerHTML = resumable
      ? "Продолжить поход <span>→</span>"
      : "Начать поход <span>→</span>";
    $("newSetupButton").hidden = !resumable;
  };
  const renderSetup = () => {
    document
      .querySelectorAll(".segment")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.range === setupRange),
      );
    const choices = setupRange === "small" ? [1, 2] : [3, 4];
    if (!choices.includes(setupCount)) setupCount = choices[choices.length - 1];
    $("countPick").innerHTML = choices
      .map(
        (n) =>
          `<button class="count-option ${setupCount === n ? "active" : ""}" data-count="${n}">${n}</button>`,
      )
      .join("");
    $("playerFields").innerHTML = Array.from(
      { length: setupCount },
      (_, i) =>
        `<input class="player-name" data-name-index="${i}" maxlength="22" value="${esc(setupNames[i] || `Игрок ${i + 1}`)}" aria-label="Имя игрока ${i + 1}" placeholder="Игрок ${i + 1}">`,
    ).join("");
    $("firstPlayerSelect").innerHTML = Array.from(
      { length: setupCount },
      (_, i) =>
        `<option value="${i}">${esc(setupNames[i] || `Игрок ${i + 1}`)}</option>`,
    ).join("");
    $("soloNote").hidden = setupCount !== 1;
    $("soloNote").innerHTML =
      setupCount === 1
        ? "<strong>🌲 Официальный соло-поход:</strong> Вы исследуете тропу в одиночку, управляя расходом солнца и продвижением группы. По итогам 3 дней приложение рассчитает ваш официальный <strong>Рейтинг рейнджера</strong> (от Новичка до Легендарного исследователя)!"
        : "";
    $("parkGrid").innerHTML = D.parks
      .map(
        (p) =>
          `<button class="park-choice ${p.id === setupPark ? "active" : ""}" data-park="${p.id}"><img src="${p.front}" alt=""><span>${esc(p.name)}</span></button>`,
      )
      .join("");
    $("parkModeLabel").textContent = setupRandom
      ? "Случайный выбор"
      : "Выбор вручную";
    const selected = D.parks.find((p) => p.id === setupPark) || D.parks[0];
    const selectedIcon = D.assets[selected.landmarkIcon]
      ? `<img src="${D.assets[selected.landmarkIcon]}" style="width:16px;height:16px;vertical-align:middle;display:inline-block;margin-right:4px;" alt="">`
      : "";
    $("selectedParkNote").innerHTML =
      `<strong>${esc(selected.name)}</strong> · ${selectedIcon}достопримечательность: <strong>${esc(selected.landmark)}</strong>. ${setupRandom ? "Случайный парк уже выбран." : "Парк выбран вручную."}`;
  };
  const renderParkSummary = (target, p) => {
    const landmarkSrc = D.assets[p.landmarkIcon];
    const landmarkImg = landmarkSrc
      ? `<img src="${landmarkSrc}" class="summary-landmark-img" alt="${esc(p.landmark)}" style="width:18px;height:18px;vertical-align:middle;display:inline-block;margin-right:6px;">`
      : "";
    const rows = [
      ["Достопримечательность", `${landmarkImg}<strong>${esc(p.landmark)}</strong> · ${esc(p.journal)}`],
      ["Ночной бонус", p.night],
      ["Подсчёт очков", p.score],
    ];
    if (p.special) rows.unshift(["Особое правило", p.special]);
    target.innerHTML = rows
      .map(
        ([a, b]) =>
          `<div class="rule-block"><strong>${esc(a)}</strong><span>${b}</span></div>`,
      )
      .join("");
  };
  const renderParkCard = () => {
    if (!game) return;
    const p = park(),
      src = game.parkSide === "front" ? p.front : p.back;
    $("parkMiniImage").src = src;
    $("parkMiniLabel").textContent = p.name;
    $("parkDetailImage").src = src;
    $("parkDetailImage").alt =
      `${p.name} — ${game.parkSide === "front" ? "лицевая" : "оборотная"} сторона`;
    $("parkTitle").textContent = p.name;
    $("parkMiniImage").alt = `${p.name} — карта парка`;
    $("parkFlipText").textContent =
      game.parkSide === "front" ? "Оборот ↻" : "Лицевая ↻";
    renderParkSummary($("parkRuleSummary"), p);
    renderParkSummary($("nightParkSummary"), p);
    $("nightParkTitle").textContent = p.name;
    $("nightParkImage").src = src;
    $("nightParkImage").alt = `${p.name} — ${game.parkSide === "front" ? "лицевая" : "оборотная"} сторона`;
    const nightFlip = $("nightFlipParkBtn");
    if (nightFlip) {
      nightFlip.textContent = game.parkSide === "front" ? "Перевернуть на оборот ↻" : "Перевернуть на лицевую ↻";
    }
  };
  const playerAvatar = (name) =>
    Array.from(name.trim())[0]?.toUpperCase() || "✦";
  let pendingLeadMove = null;

  const executeLeadMove = () => {
    if (!pendingLeadMove) return;
    const move = pendingLeadMove;
    pendingLeadMove = null;
    hideModal();
    scrollToRouteCard();

    // Now render the updated position: token smoothly travels to move.toIndex!
    renderRoute();

    if (move.isFinish) {
      setTimeout(() => {
        if (game) renderNight();
        showToast("Группа пришла в лагерь на финише · начинается ночь!");
      }, 950);
    } else {
      showToast(
        `Группа продвинулась к стоянке ${move.toIndex}; следующий игрок бросает кубики`,
      );
    }
  };

  const renderRoute = () => {
    const wrap = $("trailMarkers"),
      points = G.routePoints.slice(0, game.routeLength);
    $("startMarker").style.left = `${G.startPoint.x}%`;
    $("startMarker").style.top = `${G.startPoint.y}%`;

    const activeIndex = pendingLeadMove
      ? pendingLeadMove.fromIndex
      : game.routeIndex;

    wrap.innerHTML = points
      .map((pt, i) => {
        const token = game.routeTokens[i];
        const cls = [
          "trail-marker",
          activeIndex > i ? "visited" : "",
          activeIndex === i + 1 ? "current-site" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `<div class="${cls}" style="left:${pt.x}%;top:${pt.y}%" title="Стоянка ${i + 1}: ${esc(token.title)}">${iconHTML(token.icon)}</div>`;
      })
      .join("");

    // Update finishMarker state
    const finishEl = $("finishMarker");
    if (finishEl) {
      finishEl.style.left = `${G.finishPoint.x}%`;
      finishEl.style.top = `${G.finishPoint.y}%`;
      const isReached = activeIndex > game.routeLength;
      const isNext = activeIndex === game.routeLength;
      finishEl.classList.toggle("reached", isReached);
      finishEl.classList.toggle("visited", isReached);
      finishEl.classList.toggle("current-site", isNext);
    }

    const pos =
      activeIndex === 0
        ? G.startPoint
        : activeIndex <= game.routeLength
          ? points[activeIndex - 1] || points[0]
          : G.finishPoint;

    const tokenEl = $("groupToken");
    const prevLeft = tokenEl.style.left;
    tokenEl.style.left = `${pos.x}%`;
    tokenEl.style.top = `${pos.y}%`;

    // 4. Animated trail marker (smooth travel + bobbing + haptics)
    if (prevLeft && prevLeft !== `${pos.x}%`) {
      tokenEl.classList.remove("moving");
      void tokenEl.offsetWidth;
      tokenEl.classList.add("moving");
      triggerHaptic(40);
      setTimeout(() => tokenEl.classList.remove("moving"), 900);
    }

    $("routeCount").textContent =
      activeIndex > game.routeLength
        ? "ФИНИШ"
        : `${activeIndex} / ${game.routeLength}`;

    const next = game.routeTokens[activeIndex];
    $("routeTitle").textContent =
      activeIndex > game.routeLength
        ? "Лагерь на финише"
        : activeIndex === game.routeLength
          ? "Последняя стоянка"
          : activeIndex === 0
            ? "Группа у тропы"
            : "Группа в пути";

    if (activeIndex === 0) {
      $("routeStatus").innerHTML =
        `Группа на старте. Следующая стоянка: <strong>${esc(next ? next.title : "")}</strong>. Кубик ведущего: потратьте ${G.remainingHiking(game)} ☀.`;
    } else if (activeIndex < game.routeLength) {
      const current = game.routeTokens[activeIndex - 1];
      $("routeStatus").innerHTML =
        `<strong>Стоянка ${activeIndex}: ${esc(current.title)}.</strong> ${esc(current.instruction)} Следующая: <strong>${esc(next ? next.title : "")}</strong>.`;
    } else if (activeIndex === game.routeLength) {
      const current = game.routeTokens[game.routeLength - 1];
      $("routeStatus").innerHTML =
        `<strong>Стоянка ${activeIndex}: ${esc(current.title)}.</strong> ${esc(current.instruction)} Все стоянки пройдены! Следующий ход ведущего переводит группу в <strong>Лагерь на финише</strong>.`;
    } else {
      $("routeStatus").innerHTML =
        `<strong>ФИНИШ · Лагерь похода.</strong> Дневной маршрут завершён. Группа на ночлеге — выполните действия ночной фазы.`;
    }
  };
  const renderDice = () => {
    const pool = game.dicePool || [];
    $("undoDieButton").hidden = !canUndoDie();
    const canReroll =
      game.rollPending || pool.length === 5 || pool.length === 0;
    $("rerollButton").disabled = !canReroll || game.phase !== "day";
    $("rerollButton").textContent = game.rollPending
      ? "🎲 Бросить кубики"
      : canReroll
        ? "↻ Перебросить кубики"
        : "✓ Кубики брошены";
    $("diceInstruction").textContent = game.rollPending
      ? `Ходит ${game.players[game.active].name}. Бросьте все 5 кубиков, затем выберите один.`
      : "Выберите один кубик из пула. Если на символах нет черты, применяются оба; при косой черте выберите один.";
    if (game.rollPending || pool.length === 0) {
      $("dicePool").innerHTML =
        `<div class="roll-prompt"><span>🎲</span><strong>Кубики ждут броска</strong><small>Все четыре кубика похода и кубик ведущего</small></div>`;
      return;
    }
    const rolled = game.rolledPool || [];
    const taken = game.takenFaces || {};

    $("dicePool").innerHTML = D.dice
      .map((d) => {
        const item = pool.find((x) => x.id === d.id),
          used = !item;

        let faceIndex = null;
        if (item) {
          faceIndex = item.face;
        } else if (taken[d.id] !== undefined && taken[d.id] !== null) {
          faceIndex = taken[d.id];
        } else {
          const fromRolled = rolled.find((x) => x.id === d.id);
          if (fromRolled) faceIndex = fromRolled.face;
        }

        const face =
          faceIndex !== null && faceIndex !== undefined
            ? d.faces[faceIndex]
            : null;
        const cost = d.id === 5 ? G.remainingHiking(game) : 0;
        let faceHtml = "";
        const chosenIcon =
          used && game.takenChoices ? game.takenChoices[d.id] : null;

        if (face) {
          if (used && face.slash && chosenIcon) {
            // Requirement 3: After choosing a slash symbol, display ONLY the chosen symbol and caption!
            const isUnusableSun =
              chosenIcon === "__unusable" || chosenIcon === "sun";
            const effectiveIcon = isUnusableSun ? "sun" : chosenIcon;
            const iconNameMap = {
              bear: "Медведь",
              turtle: "Черепаха",
              fish: "Рыба",
              bird: "Птица",
              sun: "Солнце (+1 ☀)",
              water: "Вода",
              canteen: "Вода",
              pencil: "Карандаш",
              binoculars: "Бинокль",
              flower: "Цветок",
              forest: "Дерево",
              mountain: "Гора",
              arrowhead: park().landmark,
              park: park().landmark,
            };
            const labelText = iconNameMap[effectiveIcon] || effectiveIcon;
            faceHtml = `<div class="die-face die-face-used">${iconHTML(effectiveIcon)}</div><div class="die-caption">${esc(labelText)}</div>`;
          } else {
            faceHtml = `<div class="die-face ${used ? "die-face-used" : ""}">${face.icons.map((k, i) => `${i && face.slash ? '<span class="slash">/</span>' : ""}${iconHTML(k, face.icons.length > 1)}`).join("")}</div><div class="die-caption">${esc(getFaceLabel(face))}</div>`;
          }
        } else {
          faceHtml = `<div class="die-face">${d.lead ? "🟠" : "⬜"}</div><div class="die-caption">${used ? "Кубик взят" : "—"}</div>`;
        }

        const title =
          d.id === 5
            ? `Кубик ведущего · цена ${cost} ☀`
            : `Кубик похода ${d.id}${face ? " · " + getFaceLabel(face) : ""}`;
        return `<button class="die ${d.lead ? "lead-die" : ""} ${used ? "die-used" : ""}" data-die="${d.id}" ${used ? "disabled" : ""} title="${title}"><span class="die-number">${d.lead ? "ВЕДУЩИЙ" : `КУБИК ${d.id}`}</span>${faceHtml}${used ? '<span class="die-taken">ВЗЯТ</span>' : ""}</button>`;
      })
      .join("");
  };
  const renderBoard = () => {
    if (!game) return;
    goScreen("board");
    $("gameModeLabel").textContent =
      `${game.count} ${game.count === 1 ? "ИГРОК" : "ИГРОКА"} · ТРИ ДНЯ В ПОХОДЕ`;
    $("roundTitle").textContent = `День ${game.round}`;
    $("phaseChip").textContent =
      game.phase === "day" ? "ДНЕВНОЙ ПОХОД" : "НОЧНАЯ ФАЗА";
    const p = game.players[game.active];
    $("activePlayerBox").innerHTML =
      `<span class="avatar">${esc(playerAvatar(p.name))}</span><span><small>СЕЙЧАС ХОДИТ</small><strong>${esc(p.name)}</strong></span>`;
    renderRoute();
    renderDice();
    renderParkCard();
    renderActionHistory();
    $("lastAction").textContent = game.lastMessage || "";
    if (game.phase === "night") renderNight();
  };
  const renderNight = () => {
    if (!game) return;
    goScreen("night");
    const p = park();
    const src = game.parkSide === "front" ? p.front : p.back;
    $("nightRound").textContent = game.round;
    $("nightParkTitle").textContent = p.name;
    $("nightParkImage").src = src;
    $("nightParkImage").alt = `${p.name} — ${game.parkSide === "front" ? "лицевая" : "оборотная"} сторона`;
    const flipBtn = $("nightFlipParkBtn");
    if (flipBtn) {
      flipBtn.textContent = game.parkSide === "front" ? "Перевернуть на оборот ↻" : "Перевернуть на лицевую ↻";
    }
    renderParkSummary($("nightParkSummary"), p);
    $("nightUndoControl").innerHTML = canUndoDie()
      ? '<button class="btn btn-ghost btn-small" data-undo-last-die>↶ Отменить кубик и вернуть ход</button>'
      : "";
    $("finishNightButton").disabled = false;
    $("finishNightButton").style.opacity = "1";
    $("finishNightButton").textContent =
      game.round === 3
        ? "Завершить последнюю ночь →"
        : "Завершить ночь и начать следующий день →";
  };
  const renderSoloCard = (score) => {
    const soloCard = $("soloRankCard");
    if (!soloCard) return;
    if (game.count === 1 && settings().trackScores) {
      const s = Number(score) || 0;
      const rank = G.getSoloRank(s);
      const stars = "★".repeat(rank.tier) + "☆".repeat(4 - rank.tier);
      soloCard.hidden = false;
      soloCard.innerHTML = `
        <div class="solo-rank-header">
          <span class="solo-badge">${esc(rank.badge)}</span>
          <span class="solo-stars">${stars}</span>
        </div>
        <h3 class="solo-title">${esc(rank.title)}</h3>
        <p class="solo-desc">${esc(rank.desc)}</p>
        <div class="solo-score-metric">
          <span>Результат похода:</span>
          <strong>${s} очков</strong>
        </div>
      `;
    } else {
      soloCard.hidden = true;
    }
  };
  const renderSummary = () => {
    goScreen("summary");
    $("scoreboard").hidden = !settings().trackScores;
    $("winnerBanner").hidden = !settings().trackScores;
    if (!settings().trackScores) {
      $("scoreboard").innerHTML = "";
      if ($("soloRankCard")) $("soloRankCard").hidden = true;
      $("winnerBanner").hidden = false;
      $("winnerBanner").textContent =
        "Три дня завершены. Подведите итоговые очки по бумажным блокнотам.";
      return;
    }
    $("scoreboard").innerHTML = game.players
      .map(
        (p, i) =>
          `<label class="score-row"><strong>${esc(p.name)}</strong><input type="number" min="0" max="999" data-score="${i}" class="score-input" value="${esc(p.score)}" placeholder="0" inputmode="numeric" aria-label="Очки игрока ${esc(p.name)}"></label>`,
      )
      .join("");
    updateWinner();
  };
  const updateWinner = () => {
    if (!game) return;
    const vals = game.players.map((p) =>
      p.score === "" ? null : Number(p.score),
    );
    if (game.count === 1) {
      const soloScore = vals[0] ?? 0;
      renderSoloCard(soloScore);
      $("winnerBanner").textContent =
        vals[0] === null
          ? "Введите ваши очки из блокнота, чтобы узнать ранг рейнджера."
          : `Поход завершён! Ваш результат: ${soloScore} очков.`;
      return;
    }
    if ($("soloRankCard")) $("soloRankCard").hidden = true;
    if (vals.every((v) => v === null)) {
      $("winnerBanner").textContent =
        "Введите итоговые очки из блокнотов — победитель появится здесь.";
      return;
    }
    const max = Math.max(...vals.map((v) => v ?? -Infinity));
    const winners = game.players
      .filter((p, i) => vals[i] === max)
      .map((p) => p.name);
    $("winnerBanner").textContent =
      winners.length > 1
        ? `Ничья! ${winners.join(" и ")} — по ${max} очков.`
        : `Победитель похода — ${winners[0]} · ${max} очков!`;
  };
  const renderCurrent = () => {
    if (!game) return;
    game = G.load() || game;
    if (game.phase === "day") renderBoard();
    else if (game.phase === "night") renderNight();
    else renderSummary();
    setStartButton();
  };
  const canUndoDie = () =>
    !!(
      game &&
      ((game.undoStack || []).some((action) => action.round === game.round) ||
        (game.lastDieAction &&
          game.lastDieAction.round === game.round &&
          game.lastDieAction.phase === "day" &&
          game.turnNumber === game.lastDieAction.turnNumberAfter))
    );
  const undoDie = () => {
    const result = G.undoLastDie(game);
    if (result.error) {
      showToast(result.error);
      return;
    }
    game = G.load() || game;
    renderCurrent();
    showToast(`Кубик отменён. Снова ходит ${game.players[game.active].name}.`);
  };
  const goSetup = () => {
    renderSetup();
    goScreen("setup");
  };
  const startFresh = () => {
    game = null;
    G.erase();
    setupRandom = true;
    setupPark = G.randomPark().id;
    setupRange = "small";
    setupCount = 2;
    setupNames = ["Игрок 1", "Игрок 2", "Игрок 3", "Игрок 4"];
    goSetup();
  };
  const startGame = () => {
    const names = Array.from(
      { length: setupCount },
      (_, i) =>
        document.querySelector(`[data-name-index="${i}"]`)?.value?.trim() ||
        `Игрок ${i + 1}`,
    );
    const chosenPark = setupPark;
    const first = Number($("firstPlayerSelect").value) || 0;
    game = G.makeGame({
      count: setupCount,
      names,
      parkId: chosenPark,
      settings: { ...prefs },
    });
    game.active = first;
    game.dayStarter = first;
    const starts = [1, 2, 3, 3],
      distribution = game.players.map((p, i) => ({
        name: p.name,
        suns: starts[(i - first + setupCount) % setupCount],
        order: ((i - first + setupCount) % setupCount) + 1,
      }));
    game.lastMessage = `${game.players[first].name} — первый игрок. Бросьте кубики, чтобы начать день.`;
    G.saveSafe(game);
    renderBoard();
    showModal(
      `<div class="sun-start-modal"><span class="eyebrow">Начало похода · раздача</span><h2 id="modalTitle">Начальные солнца</h2><p>Раздайте солнца по порядку хода. Дальше отмечайте их получение и расход в бумажных блокнотах.</p><div class="sun-start-list">${distribution.map((p) => `<div class="sun-start-row"><span class="sun-start-order">${p.order}</span><strong>${esc(p.name)}</strong><span class="sun-start-token"><b>${p.suns}</b><i>☀</i></span></div>`).join("")}</div><div class="sun-start-note">Первый игрок получает 1 ☀ · следующий 2 ☀ · остальные по 3 ☀</div><div class="modal-actions"><button class="btn btn-primary" data-close-modal>Начать игру <span>→</span></button></div></div>`,
    );
  };
  const actionSummary = (
    face,
    selected,
    applied,
    lead = false,
    cost = 0,
    unusable = false,
  ) => {
    const symbols = selected.map(
      (x) =>
        ({
          sun: "☀ солнце",
          water: "вода",
          canteen: "вода в флягу",
          pencil: "карандаш",
          binoculars: "бинокль",
          park: "достопримечательность",
          arrowhead: "наконечник стрелы",
          flower: "цветок",
          forest: "дерево",
          mountain: "гора",
          bear: "медведь",
          turtle: "черепаха",
          fish: "рыба",
          bird: "птица",
        })[x] || x,
    );
    let text = unusable
      ? "Кубик нельзя применить: получите 1 ☀ вместо его значков и запишите её в блокноте."
      : lead
        ? `Запишите расход ${cost} ☀ в блокноте. Примените кубик ведущего и жетон маршрута.`
        : `Отметьте в блокноте: ${symbols.join(" + ")}.`;
    if (applied.water) text += ` Вода: ${applied.water}.`;
    if (
      !lead &&
      game.parkId === "death-valley" &&
      face.icons.some((icon) => icon === "water" || icon === "canteen")
    )
      text +=
        " В Долине Смерти вода с кубика похода превращается в солнце — отметьте его в блокноте.";
    if (lead && face.icons.includes("water"))
      text += " Вода с оранжевого кубика не заменяется правилом Долины Смерти.";
    return text;
  };
  const callBinocular = (token, result) => {
    const choices = [
      ["forest", "Лес"],
      ["mountain", "Гора"],
      ["flower", "Луг"],
      ["park", park().landmark],
    ];
    showModal(
      `<span class="eyebrow">Жетон бинокля · стоянка ${result.newIndex} из ${game.routeLength}</span><h2 id="modalTitle">Что увидела группа?</h2><p>Ведущий отмечает Бинокль в блокноте и выбирает, что увидела группа. Все игроки могут бесплатно добавить одну линию на соответствующую доступную страницу. Фишка переместится к стоянке сразу после выбора.</p><p>${esc(actionSummary(result.face, result.selected, result.applied, true, result.cost, result.unusable))}</p><div class="token-modal-list">${choices.map(([icon, label]) => `<button class="token-option" data-binocular-call="${icon}">${iconHTML(icon === "park" ? "park" : icon)}<span>${esc(label)}</span></button>`).join("")}</div>`,
    );
  };
  const commitDie = (id, chosen = null) => {
    pendingChoice = null;
    const result = G.takeDie(game, id, chosen);
    if (result.error) {
      showToast(result.error);
      return;
    }
    game = G.load() || game;

    if (result.kind === "lead") {
      pendingLeadMove = {
        fromIndex: result.prevIndex,
        toIndex: result.newIndex,
        isFinish: result.isFinish,
        token: result.token,
        face: result.face,
        cost: result.cost,
      };
      renderCurrent();
      scrollToRouteCard();

      if (result.isFinish) {
        showModal(
          `<span class="eyebrow">Финиш дневного перехода</span><h2 id="modalTitle">Лагерь на финише ⛺</h2><p>Все стоянки пройдены! Группа завершает дневной переход по тропе и направляется в лагерь.</p><p><strong>${esc(actionSummary(result.face, result.selected, result.applied, true, result.cost, result.unusable))}</strong></p><div class="modal-actions"><button class="btn btn-primary" data-confirm-lead-step>В лагерь на ночлег ➔</button></div>`,
        );
      } else {
        const token = result.token;
        if (token && token.id === "binoculars") {
          callBinocular(token, result);
        } else if (token) {
          showModal(
            `<span class="eyebrow">Стоянка ${result.newIndex} из ${game.routeLength}</span><h2 id="modalTitle">${esc(token.title)}</h2><p>${esc(token.instruction)}</p><p><strong>${esc(actionSummary(result.face, result.selected, result.applied, true, result.cost, result.unusable))}</strong></p><div class="modal-actions"><button class="btn btn-primary" data-confirm-lead-step>Понятно ➔</button></div>`,
          );
        }
      }
    } else {
      renderCurrent();
      showToast(
        actionSummary(
          result.face,
          result.selected,
          result.applied,
          false,
          0,
          result.unusable,
        ),
      );
    }
  };
  const chooseDie = (id) => {
    if (!game || game.rollPending) return;
    const die = game.dicePool.find((d) => d.id === id);
    if (!die) return;
    openDieModal(id, G.faceOf(die));
  };
  const useParkBonus = (playerIndex) => {
    if (!game || game.phase !== "night") return;
    const p = D.parks.find((x) => x.id === game.parkId),
      pl = game.players[playerIndex];
    const key = `${game.round}:${playerIndex}`,
      used = game.parkUsed[key] || [];
    if (p.id === "yosemite") {
      const opts = [
        { id: "bino_pencil", label: "Бинокль + Карандаш", iconA: "binoculars", iconB: "pencil" },
        { id: "bino_water", label: "Бинокль + Вода", iconA: "binoculars", iconB: "water" },
        { id: "pencil_water", label: "Карандаш + Вода", iconA: "pencil", iconB: "water" },
      ];
      if (settings().trackParkUse && used.includes("park")) {
        showToast("Бонус парка уже применён этим игроком в эту ночь.");
        return;
      }
      showModal(
        `<span class="eyebrow">Ночной бонус Yosemite · ${esc(pl.name)}</span><h2 id="modalTitle">Выберите 2 разных бонуса (2 ☀)</h2><p>Потратьте 2 ☀, чтобы взять два разных бонуса из трёх: Бинокль, Карандаш или Вода. Отметьте выбранные бонусы в блокноте.</p><div class="token-modal-list">${opts.map((o) => `<button class="token-option" data-yosemite-option="${o.id}" data-bonus-player="${playerIndex}"><span class="sun-emoji">☀ 2</span><span>${iconHTML(o.iconA, true)} + ${iconHTML(o.iconB, true)} · <strong>${esc(o.label)}</strong></span></button>`).join("")}</div>`,
      );
      return;
    }
    if (p.id === "glacier") {
      const opts = [
        { id: "score", cost: 2, text: "+3 очка фляги за этот раунд" },
        {
          id: "sketch",
          cost: 2,
          text: "Нарисовать Гору или Снежинку в журнале",
        },
        { id: "water", cost: 1, text: "Получить воду" },
      ];
      showModal(
        `<span class="eyebrow">Бонус Glacier · ${esc(pl.name)}</span><h2 id="modalTitle">Выберите одно или несколько действий</h2><p>Каждое действие можно применить до одного раза за эту ночь.</p><div class="token-modal-list">${opts.map((o) => `<button class="token-option" data-glacier-option="${o.id}" data-bonus-player="${playerIndex}" ${settings().trackParkUse && used.includes(o.id) ? "disabled" : ""}><span class="sun-emoji">☀</span><span>${o.cost} ☀ · ${esc(o.text)}${settings().trackParkUse && used.includes(o.id) ? " · уже использовано" : ""}</span></button>`).join("")}</div>`,
      );
      return;
    }
    if (settings().trackParkUse && !p.repeatable && used.includes("park")) {
      showToast("Бонус парка уже применён этим игроком в эту ночь.");
      return;
    }
    const cost = p.bonusCost || 0;
    if (settings().trackParkUse) game.parkUsed[key] = [...used, "park"];
    game.lastMessage = `${pl.name} применил бонус парка ${p.name}: ${p.bonusAction}`;
    G.saveSafe(game);
    renderNight();
    showToast(
      `${pl.name}: отметьте расход ${cost} ☀ в блокноте · ${p.bonusAction}`,
    );
  };
  const commitFinishNight = () => {
    const r = G.finishNight(game);
    if (r.error) {
      showToast(r.error);
      return;
    }
    game = G.load() || game;
    renderCurrent();
    if (game.phase === "day") showToast(`День ${game.round} начинается`);
  };
  const openParkModal = () => {
    if (!game) return;
    const p = park(),
      src = game.parkSide === "front" ? p.front : p.back;
    showModal(
      `<span class="eyebrow">Карта парка</span><h2 id="modalTitle">${esc(p.name)}</h2><img class="modal-park-image" src="${src}" alt="${esc(p.name)}"><button class="btn btn-secondary btn-wide" id="modalFlipPark">Перевернуть карту ↻</button><div class="park-rule-summary">${$("parkRuleSummary").innerHTML}</div>`,
    );
    $("modalFlipPark").onclick = () => {
      flipCurrentPark();
      openParkModal();
    };
  };
  const openSettings = () => {
    const s = settings();
    showModal(`<span class="eyebrow">Настройки похода</span><h2 id="modalTitle">Параметры и сохранение</h2>
      <p>Маршрут и состояние сохраняются в изолированном кеше вашего устройства (полная изоляция от других сайтов на GitHub Pages).</p>
      <div class="settings-list">
        <label class="setting-row"><span><strong>Использование бонуса парка</strong><small>Помнить, кто уже применял ограниченный ночной бонус.</small></span><input type="checkbox" data-setting="trackParkUse" ${s.trackParkUse ? "checked" : ""}></label>
        <label class="setting-row"><span><strong>Итоговый подсчёт</strong><small>Ввести очки из блокнотов и показать победителя.</small></span><input type="checkbox" data-setting="trackScores" ${s.trackScores ? "checked" : ""}></label>
      </div>
      <div class="backup-actions-box">
        <strong>Резервная копия партии</strong>
        <p class="small-note">Вы можете сохранить файл партии на устройство или восстановить сохраненную игру.</p>
        <div class="backup-btn-row">
          <button class="btn btn-secondary btn-small" id="btnExportSave">📥 Скачать JSON</button>
          <button class="btn btn-ghost btn-small" id="btnImportSave">📤 Загрузить JSON</button>
        </div>
        <input type="file" id="importSaveFile" accept=".json,application/json" style="display:none">
      </div>`);
  };
  const settingChange = (e) => {
    const el = e.target.closest("[data-setting]");
    if (!el) return;
    const key = el.dataset.setting,
      value = el.type === "checkbox" ? el.checked : Number(el.value);
    const next = { ...settings(), [key]: value };
    prefs = { ...prefs, [key]: value };
    storePreferences({ [key]: value });
    if (game) {
      game.settings = next;
      G.saveSafe(game);
      renderCurrent();
    } else if (
      document.getElementById("screen-setup").classList.contains("active")
    )
      renderSetup();
    openSettings();
  };
  const symbolDescription = (key) =>
    ({
      sun: "Получи солнце. Его можно потратить на кубик ведущего и бонус парка.",
      water: "Получи воду и отметь её в своей фляге.",
      canteen: "Получи воду и заполни каплю во фляге.",
      pencil:
        "Добавь линию на доступную страницу журнала. Линия стоит 1 очко; три линии завершают страницу и дают её бонус.",
      binoculars:
        "Заполни любой открытый кружок Бинокля. Когда пара кружков закрыта, отметь этот эффект в блокноте.",
      park: `Уникальный значок ${park().landmark}: нарисуй его на следующем развороте или заполни его ночной бонус.`,
      arrowhead: `Наконечник стрелы (достопримечательность): зарисуй уникальную достопримечательность парка («${park().landmark}») на следующем развороте или заполни её ночной бонус.`,
      forest:
        "Значок Дерева (лес): нарисуй Дерево на следующем развороте или заполни соответствующий ночной бонус.",
      mountain:
        "Значок Горы: нарисуй Гору на следующем развороте или заполни соответствующий ночной бонус.",
      flower:
        "Значок Цветка (луг): нарисуй Цветок на следующем развороте или заполни соответствующий ночной бонус.",
      bear: "Зачеркни следующую открытую клетку Медведя слева направо и сразу получи её бонус.",
      turtle:
        "Зачеркни следующую открытую клетку Черепахи слева направо и сразу получи её бонус.",
      fish: "Зачеркни следующую открытую клетку Рыбы слева направо и сразу получи её бонус.",
      bird: "Зачеркни следующую открытую клетку Птицы слева направо и сразу получи её бонус.",
    })[key] ||
    "Отметь этот значок в соответствующей области бумажного блокнота.";
  const describeFace = (icons) =>
    icons
      .map(
        (key, i) =>
          `<div class="dice-modal-details"><strong>${esc({ sun: "Солнце", water: "Вода", canteen: "Вода", pencil: "Карандаш", binoculars: "Бинокль", park: `Достопримечательность (${park().landmark})`, arrowhead: `Наконечник стрелы (${park().landmark})`, flower: "Цветок", forest: "Дерево", mountain: "Гора", bear: "Медведь", turtle: "Черепаха", fish: "Рыба", bird: "Птица" }[key] || key)}</strong>${esc(symbolDescription(key))}</div>`,
      )
      .join("");
  const openDieModal = (id, face) => {
    const lead = id === 5,
      cost = G.remainingHiking(game),
      costText = `Отметь расход ${cost} ☀ в бумажном блокноте за ${G.remainingHiking(game)} оставшихся кубиков похода.`;
    const faceHTML = `<div class="dice-modal-face">${face.icons.map((k) => iconHTML(k)).join(face.slash ? '<span class="slash">/</span>' : "")}</div>`;
    const nextToken = game.routeTokens[game.routeIndex];
    const isMovingToFinish = lead && game.routeIndex >= game.routeLength;
    const leadText = lead
      ? isMovingToFinish
        ? `<div class="dice-modal-details"><strong>Действие ведущего · Переход в лагерь на финише (цена ${cost} ☀)</strong>${esc(costText)} Все стоянки тропы пройдены! Взятие этого кубика переместит группу в <strong>Лагерь на финише ⛺</strong> и завершит дневной переход (начнётся Ночная фаза).</div>`
        : `<div class="dice-modal-details"><strong>Действие ведущего · Стоянка ${game.routeIndex + 1} из ${game.routeLength} (цена ${cost} ☀)</strong>${esc(costText)} Жетон «${esc(nextToken ? nextToken.title : "")}»: ${esc(nextToken ? nextToken.instruction : "")} Все игроки могут добавить бесплатную линию на подходящей странице. Затем следующий игрок бросает все кубики.</div>`
      : "";
    pendingChoice = { id, choice: null, needsChoice: face.slash };
    const instructions = face.slash
      ? "Косая черта: выбери только один символ. Если его нельзя применить, получи +1 ☀ вместо эффекта и отметь её в блокноте."
      : face.icons.length > 1
        ? "Примени оба символа. Если ни один нельзя применить, получи +1 ☀ вместо эффектов и отметь её в блокноте."
        : "Если символ нельзя применить, получи +1 ☀ вместо эффекта и отметь её в блокноте.";
    const choiceUI = face.slash
      ? `<div class="choice-row">${face.icons.map((icon) => `<button class="choice-button" data-face-choice="${icon}">${iconHTML(icon)}<span>${esc({ bear: "Медведь", turtle: "Черепаха", fish: "Рыба", bird: "Птица" }[icon] || icon)}</span></button>`).join("")}</div><div class="dice-modal-details"><strong>Выбранный символ</strong><span id="choiceDescription">Нажми на символ, чтобы посмотреть его действие.</span></div>`
      : "";
    showModal(
      `<span class="eyebrow">${lead ? "Кубик ведущего" : `Кубик похода ${id}`} · ${getFaceLabel(face)}</span><h2 id="modalTitle">Свойство и действия</h2>${faceHTML}<p>${esc(instructions)}</p>${leadText}${describeFace(face.icons)}${choiceUI}<div class="modal-actions"><button class="btn btn-primary" data-face-take ${face.slash ? "disabled" : ""}>Взять кубик</button><button class="btn btn-ghost" data-close-modal>Отмена</button></div>`,
    );
  };
  const openRules = () =>
    showModal(
      `<span class="eyebrow">Памятка</span><h2 id="modalTitle">Коротко о походе</h2><div class="guide-grid"><div class="guide-item"><strong>Партия</strong><span>Три дня. Каждый день идёт дневной поход, затем ночная фаза.</span></div><div class="guide-item"><strong>Кубики</strong><span>Возьмите один из четырёх белых кубиков. Без черты применяются оба символа; с чертой выберите один.</span></div><div class="guide-item"><strong>Кубик ведущего</strong><span>Потратьте солнца по числу оставшихся белых кубиков. Передвиньте группу на следующий жетон, отметьте его и кубик ведущего; затем бросьте все кубики заново.</span></div><div class="guide-item"><strong>Маршрут</strong><span>Для 1–2 игроков уберите бинокль: на маршруте 4 жетона. Для 3–4 игроков используются все 5 жетонов.</span></div><div class="guide-item"><strong>Солнца</strong><span>Стартовый запас: 1, 2, 3 или 3 по порядку игроков. Если выбранный кубик нельзя применить — получите 1 солнце. Получение и расход отмечайте в бумажном блокноте.</span></div><div class="guide-item"><strong>Ночь</strong><span>Примените бонусы блокнота и парка, начислите очки фляги. После третьей ночи подведите итог.</span></div></div><p>В настройках можно отключить ограничение бонуса парка и финальный подсчёт. Журнал, животных и флягу отмечайте в бумажных блокнотах.</p>`,
    );
  const exitToHome = () => {
    showModal(
      `<span class="eyebrow">Поход сохранён</span><h2 id="modalTitle">Вернуться на старт?</h2><p>Текущий поход останется сохранён на этом устройстве и его можно будет продолжить.</p><div class="modal-actions"><button class="btn btn-ghost" data-close-modal>Остаться в игре</button><button class="btn btn-primary" id="confirmHome">На главную</button></div>`,
    );
  };
  const resyncHome = () => {
    hideModal();
    setStartButton();
    goScreen("splash");
  };

  $("startButton").addEventListener("click", () => {
    if (game) {
      renderCurrent();
    } else goSetup();
  });
  $("newSetupButton").addEventListener("click", startFresh);
  $("setupBack").addEventListener("click", () => {
    goScreen("splash");
    setStartButton();
  });
  $("beginGame").addEventListener("click", startGame);
  $("randomParkButton").addEventListener("click", () => {
    setupPark = G.randomPark().id;
    setupRandom = true;
    renderSetup();
    showToast(
      `Случайно выбран парк ${D.parks.find((p) => p.id === setupPark).name}`,
    );
  });
  $("countPick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-count]");
    if (b) {
      setupCount = Number(b.dataset.count);
      renderSetup();
    }
  });
  document.querySelector(".segmented").addEventListener("click", (e) => {
    const b = e.target.closest("[data-range]");
    if (b) {
      setupRange = b.dataset.range;
      setupCount = setupRange === "small" ? 2 : 4;
      renderSetup();
    }
  });
  $("playerFields").addEventListener("input", (e) => {
    const i = Number(e.target.dataset.nameIndex);
    if (!Number.isNaN(i)) {
      setupNames[i] = e.target.value;
      const old = $("firstPlayerSelect").value;
      const s = $("firstPlayerSelect");
      if (s.options[i]) {
        s.options[i].textContent = e.target.value || `Игрок ${i + 1}`;
        s.value = old;
      }
    }
  });
  $("parkGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-park]");
    if (b) {
      setupPark = b.dataset.park;
      setupRandom = false;
      renderSetup();
    }
  });
  $("settingsButton").addEventListener("click", openSettings);
  $("modalBody").addEventListener("change", settingChange);
  $("homeButton").addEventListener("click", () => {
    if (document.getElementById("screen-setup").classList.contains("active")) {
      goScreen("splash");
      setStartButton();
    } else exitToHome();
  });
  const flipCurrentPark = () => {
    if (!game) return;
    game.parkSide = game.parkSide === "front" ? "back" : "front";
    G.saveSafe(game);
    renderParkCard();
    if (game.phase === "night") renderNight();
  };
  $("helpButton").addEventListener("click", openRules);
  $("parkFlipButton").addEventListener("click", openParkModal);
  $("parkFlipText").addEventListener("click", flipCurrentPark);
  if ($("nightFlipParkBtn")) $("nightFlipParkBtn").addEventListener("click", flipCurrentPark);
  if ($("parkDetailImage")) $("parkDetailImage").addEventListener("click", openParkModal);
  $("parkTitle").addEventListener("click", openParkModal);
  $("dicePool").addEventListener("click", (e) => {
    const b = e.target.closest("[data-die]");
    if (b && !b.disabled) chooseDie(Number(b.dataset.die));
  });
  $("rerollButton").addEventListener("click", () => {
    const rolled = game.rollPending
      ? G.rollForTurn(game)
      : G.rerollForTurn(game);
    if (!rolled) {
      showToast("Перебросить можно, пока ни один кубик не взят.");
      return;
    }
    game = G.load() || game;
    renderBoard();
    animateDiceRoll();
    showToast(
      `${game.dicePool.length === 5 ? "Кубики брошены" : "Кубики переброшены"} · ходит ${game.players[game.active].name}`,
    );
  });

  // Feature buttons listeners
  if ($("wakeLockBtn")) $("wakeLockBtn").addEventListener("click", toggleWakeLock);
  if ($("themeToggleBtn")) $("themeToggleBtn").addEventListener("click", toggleTheme);
  if ($("historyToggleBtn")) $("historyToggleBtn").addEventListener("click", toggleHistoryDrawer);
  if ($("chwaziButton")) $("chwaziButton").addEventListener("click", openFingerChooser);
  if ($("closeChooserBtn")) $("closeChooserBtn").addEventListener("click", closeFingerChooser);
  if ($("randomWheelBtn")) $("randomWheelBtn").addEventListener("click", pickRandomWheelPlayer);
  $("undoDieButton").addEventListener("click", undoDie);
  $("screen-night").addEventListener("click", (e) => {
    if (e.target.closest("[data-undo-last-die]")) undoDie();
  });
  $("nightUndoControl").addEventListener("click", (e) => {
    if (e.target.closest("[data-undo-last-die]")) undoDie();
  });
  $("activateParkBonus").addEventListener("click", () => {
    showModal(
      `<span class="eyebrow">Ночной бонус</span><h2 id="modalTitle">Кто применяет бонус?</h2><div class="token-modal-list">${game.players.map((p, i) => `<button class="token-option" data-night-bonus-pick="${i}"><span class="sun-emoji">☀</span><span>${esc(p.name)}</span></button>`).join("")}</div>`,
    );
  });
  $("finishNightButton").addEventListener("click", commitFinishNight);
  $("scoreboard").addEventListener("input", (e) => {
    if (!settings().trackScores) return;
    const i = Number(e.target.dataset.score);
    if (Number.isNaN(i)) return;
    game.players[i].score = e.target.value;
    G.saveSafe(game);
    updateWinner();
  });
  $("backToFinalNight").addEventListener("click", () => {
    game.phase = "night";
    G.saveSafe(game);
    renderNight();
  });
  $("newGameButton").addEventListener("click", () => {
    game = null;
    G.erase();
    setStartButton();
    goSetup();
  });
  $("modalClose").addEventListener("click", () => {
    pendingChoice = null;
    if (pendingLeadMove) {
      executeLeadMove();
    } else {
      hideModal();
    }
  });
  $("modalBackdrop").addEventListener("click", (e) => {
    if (e.target === $("modalBackdrop")) {
      pendingChoice = null;
      if (pendingLeadMove) {
        executeLeadMove();
      } else {
        hideModal();
      }
    }
  });
  $("modalBody").addEventListener("click", (e) => {
    if (e.target.closest("[data-confirm-lead-step]")) {
      executeLeadMove();
      return;
    }
    if (e.target.closest("[data-close-modal]")) {
      pendingChoice = null;
      if (pendingLeadMove) {
        executeLeadMove();
      } else {
        hideModal();
      }
      return;
    }
    const faceChoice = e.target.closest("[data-face-choice]");
    if (faceChoice && pendingChoice) {
      pendingChoice.choice = faceChoice.dataset.faceChoice;
      document
        .querySelectorAll(".choice-button")
        .forEach((b) => b.classList.toggle("selected", b === faceChoice));
      const description = $("choiceDescription");
      if (description)
        description.textContent = symbolDescription(pendingChoice.choice);
      const takeButton = $("modalBody").querySelector("[data-face-take]");
      if (takeButton) takeButton.disabled = false;
      return;
    }
    const takeFace = e.target.closest("[data-face-take]");
    if (
      takeFace &&
      pendingChoice &&
      (!pendingChoice.needsChoice || pendingChoice.choice)
    ) {
      const { id, choice } = pendingChoice;
      hideModal();
      commitDie(id, choice);
      return;
    }
    const call = e.target.closest("[data-binocular-call]");
    if (call) {
      const label =
        call.dataset.binocularCall === "park"
          ? park().landmark
          : { forest: "Лес", mountain: "Гора", flower: "Луг" }[
              call.dataset.binocularCall
            ];
      game.lastMessage = `Жетон Бинокля: всем игрокам бесплатно добавить линию на доступной странице «${label}».`;
      G.saveSafe(game);
      executeLeadMove();
      showToast(`Все игроки: бесплатная линия · ${label}`);
      return;
    }
    const yosemiteOpt = e.target.closest("[data-yosemite-option]");
    if (yosemiteOpt) {
      const i = Number(yosemiteOpt.dataset.bonusPlayer),
        pl = game.players[i],
        key = `${game.round}:${i}`,
        used = game.parkUsed[key] || [];
      const labelMap = {
        bino_pencil: "Бинокль и Карандаш",
        bino_water: "Бинокль и Вода",
        pencil_water: "Карандаш и Вода",
      };
      const text = labelMap[yosemiteOpt.dataset.yosemiteOption] || "два разных бонуса";
      if (settings().trackParkUse) game.parkUsed[key] = [...used, "park"];
      game.lastMessage = `${pl.name} потратил 2 ☀ на ночной бонус Yosemite: ${text}.`;
      G.saveSafe(game);
      hideModal();
      renderNight();
      showToast(`${pl.name}: расход 2 ☀ · бонусы: ${text}`);
      return;
    }
    const opt = e.target.closest("[data-glacier-option]");
    if (opt) {
      const i = Number(opt.dataset.bonusPlayer),
        pl = game.players[i],
        cost = { score: 2, sketch: 2, water: 1 }[opt.dataset.glacierOption],
        key = `${game.round}:${i}`,
        used = game.parkUsed[key] || [];
      if (settings().trackParkUse && used.includes(opt.dataset.glacierOption)) {
        showToast("Это действие уже применено.");
        return;
      }
      if (settings().trackParkUse)
        game.parkUsed[key] = [...used, opt.dataset.glacierOption];
      const text = {
        score: "+3 очка фляги за этот раунд",
        sketch: "нарисуй Гору или Снежинку",
        water: "получи воду",
      }[opt.dataset.glacierOption];
      G.saveSafe(game);
      hideModal();
      renderNight();
      showToast(`${pl.name}: отметьте расход ${cost} ☀ в блокноте · ${text}`);
    }
    const pick = e.target.closest("[data-night-bonus-pick]");
    if (pick) {
      const i = Number(pick.dataset.nightBonusPick);
      hideModal();
      useParkBonus(i);
    }
    if (e.target.closest("#confirmHome")) resyncHome();

    // Export save file handler
    if (e.target.closest("#btnExportSave")) {
      if (!game) {
        showToast("Нет активной партии для экспорта.");
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(G.exportSave(game));
      const dlAnchor = document.createElement("a");
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `parks-roll-hike-save-day${game.round}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      showToast("Файл партии успешно сохранён!");
    }

    // Import save file click
    if (e.target.closest("#btnImportSave")) {
      const fileInput = $("importSaveFile");
      if (fileInput) fileInput.click();
    }
  });

  // Handle file import selection
  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "importSaveFile") {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = G.importSave(event.target.result);
        if (res.error) {
          showToast(res.error);
        } else {
          game = res.game;
          hideModal();
          renderCurrent();
          showToast(`Партия успешно загружена: День ${game.round}!`);
        }
      };
      reader.readAsText(file);
    }
  });

  // PWA & Cache management
  let deferredPrompt = null;
  const updateCacheBadge = () => {
    const badge = $("cacheStatusBadge");
    const text = $("cacheStatusText");
    if (!badge || !text) return;
    const dot = badge.querySelector(".status-dot");
    if (!navigator.onLine) {
      if (dot) dot.className = "status-dot offline";
      text.textContent = "Офлайн (в кеше)";
      badge.title = "Интернет отключён. Приложение полностью работает из кеша устройства.";
    } else {
      if (dot) dot.className = "status-dot";
      text.textContent = "Кеш + Защита";
      badge.title = "Все файлы сохранены в локальном кеше. Состояние игры защищено от случайной перезагрузки.";
    }
  };

  const registerServiceWorker = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./sw.js", { scope: "./" })
        .then((reg) => {
          console.log("[PWA] Service Worker registered in scope:", reg.scope);
          updateCacheBadge();
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const btn = $("pwaInstallBtn");
      if (btn) btn.hidden = false;
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      const btn = $("pwaInstallBtn");
      if (btn) btn.hidden = true;
      showToast("Приложение установлено на устройство!");
    });
  };

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        showToast("Приложение установлено!");
        $("pwaInstallBtn").hidden = true;
      }
      deferredPrompt = null;
    } else {
      showModal(
        `<span class="eyebrow">Установка на телефон</span><h2 id="modalTitle">Добавить на экран «Домой»</h2><p>Чтобы приложение открывалось как нативная игра без адресной строки и работало офлайн:</p><ol class="night-steps"><li>В Safari или Chrome нажмите кнопку <strong>«Поделиться»</strong> (иконка со стрелкой).</li><li>Выберите пункт <strong>«На экран "Домой"»</strong> (Add to Home Screen).</li><li>Значок приложения появится среди ваших программ!</li></ol><div class="modal-actions"><button class="btn btn-primary" data-close-modal>Понятно</button></div>`
      );
    }
  };

  if ($("pwaInstallBtn")) {
    $("pwaInstallBtn").addEventListener("click", installPWA);
  }

  const initFingerChooserEvents = () => {
    const area = $("fingerTouchArea");
    if (!area) return;

    const renderFingers = (touches) => {
      const currentIds = new Set();
      for (let i = 0; i < touches.length; i++) {
        currentIds.add(touches[i].identifier);
      }
      activeFingers.forEach((data, id) => {
        if (!currentIds.has(id)) {
          if (data.el && data.el.parentNode) data.el.remove();
          activeFingers.delete(id);
        }
      });

      const rect = area.getBoundingClientRect();
      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;
        if (activeFingers.has(t.identifier)) {
          const f = activeFingers.get(t.identifier);
          f.x = x;
          f.y = y;
          f.el.style.left = `${x}px`;
          f.el.style.top = `${y}px`;
        } else {
          const color = FINGER_COLORS[activeFingers.size % FINGER_COLORS.length];
          const el = document.createElement("div");
          el.className = "touch-circle";
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.style.borderColor = color;
          el.style.boxShadow = `0 0 25px ${color}`;
          area.appendChild(el);
          activeFingers.set(t.identifier, { x, y, color, el });
        }
      }
      updateTouchCircles();
      evaluateFingerChooser();
    };

    area.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        renderFingers(e.touches);
      },
      { passive: false },
    );

    area.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        renderFingers(e.touches);
      },
      { passive: false },
    );

    area.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        renderFingers(e.touches);
      },
      { passive: false },
    );

    area.addEventListener(
      "touchcancel",
      (e) => {
        e.preventDefault();
        renderFingers(e.touches);
      },
      { passive: false },
    );
  };

  // Accidental reload & close protection
  const setupReloadProtection = () => {
    window.addEventListener("beforeunload", () => {
      if (game) G.saveSafe(game);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && game) {
        G.saveSafe(game);
      } else if (
        document.visibilityState === "visible" &&
        isWakeLockRequested &&
        !wakeLockSentinel
      ) {
        requestWakeLock();
      }
    });

    window.addEventListener("online", () => {
      showToast("Подключение к сети восстановлено");
      updateCacheBadge();
    });

    window.addEventListener("offline", () => {
      showToast("Офлайн-режим: все файлы и графика работают из кеша устройства");
      updateCacheBadge();
    });
  };

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("modalBackdrop").hidden) {
      pendingChoice = null;
      hideModal();
    }
  });

  const initial = () => {
    applyTheme(prefs.theme || "default");
    updateWakeLockUI(false);
    registerServiceWorker();
    setupReloadProtection();
    initFingerChooserEvents();
    setStartButton();
    renderSetup();

    // AUTO-RESTORE: Protect against accidental refresh, swipe-down, or browser close!
    if (game && ["day", "night", "summary"].includes(game.phase)) {
      renderCurrent();
      showToast(`Поход восстановлен: День ${game.round} · защита от перезагрузки активна`);
    } else {
      goScreen("splash");
      setStartButton();
    }
  };
  initial();
})();
