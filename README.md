# Mission PARAM — Next.js / Vercel build

Same experience as before (PARAM hero → Chapter 01 → 02 → 03, narrated and typed), rebuilt as a
Next.js app so it deploys on Vercel like any React project.

## What actually changed from the plain-HTML version

- The page markup (hero + chapter stage + bottom bar) is now React, in `app/page.js`.
- Global styles move to `app/styles/*.css`, imported once in `app/layout.js`.
- The interactive engine — typing, voiceover sync, image panel, next-chapter — is the **same,
  unchanged JavaScript** as before. It isn't rewritten as React state because it's a scroll/timing
  choreography that was already built, tested, and working; rewriting it as hooks would risk
  breaking the exact behaviour you asked for (never an empty image panel, next-chapter mid-chapter,
  etc.) for no real benefit. It's loaded as one script, `public/js/engine.js`, after the page mounts.
  The original per-file sources (`utils.js`, `config.js`, `chapter-parser.js`, `chapter-loader.js`,
  `narrators.js`, `player.js`, `hero.js`, `main.js`) are kept in `public/js/` too, unchanged, as
  readable source — `engine.js` is just those eight concatenated in dependency order, which removes
  any risk of the browser loading them out of order.
- There's no more "opened from disk" fallback (the `file://` workaround, `chapters/content.js`):
  not needed, because a Vercel deployment is always served over `https://`, so a plain `fetch()` of
  `chapter.md`/images/audio just works.

## Project layout

```
mission-param-react/
├── app/
│   ├── layout.js        Root layout: fonts, imports the four stylesheets
│   ├── page.js           The page: hero + chapter markup, loads engine.js
│   └── styles/
│       ├── tokens.css     Bhatkar Storyline design tokens (colors, fonts, spacing)
│       ├── base.css       Page-wide rules, buttons, labels
│       ├── hero.css       PARAM hero
│       └── player.css     Chapter stage: title/story/epilogue/done, bottom bar
├── public/
│   ├── js/
│   │   ├── engine.js      The one script the page loads (concatenated, see above)
│   │   └── *.js           Same logic as readable individual files
│   └── chapters/
│       ├── 01/            A Nation on the Rise — chapter.md, images/, voiceover.mp3, timings.json
│       ├── 02/            The Door Shuts
│       └── 03/            The Boy from Muramba
├── package.json
└── next.config.js
```

## Run it locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy to Vercel

**Option A — Vercel CLI**
```bash
npm install -g vercel     # once
cd mission-param-react
vercel                     # first deploy, follow the prompts
vercel --prod               # subsequent production deploys
```

**Option B — GitHub**
1. Push this folder as a repo (`git init && git add . && git commit -m "Mission PARAM" `, then push to GitHub).
2. On vercel.com → **Add New Project** → import that repo.
3. Framework preset: **Next.js** (auto-detected). No environment variables, no build settings to change.
4. Deploy.

Either way, Vercel runs `npm install` and `next build` for you — nothing else to configure.

## Editing a chapter

Same as before: edit the `chapter.md`, swap images, or replace `voiceover.mp3` /
`timings.json` inside `public/chapters/0X/`, then redeploy (a `git push`, if you used Option B,
redeploys automatically). There's no build step to run — the old `tools/build.py` was only needed
for the offline single-file version, which this project doesn't produce.

## Content to check before publishing

(carried over from the original project — not fixed, just flagged again so it isn't lost)

- `public/chapters/02/images/paddy-transplanting.jpg` and `weather-radar.jpg` carry Alamy watermarks.
- `public/chapters/01/images/nuclear-test.jpg` is not Pokhran (captioned "Illustrative").
- `public/chapters/03/images/iit-delhi.jpg` carries a photographer's credit.
