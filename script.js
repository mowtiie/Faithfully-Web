const firebaseConfig = {
    apiKey:            "AIzaSyALMN5lKjZXD8IXa7la_reuUO2LbuJ6l3o",
    authDomain:        "faithfully-ac2cd.firebaseapp.com",
    projectId:         "faithfully-ac2cd",
    storageBucket:     "faithfully-ac2cd.firebasestorage.app",
    messagingSenderId: "1036385139189",
    appId:             "1:1036385139189:web:90ceabbcbe3c20b16e48bc"
};

firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

let authMode  = 'guest';
let authReady = false;
const ALLOWED_UIDS = new Set([
    "h0yjVpgq6pbreAD3aZvQOcaOp4F3"
]);

const MOCK_CHAPTERS = [
    { id: 'mock-ch-1', title: 'How it started',
      description: 'The very first pages of us — sample chapter.', order: 0 },
    { id: 'mock-ch-2', title: 'Little everyday things',
      description: 'Notes about the small moments — sample chapter.', order: 1 },
    { id: 'mock-ch-3', title: 'For the quiet days',
      description: 'Words to come back to — sample chapter.', order: 2 }
];

const MOCK_CARDS = [
    { id: 'mock-c-1', chapterId: 'mock-ch-1', order: 0,
      title: 'A sample first letter',
      dateLabel: 'Sample',
      message: 'This is what a real letter looks like on this site — but the actual words in here are only visible to the person these letters were written for. Sign in to see the real ones. 🌻' },
    { id: 'mock-c-2', chapterId: 'mock-ch-1', order: 1,
      title: 'Just an example',
      dateLabel: 'Sample',
      message: 'Each card expands when you tap it, so you can read the message inside. This one is a placeholder so demo visitors can see the layout. 🩵' },
    { id: 'mock-c-3', chapterId: 'mock-ch-2', order: 0,
      title: 'Sample about coffee mornings',
      dateLabel: 'Sample',
      message: 'A real letter might tell a small story, share an inside joke, or say something that only makes sense to the two people it lives between. This is not that letter — this is just a placeholder. 🌻' },
    { id: 'mock-c-4', chapterId: 'mock-ch-2', order: 1,
      title: 'Sample about rainy days',
      dateLabel: 'Sample',
      message: 'The chapters help group letters into moods and moments. This one belongs to the "everyday things" chapter. Nothing to see here — just a demo. 🩷' },
    { id: 'mock-c-5', chapterId: 'mock-ch-3', order: 0,
      title: 'A sample for the quiet days',
      dateLabel: 'Sample',
      message: 'Not every letter is meant to be exciting — some are just gentle reminders that someone is thinking of you. This is a placeholder version of one of those. 🌻' }
];

const MOCK_GALLERY = [
    { id: 'mock-g-1', order: 0, caption: 'Sample photo 🐱',
      imageUrl:     'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400' },
    { id: 'mock-g-2', order: 1, caption: 'Another sample 🐱',
      imageUrl:     'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400' },
    { id: 'mock-g-3', order: 2, caption: 'One more sample 🐱',
      imageUrl:     'https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=400' },
    { id: 'mock-g-4', order: 3, caption: 'Sample photo 🐱',
      imageUrl:     'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400' }
];

function openLogin(e) {
    if (e) e.preventDefault();
    document.getElementById('loginError').textContent = '';
    document.getElementById('loginPassword').value    = '';
    document.getElementById('loginOverlay').classList.add('active');
    setTimeout(() => document.getElementById('loginEmail').focus(), 100);
}

function closeLogin() {
    document.getElementById('loginOverlay').classList.remove('active');
}

function handleAuthBtnClick() {
    if (authMode === 'authed') {
        if (confirm('Sign out?')) auth.signOut();
    } else {
        openLogin();
    }
}

async function submitLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl  = document.getElementById('loginError');
    const submitBtn  = document.getElementById('loginSubmit');
    const submitText = document.getElementById('loginSubmitText');

    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitText.textContent = 'Signing in...';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        closeLogin();
    } catch (err) {
        let message = 'Sign-in failed. Please try again.';
        if (err.code === 'auth/invalid-email')       message = 'That email doesn\'t look right.';
        else if (err.code === 'auth/user-not-found') message = 'No account found with that email.';
        else if (err.code === 'auth/wrong-password' ||
                 err.code === 'auth/invalid-credential') message = 'Wrong email or password.';
        else if (err.code === 'auth/too-many-requests') message = 'Too many attempts. Please wait a moment.';
        errorEl.textContent = message;
    } finally {
        submitBtn.disabled = false;
        submitText.textContent = 'Sign In';
    }
    return false;
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const overlay = document.getElementById('loginOverlay');
        if (overlay && overlay.classList.contains('active')) closeLogin();
    }
});

auth.onAuthStateChanged(user => {
    authReady = true;

    if (user && ALLOWED_UIDS.has(user.uid)) {
        authMode = 'authed';
        document.body.classList.remove('demo-mode');
        document.body.classList.remove('has-demo-banner');
        document.getElementById('demoBanner').classList.remove('visible');
        document.getElementById('authBtnIcon').textContent = '👤';
        document.getElementById('authBtn').setAttribute('aria-label', 'Signed in — tap to sign out');
    } else {
        authMode = 'guest';
        document.body.classList.add('demo-mode');
        document.body.classList.add('has-demo-banner');
        document.getElementById('demoBanner').classList.add('visible');
        document.getElementById('authBtnIcon').textContent = '🔒';
        document.getElementById('authBtn').setAttribute('aria-label', 'Sign in');

        if (user) {
            console.warn('Signed-in UID is not on the allow list. Signing out.');
            auth.signOut();
        }
    }

    renderHomeContent();

    if (anniversaryTick) anniversaryTick();
    if (countdownTick)   countdownTick();

    sectionLoaded.home    = true;
    sectionLoaded.letters = false;
    sectionLoaded.gallery = false;

    const activeSection = document.querySelector('.page-section.active');
    if (activeSection) {
        const id = activeSection.id.replace('section-', '');
        if (id === 'letters') { sectionLoaded.letters = true; loadLetters(); }
        if (id === 'gallery') { sectionLoaded.gallery = true; loadGallery(); }
    }
});

const sectionLoaded = { home: true, letters: false, apps: false, gallery: false };

const SECTION_NAMES = ['home', 'letters', 'apps', 'gallery'];

// Navigation goes through the URL hash so refresh and the back button keep her place.
function switchSection(name) {
    if (location.hash === '#' + name) showSection(name);
    else location.hash = name;
}

function routeFromHash() {
    const name = location.hash.slice(1);
    showSection(SECTION_NAMES.includes(name) ? name : 'home');
}

function showSection(name) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => {
        const isActive = b.dataset.section === name;
        b.classList.toggle('active', isActive);
        if (isActive) b.setAttribute('aria-current', 'page');
        else          b.removeAttribute('aria-current');
    });

    document.getElementById('section-' + name).classList.add('active');
    document.getElementById('heartsBackground').style.opacity = name === 'home' ? '1' : '0';

    // Apps are static. Letters and gallery wait for the first auth result so a
    // refresh on #letters never flashes sample content at a signed-in user;
    // onAuthStateChanged loads whichever of them is active once it knows.
    if (name === 'apps' && !sectionLoaded.apps) {
        sectionLoaded.apps = true;
        renderApps();
    } else if (authReady && !sectionLoaded[name]) {
        sectionLoaded[name] = true;
        if (name === 'letters') loadLetters();
        if (name === 'gallery') loadGallery();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function createFloatingHearts() {
    const heartsContainer = document.getElementById('heartsBackground');
    const flowers = ['🌻', '🌼', '🌾', '🌿'];
    for (let i = 0; i < 15; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart-float';
        heart.textContent = flowers[Math.floor(Math.random() * flowers.length)];
        heart.style.left = Math.random() * 100 + '%';
        heart.style.animationDelay = Math.random() * 15 + 's';
        heart.style.animationDuration = (15 + Math.random() * 10) + 's';
        heartsContainer.appendChild(heart);
    }
}

const HOME_CONTENT = {
    real: {
        title:            "To Alliyannah Faith.",
        subtitle:         "To show my appreciation and care for you, <br>here is how I will respond for what you have been doing for me. <br>In this way, I hope that I will get to know you more in the future.",
        stickyTitle:      "Read well po...",
        countdownLabel:   "Days until Ali's Birthday 🎂",
        countdownFinish:  "Happy Birthday, Ali! 🎉🎂",
        anniversaryLabel: "Since our beginning 💛",
        anniversaryUnit:  "days together"
    },
    mock: {
        title:            "To Someone Special.",
        subtitle:         "A quiet place made just for you — letters, memories, and countdowns for the moments ahead. 🌻",
        stickyTitle:      "For Someone Special",
        countdownLabel:   "Counting down to something wonderful 🎂",
        countdownFinish:  "Something wonderful is here! 🎉",
        anniversaryLabel: "Days on this journey 💛",
        anniversaryUnit:  "days so far"
    }
};

function getMockCountdownTarget() {
    const now = new Date();
    return new Date(now.getFullYear() + 1, 11, 31, 0, 0, 0);
}

function getRealCountdownTarget() {
    return new Date('2027-06-16T00:00:00');
}

function getAnniversaryStart() {
    if (authMode === 'authed') return new Date('2026-02-18T00:00:00');

    let stored = localStorage.getItem('demoFirstVisit');
    if (!stored) {
        stored = new Date().toISOString();
        localStorage.setItem('demoFirstVisit', stored);
    }
    return new Date(stored);
}

function renderHomeContent() {
    const c = authMode === 'authed' ? HOME_CONTENT.real : HOME_CONTENT.mock;

    document.getElementById('homeTitle').textContent       = c.title;
    document.getElementById('homeSubtitle').innerHTML      = c.subtitle;
    document.getElementById('stickyTitle').textContent     = c.stickyTitle;
    document.getElementById('countdownLabel').textContent  = c.countdownLabel;
    document.getElementById('countdownBirthday').textContent = c.countdownFinish;
    document.getElementById('anniversaryLabel').textContent = c.anniversaryLabel;
    document.getElementById('anniversaryUnit').textContent  = c.anniversaryUnit;

    document.getElementById('countdownBlocks').style.display   = 'flex';
    document.getElementById('countdownBirthday').style.display = 'none';
}

let countdownTick = null;

function initCountdown() {
    countdownTick = function tick() {
        const target = authMode === 'authed'
                ? getRealCountdownTarget()
                : getMockCountdownTarget();
        const diff = target - new Date();

        if (diff <= 0) {
            document.getElementById('countdownBlocks').style.display   = 'none';
            document.getElementById('countdownBirthday').style.display = 'block';
            return;
        }

        document.getElementById('countdownBlocks').style.display   = 'flex';
        document.getElementById('countdownBirthday').style.display = 'none';

        const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('cd-days').textContent    = String(days).padStart(2, '0');
        document.getElementById('cd-hours').textContent   = String(hours).padStart(2, '0');
        document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
    };

    countdownTick();
    setInterval(countdownTick, 1000);
}

let anniversaryTick = null;

function initAnniversaryCounter() {
    const numEl = document.getElementById('anniversaryDays');
    if (!numEl) return;

    anniversaryTick = function tick() {
        const start = getAnniversaryStart();
        const diff  = new Date() - start;

        if (diff < 0) { numEl.textContent = '0'; return; }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        numEl.textContent = days;
    };

    anniversaryTick();
    setInterval(anniversaryTick, 60 * 60 * 1000);
}

const APPS = [
    {
        name:        "Faithful",
        tagline:     "Quick notes for the thoughts you don't want to forget",
        description: "I know that you've been struggling with your short-term memory, Ali. So I made something for you, something that will help you quickly and easily write down your thoughts so you won't forget about them ever again. 🩵",
        icon:        "🩷",
        iconImage:   "./icons/faithful.png",
        version:     "v1.0",
        downloadUrl: "./faithful.apk",
        sourceUrl:   "https://github.com/mowtiie/Faithful"
    },
    {
        name:        "Faithfully",
        tagline:     "Your written thoughts, gently coming back to you",
        description: "Because some thoughts deserve to be revisited, not just remembered. Faithfully is a quiet companion to Faithful — a place where the little notes you've written can come back to you gently, in the moments you'd love to hear them again. Made so you'll never feel like anything you felt is lost. 🌻",
        icon:        "🌻",
        iconImage:   "./icons/faithfully.png",
        version:     "v1.0",
        downloadUrl: "./faithfully.apk",
        sourceUrl:   "https://github.com/mowtiie/Faithfully-App"
    }
];

function renderApps() {
    const grid = document.getElementById('appsGrid');
    if (!grid) return;

    if (APPS.length === 0) {
        grid.innerHTML = '<div class="empty-state small">No apps yet.</div>';
        return;
    }

    grid.innerHTML = APPS.map((app, i) => {
        const iconHtml = app.iconImage
            ? `<img class="app-icon-img" src="${escapeAttr(app.iconImage)}" alt="${escapeAttr(app.name)} icon"
                    onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'app-icon-emoji',textContent:${JSON.stringify(app.icon || '📱')}}))">`
            : `<span class="app-icon-emoji">${escapeHtml(app.icon || '📱')}</span>`;

        return `
            <div class="app-card" id="app-card-${i}">
                <div class="app-card-header" onclick="toggleApp(${i})">
                    <div class="app-icon">${iconHtml}</div>
                    <div class="app-info">
                        <div class="app-name-row">
                            <span class="app-name">${escapeHtml(app.name)}</span>
                            ${app.version ? `<span class="app-version">${escapeHtml(app.version)}</span>` : ''}
                        </div>
                        <div class="app-tagline">${escapeHtml(app.tagline)}</div>
                    </div>
                    <div class="app-chevron" id="app-chevron-${i}">▼</div>
                </div>
                <div class="app-card-body" id="app-body-${i}">
                    <p class="app-description">${escapeHtml(app.description)}</p>
                    <div class="app-actions">
                        <a href="${escapeAttr(app.downloadUrl)}" class="app-btn app-btn-primary" download>
                            <span class="app-btn-icon">⬇️</span>
                            <span>Download</span>
                        </a>
                        <a href="${escapeAttr(app.sourceUrl)}" class="app-btn app-btn-secondary" target="_blank" rel="noopener">
                            <span class="app-btn-icon">🔗</span>
                            <span>Source</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleApp(i) {
    const card    = document.getElementById('app-card-' + i);
    const body    = document.getElementById('app-body-' + i);
    const chevron = document.getElementById('app-chevron-' + i);

    const isOpen = card.classList.toggle('expanded');
    body.style.maxHeight = isOpen ? body.scrollHeight + 'px' : '0';
    chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

const LETTERS_SKELETON = `
    <div class="chapter-block" aria-hidden="true">
        <div class="skeleton skeleton-heading"></div>
        <div class="cards-grid">
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
        </div>
    </div>`;

// chapterId -> the (sorted) letters currently rendered, used by the reader.
const letterStore = {};
// chapterId -> { title, number }
const chapterMeta = {};
// { chapterId, index } while a letter is open in the reader.
let readerState = null;

// Firestore listener handles. Each reload (auth change, chapter update) must
// detach the previous ones, or they pile up and, after a sign-out, fire
// permission errors that overwrite the sample letters.
let chaptersUnsub = null;
let cardsUnsubs   = [];

function stopCardListeners() {
    cardsUnsubs.forEach(unsub => unsub());
    cardsUnsubs = [];
}

function stopLetterListeners() {
    if (chaptersUnsub) {
        chaptersUnsub();
        chaptersUnsub = null;
    }
    stopCardListeners();
}

function loadLetters() {
    stopLetterListeners();

    if (authMode === 'guest') {
        renderLettersFromData(MOCK_CHAPTERS, MOCK_CARDS);
        return;
    }

    const container = document.getElementById('chaptersContainer');
    container.innerHTML = LETTERS_SKELETON;

    chaptersUnsub = db.collection('chapters')
        .orderBy('order', 'asc')
        .onSnapshot(chaptersSnap => {
            stopCardListeners();

            if (chaptersSnap.empty) {
                container.innerHTML = '<div class="empty-state">No chapters yet.</div>';
                return;
            }

            const chapters = [];
            chaptersSnap.forEach(doc => chapters.push({ id: doc.id, ...doc.data() }));

            container.innerHTML = '';

            chapters.forEach((chapter, i) => {
                container.appendChild(buildChapterElement(chapter, i + 1));

                cardsUnsubs.push(db.collection('cards')
                    .where('chapterId', '==', chapter.id)
                    .orderBy('order', 'asc')
                    .onSnapshot(cardsSnap => {
                        const cardsGrid = document.getElementById('cards-' + chapter.id);
                        if (!cardsGrid) return;
                        const cards = [];
                        cardsSnap.forEach(doc => cards.push({ id: doc.id, ...doc.data() }));
                        renderChapterCards(cardsGrid, cards, chapter.id);
                    }));
            });
        }, err => {
            container.innerHTML = '<div class="empty-state">Could not load letters. Check Firestore rules.</div>';
            console.error(err);
        });
}

function renderLettersFromData(chapters, cards) {
    const container = document.getElementById('chaptersContainer');
    if (!chapters || chapters.length === 0) {
        container.innerHTML = '<div class="empty-state">No chapters.</div>';
        return;
    }

    container.innerHTML = '';
    chapters.forEach((chapter, i) => {
        container.appendChild(buildChapterElement(chapter, i + 1));

        const cardsInChapter = cards
            .filter(c => c.chapterId === chapter.id)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        const cardsGrid = document.getElementById('cards-' + chapter.id);
        renderChapterCards(cardsGrid, cardsInChapter, chapter.id);
    });
}

function chapterEyebrow(number) {
    return 'Chapter ' + String(number).padStart(2, '0');
}

function buildChapterElement(chapter, number) {
    chapterMeta[chapter.id] = { title: chapter.title, number };

    const gridId = 'cards-' + chapter.id;
    const el = document.createElement('section');
    el.className = 'chapter-block';
    el.id = 'chapter-' + chapter.id;
    el.innerHTML = `
        <h3 class="chapter-heading">
            <button type="button" class="chapter-toggle" aria-expanded="true" aria-controls="${escapeAttr(gridId)}">
                <span class="chapter-heading-text">
                    <span class="chapter-eyebrow">${chapterEyebrow(number)}</span>
                    <span class="chapter-title">${escapeHtml(chapter.title)}</span>
                </span>
                <span class="chapter-meta">
                    <span class="chapter-count" id="count-${escapeAttr(chapter.id)}"></span>
                    <span class="chapter-chevron" aria-hidden="true">▾</span>
                </span>
            </button>
        </h3>
        ${chapter.description
            ? `<p class="chapter-description">${escapeHtml(chapter.description)}</p>`
            : ''}
        <div class="cards-grid chapter-cards" id="${escapeAttr(gridId)}">
            <div class="skeleton skeleton-card"></div>
        </div>
    `;
    return el;
}

function letterExcerpt(message) {
    const flat = (message || '').replace(/\s+/g, ' ').trim();
    return flat.length > 150 ? flat.slice(0, 150).trimEnd() + '…' : flat;
}

function renderChapterCards(grid, cards, chapterId) {
    letterStore[chapterId] = cards;

    const countEl = document.getElementById('count-' + chapterId);
    if (countEl) countEl.textContent = cards.length === 1 ? '1 letter' : cards.length + ' letters';

    // Live updates re-render the grid; only the first render should animate in.
    const firstRender = !grid.dataset.rendered;
    grid.dataset.rendered = '1';
    grid.classList.toggle('no-anim', !firstRender);

    if (cards.length === 0) {
        grid.innerHTML = '<div class="empty-state small">No letters in this chapter yet.</div>';
    } else {
        grid.innerHTML = cards.map((card, index) => `
            <button type="button" class="letter-card"
                    data-chapter="${escapeAttr(chapterId)}" data-index="${index}"
                    style="animation-delay:${index * 0.06}s">
                ${card.dateLabel ? `<span class="letter-date">${escapeHtml(card.dateLabel)}</span>` : ''}
                <span class="letter-title">${escapeHtml(card.title)}</span>
                <span class="letter-excerpt">${escapeHtml(letterExcerpt(card.message))}</span>
                <span class="letter-more">Read letter <span aria-hidden="true">→</span></span>
            </button>
        `).join('');
    }

    if (readerState && readerState.chapterId === chapterId) refreshReader();
}

function initLetters() {
    document.getElementById('chaptersContainer').addEventListener('click', e => {
        const toggle = e.target.closest('.chapter-toggle');
        if (toggle) {
            const block     = toggle.closest('.chapter-block');
            const collapsed = block.classList.toggle('collapsed');
            toggle.setAttribute('aria-expanded', String(!collapsed));
            return;
        }

        const card = e.target.closest('.letter-card');
        if (card) openLetter(card.dataset.chapter, Number(card.dataset.index));
    });

    document.addEventListener('keydown', e => {
        const reader = document.getElementById('reader');
        if (!reader.classList.contains('active')) return;
        if (e.key === 'Escape')     closeReader();
        if (e.key === 'ArrowLeft')  readerStep(-1);
        if (e.key === 'ArrowRight') readerStep(1);
        trapFocus(reader, e);
    });
}

// ---- Letter reader ---------------------------------------------------

function openLetter(chapterId, index) {
    const cards = letterStore[chapterId];
    if (!cards || !cards[index]) return;

    readerState = { chapterId, index };
    paintReader();

    const reader = document.getElementById('reader');
    reader.classList.add('active');
    reader.setAttribute('aria-hidden', 'false');
    lockScroll();
    document.getElementById('readerClose').focus();
}

function paintReader(keepScroll) {
    const { chapterId, index } = readerState;
    const cards = letterStore[chapterId];
    const card  = cards[index];
    const meta  = chapterMeta[chapterId];

    document.getElementById('readerEyebrow').textContent =
        meta ? chapterEyebrow(meta.number) + ' · ' + meta.title : '';
    document.getElementById('readerTitle').textContent = card.title || '';
    document.getElementById('readerBody').textContent  = card.message || '';

    const sign = document.getElementById('readerSign');
    sign.hidden = !card.dateLabel;
    document.getElementById('readerDate').textContent = card.dateLabel || '';

    document.getElementById('readerCount').textContent = (index + 1) + ' of ' + cards.length;
    document.getElementById('readerPrev').disabled = index === 0;
    document.getElementById('readerNext').disabled = index === cards.length - 1;

    if (!keepScroll) document.getElementById('readerPaper').scrollTop = 0;
}

// A live Firestore update re-rendered the chapter the reader is showing.
function refreshReader() {
    const cards = letterStore[readerState.chapterId] || [];
    if (cards.length === 0) {
        closeReader();
        return;
    }
    readerState.index = Math.min(readerState.index, cards.length - 1);
    paintReader(true);
}

function readerStep(delta) {
    if (!readerState) return;
    const cards = letterStore[readerState.chapterId] || [];
    const next  = readerState.index + delta;
    if (next < 0 || next >= cards.length) return;
    readerState.index = next;
    paintReader();
}

function closeReader() {
    const reader = document.getElementById('reader');
    if (!reader.classList.contains('active')) return;

    reader.classList.remove('active');
    reader.setAttribute('aria-hidden', 'true');
    unlockScroll();

    // Hand focus back to the letter she opened, if it is still on the page.
    if (readerState) {
        const opener = document.querySelector(
            '.letter-card[data-chapter="' + CSS.escape(readerState.chapterId) + '"]' +
            '[data-index="' + readerState.index + '"]');
        if (opener) opener.focus();
    }
    readerState = null;
}

// ---- Shared dialog helpers ------------------------------------------

let scrollLocks = 0;

function lockScroll() {
    if (scrollLocks++ === 0) document.body.style.overflow = 'hidden';
}

function unlockScroll() {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) document.body.style.overflow = '';
}

// Keep Tab inside an open dialog.
function trapFocus(container, e) {
    if (e.key !== 'Tab') return;
    const focusable = [...container.querySelectorAll('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])')]
        .filter(el => el.getClientRects().length > 0);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

let galleryPhotos = [];
let lightboxIndex = 0;

let galleryUnsub = null;

function loadGallery() {
    const grid = document.getElementById('galleryGrid');

    if (galleryUnsub) {
        galleryUnsub();
        galleryUnsub = null;
    }

    if (authMode === 'guest') {
        renderGalleryFromData(MOCK_GALLERY);
        return;
    }

    grid.innerHTML = '<div class="gallery-loading">Loading photos... 🐱</div>';

    galleryUnsub = db.collection('gallery')
        .orderBy('order', 'asc')
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                grid.innerHTML = '<div class="gallery-empty">No photos yet. 🐱</div>';
                galleryPhotos = [];
                return;
            }

            const photos = [];
            snapshot.forEach(doc => photos.push({ id: doc.id, ...doc.data() }));
            renderGalleryFromData(photos);
        }, err => {
            grid.innerHTML = '<div class="gallery-empty">Could not load gallery.</div>';
            console.error(err);
        });
}

function renderGalleryFromData(photos) {
    const grid = document.getElementById('galleryGrid');
    galleryPhotos = photos || [];

    if (galleryPhotos.length === 0) {
        grid.innerHTML = '<div class="gallery-empty">No photos yet. 🐱</div>';
        return;
    }

    grid.innerHTML = galleryPhotos.map((photo, i) => `
        <div class="gallery-item" style="animation-delay:${i * 0.04}s"
             onclick="openLightbox(${i})">
            <div class="gallery-skeleton"></div>
            <img
                src="${escapeAttr(photo.thumbnailUrl || photo.imageUrl)}"
                alt="${escapeAttr(photo.caption || 'Cat photo')}"
                loading="lazy"
                onload="this.classList.add('loaded'); this.previousElementSibling.style.display='none';"
                onerror="this.closest('.gallery-item').classList.add('img-error');"
            >
            ${photo.caption ? `<div class="gallery-caption">${escapeHtml(photo.caption)}</div>` : ''}
        </div>
    `).join('');
}

function openLightbox(index) {
    if (!galleryPhotos || galleryPhotos.length === 0) return;
    lightboxIndex = index;
    renderLightbox();
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function renderLightbox() {
    const photo = galleryPhotos[lightboxIndex];
    if (!photo) return;
    const img      = document.getElementById('lightboxImg');
    const caption  = document.getElementById('lightboxCaption');

    img.src = photo.imageUrl;
    img.alt = photo.caption || 'Cat photo';

    if (photo.caption) {
        caption.textContent = photo.caption;
        caption.style.display = 'block';
    } else {
        caption.style.display = 'none';
    }

    const prev = document.querySelector('.lightbox-prev');
    const next = document.querySelector('.lightbox-next');
    if (prev && next) {
        const onlyOne = galleryPhotos.length <= 1;
        prev.style.display = onlyOne ? 'none' : 'flex';
        next.style.display = onlyOne ? 'none' : 'flex';
    }
}

function lightboxPrev() {
    lightboxIndex = (lightboxIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
    renderLightbox();
}

function lightboxNext() {
    lightboxIndex = (lightboxIndex + 1) % galleryPhotos.length;
    renderLightbox();
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = 'auto';
}

document.addEventListener('keydown', e => {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  lightboxPrev();
    if (e.key === 'ArrowRight') lightboxNext();
});

function escapeAttr(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
}

function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon   = document.querySelector('.theme-icon');

    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const saved      = localStorage.getItem('theme');

    function applyTheme(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        themeIcon.textContent = isDark ? '☀️' : '🌙';
        themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }

    applyTheme(saved ? saved === 'dark' : systemDark.matches);

    // Until she picks a theme herself, keep following the system setting.
    systemDark.addEventListener('change', e => {
        if (!localStorage.getItem('theme')) applyTheme(e.matches);
    });

    themeToggle.addEventListener('click', function () {
        const isDark = !document.body.classList.contains('dark-mode');
        themeIcon.style.transform = 'rotate(360deg) scale(0)';
        setTimeout(() => {
            applyTheme(isDark);
            themeIcon.style.transform = 'rotate(0deg) scale(1)';
        }, 200);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

function initDrawerCollapse() {
    const btn = document.getElementById('drawerCollapseBtn');
    if (!btn) return;

    const collapsed = localStorage.getItem('drawerCollapsed') === 'true';
    if (collapsed) document.body.classList.add('drawer-collapsed');

    btn.addEventListener('click', () => {
        const isNowCollapsed = document.body.classList.toggle('drawer-collapsed');
        localStorage.setItem('drawerCollapsed', isNowCollapsed);
    });
}

const stickyHeader = document.getElementById('stickyHeader');
window.addEventListener('scroll', () => {
    stickyHeader.classList.toggle('visible', window.scrollY > 100);
});

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', function () {
    createFloatingHearts();
    renderHomeContent();
    initCountdown();
    initAnniversaryCounter();
    initThemeToggle();
    initDrawerCollapse();
    initLetters();

    window.addEventListener('hashchange', routeFromHash);
    routeFromHash();
});