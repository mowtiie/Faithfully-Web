import { authMode, onAuthChange } from './auth.js';

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

const DAY_MS = 1000 * 60 * 60 * 24;

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

    document.getElementById('homeTitle').textContent         = c.title;
    document.getElementById('homeSubtitle').innerHTML        = c.subtitle;
    document.getElementById('stickyTitle').textContent       = c.stickyTitle;
    document.getElementById('countdownLabel').textContent    = c.countdownLabel;
    document.getElementById('countdownBirthday').textContent = c.countdownFinish;
    document.getElementById('anniversaryLabel').textContent  = c.anniversaryLabel;
    document.getElementById('anniversaryUnit').textContent   = c.anniversaryUnit;

    document.getElementById('countdownBlocks').style.display   = 'flex';
    document.getElementById('countdownBirthday').style.display = 'none';
}

function countdownTick() {
    const target = authMode === 'authed' ? getRealCountdownTarget() : getMockCountdownTarget();
    const diff = target - new Date();

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

export function initHome() {
    renderHomeContent();
    countdownTick();
    anniversaryTick();
    setInterval(countdownTick, 1000);
    setInterval(anniversaryTick, 60 * 60 * 1000);

    onAuthChange(() => {
        renderHomeContent();
        countdownTick();
        anniversaryTick();
    });
}
