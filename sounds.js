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
        'lane_unlock', 'special', 'victory', 'defeat', 'click', 'error'
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
    let curAudio = null, curName = null, musVol = 0.42, musMuted = false;

    function musicPlay(name, opts) {
        opts = opts || {};
        const url = TRACKS[name];
        if (!url) return;
        if (curName === name && curAudio && !curAudio.paused) return; // already playing
        curName = name;
        const next = new Audio(url);
        next.loop = opts.loop !== false;
        next.volume = 0;
        const target = musMuted ? 0 : musVol;
        const pr = next.play();
        if (pr && pr.catch) pr.catch(() => {}); // may be blocked until a user gesture
        const old = curAudio;
        curAudio = next;
        const fade = opts.fade != null ? opts.fade : 900;
        const steps = 24;
        let i = 0;
        const iv = setInterval(() => {
            i++;
            const t = i / steps;
            if (!next.paused) next.volume = target * t;
            if (old) old.volume = Math.max(0, old.volume * (1 - t));
            if (i >= steps) { clearInterval(iv); if (old) { try { old.pause(); } catch (e) {} } }
        }, fade / steps);
    }
    function musicStop(fade) {
        const old = curAudio; curAudio = null; curName = null;
        if (!old) return;
        const steps = 16; let i = 0;
        const iv = setInterval(() => {
            i++; old.volume = Math.max(0, old.volume * (1 - i / steps));
            if (i >= steps) { clearInterval(iv); try { old.pause(); } catch (e) {} }
        }, (fade || 600) / steps);
    }
    // If autoplay was blocked, resume the requested track on the first gesture.
    window.addEventListener('pointerdown', () => {
        if (curName && curAudio && curAudio.paused) {
            const p = curAudio.play(); if (p && p.catch) p.catch(() => {});
            if (!musMuted) curAudio.volume = musVol;
        }
    }, { passive: true });

    window.Music = {
        play: musicPlay,
        stop: musicStop,
        setVolume(v) { musVol = Math.max(0, Math.min(1, v)); if (curAudio && !musMuted) curAudio.volume = musVol; },
        setMuted(m) { musMuted = !!m; if (curAudio) curAudio.volume = musMuted ? 0 : musVol; },
        toggleMuted() { musMuted = !musMuted; if (curAudio) curAudio.volume = musMuted ? 0 : musVol; return musMuted; },
        current() { return curName; },
    };
})();
