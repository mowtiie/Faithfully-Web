import { APPS } from './data/apps.js';
import { escapeHtml, escapeAttr } from './ui.js';

export function renderApps() {
    const grid = document.getElementById('appsGrid');
    if (!grid) return;

    if (APPS.length === 0) {
        grid.innerHTML = '<div class="empty-state small">No apps yet.</div>';
        return;
    }

    grid.innerHTML = APPS.map((app, i) => {
        const fallback = app.icon || '📱';
        const iconHtml = app.iconImage
            ? `<img class="app-icon-img" src="${escapeAttr(app.iconImage)}" alt=""
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
                    <a href="${escapeAttr(app.downloadUrl)}" class="app-btn app-btn-primary" download>
                        <span class="app-btn-icon" aria-hidden="true">⬇️</span>
                        <span>Download</span>
                    </a>
                    <a href="${escapeAttr(app.sourceUrl)}" class="app-btn app-btn-secondary" target="_blank" rel="noopener">
                        <span class="app-btn-icon" aria-hidden="true">🔗</span>
                        <span>Source</span>
                    </a>
                </div>
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
