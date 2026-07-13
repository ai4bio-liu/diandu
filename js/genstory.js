/* 魔法故事屋 — AI story generation targeting the child's tricky characters.
   Calls the Claude API or the OpenAI API directly from the browser (raw
   HTTP — this app is zero-build JS), auto-detected from the key prefix
   (sk-ant-… → Anthropic, sk-… → OpenAI). The parent's API key lives ONLY in
   this device's localStorage, entered behind a parent gate; it is never in
   the repo and is sent only to that provider's API endpoint.

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

  const CLAUDE_MODEL = "claude-opus-4-8";
  const OPENAI_MODEL = "gpt-4o";   // mini drops target-char constraints; 4o follows them
  const DAILY_LIMIT = 8;
  const provider = () => Store.apiKey().startsWith("sk-ant") ? "anthropic" : "openai";
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

  /* ---------- parent gate + key setup ---------- */
  function viewKeySetup() {
    const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 5);
    app.innerHTML = `
      ${topbar("play")}
      <div class="form-card">
        <h2>🔐 家长设置 · Grown-ups only</h2>
        <p class="import-note">Story magic needs your own AI API key — either an
        <b>OpenAI / ChatGPT</b> key (from <b>platform.openai.com</b>) or an
        <b>Anthropic</b> key (from <b>console.anthropic.com</b>). The app detects which one
        you pasted. The key is stored only on this device and is used only to write
        stories. Each story costs a fraction of a cent.</p>
        <label class="form-label">先回答：${a} × ${b} = ?</label>
        <input class="text-input" id="gate" inputmode="numeric" placeholder="?">
        <label class="form-label" for="key-in">API Key</label>
        <input class="text-input" id="key-in" type="password" placeholder="sk-…（OpenAI）或 sk-ant-…（Anthropic）">
        <button class="btn-primary" id="key-save">保存 · Save</button>
        <button class="btn-quiet" data-nav="play">返回</button>
      </div>`;
    bindNav();
    app.querySelector("#key-save").addEventListener("click", () => {
      if (+app.querySelector("#gate").value !== a * b) { toast("再算一算 🤔"); return; }
      const k = app.querySelector("#key-in").value.trim();
      if (!k.startsWith("sk-")) { toast("这不像一个 API key（应该以 sk- 开头）"); return; }
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

    // targets: up to 3 trickiest tapped characters + 2 new ones from the
    // child's current ladder level, so stories both consolidate and advance
    const tapped = Store.practicePool(p.id, 3);
    const frontier = Store.levelFrontier(p.id, 5)
      .filter(f => !tapped.some(t => t.ch === f.ch)).slice(0, 5 - Math.min(3, tapped.length));
    const targets = tapped.slice(0, 3).concat(frontier);
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
        <p style="max-width:none"><span class="level-pill">识字阶梯 · 第${Store.currentLevel(p.id)}级</span>
          新故事会用到你正在学的字：
          ${targets.map(t => `<span class="pool-chip ${t.level ? "new" : ""}" title="${t.level ? "第" + t.level + "级新字" : "点读过的字"}">${esc(t.ch)}</span>`).join("")}
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
    const lvl = Store.currentLevel(p.id);
    const ladder = Store.ladderChars(p.id);          // 识字阶梯 levels 1..current
    // "level 0": spoken function words every child knows orally long before
    // reading — always allowed, endlessly repeated, and tappable like any char
    const GLUE = "我你他她它的地得和不说想要个们这那也吗呢";
    // level-strict vocabulary: ladder + glue + known chars + targets;
    // at most 10% of a story may fall outside this set (validator-enforced)
    const allowed = new Set([...GLUE, ...ladder, ...known, ...targets.map(t => t.ch)]);
    const lenHint = p.band === 1 ? "8到10页，每页一句话，每句不超过14个字"
      : p.band === 2 ? "8到10页，每页一到两句话" : "8到12页，可以有更丰富的句子";
    return {
      allowed,
      system: `你是一位优秀的中文儿童故事作家。为一个${UI.BANDS[p.band]}的孩子写原创短故事。孩子的识字水平是第${lvl}级（共${Store.levelCount()}级）。

孩子认识的字（字表）：${[...allowed].join("")}

两条硬规则，缺一不可：
1. 故事里至少90%的字必须来自上面的字表。字表以外的字总共不能超过10%，只在实在需要时用个别最常见的小词（如「的」「个」「来」）。宁可句子短、简单、重复，也绝不用字表外的字。写每一句之前，先确认这一句里的每个字都在字表里。
2. 这些正在学习的字，每一个都必须出现至少2次 —— ${targets.map(t => `「${t.ch}」`).join("")}。写完后逐个检查，缺了就重写那一页。

好句子的样子（几乎每个字都在初级字表里）：
「天上有云。」「山上有大马。」「大马下山了。」「小鱼在水下。」「猫是狗的朋友」这样的句子里「朋友」若不在字表就不能用，要改成「猫和狗好」这种只用字表字的说法。

其他规则：
1. 故事要一层一层变难：前几页用最简单的字、最短的句子；越往后句子稍长，逐渐用上正在学习的字（新字集中在中后段反复出现）。
2. 故事要温暖、有趣、有一点小波折，适合孩子，不能有可怕或暴力的内容。
3. ${lenHint}。
4. 不要在输出里加拼音或英文。`,
      user: `主题：${theme}${hero ? `。主角叫「${hero}」` : ""}。请写一个新故事。${feedback || ""}`,
    };
  }

  function validate(story, targets, allowed) {
    const text = story.pages.join("");
    const problems = [];
    for (const t of targets) {
      const count = (text.match(new RegExp(t.ch, "g")) || []).length;
      if (count === 0) problems.push(`「${t.ch}」完全没有出现，必须写进故事里，至少出现2次`);
      else if (count < 2) problems.push(`「${t.ch}」只出现了${count}次，需要至少2次`);
    }
    const chars = text.match(HAN) || [];
    const hard = chars.filter(c => !allowed.has(c));
    const hardPct = chars.length ? hard.length / chars.length : 1;
    if (hardPct > 0.10) {
      problems.push(`字表以外的字占了${Math.round(hardPct * 100)}%，超过10%上限。`
        + `这些字不在字表里：${[...new Set(hard)].join("、")}。请把它们换成字表里的字，或删掉那些句子`);
    }
    if (!story.pages.length || story.pages.length < 5) problems.push("故事太短了，请写8页左右");
    return problems;
  }

  async function callLLM(sys, usr) {
    const key = Store.apiKey();
    let url, headers, body, extract;

    if (provider() === "anthropic") {
      url = "https://api.anthropic.com/v1/messages";
      headers = {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      };
      body = {
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        system: sys,
        output_config: { format: { type: "json_schema", schema: STORY_SCHEMA } },
        messages: [{ role: "user", content: usr }],
      };
      extract = data => {
        if (data.stop_reason === "refusal") throw new Error("REFUSED");
        return (data.content.find(b => b.type === "text") || {}).text || "";
      };
    } else {
      url = "https://api.openai.com/v1/chat/completions";
      headers = {
        "content-type": "application/json",
        "authorization": "Bearer " + key,
      };
      body = {
        model: OPENAI_MODEL,
        max_tokens: 4000,
        response_format: {
          type: "json_schema",
          json_schema: { name: "story", strict: true, schema: STORY_SCHEMA },
        },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
      };
      extract = data => {
        const m = data.choices && data.choices[0] && data.choices[0].message;
        if (!m || m.refusal) throw new Error("REFUSED");
        return m.content || "";
      };
    }

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error && err.error.message || res.statusText;
      if (res.status === 401) throw new Error("KEY");
      if (res.status === 429) throw new Error("BUSY");
      throw new Error(msg);
    }
    return JSON.parse(extract(await res.json()));
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
      story = await callLLM(prompt.system, prompt.user);
      let problems = validate(story, targets, prompt.allowed);
      for (let retry = 0; retry < 2 && problems.length; retry++) {
        showBrewing(retry ? "最后再改一次…" : "再改一改，让故事更适合你");
        prompt = buildPrompt(p, targets, theme, hero,
          `\n上一稿的问题：${problems.join("；")}。请重写一个修正这些问题的新故事。`);
        story = await callLLM(prompt.system, prompt.user);
        problems = validate(story, targets, prompt.allowed);
      }
      // hard gate: never deliver a story that is too hard for the child's
      // level (>10% off-ladder), misses a target entirely, or is too short.
      // a target used once (instead of twice) is still acceptable practice.
      if (problems.some(x => x.includes("完全没有") || x.includes("太短") || x.includes("超过10%"))) {
        throw new Error("QUALITY");
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
