import { lockScroll, unlockScroll, trapFocus } from './ui.js';

let photos = [];
let index  = 0;

export function setLightboxPhotos(list) {
    photos = list;

    const lightbox = document.getElementById('lightbox');
    if (!lightbox.classList.contains('active')) return;

    if (photos.length === 0) {
        closeLightbox();
        return;
    }
    index = Math.min(index, photos.length - 1);
    renderLightbox();
}

export function openLightbox(startIndex) {
    if (photos.length === 0) return;
    index = startIndex;
    renderLightbox();

    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    lockScroll();
    lightbox.querySelector('.lightbox-close').focus();
}

function renderLightbox() {
    const photo = photos[index];
    if (!photo) return;
    const img     = document.getElementById('lightboxImg');
    const caption = document.getElementById('lightboxCaption');

    img.classList.add('is-loading');
    img.onload  = () => img.classList.remove('is-loading');
    img.onerror = () => img.classList.remove('is-loading');
    img.src = photo.imageUrl;
    img.alt = photo.caption || 'Cat photo';

    caption.textContent   = photo.caption || '';
    caption.style.display = photo.caption ? 'block' : 'none';

    document.getElementById('lightboxCount').textContent = (index + 1) + ' / ' + photos.length;

    const onlyOne = photos.length <= 1;
    document.querySelector('.lightbox-prev').style.display = onlyOne ? 'none' : 'flex';
    document.querySelector('.lightbox-next').style.display = onlyOne ? 'none' : 'flex';

    [-1, 1].forEach(step => {
        const neighbour = photos[(index + step + photos.length) % photos.length];
        if (neighbour && neighbour.imageUrl) new Image().src = neighbour.imageUrl;
    });
}

function lightboxPrev() {
    index = (index - 1 + photos.length) % photos.length;
    renderLightbox();
}

function lightboxNext() {
    index = (index + 1) % photos.length;
    renderLightbox();
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox.classList.contains('active')) return;

    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    unlockScroll();

    const opener = document.querySelector('.gallery-item[data-index="' + index + '"]');
    if (opener) opener.focus();
}

export function initLightbox() {
    const lightbox = document.getElementById('lightbox');

    lightbox.addEventListener('click', e => {
        if (e.target.closest('.lightbox-prev')) lightboxPrev();
        else if (e.target.closest('.lightbox-next')) lightboxNext();
        else if (!e.target.closest('.lightbox-content')) closeLightbox();
    });

    document.addEventListener('keydown', e => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape')     closeLightbox();
        if (e.key === 'ArrowLeft')  lightboxPrev();
        if (e.key === 'ArrowRight') lightboxNext();
        trapFocus(lightbox, e);
    });

    let touchStart = null;
    lightbox.addEventListener('touchstart', e => {
        const t = e.changedTouches[0];
        touchStart = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
    }, { passive: true });

    lightbox.addEventListener('touchend', e => {
        if (!touchStart) return;
        const t  = e.changedTouches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        if (dx < 0) lightboxNext();
        else        lightboxPrev();
    }, { passive: true });
}
