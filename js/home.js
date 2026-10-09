import { authMode, onAuthChange } from './auth.js';
import { db } from './firebase.js';

const HOME_MOCK = {
    title:            "To Someone Special.",
    subtitle:         "A quiet place made just for you — letters, memories, and countdowns for the moments ahead. 🌻",
    stickyTitle:      "For Someone Special",
    countdownLabel:   "Counting down to something wonderful 🎂",
    countdownFinish:  "Something wonderful is here! 🎉",
    anniversaryLabel: "Days on this journey 💛",
    anniversaryUnit:  "days so far"
};

const TEXT_FIELDS = Object.keys(HOME_MOCK);
const DAY_MS = 1000 * 60 * 60 * 24;

let settings = null;
let settingsResolved = false;
let settingsUnsub = null;

function homeContent() {
    const content = { ...HOME_MOCK };
    if (authMode === 'authed' && settings) {
        TEXT_FIELDS.forEach(key => {
            if (typeof settings[key] === 'string' && settings[key]) content[key] = settings[key];
        });
    }
    return content;
}

function getCountdownTarget() {
    if (authMode === 'authed' && settings && settings.countdownTarget) {
        return settings.countdownTarget.toDate();
    }
    const now = new Date();
    return new Date(now.getFullYear() + 1, 11, 31, 0, 0, 0);
}

function getAnniversaryStart() {
    if (authMode === 'authed' && settings && settings.anniversaryStart) {
        return settings.anniversaryStart.toDate();
    }

    let stored = localStorage.getItem('demoFirstVisit');
    if (!stored) {
        stored = new Date().toISOString();
        localStorage.setItem('demoFirstVisit', stored);
    }
    return new Date(stored);
}

function setMultiline(el, text) {
    el.textContent = '';
    text.split(/<br\s*\/?>|\n/).forEach((line, i) => {
        if (i > 0) el.appendChild(document.createElement('br'));
        el.appendChild(document.createTextNode(line.trim()));
    });
}

function renderHomeContent() {
    const c = homeContent();

    document.body.classList.toggle('home-pending', authMode === 'authed' && !settingsResolved);

    document.getElementById('homeTitle').textContent         = c.title;
    setMultiline(document.getElementById('homeSubtitle'), c.subtitle);
    document.getElementById('stickyTitle').textContent       = c.stickyTitle;
    document.getElementById('countdownLabel').textContent    = c.countdownLabel;
    document.getElementById('countdownBirthday').textContent = c.countdownFinish;
    document.getElementById('anniversaryLabel').textContent  = c.anniversaryLabel;
    document.getElementById('anniversaryUnit').textContent   = c.anniversaryUnit;

    document.getElementById('countdownBlocks').style.display   = 'flex';
    document.getElementById('countdownBirthday').style.display = 'none';
}

function countdownTick() {
    const diff = getCountdownTarget() - new Date();

    if (diff <= 0) {
        document.getElementById('countdownBlocks').style.display   = 'none';
        document.getElementById('countdownBirthday').style.display = 'block';
        return;
    }

    document.getElementById('countdownBlocks').style.display   = 'flex';
    document.getElementById('countdownBirthday').style.display = 'none';

    const days    = Math.floor(diff / DAY_MS);
    const hours   = Math.floor((diff % DAY_MS) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('cd-days').textContent    = String(days).padStart(2, '0');
    document.getElementById('cd-hours').textContent   = String(hours).padStart(2, '0');
    document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
}

function anniversaryTick() {
    const diff = new Date() - getAnniversaryStart();
    document.getElementById('anniversaryDays').textContent =
        diff < 0 ? '0' : Math.floor(diff / DAY_MS);
}

function refreshHome() {
    renderHomeContent();
    countdownTick();
    anniversaryTick();
}

function watchSettings(mode) {
    if (settingsUnsub) {
        settingsUnsub();
        settingsUnsub = null;
    }
    settings = null;
    settingsResolved = false;

    if (mode === 'authed') {
        settingsUnsub = db.collection('settings').doc('home').onSnapshot(doc => {
            settings = doc.exists ? doc.data() : null;
            settingsResolved = true;
            refreshHome();
        }, err => {
            console.error(err);
            settingsResolved = true;
            refreshHome();
        });
    }

    refreshHome();
}

export function initHome() {
    refreshHome();
    setInterval(countdownTick, 1000);
    setInterval(anniversaryTick, 60 * 60 * 1000);
    onAuthChange(watchSettings);
}
