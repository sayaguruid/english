/* ============================================================
   Kids English — app.js   (FILE INTI — TIDAK PERLU DIUBAH)
   ------------------------------------------------------------
   Berfungsi otomatis dalam 2 mode:
   1. Di index.html       -> beranda (mencari pelajaran1.html,
      pelajaran2.html, ... otomatis lewat fetch)
   2. Di pelajaranN.html  -> pemutar pelajaran (membaca blok
      <script id="lesson-data" type="application/json">)

   Menambah pelajaran = menambah file pelajaranN.html baru.
   File ini TIDAK PERLU disentuh.
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
  var btn = $('micBtn');
  var hint = $('micHint');
  if(!btn) return;
  if(recording){
    btn.classList.add('listening');
    btn.textContent = '⏹';
    if(hint) hint.textContent = '🎙️ Mendengarkan... ucapkan sekarang!';
  } else {
    btn.classList.remove('listening');
    btn.textContent = '🎤';
    if(hint) hint.textContent = 'Tekan tombol, lalu ucapkan ungkapan di atas';
  }
}

function showSpeechResult(level, title, heard, msg, correct){
  var box = $('speechResult');
  if(!box) return;
  box.className = 'speech-result show ' + level;
  $('srTitle').textContent = title;
  $('srHeard').innerHTML = heard ? ('Kamu mengucapkan: <b>"' + heard + '"</b>') : '';
  $('srMsg').textContent = msg;
  if(!correct && currentSlowTarget) setTimeout(function(){ speakText(currentSlowTarget, 'en-US', 'slow'); }, 400);
}
var currentSlowTarget = null;

function hideSpeechResult(){
  var box = $('speechResult');
  if(box) box.classList.remove('show');
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
        <div class="footer-note">Pelajaran = file pelajaran1.html, pelajaran2.html, ...<br>Inti aplikasi (index, style.css, app.js) tidak perlu diubah.</div>
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
    </main>`;

    $('giftBtn').onclick = function(){ if(window.speechSynthesis) speechSynthesis.cancel(); renderRewards(); };
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
    renderChips();
    renderCards();
    renderNotices();
    showScreen('home');
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
    speakCorrect: 0, speakTried: 0
  };
  var selectedOption = null;

  buildLessonShell();

  /* --- Kunci: pelajaran sebelumnya harus selesai dulu --- */
  var locked = data.comingSoon === true;
  if(!locked){
    for(var i=1; i<id; i++){
      if(completedLessons.indexOf(i) < 0){ locked = true; break; }
    }
  }
  if(locked){
    $('lockReason').textContent = data.comingSoon
      ? 'Pelajaran ini masih "Segera hadir". Nantikan ya!'
      : 'Selesaikan pelajaran sebelumnya dulu, ya!';
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
          </div>
        </div>
      </section>

      <section class="screen" id="screen-welcome">
        <div class="welcome-wrap">
          <div class="welcome-card">
            <div class="welcome-illustration" id="welcomeFlag">👋</div>
            <h1 id="welcomeTitle"></h1>
            <div class="theme-pill" id="welcomeTheme"></div>
            <div class="info" id="welcomeInfo"></div>
            <p class="welcome-desc" id="welcomeDesc"></p>
            <div class="voice-badge">🎙️ Suara guru perempuan · ada mode lambat</div>
          </div>
          <div class="btn-area">
            <button class="btn btn-black" id="startLessonBtn">MULAI PELAJARAN →</button>
            <a class="btn btn-secondary" href="index.html" style="margin-top:10px;text-decoration:none">← Kembali ke beranda</a>
          </div>
        </div>
      </section>

      <section class="screen" id="screen-vocab">
        <div class="screen-pad center-content">
          <div class="section-badge">📖 Bagian 1 · Kenalkan Ungkapan</div>
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

      <section class="screen" id="screen-quiz">
        <div class="screen-pad center-content">
          <div class="section-badge">🎮 Bagian 2 · Permainan</div>
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
          <div class="section-badge">💬 Bagian 3 · Latihan Dialog</div>
          <div class="question-text">Bacakan dialog dengan ceria</div>
          <div class="question-hint">Tekan 🔊/🐢 untuk mendengar. Tekan 🎤 di bubble anak untuk merekam dan cek pengucapan.</div>
          <div class="dialog" id="dialogBox"></div>
        </div>
        <div class="btn-area screen-pad" style="padding-top:0">
          <button class="btn btn-black" id="goResultBtn">LANJUT KE EVALUASI →</button>
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
    $('quizBtn').onclick = submitQuiz;
    $('goResultBtn').onclick = showResult;
    $('restartBtn').onclick = restart;
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
    $('welcomeInfo').innerHTML = `
      <div class="info-pill">⏱️ 15 menit</div>
      <div class="info-pill">🎯 ${(data.vocab || []).length} ungkapan</div>
      <div class="info-pill">🎮 ${(data.quiz || []).length} kuis</div>
      ${hasSpeechRec ? '<div class="info-pill">🎤 cek pengucapan</div>' : ''}`;
    $('welcomeDesc').textContent = data.desc || '';
  }

  /* ---------- VOCAB ---------- */
  function startLesson(){
    state.vocabIndex = 0;
    state.speakCorrect = 0; state.speakTried = 0;
    setStepLabel('Bagian 1 · Kenalkan Ungkapan');
    setProgress(10);
    renderVocab();
    showScreen('vocab');
    setTimeout(function(){ speakCurrent('normal'); }, 600);
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

    $('vocabNextBtn').textContent = state.vocabIndex < data.vocab.length - 1 ? 'LANJUT' : 'MULAI PERMAINAN';
    setProgress(10 + (state.vocabIndex / data.vocab.length) * 20);

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
      state.quizIndex = 0; state.correctCount = 0;
      setStepLabel('Bagian 2 · Permainan');
      setProgress(35);
      renderQuiz();
      showScreen('quiz');
    }
  }

  /* ---------- QUIZ ---------- */
  function renderQuiz(){
    state.quizAnswered = false;
    selectedOption = null;
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
    setProgress(35 + (state.quizIndex / data.quiz.length) * 40);
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
        setStepLabel('Bagian 3 · Latihan Dialog');
        setProgress(80);
        renderDialog();
        showScreen('dialog');
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
    if(isCorrect) state.correctCount++;
    $('quizBtn').textContent = state.quizIndex < data.quiz.length - 1 ? 'LANJUT' : 'SELESAI';
    $('quizBtn').disabled = false;
  }

  /* ---------- DIALOG ---------- */
  function renderDialog(){
    var box = $('dialogBox');
    box.innerHTML = '';
    (data.dialog || []).forEach(function(d, idx){
      var row = document.createElement('div');
      row.className = 'bubble-row' + (d.who === 'child' ? ' right' : '');
      var avatar = document.createElement('div');
      avatar.className = 'avatar ' + d.who;
      avatar.textContent = d.who === 'parent' ? '👨' : '🧒';
      var bubble = document.createElement('div');
      bubble.className = 'bubble';
      var safeEn = String(d.en).replace(/'/g, "\\'");
      var micHtml = (d.who === 'child' && hasSpeechRec)
        ? '<button class="speak-bubble" title="Rekam suaramu" data-idx="' + idx + '">🎤</button>' : '';
      bubble.innerHTML = `
        <div class="en">${d.en}
          <button class="speak-bubble say" data-say="${safeEn}">🔊</button>
          <button class="speak-bubble say-slow" data-say="${safeEn}">🐢</button>
          ${micHtml}
        </div>
        <div class="id">${d.id}</div>
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
      b.onclick = function(){ startDialogSpeak(parseInt(b.getAttribute('data-idx'), 10), b); };
    });
  }

  function startDialogSpeak(idx, btn){
    if(!hasSpeechRec) return;
    if(isRecording){ try { recognition.stop(); } catch(e){} return; }
    var d = data.dialog[idx];
    currentSlowTarget = d.en;
    var resultEl = btn.closest('.bubble').querySelector('.dialog-speech-result');
    currentSpeakTarget = {
      alt: [String(d.en).replace(/[.,!?;:'"]/g, '')].concat(d.alt || []),
      onDone: function(correct, heard, level){
        if(!resultEl) return;
        resultEl.style.display = 'block';
        if(level === 'good'){
          resultEl.style.background = '#e6f9ee'; resultEl.style.color = '#3dab6e';
          resultEl.textContent = '🎉 Bagus! Pengucapan benar.';
        } else if(level === 'almost'){
          resultEl.style.background = '#fff7dd'; resultEl.style.color = '#cc7800';
          resultEl.textContent = '👍 Hampir! Kamu: "' + heard + '". Coba: "' + d.en + '"';
        } else {
          resultEl.style.background = '#ffe5e5'; resultEl.style.color = '#ff5a5a';
          resultEl.textContent = '🔄 Coba lagi. Kamu: "' + heard + '"';
          setTimeout(function(){ speakText(d.en, 'en-US', 'slow'); }, 300);
        }
      }
    };
    toggleMic();
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

    var emoji, title, msg;
    if(ratio === 1){ emoji = '🏆'; title = 'Sempurna!'; msg = 'Luar biasa! Anak sudah menguasai semua ungkapan hari ini.'; }
    else if(ratio >= 0.5){ emoji = '🎉'; title = 'Hebat!'; msg = 'Bagus sekali! Sedikit lagi menuju sempurna. Ulangi permainan untuk hasil lebih baik.'; }
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
    selectedOption = null;
    setProgress(0);
    fillWelcome();
    showScreen('welcome');
  }
}
})();
