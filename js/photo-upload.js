import { auth, UPLOAD_WORKER_URL, PHOTO_BASE_URL } from './firebase.js';

const FULL_SIDE  = 2000;
const THUMB_SIDE = 600;

function fail(message, cause) {
    const err = new Error(message);
    err.userMessage = message;
    err.cause = cause;
    return err;
}

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

function describe(status, code) {
    if (status === 401 || status === 403) return 'The upload service refused your sign-in. Sign out, sign back in, and try again.';
    if (status === 413) return 'That image is too large.';
    if (status === 415) return 'That image format is not supported.';
    return `The upload service returned an error${code ? ` (${code})` : ''}. Try again.`;
}

async function callWorker(method, key, body) {
    const user = auth.currentUser;
    if (!user) throw fail('You are signed out. Sign in and try again.');

    let res;
    try {
        const token = await user.getIdToken();
        res = await fetch(`${UPLOAD_WORKER_URL}/${key}`, {
            method,
            headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'image/jpeg' } : {}) },
            body
        });
    } catch (err) {
        throw fail('Could not reach the upload service. Check your connection and try again.', err);
    }

    if (!res.ok) {
        let code = '';
        try { code = (await res.json()).error; } catch {}
        throw fail(describe(res.status, code));
    }
}

export function isHosted(url) {
    return typeof url === 'string' && url.startsWith(PHOTO_BASE_URL + '/');
}

function keyFromUrl(url) {
    return url.slice(PHOTO_BASE_URL.length + 1);
}

export async function uploadPhoto(file) {
    let source;
    try {
        source = await loadSource(file);
    } catch (err) {
        throw fail('Could not read that image. Try a JPEG or PNG.', err);
    }

    const full  = await toJpeg(source, FULL_SIDE, 0.85);
    const thumb = await toJpeg(source, THUMB_SIDE, 0.8);
    if (source.close) source.close();

    const name       = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const storagePath   = `gallery/${name}`;
    const thumbnailPath = `gallery/thumbs/${name}`;

    await callWorker('PUT', storagePath, full);
    try {
        await callWorker('PUT', thumbnailPath, thumb);
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

export async function deletePhotoFiles(photo) {
    const keys = new Set([photo.imageUrl, photo.thumbnailUrl].filter(isHosted).map(keyFromUrl));
    for (const key of keys) await callWorker('DELETE', key);
}
