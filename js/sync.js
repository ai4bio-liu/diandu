/* Family cloud sync — keeps every device's progress in one place.
   Backend: a PRIVATE GitHub repo (ai4bio-liu/diandu-data, file family.json)
   written through the GitHub contents API. The fine-grained token that
   unlocks it is installed per-device via the magic link (#gh=…) and lives
   only in localStorage — never in this public repo.

   Merge strategy (safe for multiple kids on multiple devices):
   - profiles: union by id
   - per-char counters (taps/passes/quiz): max of each — counters only grow
   - stars: max · story progress: done=either, page=max
   - imported/generated stories: union by id, newest first, cap 50 */
(function () {
  const LS = window.localStorage;
  const REPO = "ai4bio-liu/diandu-data";
  const API = `https://api.github.com/repos/${REPO}/contents/family.json`;

  let sha = null, dirty = false, timer = null, busy = false, warned = false;

  const token = () => LS.getItem("diandu.ghtoken") || "";
  const read = k => { try { return JSON.parse(LS.getItem(k)); } catch { return null; } };

  /* ---------- local <-> doc ---------- */
  function collect() {
    const doc = { profiles: read("diandu.profiles") || [], stats: {}, stars: {}, progress: {}, imports: {} };
    for (const p of doc.profiles) {
      doc.stats[p.id] = read("diandu.stats." + p.id) || {};
      doc.stars[p.id] = read("diandu.stars." + p.id) || 0;
      doc.progress[p.id] = read("diandu.progress." + p.id) || {};
      doc.imports[p.id] = read("diandu.imports." + p.id) || [];
    }
    return doc;
  }

  function apply(doc) {
    LS.setItem("diandu.profiles", JSON.stringify(doc.profiles));
    for (const p of doc.profiles) {
      LS.setItem("diandu.stats." + p.id, JSON.stringify(doc.stats[p.id] || {}));
      LS.setItem("diandu.stars." + p.id, JSON.stringify(doc.stars[p.id] || 0));
      LS.setItem("diandu.progress." + p.id, JSON.stringify(doc.progress[p.id] || {}));
      LS.setItem("diandu.imports." + p.id, JSON.stringify(doc.imports[p.id] || []));
    }
  }

  function merge(remote, local) {
    const out = { profiles: [], stats: {}, stars: {}, progress: {}, imports: {} };
    const ids = new Map();
    [...(remote.profiles || []), ...(local.profiles || [])].forEach(p => {
      if (p && p.id && !ids.has(p.id)) { ids.set(p.id, p); out.profiles.push(p); }
    });
    for (const id of ids.keys()) {
      const ra = (remote.stats || {})[id] || {}, lb = (local.stats || {})[id] || {}, sm = {};
      new Set([...Object.keys(ra), ...Object.keys(lb)]).forEach(ch => {
        const x = ra[ch] || {}, y = lb[ch] || {};
        sm[ch] = {
          t: Math.max(x.t || 0, y.t || 0), p: Math.max(x.p || 0, y.p || 0),
          q: Math.max(x.q || 0, y.q || 0), f: Math.max(x.f || 0, y.f || 0),
          ls: Math.max(x.ls || 0, y.ls || 0),
        };
      });
      out.stats[id] = sm;
      out.stars[id] = Math.max((remote.stars || {})[id] || 0, (local.stars || {})[id] || 0);
      const pa = (remote.progress || {})[id] || {}, pb = (local.progress || {})[id] || {}, pm = {};
      new Set([...Object.keys(pa), ...Object.keys(pb)]).forEach(sid => {
        const x = pa[sid] || {}, y = pb[sid] || {};
        pm[sid] = { page: Math.max(x.page || 0, y.page || 0), done: !!(x.done || y.done) };
      });
      out.progress[id] = pm;
      const seen = new Set(), imps = [];
      [...((local.imports || {})[id] || []), ...((remote.imports || {})[id] || [])].forEach(s => {
        if (s && s.id && !seen.has(s.id)) { seen.add(s.id); imps.push(s); }
      });
      out.imports[id] = imps.slice(0, 50);
    }
    return out;
  }

  /* ---------- GitHub contents API (CORS-enabled) ---------- */
  const enc = obj => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj))));
  const dec = b64 => JSON.parse(new TextDecoder().decode(
    Uint8Array.from(atob(b64.replace(/\s/g, "")), c => c.charCodeAt(0))));
  const headers = () => ({
    authorization: "Bearer " + token(),
    accept: "application/vnd.github+json",
  });

  async function pull() {
    const res = await fetch(API + "?t=" + Date.now(), { headers: headers(), cache: "no-store" });
    if (res.status === 404) { sha = null; return null; }   // first sync ever
    if (!res.ok) throw new Error("pull " + res.status);
    const j = await res.json();
    sha = j.sha;
    return dec(j.content);
  }

  async function push(doc) {
    const body = { message: "diandu sync", content: enc(doc) };
    if (sha) body.sha = sha;
    const res = await fetch(API, {
      method: "PUT",
      headers: { ...headers(), "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("push " + res.status);
    sha = (await res.json()).content.sha;
  }

  /* ---------- sync cycle ---------- */
  async function sync() {
    if (!token() || busy) return;
    busy = true;
    try {
      const remote = await pull();
      const merged = remote ? merge(remote, collect()) : collect();
      apply(merged);
      if (!remote || JSON.stringify(merged) !== JSON.stringify(remote)) await push(merged);
      dirty = false;
      warned = false;
    } catch (e) {
      if (!warned && window.DIANDU_UI) {
        warned = true;
        window.DIANDU_UI.toast(e.message.includes("401") || e.message.includes("404")
          ? "☁️ 同步没连上 — 请家长检查同步设置"
          : "☁️ 云同步暂时失败，进度已保存在本机");
      }
    }
    busy = false;
  }

  const Sync = {
    enabled: () => !!token(),
    touch() {                                     // called on every local write
      if (!token()) return;
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(sync, 8000);             // batch bursts of activity
    },
    async init() {                                // first pull before first render
      if (!token()) return;
      try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
      await Promise.race([sync(), new Promise(r => setTimeout(r, 5000))]);
      setInterval(() => { if (dirty) sync(); }, 60000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && dirty) sync();
      });
    },
  };

  window.DIANDU_SYNC = Sync;
})();
