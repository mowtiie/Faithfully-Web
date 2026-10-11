import { isAdmin, authMode, onAuthChange } from './auth.js';
import { db } from './firebase.js';
import { getLightboxState, onLightboxRender } from './lightbox.js';
import { openEditor, confirmDialog, nextOrder, reorder, attempt } from './admin.js';
import { uploadPhoto, deletePhotoFiles, isHosted } from './photo-upload.js';
import { openPhotoDialog } from './photo-dialog.js';

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

function addPhotos() {
    let nextPosition = nextOrder(getLightboxState().photos);

    openPhotoDialog({
        save: async (file, caption, onStep) => {
            const files = await uploadPhoto(file, onStep);
            onStep('Saving…');

            try {
                await db.collection('gallery').add({
                    ...files,
                    caption,
                    order: nextPosition,
                    uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                nextPosition++;
            } catch (err) {
                await deletePhotoFiles(files).catch(() => {});
                throw err;
            }
        }
    });
}

async function deletePhoto() {
    const { photos, index } = getLightboxState();
    const photo = photos[index];
    if (!photo) return;

    const hosted = isHosted(photo.imageUrl);
    const ok = await confirmDialog({
        title: 'Delete this photo?',
        text: hosted
            ? 'The photo and its thumbnail will be removed for good.'
            : 'It will be removed from the gallery. The original file in the old storage is not touched.'
    });
    if (!ok) return;

    await attempt(async () => {
        if (hosted) await deletePhotoFiles(photo);
        await db.collection('gallery').doc(photo.id).delete();
    }, 'delete the photo');
}

export function initGalleryAdmin() {
    const lightbox = document.getElementById('lightbox');
    const bar      = document.getElementById('lightboxAdmin');
    const addBtn   = document.getElementById('addPhotoBtn');
    const earlier  = bar.querySelector('[data-admin="photo-earlier"]');
    const later    = bar.querySelector('[data-admin="photo-later"]');

    onLightboxRender(({ index, count }) => {
        const canEdit = isAdmin && authMode === 'authed';
        bar.hidden = !canEdit;
        lightbox.classList.toggle('has-admin', canEdit);
        earlier.disabled = index === 0;
        later.disabled   = index === count - 1;
    });

    addBtn.addEventListener('click', addPhotos);
    onAuthChange(() => { addBtn.hidden = !isAdmin; });

    bar.addEventListener('click', e => {
        const btn = e.target.closest('[data-admin]');
        if (!btn || btn.disabled || !isAdmin) return;

        switch (btn.dataset.admin) {
            case 'edit-caption':  return editCaption();
            case 'photo-earlier': return movePhoto(-1);
            case 'photo-later':   return movePhoto(1);
            case 'delete-photo':  return deletePhoto();
        }
    });
}
