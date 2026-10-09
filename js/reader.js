import { letterStore, chapterMeta, chapterEyebrow } from './letter-store.js';
import { lockScroll, unlockScroll, trapFocus, prefersReducedMotion } from './ui.js';

let readerState = null;

export function openLetter(chapterId, index) {
    const cards = letterStore[chapterId];
    if (!cards || !cards[index]) return;

    readerState = { chapterId, index };
    paintReader();

    const reader = document.getElementById('reader');
    reader.classList.add('active');
    reader.setAttribute('aria-hidden', 'false');
    lockScroll();
    document.getElementById('readerTitle').focus({ preventScroll: true });
}

function paintReader(keepScroll) {
    const { chapterId, index } = readerState;
    const cards = letterStore[chapterId];
    const card  = cards[index];
    const meta  = chapterMeta[chapterId];

    document.getElementById('readerEyebrow').textContent =
        meta ? chapterEyebrow(meta.number) + ' · ' + meta.title : '';
    document.getElementById('readerTitle').textContent = card.title || '';
    paintReaderBody(card.message || '');

    document.getElementById('readerSign').hidden = !card.dateLabel;
    document.getElementById('readerDate').textContent = card.dateLabel || '';

    document.getElementById('readerCount').textContent = (index + 1) + ' of ' + cards.length;
    document.getElementById('readerPrev').disabled = index === 0;

    const atEnd = index === cards.length - 1;
    document.getElementById('readerNext').textContent = !atEnd
        ? 'Next →'
        : nextChapterId(chapterId) ? 'Next chapter →' : 'Back to chapter';

    if (!keepScroll) document.getElementById('readerPaper').scrollTop = 0;
    updateReaderScroll();

    if (!keepScroll && document.getElementById('reader').classList.contains('active')) {
        document.getElementById('readerAnnounce').textContent =
            'Letter ' + (index + 1) + ' of ' + cards.length + ': ' + (card.title || '');
    }
}

function paintReaderBody(message) {
    const body = document.getElementById('readerBody');
    body.textContent = '';
    message.split(/\n\s*\n/).forEach(text => {
        if (!text.trim()) return;
        const p = document.createElement('p');
        p.textContent = text.trim();
        body.appendChild(p);
    });

    if (!body.firstChild) {
        const empty = document.createElement('p');
        empty.className = 'reader-empty';
        empty.textContent = 'This letter is still being written. 🌻';
        body.appendChild(empty);
    }
}

function updateReaderScroll() {
    const paper = document.getElementById('readerPaper');
    const max   = paper.scrollHeight - paper.clientHeight;
    const ratio = max > 0 ? Math.min(1, paper.scrollTop / max) : 0;
    document.getElementById('readerProgress').style.transform = 'scaleX(' + ratio + ')';
    document.getElementById('readerTop').classList.toggle('visible', paper.scrollTop > 600);
}

function readerToTop() {
    document.getElementById('readerPaper')
        .scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export function refreshReader(chapterId) {
    if (!readerState || readerState.chapterId !== chapterId) return;

    const cards = letterStore[chapterId] || [];
    if (cards.length === 0) {
        closeReader();
        return;
    }
    readerState.index = Math.min(readerState.index, cards.length - 1);
    paintReader(true);
}

function nextChapterId(chapterId) {
    const ids = [...document.querySelectorAll('#chaptersContainer .chapter-cards')]
        .map(grid => grid.id.slice('cards-'.length));
    const at = ids.indexOf(chapterId);
    if (at === -1) return null;
    return ids.slice(at + 1).find(id => (letterStore[id] || []).length > 0) || null;
}

function readerStep(delta) {
    if (!readerState) return;
    const cards = letterStore[readerState.chapterId] || [];
    const next  = readerState.index + delta;
    if (next >= cards.length && delta > 0) {
        const chapterId = nextChapterId(readerState.chapterId);
        if (chapterId) {
            readerState = { chapterId, index: 0 };
            paintReader();
        }
        return;
    }
    if (next < 0 || next >= cards.length) return;
    readerState.index = next;
    paintReader();
}

function readerNext() {
    if (!readerState) return;
    const cards = letterStore[readerState.chapterId] || [];
    const atEnd = readerState.index === cards.length - 1;
    if (atEnd && !nextChapterId(readerState.chapterId)) closeReader();
    else readerStep(1);
}

function closeReader() {
    const reader = document.getElementById('reader');
    if (!reader.classList.contains('active')) return;

    reader.classList.remove('active');
    reader.setAttribute('aria-hidden', 'true');
    unlockScroll();

    if (readerState) {
        const opener = document.querySelector(
            '.letter-card[data-chapter="' + CSS.escape(readerState.chapterId) + '"]' +
            '[data-index="' + readerState.index + '"]');
        if (opener) opener.focus();
    }
    readerState = null;
}

function initSwipe(paper) {
    let swipe = null;
    paper.addEventListener('touchstart', e => {
        swipe = e.touches.length === 1
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : null;
    }, { passive: true });
    paper.addEventListener('touchend', e => {
        if (!swipe) return;
        const t  = e.changedTouches[0];
        const dx = t.clientX - swipe.x;
        const dy = t.clientY - swipe.y;
        swipe = null;
        if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        readerStep(dx < 0 ? 1 : -1);
    }, { passive: true });
    paper.addEventListener('touchcancel', () => { swipe = null; }, { passive: true });
}

export function initReader() {
    const reader = document.getElementById('reader');
    const paper  = document.getElementById('readerPaper');

    reader.querySelector('.reader-backdrop').addEventListener('click', closeReader);
    document.getElementById('readerClose').addEventListener('click', closeReader);
    document.getElementById('readerPrint').addEventListener('click', () => window.print());
    document.getElementById('readerTop').addEventListener('click', readerToTop);
    document.getElementById('readerPrev').addEventListener('click', () => readerStep(-1));
    document.getElementById('readerNext').addEventListener('click', readerNext);

    paper.addEventListener('scroll', updateReaderScroll, { passive: true });
    initSwipe(paper);

    document.addEventListener('keydown', e => {
        if (!reader.classList.contains('active')) return;
        if (e.key === 'Escape')     closeReader();
        if (e.key === 'ArrowLeft')  readerStep(-1);
        if (e.key === 'ArrowRight') readerStep(1);
        trapFocus(reader, e);
    });
}
