let scrollLocks = 0;

export function lockScroll() {
    if (scrollLocks++ === 0) document.body.style.overflow = 'hidden';
}

export function unlockScroll() {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) document.body.style.overflow = '';
}

export function trapFocus(container, e) {
    if (e.key !== 'Tab') return;
    const focusable = [...container.querySelectorAll('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])')]
        .filter(el => el.getClientRects().length > 0);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function escapeAttr(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
}
