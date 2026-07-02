// ==========================================================================
// Era Battle - Online multiplayer transport (Firebase Realtime Database)
//
// Architecture: host-authoritative.
//  - The HOST runs the full simulation for both armies and broadcasts compact
//    world snapshots (~11/sec) at  games/<code>/snap.
//  - The GUEST renders those snapshots (mirrored, so it also sits on the left)
//    and pushes its inputs to  games/<code>/cmd  which the host consumes.
//  - games/<code>/meta holds lobby state (host, guest, state, winner).
//
// This module is dynamically imported only when the player opens a multiplayer
// menu, so single-player never depends on Firebase loading at all.
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getDatabase, ref, child, get, set, update, push, remove,
    onValue, onChildAdded, onDisconnect, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

let app = null;
let db = null;

function ensureInit() {
    if (db) return;
    if (!firebaseConfig.databaseURL || firebaseConfig.databaseURL.indexOf("http") !== 0) {
        throw new Error("Realtime Database URL missing — set databaseURL in firebase-config.js");
    }
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
}

// Firebase silently retries an unreachable / misconfigured Realtime Database
// forever, which would otherwise leave the UI stuck on "Joining…". Race every
// initial request against a timeout so the player gets a clear message.
const DB_TIMEOUT_MS = 9000;
function withTimeout(promise, msg) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(msg)), DB_TIMEOUT_MS);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const DB_UNREACHABLE = "Can't reach the database. Make sure Realtime Database is enabled in Firebase and the databaseURL in firebase-config.js is correct.";

// Unambiguous 4-character codes (no 0/O/1/I).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode() {
    let s = "";
    for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    return s;
}

export const EraNet = {
    role: null,
    code: null,
    uid: "u" + Math.random().toString(36).slice(2, 10),
    gameRef: null,
    _unsubs: [],

    async createGame() {
        ensureInit();
        let code = null;
        for (let attempt = 0; attempt < 6; attempt++) {
            const candidate = genCode();
            const snap = await withTimeout(get(ref(db, "games/" + candidate)), DB_UNREACHABLE);
            if (!snap.exists()) {
                await withTimeout(set(ref(db, "games/" + candidate), {
                    meta: { host: this.uid, guest: null, state: "waiting", created: Date.now() }
                }), DB_UNREACHABLE);
                code = candidate;
                break;
            }
        }
        if (!code) throw new Error("Could not allocate a game code, try again.");
        this.role = "host";
        this.code = code;
        this.gameRef = ref(db, "games/" + code);
        this._setupPresence();
        return code;
    },

    async joinGame(code) {
        ensureInit();
        code = (code || "").toUpperCase().trim();
        const gref = ref(db, "games/" + code);
        const metaRef = child(gref, "meta");
        // Atomically claim the guest slot so a host cancel / a second guest can't race us in.
        const result = await withTimeout(runTransaction(metaRef, (meta) => {
            if (!meta) return;                                   // game not found -> abort
            if (meta.state === "ended") return;                  // already ended -> abort
            if (meta.guest && meta.guest !== this.uid) return;   // already full  -> abort
            meta.guest = this.uid;
            meta.state = "playing";
            return meta;
        }), DB_UNREACHABLE);

        if (!result.committed) {
            const meta = result.snapshot && result.snapshot.val();
            if (!meta) throw new Error("Game not found. Check the code.");
            if (meta.state === "ended") throw new Error("That match already ended.");
            throw new Error("That match is already full.");
        }

        this.role = "guest";
        this.code = code;
        this.gameRef = gref;
        this._setupPresence();
        return true;
    },

    _opponentRole() { return this.role === "host" ? "guest" : "host"; },

    // Per-connection presence: cleared automatically on disconnect and re-armed on
    // every (re)connection. Used to detect a peer leaving WITHOUT ending the match
    // on a transient blip (the surviving client applies a grace period).
    _setupPresence() {
        if (!this.gameRef) return;
        const myRef = child(this.gameRef, "presence/" + this.role);
        const connRef = ref(db, ".info/connected");
        this._unsubs.push(onValue(connRef, (snap) => {
            if (snap.val() === true) {
                onDisconnect(myRef).remove();
                set(myRef, true).catch(() => {});
            }
        }));
    },

    onOpponentPresence(cb) {
        if (!this.gameRef) return;
        const oppRef = child(this.gameRef, "presence/" + this._opponentRole());
        this._unsubs.push(onValue(oppRef, (snap) => cb(snap.val() === true)));
    },

    onMeta(cb) {
        if (!this.gameRef) return;
        this._unsubs.push(onValue(child(this.gameRef, "meta"), (s) => cb(s.val() || {})));
    },

    onSnapshot(cb) {
        if (!this.gameRef) return;
        this._unsubs.push(onValue(child(this.gameRef, "snap"), (s) => { const v = s.val(); if (v) cb(v); }));
    },

    sendSnapshot(data) {
        if (this.gameRef) set(child(this.gameRef, "snap"), data).catch(() => {});
    },

    sendCommand(cmd) {
        if (this.gameRef) push(child(this.gameRef, "cmd"), { ...cmd, at: Date.now() }).catch(() => {});
    },

    onCommand(cb) {
        if (!this.gameRef) return;
        this._unsubs.push(onChildAdded(child(this.gameRef, "cmd"), (s) => {
            cb(s.val(), s.key);
            remove(s.ref).catch(() => {}); // consume once handled
        }));
    },

    setMeta(patch) {
        if (this.gameRef) return update(child(this.gameRef, "meta"), patch).catch(() => {});
        return Promise.resolve();
    },

    leave() {
        try {
            if (this.gameRef) {
                const myRef = child(this.gameRef, "presence/" + this.role);
                onDisconnect(myRef).cancel().catch(() => {});
                remove(myRef).catch(() => {});
                // Intentional leave marks the match ended so the peer reacts immediately.
                update(child(this.gameRef, "meta"), { state: "ended" }).catch(() => {});
            }
        } catch (e) { /* ignore */ }
        for (const u of this._unsubs) { try { u(); } catch (e) {} }
        this._unsubs = [];
        this.role = null;
        this.code = null;
        this.gameRef = null;
    }
};
