import { authMode } from './auth.js';
import { db } from './firebase.js';
import { MOCK_GALLERY } from './data/mock.js';
import { setLightboxPhotos, openLightbox } from './lightbox.js';
import { escapeHtml, escapeAttr } from './ui.js';

let galleryUnsub = null;

export function loadGallery() {
    const grid = document.getElementById('galleryGrid');

    if (galleryUnsub) {
        galleryUnsub();
        galleryUnsub = null;
    }

    if (authMode === 'guest') {
        renderGallery(MOCK_GALLERY);
        return;
    }

    grid.innerHTML = '<div class="gallery-loading">Loading photos... 🐱</div>';

    galleryUnsub = db.collection('gallery')
        .orderBy('order', 'asc')
        .onSnapshot(snapshot => {
            const photos = [];
            snapshot.forEach(doc => photos.push({ id: doc.id, ...doc.data() }));
            renderGallery(photos);
        }, err => {
            grid.innerHTML = '<div class="gallery-empty">Could not load gallery.</div>';
            console.error(err);
        });
}

function renderGallery(list) {
    const grid   = document.getElementById('galleryGrid');
    const photos = list || [];

    setLightboxPhotos(photos);

    if (photos.length === 0) {
        grid.innerHTML = '<div class="gallery-empty">No photos yet. 🐱</div>';
        return;
    }

    grid.innerHTML = photos.map((photo, i) => `
        <button type="button" class="gallery-item" data-index="${i}"
                style="animation-delay:${Math.min(i, 12) * 0.04}s"
                aria-label="${escapeAttr(photo.caption || 'Open photo ' + (i + 1))}">
            <div class="gallery-skeleton skeleton"></div>
            <img src="${escapeAttr(photo.thumbnailUrl || photo.imageUrl)}" alt="" loading="lazy">
            ${photo.caption ? `<span class="gallery-caption">${escapeHtml(photo.caption)}</span>` : ''}
        </button>
    `).join('');
}

export function initGallery() {
    const grid = document.getElementById('galleryGrid');

    grid.addEventListener('click', e => {
        const item = e.target.closest('.gallery-item');
        if (item) openLightbox(Number(item.dataset.index));
    });

    // load and error events don't bubble, so listen in the capture phase.
    grid.addEventListener('load', e => {
        if (e.target.tagName !== 'IMG') return;
        e.target.classList.add('loaded');
        e.target.previousElementSibling.style.display = 'none';
    }, true);

    grid.addEventListener('error', e => {
        if (e.target.tagName === 'IMG') e.target.closest('.gallery-item').classList.add('img-error');
    }, true);
}
