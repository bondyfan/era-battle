// ==========================================================================
// Firebase configuration for Era Battle online multiplayer.
//
// IMPORTANT: multiplayer uses the Firebase **Realtime Database** (fast, cheap
// for the ~11 snapshots/sec this game sends). In the Firebase console you must:
//   1. Build → Realtime Database → "Create Database".
//   2. Copy the database URL it gives you into `databaseURL` below.
//      - US default looks like:   https://era-battle-default-rtdb.firebaseio.com
//      - EU region looks like:    https://era-battle-default-rtdb.europe-west1.firebasedatabase.app
//   3. Set the security rules (Rules tab) to at least:
//        {
//          "rules": {
//            "games": { ".read": true, ".write": true }
//          }
//        }
//      (This is fine for a casual game. Tighten later if you add accounts.)
// ==========================================================================

export const firebaseConfig = {
    apiKey: "AIzaSyAYuu5XEC4HkPG6zoOEAL_xbPFuLru5BnA",
    authDomain: "era-battle.firebaseapp.com",
    databaseURL: "https://era-battle-default-rtdb.firebaseio.com",
    projectId: "era-battle",
    storageBucket: "era-battle.firebasestorage.app",
    messagingSenderId: "546262567504",
    appId: "1:546262567504:web:d9e930055b881cfa985f55",
    measurementId: "G-VN9VNYK0E9"
};
