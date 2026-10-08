# CLAUDE.md — Faithfully Web

**Read this file first.** It contains everything you need to know to work in this repo effectively.

---

## What this project is

A personal website built for someone specific (Alliyannah Faith / "Ali"). It has four sections:

- **Home** — birthday countdown + days-together counter
- **Letters** — chapters of handwritten letters organized as expandable cards
- **Apps** — showcase of Android apps the owner built for her (Faithful, Faithfully)
- **Gallery** — cat photos with a lightbox viewer

Hosted on GitHub Pages at `alliyannah.love`. Uses Firebase Firestore + Storage + Auth. No build step, no framework — vanilla HTML/CSS/JS.

## Auth model (important)

Two-mode auth with a UID allow list:

- **`authed` mode** — signed in as an approved UID (admin or Ali). Reads real data from Firestore.
- **`guest` mode** — everyone else. Sees hardcoded mock data (`MOCK_CHAPTERS`, `MOCK_CARDS`, `MOCK_GALLERY` in `script.js`).

The allow list is `ALLOWED_UIDS` in `script.js`. A signed-in user whose UID is NOT on the list gets silently signed out and treated as a guest.

`authMode` is a top-level `let` variable. `onAuthStateChanged` is what updates it. Changes to `authMode` should trigger re-renders of any auth-aware content:
- `renderHomeContent()` — swaps home title/subtitle/labels/dates
- `anniversaryTick()` and `countdownTick()` — nudged manually because their intervals are slow
- Section reload if the active section is data-dependent (letters, gallery)

## File structure

```
.
├── index.html              Entry point — has all 4 sections + login overlay + demo banner
├── script.js               All JS — auth, Firestore, mock data, section rendering
├── css/
│   ├── base.css           Reset, CSS variables, shared animations
│   ├── layout.css         App shell, drawer, bottom nav, sticky header
│   ├── home.css           Home page (header, countdowns, floating background)
│   ├── letters.css        Chapters + card styling
│   ├── apps.css           App showcase cards
│   ├── gallery.css        Photo grid + lightbox
│   ├── auth.css           Login overlay, demo banner, "SAMPLE" watermarks
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
- **Vanilla JS** — no frameworks, no imports, no build step. Everything is a global function or const in `script.js`.
- **`escapeHtml()` and `escapeAttr()`** — use these for ANY user content in template literals. They're already defined near the bottom of `script.js`.
- **Mock data must match structure of real data** — same field names, same types. `renderLettersFromData()` and `renderGalleryFromData()` don't care which source they got their data from.
- **Firestore real-time listeners** — used everywhere. Never use `.get()` for data that should update live.
- **`sectionLoaded` tracker** — each section is lazy-loaded on first visit. Auth state changes reset the letters and gallery flags to force a re-fetch.

## Firestore schema

- **`chapters/`**: `{ title, description, order }`
- **`cards/`**: `{ title, message, dateLabel, date (Timestamp), order, chapterId }`
- **`gallery/`**: `{ imageUrl, thumbnailUrl, caption, order, uploadedAt, storagePath, thumbnailPath }`

Rules restrict reads to approved UIDs and writes to admin only. Rules file is in the Firebase project, not this repo.

## Companion Android app

There's a separate repo `Faithfully-App` (Android admin app in Java). That app is the only thing that writes to Firestore — this website only reads. If you're changing the schema here, remember it also needs to change there.

## Things to be careful about

- **Personal data in HTML source** — the real subtitle text for signed-in users lives in `HOME_CONTENT.real` (JS), not the HTML. This is intentional — the HTML source stays generic so demo visitors can't view-source to see anything personal.
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