import { PHOTO_BASE_URL } from './firebase.js';
import { callWorker as callWorkerWith, fail } from './worker-client.js';

const FULL_SIDE  = 2000;
const THUMB_SIDE = 600;

const callWorker = (method, key, body) => callWorkerWith(method, key, body, 'image/jpeg');

async function loadSource(file) {
    if (window.createImageBitmap) {
        try {
            return await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch {}
    }

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode_failed')); };
        img.src = url;
    });
}

function toJpeg(source, maxSide, quality) {
    const scale  = Math.min(1, maxSide / Math.max(source.width, source.height));
    const canvas = document.createElement('canvas');
    canvas.width  = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('encode_failed')), 'image/jpeg', quality);
    });
}

export function isHosted(url) {
    return typeof url === 'string' && url.startsWith(PHOTO_BASE_URL + '/');
}

function keyFromUrl(url) {
    return url.slice(PHOTO_BASE_URL.length + 1);
}

export async function uploadPhoto(file, onStep = () => {}) {
    onStep('Resizing…');

    let source;
    try {
        source = await loadSource(file);
    } catch (err) {
        throw fail('Could not read that image. Try a JPEG or PNG.', err);
    }

    const full  = await toJpeg(source, FULL_SIDE, 0.85);
    const thumb = await toJpeg(source, THUMB_SIDE, 0.8);
    if (source.close) source.close();

    onStep('Uploading…');
    return uploadPhotoBlobs(full, thumb);
}

export async function uploadPhotoBlobs(full, thumb) {
    const name       = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const storagePath   = `gallery/${name}`;
    const thumbnailPath = `gallery/thumbs/${name}`;

    await callWorker('PUT', storagePath, full);
    try {
        await callWorker('PUT', thumbnailPath, thumb || full);
    } catch (err) {
        await callWorker('DELETE', storagePath).catch(() => {});
        throw err;
    }

    return {
        imageUrl:     `${PHOTO_BASE_URL}/${storagePath}`,
        thumbnailUrl: `${PHOTO_BASE_URL}/${thumbnailPath}`,
        storagePath,
        thumbnailPath
    };
}

export function photoKeys(photo) {
    return [photo.imageUrl, photo.thumbnailUrl].filter(isHosted).map(keyFromUrl);
}

export async function deletePhotoFiles(photo) {
    for (const key of new Set(photoKeys(photo))) await callWorker('DELETE', key);
}

export async function deletePhotoKeys(keys) {
    for (const key of keys) await callWorker('DELETE', key);
}
