import { showDialog } from './admin.js';

const MAX_FILES = 20;

function sizeLabel(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function create(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
}

export function openPhotoDialog({ save }) {
    const items = [];
    let busy = false;

    const { el, close } = showDialog({
        labelId: 'photoDialogTitle',
        onCancel: () => { if (!busy) dismiss(); },
        html: `
            <div class="dialog-backdrop"></div>
            <div class="dialog-card editor-card photo-card">
                <h2 class="dialog-title" id="photoDialogTitle">Add photos</h2>
                <label class="photo-drop">
                    <input class="photo-input" type="file" accept="image/*" multiple>
                    <span class="photo-drop-icon" aria-hidden="true">📷</span>
                    <span class="photo-drop-text"><strong>Choose photos</strong> or drop them here</span>
                    <span class="photo-drop-hint">JPEG, PNG or WebP, up to ${MAX_FILES} at a time</span>
                </label>
                <ul class="photo-list"></ul>
                <div class="photo-progress" hidden><span></span></div>
                <p class="photo-summary" aria-live="polite"></p>
                <p class="editor-error" role="alert"></p>
                <div class="dialog-actions">
                    <button type="button" class="dialog-btn dialog-btn-secondary" data-cancel>Cancel</button>
                    <button type="button" class="dialog-btn dialog-btn-primary" data-add disabled>Add photos</button>
                </div>
            </div>
        `
    });

    const card      = el.querySelector('.photo-card');
    const drop      = el.querySelector('.photo-drop');
    const input     = el.querySelector('.photo-input');
    const list      = el.querySelector('.photo-list');
    const progress  = el.querySelector('.photo-progress');
    const bar       = progress.firstElementChild;
    const summary   = el.querySelector('.photo-summary');
    const errorEl   = el.querySelector('.editor-error');
    const cancelBtn = el.querySelector('[data-cancel]');
    const addBtn    = el.querySelector('[data-add]');

    function dismiss() {
        items.forEach(item => URL.revokeObjectURL(item.url));
        close();
    }

    function setState(item, state, message = '') {
        item.state = state;
        item.row.dataset.state = state;
        item.status.textContent = message;
    }

    function refresh() {
        const waiting = items.filter(i => i.state === 'pending').length;
        const failed  = items.filter(i => i.state === 'error').length;
        const done    = items.filter(i => i.state === 'done').length;
        const todo    = waiting + failed;

        drop.classList.toggle('is-disabled', busy);
        input.disabled = busy;
        cancelBtn.disabled = busy;
        cancelBtn.textContent = done > 0 && !busy ? 'Close' : 'Cancel';
        items.forEach(i => {
            i.caption.disabled = busy || i.state === 'done';
            i.remove.disabled  = busy;
        });

        addBtn.disabled = busy || todo === 0;
        if (busy)              addBtn.textContent = 'Adding…';
        else if (todo === 0)   addBtn.textContent = 'Add photos';
        else if (waiting === 0) addBtn.textContent = failed === 1 ? 'Retry' : `Retry ${failed}`;
        else                   addBtn.textContent = todo === 1 ? 'Add photo' : `Add ${todo} photos`;

        progress.hidden = !(busy || done > 0 || failed > 0);
        bar.style.width = items.length ? Math.round(((done + failed) / items.length) * 100) + '%' : '0%';

        if (busy) summary.textContent = `Adding ${done + failed + 1} of ${items.length}…`;
        else if (done > 0 && failed > 0) summary.textContent = `${done} added, ${failed} could not be added.`;
        else if (done > 0 && todo === 0) summary.textContent = 'All added ✓';
        else summary.textContent = '';
    }

    function createItem(file) {
        const url = URL.createObjectURL(file);

        const row    = create('li', 'photo-item');
        const thumb  = create('img', 'photo-thumb');
        thumb.src = url;
        thumb.alt = '';
        thumb.decoding = 'async';
        thumb.addEventListener('error', () => thumb.classList.add('is-broken'), { once: true });

        const meta    = create('div', 'photo-meta');
        const name    = create('span', 'photo-name', `${file.name} · ${sizeLabel(file.size)}`);
        const caption = create('input', 'editor-input photo-caption');
        caption.type = 'text';
        caption.maxLength = 300;
        caption.placeholder = 'Caption (optional)';
        caption.setAttribute('aria-label', `Caption for ${file.name}`);
        const status  = create('span', 'photo-status');
        status.setAttribute('aria-live', 'polite');
        meta.append(name, caption, status);

        const remove = create('button', 'photo-remove', '✕');
        remove.type = 'button';
        remove.setAttribute('aria-label', `Remove ${file.name}`);

        row.append(thumb, meta, remove);
        row.dataset.state = 'pending';

        const item = { file, url, row, caption, status, remove, state: 'pending' };
        remove.addEventListener('click', () => {
            URL.revokeObjectURL(url);
            items.splice(items.indexOf(item), 1);
            row.remove();
            errorEl.textContent = '';
            refresh();
        });
        return item;
    }

    function addFiles(fileList) {
        if (busy) return;

        let skipped = false;
        let full    = false;
        for (const file of fileList) {
            if (!file.type.startsWith('image/')) {
                skipped = true;
                continue;
            }
            if (items.some(i => i.file.name === file.name && i.file.size === file.size && i.file.lastModified === file.lastModified)) continue;
            if (items.length >= MAX_FILES) {
                full = true;
                break;
            }
            const item = createItem(file);
            items.push(item);
            list.append(item.row);
        }

        errorEl.textContent = full ? `Only ${MAX_FILES} photos at a time.` : skipped ? 'Some files were not images and were skipped.' : '';
        refresh();
    }

    async function run() {
        busy = true;
        errorEl.textContent = '';
        refresh();

        for (const item of items.filter(i => i.state === 'pending' || i.state === 'error')) {
            setState(item, 'working', 'Starting…');
            item.row.scrollIntoView({ block: 'nearest' });
            try {
                await save(item.file, item.caption.value.trim(), message => setState(item, 'working', message));
                setState(item, 'done', 'Added ✓');
            } catch (err) {
                console.error(err);
                setState(item, 'error', err.userMessage || 'Could not add this photo.');
            }
            refresh();
        }

        busy = false;
        refresh();

        if (items.length && items.every(i => i.state === 'done')) {
            setTimeout(() => { if (el.isConnected) dismiss(); }, 800);
        }
    }

    input.addEventListener('change', () => {
        addFiles(input.files);
        input.value = '';
    });

    ['dragenter', 'dragover'].forEach(type => card.addEventListener(type, e => {
        e.preventDefault();
        if (!busy) drop.classList.add('is-over');
    }));
    ['dragleave', 'drop'].forEach(type => card.addEventListener(type, e => {
        e.preventDefault();
        if (type === 'drop' || !card.contains(e.relatedTarget)) drop.classList.remove('is-over');
    }));
    card.addEventListener('drop', e => addFiles(e.dataTransfer.files));

    cancelBtn.addEventListener('click', () => { if (!busy) dismiss(); });
    addBtn.addEventListener('click', run);

    setTimeout(() => input.focus(), 60);
}
