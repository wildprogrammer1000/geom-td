/* 결로 — GeomTD prototype. Vanilla Canvas 2D. */
(() => {
  "use strict";

  const COLS = 12;
  const ROWS = 10;
  const TAU = Math.PI * 2;
  const SAVE_KEY = "geomtd-save-v1";
  const START_LIVES = 20;

  const STAGES = [
    {
      id: 0,
      name: "안개 골목",
      desc: "첫 번째 길목",
      startGold: 80,
      hpMul: 1,
      path: [
        [0, 2], [1, 2], [2, 2], [3, 2],
        [3, 3], [3, 4], [3, 5], [3, 6],
        [4, 6], [5, 6], [6, 6],
        [6, 5], [6, 4], [6, 3], [6, 2], [6, 1],
        [7, 1], [8, 1], [9, 1],
        [9, 2], [9, 3], [9, 4], [9, 5], [9, 6], [9, 7],
        [8, 7], [7, 7], [6, 7], [5, 7], [4, 7],
        [4, 8], [4, 9],
        [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9],
      ],
    },
    {
      id: 1,
      name: "성수 다리",
      desc: "다리 위 길",
      startGold: 70,
      hpMul: 1.15,
      path: [
        [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
        [5, 1], [5, 2], [5, 3], [5, 4],
        [6, 4], [7, 4], [8, 4], [9, 4],
        [9, 5], [9, 6], [9, 7], [9, 8], [9, 9],
        [10, 9], [11, 9],
      ],
    },
    {
      id: 2,
      name: "묵점",
      desc: "먹물 거점",
      startGold: 90,
      hpMul: 1.3,
      path: [
        [0, 5], [1, 5], [2, 5], [3, 5], [4, 5],
        [4, 4], [4, 3], [4, 2],
        [5, 2], [6, 2], [7, 2], [8, 2],
        [8, 3], [8, 4], [8, 5], [8, 6], [8, 7],
        [7, 7], [6, 7], [5, 7],
        [5, 8], [5, 9],
        [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9],
      ],
    },
  ];

  let pathCells = STAGES[0].path.slice();
  let pathSet = new Set(pathCells.map(([c, r]) => c + "," + r));
  let currentStage = STAGES[0];
  let currentScreen = "campaign";
  let campaignSave = loadSave();

  const TOWERS = {
    single: {
      id: "single",
      name: "단발",
      cost: 30,
      upCost: 40,
      range: 2.25,
      rangeUp: 2.75,
      fire: 0.28,
      fireUp: 0.24,
      dmg: 13,
      dmgUp: 22,
      color: "#5ec8c8",
      colorDim: "#163536",
    },
    splash: {
      id: "splash",
      name: "광역",
      cost: 50,
      upCost: 55,
      range: 1.95,
      rangeUp: 2.4,
      fire: 0.92,
      fireUp: 0.78,
      dmg: 20,
      dmgUp: 32,
      splash: 1.15,
      splashUp: 1.4,
      color: "#e0a040",
      colorDim: "#3a2a12",
    },
    slow: {
      id: "slow",
      name: "감속",
      cost: 40,
      upCost: 45,
      range: 2.05,
      rangeUp: 2.55,
      fire: 0.7,
      fireUp: 0.58,
      dmg: 7,
      dmgUp: 12,
      slow: 0.48,
      slowUp: 0.38,
      slowDur: 1.7,
      slowDurUp: 2.3,
      color: "#9b7ad4",
      colorDim: "#2a2040",
    },
  };

  const KINDS = {
    fast: {
      hp: 26,
      speed: 2.35,
      gold: 8,
      sides: 3,
      r: 0.26,
      color: "#c45c4a",
      name: "잔벌",
    },
    mid: {
      hp: 62,
      speed: 1.42,
      gold: 12,
      sides: 5,
      r: 0.34,
      color: "#d4a056",
      name: "중갑",
    },
    heavy: {
      hp: 145,
      speed: 0.88,
      gold: 18,
      sides: 6,
      r: 0.42,
      color: "#7a8a96",
      name: "둔중",
    },
    tank: {
      hp: 780,
      speed: 0.64,
      gold: 90,
      sides: 8,
      r: 0.56,
      color: "#8b3a3a",
      name: "수호",
    },
  };

  function fill(kind, n) {
    return Array.from({ length: n }, () => kind);
  }

  const WAVES = [
    { gap: 0.72, units: fill("fast", 8) },
    { gap: 0.64, units: [...fill("fast", 8), ...fill("mid", 3)] },
    { gap: 0.58, units: [...fill("fast", 6), ...fill("mid", 6)] },
    { gap: 0.55, units: [...fill("fast", 6), ...fill("mid", 5), ...fill("heavy", 2)] },
    { gap: 0.52, units: [...fill("mid", 8), ...fill("heavy", 4)] },
    { gap: 0.42, units: [...fill("fast", 12), ...fill("mid", 6), ...fill("heavy", 3)] },
    { gap: 0.48, units: [...fill("mid", 8), ...fill("heavy", 8)] },
    { gap: 0.5, units: [...fill("heavy", 6), ...fill("mid", 8), "tank"] },
  ];

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("stage");
  const overlay = document.getElementById("overlay");
  const towerPanel = document.getElementById("tower-panel");
  const towerTray = document.getElementById("tower-tray");
  const hintEl = document.getElementById("hint");
  const btnWave = document.getElementById("btn-wave");
  const btnPause = document.getElementById("btn-pause");
  const btnRestart = document.getElementById("btn-restart");
  const btnMenu = document.getElementById("btn-menu");
  const btnOpenShop = document.getElementById("btn-open-shop");
  const btnShopBack = document.getElementById("btn-shop-back");
  const btnFakeAd = document.getElementById("btn-fake-ad");
  const shopBonusEl = document.getElementById("shop-bonus");
  const stageTitleEl = document.getElementById("stage-title");
  const stageSubEl = document.getElementById("stage-sub");
  const screenCampaign = document.getElementById("screen-campaign");
  const screenShop = document.getElementById("screen-shop");
  const screenBattle = document.getElementById("screen-battle");
  const mapNodes = STAGES.map((s) => document.getElementById("node-" + s.id));
  const trayItems = Array.from(document.querySelectorAll(".tray-item"));

  const TOWER_TYPES = ["single", "splash", "slow"];
  const towerSprites = {};
  for (const id of TOWER_TYPES) {
    const img = new Image();
    img.src = "assets/tower-" + id + ".png";
    towerSprites[id] = img;
  }

  let cell = 32;
  let dpr = 1;
  let paper = null;
  let waypoints = [];
  let pathLen = 0;
  const DRAG_THRESHOLD = 10;
  let trayDrag = null; // { type, pointerId, sx, sy, active, el }

  const G = {
    phase: "idle", // idle | play | pause | win | lose
    stageId: 0,
    stageHpMul: 1,
    gold: 80,
    lives: START_LIVES,
    wave: 0,
    waveLive: false,
    spawnQ: [],
    spawnGap: 0.6,
    spawnT: 0,
    towers: [],
    enemies: [],
    shots: [],
    fx: [],
    floaters: [],
    sel: null, // {type:'tower', i}
    placeSelected: null, // single | splash | slow
    hoverCell: null, // {c, r} | null
    drag: null, // { type, clientX, clientY, c, r }
    shake: 0,
    flashLeak: 0,
    t: 0,
  };

  // ---------- audio (procedural) ----------
  let ac = null;
  function audio() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, slide) {
    const a = audio();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.06, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0008, a.currentTime + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }
  function sfx(kind) {
    if (kind === "place") {
      tone(90, 0.12, "sine", 0.09, 50);
      tone(180, 0.08, "triangle", 0.04);
    } else if (kind === "shoot") tone(520, 0.04, "square", 0.018);
    else if (kind === "splash") tone(220, 0.1, "triangle", 0.04, 90);
    else if (kind === "hit") tone(340, 0.03, "square", 0.015);
    else if (kind === "kill") {
      tone(480, 0.08, "sine", 0.04, 720);
    } else if (kind === "leak") {
      tone(70, 0.22, "sawtooth", 0.06, 40);
    } else if (kind === "wave") {
      tone(220, 0.18, "sine", 0.05, 440);
    } else if (kind === "win") {
      tone(330, 0.2, "sine", 0.06, 660);
      setTimeout(() => tone(440, 0.28, "sine", 0.06, 880), 140);
    } else if (kind === "lose") {
      tone(200, 0.35, "triangle", 0.07, 70);
    } else if (kind === "up") {
      tone(400, 0.1, "sine", 0.05, 800);
    } else if (kind === "deny") tone(140, 0.08, "square", 0.03);
  }

  function defaultSave() {
    return { stars: [0, 0, 0], unlocked: [true, false, false], bonusGold: 0 };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const s = JSON.parse(raw);
      return {
        stars: s.stars || [0, 0, 0],
        unlocked: s.unlocked || [true, false, false],
        bonusGold: s.bonusGold || 0,
      };
    } catch {
      return defaultSave();
    }
  }

  function persistSave() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(campaignSave));
  }

  function starsFromLives(lives) {
    if (lives >= 18) return 3;
    if (lives >= 6) return 2;
    if (lives >= 1) return 1;
    return 0;
  }

  function renderStars(n) {
    let s = "";
    for (let i = 0; i < 3; i++) s += i < n ? "★" : "☆";
    return s;
  }

  function starsHtml(n) {
    let h = "";
    for (let i = 0; i < 3; i++) h += i < n ? "★" : '<span class="dim">☆</span>';
    return h;
  }

  function renderCampaignMap() {
    campaignSave = loadSave();
    for (let i = 0; i < STAGES.length; i++) {
      const node = mapNodes[i];
      const starsEl = document.getElementById("stars-" + i);
      if (!node) continue;
      const unlocked = !!campaignSave.unlocked[i];
      node.disabled = !unlocked;
      if (starsEl) starsEl.textContent = renderStars(campaignSave.stars[i] || 0);
    }
    if (shopBonusEl) shopBonusEl.textContent = "보너스 골드 " + campaignSave.bonusGold;
  }

  function showScreen(name) {
    currentScreen = name;
    screenCampaign.classList.toggle("active", name === "campaign");
    screenShop.classList.toggle("active", name === "shop");
    screenBattle.classList.toggle("active", name === "battle");
    if (name === "campaign") renderCampaignMap();
    if (name === "shop") {
      campaignSave = loadSave();
      if (shopBonusEl) shopBonusEl.textContent = "보너스 골드 " + campaignSave.bonusGold;
    }
    if (name === "battle") resize();
  }

  function applyStagePath(stage) {
    pathCells = stage.path.slice();
    pathSet = new Set(pathCells.map(([c, r]) => c + "," + r));
    currentStage = stage;
  }

  function startStage(stageId) {
    const stage = STAGES[stageId];
    if (!stage || !campaignSave.unlocked[stageId]) return;
    campaignSave = loadSave();
    applyStagePath(stage);
    G.stageId = stageId;
    G.stageHpMul = stage.hpMul;
    stageTitleEl.textContent = stage.name;
    stageSubEl.textContent = stage.desc;
    showScreen("battle");
    resetGame(stage.startGold + campaignSave.bonusGold);
    if (campaignSave.bonusGold > 0) {
      campaignSave.bonusGold = 0;
      persistSave();
    }
  }

  function exitToCampaign() {
    G.phase = "idle";
    clearPlacement();
    hideUpgradePanel();
    overlay.classList.add("hidden");
    showScreen("campaign");
  }

  // ---------- helpers ----------
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function dist(ax, ay, bx, by) {
    const dx = ax - bx,
      dy = ay - by;
    return Math.hypot(dx, dy);
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  function makePaper(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.fillStyle = "#17140f";
    x.fillRect(0, 0, w, h);
    const img = x.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      d[i] = clamp(d[i] + n + 4, 0, 255);
      d[i + 1] = clamp(d[i + 1] + n * 0.92, 0, 255);
      d[i + 2] = clamp(d[i + 2] + n * 0.7 - 4, 0, 255);
    }
    x.putImageData(img, 0, 0);
    // faint fibers
    x.globalAlpha = 0.04;
    x.strokeStyle = "#c4a574";
    for (let i = 0; i < 40; i++) {
      x.beginPath();
      const y = Math.random() * h;
      x.moveTo(0, y);
      x.bezierCurveTo(w * 0.3, y + (Math.random() - 0.5) * 20, w * 0.7, y + (Math.random() - 0.5) * 20, w, y);
      x.stroke();
    }
    x.globalAlpha = 1;
    return c;
  }

  function rebuildWaypoints() {
    waypoints = pathCells.map(([c, r]) => ({
      x: (c + 0.5) * cell,
      y: (r + 0.5) * cell,
    }));
    pathLen = 0;
    for (let i = 1; i < waypoints.length; i++) {
      pathLen += dist(waypoints[i - 1].x, waypoints[i - 1].y, waypoints[i].x, waypoints[i].y);
    }
  }

  function posOnPath(s) {
    if (s <= 0) return { x: waypoints[0].x, y: waypoints[0].y, ang: 0 };
    if (s >= pathLen) {
      const a = waypoints[waypoints.length - 2];
      const b = waypoints[waypoints.length - 1];
      return { x: b.x, y: b.y, ang: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    let left = s;
    for (let i = 1; i < waypoints.length; i++) {
      const a = waypoints[i - 1],
        b = waypoints[i];
      const L = dist(a.x, a.y, b.x, b.y);
      if (left <= L) {
        const t = left / L;
        return {
          x: lerp(a.x, b.x, t),
          y: lerp(a.y, b.y, t),
          ang: Math.atan2(b.y - a.y, b.x - a.x),
        };
      }
      left -= L;
    }
    const last = waypoints[waypoints.length - 1];
    return { x: last.x, y: last.y, ang: 0 };
  }

  function occupyKey(c, r) {
    return c + "," + r;
  }
  function towerAt(c, r) {
    return G.towers.find((t) => t.c === c && t.r === r);
  }
  function canBuild(c, r) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
    if (pathSet.has(occupyKey(c, r))) return false;
    if (towerAt(c, r)) return false;
    return true;
  }

  // ---------- resize ----------
  function resize() {
    const pad = 0;
    const aw = Math.max(280, stage.clientWidth - pad);
    const ah = Math.max(220, stage.clientHeight - pad);
    cell = Math.floor(Math.min(aw / COLS, ah / ROWS));
    cell = Math.max(22, cell);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cell * COLS;
    const h = cell * ROWS;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paper = makePaper(Math.min(w, 480), Math.min(h, 400));
    rebuildWaypoints();
    // keep enemies on path after resize
    for (const e of G.enemies) {
      const k = KINDS[e.kind];
      const spMul = 1 + (Math.max(1, G.wave) - 1) * 0.045;
      e.r = k.r * cell;
      e.speed = k.speed * spMul * cell;
      const p = posOnPath(e.prog * pathLen);
      e.x = p.x;
      e.y = p.y;
      e.ang = p.ang;
    }
    for (const t of G.towers) {
      t.x = (t.c + 0.5) * cell;
      t.y = (t.r + 0.5) * cell;
    }
    layoutMenus();
  }

  function canAfford(type) {
    const def = TOWERS[type];
    return def && G.gold >= def.cost;
  }

  function updateTrayUI() {
    if (G.placeSelected && !canAfford(G.placeSelected)) G.placeSelected = null;
    for (const btn of trayItems) {
      const type = btn.dataset.type;
      const afford = canAfford(type);
      btn.classList.toggle("selected", G.placeSelected === type);
      btn.classList.toggle("cant-afford", !afford);
      btn.classList.toggle("dragging", trayDrag && trayDrag.active && trayDrag.type === type);
    }
  }

  function selectTowerType(type) {
    if (!canAfford(type)) {
      sfx("deny");
      return;
    }
    if (G.placeSelected === type) G.placeSelected = null;
    else {
      G.placeSelected = type;
      hideUpgradePanel();
    }
    updateTrayUI();
  }

  function clearPlacement() {
    G.placeSelected = null;
    G.hoverCell = null;
    G.drag = null;
    updateTrayUI();
  }

  // ---------- game flow ----------
  function resetGame(startGold) {
    G.phase = "play";
    G.gold = startGold != null ? startGold : currentStage.startGold;
    G.lives = START_LIVES;
    G.wave = 0;
    G.waveLive = false;
    G.spawnQ = [];
    G.spawnT = 0;
    G.towers = [];
    G.enemies = [];
    G.shots = [];
    G.fx = [];
    G.floaters = [];
    G.sel = null;
    G.placeSelected = null;
    G.hoverCell = null;
    G.drag = null;
    G.shake = 0;
    G.flashLeak = 0;
    trayDrag = null;
    hideUpgradePanel();
    overlay.classList.add("hidden");
    hintEl.textContent = "아래에서 타워를 고른 뒤 빈 칸을 눌러 지으세요.";
    syncHud();
    setWaveBtn();
  }

  function syncHud() {
    document.getElementById("stat-gold").textContent = Math.floor(G.gold);
    document.getElementById("stat-lives").textContent = G.lives;
    document.getElementById("stat-wave").textContent = G.wave;
    btnPause.textContent = G.phase === "pause" ? "계속" : "일시정지";
    updateTrayUI();
  }

  function setWaveBtn() {
    if (G.phase !== "play") {
      btnWave.disabled = true;
      return;
    }
    if (G.waveLive) {
      btnWave.disabled = true;
      btnWave.textContent = "웨이브 진행 중";
    } else if (G.wave >= 8) {
      btnWave.disabled = true;
      btnWave.textContent = "마지막 웨이브";
    } else {
      btnWave.disabled = false;
      btnWave.textContent = G.wave === 0 ? "첫 웨이브 시작" : "다음 웨이브";
    }
  }

  function startWave() {
    if (G.phase !== "play" || G.waveLive || G.wave >= 8) return;
    G.wave += 1;
    const def = WAVES[G.wave - 1];
    G.spawnQ = def.units.slice();
    G.spawnGap = def.gap;
    G.spawnT = 0.15;
    G.waveLive = true;
    sfx("wave");
    hintEl.textContent = "웨이브 " + G.wave + " — 길을 지키세요.";
    burst(waypoints[0].x, waypoints[0].y, "#c4a574", 10);
    syncHud();
    setWaveBtn();
  }

  function maybeEndWave() {
    if (!G.waveLive) return;
    if (G.spawnQ.length || G.enemies.length) return;
    G.waveLive = false;
    if (G.wave >= 8) {
      win();
      return;
    }
    hintEl.textContent = "웨이브 클리어. 다음 웨이브를 준비하세요.";
    setWaveBtn();
  }

  function win() {
    G.phase = "win";
    sfx("win");
    hideMenus();
    clearPlacement();
    const stars = starsFromLives(G.lives);
    const sid = G.stageId;
    if (stars > (campaignSave.stars[sid] || 0)) campaignSave.stars[sid] = stars;
    if (stars >= 1 && sid < STAGES.length - 1) campaignSave.unlocked[sid + 1] = true;
    persistSave();
    overlay.innerHTML =
      '<div class="card"><h2>승리</h2>' +
      '<div class="stars">' + starsHtml(stars) + "</div>" +
      "<p>남은 목숨 " +
      G.lives +
      " — " +
      stars +
      "별을 얻었어요.</p>" +
      '<div class="btn-row"><button type="button" id="btn-campaign">캠페인으로</button>' +
      '<button type="button" class="btn-secondary" id="btn-again">다시</button></div></div>';
    overlay.classList.remove("hidden");
    document.getElementById("btn-campaign").onclick = () => {
      audio();
      exitToCampaign();
    };
    document.getElementById("btn-again").onclick = () => {
      audio();
      startStage(G.stageId);
    };
    setWaveBtn();
  }

  function lose() {
    G.phase = "lose";
    sfx("lose");
    hideMenus();
    clearPlacement();
    overlay.innerHTML =
      '<div class="card"><h2>패배</h2><p>길이 뚫렸어요.<br/>목숨이 모두 닳았습니다.</p>' +
      '<div class="btn-row"><button type="button" id="btn-campaign">캠페인으로</button>' +
      '<button type="button" class="btn-secondary" id="btn-again">다시</button></div></div>';
    overlay.classList.remove("hidden");
    document.getElementById("btn-campaign").onclick = () => {
      audio();
      exitToCampaign();
    };
    document.getElementById("btn-again").onclick = () => {
      audio();
      startStage(G.stageId);
    };
    setWaveBtn();
  }

  function togglePause() {
    if (G.phase === "play") {
      G.phase = "pause";
      overlay.innerHTML =
        '<div class="card"><h2>일시정지</h2><p>숨 고르고 다시 막을 수 있어요.</p><button type="button" id="btn-resume">계속</button></div>';
      overlay.classList.remove("hidden");
      document.getElementById("btn-resume").onclick = () => {
        G.phase = "play";
        overlay.classList.add("hidden");
        syncHud();
      };
    } else if (G.phase === "pause") {
      G.phase = "play";
      overlay.classList.add("hidden");
    }
    syncHud();
  }

  // ---------- entities ----------
  function spawnEnemy(kindId) {
    const w = G.wave;
    const k = KINDS[kindId];
    const hpMul = (1 + (w - 1) * 0.2) * G.stageHpMul;
    const spMul = 1 + (w - 1) * 0.045;
    const p = posOnPath(0);
    const e = {
      kind: kindId,
      hp: k.hp * hpMul,
      maxHp: k.hp * hpMul,
      speed: k.speed * spMul * cell,
      gold: k.gold + Math.floor(w * 1.2),
      sides: k.sides,
      r: k.r * cell,
      color: k.color,
      prog: 0,
      x: p.x,
      y: p.y,
      ang: p.ang,
      flash: 0,
      slowT: 0,
      slowF: 1,
      pop: 0,
      dead: false,
    };
    G.enemies.push(e);
    popRing(e.x, e.y, e.color, 0.4);
  }

  function placeTower(c, r, type) {
    const def = TOWERS[type];
    if (!def || !canBuild(c, r) || G.gold < def.cost) {
      sfx("deny");
      return false;
    }
    G.gold -= def.cost;
    const t = {
      type,
      c,
      r,
      x: (c + 0.5) * cell,
      y: (r + 0.5) * cell,
      up: false,
      cd: 0,
      ang: -Math.PI / 2,
      pop: 0,
    };
    G.towers.push(t);
    sfx("place");
    t.pop = 1;
    burst(t.x, t.y, def.color, 14);
    popRing(t.x, t.y, def.color, 0.7);
    hintEl.textContent = def.name + " 타워를 세웠어요.";
    syncHud();
    return true;
  }

  function upgradeTower(t) {
    const def = TOWERS[t.type];
    if (t.up || G.gold < def.upCost) {
      sfx("deny");
      return;
    }
    G.gold -= def.upCost;
    t.up = true;
    t.pop = 0.8;
    sfx("up");
    burst(t.x, t.y, def.color, 16);
    popRing(t.x, t.y, "#e8dcc8", 0.9);
    hintEl.textContent = def.name + " 타워를 강화했어요.";
    syncHud();
  }

  function towerStats(t) {
    const d = TOWERS[t.type];
    return {
      range: (t.up ? d.rangeUp : d.range) * cell,
      fire: t.up ? d.fireUp : d.fire,
      dmg: t.up ? d.dmgUp : d.dmg,
      splash: (t.up ? d.splashUp || d.splash : d.splash) * cell || 0,
      slow: t.up ? d.slowUp || d.slow : d.slow,
      slowDur: t.up ? d.slowDurUp || d.slowDur : d.slowDur,
      color: d.color,
    };
  }

  function pickTarget(t, range) {
    let best = null,
      bestS = -1;
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist(t.x, t.y, e.x, e.y) <= range + e.r) {
        if (e.prog > bestS) {
          bestS = e.prog;
          best = e;
        }
      }
    }
    return best;
  }

  function fire(t, e, st) {
    t.ang = Math.atan2(e.y - t.y, e.x - t.x);
    const spd = (t.type === "splash" ? 6.2 : 9.2) * cell;
    G.shots.push({
      x: t.x + Math.cos(t.ang) * cell * 0.28,
      y: t.y + Math.sin(t.ang) * cell * 0.28,
      vx: Math.cos(t.ang) * spd,
      vy: Math.sin(t.ang) * spd,
      target: e,
      type: t.type,
      dmg: st.dmg,
      splash: st.splash,
      slow: st.slow,
      slowDur: st.slowDur,
      color: st.color,
      r: t.type === "splash" ? 4.5 : 3.2,
      life: 1.4,
    });
    G.fx.push({
      kind: "muzzle",
      x: t.x + Math.cos(t.ang) * cell * 0.32,
      y: t.y + Math.sin(t.ang) * cell * 0.32,
      t: 0,
      max: 0.12,
      color: st.color,
    });
    if (t.type === "splash") sfx("splash");
    else sfx("shoot");
  }

  function hitEnemy(e, dmg, slow, slowDur) {
    e.hp -= dmg;
    e.flash = 1;
    if (slow && slowDur) {
      e.slowT = Math.max(e.slowT, slowDur);
      e.slowF = Math.min(e.slowF, slow);
    }
    G.floaters.push({
      x: e.x,
      y: e.y - e.r,
      t: 0,
      text: "" + Math.round(dmg),
      color: "#e8dcc8",
    });
    sfx("hit");
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    G.gold += e.gold;
    burst(e.x, e.y, e.color, 18);
    popRing(e.x, e.y, e.color, 0.55);
    sfx("kill");
    G.floaters.push({
      x: e.x,
      y: e.y,
      t: 0,
      text: "+" + e.gold,
      color: "#c4a574",
    });
    syncHud();
  }

  function leak(e) {
    e.dead = true;
    G.lives -= 1;
    G.shake = 1;
    G.flashLeak = 1;
    sfx("leak");
    burst(e.x, e.y, "#c45c4a", 12);
    syncHud();
    if (G.lives <= 0) lose();
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = 20 + Math.random() * 80;
      G.fx.push({
        kind: "spark",
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        t: 0,
        max: 0.35 + Math.random() * 0.25,
        color,
        r: 1.2 + Math.random() * 2,
      });
    }
  }
  function popRing(x, y, color, size) {
    G.fx.push({ kind: "ring", x, y, t: 0, max: 0.45, color, size: size || 0.6 });
  }

  // ---------- input ----------
  function canvasToCell(clientX, clientY) {
    const rec = canvas.getBoundingClientRect();
    const x = ((clientX - rec.left) / rec.width) * (cell * COLS);
    const y = ((clientY - rec.top) / rec.height) * (cell * ROWS);
    return { c: Math.floor(x / cell), r: Math.floor(y / cell), x, y };
  }

  function isOnCanvas(clientX, clientY) {
    const rec = canvas.getBoundingClientRect();
    return clientX >= rec.left && clientY >= rec.top && clientX <= rec.right && clientY <= rec.bottom;
  }

  function cellFromPointer(clientX, clientY) {
    const { c, r } = canvasToCell(clientX, clientY);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
    return { c, r };
  }

  function hideMenus() {
    hideUpgradePanel();
  }

  function hideUpgradePanel() {
    G.sel = null;
    towerPanel.className = "";
    towerPanel.innerHTML = "";
  }

  function layoutMenus() {
    if (!G.sel || G.sel.type !== "tower") return;
    const t = G.towers[G.sel.i];
    if (!t) return;
    const rec = canvas.getBoundingClientRect();
    const stageRec = stage.getBoundingClientRect();
    const cx = rec.left - stageRec.left + (t.c + 0.5) * (rec.width / COLS);
    const cy = rec.top - stageRec.top + (t.r + 0.5) * (rec.height / ROWS);
    towerPanel.style.left = cx + "px";
    towerPanel.style.top = cy + "px";
    clampUpgradePanel();
  }

  function clampUpgradePanel() {
    if (!towerPanel.classList.contains("visible")) return;
    const btn = towerPanel.querySelector(".up-btn");
    if (!btn) return;
    const stageRec = stage.getBoundingClientRect();
    const panelRec = btn.getBoundingClientRect();
    let dx = 0;
    let dy = 0;
    const pad = 6;
    if (panelRec.left < stageRec.left + pad) dx = stageRec.left + pad - panelRec.left;
    if (panelRec.right > stageRec.right - pad) dx = stageRec.right - pad - panelRec.right;
    if (panelRec.top < stageRec.top + pad) dy = stageRec.top + pad - panelRec.top;
    if (panelRec.bottom > stageRec.bottom - pad) dy = stageRec.bottom - pad - panelRec.bottom;
    const left = parseFloat(btn.style.left) || 0;
    const top = parseFloat(btn.style.top) || 0;
    if (dx || dy) {
      btn.style.left = left + dx + "px";
      btn.style.top = top + dy + "px";
    }
  }

  function openTower(i) {
    const t = G.towers[i];
    if (!t) return;
    clearPlacement();
    G.sel = { type: "tower", i };
    towerPanel.innerHTML = "";
    const d = TOWERS[t.type];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "up-btn";
    if (t.up) {
      b.textContent = "최대";
      b.disabled = true;
    } else {
      b.innerHTML = "업그레이드<small>" + d.upCost + "</small>";
      if (G.gold < d.upCost) b.disabled = true;
      b.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        upgradeTower(t);
        openTower(i);
      });
    }
    b.style.left = "-46px";
    b.style.top = t.r < 2 ? "36px" : "-70px";
    towerPanel.appendChild(b);
    towerPanel.className = "visible";
    layoutMenus();
  }

  function tryPlaceAt(c, r, type) {
    if (!type || !canBuild(c, r)) return false;
    return placeTower(c, r, type);
  }

  function onCanvasPointerDown(ev) {
    if (ev.button !== undefined && ev.button !== 0) return;
    audio();
    if (G.phase !== "play" || G.drag) return;
    if (!isOnCanvas(ev.clientX, ev.clientY)) return;
    ev.preventDefault();
    const cellPos = cellFromPointer(ev.clientX, ev.clientY);
    if (!cellPos) {
      clearPlacement();
      hideMenus();
      return;
    }
    const { c, r } = cellPos;
    const tw = towerAt(c, r);
    if (tw) {
      const i = G.towers.indexOf(tw);
      if (G.sel && G.sel.type === "tower" && G.sel.i === i) hideMenus();
      else openTower(i);
      return;
    }
    if (G.placeSelected) {
      if (canBuild(c, r)) {
        tryPlaceAt(c, r, G.placeSelected);
      } else {
        clearPlacement();
      }
      return;
    }
    if (!canBuild(c, r)) clearPlacement();
    else hideMenus();
  }

  function onCanvasPointerMove(ev) {
    if (G.phase !== "play") return;
    if (G.drag) {
      G.drag.clientX = ev.clientX;
      G.drag.clientY = ev.clientY;
      const cellPos = isOnCanvas(ev.clientX, ev.clientY) ? cellFromPointer(ev.clientX, ev.clientY) : null;
      G.drag.c = cellPos ? cellPos.c : -1;
      G.drag.r = cellPos ? cellPos.r : -1;
      if (ev.pointerType === "touch") ev.preventDefault();
      return;
    }
    if (!G.placeSelected) {
      G.hoverCell = null;
      return;
    }
    const cellPos = isOnCanvas(ev.clientX, ev.clientY) ? cellFromPointer(ev.clientX, ev.clientY) : null;
    G.hoverCell = cellPos;
    if (ev.pointerType === "touch") ev.preventDefault();
  }

  function onCanvasPointerUp(ev) {
    if (!G.drag || G.drag.pointerId !== ev.pointerId) return;
    const type = G.drag.type;
    const cellPos =
      isOnCanvas(ev.clientX, ev.clientY) ? cellFromPointer(ev.clientX, ev.clientY) : null;
    G.drag = null;
    trayDrag = null;
    updateTrayUI();
    if (cellPos && canBuild(cellPos.c, cellPos.r)) {
      tryPlaceAt(cellPos.c, cellPos.r, type);
    }
  }

  function onTrayPointerDown(ev) {
    const type = ev.currentTarget.dataset.type;
    if (!canAfford(type)) {
      sfx("deny");
      return;
    }
    ev.preventDefault();
    audio();
    trayDrag = {
      type,
      pointerId: ev.pointerId,
      sx: ev.clientX,
      sy: ev.clientY,
      active: false,
      el: ev.currentTarget,
    };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  }

  function onTrayPointerMove(ev) {
    if (!trayDrag || trayDrag.pointerId !== ev.pointerId) return;
    const dx = ev.clientX - trayDrag.sx;
    const dy = ev.clientY - trayDrag.sy;
    if (!trayDrag.active && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      trayDrag.active = true;
      hideMenus();
      G.placeSelected = null;
      G.drag = {
        type: trayDrag.type,
        pointerId: ev.pointerId,
        clientX: ev.clientX,
        clientY: ev.clientY,
        c: -1,
        r: -1,
      };
      updateTrayUI();
    }
    if (trayDrag.active && G.drag) {
      G.drag.clientX = ev.clientX;
      G.drag.clientY = ev.clientY;
      const cellPos = isOnCanvas(ev.clientX, ev.clientY) ? cellFromPointer(ev.clientX, ev.clientY) : null;
      G.drag.c = cellPos ? cellPos.c : -1;
      G.drag.r = cellPos ? cellPos.r : -1;
    }
    ev.preventDefault();
  }

  function onTrayPointerUp(ev) {
    if (!trayDrag || trayDrag.pointerId !== ev.pointerId) return;
    const type = trayDrag.type;
    const wasDrag = trayDrag.active;
    trayDrag.el.releasePointerCapture(ev.pointerId);
    trayDrag = null;
    if (wasDrag && G.drag) {
      const cellPos =
        isOnCanvas(ev.clientX, ev.clientY) ? cellFromPointer(ev.clientX, ev.clientY) : null;
      G.drag = null;
      updateTrayUI();
      if (cellPos && canBuild(cellPos.c, cellPos.r)) tryPlaceAt(cellPos.c, cellPos.r, type);
      return;
    }
    G.drag = null;
    selectTowerType(type);
    ev.preventDefault();
  }

  function onTrayPointerCancel(ev) {
    if (!trayDrag || trayDrag.pointerId !== ev.pointerId) return;
    trayDrag = null;
    G.drag = null;
    updateTrayUI();
  }

  canvas.addEventListener("pointerdown", onCanvasPointerDown, { passive: false });
  canvas.addEventListener("pointermove", onCanvasPointerMove, { passive: false });
  canvas.addEventListener("pointerup", onCanvasPointerUp, { passive: false });
  canvas.addEventListener("pointercancel", onCanvasPointerUp, { passive: false });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  for (const btn of trayItems) {
    btn.addEventListener("pointerdown", onTrayPointerDown);
    btn.addEventListener("pointermove", onTrayPointerMove);
    btn.addEventListener("pointerup", onTrayPointerUp);
    btn.addEventListener("pointercancel", onTrayPointerCancel);
  }

  overlay.addEventListener("pointerdown", (e) => e.stopPropagation());

  for (let i = 0; i < mapNodes.length; i++) {
    mapNodes[i].addEventListener("click", () => {
      audio();
      startStage(i);
    });
  }
  btnOpenShop.addEventListener("click", () => {
    audio();
    showScreen("shop");
  });
  btnShopBack.addEventListener("click", () => {
    audio();
    showScreen("campaign");
  });
  btnFakeAd.addEventListener("click", () => {
    audio();
    if (btnFakeAd.disabled) return;
    btnFakeAd.disabled = true;
    btnFakeAd.textContent = "재생 중…";
    setTimeout(() => {
      campaignSave = loadSave();
      campaignSave.bonusGold += 30;
      persistSave();
      btnFakeAd.disabled = false;
      btnFakeAd.textContent = "시청";
      if (shopBonusEl) shopBonusEl.textContent = "보너스 골드 " + campaignSave.bonusGold;
      sfx("up");
    }, 1000);
  });
  btnMenu.addEventListener("click", () => {
    audio();
    if (G.phase === "play" || G.phase === "pause") togglePause();
  });
  btnWave.addEventListener("click", () => {
    audio();
    startWave();
  });
  btnPause.addEventListener("click", () => {
    audio();
    if (G.phase === "play" || G.phase === "pause") togglePause();
  });
  btnRestart.addEventListener("click", () => {
    audio();
    startStage(G.stageId);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (currentScreen !== "battle") return;
    if (G.placeSelected || G.drag) {
      clearPlacement();
      trayDrag = null;
      e.preventDefault();
    } else if (G.phase === "play") togglePause();
    else if (G.phase === "pause") togglePause();
  });

  document.addEventListener(
    "pointerdown",
    (ev) => {
      if (currentScreen !== "battle" || G.phase !== "play") return;
      if (!G.placeSelected && !G.drag) return;
      const t = ev.target;
      if (canvas.contains(t) || towerTray.contains(t)) return;
      clearPlacement();
      trayDrag = null;
    },
    true
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && G.phase === "play") togglePause();
  });

  window.addEventListener("resize", resize);

  // ---------- update ----------
  function update(dt) {
    if (currentScreen !== "battle") return;
    if (G.phase !== "play") {
      G.t += dt;
      return;
    }
    G.t += dt;
    G.shake = Math.max(0, G.shake - dt * 3.2);
    G.flashLeak = Math.max(0, G.flashLeak - dt * 2.4);

    if (G.waveLive && G.spawnQ.length) {
      G.spawnT -= dt;
      if (G.spawnT <= 0) {
        spawnEnemy(G.spawnQ.shift());
        G.spawnT = G.spawnGap;
      }
    }

    for (const e of G.enemies) {
      if (e.dead) continue;
      e.pop = Math.min(1, e.pop + dt * 6);
      e.flash = Math.max(0, e.flash - dt * 6);
      if (e.slowT > 0) e.slowT -= dt;
      else e.slowF = 1;
      const spd = e.speed * (e.slowT > 0 ? e.slowF : 1);
      e.prog += pathLen > 0 ? (spd * dt) / pathLen : 0;
      if (e.prog >= 1) {
        leak(e);
        continue;
      }
      const p = posOnPath(e.prog * pathLen);
      e.x = p.x;
      e.y = p.y;
      e.ang = p.ang;
    }

    for (const t of G.towers) {
      t.pop = Math.max(0, t.pop - dt * 3.5);
      t.cd -= dt;
      const st = towerStats(t);
      if (t.cd <= 0) {
        const tgt = pickTarget(t, st.range);
        if (tgt) {
          fire(t, tgt, st);
          t.cd = st.fire;
        }
      }
    }

    for (const s of G.shots) {
      s.life -= dt;
      if (s.target && !s.target.dead) {
        const ang = Math.atan2(s.target.y - s.y, s.target.x - s.x);
        const spd = Math.hypot(s.vx, s.vy);
        // light homing
        s.vx = lerp(s.vx, Math.cos(ang) * spd, 0.18);
        s.vy = lerp(s.vy, Math.sin(ang) * spd, 0.18);
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life <= 0) {
        s.dead = true;
        continue;
      }
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (dist(s.x, s.y, e.x, e.y) < e.r + s.r) {
          s.dead = true;
          if (s.type === "splash") {
            popRing(s.x, s.y, s.color, 1.1);
            burst(s.x, s.y, s.color, 10);
            for (const o of G.enemies) {
              if (o.dead) continue;
              const d0 = dist(s.x, s.y, o.x, o.y);
              if (d0 <= s.splash + o.r) {
                const fall = d0 < o.r ? 1 : 0.55;
                hitEnemy(o, s.dmg * fall, 0, 0);
              }
            }
          } else {
            hitEnemy(e, s.dmg, s.slow, s.slowDur);
            burst(s.x, s.y, s.color, 5);
          }
          break;
        }
      }
    }

    G.enemies = G.enemies.filter((e) => !e.dead);
    G.shots = G.shots.filter((s) => !s.dead);

    for (const f of G.fx) f.t += dt;
    G.fx = G.fx.filter((f) => f.t < f.max);
    for (const f of G.floaters) f.t += dt;
    G.floaters = G.floaters.filter((f) => f.t < 0.7);

    maybeEndWave();
  }

  // ---------- draw ----------
  function drawPoly(x, y, r, sides, rot) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * TAU - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function draw() {
    if (currentScreen !== "battle") return;
    const W = cell * COLS,
      H = cell * ROWS;
    ctx.save();
    if (G.shake > 0) {
      const m = G.shake * 7;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    if (paper) ctx.drawImage(paper, 0, 0, W, H);
    else {
      ctx.fillStyle = "#17140f";
      ctx.fillRect(0, 0, W, H);
    }

    // tiles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * cell,
          y = r * cell;
        const path = pathSet.has(occupyKey(c, r));
        if (!path) {
          ctx.fillStyle = "rgba(0,0,0,0.14)";
          ctx.fillRect(x + 1, y + cell - 4, cell - 2, 3);
          ctx.fillStyle = r % 2 === c % 2 ? "rgba(232,220,200,0.035)" : "rgba(232,220,200,0.02)";
          roundRect(x + 1.5, y + 1.5, cell - 3, cell - 4, 4);
          ctx.fill();
        }
      }
    }

    // path bed
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "#2a241c";
    ctx.lineWidth = cell * 0.82;
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) ctx.lineTo(waypoints[i].x, waypoints[i].y);
    ctx.stroke();
    ctx.strokeStyle = "#3a3226";
    ctx.lineWidth = cell * 0.62;
    ctx.stroke();
    ctx.strokeStyle = "rgba(196,165,116,0.16)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = cell * 0.06;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // entrance / exit marks
    const a = waypoints[0],
      b = waypoints[waypoints.length - 1];
    ctx.fillStyle = "rgba(196,165,116,0.35)";
    ctx.font = "bold " + Math.max(10, cell * 0.28) + "px 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("입", a.x, a.y);
    ctx.fillStyle = "rgba(196,92,74,0.55)";
    ctx.fillText("출", b.x, b.y);

    // placement ghost / hover preview
    drawPlacementGhost();

    // grid dots
    ctx.fillStyle = "rgba(232,220,200,0.08)";
    for (let r = 0; r <= ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.arc(c * cell, r * cell, 1.1, 0, TAU);
        ctx.fill();
      }
    }

    // range of selected tower
    if (G.sel && G.sel.type === "tower") {
      const t = G.towers[G.sel.i];
      if (t) {
        const st = towerStats(t);
        ctx.beginPath();
        ctx.arc(t.x, t.y, st.range, 0, TAU);
        ctx.fillStyle = hexA(st.color, 0.08);
        ctx.fill();
        ctx.strokeStyle = hexA(st.color, 0.45);
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    drawTowers();
    drawEnemies();
    drawShots();
    drawFx();

    if (G.flashLeak > 0) {
      ctx.fillStyle = "rgba(180,40,30," + G.flashLeak * 0.22 + ")";
      ctx.fillRect(0, 0, W, H);
    }

    // vignette
    const g = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.2, W * 0.5, H * 0.5, H * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(8,6,4,0.38)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawTowerArt(x, y, type, opts) {
    const alpha = (opts && opts.alpha) != null ? opts.alpha : 1;
    const scale = (opts && opts.scale) != null ? opts.scale : 1;
    const invalid = opts && opts.invalid;
    const pop = (opts && opts.pop) || 0;
    const img = towerSprites[type];
    const size = cell * 0.9 * scale;

    ctx.save();
    ctx.translate(x, y);
    if (pop > 0) {
      const sc = 1 + Math.sin(Math.min(1, 1 - pop) * Math.PI) * 0.18 * pop;
      ctx.scale(sc, sc);
    }

    ctx.beginPath();
    ctx.ellipse(0, cell * 0.2, cell * 0.3, cell * 0.1, 0, 0, TAU);
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fill();

    if (img && img.complete && img.naturalWidth) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, -size / 2, -size / 2 - cell * 0.04, size, size);
      if (invalid) {
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle = "rgba(196,92,74,0.42)";
        ctx.fillRect(-size / 2, -size / 2 - cell * 0.04, size, size);
      }
    } else {
      const d = TOWERS[type];
      ctx.globalAlpha = alpha;
      if (type === "single") {
        drawPoly(0, 0, cell * 0.3, 4, 0);
        ctx.fillStyle = d.colorDim;
        ctx.fill();
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      } else if (type === "splash") {
        drawPoly(0, 0, cell * 0.32, 6, 0);
        ctx.fillStyle = d.colorDim;
        ctx.fill();
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, cell * 0.3, 0, TAU);
        ctx.fillStyle = d.colorDim;
        ctx.fill();
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
      if (invalid) {
        ctx.fillStyle = "rgba(196,92,74,0.35)";
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawPlacementGhost() {
    let type = G.placeSelected;
    let c = -1;
    let r = -1;
    let alpha = 0.62;
    let atPointer = false;
    let px = 0;
    let py = 0;

    if (G.drag) {
      type = G.drag.type;
      c = G.drag.c;
      r = G.drag.r;
      alpha = 0.72;
      if (c < 0 || r < 0) {
        atPointer = true;
        const rec = canvas.getBoundingClientRect();
        px = ((G.drag.clientX - rec.left) / rec.width) * (cell * COLS);
        py = ((G.drag.clientY - rec.top) / rec.height) * (cell * ROWS);
      }
    } else if (G.placeSelected && G.hoverCell) {
      c = G.hoverCell.c;
      r = G.hoverCell.r;
    } else {
      return;
    }

    if (!type) return;

    if (!atPointer && c >= 0 && r >= 0) {
      const x = c * cell;
      const y = r * cell;
      const valid = canBuild(c, r);
      ctx.fillStyle = valid ? "rgba(94,200,200,0.14)" : "rgba(196,92,74,0.22)";
      roundRect(x + 2, y + 2, cell - 4, cell - 4, 5);
      ctx.fill();
      ctx.strokeStyle = valid ? "rgba(94,200,200,0.5)" : "rgba(196,92,74,0.65)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      drawTowerArt((c + 0.5) * cell, (r + 0.5) * cell, type, { alpha, invalid: !valid });
    } else if (atPointer) {
      drawTowerArt(px, py, type, { alpha: alpha * 0.85, scale: 0.95, invalid: true });
    }
  }

  function drawTowers() {
    for (const t of G.towers) {
      const pop = t.pop > 0 ? t.pop : 0;
      drawTowerArt(t.x, t.y, t.type, { pop });

      if (t.up) {
        ctx.beginPath();
        ctx.arc(t.x + cell * 0.22, t.y - cell * 0.26, 3.2, 0, TAU);
        ctx.fillStyle = "#e8dcc8";
        ctx.fill();
      }
    }
  }

  function drawEnemies() {
    for (const e of G.enemies) {
      const pop = 0.35 + 0.65 * Math.min(1, e.pop === 0 ? 1 : e.pop);
      // first spawn pop is 0 and grows; treat 0 after spawn start
      const sc = e.pop < 1 ? 0.2 + 0.95 * e.pop : 1;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.ang);
      ctx.scale(sc, sc);

      if (e.slowT > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 1.45, 0, TAU);
        ctx.fillStyle = "rgba(155,122,212,0.22)";
        ctx.fill();
      }

      drawPoly(0, 0, e.r, e.sides, 0);
      ctx.fillStyle = e.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(10,8,6,0.55)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      if (e.flash > 0) {
        ctx.globalAlpha = e.flash * 0.85;
        drawPoly(0, 0, e.r, e.sides, 0);
        ctx.fillStyle = "#fff8ee";
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // inner mark
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1.5, e.r * 0.18), 0, TAU);
      ctx.fillStyle = "rgba(10,8,6,0.45)";
      ctx.fill();
      ctx.restore();

      if (e.maxHp > 80 || e.kind === "tank" || e.kind === "heavy") {
        const w = e.r * 2.1;
        const h = 3;
        const x = e.x - w / 2;
        const y = e.y - e.r - 7;
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = e.hp / e.maxHp > 0.4 ? "#c4a574" : "#c45c4a";
        ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), h);
      }
    }
  }

  function drawShots() {
    for (const s of G.shots) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x - s.vx * 0.02, s.y - s.vy * 0.02, s.r * 0.55, 0, TAU);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fill();
    }
  }

  function drawFx() {
    for (const f of G.fx) {
      const u = f.t / f.max;
      if (f.kind === "spark") {
        ctx.globalAlpha = 1 - u;
        ctx.beginPath();
        ctx.arc(f.x + f.vx * f.t, f.y + f.vy * f.t, f.r * (1 - u * 0.5), 0, TAU);
        ctx.fillStyle = f.color;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (f.kind === "ring") {
        ctx.globalAlpha = (1 - u) * 0.7;
        ctx.beginPath();
        ctx.arc(f.x, f.y, cell * f.size * (0.2 + u * 1.3), 0, TAU);
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2.4 * (1 - u);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (f.kind === "muzzle") {
        ctx.globalAlpha = 1 - u;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 5 * (1 - u), 0, TAU);
        ctx.fillStyle = "#fff4d8";
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.font = "bold 11px 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of G.floaters) {
      const u = f.t / 0.7;
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - u * 18);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  renderCampaignMap();
  showScreen("campaign");
  requestAnimationFrame(frame);
})();
