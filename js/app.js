/* 点读 DianDu — app shell, views, and the tap-to-read reader. */
(function () {
  const Store = window.DIANDU_STORE;
  const TTS = window.DIANDU_TTS;
  const ANN = window.DIANDU_ANNOTATE;
  const ART = window.DIANDU_ART || {};
  const STORIES = window.DIANDU_STORIES || [];

  const app = document.getElementById("app");
  const esc = s => String(s).replace(/[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const AVATARS = ["🐼", "🐯", "🐰", "🐸", "🦊", "🐵", "🐲", "🦄", "🐳", "🦉", "🐱", "🐶"];
  const BANDS = { 1: "4–7 岁", 2: "8–12 岁", 3: "13–18 岁" };
  const importArt = `
    <svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="240" fill="#EAE2CE"/>
      <rect x="80" y="40" width="240" height="160" rx="8" fill="#F8F4E8" stroke="#C8B88A" stroke-width="3"/>
      <g stroke="#C8B88A" stroke-width="4" stroke-linecap="round">
        <path d="M110 80 h180 M110 110 h180 M110 140 h120"/></g>
      <text x="252" y="182" font-size="44" font-family="Kaiti SC,STKaiti,serif" fill="#B93A28">读</text>
    </svg>`;

  function toast(msg) {
    document.querySelectorAll(".toast").forEach(t => t.remove());
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  function topbar(active) {
    const p = Store.current();
    return `
      <div class="topbar">
        <button class="brand" data-nav="library">点读<small>DianDu</small></button>
        <span class="spacer"></span>
        ${p ? `
          <button class="chip-btn ${active === "play" ? "primary" : ""}" data-nav="play">🎮 游乐场</button>
          <button class="chip-btn ${active === "dash" ? "primary" : ""}" data-nav="dash">📚 我的汉字</button>
          <button class="chip-btn ${active === "import" ? "primary" : ""}" data-nav="import">📥 导入故事</button>
          <button class="chip-btn" data-nav="profiles" title="换小朋友">
            <span class="avatar">${p.avatar}</span> ${esc(p.name)}
          </button>` : ""}
      </div>`;
  }

  function bindNav() {
    app.querySelectorAll("[data-nav]").forEach(el =>
      el.addEventListener("click", () => VIEWS[el.dataset.nav]()));
  }

  /* ================= profiles ================= */
  function viewProfiles() {
    const profiles = Store.profiles();
    app.innerHTML = `
      ${topbar()}
      <p class="hero-note">谁来读故事？ <b>Who's reading today?</b><br>
      Tap any character in a story to hear it — the app learns which ones are hard for you.</p>
      <div class="profile-grid">
        ${profiles.map(p => `
          <button class="profile-card" data-pid="${p.id}">
            <span class="avatar">${p.avatar}</span>
            <span class="name">${esc(p.name)}</span>
            <span class="meta">${BANDS[p.band]}</span>
          </button>`).join("")}
        <button class="profile-card new" data-new="1">
          <span class="avatar">＋</span>
          <span class="name">新朋友</span>
          <span class="meta">New reader</span>
        </button>
      </div>`;
    bindNav();
    app.querySelectorAll("[data-pid]").forEach(el =>
      el.addEventListener("click", () => { Store.setCurrent(el.dataset.pid); viewLibrary(); }));
    app.querySelector("[data-new]").addEventListener("click", viewNewProfile);
  }

  function viewNewProfile() {
    let avatar = AVATARS[0], band = 1;
    app.innerHTML = `
      ${topbar()}
      <div class="form-card">
        <h2>新朋友，你好！ 👋</h2>
        <label class="form-label" for="np-name">名字 · Name</label>
        <input id="np-name" class="text-input" maxlength="12" placeholder="小明 / Mia…">
        <label class="form-label">选一个小伙伴 · Pick a buddy</label>
        <div class="avatar-grid">
          ${AVATARS.map((a, i) => `<button data-av="${a}" class="${i === 0 ? "sel" : ""}">${a}</button>`).join("")}
        </div>
        <label class="form-label">年龄 · Age</label>
        <div class="band-row">
          <button data-band="1" class="sel">4–7<small>拼音帮手全开</small></button>
          <button data-band="2">8–12<small>点一下看拼音</small></button>
          <button data-band="3">13–18<small>进阶阅读</small></button>
        </div>
        <button class="btn-primary" id="np-go">开始读书 · Start reading</button>
        <button class="btn-quiet" data-nav="profiles">返回 · Back</button>
      </div>`;
    bindNav();
    app.querySelectorAll("[data-av]").forEach(b => b.addEventListener("click", () => {
      app.querySelectorAll("[data-av]").forEach(x => x.classList.remove("sel"));
      b.classList.add("sel"); avatar = b.dataset.av;
    }));
    app.querySelectorAll("[data-band]").forEach(b => b.addEventListener("click", () => {
      app.querySelectorAll("[data-band]").forEach(x => x.classList.remove("sel"));
      b.classList.add("sel"); band = +b.dataset.band;
    }));
    app.querySelector("#np-go").addEventListener("click", () => {
      const name = app.querySelector("#np-name").value.trim() || "小读者";
      const prof = Store.addProfile(name, avatar, band);
      Store.setCurrent(prof.id);
      toast(`${avatar} 欢迎你，${name}！`);
      viewLibrary();
    });
  }

  /* ================= library ================= */
  let libTab = "all";
  function viewLibrary() {
    const p = Store.current();
    if (!p) return viewProfiles();
    const imports = Store.imports(p.id);
    const pool = [...imports, ...STORIES];
    const shown = pool.filter(s =>
      libTab === "all" ? true :
      libTab === "mine" ? s.imported :
      s.band === +libTab && !s.imported);

    const card = s => {
      const pct = Store.knownPct(p.id, s);
      const prog = Store.progress(p.id)[s.id];
      return `
        <button class="story-card" data-story="${s.id}">
          ${s.imported ? importArt : (ART[s.id] || importArt)}
          <div class="body">
            <div class="t">${esc(s.title)}</div>
            <div class="tp">${esc(s.titlePy)}</div>
            <div class="te">${esc(s.en)}${prog && prog.done ? " · ⭐ 读完啦" : ""}</div>
            <div class="row">
              <span class="badge ${s.imported ? "imp" : "b" + s.band}">${s.imported ? "我的" : BANDS[s.band]}</span>
              <span class="knowbar"><i style="width:${pct}%"></i></span>
              <span class="pct">认识 ${pct}%</span>
            </div>
          </div>
        </button>`;
    };

    app.innerHTML = `
      ${topbar()}
      <div class="tabs">
        ${[["all", "全部"], ["1", "4–7 岁"], ["2", "8–12 岁"], ["3", "13–18 岁"], ["mine", "我导入的"]]
          .map(([k, l]) => `<button class="tab ${libTab === k ? "sel" : ""}" data-tab="${k}">${l}</button>`).join("")}
      </div>
      <div class="story-grid">${shown.map(card).join("") ||
        `<p class="empty-note">这里还没有故事 — 点上面的 “导入故事” 加一个吧！</p>`}</div>`;
    bindNav();
    app.querySelectorAll("[data-tab]").forEach(b =>
      b.addEventListener("click", () => { libTab = b.dataset.tab; viewLibrary(); }));
    app.querySelectorAll("[data-story]").forEach(b =>
      b.addEventListener("click", () => {
        const s = pool.find(x => x.id === b.dataset.story);
        if (s) openReader(s);
      }));
  }

  /* ================= reader ================= */
  function openReader(story) {
    const p = Store.current();
    const saved = Store.progress(p.id)[story.id];
    const state = {
      story, page: (saved && !saved.done && saved.page) || 0,
      tappedThisVisit: new Set(), passedPages: new Set(),
      newTaps: 0, pinyinAll: p.band === 1,
    };

    function pageChars(idx) {
      const out = [];
      for (const tok of story.paras[idx]) {
        if (typeof tok === "string") continue;
        [...tok[0]].forEach((ch, i) => out.push({ ch, py: tok[1][i], word: tok[0], wordPy: tok[1].join(" ") }));
      }
      return out;
    }

    function markPasses(idx) {
      if (state.passedPages.has(idx)) return;
      state.passedPages.add(idx);
      for (const c of pageChars(idx)) {
        if (!state.tappedThisVisit.has(idx + ":" + c.ch)) Store.logPass(p.id, c.ch);
      }
    }

    function render() {
      const total = story.paras.length;
      const idx = state.page;
      const paraText = story.paras[idx].map(t => typeof t === "string" ? t : t[0]).join("");

      let charSeq = 0;
      const tokensHtml = story.paras[idx].map(tok => {
        if (typeof tok === "string") return `<span class="punct">${esc(tok)}</span>`;
        return [...tok[0]].map((ch, i) => {
          const key = idx + ":" + ch;
          const tapped = state.tappedThisVisit.has(key);
          return `<span class="zi ${tapped ? "tapped show-py" : ""}" role="button" tabindex="0"
              data-i="${charSeq++}" data-ch="${esc(ch)}" data-py="${esc(tok[1][i])}"
              data-word="${esc(tok[0])}" data-wordpy="${esc(tok[1].join(" "))}"
              aria-label="${esc(ch)}, 点一下听发音">
            <span class="py">${esc(tok[1][i])}</span><span class="hz">${esc(ch)}</span>
          </span>`;
        }).join("");
      }).join("");

      app.innerHTML = `
        ${topbar()}
        <div class="reader-top">
          <button class="chip-btn" data-nav="library">← 书架</button>
          <span class="title">${esc(story.title)}</span>
          <span class="pageno">${idx + 1} / ${total} 页</span>
          <span class="spacer" style="flex:1"></span>
          <button class="toggle ${state.pinyinAll ? "on" : ""}" id="py-toggle">拼音 ${state.pinyinAll ? "开" : "关"}</button>
        </div>
        <div class="stage">
          <div class="art">${window.DIANDU_ART_PAGE(story.id, idx, total) || ART[story.id] || importArt}</div>
          <div class="page-text ${state.pinyinAll ? "all-py" : ""}">${tokensHtml}</div>
          <div class="page-tools">
            <button class="speak-btn" id="speak-para">🔊 读这一页</button>
          </div>
        </div>
        <div class="reader-nav">
          <button class="nav-btn" id="prev" ${idx === 0 ? "disabled" : ""}>← 上一页</button>
          <button class="nav-btn go" id="next">${idx === total - 1 ? "读完啦 ⭐" : "下一页 →"}</button>
        </div>
        <div class="dots">${story.paras.map((_, i) => `<i class="${i === idx ? "on" : ""}"></i>`).join("")}</div>`;
      bindNav();

      app.querySelector("#py-toggle").addEventListener("click", () => {
        state.pinyinAll = !state.pinyinAll; render();
      });
      app.querySelector("#speak-para").addEventListener("click", () => TTS.speak(paraText, 0.75));
      app.querySelector("#prev").addEventListener("click", () => {
        if (state.page > 0) { markPasses(state.page); state.page--; render(); }
      });
      app.querySelector("#next").addEventListener("click", () => {
        markPasses(state.page);
        if (state.page < total - 1) {
          state.page++;
          Store.setProgress(p.id, story.id, { page: state.page });
          render();
        } else {
          Store.setProgress(p.id, story.id, { done: true, page: 0 });
          renderCelebration();
        }
      });

      const tap = el => {
        const { ch, py, word, wordpy } = el.dataset;
        state.tappedThisVisit.add(idx + ":" + ch);
        if (!el.classList.contains("tapped")) state.newTaps++;
        el.classList.add("tapped", "show-py");
        Store.logTap(p.id, ch);
        TTS.speak(ch, 0.7);
        openSheet({ ch, py, word, wordPy: wordpy });
      };
      app.querySelectorAll(".zi").forEach(el => {
        el.addEventListener("click", () => tap(el));
        el.addEventListener("keydown", e => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(el); }
        });
      });
    }

    function renderCelebration() {
      const uniq = story.uniqueChars || 0;
      app.innerHTML = `
        ${topbar()}
        <div class="stage celebrate">
          <div class="stars">⭐ 🎉 ⭐</div>
          <h2>读完啦！</h2>
          <p class="sub">${esc(story.title)} · ${esc(story.en)}</p>
          ${story.moral ? `<p class="moral">💡 ${esc(story.moral)}</p>` : ""}
          <div class="stat-row">
            <div class="stat-box"><div class="n">${story.charCount || "–"}</div><div class="l">读过的字</div></div>
            <div class="stat-box"><div class="n">${uniq}</div><div class="l">不同的字</div></div>
            <div class="stat-box"><div class="n">${state.newTaps}</div><div class="l">点读了</div></div>
          </div>
          <div class="reader-nav" style="max-width:440px;margin:30px auto 0">
            <button class="nav-btn" id="again">再读一遍</button>
            <button class="nav-btn go" data-nav="library">回书架 →</button>
          </div>
        </div>`;
      bindNav();
      app.querySelector("#again").addEventListener("click", () => {
        state.page = 0; state.newTaps = 0; state.tappedThisVisit.clear();
        state.passedPages.clear(); render();
      });
    }

    render();
  }

  /* ================= char sheet ================= */
  function openSheet(c) {
    const p = Store.current();
    const info = ANN.charInfo(c.ch);
    const wordInfo = c.word && c.word.length > 1 ? ANN.wordInfo(c.word) : null;
    const s = Store.stats(p.id)[c.ch] || { t: 0, p: 0 };
    const m = Store.mastery(p.id, c.ch);
    const bucket = Store.bucket(m);
    const pillText = ["要多练 💪", "学习中 🌱", "认识啦 ⭐"][bucket];
    const readings = info && info.readings.length > 1
      ? `也读: ${info.readings.filter(r => r !== c.py).join(", ")}` : "";

    const veil = document.createElement("div");
    veil.className = "sheet-veil";
    veil.innerHTML = `
      <div class="sheet" role="dialog" aria-label="汉字 ${esc(c.ch)}">
        <div class="sheet-head">
          <div class="tzg">${esc(c.ch)}</div>
          <div class="info">
            <div class="py-big">${esc(c.py)}</div>
            <div class="gloss">${esc(info ? info.gloss : "")} ${readings ? `<small style="color:var(--ink-faint)">· ${esc(readings)}</small>` : ""}</div>
            <div class="stats">点读 ${s.t + 1} 次
              <span class="mastery-pill m${bucket}">${pillText}</span></div>
          </div>
        </div>
        ${c.word && c.word.length > 1 ? `
          <div class="word-chip">
            <span class="w">${esc(c.word)}</span>
            <span class="wp">${esc(c.wordPy || (wordInfo && wordInfo.py) || "")}</span>
            ${wordInfo ? `<span class="wg">${esc(wordInfo.gloss)}</span>` : ""}
          </div>` : ""}
        <div class="sheet-actions">
          <button class="speak-btn" id="sh-char">🔊 读字 ${esc(c.ch)}</button>
          ${c.word && c.word.length > 1 ? `<button class="speak-btn" id="sh-word">🔊 读词 ${esc(c.word)}</button>` : ""}
        </div>
      </div>`;
    document.body.appendChild(veil);
    veil.addEventListener("click", e => { if (e.target === veil) veil.remove(); });
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") { veil.remove(); document.removeEventListener("keydown", onEsc); }
    });
    veil.querySelector("#sh-char").addEventListener("click", () => TTS.speak(c.ch, 0.7));
    const w = veil.querySelector("#sh-word");
    if (w) w.addEventListener("click", () => TTS.speak(c.word, 0.7));
  }

  /* ================= dashboard ================= */
  function viewDash() {
    const p = Store.current();
    if (!p) return viewProfiles();
    const rows = Store.report(p.id);
    const counts = [0, 0, 0];
    rows.forEach(r => counts[Store.bucket(r.mastery)]++);
    const barColor = b => ["var(--cinnabar)", "var(--amber)", "var(--jade)"][b];

    app.innerHTML = `
      ${topbar("dash")}
      <div class="sum-row">
        <div class="sum-card jade"><div class="n">${counts[2]}</div><div class="l">认识啦 · Mastered</div></div>
        <div class="sum-card amber"><div class="n">${counts[1]}</div><div class="l">学习中 · Learning</div></div>
        <div class="sum-card red"><div class="n">${counts[0]}</div><div class="l">要多练 · Tricky</div></div>
      </div>
      <div class="section-h">我的汉字 · 最难的排前面 (hardest first)</div>
      ${rows.length ? rows.slice(0, 200).map(r => `
        <button class="char-row" data-ch="${esc(r.ch)}" data-py="${esc(r.py)}">
          <span class="c">${esc(r.ch)}</span>
          <span class="p">${esc(r.py)}</span>
          <span class="g">${esc(r.gloss)}</span>
          <span class="bar"><i style="width:${Math.round(r.mastery * 100)}%;background:${barColor(Store.bucket(r.mastery))}"></i></span>
          <span class="t">${r.taps} 次点读</span>
        </button>`).join("")
        : `<p class="empty-note">还没有记录 — 去读一个故事，点点看不认识的字！<br>
           <small>No characters yet — read a story and tap the ones you don't know.</small></p>`}`;
    bindNav();
    app.querySelectorAll(".char-row").forEach(el =>
      el.addEventListener("click", () => {
        TTS.speak(el.dataset.ch, 0.7);
        openSheet({ ch: el.dataset.ch, py: el.dataset.py, word: el.dataset.ch });
      }));
  }

  /* ================= import ================= */
  function viewImport() {
    const p = Store.current();
    if (!p) return viewProfiles();
    app.innerHTML = `
      ${topbar("import")}
      <div class="form-card" style="max-width:640px">
        <h2>📥 导入新故事</h2>
        <p class="import-note">Paste any Chinese story — from a website, an e-book, or typed from a
        paper book. DianDu will split it into words and add pinyin automatically.
        <em>(Photo/OCR import arrives in Phase&nbsp;2.)</em></p>
        <label class="form-label" for="imp-title">题目 · Title</label>
        <input id="imp-title" class="text-input" maxlength="20" placeholder="小红帽">
        <label class="form-label" for="imp-text">故事 · Story text</label>
        <textarea id="imp-text" class="text-input" rows="9"
          placeholder="从前，有一个小女孩……&#10;&#10;(one paragraph per line — each line becomes a page)"></textarea>
        <button class="btn-primary" id="imp-go">变成点读故事 ✨</button>
        <button class="btn-quiet" data-nav="library">返回书架</button>
      </div>`;
    bindNav();
    app.querySelector("#imp-go").addEventListener("click", () => {
      const title = app.querySelector("#imp-title").value.trim();
      const text = app.querySelector("#imp-text").value.trim();
      if (!/[一-鿿]/.test(text)) { toast("请粘贴中文故事 — paste some Chinese text first"); return; }
      const story = ANN.makeStory(title, text, Store.current().band);
      Store.addImport(p.id, story);
      toast("✨ 新故事做好了！");
      openReader(story);
    });
  }

  /* ================= boot ================= */
  const VIEWS = { profiles: viewProfiles, library: viewLibrary, dash: viewDash, import: viewImport };

  /* Shared UI surface for add-on modules (games.js, genstory.js) — they
     register their views into VIEWS and reuse these helpers. */
  window.DIANDU_UI = { app, esc, topbar, bindNav, toast, openSheet, openReader, VIEWS, BANDS };

  /* Boot after all modules have registered (scripts load in order). */
  window.addEventListener("DOMContentLoaded", () => {
    if (Store.current()) viewLibrary(); else viewProfiles();
  });
})();
