import { auth, UPLOAD_WORKER_URL } from './firebase.js';

export function fail(message, cause) {
    const err = new Error(message);
    err.userMessage = message;
    err.cause = cause;
    return err;
}

function describe(status, code, key) {
    const what = key.startsWith('voice/') ? 'recording' : 'image';
    if (status === 401 || status === 403) return 'The upload service refused your sign-in. Sign out, sign back in, and try again.';
    if (status === 404) return 'That recording could not be found.';
    if (status === 413) return `That ${what} is too large.`;
    if (status === 415) return `That ${what} format is not supported.`;
    return `The upload service returned an error${code ? ` (${code})` : ''}. Try again.`;
}

export async function callWorker(method, key, body, contentType) {
    const user = auth.currentUser;
    if (!user) throw fail('You are signed out. Sign in and try again.');

    let res;
    try {
        const token = await user.getIdToken();
        res = await fetch(`${UPLOAD_WORKER_URL}/${key}`, {
            method,
            headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': contentType } : {}) },
            body
        });
    } catch (err) {
        throw fail('Could not reach the upload service. Check your connection and try again.', err);
    }

    if (!res.ok) {
        let code = '';
        try { code = (await res.json()).error; } catch {}
        throw fail(describe(res.status, code, key));
    }

    return res;
}
