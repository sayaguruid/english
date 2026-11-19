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

/* ---------- SUARA GURU (Text-to-Speech) ---------- */
var femaleVoice = null;
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
function initVoices(){
  if(!('speechSynthesis' in window)) return;
  femaleVoice = pickFemaleVoice();
  speechSynthesis.onvoiceschanged = function(){ femaleVoice = pickFemaleVoice(); };
}
initVoices();

function speakText(text, lang, speed){
  if(!('speechSynthesis' in window)){ alert('Browser tidak mendukung suara.'); return; }
  window.speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(text);
  u.lang = lang || 'en-US';
  u.rate = speed === 'slow' ? 0.55 : 0.85;
  u.pitch = 1.15;
  if(femaleVoice) u.voice = femaleVoice;
  window.speechSynthesis.speak(u);
}

/* ---------- EFEK SUARA BENAR/SALAH (Web Audio) ---------- */
var audioCtx = null;
function playSound(kind){
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    if(!audioCtx) audioCtx = new AC();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    var t = audioCtx.currentTime;
    function note(freq, start, dur, type, gain){
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + start);
      g.gain.exponentialRampToValueAtTime(gain || 0.16, t + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t + start); o.stop(t + start + dur + 0.05);
    }
    if(kind === 'correct'){          /* "ding!" naik — jawaban benar */
      note(659.25, 0, 0.14, 'sine', 0.18);
      note(880, 0.12, 0.22, 'sine', 0.18);
    } else if(kind === 'almost'){    /* nada tunggal — hampir benar */
      note(587.33, 0, 0.18, 'sine', 0.13);
    } else if(kind === 'wrong'){     /* "buzz!" rendah — jawaban salah */
      note(196, 0, 0.18, 'square', 0.07);
      note(147, 0.16, 0.28, 'square', 0.07);
    }
  } catch(e){}
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
    if(e.error === 'not-allowed') msg = 'Izin mikrofon ditolak. Izinkan akses mikrofon di browser.';
    else if(e.error === 'no-speech') msg = 'Tidak ada suara terdeteksi. Coba lagi ya.';
    else if(e.error === 'network') msg = 'Butuh koneksi internet untuk memeriksa suara.';
    playSound('wrong');
    showSpeechResult('bad', '⚠️ ' + msg, '', '', false);
  };
  recognition.onend = function(){
    isRecording = false;
    updateMicUI(false);
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
  try { recognition.start(); } catch(e){}
}

function updateMicUI(recording){
  /* tombol mic di kartu vocab dan di layar Tes Bicara */
  [['micBtn', 'micHint', 'Tekan tombol, lalu ucapkan ungkapan di atas'],
   ['testMic', 'testMicHint', 'Tekan tombol, lalu ucapkan kalimat di atas']].forEach(function(p){
    var btn = $(p[0]);
    if(!btn) return;
    if(recording){
      btn.classList.add('listening');
      btn.textContent = '⏹';
      if($(p[1])) $(p[1]).textContent = '🎙️ Mendengarkan... ucapkan sekarang!';
    } else {
      btn.classList.remove('listening');
      btn.textContent = '🎤';
      if($(p[1])) $(p[1]).textContent = p[2];
    }
  });
}

function showSpeechResult(level, title, heard, msg, correct){
  /* hasil muncul di layar yang sedang aktif (vocab atau Tes Bicara) */
  var testActive = $('screen-speaktest') && $('screen-speaktest').classList.contains('active');
  var box = $(testActive ? 'testResult' : 'speechResult');
  if(!box) return;
  box.className = 'speech-result show ' + level;
  $(testActive ? 'testSrTitle' : 'srTitle').textContent = title;
  $(testActive ? 'testSrHeard' : 'srHeard').innerHTML = heard ? ('Kamu mengucapkan: <b>"' + heard + '"</b>') : '';
  $(testActive ? 'testSrMsg' : 'srMsg').textContent = msg;
  if(!correct && currentSlowTarget) setTimeout(function(){ speakText(currentSlowTarget, 'en-US', 'slow'); }, 400);
}
var currentSlowTarget = null;

function hideSpeechResult(){
  ['speechResult', 'testResult'].forEach(function(id){
    var box = $(id);
    if(box) box.classList.remove('show');
  });
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
        <button class="icon-pill" id="giftBtn" title="Hadiah">🎁</button>
        <div class="tb-pill" id="topPill"></div>
      </div>
    </header>
    <main class="stage">
      <section class="screen splash" id="screen-splash">
        <div class="logo">Kids<span class="dot">•</span>English</div>
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
          <span class="s-ico">🔍</span>
          <input type="text" id="searchInput" placeholder="Cari kategori atau pelajaran...">
        </div>
        <div class="chips" id="chipRow"></div>
        <div class="section-title">Pilih Kategori</div>
        <div class="cat-grid" id="catGrid"></div>
        <div class="stats-card">
          <div class="st-title">📊 Ringkasan Belajar</div>
          <div class="stats-row" id="statsRow"></div>
        </div>
        <div id="micSupportNotice"></div>
        <div id="manualArea"></div>
        <div class="footer-note">Belajar santai, sedikit demi sedikit setiap hari 🌱</div>
      </section>

      <section class="screen" id="screen-category">
        <div class="cat-head-wrap">
          <button class="back-btn" id="catBack">←</button>
          <h1>Pilih Pelajaran</h1>
        </div>
        <div class="cat-hero" id="catHero"></div>
        <div class="lesson-list" id="catLessonList"></div>
      </section>

      <section class="screen" id="screen-rewards">
        <div class="rewards-wrap">
          <div class="cat-head-wrap" style="padding-left:0;padding-right:0">
            <button class="back-btn" id="rewardBack">←</button>
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
    $('topPill').innerHTML = '⭐ <span id="topPillVal">' + totalStars() + '</span>';
  }
  function setStepLabel(t){ $('stepLabel').textContent = t; }

  function renderHome(){
    setStepLabel('Pilih Kategori');
    setTopPillStars();
    renderProfileChip();
    renderHelloLine();
    renderChips();
    renderCards();
    renderNotices();
    showScreen('home');
    if(!getProfiles().length) openProfileModal(true);
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
            ? 'Nama dipakai untuk sapaan di pelajaran, misal “My name is ...”. Kamu bisa menambah nama anak lain nanti.'
            : 'Ketuk nama untuk memilih, tambah nama baru, atau hapus. Progres & bintang tersimpan di perangkat ini.'}</div>
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
    if(firstRun) setTimeout(function(){ $('newNameInput').focus(); }, 100);
  }

  function renderChips(){
    var chips = $('chipRow');
    chips.innerHTML = '';
    var mkChip = function(label, emoji, val){
      var b = document.createElement('button');
      b.className = 'chip' + (activeCat === val ? ' active' : '');
      b.textContent = (emoji ? emoji + ' ' : '') + label;
      b.onclick = function(){ activeCat = val; renderCards(); };
      chips.appendChild(b);
    };
    mkChip('Semua', '', 'all');
    CATS.forEach(function(c){ mkChip(c.short || c.name, c.emoji, c.id); });
  }

  function renderNotices(){
    var html = '';
    if(!hasSpeechRec){
      html += `<div class="unsupported-notice">⚠️ <b>Pengecekan suara tidak tersedia.</b> Browser ini belum mendukung Web Speech API.
        Gunakan <b>Google Chrome</b> atau <b>Microsoft Edge</b> untuk fitur rekam &amp; cek pengucapan.
        Kamu tetap bisa belajar dengan tombol 🔊/🐢.</div>`;
    }
    $('micSupportNotice').innerHTML = html;
  }

  function renderManualOpen(){
    if($('manualArea').innerHTML) return;
    $('manualArea').innerHTML = `
      <div class="unsupported-notice">📂 <b>Beranda otomatis butuh server web.</b>
        Saat file dibuka langsung dari komputer (file://), browser memblokir pencarian pelajaran.
        Unggah ke GitHub Pages/hosting, jalankan server lokal, atau buka langsung:
        <b>pelajaran1.html</b>, <b>pelajaran2.html</b>, dst.</div>
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
      { e:'⭐', bg:'#f7b731', v: totalStars(), l:'Bintang' },
      { e:'✅', bg:'#58cc8b', v: doneCount + '/' + LESSONS.length, l:'Selesai' },
      { e:'💬', bg:'#a48be8', v: words, l:'Ungkapan' }
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
          <div class="lr-desc">${d.desc || ''}</div>
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
        <a class="icon-pill" href="index.html" title="Beranda">🏠</a>
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
            <div class="info" id="welcomeInfo"></div>
            <p class="welcome-desc" id="welcomeDesc"></p>
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
          <div class="question-hint" id="warmupHint">Ulangi sapaan bersama. Tekan 🔊/🐢 untuk mendengar.</div>
          <div class="dialog" id="warmupBox"></div>
        </div>
        <div class="btn-area screen-pad" style="padding-top:0">
          <button class="btn btn-black" id="warmupNextBtn">MULAI PELAJARAN →</button>
        </div>
      </section>

      <section class="screen" id="screen-vocab">
        <div class="screen-pad center-content">
          <div class="section-badge" id="badge-vocab">📖 Bagian 1 · Kenalkan Ungkapan</div>
          <div class="question-text">Dengarkan, tirukan, lalu rekam</div>
          <div class="question-hint">Tekan 🔊/🐢 untuk mendengar, lalu tekan 🎤 dan ucapkan.</div>
          <div class="vocab-card" id="vocabCard">
            <div class="vocab-image" id="vocabImage">👋</div>
            <div class="word" id="vocabWord"></div>
            <div class="phonetic" id="vocabPhonetic"></div>
            <div class="meaning" id="vocabMeaning"></div>
            <div class="gesture" id="vocabGesture"></div>
            <div class="speed-row">
              <button class="speed-btn normal" id="speedNormal">🔊 Normal</button>
              <button class="speed-btn slow" id="speedSlow">🐢 Lambat</button>
            </div>
            <div class="speak-section" id="speakSection">
              <div class="speak-label">🎤 Sekarang giliranmu!</div>
              <button class="mic-btn" id="micBtn">🎤</button>
              <div class="mic-hint" id="micHint">Tekan tombol, lalu ucapkan ungkapan di atas</div>
              <div class="speech-result" id="speechResult">
                <div class="sr-title" id="srTitle"></div>
                <div class="sr-heard" id="srHeard"></div>
                <div class="sr-msg" id="srMsg"></div>
                <div class="sr-try">
                  <button class="retry" id="retryBtn">🔄 Coba Lagi</button>
                  <button class="skip" id="skipBtn">Lewati →</button>
                </div>
              </div>
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
          <div class="question-hint" id="gameHint">Dengarkan perintahnya, lalu sentuh gambar benda yang benar!</div>
          <div class="cmd-card">
            <div style="flex:1;min-width:0">
              <div class="cmd-en" id="cmdEn"></div>
              <div class="cmd-id" id="cmdId"></div>
            </div>
            <button class="speed-btn normal" id="cmdSay">🔊</button>
            <button class="speed-btn slow" id="cmdSaySlow">🐢</button>
          </div>
          <div class="game-grid" id="gameGrid"></div>
          <div class="feedback" id="gameFeedback">
            <span class="fb-icon" id="gameFbIcon">✓</span>
            <span id="gameFbText"></span>
          </div>
        </div>
        <div class="btn-area screen-pad" style="padding-top:0">
          <button class="btn btn-black" id="gameNextBtn" disabled>LANJUT</button>
          <button class="btn btn-secondary" id="gameSkipBtn" style="margin-top:10px">LEWATI PERMAINAN →</button>
        </div>
      </section>

      <section class="screen" id="screen-quiz">
        <div class="screen-pad center-content">
          <div class="section-badge" id="badge-quiz">🎮 Evaluasi</div>
          <div class="question-text" id="quizQuestion"></div>
          <div class="question-hint" id="quizHint"></div>
          <div class="options" id="quizOptions"></div>
          <div class="feedback" id="quizFeedback">
            <span class="fb-icon" id="quizFbIcon">✓</span>
            <span id="quizFbText"></span>
          </div>
        </div>
        <div class="btn-area screen-pad" style="padding-top:0">
          <button class="btn btn-black" id="quizBtn" disabled>PERIKSA</button>
        </div>
      </section>

      <section class="screen" id="screen-dialog">
        <div class="screen-pad center-content">
          <div class="section-badge" id="badge-dialog">💬 Latihan Dialog</div>
          <div class="question-text">Bacakan dialog dengan ceria</div>
          <div class="question-hint">Tekan 🔊/🐢 untuk mendengar. Tekan 🎤 di bubble anak untuk merekam dan cek pengucapan.</div>
          <div class="dialog" id="dialogBox"></div>
        </div>
        <div class="btn-area screen-pad" style="padding-top:0">
          <button class="btn btn-black" id="goResultBtn">LANJUT KE EVALUASI →</button>
        </div>
      </section>

      <section class="screen" id="screen-speaktest">
        <div class="screen-pad center-content">
          <div class="section-badge" id="badge-speaktest">🎤 Tes Bicara</div>
          <div class="question-text">Ulangi kalimatnya dengan suaramu!</div>
          <div class="question-hint">Dengarkan dulu 🔊, lalu tekan 🎤 dan ucapkan. Kalau sudah benar, lanjut ke kalimat berikutnya.</div>
          <div class="test-card">
            <div class="vocab-dots" id="testDots"></div>
            <div class="test-en" id="testEn"></div>
            <div class="test-id" id="testId"></div>
            <div class="speed-row">
              <button class="speed-btn normal" id="testSay">🔊 Dengar</button>
              <button class="speed-btn slow" id="testSaySlow">🐢 Lambat</button>
            </div>
            <button class="mic-btn big" id="testMic">🎤</button>
            <div class="mic-hint" id="testMicHint">Tekan tombol, lalu ucapkan kalimat di atas</div>
            <div class="speech-result" id="testResult">
              <div class="sr-title" id="testSrTitle"></div>
              <div class="sr-heard" id="testSrHeard"></div>
              <div class="sr-msg" id="testSrMsg"></div>
              <div class="sr-try">
                <button class="retry" id="testRetryBtn">🔄 Ucap Ulang</button>
                <button class="skip" id="testSkipBtn">Lewati →</button>
              </div>
            </div>
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
    $('micBtn').onclick = startVocabMic;
    $('retryBtn').onclick = retrySpeak;
    $('skipBtn').onclick = function(){ hideSpeechResult(); nextVocab(); };
    $('vocabNextBtn').onclick = nextVocab;
    $('warmupNextBtn').onclick = function(){ goAfter('warmup'); };
    $('cmdSay').onclick = speakGameCommand;
    $('cmdSaySlow').onclick = function(){ speakGameCommand('slow'); };
    $('gameNextBtn').onclick = gameNext;
    $('gameSkipBtn').onclick = function(){ goAfter('game'); };
    $('testSay').onclick = function(){ speakText(withName(testSrc[state.testIndex].en), 'en-US', 'normal'); };
    $('testSaySlow').onclick = function(){ speakText(withName(testSrc[state.testIndex].en), 'en-US', 'slow'); };
    $('testMic').onclick = startTestMic;
    $('testRetryBtn').onclick = function(){ hideSpeechResult(); setTimeout(startTestMic, 250); };
    $('testSkipBtn').onclick = function(){ hideSpeechResult(); testNext(); };
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
    $('vocabCard').addEventListener('click', function(e){
      if(e.target.tagName !== 'BUTTON') speakCurrent('normal');
    });
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
    $('topPill').innerHTML = '⭐ <span id="topPillVal">' + totalStars() + '</span>';
  }
  function setStepLabel(t){ $('stepLabel').textContent = t; }
  function setProgress(pct){
    $('progressBarWrap').classList.add('show');
    $('progressFill').style.width = pct + '%';
    $('topPill').innerHTML = '🚩 <span id="topPillVal">' + Math.round(pct) + '%</span>';
  }

  /* ---------- WELCOME ---------- */
  function fillWelcome(){
    setStepLabel('Pelajaran ' + id + ' · ' + (data.subtitle || data.title || ''));
    $('welcomeFlag').textContent = data.icon || '📘';
    $('welcomeTitle').textContent = data.title || 'Pelajaran';
    $('welcomeTheme').textContent = 'Tema: ' + (data.subtitle || '');
    var nm = childName();
    $('welcomeHello').textContent = nm ? ('Halo, ' + nm + '! 👋 Ayo belajar hari ini!') : 'Halo! 👋 Ayo belajar hari ini!';
    $('welcomeInfo').innerHTML = `
      <div class="info-pill">⏱️ 15 menit</div>
      <div class="info-pill">🎯 ${(data.vocab || []).length} ungkapan</div>
      ${data.game && data.game.length ? '<div class="info-pill">🔎 ' + data.game.length + ' putaran</div>' : ''}
      <div class="info-pill">🎮 ${(data.quiz || []).length} kuis</div>
      ${hasSpeechRec ? '<div class="info-pill">🎤 cek pengucapan</div>' : ''}`;
    $('welcomeDesc').textContent = data.desc || '';
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
        if(first && first.who === 'parent') speakText(withName(first.en), 'en-US', 'normal');
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
    speakText(v.speak, 'en-US', speed);
  }

  function renderVocab(){
    var v = data.vocab[state.vocabIndex];
    $('vocabImage').textContent = v.image;
    $('vocabImage').style.background = v.emojiBg || col.soft;
    $('vocabWord').textContent = v.word;
    $('vocabPhonetic').textContent = 'Cara baca: ' + v.phonetic;
    $('vocabMeaning').textContent = 'Artinya: ' + v.meaning;
    $('vocabGesture').textContent = 'Gerakan: ' + v.gesture;

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
    var v = data.vocab[state.vocabIndex];
    currentSlowTarget = v.speak;
    currentSpeakTarget = {
      alt: [v.speak].concat(v.alt || []),
      onDone: function(correct, heard, level){ handleSpeakResult(correct, heard, level, v.speak); }
    };
    toggleMic();
  }

  function handleSpeakResult(correct, heard, level, expected){
    state.speakTried++;
    if(correct) state.speakCorrect++;
    playSound(level === 'good' ? 'correct' : (level === 'almost' ? 'almost' : 'wrong'));
    if(level === 'good'){
      showSpeechResult('good', '🎉 Bagus sekali!', heard, 'Pengucapanmu sudah benar!', true);
    } else if(level === 'almost'){
      showSpeechResult('almost', '👍 Hampir benar!', heard, 'Coba ucapkan lebih jelas: "' + expected + '"', false);
    } else {
      showSpeechResult('bad', '🔄 Belum tepat', heard, 'Dengar lagi suaranya, lalu coba ucapkan: "' + expected + '"', false);
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

  /* ---------- QUIZ ---------- */
  function renderQuiz(){
    state.quizAnswered = false;
    selectedOption = null;
    setStepLabel('Bagian ' + secNum('quiz') + ' · Jawab Pertanyaan');
    $('badge-quiz').textContent = '🎮 Bagian ' + secNum('quiz') + ' · Jawab Pertanyaan';
    var q = data.quiz[state.quizIndex];
    $('quizQuestion').textContent = q.q;
    $('quizHint').textContent = q.hint;

    var opts = $('quizOptions');
    opts.innerHTML = '';
    q.options.forEach(function(opt, i){
      var b = document.createElement('button');
      b.className = 'option';
      b.innerHTML = '<span class="num">' + String.fromCharCode(65 + i) + '</span><span>' + opt + '</span>';
      b.onclick = function(){ selectOption(i, b); };
      opts.appendChild(b);
    });

    $('quizFeedback').className = 'feedback';
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
    if(state.quizAnswered){
      state.quizIndex++;
      if(state.quizIndex < data.quiz.length){
        renderQuiz();
      } else {
        goAfter('quiz');
      }
      return;
    }
    if(selectedOption === null) return;
    state.quizAnswered = true;
    var q = data.quiz[state.quizIndex];
    var allOpts = document.querySelectorAll('#quizOptions .option');
    var isCorrect = selectedOption === q.answer;
    allOpts[q.answer].classList.add('correct');
    if(!isCorrect) allOpts[selectedOption].classList.add('wrong');

    var fb = $('quizFeedback');
    fb.className = 'feedback show ' + (isCorrect ? 'correct' : 'wrong');
    $('quizFbIcon').textContent = isCorrect ? '✓' : '✗';
    $('quizFbText').textContent = isCorrect ? 'Benar! Hebat!' : 'Belum tepat. Jawaban: ' + q.options[q.answer];
    playSound(isCorrect ? 'correct' : 'wrong');
    if(isCorrect) state.correctCount++;
    $('quizBtn').textContent = state.quizIndex < data.quiz.length - 1 ? 'LANJUT' : 'SELESAI';
    $('quizBtn').disabled = false;
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
      var safeEn = String(enShown).replace(/'/g, "\\'");
      var micHtml = (d.who === 'child' && hasSpeechRec)
        ? '<button class="speak-bubble" title="Rekam suaramu" data-idx="' + idx + '">🎤</button>' : '';
      bubble.innerHTML = `
        <div class="en">${enShown}
          <button class="speak-bubble say" data-say="${safeEn}">🔊</button>
          <button class="speak-bubble say-slow" data-say="${safeEn}">🐢</button>
          ${micHtml}
        </div>
        <div class="id">${withName(d.id || '')}</div>
        <div class="dialog-speech-result" style="display:none;margin-top:6px;font-size:11px;font-weight:700;padding:6px 8px;border-radius:8px"></div>`;
      row.appendChild(avatar);
      row.appendChild(bubble);
      box.appendChild(row);
    });

    box.querySelectorAll('.say').forEach(function(b){
      b.onclick = function(){ speakText(b.getAttribute('data-say'), 'en-US', 'normal'); };
    });
    box.querySelectorAll('.say-slow').forEach(function(b){
      b.onclick = function(){ speakText(b.getAttribute('data-say'), 'en-US', 'slow'); };
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
    var resultEl = btn.closest('.bubble').querySelector('.dialog-speech-result');
    currentSpeakTarget = {
      alt: [String(en).replace(/[.,!?;:'"]/g, '')].concat(d.alt || []),
      onDone: function(correct, heard, level){
        state.speakTried++;
        if(correct) state.speakCorrect++;
        playSound(level === 'good' ? 'correct' : (level === 'almost' ? 'almost' : 'wrong'));
        if(!resultEl) return;
        resultEl.style.display = 'block';
        if(level === 'good'){
          resultEl.style.background = '#e6f9ee'; resultEl.style.color = '#3dab6e';
          resultEl.textContent = '🎉 Bagus! Pengucapan benar.';
        } else if(level === 'almost'){
          resultEl.style.background = '#fff7dd'; resultEl.style.color = '#cc7800';
          resultEl.textContent = '👍 Hampir! Kamu: "' + heard + '". Coba: "' + en + '"';
        } else {
          resultEl.style.background = '#ffe5e5'; resultEl.style.color = '#ff5a5a';
          resultEl.textContent = '🔄 Coba lagi. Kamu: "' + heard + '"';
          setTimeout(function(){ speakText(en, 'en-US', 'slow'); }, 300);
        }
      }
    };
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
    setTimeout(function(){ speakText(withName(s.en), 'en-US', 'normal'); }, 600);
  }

  function startTestMic(){
    if(!hasSpeechRec) return;
    if(isRecording){ try { recognition.stop(); } catch(e){} return; }
    var s = testSrc[state.testIndex];
    var en = withName(s.en);
    currentSlowTarget = en;
    currentSpeakTarget = {
      alt: [String(en).replace(/[.,!?;:'"]/g, '')].concat(s.alt || []),
      onDone: function(correct, heard, level){
        state.speakTried++;
        if(correct) state.speakCorrect++;
        playSound(level === 'good' ? 'correct' : (level === 'almost' ? 'almost' : 'wrong'));
        if(level === 'good'){
          showSpeechResult('good', '🎉 Bagus sekali!', heard, 'Kamu berhasil mengulang kalimatnya!', true);
          $('testNextBtn').disabled = false;
        } else if(level === 'almost'){
          showSpeechResult('almost', '👍 Hampir benar!', heard, 'Ucap ulang: "' + en + '"', false);
        } else {
          showSpeechResult('bad', '🔄 Belum tepat', heard, 'Dengar lagi 🔊, lalu ucap ulang: "' + en + '"', false);
        }
      }
    };
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
    speakText(g.say, 'en-US', speed || 'normal');
  }

  function renderGame(){
    setStepLabel('Bagian ' + secNum('game') + ' · Permainan Find It!');
    $('badge-game').textContent = '🔎 Bagian ' + secNum('game') + ' · Permainan Find It!';
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

    $('gameFeedback').className = 'feedback';
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
      var fb = $('gameFeedback');
      fb.className = 'feedback show correct';
      $('gameFbIcon').textContent = '✓';
      $('gameFbText').textContent = 'Benar! ' + (g.cheer || 'Sekarang tunjuk benda ASLI di rumahmu, ya!');
      $('gameNextBtn').disabled = false;
      speakText('Great job!', 'en-US', 'normal');
    } else {
      btn.classList.add('wrong');
      setTimeout(function(){ btn.classList.remove('wrong'); }, 700);
      playSound('wrong');
      var fb2 = $('gameFeedback');
      fb2.className = 'feedback show wrong';
      $('gameFbIcon').textContent = '✗';
      $('gameFbText').textContent = 'Belum tepat. Dengarkan lagi: ' + g.say;
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
