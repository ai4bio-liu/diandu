"""Build data/stories.js — segment each bundled story with jieba and attach
context-correct per-character pinyin with pypinyin (word-level, so 多音字
like 长/着/了 get the right reading).

Token format in output:
  "，"                    plain string  -> punctuation / non-Chinese run
  ["小马", ["xiǎo","mǎ"]]  word token   -> chars are tappable

Usage:  python tools/build_stories.py
"""
import json
import re
from pathlib import Path

import jieba
from pypinyin import pinyin, Style

from stories_source import STORIES

ROOT = Path(__file__).resolve().parent.parent
HAN = re.compile(r"[一-鿿]")

def tokenize(para):
    tokens = []
    for w in jieba.cut(para):
        if HAN.search(w):
            py = [p[0] for p in pinyin(w, style=Style.TONE)]
            tokens.append([w, py])
        else:
            # merge consecutive non-han runs
            if tokens and isinstance(tokens[-1], str):
                tokens[-1] += w
            else:
                tokens.append(w)
    return tokens

out_stories = []
for s in STORIES:
    paras = [tokenize(p) for p in s["text"]]
    chars = sorted({c for p in s["text"] for c in p if HAN.match(c)})
    title_py = " ".join(p[0] for p in pinyin(s["title"], style=Style.TONE))
    out_stories.append(dict(
        id=s["id"], title=s["title"], titlePy=title_py, en=s["en"],
        band=s["band"], color=s["color"], moral=s["moral"],
        charCount=sum(1 for p in s["text"] for c in p if HAN.match(c)),
        uniqueChars=len(chars), paras=paras,
    ))
    print(f"{s['title']:8s} band {s['band']}  {out_stories[-1]['charCount']:4d} chars, {len(chars):3d} unique")

out = ROOT / "data" / "stories.js"
payload = json.dumps(out_stories, ensure_ascii=False, separators=(",", ":"))
out.write_text("window.DIANDU_STORIES = " + payload + ";\n", encoding="utf8")
print(f"\nwrote {out} ({out.stat().st_size/1024:.0f} KB)")
