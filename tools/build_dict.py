"""Build data/dict.js — the character & word dictionary shipped with DianDu.

Sources:
  - jieba's dict.txt        -> word/char frequency (rank = difficulty prior)
  - pypinyin                -> per-character readings
  - CC-CEDICT (cedict.txt)  -> short English glosses

Usage:  python tools/build_dict.py path/to/cedict.txt
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import jieba
from pypinyin import pinyin, Style

ROOT = Path(__file__).resolve().parent.parent
CEDICT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "tools" / "cedict.txt"

N_CHARS = 3800   # characters to include (covers >99.5% of kids' texts)
N_WORDS = 9000   # common multi-char words to include

HAN = re.compile(r"^[一-鿿]+$")

# ---- frequency from jieba's dictionary ----------------------------------
jieba_dict = Path(jieba.__file__).parent / "dict.txt"
word_freq = {}
char_freq = defaultdict(int)
for line in jieba_dict.open(encoding="utf8"):
    parts = line.split()
    if len(parts) < 2 or not HAN.match(parts[0]):
        continue
    w, f = parts[0], int(parts[1])
    word_freq[w] = f
    for ch in w:
        char_freq[ch] += f

chars_by_rank = sorted(char_freq, key=char_freq.get, reverse=True)[:N_CHARS]
rank_of = {c: i + 1 for i, c in enumerate(chars_by_rank)}

# ---- glosses from CC-CEDICT ---------------------------------------------
def clean_senses(raw):
    senses = []
    for s in raw.split("/"):
        s = s.strip()
        if not s or s.startswith("CL:") or "variant of" in s or s.startswith("see "):
            continue
        s = re.sub(r"\[[^\]]*\]", "", s).strip()  # drop embedded pinyin
        if s:
            senses.append(s)
        if len(senses) == 3:
            break
    return "; ".join(senses)[:90]

char_gloss = {}
word_entries = {}
line_re = re.compile(r"^(\S+) (\S+) \[([^\]]+)\] /(.+)/$")
for line in CEDICT.open(encoding="utf8"):
    if line.startswith("#"):
        continue
    m = line_re.match(line.strip())
    if not m:
        continue
    _trad, simp, _py, gloss_raw = m.groups()
    if not HAN.match(simp):
        continue
    g = clean_senses(gloss_raw)
    if not g:
        continue
    if len(simp) == 1:
        # keep the first (usually most common) entry per character
        if simp not in char_gloss or len(g) > len(char_gloss[simp]):
            char_gloss.setdefault(simp, g)
    elif simp in word_freq and simp not in word_entries:
        word_entries[simp] = g

# ---- assemble -------------------------------------------------------------
chars = {}
for c in chars_by_rank:
    readings = pinyin(c, style=Style.TONE, heteronym=True)[0][:3]
    chars[c] = [readings, char_gloss.get(c, ""), rank_of[c]]

top_words = sorted(
    (w for w in word_entries if len(w) >= 2),
    key=lambda w: word_freq[w],
    reverse=True,
)[:N_WORDS]
words = {}
for w in top_words:
    py = " ".join(p[0] for p in pinyin(w, style=Style.TONE))
    words[w] = [py, word_entries[w]]

out = ROOT / "data" / "dict.js"
payload = json.dumps({"chars": chars, "words": words}, ensure_ascii=False, separators=(",", ":"))
out.write_text("window.DIANDU_DICT = " + payload + ";\n", encoding="utf8")
print(f"chars: {len(chars)}  words: {len(words)}  size: {out.stat().st_size/1024:.0f} KB")
