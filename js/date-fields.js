function pad(n) {
    return String(n).padStart(2, '0');
}

function asDate(value) {
    if (!value) return null;
    const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
    return isNaN(date) ? null : date;
}

export function toDateInput(value) {
    const d = asDate(value);
    return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '';
}

export function toDateTimeInput(value) {
    const d = asDate(value);
    return d ? `${toDateInput(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
}

export function parseDateInput(value, hour = 12) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, hour);
}

export function parseDateTimeInput(value) {
    return new Date(value);
}
