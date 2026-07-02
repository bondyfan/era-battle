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
})();
