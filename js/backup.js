import { db } from './firebase.js';
import { uploadPhotoBlobs, photoKeys, deletePhotoKeys } from './photo-upload.js';

const COLLECTIONS = ['chapters', 'cards', 'gallery', 'apps'];
const SETTINGS_ID = 'home';
const VERSION = 1;
const IMAGES_DIR = 'images/';
const TIMESTAMP_FIELDS = new Set(['date', 'uploadedAt', 'createdAt', 'countdownTarget', 'anniversaryStart']);
const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

let jszipPromise = null;

function loadJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (!jszipPromise) {
        jszipPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = JSZIP_URL;
            script.onload = () => resolve(window.JSZip);
            script.onerror = () => {
                jszipPromise = null;
                reject(userError('Could not load the zip library. Check your connection and try again.'));
            };
            document.head.appendChild(script);
        });
    }
    return jszipPromise;
}

function userError(message, cause) {
    const err = new Error(message);
    err.userMessage = message;
    err.cause = cause;
    return err;
}

function encode(value) {
    if (value == null) return null;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (Array.isArray(value)) return value.map(encode);
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]));
    }
    return value;
}

function decode(data) {
    const out = {};
    for (const [key, value] of Object.entries(data)) {
        out[key] = TIMESTAMP_FIELDS.has(key) && typeof value === 'number'
            ? firebase.firestore.Timestamp.fromMillis(value)
            : value;
    }
    return out;
}

async function fetchAll() {
    const result = {};
    for (const name of COLLECTIONS) {
        const snap = await db.collection(name).get();
        result[name] = snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    }
    const settings = await db.collection('settings').doc(SETTINGS_ID).get();
    result.settings = settings.exists ? [{ id: SETTINGS_ID, data: settings.data() }] : [];
    return result;
}

async function fetchBlob(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
}

export function stamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function exportBackup({ photos, onProgress = () => {} }) {
    const JSZip = await loadJSZip();

    onProgress('Reading your data…', 0);
    let all;
    try {
        all = await fetchAll();
    } catch (err) {
        throw userError('Could not read your data. Check your connection and try again.', err);
    }

    const zip = new JSZip();
    const root = { version: VERSION, exportedAt: Date.now() };
    const counts = {};
    let skipped = 0;

    const withPhotos = photos ? all.gallery.filter(d => d.data.imageUrl) : [];
    let done = 0;

    for (const name of [...COLLECTIONS, 'settings']) {
        counts[name] = all[name].length;
        root[name] = [];
        for (const { id, data } of all[name]) {
            const entry = { ...encode(data), _id: id };
            if (name === 'gallery' && photos && data.imageUrl) {
                onProgress(`Downloading photo ${++done} of ${withPhotos.length}…`, done / (withPhotos.length + 1));
                try {
                    zip.file(`${IMAGES_DIR}${id}.jpg`, await fetchBlob(data.imageUrl), { compression: 'STORE' });
                    entry._zipFull = `${id}.jpg`;
                    if (data.thumbnailUrl) {
                        zip.file(`${IMAGES_DIR}${id}_thumb.jpg`, await fetchBlob(data.thumbnailUrl), { compression: 'STORE' });
                        entry._zipThumb = `${id}_thumb.jpg`;
                    }
                } catch (err) {
                    console.warn('Photo not included', id, err);
                    skipped++;
                    delete entry._zipFull;
                    delete entry._zipThumb;
                    zip.remove(`${IMAGES_DIR}${id}.jpg`);
                    zip.remove(`${IMAGES_DIR}${id}_thumb.jpg`);
                }
            }
            root[name].push(entry);
        }
    }

    zip.file('data.json', JSON.stringify(root, null, 2));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, meta => {
        onProgress('Building the file…', 0.9 + meta.percent / 1000);
    });

    return { blob, filename: `faithfully-backup-${stamp()}.zip`, counts, skipped };
}

export async function readBackup(file) {
    const JSZip = await loadJSZip();

    let zip;
    try {
        zip = await JSZip.loadAsync(file);
    } catch (err) {
        throw userError('That file is not a backup zip.', err);
    }

    const dataFile = zip.file('data.json');
    if (!dataFile) throw userError('That zip has no data.json, so it is not a Faithfully backup.');

    let root;
    try {
        root = JSON.parse(await dataFile.async('string'));
    } catch (err) {
        throw userError('The backup data is damaged and could not be read.', err);
    }

    if (!root || typeof root !== 'object' || Array.isArray(root)) throw userError('The backup data is not in the expected shape.');
    if ((root.version || 1) > VERSION) throw userError('This backup was made by a newer version and cannot be restored here.');

    const data = {};
    const counts = {};
    for (const name of [...COLLECTIONS, 'settings']) {
        const list = root[name];
        if (list == null) continue;
        if (!Array.isArray(list)) throw userError(`The "${name}" section of the backup is not a list.`);
        data[name] = list.map(item => {
            if (!item || typeof item !== 'object' || typeof item._id !== 'string' || !item._id || item._id.includes('/')) {
                throw userError(`An entry in "${name}" has no valid id.`);
            }
            return item;
        });
        counts[name] = list.length;
    }

    if (!Object.keys(data).length) throw userError('That backup contains none of the expected data.');

    const photoCount = (data.gallery || []).filter(d => d._zipFull && zip.file(IMAGES_DIR + d._zipFull)).length;
    return { zip, data, counts, photoCount, exportedAt: root.exportedAt };
}

function strip(entry) {
    const { _id, _zipFull, _zipThumb, ...rest } = entry;
    return decode(rest);
}

async function commitChunks(ops) {
    for (let i = 0; i < ops.length; i += 400) {
        const batch = db.batch();
        ops.slice(i, i + 400).forEach(op => op(batch));
        await batch.commit();
    }
}

export async function restoreBackup(backup, { mode, onProgress = () => {} }) {
    const replace = mode === 'replace';
    const { zip, data } = backup;

    onProgress('Reading current data…', 0);
    const current = await fetchAll();

    const photoJobs = (data.gallery || []).filter(d => d._zipFull && zip.file(IMAGES_DIR + d._zipFull)).length;
    const total = photoJobs + 1;
    let step = 0;

    const finalGallery = new Map(current.gallery.map(d => [d.id, d.data]));
    let failedPhotos = 0;

    for (const name of COLLECTIONS) {
        if (!data[name]) continue;
        const ops = [];

        for (const entry of data[name]) {
            const fields = strip(entry);
            const col = db.collection(name);

            if (name === 'gallery' && entry._zipFull && zip.file(IMAGES_DIR + entry._zipFull)) {
                onProgress(`Uploading photo ${++step} of ${photoJobs}…`, step / total);
                try {
                    const full = await zip.file(IMAGES_DIR + entry._zipFull).async('blob');
                    const thumbFile = entry._zipThumb && zip.file(IMAGES_DIR + entry._zipThumb);
                    const thumb = thumbFile ? await thumbFile.async('blob') : null;
                    Object.assign(fields, await uploadPhotoBlobs(full, thumb));
                } catch (err) {
                    console.warn('Photo not restored', entry._id, err);
                    failedPhotos++;
                    continue;
                }
                await col.doc(entry._id).set(fields);
                finalGallery.set(entry._id, fields);
                continue;
            }

            ops.push(batch => (replace ? batch.set(col.doc(entry._id), fields) : batch.set(col.doc(entry._id), fields, { merge: true })));
            if (name === 'gallery') finalGallery.set(entry._id, replace ? fields : { ...finalGallery.get(entry._id), ...fields });
        }

        onProgress(`Writing ${name}…`, step / total);
        await commitChunks(ops);

        if (replace) {
            const keep = new Set(data[name].map(d => d._id));
            const stale = current[name].filter(d => !keep.has(d.id));
            await commitChunks(stale.map(d => batch => batch.delete(db.collection(name).doc(d.id))));
            if (name === 'gallery') stale.forEach(d => finalGallery.delete(d.id));
        }
    }

    if (data.settings) {
        const entry = data.settings.find(d => d._id === SETTINGS_ID);
        if (entry) {
            const ref = db.collection('settings').doc(SETTINGS_ID);
            await (replace ? ref.set(strip(entry)) : ref.set(strip(entry), { merge: true }));
        }
    }

    let leftover = 0;
    if (data.gallery) {
        onProgress('Cleaning up old photo files…', 0.99);
        const keep = new Set([...finalGallery.values()].flatMap(photoKeys));
        const doomed = new Set();
        for (const old of current.gallery) {
            const next = finalGallery.get(old.id);
            if (!next || next.imageUrl !== old.data.imageUrl) photoKeys(old.data).forEach(k => doomed.add(k));
        }
        for (const key of keep) doomed.delete(key);
        try {
            await deletePhotoKeys(doomed);
        } catch (err) {
            console.warn('Old photo files not removed', err);
            leftover = doomed.size;
        }
    }

    return { failedPhotos, leftover };
}
