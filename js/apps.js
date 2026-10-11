import { authMode, isAdmin } from './auth.js';
import { db } from './firebase.js';
import { APPS } from './data/apps.js';
import { appBarHtml, setAppList, syncAppsAdmin } from './apps-admin.js';
import { escapeHtml, escapeAttr } from './ui.js';

let appsUnsub = null;

function safeUrl(url) {
    if (!url) return '';
    return /^[a-z][a-z0-9+.-]*:/i.test(url) && !/^https?:/i.test(url) ? '' : url;
}

export function loadApps() {
    if (appsUnsub) {
        appsUnsub();
        appsUnsub = null;
    }

    if (authMode !== 'authed') {
        renderApps(APPS, true);
        return;
    }

    appsUnsub = db.collection('apps')
        .orderBy('order', 'asc')
        .onSnapshot(snapshot => {
            const apps = [];
            snapshot.forEach(doc => apps.push({ id: doc.id, ...doc.data() }));
            if (apps.length === 0) renderApps(APPS, true);
            else renderApps(apps, false);
        }, err => {
            console.error(err);
            renderApps(APPS, true);
        });
}

function renderApps(apps, builtIn) {
    const grid = document.getElementById('appsGrid');
    if (!grid) return;

    setAppList(builtIn ? [] : apps);
    syncAppsAdmin(builtIn);

    if (apps.length === 0) {
        grid.innerHTML = '<div class="empty-state small">No apps yet.</div>';
        return;
    }

    const editable = isAdmin && !builtIn;

    grid.innerHTML = apps.map((app, i) => {
        const fallback = app.icon || '📱';
        const iconUrl  = safeUrl(app.iconImage);
        const download = safeUrl(app.downloadUrl);
        const source   = safeUrl(app.sourceUrl);

        const iconHtml = iconUrl
            ? `<img class="app-icon-img" src="${escapeAttr(iconUrl)}" alt=""
                    data-fallback="${escapeAttr(fallback)}">`
            : `<span class="app-icon-emoji">${escapeHtml(fallback)}</span>`;

        return `
            <article class="app-card" style="animation-delay:${i * 0.08}s">
                <div class="app-card-top">
                    <div class="app-icon">${iconHtml}</div>
                    <div class="app-info">
                        <div class="app-name-row">
                            <h3 class="app-name">${escapeHtml(app.name)}</h3>
                            ${app.version ? `<span class="app-version">${escapeHtml(app.version)}</span>` : ''}
                        </div>
                        <p class="app-tagline">${escapeHtml(app.tagline)}</p>
                    </div>
                </div>
                <p class="app-description">${escapeHtml(app.description)}</p>
                <div class="app-actions">
                    ${download ? `
                    <a href="${escapeAttr(download)}" class="app-btn app-btn-primary" download>
                        <span class="app-btn-icon" aria-hidden="true">⬇️</span>
                        <span>Download</span>
                    </a>` : ''}
                    ${source ? `
                    <a href="${escapeAttr(source)}" class="app-btn app-btn-secondary" target="_blank" rel="noopener">
                        <span class="app-btn-icon" aria-hidden="true">🔗</span>
                        <span>Source</span>
                    </a>` : ''}
                </div>
                ${editable ? appBarHtml(i, apps.length) : ''}
            </article>
        `;
    }).join('');

    grid.querySelectorAll('img.app-icon-img').forEach(img => {
        img.addEventListener('error', () => {
            const emoji = document.createElement('span');
            emoji.className   = 'app-icon-emoji';
            emoji.textContent = img.dataset.fallback;
            img.replaceWith(emoji);
        }, { once: true });
    });
}
