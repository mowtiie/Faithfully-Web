import { isAdmin, authMode } from './auth.js';
import { db } from './firebase.js';
import { getLightboxState, onLightboxRender } from './lightbox.js';
import { openEditor, reorder, attempt } from './admin.js';

function editCaption() {
    const { photos, index } = getLightboxState();
    const photo = photos[index];
    if (!photo) return;

    openEditor({
        title: 'Edit caption',
        fields: [
            { name: 'caption', label: 'Caption', type: 'textarea', rows: 3, value: photo.caption }
        ],
        onSubmit: values => db.collection('gallery').doc(photo.id).update({ caption: values.caption })
    });
}

function movePhoto(step) {
    const { photos, index } = getLightboxState();
    return attempt(() => reorder('gallery', photos, index, index + step), 'move the photo');
}

export function initGalleryAdmin() {
    const lightbox = document.getElementById('lightbox');
    const bar      = document.getElementById('lightboxAdmin');
    const earlier  = bar.querySelector('[data-admin="photo-earlier"]');
    const later    = bar.querySelector('[data-admin="photo-later"]');

    onLightboxRender(({ index, count }) => {
        const canEdit = isAdmin && authMode === 'authed';
        bar.hidden = !canEdit;
        lightbox.classList.toggle('has-admin', canEdit);
        earlier.disabled = index === 0;
        later.disabled   = index === count - 1;
    });

    bar.addEventListener('click', e => {
        const btn = e.target.closest('[data-admin]');
        if (!btn || btn.disabled || !isAdmin) return;

        switch (btn.dataset.admin) {
            case 'edit-caption':  return editCaption();
            case 'photo-earlier': return movePhoto(-1);
            case 'photo-later':   return movePhoto(1);
        }
    });
}
