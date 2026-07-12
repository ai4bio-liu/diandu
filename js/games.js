/* 游乐场 — practice games built from each child's tricky characters.
   Every answer feeds the difficulty engine (Store.logQuiz), so playing
   directly updates mastery — games are the "consolidate" half of the loop. */
(function () {
  const Store = window.DIANDU_STORE;
  const TTS = window.DIANDU_TTS;
  const UI = window.DIANDU_UI;
  const { app, esc, topbar, bindNav, toast, VIEWS } = UI;

  const MIN_CHARS = 6;

  function needMoreNote() {
    return `<div class="stage celebrate">
      <div class="stars">📖</div>
      <h2>先去读一个故事吧！</h2>
      <p class="sub">游乐场用你点读过的字来出题。<br>
        <small>Games are built from characters you've tapped — read a story first, then come play.</small></p>
      <div class="reader-nav" style="max-width:300px;margin:26px auto 0">
        <button class="nav-btn go" data-nav="library">去书架 →</button>
      </div></div>`;
  }

  /* ================= playground hub ================= */
  function viewPlay() {
    const p = Store.current();
    if (!p) return VIEWS.profiles();
    const pool = Store.practicePool(p.id, 12);
    const stars = Store.stars(p.id);

    app.innerHTML = `
      ${topbar("play")}
      <div class="play-head">
        <h2 class="play-title">游乐场 <small>Playground</small></h2>
        <span class="level-pill">第${Store.currentLevel(p.id)}级</span>
        <span class="star-count">⭐ ${stars}</span>
      </div>
      ${pool.length < MIN_CHARS ? needMoreNote() : `
      <p class="import-note" style="margin-bottom:18px">今天练这些字：
        ${pool.slice(0, 8).map(r => `<span class="pool-chip">${esc(r.ch)}</span>`).join("")}
      </p>
      <div class="game-grid">
        <button class="game-card" data-game="bubble">
          <span class="gi">🫧</span>
          <span class="gt">泡泡点字</span>
          <span class="gd">听声音，戳破正确的泡泡！<br><small>Hear it, pop it</small></span>
        </button>
        <button class="game-card" data-game="match">
          <span class="gi">🎴</span>
          <span class="gt">翻牌配对</span>
          <span class="gd">给汉字找到它的拼音朋友<br><small>Match character & pinyin</small></span>
        </button>
        <button class="game-card magic" data-game="magic">
          <span class="gi">✨</span>
          <span class="gt">魔法故事屋</span>
          <span class="gd">AI 用你正在学的字写新故事<br><small>New stories from your characters</small></span>
        </button>
      </div>`}`;
    bindNav();
    app.querySelectorAll("[data-game]").forEach(b => b.addEventListener("click", () => {
      const g = b.dataset.game;
      if (g === "bubble") startBubble();
      else if (g === "match") startMatch();
      else if (g === "magic") VIEWS.magic();
    }));
  }

  function endScreen(title, sub, earned, replay) {
    const p = Store.current();
    const total = Store.addStars(p.id, earned);
    app.innerHTML = `
      ${topbar("play")}
      <div class="stage celebrate">
        <div class="stars">🎉</div>
        <h2>${title}</h2>
        <p class="sub">${sub}</p>
        <div class="stat-row">
          <div class="stat-box"><div class="n">+${earned} ⭐</div><div class="l">这一局</div></div>
          <div class="stat-box"><div class="n">${total} ⭐</div><div class="l">一共</div></div>
        </div>
        <div class="reader-nav" style="max-width:440px;margin:30px auto 0">
          <button class="nav-btn" id="again">再玩一次</button>
          <button class="nav-btn go" data-nav="play">回游乐场 →</button>
        </div>
      </div>`;
    bindNav();
    app.querySelector("#again").addEventListener("click", replay);
  }

  const shuffle = a => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

  /* ================= 泡泡点字 (bubble pop) ================= */
  function startBubble() {
    const p = Store.current();
    const pool = Store.practicePool(p.id, 12);
    if (pool.length < MIN_CHARS) return viewPlay();
    const ROUNDS = Math.min(8, pool.length);
    const targets = shuffle(pool).slice(0, ROUNDS);
    let round = 0, stars = 0, busy = false;

    function render() {
      const target = targets[round];
      const distractors = shuffle(pool.filter(r => r.ch !== target.ch)).slice(0, 4);
      const bubbles = shuffle([target, ...distractors]);

      app.innerHTML = `
        ${topbar("play")}
        <div class="reader-top">
          <button class="chip-btn" data-nav="play">← 游乐场</button>
          <span class="title" style="font-family:var(--display);font-size:19px;font-weight:600">🫧 泡泡点字</span>
          <span class="pageno">${round + 1} / ${ROUNDS}</span>
          <span class="spacer" style="flex:1"></span>
          <span class="star-count">⭐ ${stars}</span>
        </div>
        <div class="stage bubble-stage">
          <div class="bubble-sky" id="sky">
            ${bubbles.map((b, i) => `
              <button class="bubble b${i}" data-ch="${esc(b.ch)}" aria-label="泡泡 ${esc(b.ch)}"
                style="left:${8 + i * 18}%;animation-delay:${(i * .7).toFixed(1)}s;animation-duration:${(5 + (i % 3)).toFixed(1)}s">
                ${esc(b.ch)}</button>`).join("")}
          </div>
          <div class="page-tools" style="justify-content:center;padding-bottom:22px">
            <button class="speak-btn" id="hear" style="font-size:16px">🔊 哪个是 “${esc(target.py)}”？</button>
          </div>
        </div>`;
      bindNav();

      const speak = () => TTS.speak(target.ch, 0.65);
      speak();
      app.querySelector("#hear").addEventListener("click", speak);

      app.querySelectorAll(".bubble").forEach(el => el.addEventListener("click", () => {
        if (busy) return;
        const ch = el.dataset.ch;
        if (ch === target.ch) {
          busy = true;
          el.classList.add("pop");
          Store.logQuiz(p.id, ch, true);
          stars++;
          TTS.speak(ch, 0.7);
          setTimeout(() => {
            busy = false;
            if (++round < ROUNDS) render();
            else endScreen("泡泡全戳完啦！", `你听出了 ${stars} 个字的声音`, stars, startBubble);
          }, 550);
        } else {
          el.classList.add("wrong");
          Store.logQuiz(p.id, ch, false);
          setTimeout(() => el.classList.remove("wrong"), 500);
        }
      }));
    }
    render();
  }

  /* ================= 翻牌配对 (memory match) ================= */
  function startMatch() {
    const p = Store.current();
    const pool = Store.practicePool(p.id, 12);
    if (pool.length < MIN_CHARS) return viewPlay();
    const chars = shuffle(pool).slice(0, 6);
    const cards = shuffle([
      ...chars.map(r => ({ key: r.ch, kind: "hz", label: r.ch })),
      ...chars.map(r => ({ key: r.ch, kind: "py", label: r.py })),
    ]);
    let open = [], matched = 0, moves = 0, busy = false;

    function render() {
      app.innerHTML = `
        ${topbar("play")}
        <div class="reader-top">
          <button class="chip-btn" data-nav="play">← 游乐场</button>
          <span class="title" style="font-family:var(--display);font-size:19px;font-weight:600">🎴 翻牌配对</span>
          <span class="pageno" id="moves">翻了 0 次</span>
        </div>
        <div class="stage" style="padding:22px">
          <div class="card-grid">
            ${cards.map((c, i) => `
              <button class="flip-card" data-i="${i}" aria-label="卡片">
                <span class="face back">读</span>
                <span class="face front ${c.kind}">${esc(c.label)}</span>
              </button>`).join("")}
          </div>
        </div>`;
      bindNav();
      app.querySelectorAll(".flip-card").forEach(el => el.addEventListener("click", () => flip(el)));
    }

    function flip(el) {
      if (busy || el.classList.contains("open") || el.classList.contains("done")) return;
      const i = +el.dataset.i;
      el.classList.add("open");
      open.push({ el, card: cards[i] });
      if (cards[i].kind === "hz") TTS.speak(cards[i].label, 0.75);
      if (open.length < 2) return;

      moves++;
      app.querySelector("#moves").textContent = `翻了 ${moves} 次`;
      const [a, b] = open;
      open = [];
      if (a.card.key === b.card.key && a.card.kind !== b.card.kind) {
        a.el.classList.add("done"); b.el.classList.add("done");
        Store.logQuiz(p.id, a.card.key, true);
        matched++;
        if (matched === chars.length) {
          const earned = Math.max(2, 9 - Math.floor((moves - chars.length) / 2));
          setTimeout(() => endScreen("全部配对成功！", `${moves} 次就翻完了 ${chars.length} 对`, earned, startMatch), 600);
        }
      } else {
        busy = true;
        setTimeout(() => { a.el.classList.remove("open"); b.el.classList.remove("open"); busy = false; }, 900);
      }
    }
    render();
  }

  VIEWS.play = viewPlay;
})();
