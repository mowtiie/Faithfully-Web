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

export function initStickyHeader() {
    const header = document.getElementById('stickyHeader');
    window.addEventListener('scroll', () => {
        header.classList.toggle('visible', window.scrollY > 100);
    });
}
