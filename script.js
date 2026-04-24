/* ================================================================
   PICAZO — script.js  v5.4 (Edge-to-Edge Canvas Fix)
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
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

const COLORS = [
  '#000000','#ffffff','#c0c0c0','#808080','#ff0000','#ff6600','#ffcc00','#ffff00',
  '#00cc00','#00ffcc','#0088ff','#0000ff','#8800ff','#ff00ff','#ff6699','#cc3333',
  '#663300','#996600','#003366','#006633',
];

const WORD_BANK = [
  {w:'elephant',e:'🐘'},{w:'pizza',e:'🍕'},{w:'rainbow',e:'🌈'},{w:'submarine',e:'🚢'},
  {w:'telescope',e:'🔭'},{w:'butterfly',e:'🦋'},{w:'volcano',e:'🌋'},{w:'astronaut',e:'👨‍🚀'},
  {w:'octopus',e:'🐙'},{w:'lighthouse',e:'🏮'},{w:'hurricane',e:'🌀'},{w:'keyboard',e:'⌨️'}
];

const PREMIUM_AVATARS = [
  "https://api.dicebear.com/7.x/micah/svg?seed=Liam&backgroundColor=b6e3f4",     
  "https://api.dicebear.com/7.x/micah/svg?seed=Olivia&backgroundColor=ffd5dc",   
  "https://api.dicebear.com/7.x/micah/svg?seed=Noah&backgroundColor=d1d4f9",     
  "https://api.dicebear.com/7.x/micah/svg?seed=Emma&backgroundColor=ffdfbf",     
  "https://api.dicebear.com/7.x/micah/svg?seed=Oliver&backgroundColor=c0aede",   
  "https://api.dicebear.com/7.x/micah/svg?seed=Ava&backgroundColor=b4e4c4",      
  "https://api.dicebear.com/7.x/lorelei/svg?seed=James&backgroundColor=ffdfbf",  
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Isabella&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=William&backgroundColor=b4e4c4",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Mia&backgroundColor=ffd5dc",    
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Benjamin&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Amelia&backgroundColor=c0aede", 
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Lucas&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Harper&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Henry&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Evelyn&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Alexander&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Abigail&backgroundColor=b4e4c4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel&backgroundColor=b4e4c4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Matthew&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Elizabeth&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jackson&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=ffd5dc" 
];

let S = {
  avatarIdx: 0, playerName: '', totalRounds: 3, drawTime: 45, maxPlayers: 8, hintsCount: 2, customWords: [],
  players: [], myId: 'me', drawerIdx: 0, round: 1, currentWord: '', revealedIdx: [], guessedIds: new Set(), hintsFired: 0,
  timeLeft: 45, timerInterval: null, wsTimerInterval: null,
  isDrawing: false, tool: 'pencil', color: '#000000', brushSize: 3, strokes: [], isDrawer: false,
  isMuted: false, ctxTarget: null, dpr: window.devicePixelRatio || 1, history: []
};
const CIRC = 2 * Math.PI * 25; 

/* ════════════════════════════════════════════
   DOM REFS & INITIALIZATION
════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const screenLobby = $('screen-lobby'), screenGame = $('screen-game');
const timerNum = $('timer-num'), tFg = $('t-fg'), roundBadge = $('round-badge'), wordDisplay = $('word-display'), wordMeta = $('word-meta');
const playerList = $('player-list'), chatMessages = $('chat-messages'), chatInput = $('chat-input'), btnChatSend = $('btn-chat-send');
const gameCanvas = $('game-canvas'), canvasWrap = $('canvas-wrap'), ctx = gameCanvas.getContext('2d', { willReadFrequently: true });
const overlayWordSelect = $('overlay-word-select'), overlayRoundEnd = $('overlay-round-end'), wsCards = $('ws-cards');
const contextMenu = $('context-menu'), ctxName = $('ctx-name'), ctxPts = $('ctx-pts'), ctxAv = $('ctx-av');
const avImg = $('av-img'); 

document.addEventListener('DOMContentLoaded', () => {
  const overlays = ['overlay-waiting', 'overlay-word-select', 'overlay-round-end'];
  overlays.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      document.body.appendChild(el);
      el.style.position = 'fixed';
      el.style.zIndex = '9999';
      el.style.borderRadius = '0';
      el.style.height = '100dvh';
      el.style.width = '100vw';
      el.style.top = '0';
      el.style.left = '0';
    }
  });
  setupMobileLayout();
});

/* ════════════════════════════════════════════
   BOT MANAGER
════════════════════════════════════════════ */
const BotManager = {
  botIntervals: [], names: ["Alex", "Jamie", "Taylor"],
  initBots: function() {
    for(let i=0; i<3; i++) {
      S.players.push({ 
        id: 'bot_'+i, 
        name: this.names[i] + ' (Bot)', 
        avatarDef: PREMIUM_AVATARS[(i+5)%PREMIUM_AVATARS.length], 
        score: 0, isSelf: false, guessed: false, isBot: true 
      });
    }
  },
  stop: function() { this.botIntervals.forEach(clearInterval); this.botIntervals.forEach(clearTimeout); this.botIntervals = []; },
  startWordSelect: function(choices) {
    this.stop();
    if (!S.isDrawer) {
      const t = setTimeout(() => { chooseWord(choices[Math.floor(Math.random() * choices.length)].w); }, 3000);
      this.botIntervals.push(t);
    }
  },
  startRound: function() {
    this.stop();
    if (!S.isDrawer) {
      let angle = 0;
      const drawInt = setInterval(() => {
        if (S.timeLeft <= 0) return;
        const cx = gameCanvas.width / (2 * S.dpr), cy = gameCanvas.height / (2 * S.dpr), r = 30 + Math.random() * 40;
        const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
        ctx.fillStyle = COLORS[Math.floor(Math.random() * 5 + 4)];
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        angle += 0.8;
      }, 300);
      this.botIntervals.push(drawInt);
    }
    const guessInt = setInterval(() => {
      if (S.timeLeft <= 0) return;
      const nonDrawers = S.players.filter(p => p.id !== S.players[S.drawerIdx].id && !p.guessed);
      if (nonDrawers.length === 0) return;
      const bot = nonDrawers[Math.floor(Math.random() * nonDrawers.length)];
      if (!bot.isBot) return; 
      
      const rand = Math.random();
      if (rand < 0.15 && S.currentWord) {
        bot.guessed = true;
        const pts = Math.max(10, Math.round(S.timeLeft / S.drawTime * 100));
        bot.score += pts;
        addChat('correct', bot.name, `🎉 Guessed the word!`);
        showToast(`✅ ${bot.name} guessed it!`, 't-correct');
        buildLeaderboard();
        
        const allNon = S.players.filter(p => p.id !== S.players[S.drawerIdx].id);
        if (allNon.every(p => p.guessed)) { clearInterval(S.timerInterval); setTimeout(() => endRound(true), 800); }
      } else if (rand < 0.40) {
        const gibberish = ["tree", "house", "car", "dog?", "sun", "cloud", "is it a bird?"];
        addChat('normal', bot.name, gibberish[Math.floor(Math.random() * gibberish.length)]);
      }
    }, 1800);
    this.botIntervals.push(guessInt);
  }
};

/* ════════════════════════════════════════════
   LOBBY & PRIVATE ROOM
════════════════════════════════════════════ */
function setAvatar(i) {
  S.avatarIdx = ((i % PREMIUM_AVATARS.length) + PREMIUM_AVATARS.length) % PREMIUM_AVATARS.length;
  if(avImg) avImg.src = PREMIUM_AVATARS[S.avatarIdx];
  $('av-dots').innerHTML = '';
  PREMIUM_AVATARS.forEach((_, j) => {
    const d = document.createElement('button'); d.className = 'av-dot' + (j === S.avatarIdx ? ' active' : '');
    d.addEventListener('click', () => setAvatar(j)); $('av-dots').appendChild(d);
  });
}
$('btn-av-prev').addEventListener('click', () => setAvatar(S.avatarIdx - 1));
$('btn-av-next').addEventListener('click', () => setAvatar(S.avatarIdx + 1));
setAvatar(0);

$('btn-play').addEventListener('click', () => {
  const name = $('inp-name').value.trim();
  if (!name) { $('inp-name').classList.add('shake'); setTimeout(() => $('inp-name').classList.remove('shake'), 500); return; }
  S.playerName = name; S.totalRounds = 3; S.drawTime = 45; 
  transitionToGame();
});

$('btn-private').addEventListener('click', () => $('modal-private').classList.remove('hidden'));
$('btn-cancel-private').addEventListener('click', () => { $('modal-private').classList.add('hidden'); $('priv-invite-box').classList.add('hidden'); });

$('btn-start-private').addEventListener('click', () => {
  S.playerName = $('inp-name').value.trim() || 'Host';
  S.totalRounds = +$('priv-rounds').value;
  S.drawTime = +$('priv-time').value;
  const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
  $('priv-link-txt').textContent = `https://picazo.game/r/${roomCode}`;
  $('priv-invite-box').classList.remove('hidden');
});

$('btn-copy-priv').addEventListener('click', () => {
  navigator.clipboard.writeText($('priv-link-txt').textContent).catch(()=>{});
  $('btn-copy-priv').textContent = '✓ Copied!';
  setTimeout(() => {
    $('modal-private').classList.add('hidden');
    $('priv-invite-box').classList.add('hidden');
    $('btn-copy-priv').textContent = 'Copy';
    transitionToGame();
  }, 1200);
});

function transitionToGame() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  screenLobby.style.opacity = '0'; screenLobby.style.transform = 'scale(1.08)';
  setTimeout(() => { screenLobby.classList.remove('active'); screenLobby.style.display = 'none'; screenGame.classList.add('active'); setupMobileLayout(); initGame(); }, 420);
}

/* ════════════════════════════════════════════
   MOBILE LAYOUT (WITH GLOBAL PILL INPUT)
════════════════════════════════════════════ */
function setupMobileLayout() {
  const isMobile = window.innerWidth < 768;
  const gameBody = document.querySelector('.game-body');
  const lb = $('leaderboard-panel');
  const chat = $('chat-panel');
  const canvasCol = document.querySelector('.canvas-col');
  const chatForm = document.querySelector('.chat-form');
  let bottomRow = document.querySelector('.bottom-mobile-row');

  if (isMobile) {
    if (!bottomRow) {
      bottomRow = document.createElement('div');
      bottomRow.className = 'bottom-mobile-row';
      gameBody.appendChild(bottomRow);
    }
    if (!bottomRow.contains(lb)) bottomRow.appendChild(lb);
    if (!bottomRow.contains(chat)) bottomRow.appendChild(chat);

    if (canvasCol && gameBody.firstChild !== canvasCol) {
      gameBody.insertBefore(canvasCol, gameBody.firstChild);
    }
    if (chatForm && chatForm.parentNode !== gameBody) {
      gameBody.appendChild(chatForm);
    }
  } else {
    if (lb && lb.parentNode !== gameBody) gameBody.appendChild(lb);
    if (canvasCol && canvasCol.parentNode !== gameBody) gameBody.appendChild(canvasCol);
    if (chat && chat.parentNode !== gameBody) gameBody.appendChild(chat);

    gameBody.appendChild(lb);
    gameBody.appendChild(canvasCol);
    gameBody.appendChild(chat);

    if (bottomRow) bottomRow.remove();

    if (chatForm && chatForm.parentNode !== chat) {
      chat.appendChild(chatForm);
    }
  }
  setTimeout(resizeCanvas, 50);
}
window.addEventListener('resize', () => { setupMobileLayout(); resizeCanvas(); });

/* ════════════════════════════════════════════
   GAME INIT & LEADERBOARD 
════════════════════════════════════════════ */
function initGame() {
  S.players = [{ id: S.myId, name: S.playerName, avatarDef: PREMIUM_AVATARS[S.avatarIdx], score: 0, isSelf: true, guessed: false }];
  BotManager.initBots(); S.drawerIdx = 0;
  setupToolbar(); setupChat(); setupContextMenu();
  initCanvas();
  
  timerNum.textContent = S.drawTime; 
  tFg.style.strokeDashoffset = '0';
  tFg.setAttribute('class', 't-fg');
  timerNum.className = 'timer-num';

  $('overlay-waiting').classList.remove('hidden');
  addChat('system', '', '🎨 Bot Test Mode Activated.');
  S.round = 1; S.drawerIdx = 0; S.isDrawer = S.players[S.drawerIdx].id === S.myId;
  roundBadge.textContent = `Round ${S.round}/${S.totalRounds}`;
  buildLeaderboard();
  
  setTimeout(() => { $('overlay-waiting').classList.add('hidden'); showEventPopup('🎮', 'Game started!'); startWordSelection(); }, 2000);
}

function buildLeaderboard() {
  const sorted = [...S.players].sort((a, b) => b.score - a.score);
  playerList.innerHTML = '';
  sorted.forEach((p, rank) => {
    const li = document.createElement('li');
    const isDrawer = p.id === S.players[S.drawerIdx]?.id;
    li.className = 'player-item' + (isDrawer ? ' is-drawing' : '') + (p.guessed ? ' guessed' : '');
    const rankClass = rank === 0 ? 'gold' : rank === 1 ? 'silver' : rank === 2 ? 'bronze' : '';
    
    const avWrap = document.createElement('div'); 
    avWrap.className = 'pi-av';
    const avImgList = document.createElement('img');
    avImgList.src = p.avatarDef;
    avImgList.style.width = '100%'; 
    avImgList.style.height = '100%'; 
    avImgList.style.objectFit = 'cover';
    avWrap.appendChild(avImgList);
    
    li.innerHTML = `<div class="pi-rank ${rankClass}">${rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : (rank + 1)}</div>`;
    li.appendChild(avWrap);
    li.insertAdjacentHTML('beforeend', `<div class="pi-info"><div class="pi-name">${p.isSelf ? '⭐ ' : ''}${escHtml(p.name)}</div><div class="pi-score">${p.score} pts</div></div>`);
    if (isDrawer) li.insertAdjacentHTML('beforeend', `<span class="pi-badge">✏️</span>`); else if (p.guessed) li.insertAdjacentHTML('beforeend', `<span class="pi-badge">✅</span>`);
    
    if (!p.isSelf) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', e => openContextMenu(e, p));
    }
    playerList.appendChild(li);
  });
}

/* ════════════════════════════════════════════
   TIMER & WORDS
════════════════════════════════════════════ */
function startRoundTimer() {
  S.timeLeft = S.drawTime; clearInterval(S.timerInterval); updateTimerUI();
  S.timerInterval = setInterval(() => {
    S.timeLeft--;
    if (S.timeLeft <= 30 && S.timeLeft > 0 && S.timeLeft % 10 === 0) revealHintLetter();
    if (S.timeLeft <= 15 && S.timeLeft > 0) playTickSound();
    updateTimerUI();
    if (S.timeLeft <= 0) { clearInterval(S.timerInterval); endRound(false); }
  }, 1000);
}

function updateTimerUI() {
  timerNum.textContent = S.timeLeft;
  const progress = S.timeLeft / S.drawTime;
  tFg.style.strokeDashoffset = String(CIRC * (1 - progress));
  const warn = S.timeLeft <= 15;
  timerNum.className = 'timer-num' + (warn ? ' warn' : '');
  tFg.setAttribute('class', 't-fg' + (warn ? ' warn' : '')); 
}

function startWordSelection() {
  S.players.forEach(p => { p.guessed = false; }); S.guessedIds.clear(); S.hintsFired = 0; buildLeaderboard();
  overlayWordSelect.classList.remove('hidden');
  const choices = shuffled(WORD_BANK).slice(0, 3);
  
  const headerH2 = document.querySelector('.ws-header h2');
  const headerP = document.querySelector('.ws-header p');
  
  if (S.isDrawer) {
    $('toolbar').style.pointerEvents = 'auto';
    $('toolbar').style.opacity = '1';
    wsCards.style.display = 'flex';
    headerH2.textContent = 'Choose a Word';
    headerP.innerHTML = `Pick one to draw! Time left: <span id="ws-timer" class="ws-clock">15</span>s`;
    
    wsCards.innerHTML = '';
    choices.forEach(w => {
      const card = document.createElement('div'); card.className = 'ws-card';
      card.innerHTML = `<span class="ws-emoji">${w.e}</span><div class="ws-word">${w.w}</div><div class="ws-len">${w.w.length} letters</div>`;
      card.addEventListener('click', () => chooseWord(w.w));
      wsCards.appendChild(card);
    });
  } else {
    $('toolbar').style.pointerEvents = 'none';
    $('toolbar').style.opacity = '0.4';
    wsCards.style.display = 'none';
    headerH2.textContent = 'Waiting...';
    headerP.innerHTML = `${S.players[S.drawerIdx].name} is picking a word... <span id="ws-timer" class="ws-clock">15</span>s`;
  }

  let t = 15; 
  if($('ws-timer')) $('ws-timer').textContent = t; 
  $('ws-timer-bar').style.transition = 'none'; $('ws-timer-bar').style.width = '100%';
  clearInterval(S.wsTimerInterval);
  
  S.wsTimerInterval = setInterval(() => {
    t--; 
    if($('ws-timer')) $('ws-timer').textContent = t; 
    $('ws-timer-bar').style.transition = 'width 1s linear'; $('ws-timer-bar').style.width = (t/15*100)+'%';
    if (t <= 0) { clearInterval(S.wsTimerInterval); chooseWord(choices[0].w); }
  }, 1000);
  BotManager.startWordSelect(choices);
}

function chooseWord(word) {
  clearInterval(S.wsTimerInterval); overlayWordSelect.classList.add('hidden');
  S.currentWord = word; S.revealedIdx = []; renderWordBlanks(); startRoundTimer();
  addChat('system', '', `${S.players[S.drawerIdx].name} is drawing! 🖊️`);
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  S.history = []; 
  BotManager.startRound();
}

function renderWordBlanks() {
  wordDisplay.innerHTML = ''; 
  if (!S.currentWord) { wordMeta.textContent = ''; return; }
  
  wordMeta.textContent = S.isDrawer ? `You are drawing — ${S.currentWord.length} letters` : `${S.currentWord.length} letters`;

  for (let i = 0; i < S.currentWord.length; i++) {
    const ch = S.currentWord[i], grp = document.createElement('div'), charEl = document.createElement('div');
    grp.className = 'wb-group'; 
    const revealed = S.revealedIdx.includes(i);
    charEl.className = 'wb-char' + (revealed && !S.isDrawer ? ' reveal' : '');
    charEl.textContent = S.isDrawer || revealed ? ch.toUpperCase() : '';
    grp.appendChild(charEl); grp.insertAdjacentHTML('beforeend', `<div class="wb-line" style="width:20px"></div>`);
    wordDisplay.appendChild(grp);
  }
}

function revealHintLetter() {
  if (S.hintsFired >= S.hintsCount) return;
  const unrevealed = S.currentWord.split('').map((_,i) => i).filter(i => !S.revealedIdx.includes(i));
  if (unrevealed.length <= 1) return;
  S.revealedIdx.push(unrevealed[Math.floor(Math.random() * unrevealed.length)]);
  S.hintsFired++; renderWordBlanks();
  showToast('💡 Hint letter revealed!', 't-info');
}

function endRound(allGuessed = false) {
  clearInterval(S.timerInterval); BotManager.stop();
  addChat('system', '', `⏰ Round over! Word was: "${S.currentWord}"`);
  
  const oldBtnWrap = document.getElementById('podium-btns');
  if (oldBtnWrap) oldBtnWrap.style.display = 'none';
  
  if (S.guessedIds.size > 0 && S.players[S.drawerIdx]) {
    const bonus = Math.min(S.guessedIds.size * 30, 150);
    S.players[S.drawerIdx].score += bonus;
    addChat('system', '', `🎨 ${S.players[S.drawerIdx].name} got +${bonus} bonus points!`);
  }

  const sorted = [...S.players].sort((a, b) => b.score - a.score);
  $('re-emoji').textContent = allGuessed ? '🎉' : '⏰'; 
  $('re-title').textContent = allGuessed ? 'Everyone guessed!' : 'Round Over!'; 
  
  const reWordP = document.getElementById('re-word');
  if(reWordP) reWordP.innerHTML = `The word was: <strong>${S.currentWord}</strong>`;

  $('re-scores').innerHTML = sorted.map((p, i) => `<div class="re-score-row" style="animation-delay:${i*0.07}s"><span class="re-score-name">${i===0?'🥇':i===1?'🥈':i===2?'🥉':''} ${escHtml(p.name)}</span><span class="re-score-pts">${p.score} pts</span></div>`).join('');
  
  overlayRoundEnd.classList.remove('hidden');

  const isLastTurn = S.round >= S.totalRounds;
  $('re-next').style.display = '';
  $('re-next').innerHTML = isLastTurn 
    ? `Game Over in <span id="re-countdown">4</span>s...` 
    : `Next round in <span id="re-countdown">4</span>s...`;
  
  let cd = 4; 
  const cdInt = setInterval(() => { 
    cd--; 
    const cdSpan = $('re-countdown');
    if (cdSpan) cdSpan.textContent = cd; 
    
    if (cd <= 0) { 
      clearInterval(cdInt); 
      if (isLastTurn) {
        endGame();
      } else {
        overlayRoundEnd.classList.add('hidden'); 
        nextRound(); 
      }
    } 
  }, 1000);
}

function nextRound() {
  S.round++; 
  S.drawerIdx = (S.drawerIdx + 1) % S.players.length; S.isDrawer = S.players[S.drawerIdx].id === S.myId;
  roundBadge.textContent = `Round ${S.round}/${S.totalRounds}`; S.currentWord = ''; buildLeaderboard();
  addChat('system', '', `🔄 Round ${S.round} — ${S.players[S.drawerIdx].name} draws!`); startWordSelection();
}

/* ════════════════════════════════════════════
   END GAME & LIQUID BUTTON INJECTION
════════════════════════════════════════════ */
function endGame() {
  clearInterval(S.timerInterval); BotManager.stop();
  const winner = [...S.players].sort((a, b) => b.score - a.score)[0];
  
  overlayRoundEnd.classList.remove('hidden'); 
  $('re-emoji').textContent = '🏆'; 
  $('re-title').textContent = 'Game Over!'; 
  
  const reWordP = document.getElementById('re-word');
  if(reWordP) reWordP.innerHTML = `Winner: <strong>${escHtml(winner.name)}</strong>`;
  
  $('re-next').style.display = 'none';
  $('re-scores').innerHTML = [...S.players].sort((a, b) => b.score - a.score).map((p, i) => `<div class="re-score-row"><span class="re-score-name">${i===0?'🥇':i===1?'🥈':i===2?'🥉':''} ${escHtml(p.name)}</span><span class="re-score-pts">${p.score} pts</span></div>`).join('');
  
  injectGlassyStyles();

  let oldBtnWrap = document.getElementById('podium-btns');
  if (oldBtnWrap) oldBtnWrap.remove(); 

  const btnWrap = document.createElement('div');
  btnWrap.id = 'podium-btns';
  btnWrap.className = 'podium-btn-wrap';

  const playBtn = document.createElement('button');
  playBtn.innerHTML = '<span>🔄 Play Again</span>';
  playBtn.className = 'glass-fluid-btn play-btn';
  playBtn.onclick = () => resetGame();

  const homeBtn = document.createElement('button');
  homeBtn.innerHTML = '<span>🏠 Home</span>';
  homeBtn.className = 'glass-fluid-btn home-btn';
  homeBtn.onclick = () => location.reload(); 

  btnWrap.appendChild(playBtn);
  btnWrap.appendChild(homeBtn);
  
  overlayRoundEnd.appendChild(btnWrap);
  overlayRoundEnd.style.flexDirection = 'column';
  
  showEventPopup('🏆', `${winner.name} wins the game!`);
}

function injectGlassyStyles() {
  if (document.getElementById('podium-liquid-styles')) return;
  const style = document.createElement('style');
  style.id = 'podium-liquid-styles';
  style.textContent = `
    .podium-btn-wrap {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; margin-top: 25px; 
      z-index: 100; width: 100%; animation: btnPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
    }
    @keyframes btnPop { from { opacity: 0; transform: translateY(20px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .glass-fluid-btn {
      position: relative; overflow: hidden; padding: 14px 28px; border-radius: 100px;
      font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 1.05rem; color: white; cursor: pointer;
      backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: 0 8px 32px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; border: 2px solid rgba(255,255,255,0.4);
    }
    .glass-fluid-btn span { position: relative; z-index: 2; }
    .glass-fluid-btn::before {
      content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); transition: all 0.4s ease; z-index: 1;
    }
    .glass-fluid-btn:hover { transform: translateY(-4px) scale(1.05); }
    .glass-fluid-btn:hover::before { left: 100%; }
    .glass-fluid-btn:active { transform: translateY(2px) scale(0.95); }
    .play-btn { background: linear-gradient(135deg, #4acf8a, #2ecc87); box-shadow: 0 8px 25px rgba(46,204,135,0.4), inset 0 2px 0 rgba(255,255,255,0.5); }
    .play-btn:hover { box-shadow: 0 12px 35px rgba(46,204,135,0.6), inset 0 2px 0 rgba(255,255,255,0.6); }
    .home-btn { background: linear-gradient(135deg, #f0525e, #cc3333); box-shadow: 0 8px 25px rgba(240,82,94,0.4), inset 0 2px 0 rgba(255,255,255,0.5); }
    .home-btn:hover { box-shadow: 0 12px 35px rgba(240,82,94,0.6), inset 0 2px 0 rgba(255,255,255,0.6); }
  `;
  document.head.appendChild(style);
}

function resetGame() {
  overlayRoundEnd.classList.add('hidden');
  const btnWrap = document.getElementById('podium-btns');
  if (btnWrap) btnWrap.remove(); 

  S.players.forEach(p => { p.score = 0; p.guessed = false; });
  S.round = 1; S.drawerIdx = 0; S.isDrawer = S.players[S.drawerIdx].id === S.myId;
  S.currentWord = ''; S.guessedIds.clear(); S.hintsFired = 0; S.history = [];

  roundBadge.textContent = `Round ${S.round}/${S.totalRounds}`;
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  chatMessages.innerHTML = '';
  addChat('system', '', '🔄 New Game Started! Scores reset.');
  
  buildLeaderboard();
  startWordSelection();
}

/* ════════════════════════════════════════════
   CANVAS DRAWING (UNIFIED TOUCH & MOUSE) & UNDO
════════════════════════════════════════════ */
function initCanvas() {
  resizeCanvas();
  gameCanvas.addEventListener('touchstart', onDrawStart, { passive: false });
  gameCanvas.addEventListener('touchmove', onDrawMove, { passive: false });
  gameCanvas.addEventListener('touchend', onDrawEnd);
  gameCanvas.addEventListener('touchcancel', onDrawEnd);
  gameCanvas.addEventListener('mousedown', onDrawStart);
  window.addEventListener('mousemove', onDrawMove);
  window.addEventListener('mouseup', onDrawEnd);
}

function resizeCanvas() {
  const rect = canvasWrap.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  if (W === 0 || H === 0) return;
  S.dpr = window.devicePixelRatio || 1; 

  let oldData = null;
  if (gameCanvas.width > 0 && gameCanvas.height > 0) {
    oldData = ctx.getImageData(0, 0, gameCanvas.width, gameCanvas.height);
  }

  gameCanvas.width = W * S.dpr; 
  gameCanvas.height = H * S.dpr;
  // WE NO LONGER SET INLINE STYLES. CSS WIDTH:100% WILL HANDLE IT.
  
  ctx.scale(S.dpr, S.dpr); 
  ctx.lineCap = 'round'; 
  ctx.lineJoin = 'round'; 
  ctx.fillStyle = 'white'; 
  ctx.fillRect(0, 0, W, H);

  if (oldData) {
    ctx.putImageData(oldData, 0, 0);
  }
}

function saveState() {
  if (S.history.length > 15) S.history.shift();
  S.history.push(ctx.getImageData(0, 0, gameCanvas.width, gameCanvas.height));
}

function getXY(e) {
  const r = gameCanvas.getBoundingClientRect();
  let cx = e.clientX, cy = e.clientY;
  if (e.touches && e.touches.length > 0) {
    cx = e.touches[0].clientX; cy = e.touches[0].clientY;
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY;
  }
  
  // Exact mathematical ratio to reach absolute edges
  const scaleX = (gameCanvas.width / S.dpr) / r.width;
  const scaleY = (gameCanvas.height / S.dpr) / r.height;
  
  return { 
    x: (cx - r.left) * scaleX, 
    y: (cy - r.top) * scaleY 
  };
}

function onDrawStart(e) {
  if (e.type === 'touchstart') e.preventDefault();
  if (!S.isDrawer) return;
  
  S.isDrawing = true;
  const pos = getXY(e);

  saveState();

  if (S.tool === 'fill') {
    floodFill(pos.x, pos.y, S.color);
    S.isDrawing = false;
    return;
  }

  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = S.tool === 'eraser' ? '#ffffff' : S.color;
  ctx.lineWidth = S.tool === 'eraser' ? S.brushSize * 3 : S.brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function onDrawMove(e) {
  if (e.type === 'touchmove') e.preventDefault();
  if (!S.isDrawer || !S.isDrawing) return;
  const pos = getXY(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

function onDrawEnd(e) {
  if (!S.isDrawer || !S.isDrawing) return;
  S.isDrawing = false;
  ctx.closePath();
}

function floodFill(startX, startY, fillHex) {
  const w = gameCanvas.width, h = gameCanvas.height;
  const id = ctx.getImageData(0, 0, w, h), d = id.data;
  const xi = Math.round(startX * S.dpr), yi = Math.round(startY * S.dpr);
  if (xi < 0 || xi >= w || yi < 0 || yi >= h) return;
  const idx = (yi * w + xi) * 4;
  const tr = d[idx], tg = d[idx+1], tb = d[idx+2], ta = d[idx+3];
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fillHex);
  const fc = r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : null;
  if (!fc || (tr===fc.r && tg===fc.g && tb===fc.b && ta===255)) return;

  function match(i) { return Math.abs(d[i]-tr)<30 && Math.abs(d[i+1]-tg)<30 && Math.abs(d[i+2]-tb)<30 && Math.abs(d[i+3]-ta)<30; }
  const stack = [xi + yi * w], seen = new Uint8Array(w * h);
  
  while (stack.length) {
    const p = stack.pop(); if (seen[p]) continue;
    const x = p % w, y = Math.floor(p / w);
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const i = p * 4; if (!match(i)) continue;
    seen[p] = 1; d[i] = fc.r; d[i+1] = fc.g; d[i+2] = fc.b; d[i+3] = 255;
    if (x+1 < w) stack.push(p+1); if (x-1 >= 0) stack.push(p-1);
    if (y+1 < h) stack.push(p+w); if (y-1 >= 0) stack.push(p-w);
  }
  ctx.putImageData(id, 0, 0);
}

function setupToolbar() {
  ['pencil','fill','eraser'].forEach(t => { 
    if($('tool-' + t)) {
      $('tool-' + t).addEventListener('click', () => { 
        S.tool = t; 
        gameCanvas.className = t === 'eraser' ? 'eraser' : ''; 
        document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.toggle('active', b.id === 'tool-' + t));
      }); 
    }
  });
  
  if($('tool-undo')) $('tool-undo').addEventListener('click', () => {
    if (S.history.length > 0) {
      const previousState = S.history.pop();
      ctx.putImageData(previousState, 0, 0);
    } else {
      ctx.fillStyle = 'white'; 
      ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    }
  });

  if($('tool-clear')) $('tool-clear').addEventListener('click', () => { 
    saveState(); 
    ctx.fillStyle = 'white'; 
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height); 
  });
  
  $('size-slider').addEventListener('input', e => { S.brushSize = +e.target.value; $('size-val-txt').textContent = S.brushSize + 'px'; });
  $('btn-color-popup').addEventListener('click', e => { e.stopPropagation(); $('popup-color').classList.toggle('hidden'); $('popup-size').classList.add('hidden'); });
  $('btn-size-popup').addEventListener('click', e => { e.stopPropagation(); $('popup-size').classList.toggle('hidden'); $('popup-color').classList.add('hidden'); });
  $('color-palette').innerHTML = COLORS.map(hex => `<div class="c-swatch ${hex===S.color?'active':''}" style="background:${hex}" onclick="S.color='${hex}'; document.getElementById('color-indicator').style.background='${hex}'; if(S.tool==='eraser'){ document.getElementById('tool-pencil').click(); }"></div>`).join('');
  
  document.addEventListener('click', e => {
    const pColor = $('popup-color'), pSize = $('popup-size');
    if (pColor && !pColor.classList.contains('hidden') && !pColor.contains(e.target) && !$('btn-color-popup').contains(e.target)) pColor.classList.add('hidden');
    if (pSize && !pSize.classList.contains('hidden') && !pSize.contains(e.target) && !$('btn-size-popup').contains(e.target)) pSize.classList.add('hidden');
  });
}

/* ════════════════════════════════════════════
   CHAT, CONTEXT MENUS & UTILS
════════════════════════════════════════════ */
function setupChat() {
  btnChatSend.addEventListener('click', sendGuess);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendGuess(); } });
}

function sendGuess() {
  const val = chatInput.value.trim(); if (!val) return; chatInput.value = '';
  if (S.isDrawer || S.guessedIds.has(S.myId)) { addChat('normal', S.playerName, val); return; }

  const guess = val.toLowerCase().trim(), word = (S.currentWord || '').toLowerCase().trim();
  if (word && guess === word) {
    const pts = Math.max(10, Math.round(S.timeLeft / S.drawTime * 100)), me = S.players.find(p => p.isSelf);
    if (me) { me.score += pts; me.guessed = true; }
    S.guessedIds.add(S.myId);
    addChat('correct', S.playerName, `🎉 Guessed the word! (+${pts} pts)`);
    showToast(`✅ You guessed it! +${pts} pts`, 't-correct');
    floatPoints(`+${pts}`, window.innerWidth * 0.5, window.innerHeight * 0.4);
    buildLeaderboard();
    const nonDrawers = S.players.filter(p => p.id !== S.players[S.drawerIdx]?.id);
    if (nonDrawers.every(p => p.guessed)) { clearInterval(S.timerInterval); setTimeout(() => endRound(true), 800); }
  } else {
    addChat('normal', S.playerName, val);
  }
}

function addChat(type, name, text) {
  const div = document.createElement('div'); div.className = 'chat-msg ' + (type === 'correct' ? 'correct' : type === 'system' ? 'system' : 'normal');
  div.innerHTML = type === 'system' ? `<span class="msg-text">${escHtml(text)}</span>` : `<span class="msg-name">${escHtml(name)}:</span> <span class="msg-text">${escHtml(text)}</span>`;
  chatMessages.appendChild(div); chatMessages.scrollTop = chatMessages.scrollHeight;
}

$('btn-mute').addEventListener('click', () => {
  S.isMuted = !S.isMuted;
  $('mute-icon').innerHTML = S.isMuted ? `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>` : `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
});

function setupContextMenu() {
  document.addEventListener('click', e => { if (!contextMenu.contains(e.target)) contextMenu.classList.add('hidden'); });
  $('ctx-kick').addEventListener('click', () => { contextMenu.classList.add('hidden'); if (S.ctxTarget) showToast(`🗳️ Vote kick initiated for ${S.ctxTarget.name}`, 't-warn'); });
  $('ctx-report').addEventListener('click', () => { contextMenu.classList.add('hidden'); if (S.ctxTarget) showToast(`🚩 ${S.ctxTarget.name} reported`, 't-warn'); });
  $('ctx-mute').addEventListener('click', () => { contextMenu.classList.add('hidden'); if (S.ctxTarget) showToast(`🔇 ${S.ctxTarget.name} muted locally`, 't-info'); });
  $('ctx-close').addEventListener('click', () => contextMenu.classList.add('hidden'));
}

function openContextMenu(e, player) {
  e.stopPropagation(); S.ctxTarget = player;
  ctxName.textContent = player.name; ctxPts.textContent = player.score + ' pts';
  
  ctxAv.innerHTML = ''; 
  const img = document.createElement('img'); 
  img.src = player.avatarDef; 
  img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover'; 
  ctxAv.appendChild(img);
  
  contextMenu.classList.remove('hidden');
  contextMenu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
  contextMenu.style.top = Math.min(e.clientY, window.innerHeight - 240) + 'px';
}

function showEventPopup(icon, msg) {
  if(!$('event-popup')) return;
  $('event-popup-icon').textContent = icon; $('event-popup-msg').textContent = msg;
  $('event-popup').classList.remove('hidden'); setTimeout(() => $('event-popup').classList.add('hidden'), 2800);
}

function showToast(msg, type = 't-info') {
  const tc = $('toast-container'), t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  tc.prepend(t); setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 380); }, 3800);
}

function floatPoints(text, x, y) {
  const el = document.createElement('div'); el.className = 'float-pts'; el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1300);
}

function shuffled(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
