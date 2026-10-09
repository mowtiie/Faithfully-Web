# CLAUDE.md — Faithfully Web

**Read this file first.** It contains everything you need to know to work in this repo effectively.

---

## What this project is

A personal website built for someone specific (Alliyannah Faith / "Ali"). It has four sections:

- **Home** — birthday countdown + days-together counter
- **Letters** — chapters of handwritten letters opened one at a time in a reader
- **Apps** — showcase of Android apps the owner built for her (Faithful, Faithfully)
- **Gallery** — cat photos with a lightbox viewer

Hosted on GitHub Pages at `alliyannah.love`. Uses Firebase Firestore + Storage + Auth. No build step, no framework — vanilla HTML/CSS/JS.

## Auth model (important)

Two-mode auth with a UID allow list:

- **`authed` mode** — signed in as an approved UID (admin or Ali). Reads real data from Firestore.
- **`guest` mode** — everyone else. Sees hardcoded mock data (`MOCK_CHAPTERS`, `MOCK_CARDS`, `MOCK_GALLERY` in `js/data/mock.js`).

The allow list is `ALLOWED_UIDS` in `js/firebase.js`. A signed-in user whose UID is NOT on the list gets silently signed out and treated as a guest.

`authMode` is exported from `js/auth.js` and updated by `onAuthStateChanged`. Modules that depend on it register with `onAuthChange()` instead of being called by hand:
- `js/home.js` — re-renders the hero text and refreshes the countdown and days-together counters
- `js/router.js` — resets and reloads the active section if it is data-dependent (letters, gallery)
- `js/login.js` — updates the sign-in button icon and label

## File structure

```
.
├── index.html              Entry point — has all 4 sections + login overlay
├── js/                     Native ES modules, loaded by js/main.js
│   ├── main.js            Entry point — calls each module's init
│   ├── firebase.js        Firebase init, db/auth handles, ALLOWED_UIDS
│   ├── auth.js            authMode/authReady, onAuthChange(), signIn/signOut
│   ├── login.js           Login overlay + sign-out dialog
│   ├── router.js          Hash routing, lazy section loading
│   ├── shell.js           Theme toggle, drawer collapse, sticky header, floating flowers
│   ├── home.js            Hero content, countdown, days together
│   ├── letters.js         Chapters + letter cards (Firestore or mock)
│   ├── reader.js          Letter reader (progress, swipe, print, next chapter)
│   ├── letter-store.js    Letters shared by letters.js and reader.js
│   ├── apps.js            App showcase
│   ├── gallery.js         Photo grid (Firestore or mock)
│   ├── lightbox.js        Photo viewer
│   ├── ui.js              Focus trap, scroll lock, escapeHtml/escapeAttr
│   └── data/              mock.js (demo content), apps.js (app list)
├── css/
│   ├── base.css           Reset, CSS variables, shared animations
│   ├── layout.css         App shell, drawer, bottom nav, sticky header
│   ├── home.css           Home page (header, countdowns, floating background)
│   ├── letters.css        Chapters + card styling
│   ├── reader.css         Letter reader + print styles
│   ├── apps.css           App showcase cards
│   ├── gallery.css        Photo grid + lightbox
│   ├── login.css          Login overlay
│   ├── dialog.css         Sign-out dialog
│   ├── demo.css           "SAMPLE" watermarks
│   └── theme.css          Dark mode overrides for everything above
├── apps/                   APK downloads (Faithful.apk, Faithfully.apk)
├── icons/                  App icons + favicon
├── screenshots/            Images used in README
├── CNAME                   Custom domain (alliyannah.love)
└── README.md
```

## Sunflower theme

Colors, typography, and radii live in `css/base.css` as CSS variables. Every stylesheet references these variables — never hardcode a color.

- **Fonts:** Playfair Display (serif headings), Mrs Saint Delafield (hand-lettered accents), Inter (body)
- **Palette:** deep golden brown, honey, pale yellow, cream, navy blue accents
- **Dark mode:** activated by `body.dark-mode`, overrides in `theme.css`

## Conventions

- **Modular CSS** — one file per major concern. Don't add styles to `base.css` unless they're global.
- **Vanilla JS** — no frameworks and no build step. Code is native ES modules under `js/`; each section owns its file and exposes an `initX()` that `js/main.js` calls. Avoid inline `onclick` attributes — attach listeners in the module. Serve over http (`py -m http.server`) because modules don't load from `file://`.
- **Comments** — only when really needed (a non-obvious why). Never section banners or comments that restate the code. This applies to existing files too.
- **`escapeHtml()` and `escapeAttr()`** — use these for ANY user content in template literals. They live in `js/ui.js`.
- **Mock data must match structure of real data** — same field names, same types. `renderChapterCards()` and `renderGallery()` don't care which source they got their data from.
- **Firestore real-time listeners** — used everywhere. Never use `.get()` for data that should update live.
- **`sectionLoaded` tracker** — in `js/router.js`; each section is lazy-loaded on first visit. Auth state changes reset the letters and gallery flags to force a re-fetch.

## Firestore schema

- **`chapters/`**: `{ title, description, order }`
- **`cards/`**: `{ title, message, dateLabel, date (Timestamp), order, chapterId }`
- **`gallery/`**: `{ imageUrl, thumbnailUrl, caption, order, uploadedAt, storagePath, thumbnailPath }`
- **`settings/home`**: `{ title, subtitle, stickyTitle, countdownLabel, countdownFinish, anniversaryLabel, anniversaryUnit, countdownTarget (Timestamp), anniversaryStart (Timestamp) }` — `subtitle` may contain `<br>` for line breaks

Rules restrict reads to approved UIDs and writes to admin only. Rules file is in the Firebase project, not this repo.

## Companion Android app

There's a separate repo `Faithfully-App` (Android admin app in Java). That app is the only thing that writes to Firestore — this website only reads. If you're changing the schema here, remember it also needs to change there.

## Things to be careful about

- **Personal data** — the real home text and dates live in the Firestore document `settings/home`, never in the repo. `js/home.js` only holds generic sample text and reads the document for approved users. Don't hardcode personal strings or dates in HTML, JS or CSS.
- **`ALLOWED_UIDS`** — never remove existing UIDs without asking; that's how Ali gets access.
- **Firestore Auth persistence** — set to LOCAL (indefinite). Don't change this without a reason.
- **Copyright watermarks / SAMPLE badges** — automatically applied via `body.demo-mode` CSS. Don't add them per-element.

## What to do when starting a new task

1. Read this file. Confirm understanding briefly.
2. Read the specific files the task will touch. Don't guess file contents.
3. Ask clarifying questions if the task ambiguously affects mock vs real data.
4. Propose a plan for anything that touches more than 2 files.
5. Make small, focused changes. Show diffs before applying if the change is nontrivial.
6. Verify by re-reading the changed files after edits.

## Commit style

Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `chore:`. Keep messages single-line when possible.