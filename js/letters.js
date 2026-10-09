import { authMode } from './auth.js';
import { db } from './firebase.js';
import { MOCK_CHAPTERS, MOCK_CARDS } from './data/mock.js';
import { letterStore, chapterMeta, chapterEyebrow } from './letter-store.js';
import { openLetter, refreshReader } from './reader.js';
import { escapeHtml, escapeAttr } from './ui.js';

const LETTERS_SKELETON = `
    <div class="chapter-block" aria-hidden="true">
        <div class="skeleton skeleton-heading"></div>
        <div class="cards-grid">
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
        </div>
    </div>`;

// Stale listeners keep firing after sign-out and their permission errors
// would overwrite the sample letters, so every reload detaches them first.
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

export function loadLetters() {
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

    refreshReader(chapterId);
}

export function initLetters() {
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
}
