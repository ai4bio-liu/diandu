/* Persistence + the difficulty engine.
   All state lives in localStorage, namespaced per child profile.

   Mastery model (per child, per character):
     prior    — difficulty prior from corpus frequency rank (0 easy → 1 hard)
     taps     — child asked for help (strong "don't know")
     passes   — child read past it without tapping (weak "know")
     quiz     — game answers: correct is strong "know", wrong is strong "don't know"
     decay    — evidence fades with days since last seen
     mastery  = sigmoid(0.4·passes + 0.9·quizOk − 1.3·taps − 1.6·quizFail
                        − 0.02·days + 1.6 − 3.2·prior)

   Buckets: mastered ≥ .8 · learning .3–.8 · tricky < .3            */
(function () {
  const LS = window.localStorage;
  const read = (k, d) => { try { return JSON.parse(LS.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => LS.setItem(k, JSON.stringify(v));

  const DICT = window.DIANDU_DICT || { chars: {}, words: {} };
  const MAXRANK = 3800;
  const sigmoid = x => 1 / (1 + Math.exp(-x));

  const Store = {
    // ---------- profiles ----------
    profiles() { return read("diandu.profiles", []); },
    saveProfiles(p) { write("diandu.profiles", p); },
    addProfile(name, avatar, band) {
      const p = this.profiles();
      const prof = { id: "p" + Date.now().toString(36), name, avatar, band, created: Date.now() };
      p.push(prof); this.saveProfiles(p);
      return prof;
    },
    current() {
      const id = LS.getItem("diandu.current");
      return this.profiles().find(p => p.id === id) || null;
    },
    setCurrent(id) { LS.setItem("diandu.current", id); },

    // ---------- interaction log ----------
    stats(pid) { return read("diandu.stats." + pid, {}); },
    _saveStats(pid, s) { write("diandu.stats." + pid, s); },
    logTap(pid, ch) { this._log(pid, ch, "t"); },
    logPass(pid, ch) { this._log(pid, ch, "p"); },
    logQuiz(pid, ch, ok) { this._log(pid, ch, ok ? "q" : "f"); },
    _log(pid, ch, kind) {
      if (!DICT.chars[ch] && kind === "p") return;   // don't track passes on unknown-to-dict chars
      const s = this.stats(pid);
      const e = s[ch] || { t: 0, p: 0, ls: 0 };
      e[kind] = (e[kind] || 0) + 1; e.ls = Date.now();
      s[ch] = e; this._saveStats(pid, s);
    },

    // ---------- stars (game rewards) ----------
    stars(pid) { return read("diandu.stars." + pid, 0); },
    addStars(pid, n) {
      const total = this.stars(pid) + n;
      write("diandu.stars." + pid, total);
      return total;
    },

    // ---------- AI story generation settings ----------
    apiKey() { return LS.getItem("diandu.apikey") || ""; },
    setApiKey(k) { k ? LS.setItem("diandu.apikey", k) : LS.removeItem("diandu.apikey"); },
    genToday() {
      const rec = read("diandu.gencount", { d: "", n: 0 });
      const today = new Date().toDateString();
      return rec.d === today ? rec.n : 0;
    },
    bumpGenCount() {
      write("diandu.gencount", { d: new Date().toDateString(), n: this.genToday() + 1 });
    },

    // ---------- mastery ----------
    prior(ch) {
      const entry = DICT.chars[ch];
      if (!entry) return 0.85;
      return Math.min(1, Math.log(entry[2] + 1) / Math.log(MAXRANK));
    },
    mastery(pid, ch, statsCache) {
      const s = (statsCache || this.stats(pid))[ch] || { t: 0, p: 0, ls: Date.now() };
      const days = (Date.now() - (s.ls || Date.now())) / 86400000;
      const x = 0.4 * s.p + 0.9 * (s.q || 0) - 1.3 * s.t - 1.6 * (s.f || 0)
        - 0.02 * days + 1.6 - 3.2 * this.prior(ch);
      return sigmoid(x);
    },

    /* Characters to practice in games / target in generated stories:
       trickiest tracked chars first (most-tapped), padded from the learning
       bucket. Returns [{ch, py, gloss, mastery, taps}]. */
    practicePool(pid, n) {
      const rows = this.report(pid).filter(r => r.py);
      const tricky = rows.filter(r => this.bucket(r.mastery) < 2);
      const rest = rows.filter(r => this.bucket(r.mastery) === 2);
      return tricky.concat(rest).slice(0, n);   // weakest first, pad with review
    },

    /* Characters this child reliably knows (for the story generator). */
    knownChars(pid) {
      const s = this.stats(pid);
      return Object.keys(s).filter(ch => this.mastery(pid, ch, s) >= 0.8);
    },
    bucket(m) { return m >= 0.8 ? 2 : m >= 0.3 ? 1 : 0; },   // 2 mastered · 1 learning · 0 tricky

    /* Character report for the dashboard: every char the child has touched,
       trickiest first. */
    report(pid) {
      const s = this.stats(pid);
      return Object.keys(s).map(ch => {
        const d = DICT.chars[ch] || [[], "", null];
        return {
          ch, taps: s[ch].t, passes: s[ch].p, lastSeen: s[ch].ls,
          py: (d[0] && d[0][0]) || "", gloss: d[1] || "",
          mastery: this.mastery(pid, ch, s),
        };
      }).sort((a, b) => a.mastery - b.mastery || b.taps - a.taps);
    },

    /* % of a story's characters this child has mastered (for the library). */
    knownPct(pid, story) {
      const s = this.stats(pid);
      let known = 0, total = 0;
      const seen = new Set();
      for (const para of story.paras) for (const tok of para) {
        if (typeof tok === "string") continue;
        for (const ch of tok[0]) {
          if (seen.has(ch)) continue;
          seen.add(ch); total++;
          if (this.mastery(pid, ch, s) >= 0.8) known++;
        }
      }
      return total ? Math.round(100 * known / total) : 0;
    },

    // ---------- reading progress ----------
    progress(pid) { return read("diandu.progress." + pid, {}); },
    setProgress(pid, storyId, data) {
      const pr = this.progress(pid);
      pr[storyId] = Object.assign(pr[storyId] || {}, data);
      write("diandu.progress." + pid, pr);
    },

    // ---------- imported stories ----------
    imports(pid) { return read("diandu.imports." + pid, []); },
    addImport(pid, story) {
      const list = this.imports(pid);
      list.unshift(story);
      write("diandu.imports." + pid, list.slice(0, 50));
    },
    removeImport(pid, id) {
      write("diandu.imports." + pid, this.imports(pid).filter(s => s.id !== id));
    },
  };

  window.DIANDU_STORE = Store;
})();
