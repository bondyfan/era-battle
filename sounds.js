// ==========================================================================
// Era Battle - sound manager. Plays the ElevenLabs-generated SFX in /sounds.
// Classic script (defines window.Sfx) loaded before the game module so
// script.js can call window.Sfx.play(...) safely. Also gives every UI button
// a click sound on its own, so the game code doesn't have to wire clicks.
// ==========================================================================

(function () {
    const BASE = 'sounds/';
    const NAMES = [
        'attack_melee', 'attack_ranged', 'hit', 'death', 'spawn', 'kill_gold',
        'purchase', 'upgrade', 'evolve', 'evolve_ready', 'tower_build',
        'lane_unlock', 'special', 'victory', 'defeat', 'click', 'error', 'base_hit'
    ];
    const POOL = 4;                 // simultaneous instances per sound (overlap)
    const pools = {};
    const lastPlay = {};
    let masterVol = 0.55;
    let muted = false;

    function make(name) {
        const a = new Audio(BASE + name + '.mp3');
        a.preload = 'auto';
        return a;
    }
    function ensure(name) {
        if (!pools[name]) {
            pools[name] = [];
            for (let i = 0; i < POOL; i++) pools[name].push(make(name));
        }
        return pools[name];
    }

    function play(name, opts) {
        opts = opts || {};
        if (muted || NAMES.indexOf(name) === -1) return;
        const now = (performance && performance.now) ? performance.now() : Date.now();
        const th = opts.throttle || 0;
        if (th && lastPlay[name] && now - lastPlay[name] < th) return;
        lastPlay[name] = now;
        const pool = ensure(name);
        let a = null;
        for (const inst of pool) { if (inst.paused || inst.ended) { a = inst; break; } }
        if (!a) a = pool[0];
        try {
            a.currentTime = 0;
            a.volume = Math.max(0, Math.min(1, (opts.volume != null ? opts.volume : 1) * masterVol));
            const p = a.play();
            if (p && p.catch) p.catch(() => {});
        } catch (e) { /* ignore */ }
    }

    // Prime the pools on the first user gesture (browser autoplay policy).
    let unlocked = false;
    function unlock() {
        if (unlocked) return;
        unlocked = true;
        NAMES.forEach(ensure);
    }
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);

    // Global UI click feedback (buttons/cards) — no game-code wiring needed.
    window.addEventListener('pointerdown', (e) => {
        const t = e.target;
        if (t && t.closest && t.closest('.btn, .menu-btn-big, .btn-action, .btn-secondary, .lane-pill, .zoom-btn, .howto-toggle')) {
            play('click', { volume: 0.5, throttle: 40 });
        }
    }, { passive: true });

    window.Sfx = {
        play,
        setVolume(v) { masterVol = Math.max(0, Math.min(1, v)); },
        getVolume() { return masterVol; },
        setMuted(m) { muted = !!m; },
        toggleMuted() { muted = !muted; return muted; },
        isMuted() { return muted; }
    };

    // ======================================================================
    // Background MUSIC (menu + per-level themes) with crossfade.
    // ======================================================================
    const TRACKS = {
        mainmenu: 'music/mainmenu.mp3',
        level1: 'music/level1.mp3',
        level3: 'music/level3.mp3',
    };
    // One cached, STREAMING <audio> element per track. We never wait for the whole
    // file: the browser plays as soon as it has buffered enough (canplay), and the
    // fade-in is driven by real playback time (rAF), not a fixed timer — so a slow
    // network can't leave the volume stuck at 0 or delay the perceived start.
    const musEls = {};
    let curName = null, musVol = 0.42, musMuted = false;
    let fadeRaf = null;

    function getEl(name) {
        let a = musEls[name];
        if (!a) {
            a = new Audio();
            a.src = TRACKS[name];
            a.loop = true;
            a.preload = 'auto';
            a.volume = 0;
            try { a.load(); } catch (e) {}
            musEls[name] = a;
        }
        return a;
    }

    function musicPlay(name, opts) {
        opts = opts || {};
        if (!TRACKS[name]) return;
        if (curName === name && musEls[name] && !musEls[name].paused) return; // already playing
        const prevName = curName;
        curName = name;
        const next = getEl(name);
        const target = musMuted ? 0 : musVol;
        const fadeMs = opts.fade != null ? opts.fade : 900;
        const pr = next.play();
        if (pr && pr.catch) pr.catch(() => {}); // blocked until a user gesture -> retried below

        // rAF crossfade tied to wall-clock; keeps working even while buffering.
        if (fadeRaf) cancelAnimationFrame(fadeRaf);
        const t0 = performance.now();
        const prev = prevName && prevName !== name ? musEls[prevName] : null;
        const prevStart = prev ? prev.volume : 0;
        const step = (now) => {
            const t = Math.min(1, (now - t0) / fadeMs);
            if (!next.paused) next.volume = target * t;   // only ramps once actually playing
            if (prev) prev.volume = Math.max(0, prevStart * (1 - t));
            if (t < 1) { fadeRaf = requestAnimationFrame(step); }
            else { fadeRaf = null; if (prev) { try { prev.pause(); prev.currentTime = 0; } catch (e) {} } if (!next.paused) next.volume = target; }
        };
        fadeRaf = requestAnimationFrame(step);
    }
    function musicStop(fade) {
        const el = curName ? musEls[curName] : null; curName = null;
        if (!el) return;
        const t0 = performance.now(); const v0 = el.volume; const dur = fade || 600;
        const step = (now) => {
            const t = Math.min(1, (now - t0) / dur);
            el.volume = Math.max(0, v0 * (1 - t));
            if (t < 1) requestAnimationFrame(step); else { try { el.pause(); } catch (e) {} }
        };
        requestAnimationFrame(step);
    }
    // Start downloading the menu track immediately so it's ready to play on the first click.
    getEl('mainmenu');
    // If autoplay was blocked, resume the requested track on the first gesture.
    window.addEventListener('pointerdown', () => {
        if (curName && musEls[curName] && musEls[curName].paused) {
            const p = musEls[curName].play(); if (p && p.catch) p.catch(() => {});
            if (!musMuted) musEls[curName].volume = musVol;
        }
    }, { passive: true });

    window.Music = {
        play: musicPlay,
        stop: musicStop,
        setVolume(v) { musVol = Math.max(0, Math.min(1, v)); const a = curName && musEls[curName]; if (a && !musMuted) a.volume = musVol; },
        setMuted(m) { musMuted = !!m; const a = curName && musEls[curName]; if (a) a.volume = musMuted ? 0 : musVol; },
        toggleMuted() { musMuted = !musMuted; const a = curName && musEls[curName]; if (a) a.volume = musMuted ? 0 : musVol; return musMuted; },
        current() { return curName; },
    };
})();
