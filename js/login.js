import { authMode, onAuthChange, signIn, signOut } from './auth.js';
import { lockScroll, unlockScroll, trapFocus } from './ui.js';

let loginOpener = null;

function openLogin() {
    const overlay = document.getElementById('loginOverlay');
    if (overlay.classList.contains('active')) return;

    loginOpener = document.activeElement;
    document.getElementById('loginError').textContent = '';
    document.getElementById('loginPassword').value    = '';
    setPasswordVisible(false);

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    lockScroll();
    setTimeout(() => document.getElementById('loginEmail').focus(), 100);
}

function closeLogin() {
    const overlay = document.getElementById('loginOverlay');
    if (!overlay.classList.contains('active')) return;

    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    unlockScroll();

    if (loginOpener && document.contains(loginOpener)) loginOpener.focus();
    loginOpener = null;
}

function setPasswordVisible(visible) {
    document.getElementById('loginPassword').type = visible ? 'text' : 'password';
    const reveal = document.getElementById('loginReveal');
    reveal.textContent = visible ? 'Hide' : 'Show';
    reveal.setAttribute('aria-pressed', String(visible));
}

function openSignOutDialog() {
    const dialog = document.getElementById('signOutDialog');
    dialog.classList.add('active');
    dialog.setAttribute('aria-hidden', 'false');
    lockScroll();
    document.getElementById('signOutCancel').focus();
}

function closeSignOutDialog() {
    const dialog = document.getElementById('signOutDialog');
    if (!dialog.classList.contains('active')) return;

    dialog.classList.remove('active');
    dialog.setAttribute('aria-hidden', 'true');
    unlockScroll();
    document.getElementById('authBtn').focus();
}

function signInErrorMessage(code) {
    switch (code) {
        case 'auth/invalid-email':      return 'That email doesn\'t look right.';
        case 'auth/user-not-found':     return 'No account found with that email.';
        case 'auth/wrong-password':
        case 'auth/invalid-credential': return 'Wrong email or password.';
        case 'auth/too-many-requests':  return 'Too many attempts. Please wait a moment.';
        default:                        return 'Sign-in failed. Please try again.';
    }
}

async function submitLogin(e) {
    e.preventDefault();
    const email      = document.getElementById('loginEmail').value.trim();
    const password   = document.getElementById('loginPassword').value;
    const errorEl    = document.getElementById('loginError');
    const submitBtn  = document.getElementById('loginSubmit');
    const submitText = document.getElementById('loginSubmitText');

    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitText.textContent = 'Signing in...';

    try {
        await signIn(email, password);
        closeLogin();
    } catch (err) {
        errorEl.textContent = signInErrorMessage(err.code);
    } finally {
        submitBtn.disabled = false;
        submitText.textContent = 'Sign In';
    }
}

function renderAuthButton(mode) {
    const authed = mode === 'authed';
    document.getElementById('authBtnIcon').textContent = authed ? '👤' : '🔒';
    document.getElementById('authBtn').setAttribute('aria-label', authed ? 'Signed in — tap to sign out' : 'Sign in');
}

export function initLogin() {
    document.getElementById('authBtn').addEventListener('click', () => {
        if (authMode === 'authed') openSignOutDialog();
        else                       openLogin();
    });

    document.querySelector('.login-close').addEventListener('click', closeLogin);
    document.querySelector('.login-form').addEventListener('submit', submitLogin);
    document.getElementById('loginReveal').addEventListener('click', () => {
        setPasswordVisible(document.getElementById('loginPassword').type === 'password');
    });

    const signOutDialog = document.getElementById('signOutDialog');
    signOutDialog.querySelector('.dialog-backdrop').addEventListener('click', closeSignOutDialog);
    document.getElementById('signOutCancel').addEventListener('click', closeSignOutDialog);
    document.getElementById('signOutConfirm').addEventListener('click', () => {
        closeSignOutDialog();
        signOut();
    });

    const dialogs = [
        [signOutDialog,                             closeSignOutDialog],
        [document.getElementById('loginOverlay'),   closeLogin]
    ];
    document.addEventListener('keydown', e => {
        for (const [el, close] of dialogs) {
            if (!el.classList.contains('active')) continue;
            if (e.key === 'Escape') close();
            trapFocus(el, e);
            return;
        }
    });

    onAuthChange(renderAuthButton);
}
