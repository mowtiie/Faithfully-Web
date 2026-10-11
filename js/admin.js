import { db } from './firebase.js';
import { lockScroll, unlockScroll, trapFocus, escapeHtml, escapeAttr } from './ui.js';

let active = null;
let keysBound = false;

function bindKeys() {
    if (keysBound) return;
    keysBound = true;
    document.addEventListener('keydown', e => {
        if (!active) return;
        if (e.key === 'Escape') {
            e.stopPropagation();
            active.cancel();
            return;
        }
        trapFocus(active.el, e);
    });
}

function mount(html, labelId) {
    bindKeys();
    const el = document.createElement('div');
    el.className = 'dialog dialog-admin active';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', labelId);
    el.innerHTML = html;
    document.body.appendChild(el);
    lockScroll();
    return el;
}

function unmount(el, opener) {
    el.remove();
    unlockScroll();
    active = null;
    if (opener && document.contains(opener)) opener.focus();
}

function fieldHtml(field, i) {
    const id    = `editorField${i}`;
    const value = field.value == null ? '' : String(field.value);
    const req   = field.required ? ' required' : '';
    const hint  = field.placeholder ? ` placeholder="${escapeAttr(field.placeholder)}"` : '';

    let control;
    if (field.type === 'textarea') {
        control = `<textarea class="editor-input" id="${id}" name="${escapeAttr(field.name)}" rows="${field.rows || 5}"${req}${hint}>${escapeHtml(value)}</textarea>`;
    } else if (field.type === 'select') {
        const options = field.options.map(o =>
            `<option value="${escapeAttr(o.value)}"${o.value === value ? ' selected' : ''}>${escapeHtml(o.label)}</option>`
        ).join('');
        control = `<select class="editor-input" id="${id}" name="${escapeAttr(field.name)}"${req}>${options}</select>`;
    } else {
        control = `<input class="editor-input" id="${id}" name="${escapeAttr(field.name)}" type="${escapeAttr(field.type || 'text')}" value="${escapeAttr(value)}"${req}${hint}>`;
    }

    return `<div class="editor-field">
        <label class="editor-label" for="${id}">${escapeHtml(field.label)}</label>
        ${control}
    </div>`;
}

export function showDialog({ html, labelId, onCancel }) {
    const opener = document.activeElement;
    const el     = mount(html, labelId);
    const close  = () => unmount(el, opener);

    active = { el, cancel: () => (onCancel ? onCancel(close) : close()) };
    return { el, close };
}

export function openEditor({ title, fields, submitLabel = 'Save', onSubmit }) {
    const opener = document.activeElement;
    const el = mount(`
        <div class="dialog-backdrop"></div>
        <form class="dialog-card editor-card" novalidate>
            <h2 class="dialog-title" id="editorTitle">${escapeHtml(title)}</h2>
            ${fields.map(fieldHtml).join('')}
            <p class="editor-error" role="alert"></p>
            <div class="dialog-actions">
                <button type="button" class="dialog-btn dialog-btn-secondary" data-cancel>Cancel</button>
                <button type="submit" class="dialog-btn dialog-btn-primary">${escapeHtml(submitLabel)}</button>
            </div>
        </form>
    `, 'editorTitle');

    const form    = el.querySelector('form');
    const errorEl = el.querySelector('.editor-error');
    const buttons = el.querySelectorAll('.dialog-btn');
    const submitBtn = form.querySelector('[type="submit"]');
    const close   = () => unmount(el, opener);

    active = { el, cancel: close };
    el.querySelector('[data-cancel]').addEventListener('click', close);

    form.addEventListener('submit', async e => {
        e.preventDefault();
        errorEl.textContent = '';

        const values = {};
        for (const [key, raw] of new FormData(form)) values[key] = String(raw).trim();

        const missing = fields.find(f => f.required && !values[f.name]);
        if (missing) {
            errorEl.textContent = `${missing.label} is required.`;
            form.elements[missing.name].focus();
            return;
        }

        const label = submitBtn.textContent;
        submitBtn.textContent = 'Saving…';
        buttons.forEach(b => { b.disabled = true; });
        try {
            await onSubmit(values);
            close();
        } catch (err) {
            console.error(err);
            errorEl.textContent = err.userMessage || 'Could not save. Check your connection and try again.';
            submitBtn.textContent = label;
            buttons.forEach(b => { b.disabled = false; });
        }
    });

    setTimeout(() => {
        const first = form.querySelector('input, textarea, select');
        if (first) first.focus();
    }, 60);
}

export function confirmDialog({ title, text, confirmLabel = 'Delete', cancelLabel = 'Cancel', icon = '🗑️', danger = true }) {
    return new Promise(resolve => {
        const opener = document.activeElement;
        const el = mount(`
            <div class="dialog-backdrop"></div>
            <div class="dialog-card">
                <div class="dialog-icon" aria-hidden="true">${icon}</div>
                <h2 class="dialog-title" id="confirmTitle">${escapeHtml(title)}</h2>
                <p class="dialog-text">${escapeHtml(text)}</p>
                <div class="dialog-actions">
                    ${cancelLabel ? `<button type="button" class="dialog-btn dialog-btn-secondary" data-cancel>${escapeHtml(cancelLabel)}</button>` : ''}
                    <button type="button" class="dialog-btn ${danger ? 'dialog-btn-danger' : 'dialog-btn-primary'}" data-confirm>${escapeHtml(confirmLabel)}</button>
                </div>
            </div>
        `, 'confirmTitle');

        const done = value => {
            unmount(el, opener);
            resolve(value);
        };

        active = { el, cancel: () => done(false) };
        el.querySelector('[data-confirm]').addEventListener('click', () => done(true));
        const cancel = el.querySelector('[data-cancel]');
        if (cancel) cancel.addEventListener('click', () => done(false));
        el.querySelector('.dialog-backdrop').addEventListener('click', () => done(false));

        (cancel || el.querySelector('[data-confirm]')).focus();
    });
}

export function notice(title, text) {
    return confirmDialog({ title, text, confirmLabel: 'OK', cancelLabel: null, icon: '🌻', danger: false });
}

export function nextOrder(list) {
    return list.reduce((max, item) => Math.max(max, item.order ?? -1), -1) + 1;
}

export async function reorder(collection, list, from, to) {
    if (to < 0 || to >= list.length) return;

    const ref  = item => db.collection(collection).doc(item.id);
    const a    = list[from];
    const b    = list[to];

    if (Math.abs(from - to) === 1 && Number.isFinite(a.order) && Number.isFinite(b.order) && a.order !== b.order) {
        const batch = db.batch();
        batch.update(ref(a), { order: b.order });
        batch.update(ref(b), { order: a.order });
        await batch.commit();
        return;
    }

    const next = list.slice();
    next.splice(to, 0, next.splice(from, 1)[0]);

    const changes = [];
    next.forEach((item, order) => {
        if (item.order !== order) changes.push([item, order]);
    });

    for (let i = 0; i < changes.length; i += 400) {
        const batch = db.batch();
        changes.slice(i, i + 400).forEach(([item, order]) => batch.update(ref(item), { order }));
        await batch.commit();
    }
}

export async function attempt(action, what) {
    try {
        await action();
    } catch (err) {
        console.error(err);
        await notice('Something went wrong', `Could not ${what}. Check your connection and try again.`);
    }
}
