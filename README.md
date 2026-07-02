# Era Battle

A 2D "Age of War"–style evolution battle game. Spawn units, evolve through 5 eras
(Stone → Ancient → Medieval → Modern → Future), build towers, fire era specials, and
destroy the enemy base. Play **single-player vs AI** or **online 1v1** against a friend.

It's a pure static site (HTML + CSS + vanilla-JS canvas). No build step is required.

---

## Run locally

Because the game uses ES modules, open it through a web server (not `file://`):

```bash
# any static server works, e.g.
python3 -m http.server 8000
# then open http://localhost:8000
```

or with the bundled dev tool:

```bash
npm install
npm run dev
```

---

## Deploy to Cloudflare Pages

The whole game is static files, so deployment is trivial:

- **Framework preset:** `None`
- **Build command:** *(leave empty)*
- **Build output directory:** `/` (the repository root)

Either connect the GitHub repo or drag-and-drop the folder in the Cloudflare Pages
dashboard. Single-player works immediately with zero configuration.

> The `vite` dev dependency is only for local convenience — you do **not** need a build
> command on Cloudflare. Just serve the files as-is.

---

## Enable Online Multiplayer (Firebase Realtime Database)

Online play uses a **host-authoritative** model over the Firebase **Realtime Database**
(fast and cheap for the ~11 state-snapshots/second the game sends). One player creates a
match and shares a 4-letter code; the other joins. Both players command the blue army on
the left of their own screen (the view is mirrored for the guest).

Firebase project config already lives in `firebase-config.js`. To turn multiplayer on you
must enable the Realtime Database once in the Firebase console:

1. **Firebase console → Build → Realtime Database → Create Database.**
2. Copy the database URL it gives you into `databaseURL` in `firebase-config.js`:
   - US default: `https://era-battle-default-rtdb.firebaseio.com`
   - EU region: `https://era-battle-default-rtdb.europe-west1.firebasedatabase.app`
   (the file currently defaults to the US URL — change it if your DB is in another region)
3. **Rules tab →** set at minimum:

   ```json
   {
     "rules": {
       "games": { ".read": true, ".write": true }
     }
   }
   ```

   This is fine for a casual game. Tighten it later if you add accounts.

4. Make sure your Cloudflare Pages domain is allowed:
   **Firebase console → Authentication → Settings → Authorized domains** (add your
   `*.pages.dev` domain and any custom domain). *(Only strictly needed if you later add
   Firebase Auth, but good to set.)*

That's it — no server code, no functions. If the Realtime Database isn't set up, the
single-player game still works perfectly; only the online buttons will report an error.

---

## Controls

| Action | Control |
| --- | --- |
| Spawn units | Buttons, or keys `1` `2` `3` |
| Evolve era | Button, or `E` |
| Special attack | Button, or `Space` |
| Pan the battlefield | Drag the canvas / hold the side arrows |
| Zoom | Mouse wheel, the `+ / − / FIT` buttons, or keys `+` `-` `0` |

`FIT` (or `0`) zooms out to show the entire battlefield at once.

---

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Layout, HUD, menus, modals |
| `style.css` | All styling (responsive) |
| `script.js` | Game engine: entities, simulation, rendering, camera/zoom, menus, netcode glue |
| `net.js` | Firebase Realtime Database transport (dynamically imported only for online play) |
| `firebase-config.js` | Firebase project config (edit `databaseURL` here) |
