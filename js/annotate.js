/* Runtime annotation for imported text (bundled stories are pre-annotated
   at build time with jieba + pypinyin).

   Segmentation: greedy longest-match against the shipped word dictionary
   (up to 4 characters), falling back to single characters. Pinyin comes
   from the word entry when available (better 多音字 handling), else the
   character's first reading. */
(function () {
  const DICT = window.DIANDU_DICT || { chars: {}, words: {} };
  const HAN = /[一-鿿]/;

  function tokenizePara(para) {
    const tokens = [];
    let i = 0, plain = "";
    const flush = () => { if (plain) { tokens.push(plain); plain = ""; } };

    while (i < para.length) {
      const c = para[i];
      if (!HAN.test(c)) { plain += c; i++; continue; }
      flush();
      let word = c;
      for (let L = Math.min(4, para.length - i); L >= 2; L--) {
        const cand = para.slice(i, i + L);
        if (DICT.words[cand]) { word = cand; break; }
      }
      const wEntry = DICT.words[word];
      const py = wEntry
        ? wEntry[0].split(" ")
        : [...word].map(ch => (DICT.chars[ch] && DICT.chars[ch][0][0]) || "?");
      tokens.push([word, py]);
      i += word.length;
    }
    flush();
    return tokens;
  }

  window.DIANDU_ANNOTATE = {
    /* Build a story object (same shape as bundled ones) from raw pasted text. */
    makeStory(title, rawText, band) {
      const paras = rawText
        .split(/\n+/).map(s => s.trim()).filter(Boolean)
        .map(tokenizePara);
      let charCount = 0; const uniq = new Set();
      for (const p of paras) for (const t of p) {
        if (typeof t === "string") continue;
        for (const ch of t[0]) { charCount++; uniq.add(ch); }
      }
      const titlePy = [...title].map(ch =>
        (DICT.chars[ch] && DICT.chars[ch][0][0]) || "").filter(Boolean).join(" ");
      return {
        id: "imp" + Date.now().toString(36),
        title: title || "我的故事", titlePy, en: "Imported story",
        band: band || 2, color: "import", moral: "",
        imported: true, charCount, uniqueChars: uniq.size, paras,
      };
    },
    charInfo(ch) {
      const d = DICT.chars[ch];
      return d ? { readings: d[0], gloss: d[1], rank: d[2] } : null;
    },
    wordInfo(w) {
      const d = DICT.words[w];
      return d ? { py: d[0], gloss: d[1] } : null;
    },
  };
})();
