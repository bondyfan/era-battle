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

## Online Multiplayer (Firebase Realtime Database)

Online play uses a **host-authoritative** model over the Firebase **Realtime Database**
(fast and cheap for the ~11 state-snapshots/second the game sends). One player creates a
match and shares a 4-letter code; the other joins. Both players command the blue army on
the left of their own screen (the view is mirrored for the guest).

**This is already set up — nothing to do:**

- The default Realtime Database instance is live in **`europe-west1`**:
  `https://era-battle-default-rtdb.europe-west1.firebasedatabase.app`
- `firebase-config.js` already points `databaseURL` at it.
- Security rules are deployed: the `games` subtree is open read/write; the database
  root is denied. (Fine for a casual game — no accounts, no user data.)

   ```json
   {
     "rules": {
       ".read": false,
       ".write": false,
       "games": { ".read": true, ".write": true }
     }
   }
   ```

So once the site is deployed, "Create Online Match" / "Join Online Match" work out of
the box. Single-player never touches Firebase at all.

### Good to know / optional hardening

- **Authorized domains:** if you later add Firebase Auth, add your `*.pages.dev` (and any
  custom) domain under *Firebase console → Authentication → Settings → Authorized domains*.
  Not needed for the current anonymous RTDB setup.
- The rules are intentionally open on `games` (world read/write). For a public game this
  means anyone can read/write that path — acceptable for a casual title, but keep an eye on
  RTDB usage. Old `games/<code>` nodes are marked `ended` but not auto-pruned; add a TTL
  cleanup later if you want.
- Region is permanent for the default database. To change it you'd delete and recreate the
  instance, then update `databaseURL`.

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
