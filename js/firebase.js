const firebaseConfig = {
    apiKey:            "AIzaSyALMN5lKjZXD8IXa7la_reuUO2LbuJ6l3o",
    authDomain:        "faithfully-ac2cd.firebaseapp.com",
    projectId:         "faithfully-ac2cd",
    storageBucket:     "faithfully-ac2cd.firebasestorage.app",
    messagingSenderId: "1036385139189",
    appId:             "1:1036385139189:web:90ceabbcbe3c20b16e48bc"
};

firebase.initializeApp(firebaseConfig);

export const db   = firebase.firestore();
export const auth = firebase.auth();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

export const ALLOWED_UIDS = new Set([
    "371O09ErYFShTBzNDdInf40FUE23",
    "h0yjVpgq6pbreAD3aZvQOcaOp4F3"
]);
