/* ============================================================
   Kids English — app.js (FILE INTI / MESIN APLIKASI)
   ------------------------------------------------------------
   1. Di index.html       -> beranda + profil nama anak
   2. Di pelajaranN.html  -> pemutar pelajaran: pemanasan, vocab,
      permainan Find It, kuis, dialog, dan Tes Bicara
   Menambah pelajaran = menambah file pelajaranN.html baru.
   ============================================================ */
(function(){
'use strict';

var $ = function(id){ return document.getElementById(id); };

/* ---------- PROGRES (localStorage, kunci sama di semua halaman) ---------- */
function loadJSON(key, fallback){
  try {
    var v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch(e){ return fallback; }
}
var completedLessons = loadJSON('completedLessons', []);
var lessonStars = loadJSON('lessonStars', {});
function saveProgress(){
  localStorage.setItem('completedLessons', JSON.stringify(completedLessons));
  localStorage.setItem('lessonStars', JSON.stringify(lessonStars));
}
function totalStars(){
  return Object.values(lessonStars).reduce(function(a,b){ return a + b; }, 0);
}

/* ---------- PROFIL NAMA ANAK ---------- */
function getProfiles(){ return loadJSON('profiles', []); }
function saveProfiles(list){ localStorage.setItem('profiles', JSON.stringify(list)); }
function getActiveProfile(){ return localStorage.getItem('activeProfile') || ''; }
function setActiveProfile(name){
  if(name) localStorage.setItem('activeProfile', name);
  else localStorage.removeItem('activeProfile');
}
function childName(){ return getActiveProfile(); }
/* Ganti "..." / "___" pada kalimat dengan nama anak yang dipilih */
function withName(text){
  var n = childName();
  if(!n) return String(text);
  return String(text).replace(/\.{2,}|_{2,}/g, n);
}

/* ---------- WARNA KATEGORI ---------- */
var COLORS = {
  purple: { main:'#a48be8', dark:'#8b6fd8', soft:'#efeaff' },
  blue:   { main:'#56c2f2', dark:'#3da8dc', soft:'#e5f6ff' },
  orange: { main:'#ffa451', dark:'#e88a33', soft:'#fff1e3' },
  green:  { main:'#58cc8b', dark:'#3dab6e', soft:'#e6f9ee' },
  pink:   { main:'#ff7ba9', dark:'#e35b8c', soft:'#ffeaf1' },
  yellow: { main:'#ffc531', dark:'#dfa600', soft:'#fff7dd' }
};

/* ---------- IKON SVG (gaya rata & membulat, seragam dengan UI) ---------- */
var ICONS = {
  speaker: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.2v5.6h3.6l4.9 3.9V5.3L7.6 9.2H4z" fill="currentColor"/><path d="M16 8.6a4.8 4.8 0 0 1 0 6.8M18.6 6.2a8.2 8.2 0 0 1 0 11.6" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round"/></svg>',
  turtle: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 14.3a5.7 5.7 0 0 1 11.4 0" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round"/><path d="M2 14.3h17.9" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round"/><circle cx="19.9" cy="12.4" r="2" stroke="currentColor" stroke-width="2.1" fill="none"/><path d="M5.3 14.3v2.4M12.4 14.3v2.4" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round"/></svg>',
  mic: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round"/></svg>',
  stop: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor"/></svg>',
  star: '<svg class="ico star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.65 5.4 5.95.85-4.3 4.2 1.02 5.9L12 16.75l-5.32 2.8 1.02-5.9-4.3-4.2 5.95-.85z" fill="currentColor"/></svg>',
  home: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.2 12 4.3l8 6.9" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.2 10.2V19.2h11.6v-9" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  flag: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5v15.5" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round"/><path d="M6 5.2h11.4l-2.8 3.6 2.8 3.6H6z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  back: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  gift: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="4" rx="1.2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M6 13v6.5h12V13M12 9v10.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12 9c-3.4 0-5-1.2-5-2.7C7 5 8 4.2 9.2 4.2c1.6 0 2.8 2.2 2.8 4.8 0-2.6 1.2-4.8 2.8-4.8C16 4.2 17 5 17 6.3c0 1.5-1.6 2.7-5 2.7z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/></svg>',
  search: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M15 15l4.5 4.5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
  check: '<svg class="ico pop-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.6l4.4 4.4L19 7.4" stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg class="ico pop-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="round"/></svg>',
  alert: '<svg class="ico pop-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5 21 19.5H3z" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linejoin="round"/><path d="M12 10v4.2" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="12" cy="17" r="1.3" fill="currentColor"/></svg>',
  chat: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.2c-4.6 0-8.3 2.9-8.3 6.6 0 2.1 1.2 3.9 3.1 5.1l-.7 3.6c-.1.5.4.9.9.7l3.6-1.7c.5.1.9.1 1.4.1 4.6 0 8.3-2.9 8.3-6.6s-3.7-7.8-8.3-7.8z" fill="currentColor"/></svg>',
  chart: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 19.5V12M12 19.5v-14M18.5 19.5v-8" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round"/></svg>'
};

/* ---------- SUARA GURU (Text-to-Speech) ---------- */
var RATE_NORMAL = 0.6;   /* "Normal" Inggris dibuat lambat agar mudah ditiru anak */
var RATE_SLOW   = 0.42;  /* "Lambat" dibuat lebih lambat lagi */
var ID_RATE     = 0.8;   /* kecepatan natural untuk bahasa Indonesia */
var enVoice = null, idVoice = null;
function pickFemaleVoice(){
  if(!('speechSynthesis' in window)) return null;
  var voices = speechSynthesis.getVoices();
  if(!voices.length) return null;
  var femaleNames = [
    'Samantha','Victoria','Karen','Moira','Tessa','Fiona','Zira','Aria','Jenny','Michelle','Emma',
    'Google UK English Female','Google US English','Google Bahasa Indonesia','Damayanti',
    'Microsoft Zira','Microsoft Aria','Microsoft Jenny','Microsoft Michelle'
  ];
  for(var i=0;i<femaleNames.length;i++){
    var v = voices.find(function(v){ return v.name.toLowerCase().indexOf(femaleNames[i].toLowerCase()) >= 0 && v.lang.indexOf('en') === 0; });
    if(v) return v;
  }
  return voices.find(function(v){ return v.lang.indexOf('en') === 0; }) || voices[0];
}
function pickIdVoice(){
  if(!('speechSynthesis' in window)) return null;
  var voices = speechSynthesis.getVoices();
  if(!voices.length) return null;
  /* utamakan suara berbahasa Indonesia, lalu nama "Indonesia" (beberapa mesin TTS
     melaporkan lang tidak konsisten di browser tertentu, mis. Samsung Internet) */
  var v = voices.find(function(v){ return (v.lang || '').toLowerCase().indexOf('id') === 0; });
  if(!v) v = voices.find(function(v){ return (v.name || '').toLowerCase().indexOf('indonesia') >= 0; });
  return v || null;
}
function initVoices(){
  if(!('speechSynthesis' in window)) return;
  enVoice = pickFemaleVoice();
  idVoice = pickIdVoice();
  speechSynthesis.onvoiceschanged = function(){ enVoice = pickFemaleVoice(); idVoice = pickIdVoice(); };
}
initVoices();

function speakText(text, lang, speed, opts){
  if(!('speechSynthesis' in window)) return;
  /* jangan bunyikan apa pun saat mikrofon merekam: suara TTS ikut tertangkap
     mic dan menutupi suara asli anak */
  if(isRecording) return;
  if(!(opts && opts.queue)) window.speechSynthesis.cancel();
  var isId = lang && lang.indexOf('id') === 0;
  /* pilih ulang jika daftar suara baru saja termuat (Android/iOS memuatnya async) */
  if(isId && !idVoice) idVoice = pickIdVoice();
  if(!isId && !enVoice) enVoice = pickFemaleVoice();
  var u = new SpeechSynthesisUtterance(text);
  u.lang = lang || 'en-US';
  u.rate = speed === 'slow' ? RATE_SLOW : (speed === 'id' ? ID_RATE : RATE_NORMAL);
  u.pitch = isId ? 1.0 : 1.15;
  if(isId){ if(idVoice) u.voice = idVoice; }
  else if(enVoice) u.voice = enVoice;
  window.speechSynthesis.speak(u);
}

/* Ucapkan bahasa Inggris SAJA. Bahasa Indonesia hanya berbunyi bila
   tombol artinya ditekan (lihat tombol hijau di kartu kosakata). */
function speakEnId(en, id, speed){
  speakText(withName(en), 'en-US', speed);
}

/* ---------- EFEK SUARA BENAR/SALAH (Web Audio + fallback file WAV) ---------- */
var audioCtx = null;
var SFX_FILES = { correct: 'sfx/correct.wav', almost: 'sfx/almost.wav', wrong: 'sfx/wrong.wav' };

function sfxFallback(kind){
  /* dipakai jika Web Audio terblokir/suspend — mainkan file WAV */
  try {
    var src = SFX_FILES[kind];
    if(!src) return;
    var a = new window.Audio(src);
    a.volume = 1;
    var p = a.play();
    if(p && p.catch) p.catch(function(){});
  } catch(e){}
}

function audioPrewarm(){
  /* siapkan AudioContext di ketukan pertama agar suara tidak tertahan kebijakan autoplay */
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    if(!audioCtx) audioCtx = new AC();
    if(audioCtx.state === 'suspended' && audioCtx.resume){
      var p = audioCtx.resume();
      if(p && p.catch) p.catch(function(){});
    }
  } catch(e){}
}

function playSound(kind){
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC){ sfxFallback(kind); return; }
    if(!audioCtx) audioCtx = new AC();
    var play = function(){
      try {
        if(!audioCtx || audioCtx.state !== 'running'){ sfxFallback(kind); return; }
        var t0 = audioCtx.currentTime + 0.01;
        function note(freq, start, dur, type, gain){
          var o = audioCtx.createOscillator();
          var g = audioCtx.createGain();
          o.type = type || 'sine';
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.0001, t0 + start);
          g.gain.exponentialRampToValueAtTime(gain || 0.25, t0 + start + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
          o.connect(g); g.connect(audioCtx.destination);
          o.start(t0 + start); o.stop(t0 + start + dur + 0.05);
        }
        if(kind === 'correct'){          /* "ding!" naik — jawaban benar */
          note(659.25, 0, 0.16, 'sine', 0.3);
          note(880, 0.13, 0.26, 'sine', 0.3);
        } else if(kind === 'almost'){    /* nada tunggal — hampir benar */
          note(587.33, 0, 0.22, 'sine', 0.22);
        } else if(kind === 'wrong'){     /* "buzz!" rendah — jawaban salah */
          note(196, 0, 0.22, 'square', 0.12);
          note(147, 0.17, 0.32, 'square', 0.12);
        }
      } catch(e){ sfxFallback(kind); }
    };
    if(audioCtx.state === 'suspended'){
      /* tunggu resume selesai agar nada tidak terjadwal di masa lalu */
      var pr = audioCtx.resume();
      if(pr && pr.then) pr.then(play, play);
      else setTimeout(play, 60);
    } else {
      play();
    }
  } catch(e){ sfxFallback(kind); }
}

/* pemanasan audio di setiap ketukan + daftarkan service worker (mode aplikasi) */
document.addEventListener('pointerdown', audioPrewarm, { passive: true });
if('serviceWorker' in navigator){
  try { navigator.serviceWorker.register('sw.js').catch(function(){}); } catch(e){}
}

/* ---------- PENGENALAN SUARA (mikrofon) ---------- */
var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
var hasSpeechRec = !!SpeechRecognition;
var recognition = null;
var isRecording = false;
var currentSpeakTarget = null; /* { alt:[...], onDone:function(correct, heard, level) } */

function setupRecognition(){
  if(!hasSpeechRec) return;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;
  recognition.continuous = false;

  recognition.onstart = function(){
    isRecording = true;
    localStorage.setItem('usedMic', '1');
    updateMicUI(true);
  };
  recognition.onerror = function(e){
    isRecording = false;
    updateMicUI(false);
    var msg = 'Gagal mendengar suara. ';
    if(e.error === 'not-allowed' || e.error === 'service-not-allowed') msg = 'Izin mikrofon ditolak. Izinkan akses mikrofon di browser, lalu coba lagi.';
    else if(e.error === 'no-speech') msg = 'Tidak ada suara terdeteksi. Coba lagi ya.';
    else if(e.error === 'network') msg = 'Butuh koneksi internet untuk memeriksa suara.';
    playSound('wrong');
    showSpeakPop('bad', '', '', { note: msg, retry: { label: 'COBA LAGI', fn: function(){
      /* ulangi lewat fungsi asalnya agar popup "Mendengarkan..." muncul lagi */
      if(currentSpeakTarget && currentSpeakTarget.retryFn) currentSpeakTarget.retryFn();
      else toggleMic();
    } } });
  };
  recognition.onend = function(){
    isRecording = false;
    updateMicUI(false);
    /* popup "Mendengarkan..." masih terbuka berarti rekaman berhenti tanpa hasil */
    var lp = document.getElementById('popOverlay');
    if(lp && lp.querySelector('.pop-card.listen') && currentSpeakTarget){
      var t = currentSpeakTarget;
      currentSpeakTarget = null;
      closePop();
      t.onDone && t.onDone(false, '', 'bad');
    }
  };
  recognition.onresult = function(event){
    isRecording = false;
    updateMicUI(false);
    var results = event.results[0];
    var alternatives = [];
    for(var i=0;i<results.length;i++){
      alternatives.push(results[i].transcript.trim().toLowerCase());
    }
    var clean = alternatives.map(function(t){ return t.replace(/[.,!?;:'"]/g,'').trim(); });
    var heard = clean[0];
    if(!currentSpeakTarget) return;

    var targets = currentSpeakTarget.alt.map(function(t){ return t.toLowerCase().replace(/[.,!?;:'"]/g,'').trim(); });
    var matched = false;
    for(var a=0;a<targets.length && !matched;a++){
      for(var b=0;b<clean.length && !matched;b++){
        if(clean[b] === targets[a]) { matched = true; break; }
        if(clean[b].indexOf(targets[a]) >= 0 || targets[a].indexOf(clean[b]) >= 0){
          var shorter = Math.min(targets[a].length, clean[b].length);
          var longer  = Math.max(targets[a].length, clean[b].length);
          if(longer > 0 && shorter/longer > 0.6) matched = true;
        }
      }
    }
    var similarity = 0;
    if(clean.length){
      for(var c=0;c<clean.length;c++){
        similarity = Math.max(similarity, levenshteinRatio(targets[0], clean[c]));
      }
    }
    if(matched || similarity > 0.75){
      currentSpeakTarget.onDone && currentSpeakTarget.onDone(true, heard, 'good');
    } else if(similarity > 0.45){
      currentSpeakTarget.onDone && currentSpeakTarget.onDone(false, heard, 'almost');
    } else {
      currentSpeakTarget.onDone && currentSpeakTarget.onDone(false, heard, 'bad');
    }
    currentSpeakTarget = null;
  };
}
function levenshteinRatio(a, b){
  a = a.replace(/\s+/g,' ').trim();
  b = b.replace(/\s+/g,' ').trim();
  if(a === b) return 1;
  var m = a.length, n = b.length;
  if(!m || !n) return 0;
  var dp = [];
  for(var i=0;i<=m;i++){ dp.push(new Array(n+1).fill(0)); dp[i][0] = i; }
  for(var j=0;j<=n;j++){ dp[0][j] = j; }
  for(var i2=1;i2<=m;i2++){
    for(var j2=1;j2<=n;j2++){
      dp[i2][j2] = Math.min(dp[i2-1][j2]+1, dp[i2][j2-1]+1, dp[i2-1][j2-1] + (a[i2-1]===b[j2-1]?0:1));
    }
  }
  return 1 - dp[m][n]/Math.max(m,n);
}
setupRecognition();

function toggleMic(){
  if(!hasSpeechRec){
    alert('Browser ini belum mendukung pengecekan suara. Gunakan Chrome/Edge di Android atau desktop.');
    return;
  }
  if(isRecording){ try { recognition.stop(); } catch(e){} return; }
  if(!currentSpeakTarget) return;
  hideSpeechResult();
  /* matikan TTS yang masih berbunyi agar tidak tertangkap mikrofon */
  try { window.speechSynthesis.cancel(); } catch(e){}
  try { recognition.start(); } catch(e){}
}

function updateMicUI(recording){
  /* tombol mic di kartu vocab dan di layar Tes Bicara — ikon SVG berganti */
  ['micBtn', 'testMic'].forEach(function(id){
    var btn = $(id);
    if(!btn) return;
    btn.classList.toggle('listening', !!recording);
    btn.innerHTML = recording ? ICONS.stop : ICONS.mic;
  });
}

/* ---------- POPUP HASIL REKAMAN (benar / hampir / salah + yang terucap) ---------- */
function showSpeakPop(level, heard, expected, opts){
  opts = opts || {};
  closePop();
  var good = level === 'good';
  var cls = good ? 'ok' : (level === 'almost' ? 'mid' : 'no');
  var title = good ? 'Bagus sekali!' : (level === 'almost' ? 'Hampir benar!' : 'Belum tepat');
  var ico = good ? ICONS.check : (level === 'almost' ? ICONS.alert : ICONS.x);

  var text = heard
    ? ('Kamu mengucapkan: <b>\u201C' + heard + '\u201D</b>')
    : (opts.note || 'Suara tidak terdeteksi. Coba lebih dekat ke mikrofon, ya.');
  if(opts.note && heard) text += '<br>' + opts.note;
  if(!good && expected) text += '<div class="pop-expected">Ucap ulang: <b>\u201C' + expected + '\u201D</b></div>';

  var mainLabel = good ? (opts.next ? opts.next.label : 'SELESAI') : (opts.retry ? (opts.retry.label || 'COBA LAGI') : 'SELESAI');
  var mainFn = good ? (opts.next ? opts.next.fn : null) : (opts.retry ? opts.retry.fn : null);
  var skip = (!good && opts.skip) ? '<button class="pop-skip" id="popSkipBtn">' + (opts.skip.label || 'Lewati \u2192') + '</button>' : '';

  document.body.insertAdjacentHTML('beforeend', `
    <div class="pop-overlay" id="popOverlay">
      <div class="pop-card ${cls}">
        <div class="pop-ico">${ico}</div>
        <div class="pop-title">${title}</div>
        <div class="pop-text">${text}</div>
        <button class="btn ${good ? 'btn-green' : 'btn-black'}" id="popGoBtn">${mainLabel}</button>
        ${skip}
      </div>
    </div>`);

  var goBtn = document.getElementById('popGoBtn');
  goBtn.onclick = function(){
    if(goBtn._fired) return;   /* pengaman klik ganda */
    goBtn._fired = true;
    closePop();
    if(mainFn) mainFn();
  };
  var skipBtn = document.getElementById('popSkipBtn');
  if(skipBtn) skipBtn.onclick = function(){
    if(skipBtn._fired) return;
    skipBtn._fired = true;
    closePop();
    if(opts.skip && opts.skip.fn) opts.skip.fn();
  };
  /* dengarkan contoh pelan setelah hasil kurang tepat */
  if(!good && currentSlowTarget) setTimeout(function(){ speakText(currentSlowTarget, 'en-US', 'slow'); }, 350);
}

function closePop(){
  var ov = document.getElementById('popOverlay');
  if(ov) ov.remove();
}
function hideSpeechResult(){ closePop(); }
var currentSlowTarget = null;
/* Kait QA: uji popup hasil rekaman dari konsol otomatis */
window.__kidsQA = window.__kidsQA || {};
window.__kidsQA.showSpeakPop = showSpeakPop;
window.__kidsQA.showListenPop = showListenPop;

/* ---------- POPUP "MENDENGARKAN..." selama mikrofon merekam ---------- */
function showListenPop(expectedEn, expectedId){
  closePop();
  var en = String(expectedEn).replace(/</g, '&lt;');
  var id = String(expectedId || '').replace(/</g, '&lt;');
  document.body.insertAdjacentHTML('beforeend', `
    <div class="pop-overlay" id="popOverlay">
      <div class="pop-card listen">
        <div class="pop-ico">${ICONS.mic}</div>
        <div class="pop-title">Mendengarkan...</div>
        <div class="pop-listen-say">
          <div class="pls-en">\u201C${en}\u201D</div>
          ${id ? '<div class="pls-id">Artinya: ' + id + '</div>' : ''}
        </div>
        <div class="pop-listen-hint">Ucapkan dengan jelas ya!</div>
        <button class="btn btn-secondary" id="popCancelBtn">BATAL</button>
      </div>
    </div>`);
  var c = document.getElementById('popCancelBtn');
  c.onclick = function(){
    if(c._fired) return;
    c._fired = true;
    currentSpeakTarget = null;
    try { if(recognition && isRecording) recognition.stop(); } catch(e){}
    closePop();
  };
}

/* ============================================================
   MODE: HALAMAN PELAJARAN (pelajaranN.html) — ada blok lesson-data
   ============================================================ */
var dataEl = $('lesson-data');
if(dataEl){
  try {
    initLessonPage(JSON.parse(dataEl.textContent));
  } catch(err){
    $('app').innerHTML = '<div class="empty-note" style="margin:24px">⚠️ Format <b>lesson-data</b> di file ini rusak (JSON tidak valid).<br>Periksa tanda koma/kutip di blok data, atau salin ulang dari template-pelajaran.html.</div>';
  }
} else {
  initHomeApp();
}

/* ============================================================
   MESIN BERANDA — index.html
   ============================================================ */
function initHomeApp(){
  var app = $('app');
  var LESSONS = [];   /* [{n:1, data:{...}}, ...] dari hasil scan */
  var CATS = [];      /* kategori unik, urut sesuai kemunculan pertama */
  var activeCat = 'all';
  var currentScreen = 'splash';
  var currentCat = null;
  var scanning = true;
  var scanFailed = false;

  buildShell();
  scanLessons().then(function(){
    scanning = false;
    if(currentScreen === 'home') renderHome();
    if(currentScreen === 'rewards') renderRewards();
  });

  function buildShell(){
    app.innerHTML = `
    <header class="topbar">
      <div class="tb-left">
        <div>
          <div class="brand">Kids<span class="dot">•</span>English</div>
          <div class="tb-sub" id="stepLabel">Belajar santai</div>
        </div>
      </div>
      <div class="tb-right">
        <button class="profile-chip" id="profileBtn" title="Pilih nama anak"><span id="profileChipTxt">＋ Nama Anak</span></button>
        <button class="icon-pill" id="giftBtn" title="Hadiah">${ICONS.gift}</button>
        <div class="tb-pill" id="topPill"></div>
      </div>
    </header>
    <main class="stage">
      <section class="screen splash" id="screen-splash">
        <div class="logo">Kids<span class="dot">•</span>English</div>
        <!-- MASKOT: ganti 🦖 di baris di bawah ini dengan emoji lain,
             atau pakai gambar sendiri: <img src="maskot.png" style="width:70%"> -->
        <div class="splash-illustration">🦖</div>
        <h1>Belajar bahasa Inggris<br>untuk anak</h1>
        <p>Cara mudah dan menyenangkan belajar bahasa Inggris bersama si kecil, sedikit demi sedikit setiap hari.</p>
        <button class="btn btn-black" id="startBtn">MULAI BELAJAR →</button>
      </section>

      <section class="screen" id="screen-home">
        <div class="home-head">
          <div class="hello-line" id="helloLine"></div>
          <h1>Apa yang mau dipelajari<br>hari ini?</h1>
        </div>
        <div class="search-wrap">
          <span class="s-ico">${ICONS.search}</span>
          <input type="text" id="searchInput" placeholder="Cari kategori atau pelajaran...">
        </div>
        <div class="section-title">Pilih Kategori</div>
        <div class="cat-grid" id="catGrid"></div>
        <div class="stats-card">
          <div class="st-title">${ICONS.chart} Ringkasan Belajar</div>
          <div class="stats-row" id="statsRow"></div>
        </div>
        <div id="micSupportNotice"></div>
        <div id="manualArea"></div>
      </section>

      <section class="screen" id="screen-category">
        <div class="cat-head-wrap">
          <button class="back-btn" id="catBack">${ICONS.back}</button>
          <h1>Pilih Pelajaran</h1>
        </div>
        <div class="cat-hero" id="catHero"></div>
        <div class="lesson-list" id="catLessonList"></div>
      </section>

      <section class="screen" id="screen-rewards">
        <div class="rewards-wrap">
          <div class="cat-head-wrap" style="padding-left:0;padding-right:0">
            <button class="back-btn" id="rewardBack">${ICONS.back}</button>
            <h1>Hadiah</h1>
          </div>
          <div class="rewards-hero" style="margin-top:14px">
            <div class="rh-emoji">🎁</div>
            <div>
              <div class="rh-title">Koleksi Hadiah</div>
              <div class="rh-sub" id="rewardsSub"></div>
            </div>
          </div>
          <div id="rewardList"></div>
        </div>
      </section>
    </main>
    <div id="modalRoot"></div>`;

    $('giftBtn').onclick = function(){ if(window.speechSynthesis) speechSynthesis.cancel(); renderRewards(); };
    $('profileBtn').onclick = function(){ openProfileModal(false); };
    renderProfileChip();
    $('startBtn').onclick = function(){ renderHome(); };
    $('catBack').onclick = function(){ renderHome(); };
    $('rewardBack').onclick = function(){ renderHome(); };
    $('searchInput').oninput = renderCards;
    setTopPillStars();
    showScreen('splash');
  }

  /* --- Deteksi otomatis pelajaranN.html (N = 1..60) --- */
  function scanLessons(){
    var chain = Promise.resolve(true);
    for(var n=1; n<=60; n++){
      (function(n){
        chain = chain.then(function(go){
          if(!go) return false;
          return fetch('pelajaran' + n + '.html')
            .then(function(r){
              if(!r.ok) return false;
              return r.text().then(function(txt){
                var m = txt.match(/<script id="lesson-data" type="application\/json">([\s\S]*?)<\/script>/);
                if(!m) return false;
                var d;
                try { d = JSON.parse(m[1]); } catch(e){ return false; }
                LESSONS.push({ n: n, data: d });
                if(d.category && !CATS.some(function(c){ return c.id === d.category.id; })){
                  CATS.push(d.category);
                }
                return true;
              });
            })
            .catch(function(){
              /* gagal fetch (mis. dibuka langsung lewat file://) */
              scanFailed = true;
              return false;
            });
        });
      })(n);
    }
    return chain.then(function(){ LESSONS.sort(function(a,b){ return a.n - b.n; }); });
  }

  /* --- Aturan terbuka: urutan nomor file --- */
  function isUnlocked(n, comingSoon){
    if(comingSoon) return false;
    if(n === 1) return true;
    return completedLessons.indexOf(n - 1) >= 0;
  }

  function showScreen(name){
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active','fade-in'); });
    var el = $('screen-' + name);
    el.classList.add('active');
    el.classList.add('fade-in');
    setTimeout(function(){ el.classList.remove('fade-in'); }, 400);
    currentScreen = name;
    window.scrollTo(0, 0);
  }
  function setTopPillStars(){
    $('topPill').innerHTML = ICONS.star + ' <span id="topPillVal">' + totalStars() + '</span>';
  }
  function setStepLabel(t){ $('stepLabel').textContent = t; }

  function renderHome(){
    setStepLabel('Pilih Kategori');
    setTopPillStars();
    renderProfileChip();
    renderHelloLine();
    renderCards();
    renderNotices();
    showScreen('home');
    if(!getProfiles().length && !document.getElementById('profileOverlay')) openProfileModal(true);
  }

  /* ---------- PROFIL NAMA ANAK ---------- */
  function renderProfileChip(){
    var nm = getActiveProfile();
    $('profileChipTxt').textContent = nm ? ('🧒 ' + nm) : '＋ Nama Anak';
  }
  function renderHelloLine(){
    var nm = getActiveProfile();
    $('helloLine').textContent = nm ? ('Halo, ' + nm + '! 👋') : 'Selamat belajar! 👋';
  }

  function refreshProfileUI(){
    renderProfileChip();
    renderHelloLine();
  }

  function openProfileModal(firstRun){
    var root = $('modalRoot');
    var profiles = getProfiles();
    var active = getActiveProfile();
    var rows = profiles.map(function(p){
      var safe = String(p).replace(/"/g, '&quot;');
      return '<button class="profile-row' + (p === active ? ' on' : '') + '" data-name="' + safe + '">' +
        '<span class="pr-emoji">🧒</span><span class="pr-name">' + p + '</span>' +
        '<span class="pr-del" title="Hapus nama ini">🗑️</span></button>';
    }).join('');
    root.innerHTML = `
      <div class="modal-overlay" id="profileOverlay">
        <div class="modal-card">
          <div class="modal-title">${firstRun ? '✏️ Tuliskan Nama Kamu' : '👦👧 Siapa yang Belajar?'}</div>
          <div class="modal-desc">${firstRun
            ? 'Nama dipakai untuk sapaan di pelajaran, misal “My name is ...”.'
            : 'Pilih nama, tambah baru, atau hapus. Progres tersimpan di perangkat ini.'}</div>
          <div id="profileListWrap">${rows ? '<div class="profile-list">' + rows + '</div>' : ''}</div>
          <div class="add-row">
            <input id="newNameInput" type="text" maxlength="20" placeholder="Tulis nama di sini..." autocomplete="off">
            <button class="btn btn-black" id="addNameBtn">＋ TAMBAH</button>
          </div>
          <div class="btn-area" style="margin-top:14px">
            <button class="btn btn-black" id="profileDoneBtn">${firstRun ? 'MULAI BELAJAR 🚀' : 'SELESAI ✓'}</button>
          </div>
          ${firstRun ? '<button class="skip-link" id="profileLater">Nanti saja</button>' : ''}
        </div>
      </div>`;

    function addFromInput(){
      var v = (($('newNameInput').value || '').trim()).replace(/\s+/g, ' ');
      if(!v){ $('newNameInput').focus(); return; }
      var name = v.charAt(0).toUpperCase() + v.slice(1);
      var list = getProfiles();
      if(list.indexOf(name) < 0) list.push(name);
      saveProfiles(list);
      setActiveProfile(name);
      refreshProfileUI();
      openProfileModal(false);
    }
    function delName(p){
      saveProfiles(getProfiles().filter(function(x){ return x !== p; }));
      if(getActiveProfile() === p) setActiveProfile('');
      refreshProfileUI();
      openProfileModal(false);
    }

    $('addNameBtn').onclick = addFromInput;
    $('newNameInput').addEventListener('keydown', function(e){ if(e.key === 'Enter') addFromInput(); });
    root.querySelectorAll('.profile-row').forEach(function(row){
      row.onclick = function(e){
        if(e.target.classList.contains('pr-del')){ delName(row.getAttribute('data-name')); return; }
        setActiveProfile(row.getAttribute('data-name'));
        refreshProfileUI();
        openProfileModal(false);
      };
    });
    $('profileDoneBtn').onclick = function(){ root.innerHTML = ''; };
    var later = $('profileLater');
    if(later) later.onclick = function(){ root.innerHTML = ''; };
    $('profileOverlay').onclick = function(e){
      if(e.target === $('profileOverlay')) root.innerHTML = '';
    };
    if(firstRun) setTimeout(function(){
      var inp = $('newNameInput');
      if(inp) inp.focus(); /* modal mungkin sudah ditutup ulang/dihancurkan */
    }, 100);
  }

  function renderNotices(){
    var html = '';
    if(!hasSpeechRec){
      html += '<div class="unsupported-notice">⚠️ Cek suara 🎤 butuh <b>Chrome</b>/<b>Edge</b>. Belajar tetap jalan dengan tombol 🔊/🐢.</div>';
    }
    $('micSupportNotice').innerHTML = html;
  }

  function renderManualOpen(){
    if($('manualArea').innerHTML) return;
    $('manualArea').innerHTML = `
      <div class="unsupported-notice">📂 Beranda butuh hosting. Atau buka langsung:</div>
      <div class="manual-open">
        <input id="manualNum" type="number" min="1" placeholder="Nomor pelajaran, mis. 1">
        <button class="btn btn-black" id="manualGo">BUKA →</button>
      </div>`;
    $('manualGo').onclick = function(){
      var v = parseInt($('manualNum').value, 10);
      if(v >= 1) location.href = 'pelajaran' + v + '.html';
    };
  }

  function renderCards(){
    var grid = $('catGrid');
    grid.innerHTML = '';
    var q = ($('searchInput').value || '').toLowerCase().trim();

    if(scanFailed && LESSONS.length === 0){
      grid.innerHTML = '<div class="empty-note">🔎 Tidak bisa mencari daftar pelajaran dari halaman ini.</div>';
      renderManualOpen();
      updateStats();
      return;
    }
    if(scanning && LESSONS.length === 0){
      grid.innerHTML = '<div class="loading-note"><span class="spin">⏳</span> Mencari daftar pelajaran...</div>';
      updateStats();
      return;
    }
    if(LESSONS.length === 0){
      grid.innerHTML = '<div class="empty-note">Belum ada pelajaran.<br>Tambahkan <b>pelajaran1.html</b> di folder yang sama dengan index.html.</div>';
      updateStats();
      return;
    }

    var cats = CATS
      .filter(function(c){ return activeCat === 'all' || activeCat === c.id; })
      .filter(function(c){
        if(!q) return true;
        var ls = LESSONS.filter(function(L){ return L.data.category && L.data.category.id === c.id; });
        return c.name.toLowerCase().indexOf(q) >= 0
          || (c.desc || '').toLowerCase().indexOf(q) >= 0
          || ls.some(function(L){ return ((L.data.title || '') + ' ' + (L.data.desc || '')).toLowerCase().indexOf(q) >= 0; });
      });

    if(!cats.length){
      grid.innerHTML = '<div class="empty-note">😕 Tidak ada kategori yang cocok.<br>Coba kata kunci lain, ya!</div>';
      updateStats();
      return;
    }

    cats.forEach(function(c){
      var col = COLORS[c.color] || COLORS.purple;
      var ls = LESSONS.filter(function(L){ return L.data.category && L.data.category.id === c.id; });
      var done = ls.filter(function(L){ return completedLessons.indexOf(L.n) >= 0; }).length;
      var btn = document.createElement('button');
      btn.className = 'cat-card';
      btn.style.background = 'linear-gradient(145deg, ' + col.main + ', ' + col.dark + ')';
      btn.innerHTML = `
        ${ls.length ? '<div class="cc-badge">' + done + '/' + ls.length + '</div>' : ''}
        <div class="cc-emoji">${c.emoji}</div>
        <div class="cc-name">${c.name}</div>
        <div class="cc-sub">${ls.length ? (done === ls.length ? 'Semua selesai! 🎉' : (c.desc || '')) : 'Belum ada pelajaran'}</div>
        ${ls.length ? '<div class="cc-progress"><i style="width:' + (ls.length ? done/ls.length*100 : 0) + '%"></i></div>' : ''}
        ${done > 0 && done < ls.length ? '<div class="cc-ribbon">Lanjutkan ▶</div>' : ''}`;
      btn.onclick = function(){ openCategory(c.id); };
      grid.appendChild(btn);
    });

    updateStats();
  }

  function updateStats(){
    var row = $('statsRow');
    row.innerHTML = '';
    var doneCount = LESSONS.filter(function(L){ return completedLessons.indexOf(L.n) >= 0; }).length;
    var words = LESSONS
      .filter(function(L){ return completedLessons.indexOf(L.n) >= 0; })
      .reduce(function(a,L){ return a + ((L.data.vocab || []).length); }, 0);
    [
      { e: ICONS.star, bg:'#f7b731', v: totalStars(), l:'Bintang' },
      { e: ICONS.check, bg:'#58cc8b', v: doneCount + '/' + LESSONS.length, l:'Selesai' },
      { e: ICONS.chat, bg:'#a48be8', v: words, l:'Ungkapan' }
    ].forEach(function(s){
      var d = document.createElement('div');
      d.className = 'stat';
      d.innerHTML = '<div class="st-ico" style="background:' + s.bg + '">' + s.e + '</div>' +
        '<div class="st-val">' + s.v + '</div><div class="st-label">' + s.l + '</div>';
      row.appendChild(d);
    });
  }

  function openCategory(catId){
    currentCat = catId;
    renderCategoryScreen();
  }

  function renderCategoryScreen(){
    var c = CATS.find(function(x){ return x.id === currentCat; }) || { name:'?', emoji:'❓', color:'purple', desc:'' };
    var col = COLORS[c.color] || COLORS.purple;
    var ls = LESSONS.filter(function(L){ return L.data.category && L.data.category.id === c.id; });
    var done = ls.filter(function(L){ return completedLessons.indexOf(L.n) >= 0; }).length;

    setStepLabel(c.name);
    setTopPillStars();
    $('catHero').style.background = 'linear-gradient(145deg, ' + col.main + ', ' + col.dark + ')';
    $('catHero').innerHTML = `
      <div class="ch-emoji">${c.emoji}</div>
      <div style="min-width:0">
        <div class="ch-name">${c.name}</div>
        <div class="ch-desc">${c.desc || ''}</div>
      </div>
      <div class="ch-badge">${done}/${ls.length}<small>SELESAI</small></div>`;

    var list = $('catLessonList');
    list.innerHTML = '';
    if(!ls.length){
      list.innerHTML = '<div class="empty-note">Belum ada pelajaran di kategori ini.</div>';
    }
    ls.forEach(function(L){
      var n = L.n, d = L.data;
      var isDone = completedLessons.indexOf(n) >= 0;
      var unlocked = isUnlocked(n, d.comingSoon);
      var row = document.createElement('button');
      row.className = 'lesson-row' + (unlocked ? '' : ' locked');
      row.innerHTML = `
        <div class="lr-ico" style="background:${col.soft}">${unlocked ? (d.icon || '📘') : '🔒'}</div>
        <div class="lr-info">
          <div class="lr-num">Pelajaran ${n}${d.comingSoon ? ' · Segera hadir' : ''}</div>
          <div class="lr-name">${d.title || 'Tanpa judul'}</div>
          <div class="lr-desc">${d.subtitle || d.desc || ''}</div>
        </div>
        ${isDone ? '<div class="lr-stars">⭐ ' + (lessonStars[n] || 1) + '</div>' : '<div class="lr-status">' + (unlocked ? '▶️' : '🔒') + '</div>'}`;
      if(unlocked) row.onclick = function(){ location.href = 'pelajaran' + n + '.html'; };
      list.appendChild(row);
    });

    showScreen('category');
  }

  function renderRewards(){
    setStepLabel('Koleksi Hadiah');
    setTopPillStars();
    var list = $('rewardList');
    list.innerHTML = '';
    var total = totalStars();
    var doneCount = LESSONS.filter(function(L){ return completedLessons.indexOf(L.n) >= 0; }).length;
    $('rewardsSub').textContent = LESSONS.length
      ? ('Kamu punya ' + total + ' bintang dan ' + doneCount + ' dari ' + LESSONS.length + ' pelajaran selesai. Lanjutkan petualanganmu!')
      : 'Daftar pelajaran belum terbaca. Selesaikan pelajaran untuk mengumpulkan bintang & lencana!';

    if(LESSONS.length){
      var g1 = document.createElement('div');
      g1.className = 'reward-group-title';
      g1.textContent = '⭐ Bintang Pelajaran';
      list.appendChild(g1);

      LESSONS.forEach(function(L){
        var c = (L.data.category) || { name:'?', emoji:'📘' };
        var isDone = completedLessons.indexOf(L.n) >= 0;
        var st = lessonStars[L.n] || 0;
        var row = document.createElement('div');
        row.className = 'reward-row' + (isDone ? '' : ' locked');
        row.innerHTML = `
          <div class="reward-ico" style="background:${isDone ? 'var(--yellow-soft)' : 'var(--bg)'};border:2px solid ${isDone ? 'var(--yellow)' : 'var(--line)'}">${L.data.icon || '📘'}</div>
          <div class="reward-info">
            <div class="reward-name">Pelajaran ${L.n} · ${L.data.title || ''}</div>
            <div class="reward-desc">${c.emoji || ''} ${c.name || ''} — ${isDone ? 'Selesai, ' + '⭐'.repeat(st || 1) : 'Selesaikan pelajaran ini untuk membuka bintang.'}</div>
          </div>
          <div class="reward-right">${isDone ? '🌟' : '🔒'}</div>`;
        list.appendChild(row);
      });
    }

    var g2 = document.createElement('div');
    g2.className = 'reward-group-title';
    g2.textContent = '🏅 Lencana';
    list.appendChild(g2);

    var allDone = LESSONS.length > 0 && LESSONS.every(function(L){ return completedLessons.indexOf(L.n) >= 0; });
    [
      { emoji:'🎉', name:'Langkah Pertama', desc:'Selesaikan pelajaran pertamamu.', ok: completedLessons.length >= 1 },
      { emoji:'🎤', name:'Pemberani Bicara', desc:'Berlatih berbicara lewat mikrofon.', ok: localStorage.getItem('usedMic') === '1' },
      { emoji:'⭐', name:'Pengumpul Bintang', desc:'Kumpulkan 3 bintang.', ok: total >= 3 },
      { emoji:'🏆', name:'Juara Kids English', desc:'Selesaikan semua pelajaran.', ok: allDone }
    ].forEach(function(b){
      var row = document.createElement('div');
      row.className = 'reward-row' + (b.ok ? '' : ' locked');
      row.innerHTML = `
        <div class="reward-ico" style="background:${b.ok ? 'var(--green-soft)' : 'var(--bg)'};border:2px solid ${b.ok ? 'var(--green)' : 'var(--line)'}">${b.emoji}</div>
        <div class="reward-info">
          <div class="reward-name">${b.name}</div>
          <div class="reward-desc">${b.desc}</div>
        </div>
        <div class="reward-right">${b.ok ? '✅' : '🔒'}</div>`;
      list.appendChild(row);
    });

    showScreen('rewards');
  }
}

/* ============================================================
   MESIN HALAMAN PELAJARAN — pelajaranN.html
   ============================================================ */
function initLessonPage(data){
  var app = $('app');

  /* Nomor pelajaran diambil dari nama file: pelajaranN.html */
  var id = (location.pathname.match(/pelajaran(\d+)\.html$/) || [])[1];
  id = id ? parseInt(id, 10) : (data.id || 1);

  var col = COLORS[(data.category && data.category.color)] || COLORS.purple;
  var state = {
    vocabIndex: 0, quizIndex: 0,
    correctCount: 0, quizAnswered: false,
    speakCorrect: 0, speakTried: 0,
    gameIndex: 0, gameDone: false,
    testIndex: 0
  };
  var selectedOption = null;

  /* --- Urutan bagian (dinamis): warmup & game opsional --- */
  var SEC = [];
  if(data.warmup && data.warmup.length) SEC.push('warmup');
  SEC.push('vocab');
  if(data.game && data.game.length) SEC.push('game');
  SEC.push('quiz');
  SEC.push('dialog');
  /* Tes Bicara: kalimat khusus, atau otomatis dari baris anak di dialog */
  var testSrc = (data.speakingTest && data.speakingTest.length)
    ? data.speakingTest
    : (data.dialog || []).filter(function(d){ return d.who === 'child'; });
  if(hasSpeechRec && testSrc.length) SEC.push('speaktest');
  function secNum(key){ return SEC.indexOf(key) + 1; }
  function secProgress(key, frac){
    var step = 90 / SEC.length;
    var i = SEC.indexOf(key);
    return 5 + step * i + step * Math.min(Math.max(frac, 0), 1);
  }
  function shuffle(arr){
    for(var i = arr.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  buildLessonShell();

  /* --- Kunci: pelajaran sebelumnya harus selesai dulu (bisa dilewati orang tua) --- */
  var forced = [];
  try { forced = JSON.parse(localStorage.getItem('forcedLessons') || '[]'); } catch(e){ forced = []; }
  var locked = data.comingSoon === true;
  if(!locked && forced.indexOf(id) < 0){
    for(var i=1; i<id; i++){
      if(completedLessons.indexOf(i) < 0){ locked = true; break; }
    }
  }
  if(locked){
    $('lockReason').textContent = data.comingSoon
      ? 'Pelajaran ini masih "Segera hadir". Nantikan ya!'
      : 'Selesaikan pelajaran sebelumnya dulu, ya!';
    $('forceUnlockBtn').style.display = data.comingSoon ? 'none' : 'flex';
    showScreen('lock');
    setTopPillStars();
    return;
  }

  fillWelcome();
  showScreen('welcome');
  setTopPillStars();

  /* ---------- TAMPILAN ---------- */
  function buildLessonShell(){
    app.innerHTML = `
    <header class="topbar">
      <div class="tb-left">
        <a class="brand-link" href="index.html">
          <div class="brand">Kids<span class="dot">•</span>English</div>
          <div class="tb-sub" id="stepLabel"></div>
        </a>
      </div>
      <div class="tb-right">
        <a class="icon-pill" href="index.html" title="Beranda">${ICONS.home}</a>
        <div class="tb-pill" id="topPill"></div>
      </div>
    </header>
    <div class="lesson-progress" id="progressBarWrap">
      <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
    </div>
    <main class="stage">
      <section class="screen" id="screen-lock">
        <div class="welcome-wrap" style="justify-content:center">
          <div class="welcome-card">
            <div class="lock-emoji">🔒</div>
            <h1>Pelajaran Terkunci</h1>
            <p class="welcome-desc" id="lockReason"></p>
          </div>
          <div class="btn-area">
            <a class="btn btn-black" href="index.html" style="text-decoration:none">← KE BERANDA</a>
            <button class="btn btn-secondary" id="forceUnlockBtn" style="margin-top:10px">🔓 Buka Tetap (Orang Tua)</button>
          </div>
        </div>
      </section>

      <section class="screen" id="screen-welcome">
        <div class="welcome-wrap">
          <div class="welcome-card">
            <div class="welcome-illustration" id="welcomeFlag">👋</div>
            <h1 id="welcomeTitle"></h1>
            <div class="theme-pill" id="welcomeTheme"></div>
            <div class="hello-name" id="welcomeHello"></div>
          </div>
          <div class="btn-area">
            <button class="btn btn-black" id="startLessonBtn">MULAI PELAJARAN →</button>
            <a class="btn btn-secondary" href="index.html" style="margin-top:10px;text-decoration:none">← Kembali ke beranda</a>
          </div>
        </div>
      </section>

      <section class="screen" id="screen-warmup">
        <div class="screen-pad center-content">
          <div class="section-badge" id="badge-warmup">🔥 Pemanasan</div>
          <div class="question-text" id="warmupTitle">Ingat pelajaran kemarin!</div>
          <div class="dialog" id="warmupBox"></div>
        </div>
        <div class="btn-area screen-pad" style="padding-top:0">
          <button class="btn btn-black" id="warmupNextBtn">MULAI PELAJARAN →</button>
        </div>
      </section>

      <section class="screen" id="screen-vocab">
        <div class="screen-pad center-content">
          <div class="section-badge" id="badge-vocab">📖 Bagian 1 · Kenalkan Ungkapan</div>
          <div class="vocab-card" id="vocabCard">
            <div class="vocab-image" id="vocabImage">👋</div>
            <div class="word" id="vocabWord"></div>
            <div class="phonetic" id="vocabPhonetic"></div>
            <div class="meaning" id="meaningRow" title="Ketuk untuk dengarkan artinya dalam bahasa Indonesia">Artinya: <span id="vocabMeaning"></span><button class="mini-say" id="meaningSay" aria-label="Dengarkan artinya dalam bahasa Indonesia">${ICONS.speaker}</button></div>
            <div class="gesture" id="vocabGesture"></div>
            <div class="speed-row">
              <button class="speed-btn normal" id="speedNormal">${ICONS.speaker} Normal</button>
              <button class="speed-btn slow" id="speedSlow">${ICONS.turtle} Lambat</button>
            </div>
            <div class="speak-section" id="speakSection">
              <div class="speak-label">${ICONS.mic} Sekarang giliranmu!</div>
              <button class="mic-btn" id="micBtn">${ICONS.mic}</button>
            </div>
          </div>
          <div class="vocab-dots" id="vocabDots"></div>
        </div>
        <div class="btn-area screen-pad" style="padding-top:0">
          <button class="btn btn-black" id="vocabNextBtn">LANJUT</button>
        </div>
      </section>

      <section class="screen" id="screen-game">
        <div class="screen-pad center-content">
          <div class="section-badge" id="badge-game">🔎 Permainan</div>
          <div class="question-text" id="gameRound"></div>
          <div class="cmd-card">
            <div style="flex:1;min-width:0">
              <div class="cmd-en" id="cmdEn"></div>
              <div class="cmd-id" id="cmdId"></div>
            </div>
            <button class="speed-btn normal" id="cmdSay" title="Dengarkan normal">${ICONS.speaker}</button>
            <button class="speed-btn slow" id="cmdSaySlow" title="Dengarkan lambat">${ICONS.turtle}</button>
          </div>
          <div class="game-grid" id="gameGrid"></div>
        </div>
        <div class="btn-area screen-pad" style="padding-top:0">
          <button class="btn btn-black" id="gameNextBtn" disabled>LANJUT</button>
          <button class="btn btn-secondary" id="gameSkipBtn" style="margin-top:10px">LEWATI PERMAINAN →</button>
        </div>
      </section>

      <section class="screen" id="screen-quiz">
        <div class="screen-pad center-content">
          <div class="section-badge" id="badge-quiz">📝 Evaluasi</div>
          <div class="quiz-head">
            <div class="question-text" id="quizQuestion"></div>
            <button class="speed-btn normal" id="quizSay" title="Dengarkan soal">${ICONS.speaker}</button>
          </div>
          <div class="options" id="quizOptions"></div>
        </div>
        <div class="btn-area screen-pad" style="padding-top:0">
          <button class="btn btn-black" id="quizBtn" disabled>PERIKSA</button>
        </div>
      </section>

      <section class="screen" id="screen-dialog">
        <div class="screen-pad center-content">
          <div class="section-badge" id="badge-dialog">💬 Latihan Dialog</div>
          <div class="dialog" id="dialogBox"></div>
        </div>
        <div class="btn-area screen-pad" style="padding-top:0">
          <button class="btn btn-black" id="goResultBtn">LANJUT KE EVALUASI →</button>
        </div>
      </section>

      <section class="screen" id="screen-speaktest">
        <div class="screen-pad center-content">
          <div class="section-badge" id="badge-speaktest">🎤 Tes Bicara</div>
          <div class="test-card">
            <div class="vocab-dots" id="testDots"></div>
            <div class="test-en" id="testEn"></div>
            <div class="test-id" id="testId"></div>
            <div class="speed-row">
              <button class="speed-btn normal" id="testSay">${ICONS.speaker} Dengar</button>
              <button class="speed-btn slow" id="testSaySlow">${ICONS.turtle} Lambat</button>
            </div>
            <button class="mic-btn big" id="testMic">${ICONS.mic}</button>
          </div>
        </div>
        <div class="btn-area screen-pad" style="padding-top:0">
          <button class="btn btn-black" id="testNextBtn" disabled>LANJUT</button>
          <button class="btn btn-secondary" id="testSkipAllBtn" style="margin-top:10px">SELESAI TES →</button>
        </div>
      </section>

      <section class="screen result" id="screen-result">
        <div class="screen-pad center-content">
          <div class="result-card">
            <div class="emoji" id="resultEmoji">🎉</div>
            <h2 id="resultTitle"></h2>
            <div class="stars" id="resultStars"></div>
            <div class="score" id="resultScore"></div>
            <div class="speaking-score-box" id="speakingScoreBox" style="display:none">
              <div class="ss-emoji">🎤</div>
              <div class="ss-info">
                <div class="ss-title">Pengucapanmu</div>
                <div class="ss-val" id="speakingScoreVal"></div>
              </div>
            </div>
            <div class="msg" id="resultMsg"></div>
            <div class="homework-card">
              <div class="hw-title">📝 Tugas Kecil Hari Ini</div>
              <div class="hw-text" id="homeworkText"></div>
              <div class="hw-next" id="homeworkNext"></div>
            </div>
          </div>
        </div>
        <div class="btn-area screen-pad" style="padding-top:0">
          <button class="btn btn-green" id="nextLessonBtn" style="display:none">LANJUT KE PELAJARAN BERIKUTNYA →</button>
          <a class="btn btn-black" href="index.html" style="margin-top:10px;text-decoration:none">KEMBALI KE BERANDA</a>
          <button class="btn btn-secondary" id="restartBtn" style="margin-top:10px">ULANGI PELAJARAN</button>
        </div>
      </section>
    </main>`;

    /* --- pasang semua event --- */
    $('startLessonBtn').onclick = startLesson;
    $('speedNormal').onclick = function(){ speakCurrent('normal'); };
    $('speedSlow').onclick = function(){ speakCurrent('slow'); };
    /* bunyi artinya ditangani handler meaningRow di atas (area ketuk penuh) */
    $('quizSay').onclick = function(){ speakText(withName(data.quiz[state.quizIndex].q), 'id-ID', 'normal'); };
    $('micBtn').onclick = startVocabMic;
    $('vocabNextBtn').onclick = nextVocab;
    $('warmupNextBtn').onclick = function(){ goAfter('warmup'); };
    $('cmdSay').onclick = speakGameCommand;
    $('cmdSaySlow').onclick = function(){ speakGameCommand('slow'); };
    $('gameNextBtn').onclick = gameNext;
    $('gameSkipBtn').onclick = function(){ goAfter('game'); };
    $('testSay').onclick = function(){ speakEnId(withName(testSrc[state.testIndex].en), testSrc[state.testIndex].id, 'normal'); };
    $('testSaySlow').onclick = function(){ speakEnId(withName(testSrc[state.testIndex].en), testSrc[state.testIndex].id, 'slow'); };
    $('testMic').onclick = startTestMic;
    $('testNextBtn').onclick = testNext;
    $('testSkipAllBtn').onclick = showResult;
    $('quizBtn').onclick = submitQuiz;
    $('goResultBtn').onclick = function(){ goAfter('dialog'); };
    $('restartBtn').onclick = restart;
    $('forceUnlockBtn').onclick = function(){
      var f = [];
      try { f = JSON.parse(localStorage.getItem('forcedLessons') || '[]'); } catch(e){ f = []; }
      if(f.indexOf(id) < 0) f.push(id);
      try { localStorage.setItem('forcedLessons', JSON.stringify(f)); } catch(e){}
      fillWelcome();
      showScreen('welcome');
      setTopPillStars();
    };
    $('nextLessonBtn').onclick = function(){ location.href = 'pelajaran' + (id + 1) + '.html'; };
    /* kartu TIDAK membunyikan bahasa Inggris saat disentuh sembarangan —
       bahasa Inggris hanya lewat tombol Normal/Lambat. Seluruh baris
       "Artinya" berbunyi bahasa Indonesia (area ketuk besar). */
    $('meaningRow').onclick = function(){
      if(isRecording) return;
      speakText(data.vocab[state.vocabIndex].meaning, 'id-ID', 'id');
    };
  }

  function showScreen(name){
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active','fade-in'); });
    var el = $('screen-' + name);
    el.classList.add('active');
    el.classList.add('fade-in');
    setTimeout(function(){ el.classList.remove('fade-in'); }, 400);
    window.scrollTo(0, 0);
  }
  function setTopPillStars(){
    $('topPill').innerHTML = ICONS.star + ' <span id="topPillVal">' + totalStars() + '</span>';
  }
  function setStepLabel(t){ $('stepLabel').textContent = t; }
  function setProgress(pct){
    $('progressBarWrap').classList.add('show');
    $('progressFill').style.width = pct + '%';
    $('topPill').innerHTML = ICONS.flag + ' <span id="topPillVal">' + Math.round(pct) + '%</span>';
  }

  /* ---------- WELCOME ---------- */
  function fillWelcome(){
    setStepLabel('Pelajaran ' + id + ' · ' + (data.subtitle || data.title || ''));
    $('welcomeFlag').textContent = data.icon || '📘';
    $('welcomeTitle').textContent = data.title || 'Pelajaran';
    $('welcomeTheme').textContent = 'Tema: ' + (data.subtitle || '');
    var nm = childName();
    $('welcomeHello').textContent = nm ? ('Halo, ' + nm + '! 👋 Ayo belajar hari ini!') : 'Halo! 👋 Ayo belajar hari ini!';
  }

  /* ---------- VOCAB ---------- */
  function startLesson(){
    state.vocabIndex = 0;
    state.speakCorrect = 0; state.speakTried = 0;
    if(SEC[0] === 'warmup'){
      setStepLabel('Pemanasan · Ulang pelajaran kemarin');
      renderWarmup();
      showScreen('warmup');
      setTimeout(function(){
        var first = data.warmup[0];
        if(first && first.who === 'parent') speakEnId(withName(first.en), first.id, 'normal');
      }, 600);
    } else {
      setStepLabel('Bagian ' + secNum('vocab') + ' · Kenalkan Ungkapan');
      renderVocab();
      showScreen('vocab');
      setTimeout(function(){ speakCurrent('normal'); }, 600);
    }
  }

  function speakCurrent(speed){
    var v = data.vocab[state.vocabIndex];
    speakEnId(v.speak, v.meaning, speed);
  }

  function renderVocab(){
    var v = data.vocab[state.vocabIndex];
    $('vocabImage').textContent = v.image;
    $('vocabImage').style.background = v.emojiBg || col.soft;
    $('vocabWord').textContent = v.word;
    $('vocabPhonetic').textContent = 'Cara baca: ' + v.phonetic;
    $('vocabMeaning').textContent = v.meaning;
    $('vocabGesture').textContent = (v.gestureLabel || 'Gerakan') + ': ' + v.gesture;

    var dots = $('vocabDots');
    dots.innerHTML = '';
    data.vocab.forEach(function(_, i){
      var d = document.createElement('i');
      d.className = i === state.vocabIndex ? 'on' : '';
      dots.appendChild(d);
    });

    $('badge-vocab').textContent = '📖 Bagian ' + secNum('vocab') + ' · Kenalkan Ungkapan';
    $('vocabNextBtn').textContent = state.vocabIndex < data.vocab.length - 1 ? 'LANJUT' : 'MULAI PERMAINAN';
    setProgress(secProgress('vocab', state.vocabIndex / data.vocab.length));

    hideSpeechResult();
    updateMicUI(false);
    $('speakSection').style.display = hasSpeechRec ? 'block' : 'none';
  }

  function startVocabMic(){
    if(!hasSpeechRec) return;
    if(isRecording){ try { recognition.stop(); } catch(e){} return; }
    var v = data.vocab[state.vocabIndex];
    currentSlowTarget = v.speak;
    currentSpeakTarget = {
      alt: [v.speak].concat(v.alt || []),
      retryFn: function(){ startVocabMic(); },
      onDone: function(correct, heard, level){ handleSpeakResult(correct, heard, level, v.speak); }
    };
    showListenPop(v.speak, v.meaning);
    toggleMic();
  }

  function handleSpeakResult(correct, heard, level, expected){
    state.speakTried++;
    if(correct) state.speakCorrect++;
    playSound(level === 'good' ? 'correct' : (level === 'almost' ? 'almost' : 'wrong'));
    if(level === 'good'){
      showSpeakPop('good', heard, null, { next: { label: 'LANJUT', fn: nextVocab } });
    } else {
      showSpeakPop(level, heard, expected, { retry: retrySpeak, skip: { label: 'LEWATI \u2192', fn: nextVocab } });
    }
  }

  function retrySpeak(){
    hideSpeechResult();
    setTimeout(startVocabMic, 200);
  }

  function nextVocab(){
    if(state.vocabIndex < data.vocab.length - 1){
      state.vocabIndex++;
      renderVocab();
      speakCurrent('normal');
    } else {
      goAfter('vocab');
    }
  }

  /* Kait QA (tidak dipakai alur normal): menguji popup dari konsol otomatis */
  window.__kidsQA = window.__kidsQA || {};
  window.__kidsQA.showAnswerPop = showAnswerPop;

  /* ---------- POPUP BENAR / SALAH (ala Duolingo) ---------- */
  function showAnswerPop(ok, text, btnLabel, onGo){
    var host = document.getElementById('modalRoot') || document.body;
    host.insertAdjacentHTML('beforeend', `
      <div class="pop-overlay" id="popOverlay">
        <div class="pop-card ${ok ? 'ok' : 'no'}">
          <div class="pop-ico">${ok ? ICONS.check : ICONS.x}</div>
          <div class="pop-title">${ok ? 'Benar!' : 'Belum tepat'}</div>
          <div class="pop-text">${text}</div>
          <button class="btn ${ok ? 'btn-green' : 'btn-black'}" id="popGoBtn">${btnLabel}</button>
        </div>
      </div>`);
    var goBtn = document.getElementById('popGoBtn');
    goBtn.onclick = function(){
      if(goBtn._fired) return;   /* pengaman klik ganda */
      goBtn._fired = true;
      var ov = document.getElementById('popOverlay');
      if(ov) ov.remove();
      if(onGo) onGo();
    };
  }

  /* ---------- QUIZ ---------- */
  function renderQuiz(){
    state.quizAnswered = false;
    selectedOption = null;
    setStepLabel('Bagian ' + secNum('quiz') + ' · Jawab Pertanyaan');
    $('badge-quiz').textContent = '📝 Bagian ' + secNum('quiz') + ' · Jawab Pertanyaan';
    var q = data.quiz[state.quizIndex];
    $('quizQuestion').textContent = q.q;

    var opts = $('quizOptions');
    opts.innerHTML = '';
    q.options.forEach(function(opt, i){
      var b = document.createElement('button');
      b.className = 'option';
      b.innerHTML = '<span class="num">' + String.fromCharCode(65 + i) + '</span><span>' + opt + '</span>';
      b.onclick = function(){ selectOption(i, b); };
      opts.appendChild(b);
    });

    $('quizBtn').disabled = true;
    $('quizBtn').textContent = 'PERIKSA';
    setProgress(secProgress('quiz', state.quizIndex / data.quiz.length));
  }

  function selectOption(i, btn){
    if(state.quizAnswered) return;
    selectedOption = i;
    document.querySelectorAll('#quizOptions .option').forEach(function(o){ o.classList.remove('selected'); });
    btn.classList.add('selected');
    $('quizBtn').disabled = false;
  }

  function submitQuiz(){
    if(state.quizAnswered || selectedOption === null) return;
    state.quizAnswered = true;
    var q = data.quiz[state.quizIndex];
    var allOpts = document.querySelectorAll('#quizOptions .option');
    var isCorrect = selectedOption === q.answer;
    allOpts[q.answer].classList.add('correct');
    if(!isCorrect) allOpts[selectedOption].classList.add('wrong');
    playSound(isCorrect ? 'correct' : 'wrong');
    if(isCorrect) state.correctCount++;
    $('quizBtn').disabled = true;
    showAnswerPop(isCorrect,
      isCorrect ? 'Hebat, jawabanmu benar!' : 'Jawaban benarnya: <b>' + q.options[q.answer] + '</b>',
      state.quizIndex < data.quiz.length - 1 ? 'LANJUT' : 'SELESAI',
      function(){
        state.quizIndex++;
        if(state.quizIndex < data.quiz.length){ renderQuiz(); } else { goAfter('quiz'); }
      });
  }

  /* ---------- PEMANASAN & DIALOG (pembangun bubble bersama) ---------- */
  function renderBubbleList(box, list){
    box.innerHTML = '';
    list.forEach(function(d, idx){
      var row = document.createElement('div');
      row.className = 'bubble-row' + (d.who === 'child' ? ' right' : '');
      var avatar = document.createElement('div');
      avatar.className = 'avatar ' + d.who;
      avatar.textContent = d.who === 'parent' ? '👨' : '🧒';
      var bubble = document.createElement('div');
      bubble.className = 'bubble';
      var enShown = withName(d.en);
      var safeEn = String(enShown).replace(/"/g, '&quot;').replace(/'/g, "\\'");
      var safeId = String(d.id || '').replace(/"/g, '&quot;').replace(/'/g, "\\'");
      var micHtml = (d.who === 'child' && hasSpeechRec)
        ? '<button class="speak-bubble" title="Rekam suaramu" data-idx="' + idx + '">' + ICONS.mic + '</button>' : '';
      bubble.innerHTML = `
        <div class="en">${enShown}
          <button class="speak-bubble say" data-say="${safeEn}" data-sayid="${safeId}" title="Dengarkan">${ICONS.speaker}</button>
          <button class="speak-bubble say-slow" data-say="${safeEn}" data-sayid="${safeId}" title="Dengarkan lambat">${ICONS.turtle}</button>
          ${micHtml}
        </div>
        <div class="id">${withName(d.id || '')}</div>`;
      row.appendChild(avatar);
      row.appendChild(bubble);
      box.appendChild(row);
    });

    box.querySelectorAll('.say').forEach(function(b){
      b.onclick = function(){ speakEnId(b.getAttribute('data-say'), b.getAttribute('data-sayid'), 'normal'); };
    });
    box.querySelectorAll('.say-slow').forEach(function(b){
      b.onclick = function(){ speakEnId(b.getAttribute('data-say'), b.getAttribute('data-sayid'), 'slow'); };
    });
    box.querySelectorAll('.speak-bubble[title="Rekam suaramu"]').forEach(function(b){
      b.onclick = function(){ startListSpeak(list, parseInt(b.getAttribute('data-idx'), 10), b); };
    });
  }

  function renderWarmup(){
    $('badge-warmup').textContent = '🔥 Bagian ' + secNum('warmup') + ' · Pemanasan';
    renderBubbleList($('warmupBox'), data.warmup || []);
    setProgress(secProgress('warmup', 0.5));
  }

  function renderDialog(){
    $('badge-dialog').textContent = '💬 Bagian ' + secNum('dialog') + ' · Latihan Dialog';
    $('goResultBtn').textContent = SEC.indexOf('speaktest') >= 0 ? 'LANJUT KE TES BICARA →' : 'LANJUT KE EVALUASI →';
    renderBubbleList($('dialogBox'), data.dialog || []);
    setProgress(secProgress('dialog', 1));
  }

  function startListSpeak(list, idx, btn){
    if(!hasSpeechRec) return;
    if(isRecording){ try { recognition.stop(); } catch(e){} return; }
    var d = list[idx];
    var en = withName(d.en);
    currentSlowTarget = en;
    currentSpeakTarget = {
      alt: [String(en).replace(/[.,!?;:'"]/g, '')].concat(d.alt || []),
      retryFn: function(){ startListSpeak(list, idx, btn); },
      onDone: function(correct, heard, level){
        state.speakTried++;
        if(correct) state.speakCorrect++;
        playSound(level === 'good' ? 'correct' : (level === 'almost' ? 'almost' : 'wrong'));
        if(level === 'good'){
          showSpeakPop('good', heard, null, { next: { label: 'SELESAI', fn: null } });
        } else {
          showSpeakPop(level, heard, en, {
            retry: { label: 'COBA LAGI', fn: function(){ startListSpeak(list, idx, btn); } },
            skip: { label: 'SELESAI', fn: null }
          });
        }
      }
    };
    showListenPop(en, d.id);
    toggleMic();
  }

  /* ---------- TES BICARA ---------- */
  function renderSpeakTest(){
    setStepLabel('Bagian ' + secNum('speaktest') + ' · Tes Bicara');
    $('badge-speaktest').textContent = '🎤 Bagian ' + secNum('speaktest') + ' · Tes Bicara';
    var s = testSrc[state.testIndex];
    $('testEn').textContent = withName(s.en);
    $('testId').textContent = withName(s.id || '');
    var dots = $('testDots');
    dots.innerHTML = '';
    testSrc.forEach(function(_, i){
      var d = document.createElement('i');
      d.className = i === state.testIndex ? 'on' : '';
      dots.appendChild(d);
    });
    hideSpeechResult();
    $('testNextBtn').disabled = true;
    $('testNextBtn').textContent = state.testIndex < testSrc.length - 1 ? 'LANJUT' : 'SELESAI TES →';
    setProgress(secProgress('speaktest', state.testIndex / testSrc.length));
    setTimeout(function(){ speakEnId(withName(s.en), s.id, 'normal'); }, 600);
  }

  function startTestMic(){
    if(!hasSpeechRec) return;
    if(isRecording){ try { recognition.stop(); } catch(e){} return; }
    var s = testSrc[state.testIndex];
    var en = withName(s.en);
    currentSlowTarget = en;
    currentSpeakTarget = {
      alt: [String(en).replace(/[.,!?;:'"]/g, '')].concat(s.alt || []),
      retryFn: function(){ startTestMic(); },
      onDone: function(correct, heard, level){
        state.speakTried++;
        if(correct) state.speakCorrect++;
        playSound(level === 'good' ? 'correct' : (level === 'almost' ? 'almost' : 'wrong'));
        if(level === 'good'){
          showSpeakPop('good', heard, null, {
            next: { label: state.testIndex < testSrc.length - 1 ? 'LANJUT' : 'SELESAI', fn: function(){ testNext(); } }
          });
          $('testNextBtn').disabled = false;
        } else {
          showSpeakPop(level, heard, en, { retry: startTestMic, skip: { label: 'LEWATI \u2192', fn: testNext } });
        }
      }
    };
    showListenPop(en, s.id);
    toggleMic();
  }

  function testNext(){
    if(state.testIndex < testSrc.length - 1){
      state.testIndex++;
      renderSpeakTest();
    } else {
      showResult();
    }
  }

  /* ---------- PERMAINAN "FIND IT!" ---------- */
  function speakGameCommand(speed){
    var g = data.game[state.gameIndex];
    if(!g) return; /* permainan sudah selesai (timer tertunda) */
    speakEnId(g.say, g.id, speed || 'normal');
  }

  function renderGame(){
    var g = data.game[state.gameIndex];
    if(!g){ goAfter('game'); return; } /* pengaman indeks di luar jangkauan */
    var gname = data.gameName || 'Find It!';
    setStepLabel('Bagian ' + secNum('game') + ' · ' + gname);
    $('badge-game').textContent = '🔎 Bagian ' + secNum('game') + ' · ' + gname;
    var g = data.game[state.gameIndex];
    $('gameRound').textContent = 'Putaran ' + (state.gameIndex + 1) + ' dari ' + data.game.length;
    $('cmdEn').textContent = g.say;
    $('cmdId').textContent = g.id || '';

    var grid = $('gameGrid');
    grid.innerHTML = '';
    shuffle(data.vocab.slice()).forEach(function(v){
      var b = document.createElement('button');
      b.className = 'game-item';
      b.innerHTML = '<div class="gi-emoji" style="background:' + (v.emojiBg || col.soft) + '">' + v.image + '</div>' +
        '<div class="gi-word">' + v.word + '</div>';
      b.onclick = function(){ pickGameItem(v, b); };
      grid.appendChild(b);
    });

    $('gameNextBtn').disabled = true;
    $('gameNextBtn').textContent = state.gameIndex < data.game.length - 1 ? 'LANJUT' : 'SELESAI';
    setProgress(secProgress('game', state.gameIndex / data.game.length));
    setTimeout(function(){ speakGameCommand('normal'); }, 600);
  }

  function pickGameItem(v, btn){
    if(state.gameDone) return;
    var g = data.game[state.gameIndex];
    if(v.word === g.target){
      state.gameDone = true;
      btn.classList.add('correct');
      playSound('correct');
      document.querySelectorAll('#gameGrid .game-item').forEach(function(o){
        if(o !== btn) o.classList.add('dim');
      });
      speakText('Great job!', 'en-US', 'normal');
      showAnswerPop(true,
        (g.cheer || 'Kamu berhasil!') + '<br><b>' + g.say + '</b>',
        state.gameIndex < data.game.length - 1 ? 'LANJUT' : 'SELESAI',
        function(){
          state.gameIndex++;
          state.gameDone = false;
          if(state.gameIndex < data.game.length){ renderGame(); } else { goAfter('game'); }
        });
    } else {
      btn.classList.add('wrong');
      setTimeout(function(){ btn.classList.remove('wrong'); }, 700);
      playSound('wrong');
      showAnswerPop(false, 'Dengarkan lagi: <b>' + g.say + '</b>', 'COBA LAGI', null);
    }
  }

  function gameNext(){
    if(state.gameIndex < data.game.length - 1){
      state.gameIndex++;
      state.gameDone = false;
      renderGame();
    } else {
      goAfter('game');
    }
  }

  /* ---------- NAVIGASI ANTAR BAGIAN ---------- */
  function goAfter(key){
    var nextKey = SEC[SEC.indexOf(key) + 1];
    if(nextKey === 'vocab'){
      setStepLabel('Bagian ' + secNum('vocab') + ' · Kenalkan Ungkapan');
      renderVocab();
      showScreen('vocab');
      setTimeout(function(){ speakCurrent('normal'); }, 600);
    } else if(nextKey === 'game'){
      renderGame();
      showScreen('game');
    } else if(nextKey === 'quiz'){
      state.quizIndex = 0; state.correctCount = 0;
      renderQuiz();
      showScreen('quiz');
    } else if(nextKey === 'dialog'){
      setStepLabel('Bagian ' + secNum('dialog') + ' · Latihan Dialog');
      renderDialog();
      showScreen('dialog');
    } else if(nextKey === 'speaktest'){
      renderSpeakTest();
      showScreen('speaktest');
    } else {
      showResult();
    }
  }

  /* ---------- RESULT ---------- */
  function showResult(){
    if(window.speechSynthesis) speechSynthesis.cancel();
    if(recognition && isRecording){ try { recognition.stop(); } catch(e){} }

    var total = (data.quiz || []).length;
    setStepLabel('Selesai!');
    setProgress(100);
    var score = state.correctCount;
    $('resultScore').innerHTML = score + '<span>/' + total + '</span>';

    if(state.speakTried > 0){
      $('speakingScoreBox').style.display = 'flex';
      $('speakingScoreVal').textContent = state.speakCorrect + '/' + state.speakTried + ' benar';
    } else {
      $('speakingScoreBox').style.display = 'none';
    }

    if(completedLessons.indexOf(id) < 0) completedLessons.push(id);
    var ratio = total > 0 ? score / total : 1;
    var stars = ratio === 1 ? 3 : ratio >= 0.5 ? 2 : 1;
    lessonStars[id] = Math.max(lessonStars[id] || 0, stars);
    saveProgress();

    var nm = childName();
    var emoji, title, msg;
    if(ratio === 1){ emoji = '🏆'; title = 'Sempurna' + (nm ? ', ' + nm : '') + '!'; msg = 'Luar biasa! Anak sudah menguasai semua ungkapan hari ini.'; }
    else if(ratio >= 0.5){ emoji = '🎉'; title = 'Hebat' + (nm ? ', ' + nm : '') + '!'; msg = 'Bagus sekali! Sedikit lagi menuju sempurna. Ulangi permainan untuk hasil lebih baik.'; }
    else { emoji = '💪'; title = 'Semangat!'; msg = 'Tidak apa-apa, ini latihan bersama orang tua. Ayo coba lagi!'; }
    $('resultEmoji').textContent = emoji;
    $('resultTitle').textContent = title;
    $('resultStars').textContent = '⭐'.repeat(stars);
    $('resultMsg').textContent = msg;
    var hw = data.homework || {};
    $('homeworkText').innerHTML = hw.text || '';
    $('homeworkNext').textContent = hw.next || '';

    /* Tombol lanjut muncul hanya jika pelajaran berikutnya ada */
    var nextBtn = $('nextLessonBtn');
    nextBtn.style.display = 'none';
    fetch('pelajaran' + (id + 1) + '.html')
      .then(function(r){ if(r.ok){ nextBtn.textContent = 'LANJUT KE PELAJARAN ' + (id + 1) + ' →'; nextBtn.style.display = 'flex'; } })
      .catch(function(){ /* file:// atau tidak ada */ });

    showScreen('result');
  }

  function restart(){
    if(window.speechSynthesis) speechSynthesis.cancel();
    state.vocabIndex = 0; state.quizIndex = 0;
    state.correctCount = 0; state.quizAnswered = false;
    state.speakCorrect = 0; state.speakTried = 0;
    state.gameIndex = 0; state.gameDone = false;
    state.testIndex = 0;
    selectedOption = null;
    setProgress(0);
    fillWelcome();
    showScreen('welcome');
  }
}
})();
