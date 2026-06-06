const firebaseConfig = {
    apiKey:            "AIzaSyALMN5lKjZXD8IXa7la_reuUO2LbuJ6l3o",
    authDomain:        "faithfully-ac2cd.firebaseapp.com",
    projectId:         "faithfully-ac2cd",
    storageBucket:     "faithfully-ac2cd.firebasestorage.app",
    messagingSenderId: "1036385139189",
    appId:             "1:1036385139189:web:90ceabbcbe3c20b16e48bc"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const sectionLoaded = { home: true, letters: false };

function switchSection(name, btn) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.section === name);
    });

    document.getElementById('section-' + name).classList.add('active');
    document.getElementById('heartsBackground').style.opacity = name === 'home' ? '1' : '0';

    if (!sectionLoaded[name]) {
        sectionLoaded[name] = true;
        if (name === 'letters') loadLetters();
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

function initCountdown() {
    const birthday = new Date('2026-06-16T00:00:00');

    function tick() {
        const now  = new Date();
        const diff = birthday - now;

        if (diff <= 0) {
            document.getElementById('countdownBlocks').style.display   = 'none';
            document.getElementById('countdownBirthday').style.display = 'block';
            return;
        }

        const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('cd-days').textContent    = String(days).padStart(2, '0');
        document.getElementById('cd-hours').textContent   = String(hours).padStart(2, '0');
        document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
    }

    tick();
    setInterval(tick, 1000);
}

function loadLetters() {
    const container = document.getElementById('chaptersContainer');
    container.innerHTML = '<div class="empty-state" style="opacity:.5">Loading...</div>';

    db.collection('chapters')
        .orderBy('order', 'asc')
        .onSnapshot(chaptersSnap => {
            if (chaptersSnap.empty) {
                container.innerHTML = '<div class="empty-state">No chapters yet.</div>';
                return;
            }

            const chapters = [];
            chaptersSnap.forEach(doc => chapters.push({ id: doc.id, ...doc.data() }));

            container.innerHTML = '';

            chapters.forEach(chapter => {
                const chapterEl = document.createElement('div');
                chapterEl.className = 'chapter-block';
                chapterEl.id = 'chapter-' + chapter.id;
                chapterEl.innerHTML = `
                    <div class="chapter-header">
                        <div class="chapter-title-row">
                            <span class="chapter-icon">📖</span>
                            <h3 class="chapter-title">${escapeHtml(chapter.title)}</h3>
                        </div>
                        ${chapter.description
                            ? `<p class="chapter-description">${escapeHtml(chapter.description)}</p>`
                            : ''}
                    </div>
                    <div class="cards-grid chapter-cards" id="cards-${chapter.id}">
                        <div class="empty-state small">Loading...</div>
                    </div>
                `;
                container.appendChild(chapterEl);

                db.collection('cards')
                    .where('chapterId', '==', chapter.id)
                    .orderBy('order', 'asc')
                    .onSnapshot(cardsSnap => {
                        const cardsGrid = document.getElementById('cards-' + chapter.id);
                        if (!cardsGrid) return;
                        const cards = [];
                        cardsSnap.forEach(doc => cards.push({ id: doc.id, ...doc.data() }));
                        renderChapterCards(cardsGrid, cards, chapter.id);
                    });
            });
        }, err => {
            container.innerHTML = '<div class="empty-state">Could not load letters. Check Firestore rules.</div>';
            console.error(err);
        });
}

function renderChapterCards(grid, cards, chapterId) {
    if (cards.length === 0) {
        grid.innerHTML = '<div class="empty-state small">No letters in this chapter yet.</div>';
        return;
    }

    grid.innerHTML = cards.map((card, index) => `
        <div class="card" onclick="toggleCard('${chapterId}-${index}')" style="animation-delay:${index * 0.1}s">
            <div class="card-header">
                <div class="card-title">${escapeHtml(card.title)}</div>
                <div class="card-date">${escapeHtml(card.dateLabel || '')}</div>
            </div>
            <div class="card-content" id="card-content-${chapterId}-${index}">
                <div class="card-message">${escapeHtml(card.message)}</div>
            </div>
            <div class="card-toggle-icon">▼</div>
        </div>
    `).join('');
}

function toggleCard(cardId) {
    const cardContent = document.getElementById('card-content-' + cardId);
    if (!cardContent) return;
    const card = cardContent.closest('.card');
    const icon = card.querySelector('.card-toggle-icon');

    document.querySelectorAll('.card.expanded').forEach(other => {
        if (other !== card) {
            other.classList.remove('expanded');
            const otherContent = other.querySelector('.card-content');
            const otherIcon    = other.querySelector('.card-toggle-icon');
            if (otherContent) otherContent.style.maxHeight = '0';
            if (otherIcon)    otherIcon.style.transform    = 'rotate(0deg)';
        }
    });

    const isExpanded = card.classList.contains('expanded');
    if (isExpanded) {
        card.classList.remove('expanded');
        cardContent.style.maxHeight = '0';
        icon.style.transform = 'rotate(0deg)';
    } else {
        card.classList.add('expanded');
        cardContent.style.maxHeight = cardContent.scrollHeight + 'px';
        icon.style.transform = 'rotate(180deg)';
    }
}

function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon   = document.querySelector('.theme-icon');

    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark-mode', currentTheme === 'dark');
    themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', function () {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        themeIcon.style.transform = 'rotate(360deg) scale(0)';
        setTimeout(() => {
            themeIcon.textContent     = isDark ? '☀️' : '🌙';
            themeIcon.style.transform = 'rotate(0deg) scale(1)';
        }, 200);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
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
    initCountdown();
    initThemeToggle();
});
