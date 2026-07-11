/* Text-to-speech via the browser's speechSynthesis (works offline on macOS/iOS;
   picks the best available Mandarin voice). */
(function () {
  let voice = null;

  function pickVoice() {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return;
    const zh = voices.filter(v => /^zh([-_]CN)?/i.test(v.lang) || /中文|普通话|Mandarin/i.test(v.name));
    // prefer premium/enhanced voices when present
    voice = zh.find(v => /premium|enhanced|Tingting|婷婷/i.test(v.name)) || zh[0] || null;
  }

  if ("speechSynthesis" in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  window.DIANDU_TTS = {
    available: () => "speechSynthesis" in window,
    speak(text, rate) {
      if (!this.available() || !text) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = rate || 0.75;   // slow & clear for learners
      if (voice) u.voice = voice;
      speechSynthesis.speak(u);
    },
    stop() { if (this.available()) speechSynthesis.cancel(); },
  };
})();
