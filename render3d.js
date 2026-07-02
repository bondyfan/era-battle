// ==========================================================================
// Era Battle - top-down 3D renderer (three.js).
// Pure reflection of the sim state. script.js owns all game logic and calls
// the sync*/render functions each frame. No external model assets: every mesh
// is procedural low-poly geometry so the game ships as static files.
// ==========================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    mapX, mapZ, laneZ3, mapYFromSimY, S,
    GROUND_Y, PLAYER_BASE_X, ENEMY_BASE_X, MIDLINE_X,
    LANE_Z_BY_IDX, LANE_IDX
} from './world.js';

// Palette mirrors ERA_DATA (Stone, Ancient, Medieval, Modern, Future)
const ERA_PALETTE = [
    { sky: 0x2a2018, ground: 0x57534e, base: 0x78716c, tower: 0xa8a29e, accent: 0xd97706, fog: 0x241a12 },
    { sky: 0x0b132b, ground: 0x6b7280, base: 0xd97706, tower: 0xf59e0b, accent: 0xfbbf24, fog: 0x0b1020 },
    { sky: 0x08251c, ground: 0x1f7a3d, base: 0x64748b, tower: 0x94a3b8, accent: 0xcbd5e1, fog: 0x06231a },
    { sky: 0x111827, ground: 0x5a3210, base: 0x3f3f46, tower: 0x52525b, accent: 0x84cc16, fog: 0x0d1420 },
    { sky: 0x0a1030, ground: 0x111a33, base: 0x0284c7, tower: 0x38bdf8, accent: 0x22d3ee, fog: 0x070a1e },
];
const TEAM = {
    player: { main: 0x2563eb, accent: 0x60a5fa, hp: 0x10b981, dark: 0x1e3a8a },
    enemy: { main: 0xdc2626, accent: 0xf87171, hp: 0xef4444, dark: 0x7f1d1d },
};

const UP = S; // convenience

export function createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a12, 95, 260);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 500);
    camera.position.set(0, 62, 48);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minPolarAngle = 0.49;   // ~28deg
    controls.maxPolarAngle = 1.08;   // ~62deg
    controls.minAzimuthAngle = -Math.PI / 5;
    controls.maxAzimuthAngle = Math.PI / 5;
    controls.minDistance = 40;
    controls.maxDistance = 135;
    controls.target.set(0, 0, 0);
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };

    // ---- Lights ----
    const key = new THREE.DirectionalLight(0xfff2d6, 1.35);
    key.position.set(-40, 74, 34);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -62; sc.right = 62; sc.top = 42; sc.bottom = -42; sc.near = 10; sc.far = 190;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.6;
    scene.add(key);
    const hemi = new THREE.HemisphereLight(0x9fb8ff, 0x33291f, 0.55);
    scene.add(hemi);
    const amb = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(amb);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.35);
    rim.position.set(24, 26, -42);
    scene.add(rim);

    // ---- Geometry / material caches ----
    const geoCache = new Map();
    const geo = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };
    const matCache = new Map();
    const mat = (key, make) => { let m = matCache.get(key); if (!m) { m = make(); matCache.set(key, m); } return m; };
    const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: opts.rough ?? 0.72, metalness: opts.metal ?? 0.1, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1, transparent: opts.transparent || false, opacity: opts.opacity ?? 1 });

    // ---- Ground + lanes ----
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(150, 66),
        new THREE.MeshStandardMaterial({ color: ERA_PALETTE[0].ground, roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const laneGroup = new THREE.Group();
    scene.add(laneGroup);
    const laneRibbons = [];
    const laneBarriers = [];
    for (let i = 0; i < 3; i++) {
        const z = laneZ3(i);
        const ribbon = new THREE.Mesh(
            new THREE.PlaneGeometry(90, 7.5),
            new THREE.MeshStandardMaterial({ color: 0x6b6152, roughness: 0.9, metalness: 0.05 })
        );
        ribbon.rotation.x = -Math.PI / 2;
        ribbon.position.set(0, 0.02, z);
        ribbon.receiveShadow = true;
        laneGroup.add(ribbon);
        laneRibbons.push(ribbon);
        // translucent barrier for locked lanes (hidden until sync says locked)
        const barrier = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 5, 7.5),
            std(0x94a3b8, { emissive: 0x475569, ei: 0.5, transparent: true, opacity: 0.32 })
        );
        barrier.position.set(0, 2.5, z);
        barrier.visible = false;
        laneGroup.add(barrier);
        laneBarriers.push(barrier);
    }
    // Midline strip
    const midline = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 62),
        std(0xf8fafc, { emissive: 0x64748b, ei: 0.4, transparent: true, opacity: 0.25 })
    );
    midline.rotation.x = -Math.PI / 2;
    midline.position.set(0, 0.05, 0);
    scene.add(midline);

    // ---- Entity containers ----
    const unitLayer = new THREE.Group(); scene.add(unitLayer);
    const projLayer = new THREE.Group(); scene.add(projLayer);
    const fxLayer = new THREE.Group(); scene.add(fxLayer);
    const baseLayer = new THREE.Group(); scene.add(baseLayer);

    const unitViews = new Map();   // id -> view
    const projPool = [];
    const fxParts = [];            // burst particles
    const textPool = [];           // floating text sprites
    let curPlayerEra = 0, curEnemyEra = 0;

    // ======================================================================
    // MESH FACTORIES
    // ======================================================================

    function hpBarSprite() {
        const cvs = document.createElement('canvas'); cvs.width = 64; cvs.height = 10;
        const tex = new THREE.CanvasTexture(cvs);
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
        spr.scale.set(3.4, 0.5, 1);
        spr.userData = { cvs, tex, ctx: cvs.getContext('2d') };
        return spr;
    }
    function drawHp(spr, ratio, teamKey) {
        const { cvs, ctx, tex } = spr.userData;
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, cvs.width, cvs.height);
        ctx.fillStyle = teamKey === 'player' ? '#10b981' : '#ef4444';
        ctx.fillRect(1, 1, (cvs.width - 2) * Math.max(0, ratio), cvs.height - 2);
        tex.needsUpdate = true;
    }

    // Build a unit as a Group; parts kept in userData for animation.
    function buildUnit(era, ti, teamKey) {
        const tc = TEAM[teamKey];
        const ep = ERA_PALETTE[era];
        const g = new THREE.Group();
        const parts = {};
        const bodyMat = mat(`body_${teamKey}`, () => std(tc.main, { rough: 0.6, metal: era >= 3 ? 0.55 : 0.15 }));
        const accMat = mat(`acc_${teamKey}`, () => std(tc.accent, { rough: 0.5 }));
        const eraMat = mat(`era_${era}`, () => std(ep.accent, { rough: 0.5, metal: era >= 3 ? 0.6 : 0.2, emissive: era === 4 ? ep.accent : 0x000000, ei: era === 4 ? 0.5 : 1 }));
        const skinMat = mat('skin', () => std(0xd8a066, { rough: 0.7 }));
        const darkMat = mat(`dark_${teamKey}`, () => std(tc.dark, { rough: 0.7 }));

        if (era === 4 && ti === 1) {
            // Future Drone — hovering orb, no legs
            const orb = new THREE.Mesh(geo('orb', () => new THREE.IcosahedronGeometry(1, 0)), bodyMat);
            orb.scale.set(1.1, 0.9, 1.1); orb.castShadow = true; g.add(orb); parts.body = orb;
            const eye = new THREE.Mesh(geo('eye', () => new THREE.SphereGeometry(0.35, 8, 8)), mat('drone_eye', () => std(0x22d3ee, { emissive: 0x22d3ee, ei: 1.6, rough: 0.3 })));
            eye.position.set(0.7, 0, 0); g.add(eye); parts.weapon = eye;
            parts.hover = true;
            g.position.y = 2.4;
        } else if (ti === 2) {
            // Heavy — wide chunky body on a base/tracks
            const hull = new THREE.Mesh(geo('hull', () => new THREE.BoxGeometry(2.6, 1.5, 1.9)), bodyMat);
            hull.position.y = 1.4; hull.castShadow = true; g.add(hull); parts.body = hull;
            const head = new THREE.Mesh(geo('hhead', () => new THREE.BoxGeometry(1.1, 1.0, 1.1)), darkMat);
            head.position.set(-0.3, 2.4, 0); head.castShadow = true; g.add(head);
            const cannon = new THREE.Mesh(geo('cannon', () => new THREE.CylinderGeometry(0.22, 0.28, 2.4, 8)), eraMat);
            cannon.rotation.z = Math.PI / 2; cannon.position.set(1.4, 2.2, 0); g.add(cannon); parts.weapon = cannon;
            const trackGeo = geo('track', () => new THREE.BoxGeometry(2.8, 0.6, 0.6));
            const tm = darkMat;
            const t1 = new THREE.Mesh(trackGeo, tm); t1.position.set(0, 0.4, 0.9); g.add(t1);
            const t2 = new THREE.Mesh(trackGeo, tm); t2.position.set(0, 0.4, -0.9); g.add(t2);
            parts.legL = t1; parts.legR = t2;
        } else {
            // Humanoid (light melee ti=0, ranged ti=1)
            const torso = new THREE.Mesh(geo('torso', () => new THREE.BoxGeometry(1.0, 1.15, 0.7)), bodyMat);
            torso.position.y = 1.55; torso.castShadow = true; g.add(torso); parts.body = torso;
            const head = new THREE.Mesh(geo('uhead', () => new THREE.SphereGeometry(0.42, 10, 8)), skinMat);
            head.position.y = 2.45; head.castShadow = true; g.add(head);
            const helm = new THREE.Mesh(geo('helm', () => new THREE.SphereGeometry(0.46, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), eraMat);
            helm.position.y = 2.55; g.add(helm);
            const legGeo = geo('leg', () => new THREE.BoxGeometry(0.34, 1.0, 0.34));
            const legL = new THREE.Mesh(legGeo, darkMat); legL.position.set(0.26, 0.55, 0); legL.castShadow = true; g.add(legL); parts.legL = legL;
            const legR = new THREE.Mesh(legGeo, darkMat); legR.position.set(-0.26, 0.55, 0); legR.castShadow = true; g.add(legR); parts.legR = legR;
            // Weapon prop
            let weapon;
            if (ti === 1) {
                // ranged: forward rod (bow/gun/laser)
                weapon = new THREE.Mesh(geo('rod', () => new THREE.CylinderGeometry(0.1, 0.1, 1.5, 6)), eraMat);
                weapon.rotation.z = Math.PI / 2; weapon.position.set(0.9, 1.7, 0.2);
            } else {
                // melee: club/sword
                weapon = new THREE.Mesh(geo('blade', () => new THREE.BoxGeometry(0.18, 1.5, 0.18)), eraMat);
                weapon.position.set(0.75, 2.0, 0.1); weapon.rotation.z = -0.5;
            }
            weapon.castShadow = true; g.add(weapon); parts.weapon = weapon;
        }

        const hp = hpBarSprite(); hp.position.y = (ti === 2 ? 3.6 : 3.4); g.add(hp); parts.hp = hp;
        g.userData = { parts, era, ti, teamKey, animOff: Math.random() * 6.28 };
        return g;
    }

    function acquireUnitView(u, teamKey) {
        const g = buildUnit(u.era, u.typeIndex, teamKey);
        unitLayer.add(g);
        const view = { group: g, era: u.era, ti: u.typeIndex, teamKey, rx: 0, rz: 0, inited: false };
        unitViews.set(u.id, view);
        return view;
    }

    // ---- Base ----
    const baseViews = { player: null, enemy: null };
    function buildBase(era, teamKey) {
        const ep = ERA_PALETTE[era]; const tc = TEAM[teamKey];
        const g = new THREE.Group();
        const baseMat = std(ep.base, { rough: 0.8, metal: era >= 3 ? 0.4 : 0.1 });
        const accMat = std(tc.main, { rough: 0.5, emissive: tc.main, ei: 0.15 });
        if (era === 0) {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(6, 0), baseMat); rock.position.y = 4; rock.scale.set(1.2, 1, 1.4); g.add(rock);
            const r2 = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5, 0), baseMat); r2.position.set(3, 2.5, 4); g.add(r2);
        } else if (era === 1) {
            const body = new THREE.Mesh(new THREE.BoxGeometry(10, 9, 16), baseMat); body.position.y = 4.5; g.add(body);
            const roof = new THREE.Mesh(new THREE.ConeGeometry(8.5, 4, 4), std(ep.accent, { rough: 0.7 })); roof.position.y = 11; roof.rotation.y = Math.PI / 4; g.add(roof);
        } else if (era === 2) {
            const keep = new THREE.Mesh(new THREE.BoxGeometry(11, 12, 18), baseMat); keep.position.y = 6; g.add(keep);
            for (let i = -1; i <= 1; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), baseMat); c.position.set(0, 13, i * 6); g.add(c); }
        } else if (era === 3) {
            const bunker = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 18), baseMat); bunker.position.y = 4; g.add(bunker);
            const slit = new THREE.Mesh(new THREE.BoxGeometry(1, 1.6, 10), std(0x0b0b0b)); slit.position.set((teamKey === 'player' ? 6 : -6), 5, 0); g.add(slit);
        } else {
            const dome = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(ep.base, { metal: 0.85, rough: 0.25, emissive: ep.tower, ei: 0.25 })); dome.position.y = 0.5; g.add(dome);
            const spire = new THREE.Mesh(new THREE.ConeGeometry(1.2, 10, 6), std(ep.tower, { emissive: ep.tower, ei: 0.7 })); spire.position.y = 9; g.add(spire);
        }
        // team banner
        const banner = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 3), accMat); banner.position.set((teamKey === 'player' ? 5.5 : -5.5), 14, 0); g.add(banner);
        g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        const hp = hpBarSprite(); hp.scale.set(9, 1.3, 1); hp.position.y = 20; g.add(hp);
        g.userData.hp = hp;
        return g;
    }
    function setBase(teamKey, base, era) {
        let bv = baseViews[teamKey];
        if (!bv || bv.era !== era) {
            if (bv) { baseLayer.remove(bv.group); disposeTree(bv.group); }
            const grp = buildBase(era, teamKey);
            grp.position.set(mapX(base.x), 0, 0);
            grp.rotation.y = teamKey === 'player' ? 0 : Math.PI;
            baseLayer.add(grp);
            bv = baseViews[teamKey] = { group: grp, era, hp: grp.userData.hp };
        }
        drawHp(bv.hp, Math.max(0, base.hp / 2000), teamKey);
    }

    // ---- Towers ----
    const towerViews = []; // {group, key}
    function buildTower(era, teamKey) {
        const ep = ERA_PALETTE[era];
        const g = new THREE.Group();
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, 2.4, 8), std(ep.base, { rough: 0.8 })); ped.position.y = 1.2; ped.castShadow = true; g.add(ped);
        const head = new THREE.Group(); head.position.y = 3;
        const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), std(ep.tower, { metal: era >= 3 ? 0.7 : 0.2, rough: 0.5, emissive: era === 4 ? ep.tower : 0x000000, ei: era === 4 ? 0.6 : 1 })); dome.castShadow = true; head.add(dome);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.2, 8), std(TEAM[teamKey].accent, { emissive: TEAM[teamKey].accent, ei: 0.3 })); barrel.rotation.z = Math.PI / 2; barrel.position.x = 1.1; head.add(barrel);
        g.add(head); g.userData.head = head;
        return g;
    }
    function syncTowers(playerBase, enemyBase, mode) {
        const want = [];
        for (const t of playerBase.towers) want.push({ team: 'player', x: t.x, z: t.z ?? 450, era: curPlayerEra, t });
        for (const t of enemyBase.towers) want.push({ team: 'enemy', x: t.x, z: t.z ?? 450, era: curEnemyEra, t });
        // rebuild pool to match count (towers are few & stateless)
        while (towerViews.length < want.length) {
            const g = new THREE.Group(); towerLayer.add(g); towerViews.push({ group: g, era: -1, team: null });
        }
        while (towerViews.length > want.length) { const v = towerViews.pop(); towerLayer.remove(v.group); disposeTree(v.group); }
        for (let i = 0; i < want.length; i++) {
            const w = want[i]; const v = towerViews[i];
            if (v.era !== w.era || v.team !== w.team) {
                disposeTree(v.group); v.group.clear();
                const built = buildTower(w.era, w.team);
                while (built.children.length) v.group.add(built.children[0]);
                v.group.userData.head = built.userData.head;
                v.era = w.era; v.team = w.team;
            }
            v.group.position.set(mapX(w.x), 0, mapZ(w.z));
        }
    }
    const towerLayer = new THREE.Group(); scene.add(towerLayer);

    // ---- Gates ----
    const gateViews = [];
    function buildGate() {
        const g = new THREE.Group();
        const mtl = std(0x8a5a2b, { rough: 0.8 });
        const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 8), mtl); p1.position.set(0, 3, 3.6); g.add(p1);
        const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6, 8), mtl); p2.position.set(0, 3, -3.6); g.add(p2);
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 8.6), mtl); lintel.position.y = 6; g.add(lintel);
        const bars = new THREE.Group();
        for (let i = -3; i <= 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5.5, 6), std(0x475569, { metal: 0.6, rough: 0.4 })); b.position.set(0, 3, i * 1.05); bars.add(b); }
        g.add(bars); g.userData.bars = bars;
        g.traverse(o => { if (o.isMesh) o.castShadow = true; });
        return g;
    }
    const gateLayer = new THREE.Group(); scene.add(gateLayer);
    // Four lockable gates: player top/bottom, enemy top/bottom
    const GATE_DEFS = [
        { teamKey: 'player', lane: 1, x: PLAYER_BASE_X + 90 },
        { teamKey: 'player', lane: 2, x: PLAYER_BASE_X + 90 },
        { teamKey: 'enemy', lane: 1, x: ENEMY_BASE_X - 90 },
        { teamKey: 'enemy', lane: 2, x: ENEMY_BASE_X - 90 },
    ];
    for (const d of GATE_DEFS) {
        const g = buildGate();
        g.position.set(mapX(d.x), 0, laneZ3(d.lane));
        gateLayer.add(g);
        gateViews.push({ ...d, group: g, open: false });
    }
    function syncGates(laneUnlocked, mode) {
        // In guest mode the sim's laneUnlocked is already mapped to guest space (player=own)
        for (const gv of gateViews) {
            const open = !!laneUnlocked[gv.teamKey][gv.lane === 1 ? 'top' : 'bottom'];
            if (open !== gv.open) {
                gv.open = open;
                gv.group.userData.bars.visible = !open;
                gv.group.visible = true;
            }
            // locked lane barrier visual
        }
        // lane barriers: show if EITHER side locked that lane? show per own side near player.
    }

    // ---- Projectiles ----
    const PROJ_COLORS = { pebble: 0x9ca3af, spear: 0xa8a29e, arrow: 0xd97706, bolt: 0xcbd5e1, firepot: 0xf97316, bullet: 0xfbbf24, grenade: 0x1e3a8a, shell: 0x64748b, plasma: 0x22d3ee };
    function acquireProj() {
        for (const p of projPool) if (!p.active) return p;
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.4 }));
        m.visible = false; projLayer.add(m);
        const p = { mesh: m, active: false }; projPool.push(p); return p;
    }
    function syncProjectiles(list, mirror) {
        let i = 0;
        for (const pr of list) {
            const p = acquireProj(); p.active = true;
            const c = PROJ_COLORS[pr.type] || 0xffffff;
            p.mesh.material.color.setHex(c); p.mesh.material.emissive.setHex(c);
            const wx = mapX(pr.x) * (mirror ? -1 : 1);
            const wz = mapZ(pr.z ?? 450);
            const wy = Math.max(0.4, mapYFromSimY(pr.y));
            p.mesh.position.set(wx, wy, wz);
            const big = pr.type === 'firepot' || pr.type === 'shell' || pr.type === 'grenade';
            p.mesh.scale.setScalar(big ? 1.5 : 1);
            p.mesh.visible = true;
            p._used = true; i++;
        }
        for (const p of projPool) { if (p.active && !p._used) { p.active = false; p.mesh.visible = false; } p._used = false; }
    }

    // ---- Specials (visual overlays) ----
    let laserMesh = null, planeMesh = null;
    function syncSpecials(list, mirror) {
        if (laserMesh) laserMesh.visible = false;
        if (planeMesh) planeMesh.visible = false;
        for (const s of list) {
            if (s.type === 'orbitallaser') {
                if (!laserMesh) {
                    laserMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 40, 12), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.55 }));
                    fxLayer.add(laserMesh);
                }
                laserMesh.visible = true;
                laserMesh.position.set(mapX(s.x ?? s.laserX ?? 900) * (mirror ? -1 : 1), 20, mapZ(s.z ?? 450));
            } else if (s.type === 'airstrike') {
                if (!planeMesh) {
                    planeMesh = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4, 6), std(0x1e3a8a, { emissive: 0x1e3a8a, ei: 0.3 }));
                    planeMesh.rotation.x = Math.PI / 2; fxLayer.add(planeMesh);
                }
                planeMesh.visible = true;
                planeMesh.position.set(mapX(s.x ?? s.airstrikePlaneX ?? 900) * (mirror ? -1 : 1), 16, mapZ(s.z ?? 450));
            }
        }
    }

    // ---- Particles / bursts / floating text ----
    function burst(simX, simZ, color, n, mirror) {
        const wx = mapX(simX) * (mirror ? -1 : 1), wz = mapZ(simZ);
        for (let k = 0; k < n; k++) {
            let part = fxParts.find(p => !p.active);
            if (!part) {
                const m = new THREE.Mesh(geo('spark', () => new THREE.SphereGeometry(0.22, 5, 4)), new THREE.MeshBasicMaterial({ color }));
                fxLayer.add(m); part = { mesh: m, active: false }; fxParts.push(part);
            }
            part.active = true; part.mesh.visible = true; part.mesh.material.color.setHex(color);
            part.mesh.position.set(wx, 1.5, wz);
            part.vx = (Math.random() - 0.5) * 0.6; part.vy = Math.random() * 0.5 + 0.1; part.vz = (Math.random() - 0.5) * 0.6;
            part.life = 1;
        }
    }
    function floatText(simX, simZ, text, color, mirror) {
        const wx = mapX(simX) * (mirror ? -1 : 1), wz = mapZ(simZ);
        let t = textPool.find(p => !p.active);
        if (!t) {
            const cvs = document.createElement('canvas'); cvs.width = 128; cvs.height = 40;
            const tex = new THREE.CanvasTexture(cvs);
            const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
            spr.scale.set(5, 1.6, 1); fxLayer.add(spr);
            t = { spr, cvs, tex, ctx: cvs.getContext('2d'), active: false }; textPool.push(t);
        }
        const { ctx, cvs, tex } = t;
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.font = 'bold 26px Outfit, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(text, 64, 20);
        ctx.fillStyle = color; ctx.fillText(text, 64, 20);
        tex.needsUpdate = true;
        t.active = true; t.spr.visible = true; t.spr.position.set(wx, 4, wz); t.life = 1;
    }
    function stepParticles(dt) {
        const dts = dt / 16.666;
        for (const p of fxParts) {
            if (!p.active) continue;
            p.mesh.position.x += p.vx * dts; p.mesh.position.y += p.vy * dts; p.mesh.position.z += p.vz * dts;
            p.vy -= 0.03 * dts; p.life -= 0.04 * dts;
            p.mesh.scale.setScalar(Math.max(0.01, p.life));
            if (p.life <= 0 || p.mesh.position.y < 0) { p.active = false; p.mesh.visible = false; }
        }
        for (const t of textPool) {
            if (!t.active) continue;
            t.spr.position.y += 0.05 * dts; t.life -= 0.014 * dts;
            t.spr.material.opacity = Math.max(0, t.life);
            if (t.life <= 0) { t.active = false; t.spr.visible = false; }
        }
    }

    // ======================================================================
    // PER-FRAME UNIT SYNC
    // ======================================================================
    const clock = new THREE.Clock();
    function syncUnits(list, mirror) {
        const seen = new Set();
        const time = clock.elapsedTime;
        for (const u of list) {
            seen.add(u.id);
            let v = unitViews.get(u.id);
            const teamKey = u.team; // already guest-space team
            if (!v) { v = acquireUnitView(u, teamKey); }
            if (v.era !== u.era || v.ti !== u.typeIndex || v.teamKey !== teamKey) {
                // evolved / retemplated
                unitLayer.remove(v.group); disposeTree(v.group);
                v = acquireUnitView(u, teamKey);
            }
            const g = v.group;
            const tx = mapX(u.x) * (mirror ? -1 : 1);
            const tz = mapZ(u.z ?? 450);
            if (!v.inited) { g.position.x = tx; g.position.z = tz; v.inited = true; }
            else { g.position.x += (tx - g.position.x) * 0.35; g.position.z += (tz - g.position.z) * 0.35; }
            const facing = (mirror ? -u.facing : u.facing);
            const faceRight = facing > 0;
            g.rotation.y = faceRight ? 0 : Math.PI;

            animateUnit(v, u, time + g.userData.animOff);
        }
        for (const [id, v] of unitViews) {
            if (!seen.has(id)) { unitLayer.remove(v.group); disposeTree(v.group); unitViews.delete(id); }
        }
    }

    function animateUnit(v, u, t) {
        const p = v.group.userData.parts;
        const hpRatio = Math.max(0, u.hp / u.maxHp);
        if (p.hp) drawHp(p.hp, hpRatio, v.teamKey);
        if (u.state === 'die') {
            const dp = u.deathProgress || 0;
            v.group.rotation.z = (u.facing > 0 ? 1 : -1) * Math.PI / 2 * dp;
            v.group.position.y = -0.6 * dp * (p.hover ? 4 : 1);
            v.group.traverse(o => { if (o.isMesh && o.material) { o.material.transparent = true; o.material.opacity = Math.max(0, 1 - dp); } });
            return;
        }
        const walking = u.state === 'walk' && !u.isBlocked;
        const rate = 8 * (u.speed || 1);
        const ph = t * rate;
        if (p.hover) {
            v.group.position.y = 2.4 + Math.sin(t * 1.6) * 0.22;
        } else {
            if (p.body) p.body.position.y = (v.ti === 2 ? 1.4 : 1.55) + (walking ? Math.abs(Math.sin(ph)) * 0.12 : 0);
            if (p.legL && p.legR && v.ti !== 2) {
                const s = walking ? Math.sin(ph) * 0.5 : 0;
                p.legL.rotation.x = s; p.legR.rotation.x = -s;
            }
        }
        // attack lunge + weapon
        if (u.state === 'attack' && p.weapon) {
            const swing = Math.sin(t * 14);
            if (v.ti === 2 || v.ti === 1) p.weapon.position.x = (v.ti === 2 ? 1.4 : 0.9) + swing * 0.2;
            else p.weapon.rotation.z = -0.5 + swing * 0.8;
        } else if (p.weapon && v.ti === 0) {
            p.weapon.rotation.z = -0.5;
        }
    }

    // ======================================================================
    // ERA AMBIANCE
    // ======================================================================
    function setEra(playerEra, enemyEra) {
        if (playerEra === curPlayerEra && enemyEra === curEnemyEra) return;
        curPlayerEra = playerEra; curEnemyEra = enemyEra;
        const ep = ERA_PALETTE[playerEra];
        ground.material.color.setHex(ep.ground);
        scene.fog.color.setHex(ep.fog);
        renderer.setClearColor(ep.sky, 1);
        hemi.groundColor.setHex(ep.ground);
    }

    // ======================================================================
    // RAYCASTING
    // ======================================================================
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    function setNdc(clientX, clientY) {
        const r = renderer.domElement.getBoundingClientRect();
        ndc.x = ((clientX - r.left) / r.width) * 2 - 1;
        ndc.y = -((clientY - r.top) / r.height) * 2 + 1;
    }
    function raycastGround(clientX, clientY) {
        setNdc(clientX, clientY); raycaster.setFromCamera(ndc, camera);
        const pt = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(groundPlane, pt)) return pt; // three-space
        return null;
    }
    function raycastUnits(clientX, clientY) {
        setNdc(clientX, clientY); raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(unitLayer.children, true);
        if (!hits.length) return null;
        let obj = hits[0].object;
        while (obj && obj.parent !== unitLayer) obj = obj.parent;
        if (!obj) return null;
        for (const [id, v] of unitViews) if (v.group === obj) return id;
        return null;
    }
    // Project a three-space point to screen coords (for tooltips)
    function projectToScreen(v3) {
        const p = v3.clone().project(camera);
        const r = renderer.domElement.getBoundingClientRect();
        return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height };
    }

    function resize() {
        const w = canvas.clientWidth || canvas.parentElement.clientWidth;
        const h = canvas.clientHeight || canvas.parentElement.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
    }

    function render(dt) {
        clock.getDelta();
        controls.update();
        // clamp target
        controls.target.x = Math.max(-40, Math.min(40, controls.target.x));
        controls.target.z = Math.max(-10, Math.min(10, controls.target.z));
        renderer.render(scene, camera);
    }

    function disposeTree(root) {
        root.traverse(o => {
            if (o.isMesh || o.isSprite) {
                if (o.geometry && !geoCacheHas(o.geometry)) o.geometry.dispose?.();
            }
        });
    }
    function geoCacheHas(g) { for (const v of geoCache.values()) if (v === g) return true; return false; }

    function dispose() {
        for (const [, v] of unitViews) { unitLayer.remove(v.group); }
        unitViews.clear();
    }

    resize();
    setEra(0, 0);

    return {
        scene, camera, controls, renderer,
        syncUnits, syncProjectiles, syncSpecials,
        syncBasesTowers(playerBase, enemyBase, mode) { setBase('player', playerBase, curPlayerEra); setBase('enemy', enemyBase, curEnemyEra); syncTowers(playerBase, enemyBase, mode); },
        syncGates, stepParticles, setEra, resize, dispose,
        raycastGround, raycastUnits, projectToScreen, render,
        burst, floatText,
        laneOfHit(pt) {
            // pt is three-space; find nearest lane by z
            let best = 0, bd = Infinity;
            for (let i = 0; i < 3; i++) { const d = Math.abs(pt.z - laneZ3(i)); if (d < bd) { bd = d; best = i; } }
            return { laneIdx: best, dist: bd };
        },
    };
}
