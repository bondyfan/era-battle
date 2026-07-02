// ==========================================================================
// Era Battle - top-down 3D renderer (three.js).
// DOTA-STYLE DIAGONAL MAP: square field, player base in one corner, enemy in
// the opposite corner. MID lane is a straight diagonal, TOP/BOTTOM are curved
// bezier paths (see world.js). Pure reflection of the sim state: script.js owns
// all game logic and calls the sync*/render functions each frame. No external
// model assets: every mesh is procedural low-poly geometry so the game ships as
// static files.
// ==========================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    mapX, mapZ, mapYFromSimY, S,
    MAP_SIZE, CORNER3,
    LANE_BY_IDX, LANE_IDX,
    laneLength, posAt, laneSamples,
} from './world.js';

// Palette mirrors ERA_DATA (Stone, Ancient, Medieval, Modern, Future)
const ERA_PALETTE = [
    { sky: 0x2a2018, ground: 0x4f6b3a, ground2: 0x5f7d47, base: 0x78716c, tower: 0xa8a29e, accent: 0xd97706, fog: 0x241a12 },
    { sky: 0x0b132b, ground: 0x4a6a42, ground2: 0x5c7f52, base: 0xd97706, tower: 0xf59e0b, accent: 0xfbbf24, fog: 0x0b1020 },
    { sky: 0x08251c, ground: 0x2f7a3d, ground2: 0x3d9350, base: 0x64748b, tower: 0x94a3b8, accent: 0xcbd5e1, fog: 0x06231a },
    { sky: 0x111827, ground: 0x54633a, ground2: 0x67784a, base: 0x3f3f46, tower: 0x52525b, accent: 0x84cc16, fog: 0x0d1420 },
    { sky: 0x0a1030, ground: 0x1b2b40, ground2: 0x243a56, base: 0x0284c7, tower: 0x38bdf8, accent: 0x22d3ee, fog: 0x070a1e },
];
const TEAM = {
    player: { main: 0x2563eb, accent: 0x60a5fa, hp: 0x10b981, dark: 0x1e3a8a },
    enemy: { main: 0xdc2626, accent: 0xf87171, hp: 0xef4444, dark: 0x7f1d1d },
};

// Three-space span of the square map (MAP_SIZE sim units -> three units).
const FIELD = MAP_SIZE * S;              // ~100 three units across
const HALF = FIELD / 2;                  // ~50

// Small seeded PRNG so scatter (trees/rocks/grass) is deterministic per run.
function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

export function createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a12, 120, 320);

    const camera = new THREE.PerspectiveCamera(44, 1, 0.5, 900);
    // Framed diagonally: look down the mid diagonal toward center, both corners visible.
    camera.position.set(-92, 96, 92);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minPolarAngle = 0.42;   // ~24deg
    controls.maxPolarAngle = 1.18;   // ~68deg
    controls.minDistance = 55;
    controls.maxDistance = 230;
    controls.target.set(0, 0, 0);
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };

    // ---- Lights ----
    const key = new THREE.DirectionalLight(0xfff2d6, 1.35);
    key.position.set(-70, 120, 50);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 10; sc.far = 320;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.6;
    scene.add(key);
    const hemi = new THREE.HemisphereLight(0x9fb8ff, 0x33291f, 0.55);
    scene.add(hemi);
    const amb = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(amb);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.35);
    rim.position.set(40, 40, -70);
    scene.add(rim);

    // ---- Geometry / material caches ----
    const geoCache = new Map();
    const geo = (k, make) => { let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; };
    const matCache = new Map();
    const mat = (k, make) => { let m = matCache.get(k); if (!m) { m = make(); matCache.set(k, m); } return m; };
    const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: opts.rough ?? 0.72, metalness: opts.metal ?? 0.1, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1, transparent: opts.transparent || false, opacity: opts.opacity ?? 1 });

    // ======================================================================
    // GROUND (square) with grass canvas texture + subtle topography mounds
    // ======================================================================
    function makeGrassTexture() {
        const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 512;
        const ctx = cvs.getContext('2d');
        // base gradient
        ctx.fillStyle = '#3f6b34'; ctx.fillRect(0, 0, 512, 512);
        const rng = makeRng(1337);
        // patches
        for (let i = 0; i < 260; i++) {
            const x = rng() * 512, y = rng() * 512, r = 8 + rng() * 40;
            const g = 70 + Math.floor(rng() * 70);
            ctx.fillStyle = `rgba(${30 + Math.floor(rng() * 30)},${g},${30 + Math.floor(rng() * 30)},0.35)`;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
        // speckle / tufts
        for (let i = 0; i < 2600; i++) {
            const x = rng() * 512, y = rng() * 512;
            const shade = rng();
            ctx.fillStyle = shade > 0.5
                ? `rgba(${120 + Math.floor(rng() * 90)},${150 + Math.floor(rng() * 80)},${60},0.5)`
                : `rgba(${20},${50 + Math.floor(rng() * 40)},${20},0.5)`;
            ctx.fillRect(x, y, 1 + rng() * 2, 1 + rng() * 3);
        }
        const tex = new THREE.CanvasTexture(cvs);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(6, 6);
        tex.anisotropy = 4;
        return tex;
    }
    const grassTex = makeGrassTexture();
    const groundMat = new THREE.MeshStandardMaterial({ color: ERA_PALETTE[0].ground, map: grassTex, roughness: 0.98, metalness: 0 });

    // Displaced plane for gentle topography.
    const groundGeo = new THREE.PlaneGeometry(FIELD * 2.4, FIELD * 2.4, 64, 64);
    {
        const rng = makeRng(90210);
        const pos = groundGeo.attributes.position;
        // a few smooth mound centers, avoid the play field so lanes stay flat
        const mounds = [];
        for (let i = 0; i < 26; i++) {
            const ang = rng() * Math.PI * 2;
            const rad = HALF * (1.15 + rng() * 1.0);
            mounds.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, h: 2 + rng() * 6, s: 14 + rng() * 22 });
        }
        for (let i = 0; i < pos.count; i++) {
            const px = pos.getX(i), py = pos.getY(i);
            let z = 0;
            for (const m of mounds) {
                const d2 = (px - m.x) * (px - m.x) + (py - m.y) * (py - m.y);
                z += m.h * Math.exp(-d2 / (m.s * m.s));
            }
            // dampen displacement inside the play area so units/lanes sit flat
            const inField = Math.max(Math.abs(px), Math.abs(py));
            const damp = inField < HALF * 1.05 ? Math.max(0, (inField - HALF * 0.7) / (HALF * 0.35)) : 1;
            pos.setZ(i, z * Math.min(1, damp));
        }
        groundGeo.computeVertexNormals();
    }
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ======================================================================
    // LANES: ribbons that follow the curved lane paths (world.laneSamples)
    // ======================================================================
    // Precompute each lane's three-space polyline (used for ribbons + laneOfHit).
    const laneThreePts = [];   // laneIdx -> [THREE.Vector3,...]
    for (let i = 0; i < 3; i++) {
        const name = LANE_BY_IDX[i];
        const pts = laneSamples(name, 72).map(p => new THREE.Vector3(mapX(p.x), 0.03, mapZ(p.z)));
        laneThreePts.push(pts);
    }

    const laneGroup = new THREE.Group();
    scene.add(laneGroup);
    const laneRibbons = []; // laneIdx -> mesh
    function buildLaneRibbon(pts, width) {
        // Build a flat ribbon polygon along the polyline (two rows of verts).
        const half = width / 2;
        const positions = [];
        const uvs = [];
        const indices = [];
        const up = new THREE.Vector3(0, 1, 0);
        const n = pts.length;
        for (let i = 0; i < n; i++) {
            const cur = pts[i];
            const prev = pts[Math.max(0, i - 1)];
            const nxt = pts[Math.min(n - 1, i + 1)];
            const dir = new THREE.Vector3().subVectors(nxt, prev);
            dir.y = 0;
            if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
            dir.normalize();
            const side = new THREE.Vector3().crossVectors(up, dir).normalize();
            const l = new THREE.Vector3().copy(cur).addScaledVector(side, half);
            const r = new THREE.Vector3().copy(cur).addScaledVector(side, -half);
            positions.push(l.x, l.y, l.z, r.x, r.y, r.z);
            const v = i / (n - 1);
            uvs.push(0, v, 1, v);
        }
        for (let i = 0; i < n - 1; i++) {
            const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
            indices.push(a, b, c, b, d, c);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        g.setIndex(indices);
        g.computeVertexNormals();
        return g;
    }
    // dirt path texture (subtle)
    function makeDirtTexture() {
        const cvs = document.createElement('canvas'); cvs.width = 128; cvs.height = 128;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#6b5636'; ctx.fillRect(0, 0, 128, 128);
        const rng = makeRng(55);
        for (let i = 0; i < 700; i++) {
            const x = rng() * 128, y = rng() * 128;
            const d = rng();
            ctx.fillStyle = d > 0.5 ? `rgba(90,72,45,0.6)` : `rgba(50,40,26,0.5)`;
            ctx.fillRect(x, y, 1 + rng() * 2, 1 + rng() * 2);
        }
        const t = new THREE.CanvasTexture(cvs);
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 12);
        return t;
    }
    const dirtTex = makeDirtTexture();
    for (let i = 0; i < 3; i++) {
        const width = i === 0 ? 6.5 : 5.6; // mid a bit wider
        const g = buildLaneRibbon(laneThreePts[i], width);
        const m = new THREE.MeshStandardMaterial({ color: 0x6b5636, map: dirtTex, roughness: 0.95, metalness: 0.03 });
        const ribbon = new THREE.Mesh(g, m);
        ribbon.receiveShadow = true;
        ribbon.userData.baseColor = 0x6b5636;
        laneGroup.add(ribbon);
        laneRibbons.push(ribbon);
    }
    // Faint diagonal center line (mid lane), just decorative.
    {
        const g = buildLaneRibbon(laneThreePts[0].map(p => new THREE.Vector3(p.x, 0.06, p.z)), 0.5);
        const m = std(0xf8fafc, { emissive: 0x64748b, ei: 0.4, transparent: true, opacity: 0.18 });
        const line = new THREE.Mesh(g, m);
        laneGroup.add(line);
    }

    // ======================================================================
    // TREES / ROCKS / BUSHES scatter (deterministic, off lanes & bases)
    // ======================================================================
    const propLayer = new THREE.Group(); scene.add(propLayer);
    // shared prop geometries & materials
    const trunkGeo = geo('trunk', () => new THREE.CylinderGeometry(0.28, 0.42, 2.6, 6));
    const canopyGeoA = geo('canopyA', () => new THREE.ConeGeometry(1.8, 3.4, 7));
    const canopyGeoB = geo('canopyB', () => new THREE.ConeGeometry(1.3, 2.4, 7));
    const canopyGeoC = geo('canopyC', () => new THREE.IcosahedronGeometry(1.7, 0));
    const rockGeo = geo('rock', () => new THREE.DodecahedronGeometry(1, 0));
    const bushGeo = geo('bush', () => new THREE.IcosahedronGeometry(1.1, 0));
    const trunkMat = mat('trunkMat', () => std(0x5b3d24, { rough: 0.9 }));
    const leafMatA = mat('leafA', () => std(0x2f6b34, { rough: 0.85 }));
    const leafMatB = mat('leafB', () => std(0x3d8a44, { rough: 0.85 }));
    const rockMat = mat('rockMat', () => std(0x7c7c82, { rough: 0.95 }));
    const bushMat = mat('bushMat', () => std(0x356b3a, { rough: 0.88 }));

    // distance from a point (three-space x,z) to nearest lane sample
    function distToLanes(x, z) {
        let best = Infinity;
        for (let i = 0; i < 3; i++) {
            const pts = laneThreePts[i];
            for (let j = 0; j < pts.length; j++) {
                const dx = pts[j].x - x, dz = pts[j].z - z;
                const d = dx * dx + dz * dz;
                if (d < best) best = d;
            }
        }
        return Math.sqrt(best);
    }
    function distToCorner(x, z, c) { const dx = c.x - x, dz = c.z - z; return Math.hypot(dx, dz); }

    function makeTree(rng) {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 1.3; trunk.castShadow = true; g.add(trunk);
        const style = rng();
        const leafMat = rng() > 0.5 ? leafMatA : leafMatB;
        if (style > 0.66) {
            // conifer: stacked cones
            const c1 = new THREE.Mesh(canopyGeoA, leafMat); c1.position.y = 3.4; c1.castShadow = true; g.add(c1);
            const c2 = new THREE.Mesh(canopyGeoB, leafMat); c2.position.y = 4.8; c2.castShadow = true; g.add(c2);
        } else if (style > 0.33) {
            // round tree
            const c = new THREE.Mesh(canopyGeoC, leafMat); c.position.y = 3.6; c.scale.set(1.1, 1.2, 1.1); c.castShadow = true; g.add(c);
        } else {
            // bushy: two blobs
            const c = new THREE.Mesh(canopyGeoC, leafMat); c.position.y = 3.3; c.castShadow = true; g.add(c);
            const c2 = new THREE.Mesh(canopyGeoC, leafMat); c2.position.set(0.6, 4.1, 0.3); c2.scale.setScalar(0.7); c2.castShadow = true; g.add(c2);
        }
        return g;
    }
    (function scatterProps() {
        const rng = makeRng(4242);
        const pCorner = { x: CORNER3.player.x, z: CORNER3.player.z };
        const eCorner = { x: CORNER3.enemy.x, z: CORNER3.enemy.z };
        let placed = 0, tries = 0;
        const MAX = 120;
        while (placed < MAX && tries < MAX * 20) {
            tries++;
            // scatter across a region a bit larger than the field
            const x = (rng() * 2 - 1) * (HALF * 1.28);
            const z = (rng() * 2 - 1) * (HALF * 1.28);
            // keep clear of lanes and bases
            if (distToLanes(x, z) < 5.5) continue;
            if (distToCorner(x, z, pCorner) < 12) continue;
            if (distToCorner(x, z, eCorner) < 12) continue;
            const roll = rng();
            let node;
            if (roll > 0.42) {
                node = makeTree(rng);
                const s = 0.8 + rng() * 0.8;
                node.scale.setScalar(s);
            } else if (roll > 0.2) {
                node = new THREE.Mesh(rockGeo, rockMat);
                node.scale.set(0.6 + rng() * 1.2, 0.5 + rng() * 0.9, 0.6 + rng() * 1.2);
                node.position.y = node.scale.y * 0.5;
                node.rotation.set(rng() * 3, rng() * 3, rng() * 3);
                node.castShadow = true; node.receiveShadow = true;
            } else {
                node = new THREE.Mesh(bushGeo, bushMat);
                const s = 0.7 + rng() * 0.9;
                node.scale.set(s * 1.2, s * 0.8, s * 1.2);
                node.position.y = s * 0.5;
                node.castShadow = true;
            }
            node.position.x = x; node.position.z = z;
            node.rotation.y = rng() * Math.PI * 2;
            propLayer.add(node);
            placed++;
        }
    })();

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
    // NOTE: uses only cached geometries/materials so buildUnit is cheap; reused
    // by the thumbnail renderer too.
    function buildUnit(era, ti, teamKey) {
        const tc = TEAM[teamKey];
        const ep = ERA_PALETTE[era];
        const g = new THREE.Group();
        const parts = {};
        const bodyMat = mat(`body_${teamKey}`, () => std(tc.main, { rough: 0.6, metal: era >= 3 ? 0.55 : 0.15 }));
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
            const t1 = new THREE.Mesh(trackGeo, darkMat); t1.position.set(0, 0.4, 0.9); g.add(t1);
            const t2 = new THREE.Mesh(trackGeo, darkMat); t2.position.set(0, 0.4, -0.9); g.add(t2);
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
                weapon = new THREE.Mesh(geo('rod', () => new THREE.CylinderGeometry(0.1, 0.1, 1.5, 6)), eraMat);
                weapon.rotation.z = Math.PI / 2; weapon.position.set(0.9, 1.7, 0.2);
            } else {
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
            const slit = new THREE.Mesh(new THREE.BoxGeometry(1, 1.6, 10), std(0x0b0b0b)); slit.position.set(6, 5, 0); g.add(slit);
        } else {
            const dome = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(ep.base, { metal: 0.85, rough: 0.25, emissive: ep.tower, ei: 0.25 })); dome.position.y = 0.5; g.add(dome);
            const spire = new THREE.Mesh(new THREE.ConeGeometry(1.2, 10, 6), std(ep.tower, { emissive: ep.tower, ei: 0.7 })); spire.position.y = 9; g.add(spire);
        }
        // team banner (+x side, which after facing-rotation points toward center)
        const banner = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 3), accMat); banner.position.set(5.5, 14, 0); g.add(banner);
        g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        const hp = hpBarSprite(); hp.scale.set(9, 1.3, 1); hp.position.y = 20; g.add(hp);
        g.userData.hp = hp;
        return g;
    }
    // heading (about Y) so a base at `corner` faces map center (origin).
    function faceCenterY(corner) {
        return Math.atan2(-corner.z, -corner.x);
    }
    function setBase(teamKey, base, era) {
        let bv = baseViews[teamKey];
        const corner = teamKey === 'player' ? CORNER3.player : CORNER3.enemy;
        if (!bv || bv.era !== era) {
            if (bv) { baseLayer.remove(bv.group); disposeTree(bv.group); }
            const grp = buildBase(era, teamKey);
            grp.position.set(corner.x, 0, corner.z);
            grp.rotation.y = faceCenterY(corner);
            baseLayer.add(grp);
            bv = baseViews[teamKey] = { group: grp, era, hp: grp.userData.hp };
        }
        drawHp(bv.hp, Math.max(0, base.hp / 2000), teamKey);
    }

    // ---- Towers ----
    const towerLayer = new THREE.Group(); scene.add(towerLayer);
    const towerViews = []; // {group, era, team}
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
        for (const t of playerBase.towers) want.push({ team: 'player', x: t.x, z: t.z, era: curPlayerEra });
        for (const t of enemyBase.towers) want.push({ team: 'enemy', x: t.x, z: t.z, era: curEnemyEra });
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

    // ---- Gates (lockable TOP/BOTTOM lanes) ----
    const gateLayer = new THREE.Group(); scene.add(gateLayer);
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
    // heading so gate faces along the lane tangent (perpendicular gate opening).
    function laneHeadingThree(name, dist) {
        const a = posAt(name, Math.max(0, dist - 8));
        const b = posAt(name, dist + 8);
        return Math.atan2(mapZ(b.z) - mapZ(a.z), mapX(b.x) - mapX(a.x));
    }
    // Four lockable gates: player top/bottom (near player corner), enemy top/bottom (near enemy corner)
    const GATE_DEFS = [
        { teamKey: 'player', laneName: 'top', dist: 220 },
        { teamKey: 'player', laneName: 'bottom', dist: 220 },
        { teamKey: 'enemy', laneName: 'top', end: true },
        { teamKey: 'enemy', laneName: 'bottom', end: true },
    ];
    for (const d of GATE_DEFS) {
        const g = buildGate();
        const dist = d.end ? laneLength(d.laneName) - 220 : d.dist;
        const p = posAt(d.laneName, dist);
        g.position.set(mapX(p.x), 0, mapZ(p.z));
        g.rotation.y = laneHeadingThree(d.laneName, dist);
        gateLayer.add(g);
        gateViews.push({ ...d, group: g, open: null });
    }
    function syncGates(laneUnlocked, mode) {
        for (const gv of gateViews) {
            const open = !!(laneUnlocked?.[gv.teamKey]?.[gv.laneName]);
            if (open !== gv.open) {
                gv.open = open;
                gv.group.userData.bars.visible = !open;
                gv.group.visible = true;
            }
        }
        // Dim the TOP/BOTTOM lane ribbons while neither side has unlocked them.
        for (const laneName of ['top', 'bottom']) {
            const idx = LANE_IDX[laneName];
            const ribbon = laneRibbons[idx];
            if (!ribbon) continue;
            const anyOpen = !!(laneUnlocked?.player?.[laneName] || laneUnlocked?.enemy?.[laneName]);
            ribbon.material.color.setHex(anyOpen ? 0x6b5636 : 0x3a3026);
        }
    }

    // ---- Projectiles ----
    const PROJ_COLORS = { pebble: 0x9ca3af, spear: 0xa8a29e, arrow: 0xd97706, bolt: 0xcbd5e1, firepot: 0xf97316, bullet: 0xfbbf24, grenade: 0x1e3a8a, shell: 0x64748b, plasma: 0x22d3ee };
    function acquireProj() {
        for (const p of projPool) if (!p.active) return p;
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.4 }));
        m.visible = false; projLayer.add(m);
        const p = { mesh: m, active: false }; projPool.push(p); return p;
    }
    function syncProjectiles(list, _mirror) {
        for (const pr of list) {
            const p = acquireProj(); p.active = true;
            const c = PROJ_COLORS[pr.type] || 0xffffff;
            p.mesh.material.color.setHex(c); p.mesh.material.emissive.setHex(c);
            p.mesh.position.set(mapX(pr.x), Math.max(0.4, mapYFromSimY(pr.y)), mapZ(pr.z));
            const big = pr.type === 'firepot' || pr.type === 'shell' || pr.type === 'grenade';
            p.mesh.scale.setScalar(big ? 1.5 : 1);
            p.mesh.visible = true;
            p._used = true;
        }
        for (const p of projPool) { if (p.active && !p._used) { p.active = false; p.mesh.visible = false; } p._used = false; }
    }

    // ---- Specials (visual overlays) ----
    let laserMesh = null, planeMesh = null;
    function syncSpecials(list, _mirror) {
        if (laserMesh) laserMesh.visible = false;
        if (planeMesh) planeMesh.visible = false;
        for (const s of list) {
            if (s.type === 'orbitallaser') {
                if (!laserMesh) {
                    laserMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 40, 12), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.55 }));
                    fxLayer.add(laserMesh);
                }
                laserMesh.visible = true;
                laserMesh.position.set(mapX(s.x), 20, mapZ(s.z));
            } else if (s.type === 'airstrike') {
                if (!planeMesh) {
                    planeMesh = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4, 6), std(0x1e3a8a, { emissive: 0x1e3a8a, ei: 0.3 }));
                    planeMesh.rotation.x = Math.PI / 2; fxLayer.add(planeMesh);
                }
                planeMesh.visible = true;
                planeMesh.position.set(mapX(s.x), 16, mapZ(s.z));
            }
        }
    }

    // ---- Particles / bursts / floating text ----
    function burst(simX, simZ, color, n, _mirror) {
        const wx = mapX(simX), wz = mapZ(simZ);
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
    function floatText(simX, simZ, text, color, _mirror) {
        const wx = mapX(simX), wz = mapZ(simZ);
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
    // TOWER PLACEMENT GHOST (translucent tower + flat range ring)
    // ======================================================================
    let ghostGroup = null, ghostRing = null, ghostTower = null;
    let ghostRingRadius = -1;
    function ensureGhost() {
        if (ghostGroup) return;
        ghostGroup = new THREE.Group();
        // translucent tower silhouette (reuse tower shape roughly)
        ghostTower = new THREE.Group();
        const ghostMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, transparent: true, opacity: 0.4, emissive: 0x22c55e, emissiveIntensity: 0.35, roughness: 0.5, depthWrite: false });
        ghostTower.userData.mat = ghostMat;
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, 2.4, 8), ghostMat); ped.position.y = 1.2; ghostTower.add(ped);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), ghostMat); dome.position.y = 3; ghostTower.add(dome);
        ghostGroup.add(ghostTower);
        // flat range ring on the ground
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
        ghostRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.15, 48), ringMat);
        ghostRing.rotation.x = -Math.PI / 2;
        ghostRing.position.y = 0.08;
        ghostRing.userData.mat = ringMat;
        ghostGroup.add(ghostRing);
        ghostGroup.visible = false;
        scene.add(ghostGroup);
    }
    function showTowerGhost(simX, simZ, rangeSim, valid) {
        ensureGhost();
        ghostGroup.visible = true;
        ghostGroup.position.set(mapX(simX), 0, mapZ(simZ));
        const col = valid ? 0x22c55e : 0xef4444;
        ghostTower.userData.mat.color.setHex(col);
        ghostTower.userData.mat.emissive.setHex(col);
        ghostRing.userData.mat.color.setHex(col);
        // rebuild ring only when radius changes (avoid per-frame geometry churn)
        const rad = Math.max(0.5, rangeSim * S);
        if (Math.abs(rad - ghostRingRadius) > 0.05) {
            ghostRingRadius = rad;
            ghostRing.geometry.dispose();
            const w = Math.max(0.4, rad * 0.03);
            ghostRing.geometry = new THREE.RingGeometry(rad - w, rad, 64);
        }
    }
    function hideTowerGhost() {
        if (ghostGroup) ghostGroup.visible = false;
    }

    // ======================================================================
    // UNIT THUMBNAIL RENDERER (separate offscreen renderer, cached)
    // ======================================================================
    let thumbRenderer = null, thumbScene = null, thumbCam = null, thumbCanvas = null;
    const thumbCache = new Map();
    function ensureThumb() {
        if (thumbRenderer) return;
        thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 128; thumbCanvas.height = 128;
        thumbRenderer = new THREE.WebGLRenderer({ canvas: thumbCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
        thumbRenderer.setPixelRatio(1);
        thumbRenderer.setSize(128, 128, false);
        thumbRenderer.outputColorSpace = THREE.SRGBColorSpace;
        thumbRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        thumbRenderer.setClearColor(0x000000, 0); // transparent
        thumbScene = new THREE.Scene();
        thumbCam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        thumbCam.position.set(5.2, 4.6, 6.4);
        thumbCam.lookAt(0, 1.7, 0);
        const k = new THREE.DirectionalLight(0xffffff, 1.5); k.position.set(4, 8, 6); thumbScene.add(k);
        const f = new THREE.DirectionalLight(0x88aaff, 0.6); f.position.set(-5, 3, -4); thumbScene.add(f);
        thumbScene.add(new THREE.AmbientLight(0xffffff, 0.55));
    }
    function renderUnitThumbnail(era, typeIndex, team) {
        const teamKey = team === 'enemy' ? 'enemy' : 'player';
        const cacheKey = `${era}_${typeIndex}_${teamKey}`;
        if (thumbCache.has(cacheKey)) return thumbCache.get(cacheKey);
        let url;
        try {
            ensureThumb();
            const g = buildUnit(era, typeIndex, teamKey);
            // hide the hp bar sprite in the portrait
            if (g.userData.parts?.hp) g.userData.parts.hp.visible = false;
            // center the unit at origin (drone floats, others stand on 0)
            g.position.set(0, g.userData.parts?.hover ? -0.6 : 0, 0);
            g.rotation.y = -0.5; // 3/4 view
            thumbScene.add(g);
            thumbRenderer.render(thumbScene, thumbCam);
            url = thumbCanvas.toDataURL('image/png');
            thumbScene.remove(g);
            disposeTree(g);
        } catch (e) {
            url = ''; // never throw to caller
        }
        thumbCache.set(cacheKey, url);
        return url;
    }

    // ======================================================================
    // PER-FRAME UNIT SYNC
    // ======================================================================
    const clock = new THREE.Clock();
    function syncUnits(list, _mirror) {
        const seen = new Set();
        const time = clock.elapsedTime;
        for (const u of list) {
            seen.add(u.id);
            let v = unitViews.get(u.id);
            const teamKey = u.team;
            if (!v) { v = acquireUnitView(u, teamKey); }
            if (v.era !== u.era || v.ti !== u.typeIndex || v.teamKey !== teamKey) {
                unitLayer.remove(v.group); disposeTree(v.group);
                v = acquireUnitView(u, teamKey);
            }
            const g = v.group;
            const tx = mapX(u.x);
            const tz = mapZ(u.z);
            if (!v.inited) { g.position.x = tx; g.position.z = tz; v.inited = true; }
            else { g.position.x += (tx - g.position.x) * 0.35; g.position.z += (tz - g.position.z) * 0.35; }
            // heading (radians) from the sim; fall back to facing sign.
            g.rotation.y = (typeof u.heading === 'number') ? u.heading : (u.facing > 0 ? 0 : Math.PI);

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
    function projectToScreen(v3) {
        const p = v3.clone().project(camera);
        const r = renderer.domElement.getBoundingClientRect();
        return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height };
    }
    // Lane whose curved path passes nearest to a three-space point.
    function laneOfHit(pt) {
        let bestIdx = 0, bestDist = Infinity;
        for (let i = 0; i < 3; i++) {
            const pts = laneThreePts[i];
            for (let j = 0; j < pts.length; j++) {
                const dx = pts[j].x - pt.x, dz = pts[j].z - pt.z;
                const d = dx * dx + dz * dz;
                if (d < bestDist) { bestDist = d; bestIdx = i; }
            }
        }
        return { laneIdx: bestIdx, dist: Math.sqrt(bestDist) };
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
        // clamp target inside the field so the player can't pan off the map
        controls.target.x = Math.max(-HALF * 0.9, Math.min(HALF * 0.9, controls.target.x));
        controls.target.z = Math.max(-HALF * 0.9, Math.min(HALF * 0.9, controls.target.z));
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
        if (thumbRenderer) { thumbRenderer.dispose(); thumbRenderer = null; }
        renderer.dispose();
    }

    resize();
    setEra(0, 0);

    return {
        scene, camera, controls, renderer,
        syncUnits, syncProjectiles, syncSpecials,
        syncBasesTowers(playerBase, enemyBase, mode) { setBase('player', playerBase, curPlayerEra); setBase('enemy', enemyBase, curEnemyEra); syncTowers(playerBase, enemyBase, mode); },
        syncGates, stepParticles, setEra, resize, dispose,
        raycastGround, raycastUnits, projectToScreen, render,
        burst, floatText, laneOfHit,
        showTowerGhost, hideTowerGhost, renderUnitThumbnail,
    };
}
