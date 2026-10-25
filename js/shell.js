export function initFloatingHearts() {
    const container = document.getElementById('heartsBackground');
    const flowers = ['🌻', '🌼', '🌾', '🌿'];
    for (let i = 0; i < 15; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart-float';
        heart.textContent = flowers[Math.floor(Math.random() * flowers.length)];
        heart.style.left = Math.random() * 100 + '%';
        heart.style.animationDelay = Math.random() * 15 + 's';
        heart.style.animationDuration = (15 + Math.random() * 10) + 's';
        container.appendChild(heart);
    }
}

export function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon   = document.querySelector('.theme-icon');

    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const saved      = localStorage.getItem('theme');

    function applyTheme(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        themeIcon.textContent = isDark ? '☀️' : '🌙';
        themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }

    applyTheme(saved ? saved === 'dark' : systemDark.matches);

    systemDark.addEventListener('change', e => {
        if (!localStorage.getItem('theme')) applyTheme(e.matches);
    });

    themeToggle.addEventListener('click', () => {
        const isDark = !document.body.classList.contains('dark-mode');
        themeIcon.style.transform = 'rotate(360deg) scale(0)';
        setTimeout(() => {
            applyTheme(isDark);
            themeIcon.style.transform = 'rotate(0deg) scale(1)';
        }, 200);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

export function initDrawerCollapse() {
    const btn = document.getElementById('drawerCollapseBtn');
    if (!btn) return;

    if (localStorage.getItem('drawerCollapsed') === 'true') {
        document.body.classList.add('drawer-collapsed');
    }

    btn.addEventListener('click', () => {
        const collapsed = document.body.classList.toggle('drawer-collapsed');
        localStorage.setItem('drawerCollapsed', collapsed);
    });
}

export function initMoreMenu() {
    const button = document.getElementById('moreBtn');
    const sheet  = document.getElementById('moreSheet');
    if (!button || !sheet) return;

    function setOpen(open, restoreFocus = false) {
        sheet.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        if (open) sheet.querySelector('.nav-btn').focus();
        else if (restoreFocus) button.focus();
    }

    button.addEventListener('click', () => setOpen(sheet.hidden));
    sheet.addEventListener('click', () => setOpen(false));

    document.addEventListener('click', e => {
        if (!sheet.hidden && !sheet.contains(e.target) && !button.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !sheet.hidden) setOpen(false, true);
    });

    window.addEventListener('scroll', () => { if (!sheet.hidden) setOpen(false); }, { passive: true });
}

export function initBottomNavScroll() {
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return;
    let timer;
    window.addEventListener('scroll', () => {
        nav.classList.add('scrolling');
        clearTimeout(timer);
        timer = setTimeout(() => nav.classList.remove('scrolling'), 200);
    }, { passive: true });
}
