import { showDialog } from './admin.js';
import { formatClock } from './ui.js';

const MAX_SECONDS = 90;
const MAX_BYTES   = 2 * 1024 * 1024;
const TYPES       = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
const EXTENSIONS  = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg' };

function micError(err) {
    if (err && err.name === 'NotAllowedError') return 'Microphone access was blocked. Allow it in your browser settings and try again.';
    if (err && err.name === 'NotFoundError')   return 'No microphone was found on this device.';
    return 'Could not start the microphone.';
}

export function openRecorder({ save }) {
    let phase     = 'idle';
    let stream    = null;
    let recorder  = null;
    let chunks    = [];
    let mime      = '';
    let startedAt = 0;
    let duration  = 0;
    let timer     = null;
    let blob      = null;
    let previewUrl = null;
    let discarded = false;
    let busy      = false;

    const { el, close } = showDialog({
        labelId: 'voiceDialogTitle',
        onCancel: () => { if (!busy) dismiss(); },
        html: `
            <div class="dialog-backdrop"></div>
            <div class="dialog-card editor-card voice-card" data-phase="idle">
                <h2 class="dialog-title" id="voiceDialogTitle">New voice message</h2>
                <div class="voice-stage">
                    <button type="button" class="voice-rec" aria-label="Start recording"><span aria-hidden="true"></span></button>
                    <p class="voice-clock">0:00</p>
                    <p class="voice-hint" aria-live="polite">Tap to record, up to ${formatClock(MAX_SECONDS)}</p>
                    <audio class="voice-preview" controls hidden></audio>
                    <button type="button" class="admin-btn voice-again" hidden>Record again</button>
                </div>
                <div class="editor-field" data-caption hidden>
                    <label class="editor-label" for="voiceCaption">Caption (optional)</label>
                    <input class="editor-input" id="voiceCaption" type="text" maxlength="200" placeholder="What is this about?">
                </div>
                <p class="editor-error" role="alert"></p>
                <div class="dialog-actions">
                    <button type="button" class="dialog-btn dialog-btn-secondary" data-cancel>Cancel</button>
                    <button type="button" class="dialog-btn dialog-btn-primary" data-save disabled>Save</button>
                </div>
            </div>
        `
    });

    const card      = el.querySelector('.voice-card');
    const recBtn    = el.querySelector('.voice-rec');
    const clock     = el.querySelector('.voice-clock');
    const hint      = el.querySelector('.voice-hint');
    const preview   = el.querySelector('.voice-preview');
    const againBtn  = el.querySelector('.voice-again');
    const captionField = el.querySelector('[data-caption]');
    const captionInput = el.querySelector('#voiceCaption');
    const errorEl   = el.querySelector('.editor-error');
    const cancelBtn = el.querySelector('[data-cancel]');
    const saveBtn   = el.querySelector('[data-save]');

    function releaseStream() {
        if (stream) stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    function releasePreview() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
        preview.removeAttribute('src');
    }

    function setPhase(next) {
        phase = next;
        card.dataset.phase = next;

        recBtn.hidden       = next === 'review';
        preview.hidden      = next !== 'review';
        againBtn.hidden     = next !== 'review';
        captionField.hidden = next !== 'review';
        clock.hidden        = next === 'review';
        saveBtn.disabled    = next !== 'review' || busy;

        if (next === 'idle') {
            recBtn.setAttribute('aria-label', 'Start recording');
            hint.textContent = `Tap to record, up to ${formatClock(MAX_SECONDS)}`;
            clock.textContent = '0:00';
        } else if (next === 'recording') {
            recBtn.setAttribute('aria-label', 'Stop recording');
            hint.textContent = 'Recording… tap to stop';
        } else {
            hint.textContent = '';
        }
    }

    function dismiss() {
        discarded = true;
        clearInterval(timer);
        if (recorder && recorder.state === 'recording') recorder.stop();
        releaseStream();
        releasePreview();
        close();
    }

    function tick() {
        const elapsed = (performance.now() - startedAt) / 1000;
        clock.textContent = formatClock(elapsed);
        if (elapsed >= MAX_SECONDS) stop();
    }

    function stop() {
        if (!recorder || recorder.state !== 'recording') return;
        clearInterval(timer);
        duration = Math.min(MAX_SECONDS, (performance.now() - startedAt) / 1000);
        recorder.stop();
    }

    function finish() {
        releaseStream();
        if (discarded) return;

        blob = new Blob(chunks, { type: mime });
        chunks = [];

        if (duration < 0.5) {
            errorEl.textContent = 'That was too short. Try again.';
            setPhase('idle');
            return;
        }
        if (blob.size > MAX_BYTES) {
            errorEl.textContent = 'That recording is too large. Try a shorter one.';
            setPhase('idle');
            return;
        }

        releasePreview();
        previewUrl = URL.createObjectURL(blob);
        preview.src = previewUrl;
        setPhase('review');
        captionInput.focus();
    }

    async function start() {
        errorEl.textContent = '';

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
            errorEl.textContent = 'Recording is not supported in this browser.';
            return;
        }

        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            errorEl.textContent = micError(err);
            return;
        }

        if (discarded) {
            releaseStream();
            return;
        }

        const type = TYPES.find(t => MediaRecorder.isTypeSupported(t)) || '';
        try {
            recorder = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });
        } catch (err) {
            console.error(err);
            releaseStream();
            errorEl.textContent = 'This browser cannot record audio.';
            return;
        }

        mime = (recorder.mimeType || type).split(';')[0];
        if (!EXTENSIONS[mime]) {
            releaseStream();
            errorEl.textContent = 'This browser records in a format that is not supported.';
            return;
        }

        chunks = [];
        recorder.addEventListener('dataavailable', e => { if (e.data && e.data.size) chunks.push(e.data); });
        recorder.addEventListener('stop', finish);
        recorder.start();

        startedAt = performance.now();
        clock.textContent = '0:00';
        setPhase('recording');
        timer = setInterval(tick, 200);
    }

    async function submit() {
        busy = true;
        errorEl.textContent = '';
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        cancelBtn.disabled = true;
        againBtn.disabled = true;
        captionInput.disabled = true;

        try {
            await save(blob, {
                caption: captionInput.value.trim(),
                duration: Math.round(duration * 10) / 10,
                mimeType: mime,
                ext: EXTENSIONS[mime]
            });
            dismiss();
        } catch (err) {
            console.error(err);
            errorEl.textContent = err.userMessage || 'Could not save the recording. Check your connection and try again.';
            busy = false;
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
            cancelBtn.disabled = false;
            againBtn.disabled = false;
            captionInput.disabled = false;
        }
    }

    recBtn.addEventListener('click', () => {
        if (phase === 'idle') start();
        else if (phase === 'recording') stop();
    });

    againBtn.addEventListener('click', () => {
        if (busy) return;
        releasePreview();
        blob = null;
        errorEl.textContent = '';
        setPhase('idle');
        recBtn.focus();
    });

    cancelBtn.addEventListener('click', () => { if (!busy) dismiss(); });
    saveBtn.addEventListener('click', submit);

    setPhase('idle');
    setTimeout(() => recBtn.focus(), 60);
}
