const BRUSH_SIZES   = [0.006, 0.014, 0.03];
const ERASER_SCALE  = 2.5;
const MIN_POINT_GAP = 0.002;

export function initDraw() {
    const canvas    = document.getElementById('drawCanvas');
    const ctx       = canvas.getContext('2d');
    const stage     = canvas.parentElement;
    const swatches  = [...document.querySelectorAll('.draw-swatch')];
    const sizeBtns  = [...document.querySelectorAll('.draw-size')];
    const eraserBtn = document.getElementById('drawEraser');
    const undoBtn   = document.getElementById('drawUndo');
    const rootStyle = getComputedStyle(document.documentElement);

    const strokes = [];
    let active    = null;
    let activeId  = null;
    let color     = inkColor(1);
    let sizeIndex = 1;
    let erasing   = false;
    let width     = 0;

    function inkColor(n) {
        return rootStyle.getPropertyValue(`--ink-${n}`).trim();
    }

    function drawStroke(stroke) {
        const pts = stroke.points;
        const r   = (stroke.size * width) / 2;

        ctx.save();
        ctx.globalCompositeOperation = stroke.eraser ? 'destination-out' : 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.fillStyle   = stroke.color;
        ctx.lineWidth   = r * 2;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';

        const h = canvas.height / (window.devicePixelRatio || 1);
        const px = p => p[0] * width;
        const py = p => p[1] * h;

        if (pts.length === 1) {
            ctx.beginPath();
            ctx.arc(px(pts[0]), py(pts[0]), r, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(px(pts[0]), py(pts[0]));
            for (let i = 1; i < pts.length - 1; i++) {
                const mx = (px(pts[i]) + px(pts[i + 1])) / 2;
                const my = (py(pts[i]) + py(pts[i + 1])) / 2;
                ctx.quadraticCurveTo(px(pts[i]), py(pts[i]), mx, my);
            }
            const last = pts[pts.length - 1];
            ctx.lineTo(px(last), py(last));
            ctx.stroke();
        }
        ctx.restore();
    }

    function redraw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokes.forEach(drawStroke);
        if (active) drawStroke(active);
    }

    function resize() {
        const rect = stage.getBoundingClientRect();
        if (rect.width === 0) return;

        const dpr = window.devicePixelRatio || 1;
        width = rect.width;
        canvas.width  = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        redraw();
    }

    function toPoint(e) {
        const rect = canvas.getBoundingClientRect();
        return [
            Math.round(((e.clientX - rect.left) / rect.width) * 10000) / 10000,
            Math.round(((e.clientY - rect.top) / rect.height) * 10000) / 10000
        ];
    }

    function addPoint(e) {
        const p    = toPoint(e);
        const last = active.points[active.points.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= MIN_POINT_GAP) active.points.push(p);
    }

    function finishStroke() {
        if (!active) return;
        strokes.push(active);
        active   = null;
        activeId = null;
        undoBtn.disabled = false;
    }

    canvas.addEventListener('pointerdown', e => {
        if (active || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        activeId = e.pointerId;
        active = {
            color,
            size:   BRUSH_SIZES[sizeIndex] * (erasing ? ERASER_SCALE : 1),
            eraser: erasing,
            points: [toPoint(e)]
        };
        redraw();
    });

    canvas.addEventListener('pointermove', e => {
        if (!active || e.pointerId !== activeId) return;
        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        (events.length ? events : [e]).forEach(addPoint);
        redraw();
    });

    canvas.addEventListener('pointerup', e => {
        if (e.pointerId !== activeId) return;
        addPoint(e);
        finishStroke();
        redraw();
    });

    canvas.addEventListener('pointercancel', e => {
        if (e.pointerId !== activeId) return;
        finishStroke();
        redraw();
    });

    function press(buttons, target) {
        buttons.forEach(b => b.setAttribute('aria-pressed', String(b === target)));
    }

    swatches.forEach(btn => {
        btn.addEventListener('click', () => {
            color   = inkColor(btn.dataset.ink);
            erasing = false;
            press(swatches, btn);
            eraserBtn.setAttribute('aria-pressed', 'false');
        });
    });

    sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeIndex = Number(btn.dataset.size);
            press(sizeBtns, btn);
        });
    });

    eraserBtn.addEventListener('click', () => {
        erasing = !erasing;
        eraserBtn.setAttribute('aria-pressed', String(erasing));
        if (erasing) swatches.forEach(b => b.setAttribute('aria-pressed', 'false'));
        else press(swatches, swatches.find(b => inkColor(b.dataset.ink) === color));
    });

    undoBtn.addEventListener('click', () => {
        strokes.pop();
        undoBtn.disabled = strokes.length === 0;
        redraw();
    });

    new ResizeObserver(resize).observe(stage);
}
