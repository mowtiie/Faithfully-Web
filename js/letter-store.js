export const letterStore = {};
export const chapterMeta = {};

export function chapterEyebrow(number) {
    return 'Chapter ' + String(number).padStart(2, '0');
}
