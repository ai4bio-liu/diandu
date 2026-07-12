/* 魔法故事屋 — AI story generation targeting the child's tricky characters.
   Calls the Claude API directly from the browser (raw HTTP — this app is
   zero-build JS). The parent's API key lives ONLY in this device's
   localStorage, entered behind a parent gate; it is never in the repo or
   sent anywhere except api.anthropic.com.

   Design (from the DianDu design doc):
   - target chars   = practicePool (most-tapped / weakest)
   - allowed chars  = child's known set ∪ most-common corpus chars ∪ targets
   - the MODEL drafts; CODE validates the vocabulary constraint & coverage,
     with one retry carrying the violation feedback. */
(function () {
  const Store = window.DIANDU_STORE;
  const ANN = window.DIANDU_ANNOTATE;
  const DICT = window.DIANDU_DICT || { chars: {} };
  const UI = window.DIANDU_UI;
  const { app, esc, topbar, bindNav, toast, openReader, VIEWS } = UI;

  const MODEL = "claude-opus-4-8";
  const DAILY_LIMIT = 8;
  const HAN = /[一-鿿]/g;

  const THEMES = [
    ["🦖", "恐龙"], ["🚀", "太空"], ["🐱", "小猫"], ["🐳", "海洋"],
    ["🌲", "森林"], ["🤖", "机器人"], ["👸", "公主"], ["🍜", "美食"],
  ];

  const STORY_SCHEMA = {
    type: "object",
    properties: {
      title: { type: "string", description: "故事题目，2-6个汉字" },
      pages: { type: "array", items: { type: "string" }, description: "每页一到两句话" },
      moral: { type: "string", description: "一句给孩子的话（中文）" },
    },
    required: ["title", "pages", "moral"],
    additionalProperties: false,
  };

  /* ---------- common-character floor: top-N by corpus rank ---------- */
  let commonCache = null;
  function commonChars(n) {
    if (!commonCache) {
      commonCache = Object.entries(DICT.chars)
        .sort((a, b) => a[1][2] - b[1][2]).map(e => e[0]);
    }
    return new Set(commonCache.slice(0, n));
  }

  /* ---------- parent gate + key setup ---------- */
  function viewKeySetup() {
    const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 5);
    app.innerHTML = `
      ${topbar("play")}
      <div class="form-card">
        <h2>🔐 家长设置 · Grown-ups only</h2>
        <p class="import-note">Story magic uses the Claude AI service, which needs your own
        Anthropic API key (from <b>console.anthropic.com</b>). The key is stored only on this
        device and is used only to write stories. Each story costs a fraction of a cent.</p>
        <label class="form-label">先回答：${a} × ${b} = ?</label>
        <input class="text-input" id="gate" inputmode="numeric" placeholder="?">
        <label class="form-label" for="key-in">API Key</label>
        <input class="text-input" id="key-in" type="password" placeholder="sk-ant-...">
        <button class="btn-primary" id="key-save">保存 · Save</button>
        <button class="btn-quiet" data-nav="play">返回</button>
      </div>`;
    bindNav();
    app.querySelector("#key-save").addEventListener("click", () => {
      if (+app.querySelector("#gate").value !== a * b) { toast("再算一算 🤔"); return; }
      const k = app.querySelector("#key-in").value.trim();
      if (!k.startsWith("sk-ant")) { toast("这不像一个 Anthropic API key"); return; }
      Store.setApiKey(k);
      toast("✅ 设置好了");
      viewMagic();
    });
  }

  /* ---------- theme picker ---------- */
  function viewMagic() {
    const p = Store.current();
    if (!p) return VIEWS.profiles();
    if (!Store.apiKey()) return viewKeySetup();

    const targets = Store.practicePool(p.id, 6);
    if (targets.length < 3) {
      app.innerHTML = `${topbar("play")}
        <div class="stage celebrate"><div class="stars">📖</div>
        <h2>先去点读几个字！</h2>
        <p class="sub">魔法故事屋需要知道你在学哪些字。</p>
        <div class="reader-nav" style="max-width:300px;margin:26px auto 0">
          <button class="nav-btn go" data-nav="library">去书架 →</button></div></div>`;
      bindNav(); return;
    }
    const left = DAILY_LIMIT - Store.genToday();

    app.innerHTML = `
      ${topbar("play")}
      <div class="reader-top">
        <button class="chip-btn" data-nav="play">← 游乐场</button>
        <span class="title" style="font-family:var(--display);font-size:19px;font-weight:600">✨ 魔法故事屋</span>
        <span class="spacer" style="flex:1"></span>
        <button class="chip-btn" id="key-edit" title="家长设置">🔐</button>
      </div>
      <div class="stage" style="padding:26px">
        <p style="max-width:none">新故事会用到你正在学的字：
          ${targets.map(t => `<span class="pool-chip">${esc(t.ch)}</span>`).join("")}
        </p>
        <label class="form-label" style="margin-top:20px">选一个主题 · Pick a theme</label>
        <div class="theme-grid">
          ${THEMES.map(([e, t], i) => `<button class="theme-card ${i === 0 ? "sel" : ""}" data-theme="${t}">
            <span class="te">${e}</span><span class="tt">${t}</span></button>`).join("")}
        </div>
        <label class="form-label" style="margin-top:18px" for="hero">主角的名字（可以不填）</label>
        <input class="text-input" id="hero" maxlength="6" placeholder="小明 / 圆圆 …" style="max-width:280px">
        <button class="btn-primary" id="go" style="max-width:380px;display:block" ${left <= 0 ? "disabled" : ""}>
          ${left > 0 ? "变出新故事 ✨" : "今天的魔法用完啦，明天再来！"}</button>
        <p class="import-note">今天还能变 ${Math.max(0, left)} 个故事</p>
      </div>`;
    bindNav();
    app.querySelector("#key-edit").addEventListener("click", viewKeySetup);
    let theme = THEMES[0][1];
    app.querySelectorAll(".theme-card").forEach(el => el.addEventListener("click", () => {
      app.querySelectorAll(".theme-card").forEach(x => x.classList.remove("sel"));
      el.classList.add("sel"); theme = el.dataset.theme;
    }));
    app.querySelector("#go").addEventListener("click", () => {
      const hero = app.querySelector("#hero").value.trim();
      generate(p, targets, theme, hero);
    });
  }

  /* ---------- generation + validation ---------- */
  function buildPrompt(p, targets, theme, hero, feedback) {
    const known = Store.knownChars(p.id);
    const floor = p.band === 1 ? 500 : p.band === 2 ? 1200 : 2500;
    const allowed = [...new Set([...commonChars(floor), ...known, ...targets.map(t => t.ch)])];
    const lenHint = p.band === 1 ? "8到10页，每页一句话，每句不超过14个字"
      : p.band === 2 ? "8到10页，每页一到两句话" : "8到12页，可以有更丰富的句子";
    return {
      allowed: new Set(allowed),
      system: `你是一位优秀的中文儿童故事作家。为一个${UI.BANDS[p.band]}的孩子写原创短故事，帮助他们巩固刚学的汉字。
规则：
1. 必须使用这些正在学习的字，每个至少出现2次：${targets.map(t => t.ch).join("、")}
2. 尽量只使用常见的简单汉字。孩子认字有限，越常用的字越好。
3. 故事要温暖、有趣、有一点小波折，适合孩子，不能有可怕或暴力的内容。
4. ${lenHint}。
5. 不要在输出里加拼音或英文。`,
      user: `主题：${theme}${hero ? `。主角叫「${hero}」` : ""}。请写一个新故事。${feedback || ""}`,
    };
  }

  function validate(story, targets, allowed) {
    const text = story.pages.join("");
    const problems = [];
    for (const t of targets) {
      const count = (text.match(new RegExp(t.ch, "g")) || []).length;
      if (count < 2) problems.push(`「${t.ch}」只出现了${count}次，需要至少2次`);
    }
    const chars = text.match(HAN) || [];
    const hard = chars.filter(c => !allowed.has(c));
    const hardPct = chars.length ? hard.length / chars.length : 1;
    if (hardPct > 0.12) {
      problems.push(`太多生僻字了（${[...new Set(hard)].slice(0, 8).join("、")}…），请换成更常见的字`);
    }
    if (!story.pages.length || story.pages.length < 5) problems.push("故事太短了，请写8页左右");
    return problems;
  }

  async function callClaude(sys, usr) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": Store.apiKey(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: sys,
        output_config: { format: { type: "json_schema", schema: STORY_SCHEMA } },
        messages: [{ role: "user", content: usr }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error && err.error.message || res.statusText;
      if (res.status === 401) throw new Error("KEY");
      if (res.status === 429) throw new Error("BUSY");
      throw new Error(msg);
    }
    const data = await res.json();
    if (data.stop_reason === "refusal") throw new Error("REFUSED");
    const text = (data.content.find(b => b.type === "text") || {}).text || "";
    return JSON.parse(text);
  }

  function showBrewing(step) {
    app.innerHTML = `${topbar("play")}
      <div class="stage celebrate">
        <div class="stars brew">✨🪄✨</div>
        <h2>魔法进行中…</h2>
        <p class="sub">${step}</p>
      </div>`;
  }

  async function generate(p, targets, theme, hero) {
    showBrewing("小精灵正在写故事");
    let story, prompt = buildPrompt(p, targets, theme, hero);
    try {
      story = await callClaude(prompt.system, prompt.user);
      let problems = validate(story, targets, prompt.allowed);
      if (problems.length) {
        showBrewing("再改一改，让故事更适合你");
        prompt = buildPrompt(p, targets, theme, hero,
          `\n上一稿的问题：${problems.join("；")}。请重写一个修正这些问题的新故事。`);
        story = await callClaude(prompt.system, prompt.user);
        problems = validate(story, targets, prompt.allowed);
        if (problems.some(x => x.includes("至少2次") || x.includes("太短"))) throw new Error("QUALITY");
      }
    } catch (e) {
      const msg = e.message === "KEY" ? "API key 不对了 — 请家长重新设置 🔐"
        : e.message === "BUSY" ? "魔法炉太忙了，等一分钟再试"
        : e.message === "REFUSED" ? "这个主题小精灵写不了，换一个试试"
        : e.message === "QUALITY" ? "这次的魔法不太成功，再试一次吧"
        : "魔法出了点问题：" + e.message;
      toast(msg);
      viewMagic();
      return;
    }

    Store.bumpGenCount();
    const s = ANN.makeStory(story.title, story.pages.join("\n"), p.band);
    s.en = `Magic story · ${theme}`;
    s.gen = true;
    s.moral = (story.moral || "") + " ✨ 这个故事用了你正在学的字：" + targets.map(t => t.ch).join("、");
    Store.addImport(p.id, s);
    toast("✨ 新故事变出来了！");
    openReader(s);
  }

  VIEWS.magic = viewMagic;
})();
