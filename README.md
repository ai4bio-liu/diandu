# 点读 DianDu — 读故事，学汉字

A tap-to-read Chinese literacy app for kids (4–18). Tap any character in a
story to hear it, see its pinyin and meaning — the app learns which characters
are hard *for each child* and ranks them for review.

## Run it locally

Double-click **`Start DianDu.command`**, or from a terminal:

```bash
cd diandu
python3 -m http.server 8321
# then open http://localhost:8321
```

No install, no build, no internet needed — everything (12 illustrated stories,
a 3,800-character dictionary with pinyin + English glosses, 9,000 common words)
ships in the `data/` folder. Audio uses the Mac's built-in Chinese voices.

## What's inside (Phase 1)

| Feature | Where |
|---|---|
| Child profiles (avatar + age band 4–7 / 8–12 / 13–18) | `js/app.js` |
| 12 bundled folk-tale retellings with SVG illustrations | `tools/stories_source.py`, `js/art.js` |
| Tap-to-read reader: pinyin, audio, word popups, page-by-page | `js/app.js` |
| Difficulty engine: taps vs. passes → per-child mastery score | `js/store.js` |
| "我的汉字" dashboard: hardest characters first | `js/app.js` |
| Paste-to-import: any Chinese text becomes a tappable story | `js/annotate.js` |

All learning data lives in the browser's localStorage, per profile. Nothing
leaves the machine.

## Deploy online

It's a static site — host the `diandu/` folder anywhere (GitHub Pages,
Netlify, any web server). Per-device profiles keep working; shared accounts
and sync are Phase 4 (see the design doc).

## Rebuilding the data files

Only needed if you edit the stories or want a bigger dictionary:

```bash
python3 -m venv venv && venv/bin/pip install pypinyin jieba
venv/bin/python tools/build_dict.py path/to/cedict.txt   # -> data/dict.js
cd tools && ../venv/bin/python build_stories.py           # -> data/stories.js
```

(`cedict.txt` is the CC-CEDICT dictionary from mdbg.net.)

## Roadmap

- **Phase 2** — photo/OCR import (PaddleOCR + confirm screen), spaced-repetition
  review game, stroke-order animation (Hanzi Writer)
- **Phase 3** — AI story generation from each child's learned characters (Claude API)
- **Phase 4** — cloud deployment with family accounts and a parent dashboard
