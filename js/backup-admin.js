import { isAdmin, onAuthChange } from './auth.js';
import { showDialog } from './admin.js';
import { exportBackup, readBackup, restoreBackup } from './backup.js';

const LABELS = { chapters: 'chapters', cards: 'letters', gallery: 'photos', apps: 'apps', settings: 'home settings' };

function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function describeCounts(counts) {
    return Object.entries(counts)
        .filter(([, n]) => n > 0)
        .map(([name, n]) => `${n} ${LABELS[name]}`)
        .join(', ') || 'nothing';
}

function openBackupDialog() {
    let busy = false;
    let backup = null;

    const { el, close } = showDialog({
        labelId: 'backupTitle',
        onCancel: () => { if (!busy) close(); },
        html: `
            <div class="dialog-backdrop"></div>
            <div class="dialog-card editor-card backup-card">
                <h2 class="dialog-title" id="backupTitle">Backup &amp; restore</h2>

                <section class="backup-section">
                    <h3 class="backup-heading">Back up</h3>
                    <p class="backup-text">Saves chapters, letters, photo entries, apps and the home settings to a zip file.</p>
                    <label class="backup-check"><input type="checkbox" data-photos> Include the photo files (slower, larger file)</label>
                    <button type="button" class="admin-btn admin-btn-primary" data-export>Download backup</button>
                </section>

                <section class="backup-section">
                    <h3 class="backup-heading">Restore</h3>
                    <label class="photo-drop backup-drop">
                        <input class="photo-input" type="file" accept=".zip,application/zip" data-file>
                        <span class="photo-drop-text"><strong>Choose a backup zip</strong></span>
                        <span class="photo-drop-hint" data-file-name>No file chosen</span>
                    </label>
                    <div class="backup-restore" hidden>
                        <p class="backup-text" data-contents></p>
                        <label class="backup-check"><input type="radio" name="backupMode" value="merge" checked> Merge: add and overwrite entries from the backup, keep everything else</label>
                        <label class="backup-check"><input type="radio" name="backupMode" value="replace"> Replace: make the site match the backup exactly (a data-only backup of the current site downloads first)</label>
                        <label class="backup-check backup-confirm" hidden><input type="checkbox" data-confirm> I understand entries not in the backup will be deleted</label>
                        <button type="button" class="admin-btn admin-btn-primary" data-restore>Restore</button>
                    </div>
                </section>

                <div class="photo-progress" hidden><span></span></div>
                <p class="photo-summary" aria-live="polite"></p>
                <p class="editor-error" role="alert"></p>
                <div class="dialog-actions">
                    <button type="button" class="dialog-btn dialog-btn-secondary" data-close>Close</button>
                </div>
            </div>
        `
    });

    const $ = selector => el.querySelector(selector);
    const photosBox    = $('[data-photos]');
    const exportBtn    = $('[data-export]');
    const fileInput    = $('[data-file]');
    const fileName     = $('[data-file-name]');
    const restorePanel = $('.backup-restore');
    const contents     = $('[data-contents]');
    const confirmRow   = $('.backup-confirm');
    const confirmBox   = $('[data-confirm]');
    const restoreBtn   = $('[data-restore]');
    const closeBtn     = $('[data-close]');
    const progress     = $('.photo-progress');
    const bar          = progress.firstElementChild;
    const summary      = $('.photo-summary');
    const errorEl      = $('.editor-error');

    const mode = () => el.querySelector('[name="backupMode"]:checked').value;

    function refresh() {
        const replace = mode() === 'replace';
        confirmRow.hidden = !replace;
        restoreBtn.textContent = replace ? 'Replace everything' : 'Merge backup';
        restoreBtn.disabled = busy || (replace && !confirmBox.checked);
        exportBtn.disabled = busy;
        fileInput.disabled = busy;
        closeBtn.disabled = busy;
    }

    function report(text, fraction) {
        summary.textContent = text;
        progress.hidden = fraction == null;
        if (fraction != null) bar.style.width = `${Math.round(Math.min(1, fraction) * 100)}%`;
    }

    async function run(task) {
        busy = true;
        errorEl.textContent = '';
        refresh();
        try {
            await task();
        } catch (err) {
            console.error(err);
            errorEl.textContent = err.userMessage || 'Something went wrong. Check your connection and try again.';
            report('');
        } finally {
            busy = false;
            refresh();
        }
    }

    exportBtn.addEventListener('click', () => run(async () => {
        const { blob, filename, counts, skipped } = await exportBackup({ photos: photosBox.checked, onProgress: report });
        download(blob, filename);
        const note = skipped ? ` ${skipped} photo file${skipped > 1 ? 's' : ''} could not be downloaded and ${skipped > 1 ? 'are' : 'is'} not included.` : '';
        report(`Saved ${describeCounts(counts)}.${note}`);
    }));

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        backup = null;
        restorePanel.hidden = true;
        summary.textContent = '';
        if (!file) { fileName.textContent = 'No file chosen'; return; }
        fileName.textContent = file.name;

        run(async () => {
            backup = await readBackup(file);
            const photos = backup.photoCount ? ` Includes ${backup.photoCount} photo file${backup.photoCount > 1 ? 's' : ''}.` : '';
            contents.textContent = `This backup holds ${describeCounts(backup.counts)}.${photos}`;
            restorePanel.hidden = false;
        });
    });

    el.querySelectorAll('[name="backupMode"], [data-confirm]').forEach(input => input.addEventListener('change', refresh));

    restoreBtn.addEventListener('click', () => run(async () => {
        const replace = mode() === 'replace';
        if (replace) {
            const safety = await exportBackup({ photos: false, onProgress: report });
            download(safety.blob, safety.filename.replace('backup', 'before-restore'));
        }
        const { failedPhotos, leftover } = await restoreBackup(backup, { mode: mode(), onProgress: report });

        const notes = [];
        if (failedPhotos) notes.push(`${failedPhotos} photo${failedPhotos > 1 ? 's' : ''} could not be uploaded.`);
        if (leftover) notes.push(`${leftover} old photo file${leftover > 1 ? 's' : ''} could not be removed.`);
        report(`Restore complete 🌻 ${notes.join(' ')}`.trim());

        backup = null;
        fileInput.value = '';
        fileName.textContent = 'No file chosen';
        restorePanel.hidden = true;
        confirmBox.checked = false;
    }));

    closeBtn.addEventListener('click', close);
    el.querySelector('.dialog-backdrop').addEventListener('click', () => { if (!busy) close(); });
    refresh();
}

export function initBackupAdmin() {
    const btn = document.getElementById('backupBtn');
    btn.addEventListener('click', openBackupDialog);
    onAuthChange(() => { btn.hidden = !isAdmin; });
}
