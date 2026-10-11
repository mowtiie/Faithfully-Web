import { isAdmin, onAuthChange } from './auth.js';
import { db } from './firebase.js';
import { getHomeState } from './home.js';
import { openEditor } from './admin.js';
import { toDateInput, toDateTimeInput, parseDateInput, parseDateTimeInput } from './date-fields.js';

const settingsRef = () => db.collection('settings').doc('home');

const textOrDefault = value => value || firebase.firestore.FieldValue.delete();
const stamp = date => firebase.firestore.Timestamp.fromDate(date);

function editCounter() {
    const { settings, defaults } = getHomeState();
    const current = settings || {};
    const start   = toDateInput(current.anniversaryStart);

    openEditor({
        title: 'Edit the counter',
        fields: [
            { name: 'start', label: 'Counting from', type: 'date', required: true, value: start },
            { name: 'label', label: 'Label', placeholder: defaults.anniversaryLabel, value: current.anniversaryLabel },
            { name: 'unit', label: 'Unit', placeholder: defaults.anniversaryUnit, value: current.anniversaryUnit }
        ],
        onSubmit: values => {
            const data = {
                anniversaryLabel: textOrDefault(values.label),
                anniversaryUnit:  textOrDefault(values.unit)
            };
            if (values.start !== start) data.anniversaryStart = stamp(parseDateInput(values.start, 0));
            return settingsRef().set(data, { merge: true });
        }
    });
}

function editCountdown() {
    const { settings, defaults } = getHomeState();
    const current = settings || {};
    const target  = toDateTimeInput(current.countdownTarget);

    openEditor({
        title: 'Edit the countdown',
        fields: [
            { name: 'target', label: 'Counting down to', type: 'datetime-local', required: true, value: target },
            { name: 'label', label: 'Label', placeholder: defaults.countdownLabel, value: current.countdownLabel },
            { name: 'finish', label: 'Message when it arrives', placeholder: defaults.countdownFinish, value: current.countdownFinish }
        ],
        onSubmit: values => {
            const data = {
                countdownLabel:  textOrDefault(values.label),
                countdownFinish: textOrDefault(values.finish)
            };
            if (values.target !== target) data.countdownTarget = stamp(parseDateTimeInput(values.target));
            return settingsRef().set(data, { merge: true });
        }
    });
}

export function initHomeAdmin() {
    const counterBtn   = document.getElementById('editCounterBtn');
    const countdownBtn = document.getElementById('editCountdownBtn');

    counterBtn.addEventListener('click', editCounter);
    countdownBtn.addEventListener('click', editCountdown);
    onAuthChange(() => {
        counterBtn.hidden   = !isAdmin;
        countdownBtn.hidden = !isAdmin;
    });
}
