import { authReady, onAuthChange } from './auth.js';
import { loadLetters } from './letters.js';
import { loadGallery } from './gallery.js';
import { loadDraw } from './draw.js';
import { loadApps } from './apps.js';
import { loadVoice } from './voice.js';
import { prefersReducedMotion } from './ui.js';

const SECTION_NAMES = ['home', 'letters', 'apps', 'gallery', 'draw', 'voice'];

const loaders = { letters: loadLetters, apps: loadApps, gallery: loadGallery, draw: loadDraw, voice: loadVoice };
const sectionLoaded = { home: true, letters: false, apps: false, gallery: false, draw: false, voice: false };

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
        const isActive = b.dataset.section === name || (b.dataset.sections || '').split(' ').includes(name);
        b.classList.toggle('active', isActive);
        if (isActive) b.setAttribute('aria-current', 'page');
        else          b.removeAttribute('aria-current');
    });

    document.getElementById('section-' + name).classList.add('active');
    document.getElementById('heartsBackground').style.opacity = name === 'home' ? '1' : '0';

    // Data sections wait for the first auth result, otherwise a refresh
    // on #letters would flash sample content at a signed-in user.
    if (loaders[name] && authReady && !sectionLoaded[name]) {
        sectionLoaded[name] = true;
        loaders[name]();
    }

    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function reloadAuthDependentSections() {
    sectionLoaded.letters = false;
    sectionLoaded.apps    = false;
    sectionLoaded.gallery = false;
    sectionLoaded.draw    = false;
    sectionLoaded.voice   = false;

    const active = document.querySelector('.page-section.active');
    const name   = active && active.id.replace('section-', '');
    if (loaders[name]) {
        sectionLoaded[name] = true;
        loaders[name]();
    }
}

export function initRouter() {
    document.querySelectorAll('.nav-btn[data-section]').forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });

    window.addEventListener('hashchange', routeFromHash);
    onAuthChange(reloadAuthDependentSections);
    routeFromHash();
}
