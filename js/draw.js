import { authMode } from './auth.js';
import { auth, db, ALLOWED_UIDS } from './firebase.js';

const BRUSH_SIZES   = [0.006, 0.014, 0.03];
const ERASER_SCALE  = 2.5;
const MIN_POINT_GAP = 0.002;
const MAX_STROKES   = 400;
const MAX_TURN_BYTES = 800000;
const UNKNOWN_EMOJI = '🎨';

let el;
let ctx;
let rootStyle;
let width = 0;

let committed = [];
let pending   = [];
let active    = null;
let activeId  = null;
let color;
let sizeIndex = 1;
let erasing   = false;

let board      = { epoch: 0, lastBy: null };
let turns      = [];
let players    = {};
let boardReady = false;
let sending    = false;
let loaded     = false;
let unsubs     = [];
let clearTimer = null;

function inkColor(n) {
    return rootStyle.getPropertyValue(`--ink-${n}`).trim();
}

function boardRef() {
    return db.collection('draw').doc('board');
}

function myUid() {
    return auth.currentUser ? auth.currentUser.uid : null;
}

function otherUid() {
    return [...ALLOWED_UIDS].find(uid => uid !== myUid());
}

function emojiFor(uid) {
    return players[uid] || UNKNOWN_EMOJI;
}

function isMyTurn() {
    if (authMode !== 'authed') return true;
    return boardReady && board.lastBy !== myUid();
}

function toStored(stroke) {
    return {
        c: stroke.color,
        s: stroke.size,
        e: stroke.eraser,
        p: stroke.points.flat()
    };
}

function fromStored(stored) {
    const points = [];
    for (let i = 0; i + 1 < stored.p.length; i += 2) points.push([stored.p[i], stored.p[i + 1]]);
    return { color: stored.c, size: stored.s, eraser: stored.e, points };
}

function drawStroke(stroke) {
    const pts = stroke.points;
    if (pts.length === 0) return;

    const r = (stroke.size * width) / 2;
    const h = el.canvas.height / (window.devicePixelRatio || 1);
    const px = p => p[0] * width;
    const py = p => p[1] * h;

    ctx.save();
    ctx.globalCompositeOperation = stroke.eraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle   = stroke.color;
    ctx.lineWidth   = r * 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(px(pts[0]), py(pts[0]), r, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(px(pts[0]), py(pts[0]));
        for (let i = 1; i < pts.length - 1; i++) {
            const mx = (px(pts[i]) + px(pts[i + 1])) / 2;
            const my = (py(pts[i]) + py(pts[i + 1])) / 2;
            ctx.quadraticCurveTo(px(pts[i]), py(pts[i]), mx, my);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(px(last), py(last));
        ctx.stroke();
    }
    ctx.restore();
}

function redraw() {
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    committed.forEach(drawStroke);
    pending.forEach(drawStroke);
    if (active) drawStroke(active);
}

function resize() {
    const rect = el.stage.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    width = rect.width;
    el.canvas.width  = Math.round(rect.width * dpr);
    el.canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
}

function setNote(text) {
    el.note.textContent = text;
}

function updateUI() {
    const authed = authMode === 'authed';
    const mine   = isMyTurn();
    const last   = authed ? board.lastBy : null;

    el.badge.hidden = !last;
    if (last) {
        el.badge.textContent = emojiFor(last);
        el.badge.setAttribute('aria-label', `${emojiFor(last)} drew last`);
    }

    if (!loaded)          el.statusText.textContent = '';
    else if (!authed)     el.statusText.textContent = 'Demo mode — sign in to draw together.';
    else if (!boardReady) el.statusText.textContent = 'Loading the paper…';
    else if (mine)        el.statusText.textContent = last ? 'Your turn — add something, then tap Done.' : 'Your turn — start the drawing!';
    else                  el.statusText.textContent = `Waiting for ${emojiFor(otherUid())} to draw…`;

    el.board.classList.toggle('is-locked', !mine);
    el.tools.forEach(btn => { btn.disabled = !mine; });
    el.undo.disabled  = !mine || pending.length === 0;
    el.done.hidden    = !authed;
    el.done.disabled  = !mine || pending.length === 0 || sending;
    el.clear.disabled = authed && (!boardReady || sending);
}

function rebuild() {
    committed = turns
        .filter(t => t.epoch === board.epoch)
        .flatMap(t => t.strokes.map(fromStored));
    redraw();
    updateUI();
}

function stopListening() {
    unsubs.forEach(unsub => unsub());
    unsubs = [];
}

function onListenError(err) {
    console.error(err);
    setNote('Could not load the drawing.');
}

export function loadDraw() {
    stopListening();
    committed  = [];
    pending    = [];
    turns      = [];
    players    = {};
    board      = { epoch: 0, lastBy: null };
    boardReady = false;
    sending    = false;
    loaded     = true;
    setNote('');
    redraw();
    updateUI();

    if (authMode !== 'authed') return;

    unsubs.push(db.collection('settings').doc('draw').onSnapshot(snap => {
        players = (snap.exists && snap.data().players) || {};
        updateUI();
    }, onListenError));

    unsubs.push(boardRef().onSnapshot(snap => {
        const data = snap.exists ? snap.data() : {};
        board = { epoch: data.epoch || 0, lastBy: data.lastBy || null };
        boardReady = true;
        rebuild();
    }, onListenError));

    unsubs.push(boardRef().collection('turns').orderBy('createdAt', 'asc').onSnapshot(snap => {
        turns = snap.docs.map(doc => {
            const d = doc.data();
            return { epoch: d.epoch || 0, strokes: d.strokes || [] };
        });
        rebuild();
    }, onListenError));
}

async function submitTurn() {
    if (sending || pending.length === 0 || !isMyTurn()) return;

    const strokes = pending.map(toStored);
    if (JSON.stringify(strokes).length > MAX_TURN_BYTES) {
        setNote('That is a lot of drawing for one turn — undo a little.');
        return;
    }

    sending = true;
    setNote('');
    updateUI();

    const stamp = firebase.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(boardRef().collection('turns').doc(), {
        uid: myUid(), epoch: board.epoch, strokes, createdAt: stamp
    });
    batch.set(boardRef(), { lastBy: myUid(), epoch: board.epoch, updatedAt: stamp }, { merge: true });

    try {
        await batch.commit();
        pending = [];
    } catch (err) {
        console.error(err);
        setNote('Could not send your turn. Try again.');
    }
    sending = false;
    redraw();
    updateUI();
}

async function clearPaper() {
    clearTimeout(clearTimer);
    el.clear.textContent = 'Clear paper';
    el.clear.dataset.armed = 'false';

    pending = [];
    if (authMode !== 'authed') {
        redraw();
        updateUI();
        return;
    }

    sending = true;
    updateUI();
    try {
        await boardRef().set({
            epoch: board.epoch + 1,
            lastBy: null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (err) {
        console.error(err);
        setNote('Could not clear the paper. Try again.');
    }
    sending = false;
    redraw();
    updateUI();
}

function onClearClick() {
    if (el.clear.dataset.armed === 'true') {
        clearPaper();
        return;
    }
    el.clear.dataset.armed = 'true';
    el.clear.textContent = 'Tap again to clear';
    clearTimer = setTimeout(() => {
        el.clear.dataset.armed = 'false';
        el.clear.textContent = 'Clear paper';
    }, 3000);
}

function toPoint(e) {
    const rect = el.canvas.getBoundingClientRect();
    return [
        Math.round(((e.clientX - rect.left) / rect.width) * 10000) / 10000,
        Math.round(((e.clientY - rect.top) / rect.height) * 10000) / 10000
    ];
}

function addPoint(e) {
    const p    = toPoint(e);
    const last = active.points[active.points.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= MIN_POINT_GAP) active.points.push(p);
}

function finishStroke() {
    if (!active) return;
    if (pending.length >= MAX_STROKES) setNote('That is the most strokes for one turn.');
    else pending.push(active);
    active   = null;
    activeId = null;
    updateUI();
}

function press(buttons, target) {
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === target)));
}

export function initDraw() {
    el = {
        canvas:     document.getElementById('drawCanvas'),
        stage:      document.querySelector('.draw-stage'),
        board:      document.querySelector('.draw-board'),
        badge:      document.getElementById('drawBadge'),
        statusText: document.getElementById('drawStatusText'),
        note:       document.getElementById('drawNote'),
        swatches:   [...document.querySelectorAll('.draw-swatch')],
        sizes:      [...document.querySelectorAll('.draw-size')],
        eraser:     document.getElementById('drawEraser'),
        undo:       document.getElementById('drawUndo'),
        done:       document.getElementById('drawDone'),
        clear:      document.getElementById('drawClear')
    };
    el.tools = [...el.swatches, ...el.sizes, el.eraser];
    ctx       = el.canvas.getContext('2d');
    rootStyle = getComputedStyle(document.documentElement);
    color     = inkColor(1);

    el.canvas.addEventListener('pointerdown', e => {
        if (active || !isMyTurn() || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        el.canvas.setPointerCapture(e.pointerId);
        activeId = e.pointerId;
        active = {
            color,
            size:   BRUSH_SIZES[sizeIndex] * (erasing ? ERASER_SCALE : 1),
            eraser: erasing,
            points: [toPoint(e)]
        };
        setNote('');
        redraw();
    });

    el.canvas.addEventListener('pointermove', e => {
        if (!active || e.pointerId !== activeId) return;
        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        (events.length ? events : [e]).forEach(addPoint);
        redraw();
    });

    el.canvas.addEventListener('pointerup', e => {
        if (e.pointerId !== activeId) return;
        addPoint(e);
        finishStroke();
        redraw();
    });

    el.canvas.addEventListener('pointercancel', e => {
        if (e.pointerId !== activeId) return;
        finishStroke();
        redraw();
    });

    el.swatches.forEach(btn => {
        btn.addEventListener('click', () => {
            color   = inkColor(btn.dataset.ink);
            erasing = false;
            press(el.swatches, btn);
            el.eraser.setAttribute('aria-pressed', 'false');
        });
    });

    el.sizes.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeIndex = Number(btn.dataset.size);
            press(el.sizes, btn);
        });
    });

    el.eraser.addEventListener('click', () => {
        erasing = !erasing;
        el.eraser.setAttribute('aria-pressed', String(erasing));
        if (erasing) el.swatches.forEach(b => b.setAttribute('aria-pressed', 'false'));
        else press(el.swatches, el.swatches.find(b => inkColor(b.dataset.ink) === color));
    });

    el.undo.addEventListener('click', () => {
        pending.pop();
        redraw();
        updateUI();
    });

    el.done.addEventListener('click', submitTurn);
    el.clear.addEventListener('click', onClearClick);

    new ResizeObserver(resize).observe(el.stage);
    updateUI();
}
