import { isAdmin, onAuthChange } from './auth.js';
import { db } from './firebase.js';
import { letterStore, chapterList } from './letter-store.js';
import { openEditor, confirmDialog, notice, nextOrder, reorder, attempt } from './admin.js';
import { toDateInput, parseDateInput } from './date-fields.js';
import { escapeAttr } from './ui.js';

function dateLabel(date) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function barButton(admin, label, attrs = '', extra = '') {
    return `<button type="button" class="admin-btn${extra}" data-admin="${admin}" ${attrs}>${label}</button>`;
}

export function chapterBarHtml(chapterId, index, count) {
    const id = `data-chapter="${escapeAttr(chapterId)}"`;
    return `<div class="admin-bar" role="group" aria-label="Chapter tools">
        ${barButton('add-card', '＋ Add letter', id)}
        ${barButton('edit-chapter', 'Edit', id)}
        ${barButton('chapter-earlier', '↑', `${id} aria-label="Move chapter up"${index === 0 ? ' disabled' : ''}`)}
        ${barButton('chapter-later', '↓', `${id} aria-label="Move chapter down"${index === count - 1 ? ' disabled' : ''}`)}
        ${barButton('delete-chapter', 'Delete', id, ' admin-btn-danger')}
    </div>`;
}

export function itemBarHtml(chapterId, index, count) {
    const ids = `data-chapter="${escapeAttr(chapterId)}" data-index="${index}"`;
    return `<div class="admin-bar admin-bar-card" role="group" aria-label="Letter tools">
        ${barButton('edit-card', 'Edit', ids)}
        ${barButton('card-earlier', '‹', `${ids} aria-label="Move letter earlier"${index === 0 ? ' disabled' : ''}`)}
        ${barButton('card-later', '›', `${ids} aria-label="Move letter later"${index === count - 1 ? ' disabled' : ''}`)}
        ${barButton('delete-card', 'Delete', ids, ' admin-btn-danger')}
    </div>`;
}

function addChapter() {
    openEditor({
        title: 'New chapter',
        submitLabel: 'Add chapter',
        fields: [
            { name: 'title', label: 'Title', required: true },
            { name: 'description', label: 'Description', type: 'textarea', rows: 3 }
        ],
        onSubmit: values => db.collection('chapters').add({
            title: values.title,
            description: values.description,
            order: nextOrder(chapterList)
        })
    });
}

function editChapter(chapterId) {
    const chapter = chapterList.find(c => c.id === chapterId);
    if (!chapter) return;

    openEditor({
        title: 'Edit chapter',
        fields: [
            { name: 'title', label: 'Title', required: true, value: chapter.title },
            { name: 'description', label: 'Description', type: 'textarea', rows: 3, value: chapter.description }
        ],
        onSubmit: values => db.collection('chapters').doc(chapterId).update({
            title: values.title,
            description: values.description
        })
    });
}

async function deleteChapter(chapterId) {
    const chapter = chapterList.find(c => c.id === chapterId);
    if (!chapter) return;

    const letters = (letterStore[chapterId] || []).length;
    if (letters > 0) {
        await notice('Chapter isn\'t empty', `"${chapter.title}" still has ${letters === 1 ? '1 letter' : letters + ' letters'}. Move or delete them first.`);
        return;
    }

    const ok = await confirmDialog({
        title: 'Delete this chapter?',
        text: `"${chapter.title}" will be removed for good.`
    });
    if (ok) await attempt(() => db.collection('chapters').doc(chapterId).delete(), 'delete the chapter');
}

function cardFields(card, chapterId) {
    return [
        { name: 'title', label: 'Title', required: true, value: card.title },
        {
            name: 'chapterId', label: 'Chapter', type: 'select', required: true, value: chapterId,
            options: chapterList.map(c => ({ value: c.id, label: c.title }))
        },
        { name: 'date', label: 'Date', type: 'date', value: toDateInput(card.date) },
        { name: 'dateLabel', label: 'Date label', placeholder: 'Shown on the card. Leave blank to use the date.', value: card.dateLabel },
        { name: 'message', label: 'Letter', type: 'textarea', rows: 10, required: true, value: card.message }
    ];
}

function cardData(values) {
    const date = values.date ? parseDateInput(values.date) : null;
    return {
        title: values.title,
        message: values.message,
        chapterId: values.chapterId,
        dateLabel: values.dateLabel || (date ? dateLabel(date) : ''),
        date: date ? firebase.firestore.Timestamp.fromDate(date) : firebase.firestore.FieldValue.delete()
    };
}

function addCard(chapterId) {
    openEditor({
        title: 'New letter',
        submitLabel: 'Add letter',
        fields: cardFields({}, chapterId),
        onSubmit: values => {
            const data = cardData(values);
            if (!values.date) delete data.date;
            data.order = nextOrder(letterStore[values.chapterId] || []);
            return db.collection('cards').add(data);
        }
    });
}

function editCard(chapterId, index) {
    const card = (letterStore[chapterId] || [])[index];
    if (!card) return;

    openEditor({
        title: 'Edit letter',
        fields: cardFields(card, chapterId),
        onSubmit: values => {
            const data = cardData(values);
            if (values.chapterId !== chapterId) data.order = nextOrder(letterStore[values.chapterId] || []);
            return db.collection('cards').doc(card.id).update(data);
        }
    });
}

async function deleteCard(chapterId, index) {
    const card = (letterStore[chapterId] || [])[index];
    if (!card) return;

    const ok = await confirmDialog({
        title: 'Delete this letter?',
        text: `"${card.title}" will be removed for good.`
    });
    if (ok) await attempt(() => db.collection('cards').doc(card.id).delete(), 'delete the letter');
}

function onAdminClick(e) {
    const btn = e.target.closest('[data-admin]');
    if (!btn || btn.disabled || !isAdmin) return;

    const { admin, chapter } = btn.dataset;
    const index = Number(btn.dataset.index);
    const chapterIndex = chapterList.findIndex(c => c.id === chapter);

    switch (admin) {
        case 'add-card':        return addCard(chapter);
        case 'edit-chapter':    return editChapter(chapter);
        case 'delete-chapter':  return deleteChapter(chapter);
        case 'chapter-earlier': return attempt(() => reorder('chapters', chapterList, chapterIndex, chapterIndex - 1), 'move the chapter');
        case 'chapter-later':   return attempt(() => reorder('chapters', chapterList, chapterIndex, chapterIndex + 1), 'move the chapter');
        case 'edit-card':       return editCard(chapter, index);
        case 'delete-card':     return deleteCard(chapter, index);
        case 'card-earlier':    return attempt(() => reorder('cards', letterStore[chapter], index, index - 1), 'move the letter');
        case 'card-later':      return attempt(() => reorder('cards', letterStore[chapter], index, index + 1), 'move the letter');
    }
}

export function initLettersAdmin() {
    const addBtn = document.getElementById('addChapterBtn');
    addBtn.addEventListener('click', addChapter);
    document.getElementById('chaptersContainer').addEventListener('click', onAdminClick);
    onAuthChange(() => { addBtn.hidden = !isAdmin; });
}
