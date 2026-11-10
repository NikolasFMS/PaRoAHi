/* State and game rules; UI is kept in app.js */
window.PRH_GAME = (() => {
  const D = window.PRH_DATA;

  // Domain-safe scoping for GitHub Pages (multiple repos share the same domain)
  const getRepoSlug = () => {
    try {
      const parts = window.location.pathname.split('/').filter(Boolean);
      return parts.length > 0 && !parts[0].includes('.') ? parts[0] : 'prh_root';
    } catch {
      return 'prh_root';
    }
  };

  const SLUG = getRepoSlug();
  const STORE_PRIMARY = `prh_ghp_${SLUG}_state_v2`;
  const STORE_BACKUP = `prh_ghp_${SLUG}_backup_v2`;
  const LEGACY_STORE = 'parks-roll-hike-helper-v1';

  // Secondary persistence via IndexedDB for resilience against iOS 7-day storage eviction
  const IDB_NAME = `PRH_Storage_${SLUG}`;
  const IDB_STORE = 'game_sessions';
  const openIDB = () => new Promise((resolve) => {
    if (!window.indexedDB) return resolve(null);
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  const saveToIDB = async (game) => {
    const db = await openIDB();
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ id: 'current_game', data: game, timestamp: Date.now() });
    } catch (e) {
      console.warn('IDB write error', e);
    }
  };

  const routePoints = [
    { x: 41.0, y: 33.0 }, { x: 82.0, y: 54.8 }, { x: 15.2, y: 54.5 }, { x: 28.5, y: 83.0 }, { x: 66.3, y: 88.0 }
  ];
  const startPoint = { x: 15.5, y: 21.8 };
  const finishPoint = { x: 85.0, y: 85.0 };
  const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const randomPark = () => D.parks[Math.floor(Math.random() * D.parks.length)];
  const rollPool = () => D.dice.map(d => ({ id: d.id, face: Math.floor(Math.random() * d.faces.length) }));
  const newTokens = count => shuffle(D.tokens.filter(t => count > 2 || t.id !== 'binoculars'));
  const makeGame = ({ count, names, parkId, settings = {} }) => {
    const park = D.parks.find(p => p.id === parkId) || D.parks[0];
    const players = Array.from({ length: count }, (_, i) => ({ name: names?.[i]?.trim() || `Игрок ${i + 1}` }));
    const game = { count, parkId: park.id, players, round: 1, phase: 'day', routeIndex: 0, routeLength: count <= 2 ? 4 : 5, routeTokens: newTokens(count), dicePool: [], rolledPool: [], takenFaces: {}, rollPending: true, active: 0, dayStarter: 0, settings: { trackScores: true, trackParkUse: true, ...settings }, parkSide: 'front', parkUsed: {}, lastMessage: 'Начинается первый день похода.', turnNumber: 0, lastSavedAt: Date.now(), actionHistory: [] };
    saveSafe(game); return game;
  };

  const save = game => {
    try {
      game.lastSavedAt = Date.now();
      const serialized = JSON.stringify(game);
      // Double write to primary and backup keys (both strictly scoped)
      localStorage.setItem(STORE_PRIMARY, serialized);
      localStorage.setItem(STORE_BACKUP, serialized);
      saveToIDB(game);
    } catch (e) {
      console.warn('Local save unavailable', e);
    }
  };

  const load = () => {
    try {
      const primary = localStorage.getItem(STORE_PRIMARY);
      if (primary) return JSON.parse(primary);
      const backup = localStorage.getItem(STORE_BACKUP);
      if (backup) return JSON.parse(backup);
      const legacy = localStorage.getItem(LEGACY_STORE);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        saveSafe(parsed); // migrate to scoped
        return parsed;
      }
    } catch (e) {
      console.warn('Error reading local state', e);
    }
    return null;
  };

  const erase = () => {
    try {
      // STRICTLY delete only this app's keys. NEVER touch any other apps on the domain!
      localStorage.removeItem(STORE_PRIMARY);
      localStorage.removeItem(STORE_BACKUP);
      localStorage.removeItem(LEGACY_STORE);
      openIDB().then(db => {
        if (!db) return;
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).delete('current_game');
        } catch { }
      });
    } catch (e) {
      console.warn('Local save unavailable', e);
    }
  };

  const saveSafe = game => { try { save(game); } catch (e) { console.warn('Could not save the game', e); } };
  const currentPlayer = g => g.players[g.active];
  const remainingHiking = g => g.dicePool.filter(d => d.id !== 5).length;
  const faceOf = die => D.dice.find(d => d.id === die.id).faces[die.face];
  const nextPlayer = g => (g.active + 1) % g.count;
  const rollNew = g => { g.dicePool = []; g.rolledPool = []; g.takenFaces = {}; g.takenChoices = {}; g.rollPending = true; };
  const applyIcons = (g, icons, isHiking = true) => {
    const water = icons.filter(i => i === 'water' || i === 'canteen').length;
    return { water: isHiking && g.parkId === 'death-valley' ? 0 : water };
  };
  const takeDie = (g, id, chosenIcon = null) => {
    if (g.phase !== 'day') return { error: 'Сейчас ночная фаза.' };
    if (g.rollPending) return { error: 'Сначала бросьте кубики.' };
    const found = g.dicePool.find(d => d.id === id);
    if (!found) return { error: 'Этот кубик уже взяли.' };
    if (!g.rolledPool || g.rolledPool.length === 0) g.rolledPool = [...g.dicePool];
    g.takenFaces = { ...(g.takenFaces || {}), [id]: found.face };
    g.takenChoices = { ...(g.takenChoices || {}), [id]: chosenIcon };
    const face = faceOf(found), before = JSON.parse(JSON.stringify(g));
    delete before.undoStack;
    delete before.lastDieAction;
    if (id !== 5) {
      const selected = chosenIcon === '__unusable' ? ['sun'] : (chosenIcon ? [chosenIcon] : face.icons);
      const applied = applyIcons(g, selected, true);
      g.dicePool = g.dicePool.filter(d => d.id !== id);
      const who = currentPlayer(g).name; g.active = nextPlayer(g); g.turnNumber++;
      const earned = []; if (applied.water) earned.push(`+${applied.water} воды`);
      const dieSummary = `${who} взял кубик ${id}: ${face.label}${earned.length ? ` (${earned.join(', ')})` : ''}`;
      g.lastMessage = `${who} взял кубик ${id}${earned.length ? ` · ${earned.join(', ')}` : ''}. Передайте ход ${currentPlayer(g).name}.`;
      g.actionHistory = [{
        turn: g.turnNumber,
        round: g.round,
        who,
        playerName: who,
        dieId: id,
        faceLabel: face.label,
        faceIcons: face.icons,
        chosenIcon,
        text: dieSummary,
        summary: dieSummary,
        detail: g.lastMessage,
        kind: 'hiking',
        lead: false,
        time: Date.now(),
        timestamp: Date.now()
      }, ...(g.actionHistory || [])];
      g.undoStack = [...(g.undoStack || []), { round: g.round, before }]; saveSafe(g); return { ok: true, kind: 'hiking', face, selected, applied, unusable: chosenIcon === '__unusable' };
    }
    const cost = remainingHiking(g);

    const selected = chosenIcon === '__unusable' ? ['sun'] : (chosenIcon ? [chosenIcon] : face.icons);
    const applied = applyIcons(g, selected, false);
    const who = currentPlayer(g).name;
    const prevIndex = g.routeIndex;
    const maxSteps = g.routeLength + 1; // All sites 1..routeLength, then finish camp step
    const newIndex = Math.min(g.routeIndex + 1, maxSteps);
    g.routeIndex = newIndex;
    g.active = nextPlayer(g);
    g.turnNumber++;

    const isFinish = newIndex >= maxSteps;
    let token = null;

    if (!isFinish) {
      token = g.routeTokens[newIndex - 1];
      rollNew(g);
      g.lastMessage = `${who} провёл группу к стоянке «${token.title}» и применил кубик ведущего. Кубики переброшены для ${currentPlayer(g).name}.`;
    } else {
      g.phase = 'night';
      g.lastMessage = `${who} привёл группу в лагерь на финише. Начинается ночь ${g.round}.`;
    }

    const leadSummary = isFinish
      ? `${who} взял кубик ведущего (${face.label}) · переход в лагерь на финише`
      : `${who} взял кубик ведущего (${face.label}) · переход к стоянке «${token ? token.title : ''}»`;

    g.actionHistory = [{
      turn: g.turnNumber,
      round: g.round,
      who,
      playerName: who,
      dieId: 5,
      faceLabel: `Ведущий · ${face.label}`,
      faceIcons: face.icons,
      tokenTitle: token ? token.title : 'Лагерь на финише',
      text: leadSummary,
      summary: leadSummary,
      detail: g.lastMessage,
      kind: 'lead',
      lead: true,
      time: Date.now(),
      timestamp: Date.now()
    }, ...(g.actionHistory || [])];
    g.undoStack = [...(g.undoStack || []), { round: g.round, before }]; saveSafe(g); return { ok: true, kind: 'lead', face, selected, applied, cost, token, who, unusable: chosenIcon === '__unusable', isFinish, prevIndex, newIndex };
  };
  const undoLastDie = g => {
    const stack = g.undoStack || [];
    const action = stack[stack.length - 1];
    if (action && action.round === g.round) {
      Object.assign(g, JSON.parse(JSON.stringify(action.before)));
      g.undoStack = stack.slice(0, -1);
      delete g.lastDieAction;
      saveSafe(g);
      return { ok: true };
    }
    const legacy = g.lastDieAction;
    if (!legacy || legacy.round !== g.round || legacy.phase !== 'day' || g.turnNumber !== legacy.turnNumberAfter) return { error: 'Нечего отменять: взятые кубики уже возвращены.' };
    Object.assign(g, JSON.parse(JSON.stringify(legacy.before)));
    delete g.lastDieAction;
    saveSafe(g);
    return { ok: true };
  };
  const finishNight = g => {
    if (g.phase !== 'night') return { error: 'Сейчас не ночь.' };

    if (g.round === 3) { g.phase = 'summary'; g.lastMessage = 'Поход завершён. Подведите итоговые очки по блокнотам.'; saveSafe(g); return { done: true }; }
    g.round++; g.phase = 'day'; g.routeIndex = 0; g.routeTokens = newTokens(g.count); g.dayStarter = g.active; g.undoStack = []; delete g.lastDieAction; rollNew(g);
    g.lastMessage = `День ${g.round}. Первым ходит ${currentPlayer(g).name}; жетоны маршрута перемешаны.`; saveSafe(g); return { ok: true };
  };
  const parkBonusCost = g => D.parks.find(p => p.id === g.parkId).bonusCost;
  const rollForTurn = g => { if (g.phase !== 'day' || !g.rollPending) return false; const pool = rollPool(); g.dicePool = pool; g.rolledPool = pool; g.takenFaces = {}; g.rollPending = false; g.lastMessage = `Кубики брошены. Ходит ${currentPlayer(g).name}.`; saveSafe(g); return true; };
  const rerollForTurn = g => { if (g.phase !== 'day' || g.rollPending || (g.dicePool.length !== 5 && g.dicePool.length !== 0)) return false; const pool = rollPool(); g.dicePool = pool; g.rolledPool = pool; g.takenFaces = {}; g.lastMessage = `Кубики переброшены. Ходит ${currentPlayer(g).name}.`; saveSafe(g); return true; };

  const exportSave = g => {
    return JSON.stringify({ version: 2, app: 'parks-roll-hike', slug: SLUG, timestamp: Date.now(), data: g }, null, 2);
  };

  const importSave = jsonStr => {
    try {
      const parsed = JSON.parse(jsonStr);
      const g = parsed.data || parsed;
      if (g && g.count && g.players && g.round) {
        saveSafe(g);
        return { ok: true, game: g };
      }
      return { error: 'Неверный формат данных сохранения.' };
    } catch {
      return { error: 'Ошибка чтения JSON.' };
    }
  };

  const getSoloRank = (score) => {
    const s = Number(score) || 0;
    if (s >= 60) return { title: 'Легендарный исследователь', badge: 'Элита нацпарка', tier: 4, desc: 'Великолепный поход! Вы раскрыли все тайны природы, мастерски заполнили страницы журнала и превзошли лучших рейнджеров США!' };
    if (s >= 45) return { title: 'Смотритель парка', badge: 'Рейнджер', tier: 3, desc: 'Превосходный поход! Вы безупречно спланировали маршрут и собрали богатейшую коллекцию впечатлений.' };
    if (s >= 30) return { title: 'Опытный турист', badge: 'Бывалый путник', tier: 2, desc: 'Достойный результат! Вы уверенно прошли все стоянки и оставили яркий след в журнале похода.' };
    return { title: 'Новичок тропы', badge: 'Первый поход', tier: 1, desc: 'Первый поход завершён! Тропа покоряется тем, кто готов бросить кубики снова и открыть новые горизонты.' };
  };

  return {
    SLUG,
    STORE_PRIMARY,
    STORE_BACKUP,
    routePoints,
    startPoint,
    finishPoint,
    shuffle,
    randomPark,
    makeGame,
    save,
    load,
    erase,
    saveSafe,
    currentPlayer,
    remainingHiking,
    faceOf,
    takeDie,
    undoLastDie,
    finishNight,
    parkBonusCost,
    rollPool,
    rollForTurn,
    rerollForTurn,
    exportSave,
    importSave,
    getSoloRank
  };
})();
