(() => {
  'use strict';

  const COLS = 18;
  const ROWS = 18;
  const START_SPEED = 150; // ms pro Schritt
  const MIN_SPEED = 65;
  const SPEED_STEP = 4;
  const BONUS_EVERY = 5; // jedes 5. Futter bringt einen Käfer
  const BONUS_TICKS = 40;

  const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const KEYS = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right'
  };
  const MODE_NAMES = { walls: 'Mit Wänden', wrap: 'Ohne Wände' };

  // 5×5-Sprites für Futter und Käfer
  const FOOD = ['..#..', '.#.#.', '#...#', '.#.#.', '..#..'];
  const BUG = ['#...#', '.###.', '#####', '.###.', '#.#.#'];

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, String(value)); } catch { /* Speicher nicht verfügbar */ }
    }
  };

  const $ = (id) => document.getElementById(id);
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const boardEl = canvas.parentElement;
  const overlay = $('overlay');
  const overlayTitle = $('overlayTitle');
  const overlayText = $('overlayText');
  const overlayBtn = $('overlayBtn');
  const scoreEl = $('score');
  const bestEl = $('best');
  const levelEl = $('level');
  const modeEl = $('modeLabel');
  const modeBtns = document.querySelectorAll('[data-mode]');
  const soundBtn = $('soundBtn');

  const css = getComputedStyle(document.documentElement);
  const colors = {
    lcd: css.getPropertyValue('--lcd').trim() || '#b3c193',
    ink: css.getPropertyValue('--ink').trim() || '#243019'
  };

  let mode = store.get('pixelschlange.mode', 'walls') === 'wrap' ? 'wrap' : 'walls';
  let soundOn = store.get('pixelschlange.sound', 'on') !== 'off';
  let state;

  const pad4 = (n) => String(n).padStart(4, '0');
  const bestKey = () => 'pixelschlange.best.' + mode;
  const readBest = () => parseInt(store.get(bestKey(), '0'), 10) || 0;
  const level = () => 1 + Math.floor(state.eaten / BONUS_EVERY);
  const speed = () => Math.max(MIN_SPEED, START_SPEED - state.eaten * SPEED_STEP);

  function newGame(status) {
    const y = Math.floor(ROWS / 2);
    state = {
      snake: [{ x: 6, y }, { x: 5, y }, { x: 4, y }, { x: 3, y }],
      dir: 'right',
      queue: [],
      food: null,
      bonus: null,
      score: 0,
      eaten: 0,
      status,
      best: readBest(),
      record: false,
      won: false
    };
    state.food = freeCell();
    updateHud();
    updateOverlay();
    updateModeButtons();
  }

  function freeCell() {
    const taken = new Set(state.snake.map((p) => p.x + ',' + p.y));
    if (state.food) taken.add(state.food.x + ',' + state.food.y);
    if (state.bonus) taken.add(state.bonus.x + ',' + state.bonus.y);
    const free = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!taken.has(x + ',' + y)) free.push({ x, y });
      }
    }
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function step() {
    if (state.queue.length) state.dir = state.queue.shift();
    const d = DIRS[state.dir];
    const head = state.snake[0];
    let nx = head.x + d.x;
    let ny = head.y + d.y;

    if (mode === 'wrap') {
      nx = (nx + COLS) % COLS;
      ny = (ny + ROWS) % ROWS;
    } else if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
      return gameOver();
    }

    const eatsFood = state.food && nx === state.food.x && ny === state.food.y;
    // Der Schwanz rückt nach, außer die Schlange wächst gerade
    const body = eatsFood ? state.snake : state.snake.slice(0, -1);
    if (body.some((p) => p.x === nx && p.y === ny)) return gameOver();

    state.snake.unshift({ x: nx, y: ny });

    if (eatsFood) {
      state.score += level();
      state.eaten++;
      beep(880, 0.05);
      if (state.eaten % BONUS_EVERY === 0) {
        const cell = freeCell();
        if (cell) state.bonus = { ...cell, ticks: BONUS_TICKS };
      }
      state.food = freeCell();
      if (!state.food) {
        state.won = true;
        return gameOver();
      }
    } else {
      state.snake.pop();
    }

    if (state.bonus) {
      if (nx === state.bonus.x && ny === state.bonus.y) {
        state.score += 5 * level() + Math.ceil(state.bonus.ticks / 4);
        state.bonus = null;
        beep(1320, 0.09);
      } else if (--state.bonus.ticks <= 0) {
        state.bonus = null;
      }
    }

    updateHud();
  }

  function gameOver() {
    state.status = 'over';
    state.endedAt = performance.now();
    state.queue = [];
    if (state.score > state.best) {
      state.best = state.score;
      state.record = true;
      store.set(bestKey(), state.score);
    }
    if (state.won) {
      beep(1320, 0.3);
    } else {
      beep(160, 0.35);
      try { navigator.vibrate && navigator.vibrate(120); } catch { /* nicht unterstützt */ }
    }
    updateHud();
    updateOverlay();
    updateModeButtons();
  }

  // Eine Hauptaktion für Enter, Leertaste, OK-Taste und Overlay-Knopf
  function primary() {
    if (state.status === 'ready' || state.status === 'over') {
      newGame('running');
    } else if (state.status === 'running') {
      state.status = 'paused';
    } else if (state.status === 'paused') {
      state.status = 'running';
    }
    updateOverlay();
    updateModeButtons();
  }

  function turn(dir) {
    // Kurz nach dem Aus nicht sofort neu starten, falls noch eine Taste gedrückt wird
    if (state.status === 'over' && performance.now() - state.endedAt < 700) return;
    if (state.status === 'ready' || state.status === 'over') {
      newGame('running');
      updateOverlay();
      updateModeButtons();
    } else if (state.status === 'paused') {
      state.status = 'running';
      updateOverlay();
    }
    const lastDir = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
    if (dir === lastDir || dir === OPPOSITE[lastDir] || state.queue.length >= 3) return;
    state.queue.push(dir);
  }

  function pause() {
    if (state.status !== 'running') return;
    state.status = 'paused';
    updateOverlay();
  }

  // Anzeige
  function updateHud() {
    scoreEl.textContent = pad4(state.score);
    bestEl.textContent = pad4(Math.max(state.best, state.score));
    levelEl.textContent = 'Stufe ' + level();
    modeEl.textContent = MODE_NAMES[mode];
  }

  function updateOverlay() {
    const s = state.status;
    overlay.hidden = s === 'running';
    if (s === 'ready') {
      overlayTitle.textContent = 'Pixelschlange';
      overlayText.textContent = 'Friss Futter, werde länger und beiß dich nicht selbst. Jedes fünfte Futter lockt einen Käfer mit Extrapunkten.';
      overlayBtn.textContent = 'Spiel starten';
    } else if (s === 'paused') {
      overlayTitle.textContent = 'Pause';
      overlayText.textContent = 'Punkte: ' + state.score + ' · Länge: ' + state.snake.length;
      overlayBtn.textContent = 'Weiter';
    } else if (s === 'over') {
      overlayTitle.textContent = state.won ? 'Feld voll!' : 'Game over';
      overlayText.textContent = '';
      const line = document.createElement('span');
      line.textContent = 'Punkte: ' + state.score + ' · Länge: ' + state.snake.length;
      overlayText.append(line);
      if (state.record) {
        const rec = document.createElement('span');
        rec.className = 'record';
        rec.textContent = 'Neuer Rekord';
        overlayText.append(document.createElement('br'), rec);
      }
      overlayBtn.textContent = 'Nochmal';
    }
  }

  function updateModeButtons() {
    const locked = state.status === 'running' || state.status === 'paused';
    modeBtns.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.mode === mode));
      btn.disabled = locked;
    });
  }

  function updateSoundButton() {
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.textContent = soundOn ? 'Ton: an' : 'Ton: aus';
  }

  // Zeichnen
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = Math.round(canvas.getBoundingClientRect().width * dpr);
    const size = Math.max(COLS * 4, Math.floor(px / COLS) * COLS);
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    render(performance.now());
  }

  function drawSprite(sprite, cx, cy, c) {
    const sub = c / 5;
    for (let r = 0; r < 5; r++) {
      for (let k = 0; k < 5; k++) {
        if (sprite[r][k] === '#') ctx.fillRect(cx * c + k * sub, cy * c + r * sub, Math.ceil(sub), Math.ceil(sub));
      }
    }
  }

  function render(t) {
    const W = canvas.width;
    const c = W / COLS;
    const gap = Math.max(1, Math.round(c * 0.1));

    ctx.fillStyle = colors.lcd;
    ctx.fillRect(0, 0, W, W);

    // Unbeleuchtete LCD-Pixel
    ctx.fillStyle = colors.ink;
    ctx.globalAlpha = 0.07;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) ctx.fillRect(x * c + gap, y * c + gap, c - gap * 2, c - gap * 2);
    }
    ctx.globalAlpha = 1;

    // Kurzes Blinken nach dem Aus
    const dead = state.status === 'over' && !state.won;
    if (!(dead && Math.floor(t / 180) % 2 === 1 && t % 2000 < 1100)) {
      const snake = state.snake;
      for (let i = 0; i < snake.length; i++) {
        const p = snake[i];
        ctx.fillRect(p.x * c + gap, p.y * c + gap, c - gap * 2, c - gap * 2);
        const q = snake[i + 1];
        if (q && Math.abs(p.x - q.x) + Math.abs(p.y - q.y) === 1) {
          const x0 = Math.min(p.x, q.x);
          const y0 = Math.min(p.y, q.y);
          const w = p.x === q.x ? 1 : 2;
          const h = p.y === q.y ? 1 : 2;
          ctx.fillRect(x0 * c + gap, y0 * c + gap, w * c - gap * 2, h * c - gap * 2);
        }
      }
      // Auge
      const head = snake[0];
      const d = DIRS[state.dir];
      const e = Math.max(1, Math.round(c * 0.18));
      const ex = head.x * c + c / 2 + d.x * c * 0.18 - e / 2 + d.y * c * 0.12;
      const ey = head.y * c + c / 2 + d.y * c * 0.18 - e / 2 - d.x * c * 0.12;
      ctx.fillStyle = colors.lcd;
      ctx.fillRect(Math.round(ex), Math.round(ey), e, e);
      ctx.fillStyle = colors.ink;
    }

    if (state.food) drawSprite(FOOD, state.food.x, state.food.y, c);

    if (state.bonus) {
      const blink = state.bonus.ticks < 12 && Math.floor(t / 120) % 2 === 1;
      if (!blink) drawSprite(BUG, state.bonus.x, state.bonus.y, c);
      // Restzeit des Käfers als Balken am unteren Rand
      const frac = state.bonus.ticks / BONUS_TICKS;
      ctx.fillRect(0, W - gap * 2, W * frac, gap * 2);
    }
  }

  // Spielschleife
  let last = 0;
  let acc = 0;
  function frame(t) {
    if (state.status === 'running') {
      if (last) acc = Math.min(acc + (t - last), 500);
      last = t;
      while (state.status === 'running' && acc >= speed()) {
        acc -= speed();
        step();
      }
    } else {
      last = 0;
      acc = 0;
    }
    render(t);
    requestAnimationFrame(frame);
  }

  // Ton
  let audio = null;
  function beep(freq, dur) {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const now = audio.currentTime;
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch { /* kein Audio verfügbar */ }
  }

  // Eingaben
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const dir = KEYS[e.code];
    if (dir) {
      e.preventDefault();
      turn(dir);
      return;
    }
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyP' || e.code === 'Escape') {
      // Knöpfe mit Fokus lösen ihren eigenen Klick aus
      if (e.target instanceof HTMLButtonElement && e.code !== 'KeyP' && e.code !== 'Escape') return;
      e.preventDefault();
      if (e.code === 'Escape') pause();
      else if (!e.repeat) primary();
    }
  });

  let swipe = null;
  boardEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    swipe = { x: e.clientX, y: e.clientY, used: false };
  });
  boardEl.addEventListener('pointermove', (e) => {
    if (!swipe || swipe.used) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    swipe.used = true;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  boardEl.addEventListener('pointerup', () => {
    if (swipe && !swipe.used && (state.status === 'ready' || state.status === 'over')) primary();
    swipe = null;
  });
  boardEl.addEventListener('pointercancel', () => { swipe = null; });

  document.querySelectorAll('.key[data-dir]').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      turn(btn.dataset.dir);
    });
    // Tastatur-Bedienung des Knopfs (pointerdown deckt Maus und Touch ab)
    btn.addEventListener('click', (e) => { if (e.detail === 0) turn(btn.dataset.dir); });
  });

  $('okBtn').addEventListener('click', primary);
  overlayBtn.addEventListener('click', primary);

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled || btn.dataset.mode === mode) return;
      mode = btn.dataset.mode;
      store.set('pixelschlange.mode', mode);
      newGame('ready');
    });
  });

  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    store.set('pixelschlange.sound', soundOn ? 'on' : 'off');
    updateSoundButton();
    beep(660, 0.05);
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);

  newGame('ready');
  updateSoundButton();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  // Offline-Unterstützung nur, wenn die Seite als installierbare App ausgeliefert wird
  if (document.querySelector('link[rel="manifest"]')) {
    try {
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    } catch { /* nicht erlaubt */ }
  }
})();
