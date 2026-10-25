import { isAdmin, authMode } from './auth.js';
import { db } from './firebase.js';
import { openEditor, confirmDialog, attempt } from './admin.js';
import { callWorker } from './worker-client.js';
import { getClips } from './voice.js';

function findClip(btn) {
    const row = btn.closest('.voice-clip');
    return row && getClips().find(c => c.id === row.dataset.id);
}

function editCaption(clip) {
    openEditor({
        title: 'Edit caption',
        fields: [
            { name: 'caption', label: 'Caption', type: 'textarea', rows: 3, value: clip.caption }
        ],
        onSubmit: values => db.collection('voice').doc(clip.id).update({ caption: values.caption })
    });
}

async function deleteClip(clip) {
    const ok = await confirmDialog({
        title: 'Delete this recording?',
        text: 'The recording will be removed for good.'
    });
    if (!ok) return;

    await attempt(async () => {
        if (clip.audioPath) await callWorker('DELETE', clip.audioPath);
        await db.collection('voice').doc(clip.id).delete();
    }, 'delete the recording');
}

export function initVoiceAdmin() {
    document.getElementById('voiceList').addEventListener('click', e => {
        const btn = e.target.closest('[data-admin]');
        if (!btn || !isAdmin || authMode !== 'authed') return;

        const clip = findClip(btn);
        if (!clip) return;

        if (btn.dataset.admin === 'edit-voice') editCaption(clip);
        else if (btn.dataset.admin === 'delete-voice') deleteClip(clip);
    });
}
