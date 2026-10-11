import { isAdmin, authMode } from './auth.js';
import { db } from './firebase.js';
import { APPS } from './data/apps.js';
import { openEditor, confirmDialog, nextOrder, reorder, attempt } from './admin.js';

let appList = [];

export function setAppList(list) {
    appList = list;
}

export function syncAppsAdmin(builtIn) {
    const canEdit = isAdmin && authMode === 'authed';
    document.getElementById('addAppBtn').hidden      = !canEdit || builtIn;
    document.getElementById('importAppsRow').hidden  = !canEdit || !builtIn;
}

function barButton(admin, label, attrs = '', extra = '') {
    return `<button type="button" class="admin-btn${extra}" data-admin="${admin}" ${attrs}>${label}</button>`;
}

export function appBarHtml(index, count) {
    const at = `data-index="${index}"`;
    return `<div class="admin-bar admin-bar-card" role="group" aria-label="App tools">
        ${barButton('edit-app', 'Edit', at)}
        ${barButton('app-earlier', '‹', `${at} aria-label="Move app earlier"${index === 0 ? ' disabled' : ''}`)}
        ${barButton('app-later', '›', `${at} aria-label="Move app later"${index === count - 1 ? ' disabled' : ''}`)}
        ${barButton('delete-app', 'Delete', at, ' admin-btn-danger')}
    </div>`;
}

function appFields(app) {
    return [
        { name: 'name', label: 'Name', required: true, value: app.name },
        { name: 'version', label: 'Version', placeholder: 'v1.0', value: app.version },
        { name: 'tagline', label: 'Tagline', value: app.tagline },
        { name: 'description', label: 'Description', type: 'textarea', rows: 6, value: app.description },
        { name: 'icon', label: 'Icon emoji', placeholder: '📱', value: app.icon },
        { name: 'iconImage', label: 'Icon image link', placeholder: './icons/app.png or https://…', value: app.iconImage },
        { name: 'downloadUrl', label: 'Download link', placeholder: 'https://… (the APK)', value: app.downloadUrl },
        { name: 'sourceUrl', label: 'Source link', placeholder: 'https://github.com/…', value: app.sourceUrl }
    ];
}

function addApp() {
    openEditor({
        title: 'New app',
        submitLabel: 'Add app',
        fields: appFields({}),
        onSubmit: values => db.collection('apps').add({ ...values, order: nextOrder(appList) })
    });
}

function editApp(index) {
    const app = appList[index];
    if (!app) return;

    openEditor({
        title: 'Edit app',
        fields: appFields(app),
        onSubmit: values => db.collection('apps').doc(app.id).update(values)
    });
}

async function deleteApp(index) {
    const app = appList[index];
    if (!app) return;

    const ok = await confirmDialog({
        title: 'Delete this app?',
        text: `"${app.name}" will be removed from the site. The APK file itself is not touched.`
    });
    if (ok) await attempt(() => db.collection('apps').doc(app.id).delete(), 'delete the app');
}

async function importBuiltIn() {
    const batch = db.batch();
    APPS.forEach((app, order) => batch.set(db.collection('apps').doc(), { ...app, order }));
    await batch.commit();
}

function onAdminClick(e) {
    const btn = e.target.closest('[data-admin]');
    if (!btn || btn.disabled || !isAdmin) return;

    const index = Number(btn.dataset.index);
    switch (btn.dataset.admin) {
        case 'edit-app':    return editApp(index);
        case 'delete-app':  return deleteApp(index);
        case 'app-earlier': return attempt(() => reorder('apps', appList, index, index - 1), 'move the app');
        case 'app-later':   return attempt(() => reorder('apps', appList, index, index + 1), 'move the app');
    }
}

export function initAppsAdmin() {
    document.getElementById('addAppBtn').addEventListener('click', addApp);
    document.getElementById('importAppsBtn').addEventListener('click', () => {
        attempt(importBuiltIn, 'save the built-in apps');
    });
    document.getElementById('appsGrid').addEventListener('click', onAdminClick);
}
