/* ================================================================
   PICAZO — script.js  v4.1 (Full Test Mode with Bots)
   Full Feature: Timer, Chat, Canvas, Avatars, Popups & Podium
================================================================ */
'use strict';

/* ════════════════════════════════════════════
   CONSTANTS & DATA
════════════════════════════════════════════ */

let audioCtx = null;
function playTickSound() {
  if (S.isMuted) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

const COLORS = [
  '#000000','#ffffff','#c0c0c0','#808080',
  '#ff0000','#ff6600','#ffcc00','#ffff00',
  '#00cc00','#00ffcc','#0088ff','#0000ff',
  '#8800ff','#ff00ff','#ff6699','#cc3333',
  '#663300','#996600','#003366','#006633',
];

const WORD_BANK = [
  {w:'elephant',e:'🐘'},{w:'pizza',e:'🍕'},{w:'rainbow',e:'🌈'},
  {w:'submarine',e:'🚢'},{w:'telescope',e:'🔭'},{w:'butterfly',e:'🦋'},
  {w:'volcano',e:'🌋'},{w:'astronaut',e:'👨‍🚀'},{w:'octopus',e:'🐙'},
  {w:'lighthouse',e:'🏮'},{w:'dragon',e:'🐉'},{w:'waterfall',e:'💧'},
  {w:'pyramid',e:'🔺'},{w:'spaceship',e:'🚀'},{w:'treasure',e:'💎'},
  {w:'hurricane',e:'🌀'},{w:'keyboard',e:'⌨️'},{w:'guitar',e:'🎸'},
  {w:'sunflower',e:'🌻'},{w:'dinosaur',e:'🦕'},{w:'umbrella',e:'☂️'},
];

/* ════════════════════════════════════════════
   AVATAR DEFINITIONS
════════════════════════════════════════════ */
const AVATAR_DEFS = [
  {name:'Alex',    skin:'#fdd09a',hair:'#3a2010',hCol:'#222',   style:'m-short', accent:'#4a8fe8'},
  {name:'Jamie',   skin:'#f9c49a',hair:'#1a0a0a',hCol:'#111',   style:'f-long',  accent:'#9c5cf8'},
  {name:'Morgan',  skin:'#e8a87c',hair:'#6a3010',hCol:'#4a1a0a',style:'m-beard', accent:'#e87c4a'},
  {name:'Taylor',  skin:'#fdd8b0',hair:'#8b4513',hCol:'#5a2a0a',style:'f-bun',   accent:'#4acf8a'},
  {name:'Jordan',  skin:'#c8884a',hair:'#2a1808',hCol:'#1a0a00',style:'m-spec',  accent:'#f4b942'},
  {name:'Casey',   skin:'#fce0c8',hair:'#d4406a',hCol:'#a82050',style:'f-long',  accent:'#f0527a'},
  {name:'Riley',   skin:'#f0c090',hair:'#4a3020',hCol:'#2a1808',style:'m-short', accent:'#4a7ad8'},
  {name:'Quinn',   skin:'#fdd0a8',hair:'#508860',hCol:'#306040',style:'f-bun',   accent:'#50b8a8'},
];

/* ════════════════════════════════════════════
   GAME STATE
════════════════════════════════════════════ */
let S = {
  avatarIdx: 0,
  playerName: '',
  totalRounds: 3,
  drawTime: 45, // Lowered for faster testing
  maxPlayers: 8,
  hintsCount: 2,
  customWords: [],

  players: [],
  myId: 'me',
  drawerIdx: 0,
  round: 1,
  currentWord: '',
  revealedIdx: [],
  guessedIds: new Set(),
  hintsFired: 0,

  timeLeft: 45,
  timerInterval: null,
  wsTimerInterval: null,

  isDrawing: false,
  tool: 'pencil',
  color: '#000000',
  brushSize: 3,
  strokes: [],
  isDrawer: false,

  isMuted: false,
  ctxTarget: null,
  dpr: window.devicePixelRatio || 1
};

const CIRC = 2 * Math.PI * 25; 

/* ════════════════════════════════════════════
   BOT MANAGER (TESTING MODE)
════════════════════════════════════════════ */
const BotManager = {
  botIntervals: [],
  names: ["Alex", "Jamie", "Taylor"],
  
  initBots: function() {
    for(let i=0; i<3; i++) {
      S.players.push({
        id: 'bot_' + i,
        name: this.names[i] + ' (Bot)',
        avatarDef: AVATAR_DEFS[(i + 3) % AVATAR_DEFS.length],
        score: 0, isSelf: false, guessed: false, isBot: true
      });
    }
  },
  
  stop: function() {
    this.botIntervals.forEach(clearInterval);
    this.botIntervals.forEach(clearTimeout);
    this.botIntervals = [];
  },
  
  startWordSelect: function(choices) {
    this.stop();
    if (!S.isDrawer) {
      // It's a bot's turn to draw. They pick a word in 3 seconds.
      const t = setTimeout(() => {
        chooseWord(choices[Math.floor(Math.random() * choices.length)].w);
      }, 3000);
      this.botIntervals.push(t);
    }
  },
  
  startRound: function() {
    this.stop();
    
    // If bot is drawing, simulate drawing strokes
    if (!S.isDrawer) {
      let angle = 0;
      const drawInt = setInterval(() => {
        if (S.timeLeft <= 0) return;
        const cx = gameCanvas.width / (2 * S.dpr);
        const cy = gameCanvas.height / (2 * S.dpr);
        const r = 30 + Math.random() * 40;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        
        ctx.fillStyle = COLORS[Math.floor(Math.random() * 5 + 4)];
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        angle += 0.8;
      }, 300);
      this.botIntervals.push(drawInt);
    }
    
    // Bots guessing logic
    const guessInt = setInterval(() => {
      if (S.timeLeft <= 0) return;
      
      const nonDrawers = S.players.filter(p => p.id !== S.players[S.drawerIdx].id && !p.guessed);
      if (nonDrawers.length === 0) return;

      const bot = nonDrawers[Math.floor(Math.random() * nonDrawers.length)];
      if (!bot.isBot) return; 
      
      const rand = Math.random();
      if (rand < 0.15 && S.currentWord) {
        // 15% chance Bot guesses correctly
        bot.guessed = true;
        const pts = Math.max(10, Math.round(S.timeLeft / S.drawTime * 100));
        bot.score += pts;
        
        addChat('correct', bot.name, `🎉 Guessed the word!`);
        showToast(`✅ ${bot.name} guessed it!`, 't-correct');
        buildLeaderboard();
        
        const allNon = S.players.filter(p => p.id !== S.players[S.drawerIdx].id);
        if (allNon.every(p => p.guessed)) {
          clearInterval(S.timerInterval);
          setTimeout(() => endRound(true), 800);
        }
      } else if (rand < 0.45) {
        // 30% chance Bot says gibberish
        const gibberish = ["tree", "house", "car", "is it a dog?", "sun", "cloud", "fish", "blue"];
        addChat('normal', bot.name, gibberish[Math.floor(Math.random() * gibberish.length)]);
      }
    }, 1500);
    this.botIntervals.push(guessInt);
  }
};

/* ════════════════════════════════════════════
   AVATAR RENDERER
════════════════════════════════════════════ */
function drawAvatar(canvas, def, size = 96) {
  const c = canvas.getContext('2d');
  const W = size, H = size;
  c.clearRect(0, 0, W, H);

  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, def.accent + '44');
  bg.addColorStop(1, def.accent + '18');
  c.fillStyle = bg;
  c.beginPath();
  if (c.roundRect) { c.roundRect(0, 0, W, H, W * 0.2); }
  else { c.rect(0, 0, W, H); }
  c.fill();

  const cx = W / 2, headR = W * 0.22, headY = H * 0.4;

  c.fillStyle = def.accent;
  c.beginPath();
  c.ellipse(cx, H * 0.88, W * 0.28, H * 0.22, 0, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = def.skin;
  c.fillRect(cx - W * 0.065, headY + headR * 0.8, W * 0.13, H * 0.1);

  drawHairBack(c, def.style, def.hCol, cx, headY, headR, W, H);

  c.fillStyle = def.skin;
  c.beginPath();
  c.ellipse(cx, headY, headR, headR * 1.1, 0, 0, Math.PI * 2);
  c.fill();

  drawHairFront(c, def.style, def.hCol, cx, headY, headR, W, H);

  const eyeY = headY - headR * 0.08, eyeOffX = headR * 0.42;
  [-1,1].forEach(side => {
    c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(cx+side*eyeOffX, eyeY, headR*0.2, headR*0.24, 0, 0, Math.PI*2); c.fill();
    c.fillStyle = def.hCol;
    c.beginPath(); c.arc(cx+side*eyeOffX, eyeY+1, headR*0.13, 0, Math.PI*2); c.fill();
    c.fillStyle = '#000';
    c.beginPath(); c.arc(cx+side*eyeOffX, eyeY+1, headR*0.065, 0, Math.PI*2); c.fill();
  });
}

function drawHairBack(c, style, hCol, cx, headY, headR, W, H) {
  c.fillStyle = hCol;
  if (style === 'f-long') {
    c.beginPath(); c.ellipse(cx, headY+headR*0.6, headR*1.15, headR*1.5, 0, 0, Math.PI*2); c.fill();
  } else if (style === 'f-bun') {
    c.beginPath(); c.ellipse(cx, headY+headR*0.5, headR*1.05, headR*1.2, 0, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(cx, headY-headR*1.05, headR*0.4, 0, Math.PI*2); c.fill();
  }
}

function drawHairFront(c, style, hCol, cx, headY, headR, W, H) {
  c.fillStyle = hCol;
  if (style === 'm-short') {
    c.beginPath(); c.ellipse(cx, headY-headR*0.65, headR*1.0, headR*0.55, 0, Math.PI, Math.PI*2); c.fill();
  } else if (style === 'f-long') {
    c.beginPath(); c.ellipse(cx, headY-headR*0.7, headR*0.95, headR*0.45, 0, Math.PI, Math.PI*2); c.fill();
  } else if (style === 'f-bun') {
    c.beginPath(); c.ellipse(cx, headY-headR*0.72, headR*0.92, headR*0.44, 0, Math.PI, Math.PI*2); c.fill();
  }
}

/* ════════════════════════════════════════════
   DOM REFS
════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

const screenLobby  = $('screen-lobby');
const screenGame   = $('screen-game');
const btnAvPrev    = $('btn-av-prev');
const btnAvNext    = $('btn-av-next');
const avCanvas     = $('av-canvas');
const avFrame      = $('av-frame');
const avDots       = $('av-dots');
const inpName      = $('inp-name');
const btnPlay      = $('btn-play');
const btnPrivate   = $('btn-private');

const timerNum     = $('timer-num');
const tFg          = $('t-fg');
const roundBadge   = $('round-badge');
const wordDisplay  = $('word-display');
const wordMeta     = $('word-meta');
const btnMute      = $('btn-mute');
const muteIcon     = $('mute-icon');

const playerList   = $('player-list');
const chatMessages = $('chat-messages');
const chatInput    = $('chat-input');
const btnChatSend  = $('btn-chat-send');

const gameCanvas   = $('game-canvas');
const canvasWrap   = $('canvas-wrap');
const ctx          = gameCanvas.getContext('2d', { willReadFrequently: true });

const overlayWaiting    = $('overlay-waiting');
const overlayWordSelect = $('overlay-word-select');
const overlayRoundEnd   = $('overlay-round-end');
const wsClock           = $('ws-timer');
const wsTimerBar        = $('ws-timer-bar');
const wsCards           = $('ws-cards');
const btnCopyLink       = $('btn-copy-link');

const reEmoji     = $('re-emoji');
const reTitle     = $('re-title');
const reWordVal   = $('re-word-val');
const reScores    = $('re-scores');
const reCountdown = $('re-countdown');
const reNext      = $('re-next');

const contextMenu = $('context-menu');
const ctxName     = $('ctx-name');
const ctxPts      = $('ctx-pts');
const ctxAv       = $('ctx-av');
const voteBanner  = $('vote-banner');
const eventPopup  = $('event-popup');
const eventPopupIcon = $('event-popup-icon');
const eventPopupMsg  = $('event-popup-msg');

/* ════════════════════════════════════════════
   LOBBY — AVATAR
════════════════════════════════════════════ */
function buildAvDots() {
  avDots.innerHTML = '';
  AVATAR_DEFS.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'av-dot' + (i === S.avatarIdx ? ' active' : '');
    d.addEventListener('click', () => setAvatar(i));
    avDots.appendChild(d);
  });
}

function setAvatar(i) {
  S.avatarIdx = ((i % AVATAR_DEFS.length) + AVATAR_DEFS.length) % AVATAR_DEFS.length;
  avCanvas.width = 96; avCanvas.height = 96;
  drawAvatar(avCanvas, AVATAR_DEFS[S.avatarIdx], 96);
  avDots.querySelectorAll('.av-dot').forEach((d, j) => d.classList.toggle('active', j === S.avatarIdx));
  avFrame.classList.add('glow');
  setTimeout(() => avFrame.classList.remove('glow'), 700);
}

btnAvPrev.addEventListener('click', () => setAvatar(S.avatarIdx - 1));
btnAvNext.addEventListener('click', () => setAvatar(S.avatarIdx + 1));

buildAvDots();
setAvatar(0);

/* ════════════════════════════════════════════
   LOBBY — SETTINGS & PLAY
════════════════════════════════════════════ */
btnPlay.addEventListener('click', () => {
  const name = inpName.value.trim();
  if (!name) {
    inpName.classList.add('shake');
    setTimeout(() => inpName.classList.remove('shake'), 500);
    inpName.focus();
    return;
  }
  
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  S.playerName  = name;
  S.totalRounds = 3;  
  S.drawTime    = 45; // Fast timer for testing
  S.maxPlayers  = 8; 
  S.hintsCount  = 2;
  transitionToGame();
});

btnPrivate.addEventListener('click', () => {
    $('modal-private').classList.remove('hidden');
});
$('btn-cancel-private').addEventListener('click', () => $('modal-private').classList.add('hidden'));

$('btn-start-private').addEventListener('click', () => {
    S.playerName = inpName.value.trim() || 'Host';
    S.totalRounds = +$('priv-rounds').value;
    S.drawTime = +$('priv-time').value;
    $('modal-private').classList.add('hidden');
    transitionToGame();
});

/* ════════════════════════════════════════════
   TRANSITION TO GAME
════════════════════════════════════════════ */
function transitionToGame() {
  screenLobby.style.opacity = '0';
  screenLobby.style.transform = 'scale(1.08)';
  setTimeout(() => {
    screenLobby.classList.remove('active');
    screenLobby.style.display = 'none';
    screenGame.classList.add('active');
    setupMobileLayout();
    initGame();
  }, 420);
}

function setupMobileLayout() {
  const isMobile = window.innerWidth < 768;
  const gameBody = document.querySelector('.game-body');
  const lb    = $('leaderboard-panel');
  const chat  = $('chat-panel');
  let bottomRow = document.querySelector('.bottom-mobile-row');

  if (isMobile) {
    if (!bottomRow) {
      bottomRow = document.createElement('div');
      bottomRow.className = 'bottom-mobile-row';
    }
    if (!bottomRow.contains(lb))   bottomRow.appendChild(lb);
    if (!bottomRow.contains(chat)) bottomRow.appendChild(chat);
    if (!gameBody.contains(bottomRow)) gameBody.appendChild(bottomRow);
  }
  setTimeout(resizeCanvas, 50);
}
window.addEventListener('resize', () => { setupMobileLayout(); resizeCanvas(); });

/* ════════════════════════════════════════════
   GAME INIT
════════════════════════════════════════════ */
function initGame() {
  buildPlayers();
  buildColorPalette();
  setupToolbar();
  setupChat();
  setupMuteBtn();
  initCanvas();

  overlayWaiting.classList.remove('hidden');

  addChat('system', '', '🎨 Welcome to Picazo! Bot Test Mode Activated.');
  addChat('system', '', `You are playing as ${S.playerName}.`);

  S.round = 1;
  S.drawerIdx = 0;
  S.isDrawer = S.players[S.drawerIdx].id === S.myId;
  updateRoundBadge();
  buildLeaderboard();

  setTimeout(() => {
    overlayWaiting.classList.add('hidden');
    showEventPopup('🎮', 'Game started with Bots!');
    startWordSelection();
  }, 2000);
}

function buildPlayers() {
  S.players = [{
    id: S.myId, name: S.playerName,
    avatarDef: AVATAR_DEFS[S.avatarIdx],
    score: 0, isSelf: true, guessed: false
  }];
  BotManager.initBots();
  S.drawerIdx = 0;
}

function buildLeaderboard() {
  const sorted = [...S.players].sort((a, b) => b.score - a.score);
  playerList.innerHTML = '';
  sorted.forEach((p, rank) => {
    const li = document.createElement('li');
    const isDrawer = p.id === S.players[S.drawerIdx]?.id;
    li.className = 'player-item' + (isDrawer ? ' is-drawing' : '') + (p.guessed ? ' guessed' : '');

    const rankSymbol = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : (rank + 1);
    const rankClass  = rank === 0 ? 'gold' : rank === 1 ? 'silver' : rank === 2 ? 'bronze' : '';

    const avWrap = document.createElement('div');
    avWrap.className = 'pi-av';
    const avC = document.createElement('canvas');
    avC.width = 30; avC.height = 30;
    drawAvatar(avC, p.avatarDef, 30);
    avWrap.appendChild(avC);

    li.innerHTML = `<div class="pi-rank ${rankClass}">${rankSymbol}</div>`;
    li.appendChild(avWrap);
    li.insertAdjacentHTML('beforeend', `
      <div class="pi-info">
        <div class="pi-name">${p.isSelf ? '⭐ ' : ''}${escHtml(p.name)}</div>
        <div class="pi-score">${p.score} pts</div>
      </div>
    `);
    if (isDrawer) li.insertAdjacentHTML('beforeend', `<span class="pi-badge">✏️</span>`);
    else if (p.guessed) li.insertAdjacentHTML('beforeend', `<span class="pi-badge">✅</span>`);

    playerList.appendChild(li);
  });
}

function updateRoundBadge() {
  roundBadge.textContent = `Round ${S.round}/${S.totalRounds}`;
}

/* ════════════════════════════════════════════
   WORD SELECTION & ROUND LOGIC
════════════════════════════════════════════ */
function startWordSelection() {
  S.players.forEach(p => { p.guessed = false; });
  S.guessedIds.clear();
  buildLeaderboard();

  overlayWordSelect.classList.remove('hidden');
  const choices = shuffled(WORD_BANK).slice(0, 3);
  wsCards.innerHTML = '';
  choices.forEach(w => {
    const card = document.createElement('div');
    card.className = 'ws-card';
    card.innerHTML = `
      <span class="ws-emoji">${w.e}</span>
      <div class="ws-word">${S.isDrawer ? w.w : '???'}</div>
      <div class="ws-len">${w.w.length} letters</div>
    `;
    if (S.isDrawer) card.addEventListener('click', () => chooseWord(w.w));
    wsCards.appendChild(card);
  });

  let t = 15;
  wsClock.textContent = t;
  wsTimerBar.style.transition = 'none';
  wsTimerBar.style.width = '100%';

  clearInterval(S.wsTimerInterval);
  S.wsTimerInterval = setInterval(() => {
    t--;
    wsClock.textContent = t;
    wsTimerBar.style.transition = 'width 1s linear';
    wsTimerBar.style.width = (t / 15 * 100) + '%';
    if (t <= 0) { clearInterval(S.wsTimerInterval); chooseWord(choices[0].w); }
  }, 1000);

  BotManager.startWordSelect(choices);
}

function chooseWord(word) {
  clearInterval(S.wsTimerInterval);
  overlayWordSelect.classList.add('hidden');
  S.currentWord = word;
  S.revealedIdx = [];
  renderWordBlanks();
  startRoundTimer();
  addChat('system', '', `${S.players[S.drawerIdx].name} is now drawing! 🖊️`);

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  
  BotManager.startRound();
}

function renderWordBlanks() {
  wordDisplay.innerHTML = '';
  if (!S.currentWord) return;

  for (let i = 0; i < S.currentWord.length; i++) {
    const ch = S.currentWord[i];
    const grp = document.createElement('div');
    grp.className = 'wb-group';
    const charEl = document.createElement('div');
    charEl.className = 'wb-char';
    charEl.textContent = S.isDrawer ? ch.toUpperCase() : '';
    grp.appendChild(charEl);
    grp.insertAdjacentHTML('beforeend', `<div class="wb-line" style="width:20px"></div>`);
    wordDisplay.appendChild(grp);
  }
}

function startRoundTimer() {
  S.timeLeft = S.drawTime;
  clearInterval(S.timerInterval);
  updateTimerUI();

  S.timerInterval = setInterval(() => {
    S.timeLeft--;
    if (S.timeLeft <= 15 && S.timeLeft > 0) playTickSound();
    updateTimerUI();
    if (S.timeLeft <= 0) {
      clearInterval(S.timerInterval);
      endRound(false);
    }
  }, 1000);
}

function updateTimerUI() {
  timerNum.textContent = S.timeLeft;
  const progress = S.timeLeft / S.drawTime;
  tFg.style.strokeDashoffset = String(CIRC * (1 - progress));
  const warn = S.timeLeft <= 15;
  timerNum.className = 'timer-num' + (warn ? ' warn' : '');
  tFg.className = 't-fg' + (warn ? ' warn' : '');
}

function endRound(allGuessed = false) {
  clearInterval(S.timerInterval);
  BotManager.stop();
  
  addChat('system', '', `⏰ Round over! The word was: "${S.currentWord}"`);
  
  if (S.guessedIds.size > 0) {
    const bonus = Math.min(S.guessedIds.size * 30, 150);
    const drawer = S.players[S.drawerIdx];
    if (drawer) drawer.score += bonus;
  }

  const sorted = [...S.players].sort((a, b) => b.score - a.score);
  reEmoji.textContent = allGuessed ? '🎉' : '⏰';
  reTitle.textContent = allGuessed ? 'Everyone guessed it!' : 'Round Over!';
  reWordVal.textContent = S.currentWord;
  reScores.innerHTML = sorted.map((p, i) =>
    `<div class="re-score-row" style="animation-delay:${i*0.07}s">
       <span class="re-score-name">${i===0?'🥇':i===1?'🥈':i===2?'🥉':''} ${escHtml(p.name)}</span>
       <span class="re-score-pts">${p.score} pts</span>
     </div>`
  ).join('');

  overlayRoundEnd.classList.remove('hidden');

  let cd = 5;
  reCountdown.textContent = cd;

  const cdInt = setInterval(() => {
    cd--;
    reCountdown.textContent = cd;
    if (cd <= 0) {
      clearInterval(cdInt);
      overlayRoundEnd.classList.add('hidden');
      nextRound();
    }
  }, 1000);
}

function nextRound() {
  S.round++;
  if (S.round > S.totalRounds) { endGame(); return; }

  S.drawerIdx = (S.drawerIdx + 1) % S.players.length;
  S.isDrawer  = S.players[S.drawerIdx].id === S.myId;
  updateRoundBadge();
  S.currentWord = '';
  buildLeaderboard();
  addChat('system', '', `🔄 Round ${S.round} — ${S.players[S.drawerIdx].name} draws!`);
  startWordSelection();
}

function endGame() {
  clearInterval(S.timerInterval);
  BotManager.stop();
  const winner = [...S.players].sort((a, b) => b.score - a.score)[0];
  
  overlayRoundEnd.classList.remove('hidden');
  reEmoji.textContent = '🏆';
  reTitle.textContent = 'Game Over!';
  reWordVal.textContent = winner.name + ' wins!';
  reNext.style.display = 'none';
  reScores.innerHTML = [...S.players].sort((a, b) => b.score - a.score).map((p, i) =>
    `<div class="re-score-row"><span class="re-score-name">${i===0?'🥇':i===1?'🥈':i===2?'🥉':''} ${escHtml(p.name)}</span><span class="re-score-pts">${p.score} pts</span></div>`
  ).join('');
}


/* ════════════════════════════════════════════
   CANVAS DRAWING 
════════════════════════════════════════════ */
function initCanvas() {
  resizeCanvas();
  gameCanvas.addEventListener('pointerdown',   onPointerDown);
  gameCanvas.addEventListener('pointermove',   onPointerMove);
  gameCanvas.addEventListener('pointerup',     onPointerUp);
  gameCanvas.addEventListener('pointercancel', onPointerUp);
}

function resizeCanvas() {
  const rect = canvasWrap.getBoundingClientRect();
  const W = Math.floor(rect.width), H = Math.floor(rect.height);
  if (W === 0 || H === 0) return;

  S.dpr = window.devicePixelRatio || 1;
  gameCanvas.width  = W * S.dpr;
  gameCanvas.height = H * S.dpr;
  gameCanvas.style.width  = W + 'px';
  gameCanvas.style.height = H + 'px';

  ctx.scale(S.dpr, S.dpr);
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, W, H);
}

function getPointerXY(e) {
  const r = gameCanvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function onPointerDown(e) {
  if (!S.isDrawer) return;
  gameCanvas.setPointerCapture(e.pointerId);
  S.isDrawing = true;
  const pos = getPointerXY(e);
  
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.strokeStyle = S.tool === 'eraser' ? '#ffffff' : S.color;
  ctx.lineWidth = S.brushSize;
}

function onPointerMove(e) {
  if (!S.isDrawer || !S.isDrawing) return;
  const pos = getPointerXY(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function onPointerUp(e) {
  if (!S.isDrawer) return;
  gameCanvas.releasePointerCapture(e.pointerId);
  S.isDrawing = false;
}

/* ════════════════════════════════════════════
   TOOLBAR SETUP
════════════════════════════════════════════ */
function setupToolbar() {
  ['pencil','eraser'].forEach(t => {
    $('tool-' + t).addEventListener('click', () => selectTool(t));
  });

  $('tool-clear').addEventListener('click', () => {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, gameCanvas.width / S.dpr, gameCanvas.height / S.dpr);
  });

  const sizeSlider = $('size-slider');
  sizeSlider.addEventListener('input', e => {
    S.brushSize = +e.target.value;
    $('size-val-txt').textContent = S.brushSize + 'px';
  });

  $('btn-color-popup').addEventListener('click', e => $('popup-color').classList.toggle('hidden'));
  $('btn-size-popup').addEventListener('click', e => $('popup-size').classList.toggle('hidden'));
}

function buildColorPalette() {
  $('color-palette').innerHTML = COLORS.map(hex =>
    `<div class="c-swatch ${hex===S.color?'active':''}" style="background:${hex}" onclick="pickColor('${hex}')"></div>`
  ).join('');
}

function pickColor(hex) {
  S.color = hex;
  $('color-indicator').style.background = hex;
  if (S.tool === 'eraser') selectTool('pencil');
}

function selectTool(tool) {
  S.tool = tool;
  gameCanvas.className = tool === 'eraser' ? 'eraser' : '';
}

/* ════════════════════════════════════════════
   CHAT
════════════════════════════════════════════ */
function setupChat() {
  btnChatSend.addEventListener('click', sendGuess);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendGuess(); } });
}

function sendGuess() {
  const val = chatInput.value.trim();
  if (!val) return;
  chatInput.value = '';

  if (S.isDrawer || S.guessedIds.has(S.myId)) {
    addChat('normal', S.playerName, val);
    return;
  }

  const guess = val.toLowerCase().trim();
  const word  = (S.currentWord || '').toLowerCase().trim();

  if (word && guess === word) {
    const pts = Math.max(10, Math.round(S.timeLeft / S.drawTime * 100));
    const me  = S.players.find(p => p.isSelf);
    if (me) { me.score += pts; me.guessed = true; }
    S.guessedIds.add(S.myId);
    addChat('correct', S.playerName, `🎉 Guessed the word! (+${pts} pts)`);
    showToast(`✅ You guessed it!`, 't-correct');
    buildLeaderboard();

    const nonDrawers = S.players.filter(p => p.id !== S.players[S.drawerIdx]?.id);
    if (nonDrawers.every(p => p.guessed)) {
      clearInterval(S.timerInterval);
      setTimeout(() => endRound(true), 800);
    }
  } else {
    addChat('normal', S.playerName, val);
  }
}

function addChat(type, name, text) {
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (type === 'correct' ? 'correct' : type === 'system' ? 'system' : 'normal');
  div.innerHTML = type === 'system' 
    ? `<span class="msg-text">${escHtml(text)}</span>` 
    : `<span class="msg-name">${escHtml(name)}:</span> <span class="msg-text">${escHtml(text)}</span>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* ════════════════════════════════════════════
   MUTE & UTILS
════════════════════════════════════════════ */
function setupMuteBtn() {
  btnMute.addEventListener('click', () => {
    S.isMuted = !S.isMuted;
    muteIcon.innerHTML = S.isMuted
      ? `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`
      : `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
  });
}

function showEventPopup(icon, msg) {
  eventPopupIcon.textContent = icon;
  eventPopupMsg.textContent  = msg;
  eventPopup.classList.remove('hidden');
  setTimeout(() => eventPopup.classList.add('hidden'), 2800);
}

function showToast(msg, type = 't-info') {
  const tc = $('toast-container');
  const t  = document.createElement('div');
  t.className  = 'toast ' + type;
  t.textContent = msg;
  tc.prepend(t);
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 380); }, 3800);
}

function shuffled(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

