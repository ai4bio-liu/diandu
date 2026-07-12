"""Build data/levels.js from levels_source.py, with validation:
  - exactly 50 unique characters per level, no duplicates across levels
  - every character exists in the shipped dictionary (data/dict.js)
  - sanity: median corpus-frequency rank should broadly rise with level
Usage:  python tools/build_levels.py
"""
import json
import re
import statistics
from pathlib import Path

from levels_source import LEVELS

ROOT = Path(__file__).resolve().parent.parent

dict_js = (ROOT / "data" / "dict.js").read_text(encoding="utf8")
payload = json.loads(dict_js[dict_js.index("{"):dict_js.rindex(";")])
DICT = payload["chars"]

ok = True
seen = {}
for i, lvl in enumerate(LEVELS, 1):
    chars = list(lvl)
    if len(chars) != 50:
        print(f"L{i}: {len(chars)} chars (need 50)"); ok = False
    dups_in = [c for c in chars if chars.count(c) > 1]
    if dups_in:
        print(f"L{i}: internal duplicates: {''.join(sorted(set(dups_in)))}"); ok = False
    for c in chars:
        if c in seen:
            print(f"L{i}: 「{c}」 already in L{seen[c]}"); ok = False
        seen[c] = i
    missing = [c for c in chars if c not in DICT]
    if missing:
        print(f"L{i}: not in dictionary: {''.join(missing)}"); ok = False

if not ok:
    raise SystemExit("FIX THE ISSUES ABOVE")

for i, lvl in enumerate(LEVELS, 1):
    ranks = [DICT[c][2] for c in lvl]
    print(f"L{i}: median freq rank {statistics.median(ranks):6.0f}   "
          f"hardest: {''.join(sorted(lvl, key=lambda c: -DICT[c][2])[:5])}")

out = ROOT / "data" / "levels.js"
out.write_text("window.DIANDU_LEVELS = "
               + json.dumps(LEVELS, ensure_ascii=False) + ";\n", encoding="utf8")
print(f"\nwrote {out} ({len(LEVELS)} levels × 50 = {len(seen)} chars)")
