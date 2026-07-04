<div align="center">

# 🌻 Faithfully Web

### *A quiet place for letters, memories, and a countdown to her birthday.*

A personal website I built for someone special — handwritten letters organized into chapters, a real-time backend, a gallery of cat photos, an app showcase, and a companion Android admin app. Fully private for her, with a friendly demo mode for everyone else.

**[🌐 Live site](https://alliyannah.love)** · **[📱 Android companion app](https://github.com/mowtiie/Faithfully-App)**

</div>

---

## 💛 Why I built this

I started writing letters to someone I cared about. As they piled up, I wanted somewhere thoughtful to put them — not a Notes app, not a Google Doc. Something with intention. So I built her a website.

What began as a single static page turned into a full system: chapters of letters managed from an Android app I made, a gallery of cat photos, and real-time syncing to a public site I can share. It's the kind of project that's been more fun to work on than anything I've shipped at school, because every detail mattered.

---

## ✨ Features

### 🏠 Home
- 🎂 Live countdown to her birthday (down to the second)
- 💛 Days-together counter that ticks up from the day we began
- 🌻 Floating sunflower background that drifts gently across the screen
- 🌙 Light and dark mode with a hand-tuned sunflower palette

### 💌 Letters
- 📖 Chapters that organize letters into eras of our story
- 💌 Cards that expand on tap to reveal the full message
- 🩵 Subtle hand-lettered headings using *Mrs Saint Delafield* and *Playfair Display*

### 📱 Apps
- 🌻 A showcase section for the small Android apps I built for her (Faithful, Faithfully)
- 📥 Each card has its own icon, tagline, version, download button, and source link
- ⚙️ Fully modular — new apps are just an entry in a config array

### 🐱 Gallery
- 🖼 Grid of cat photos with shimmer loading skeletons
- 🔍 Lightbox viewer with prev/next navigation (click, swipe, or arrow keys)
- 📸 Optimized images — small thumbnails for the grid, full-res in the lightbox
- ↗️ Captions that fade in on hover, always visible on touch devices

### 🔐 Auth & Demo mode
- 🔑 Email/password sign-in for Ali; her account is the only one that unlocks the real content
- 👀 Demo mode for everyone else — the site auto-shows placeholder chapters, sample letters, and free stock cat photos so portfolio visitors can see the layout without seeing anything personal
- 🏷️ Every sample card and photo gets a subtle "SAMPLE" watermark
- 🌗 Session persists forever — Ali only signs in once per device

### 🧰 Under the hood
- ⚡ Real-time updates via Firestore — letters and photos appear instantly after the admin app adds them
- 📱 Collapsible side drawer on desktop, bottom nav on mobile — same components, fully responsive
- ☁️ Firebase Storage for photo hosting with public CDN delivery
- 🔒 Two-layer security — client-side auth UI + Firestore security rules that require an allow-listed UID
- 🎨 Modular CSS architecture — split into 8 focused files instead of one giant `styles.css`

---

## 📸 Screenshots

| Home | Letters | Gallery | Dark mode |
|:---:|:---:|:---:|:---:|
| ![Home](screenshots/screenshot_1.png) | ![Dark Mode](screenshots/screenshot_2.png) | ![Auth](screenshots/screenshot_3.png) | ![Apps](screenshots/screenshot_4.png) |

---

## 🛠️ Tech stack

| Layer | What I used |
|---|---|
| **Frontend** | Vanilla HTML, CSS, JavaScript — no frameworks, no build step |
| **Database** | [Firebase Firestore](https://firebase.google.com/docs/firestore) (real-time NoSQL) |
| **File storage** | [Firebase Storage](https://firebase.google.com/docs/storage) (photo CDN) |
| **Auth** | [Firebase Auth](https://firebase.google.com/docs/auth) — email/password, UID-restricted reads AND writes |
| **Hosting** | [GitHub Pages](https://pages.github.com/) with free HTTPS |
| **Fonts** | Google Fonts — *Playfair Display*, *Mrs Saint Delafield*, *Inter* |
| **Companion** | [Faithfully App](https://github.com/mowtiie/Faithfully-App) — Android app in Java |

I intentionally avoided a framework. The whole site is a few hundred lines of plain JavaScript and CSS split into modular files, which keeps it fast, light, and easy to maintain.

---

## 📁 Project structure

```
.
├── index.html              # entry point
├── script.js               # all interactivity — sections, countdowns, Firestore, gallery, auth, apps config
├── css/
│   ├── base.css           # reset, variables, shared animations
│   ├── layout.css         # app shell, drawer (with collapse), bottom nav, sticky header
│   ├── home.css           # header, countdowns, floating background
│   ├── letters.css        # cards, chapters
│   ├── apps.css           # app showcase cards
│   ├── gallery.css        # photo grid + lightbox
│   ├── auth.css           # login overlay, demo banner, "SAMPLE" watermarks
│   └── theme.css          # all dark mode overrides
├── apps/                   # APK downloads served from the Apps section
│   ├── Faithful.apk
│   └── Faithfully.apk
├── icons/                  # app icons + favicon
│   ├── faithful.png
│   ├── faithfully.png
│   └── icon.png
├── screenshots/            # images used in this README
│   ├── home.png
│   ├── letters.png
│   ├── gallery.png
│   └── dark-mode.png
├── CNAME                   # custom domain config for GitHub Pages
├── LICENSE
└── README.md
```

---

## 🏗️ Architecture

```
      ┌──────────────────┐         ┌─────────────────┐         ┌─────────────────┐
      │  Admin Android   │         │     User        │         │  Everyone else  │
      │       App        │         │  (signed in)    │         │  (demo mode)    │
      │  (Java + XML)    │         │                 │         │                 │
      └────────┬─────────┘         └────────┬────────┘         └────────┬────────┘
               │ writes                     │ reads                     │ reads
               │ (UID-restricted)           │ (UID-restricted)          │ mock data
               │                            │                           │ from script.js
               └───────────┬────────────────┘                           │
                           ▼                                            ▼
             ┌────────────────────────────────┐             (no Firebase call)
             │  Firebase                       │
             │   • Firestore                  │
             │     - chapters/                │
             │     - cards/                   │
             │     - gallery/                 │
             │   • Storage                    │
             │     - gallery/*.jpg            │
             │   • Auth                       │
             │     - allow-listed UIDs only   │
             └────────────────────────────────┘
```

The Android app is the only thing that can *write* — security rules enforce my admin UID. Reads are restricted to two UIDs: mine (admin) and Ali's. Everyone else sees the demo version of the site, rendered from placeholder data hardcoded in `script.js`, without ever hitting Firestore.

---

## 🔧 Running it yourself

It's a static site, so:

```bash
git clone https://github.com/mowtiie/Faithfully-Web.git
cd Faithfully-Web
# Open index.html in any browser, or serve locally:
python3 -m http.server 8000
```

For Firestore data and gallery photos to load, you'd need to point `script.js` at your own Firebase project, create your own admin + viewer accounts, and paste the resulting UIDs into `ALLOWED_UIDS` in `script.js` and the `firestore.rules` / `storage.rules` files. See `AUTH_SETUP.md` for the full walkthrough.

Without configuring auth, you'll still see the site — just the demo mode with placeholder content.

---

## 🧠 What I learned

- How to design and ship a small full-stack system end to end
- Firestore security rules — the API key in client code is fine when paired with strong rules and HTTP referrer restrictions
- Splitting CSS into focused files at the right time is way better than a 1500-line `styles.css`
- Real-time UIs feel magical when they work — uploading a photo from my phone makes it appear on the site in under a second
- Image optimization is critical — serving 5MB phone photos directly would have made the gallery painfully slow
- Two-layer auth (client-side UI + server-side rules) is the right pattern — the UI is the pleasant experience, the rules are the actual security
- Demo mode with hardcoded mock data is a lovely way to make a private site publicly showcase-able without ever exposing anything real

---

## 👤 Made by

**Her Mowtiie.**

Made with 🌻 for someone who already knows it's hers.
