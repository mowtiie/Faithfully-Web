export const letterStore = {};
export const chapterMeta = {};
export const chapterList = [];

export function chapterEyebrow(number) {
    return 'Chapter ' + String(number).padStart(2, '0');
}
