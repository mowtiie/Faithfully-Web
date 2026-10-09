import { auth, ALLOWED_UIDS } from './firebase.js';

export let authMode  = 'guest';
export let authReady = false;

const listeners = [];

export function onAuthChange(listener) {
    listeners.push(listener);
}

export function startAuth() {
    auth.onAuthStateChanged(user => {
        authReady = true;

        if (user && ALLOWED_UIDS.has(user.uid)) {
            authMode = 'authed';
        } else {
            authMode = 'guest';
            if (user) {
                console.warn('Signed-in UID is not on the allow list. Signing out.');
                auth.signOut();
            }
        }

        document.body.classList.toggle('demo-mode', authMode === 'guest');
        listeners.forEach(listener => listener(authMode));
    });
}

export function signIn(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}

export function signOut() {
    return auth.signOut();
}
