import { authMode, isAdmin, onAuthChange } from './auth.js';
import { auth, db } from './firebase.js';
import { MOCK_VOICE, MOCK_VOICE_PLAYERS } from './data/mock.js';
import { callWorker, fail } from './worker-client.js';
import { openRecorder } from './voice-recorder.js';
import { escapeHtml, escapeAttr, formatClock } from './ui.js';

const UNKNOWN_EMOJI = '🎙️';

const audio = new Audio();
audio.preload = 'none';

const blobUrls = new Map();

let clipsUnsub    = null;
let playersUnsub  = null;
let clips         = [];
let players       = {};
let clipsLoaded   = false;
let current       = null;
let loadToken     = 0;

export function getClips() {
    return clips;
}

function list() {
    return document.getElementById('voiceList');
}

function emojiFor(uid) {
    return players[uid] || UNKNOWN_EMOJI;
}

function dateLabel(clip) {
    if (authMode === 'guest') return '';
    const date = clip.createdAt && typeof clip.createdAt.toDate === 'function' ? clip.createdAt.toDate() : null;
    if (!date) return 'Just now';
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

function clipHtml(clip) {
    const canAdmin = isAdmin && authMode === 'authed';
    const emoji    = emojiFor(clip.uid);
    const caption  = clip.caption
        ? `<p class="voice-caption">${escapeHtml(clip.caption)}</p>`
        : '<p class="voice-caption is-empty">Voice message</p>';

    return `<li class="voice-clip" data-id="${escapeAttr(clip.id)}" data-state="idle">
        <button type="button" class="voice-play" data-action="play" aria-label="Play recording"${clip.audioPath ? '' : ' disabled'}>
            <span class="voice-play-icon" aria-hidden="true"></span>
        </button>
        <div class="voice-body">
            ${caption}
            <div class="voice-track" data-action="seek" role="progressbar" aria-label="Playback progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <span class="voice-fill"></span>
            </div>
            <p class="voice-meta">
                <span class="voice-sender" role="img" aria-label="Sent by ${escapeAttr(emoji)}">${escapeHtml(emoji)}</span>
                <span class="voice-time">0:00 / ${formatClock(clip.duration)}</span>
                <span class="voice-date">${escapeHtml(dateLabel(clip))}</span>
            </p>
            <p class="voice-error" role="alert"></p>
        </div>
        ${canAdmin ? `<div class="voice-admin" role="group" aria-label="Recording tools">
            <button type="button" class="admin-btn" data-admin="edit-voice">Edit caption</button>
            <button type="button" class="admin-btn admin-btn-danger" data-admin="delete-voice">Delete</button>
        </div>` : ''}
    </li>`;
}

function totalFor(clip) {
    return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : clip.duration || 0;
}

function syncRow(row) {
    const clip   = clips.find(c => c.id === row.dataset.id);
    const active = current && current.id === row.dataset.id;
    const state  = active ? current.state : 'idle';
    const label  = { idle: 'Play recording', paused: 'Play recording', loading: 'Loading recording', playing: 'Pause recording', error: 'Play recording' }[state];

    row.dataset.state = state;
    row.querySelector('.voice-play').setAttribute('aria-label', label);
    row.querySelector('.voice-error').textContent = state === 'error' ? current.message : '';

    const played = active && state !== 'error' && state !== 'loading' ? audio.currentTime : 0;
    const total  = clip ? (active ? totalFor(clip) : clip.duration || 0) : 0;
    const pct    = total > 0 ? Math.min(100, (played / total) * 100) : 0;

    row.querySelector('.voice-fill').style.width = pct + '%';
    row.querySelector('.voice-track').setAttribute('aria-valuenow', String(Math.round(pct)));
    row.querySelector('.voice-time').textContent = `${formatClock(played)} / ${formatClock(total)}`;
}

function syncAll() {
    list().querySelectorAll('.voice-clip').forEach(syncRow);
}

function syncCurrent() {
    if (!current) return;
    const row = list().querySelector(`.voice-clip[data-id="${CSS.escape(current.id)}"]`);
    if (row) syncRow(row);
}

function stopPlayback() {
    loadToken++;
    current = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
}

function releaseBlobs() {
    blobUrls.forEach(url => URL.revokeObjectURL(url));
    blobUrls.clear();
}

async function togglePlay(id) {
    const clip = clips.find(c => c.id === id);
    if (!clip || !clip.audioPath) return;

    if (current && current.id === id && current.state === 'loading') return;
    if (current && current.id === id && current.state !== 'error') {
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
        return;
    }

    stopPlayback();
    const token = ++loadToken;
    current = { id, state: 'loading' };
    syncAll();

    try {
        let url = blobUrls.get(clip.audioPath);
        if (!url) {
            const res = await callWorker('GET', clip.audioPath);
            url = URL.createObjectURL(await res.blob());
            if (token !== loadToken) {
                URL.revokeObjectURL(url);
                return;
            }
            blobUrls.set(clip.audioPath, url);
        }
        if (token !== loadToken) return;

        audio.src = url;
        await audio.play();
    } catch (err) {
        if (token !== loadToken) return;
        console.error(err);
        current = { id, state: 'error', message: err.userMessage || 'Could not play this recording.' };
        syncAll();
    }
}

function seek(id, event) {
    if (!current || current.id !== id || (current.state !== 'playing' && current.state !== 'paused')) return;
    const clip = clips.find(c => c.id === id);
    const total = clip ? totalFor(clip) : 0;
    if (!total) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * total;
    syncCurrent();
}

function renderClips() {
    const container = list();

    if (current && !clips.some(c => c.id === current.id)) stopPlayback();

    if (clips.length === 0) {
        container.innerHTML = '<li class="voice-empty">No recordings yet. Tap Record to say something. 🎙️</li>';
        return;
    }

    container.innerHTML = clips.map(clipHtml).join('');
    syncAll();
}

export function loadVoice() {
    const container = list();

    if (clipsUnsub)   clipsUnsub();
    if (playersUnsub) playersUnsub();
    clipsUnsub = playersUnsub = null;

    stopPlayback();
    releaseBlobs();

    if (authMode === 'guest') {
        clips   = MOCK_VOICE;
        players = MOCK_VOICE_PLAYERS;
        renderClips();
        return;
    }

    clips   = [];
    players = {};
    clipsLoaded = false;
    container.innerHTML = '<li class="voice-empty">Loading recordings… 🎙️</li>';

    playersUnsub = db.collection('settings').doc('draw').onSnapshot(snap => {
        players = (snap.exists && snap.data().players) || {};
        if (clipsLoaded) renderClips();
    }, err => console.error(err));

    clipsUnsub = db.collection('voice')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            clips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            clipsLoaded = true;
            renderClips();
        }, err => {
            container.innerHTML = '<li class="voice-empty">Could not load recordings.</li>';
            console.error(err);
        });
}

async function saveVoice(blob, { caption, duration, mimeType, ext }) {
    const user = auth.currentUser;
    if (!user) throw fail('You are signed out. Sign in and try again.');

    const audioPath = `voice/${user.uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    await callWorker('PUT', audioPath, blob, mimeType);

    try {
        await db.collection('voice').add({
            audioPath,
            caption,
            duration,
            mimeType,
            size: blob.size,
            uid: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        await callWorker('DELETE', audioPath).catch(() => {});
        throw err;
    }
}

export function initVoice() {
    const container = list();
    const recordBtn = document.getElementById('recordVoiceBtn');

    recordBtn.addEventListener('click', () => openRecorder({ save: saveVoice }));
    onAuthChange(() => { recordBtn.hidden = authMode !== 'authed'; });

    container.addEventListener('click', e => {
        const row = e.target.closest('.voice-clip');
        const hit = e.target.closest('[data-action]');
        if (!row || !hit) return;

        if (hit.dataset.action === 'play') togglePlay(row.dataset.id);
        else if (hit.dataset.action === 'seek') seek(row.dataset.id, { currentTarget: hit, clientX: e.clientX });
    });

    audio.addEventListener('playing', () => {
        if (!current || current.state === 'error') return;
        current.state = 'playing';
        syncAll();
    });

    audio.addEventListener('pause', () => {
        if (!current || audio.ended || current.state === 'loading') return;
        current.state = 'paused';
        syncAll();
    });

    audio.addEventListener('ended', () => {
        current = null;
        syncAll();
    });

    audio.addEventListener('timeupdate', syncCurrent);
    audio.addEventListener('durationchange', syncCurrent);
}
