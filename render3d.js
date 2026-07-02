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

    // Corner-to-corner diagonal of the playfield (the thing we must frame).
    const DIAG = Math.hypot(CORNER3.enemy.x - CORNER3.player.x, CORNER3.enemy.z - CORNER3.player.z); // ~114

    const scene = new THREE.Scene();
    // Fog scaled to the field so the far corner reads without hiding the play area.
    scene.fog = new THREE.Fog(0x0a0a12, DIAG * 1.25, DIAG * 3.4);

    const camera = new THREE.PerspectiveCamera(44, 1, 0.5, 1200);
    // Framed diagonally: sit off the anti-diagonal (-x,+z) high up, look at
    // center. Distance is chosen so BOTH base corners fit in view.
    const camDist = DIAG * 1.45;
    camera.position.set(-camDist * 0.6, camDist * 0.68, camDist * 0.6);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minPolarAngle = 0.42;   // ~24deg
    controls.maxPolarAngle = 1.18;   // ~68deg
    controls.minDistance = DIAG * 0.55;   // ~63
    controls.maxDistance = DIAG * 2.6;    // ~296 — pull back to see whole map
    controls.target.set(0, 0, 0);
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };

    // ---- Lights ----
    const key = new THREE.DirectionalLight(0xfff2d6, 1.35);
    key.position.set(-DIAG * 0.6, DIAG * 1.1, DIAG * 0.45);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    // Ortho bounds cover the whole diagonal field (+ a margin for props/bases).
    const shadowExt = DIAG * 0.82;   // ~93
    sc.left = -shadowExt; sc.right = shadowExt; sc.top = shadowExt; sc.bottom = -shadowExt;
    sc.near = 10; sc.far = DIAG * 3.2;
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
        const MAX = 150;   // bigger field => a few more props to fill it
        while (placed < MAX && tries < MAX * 25) {
            tries++;
            // scatter across a region a bit larger than the field
            const x = (rng() * 2 - 1) * (HALF * 1.28);
            const z = (rng() * 2 - 1) * (HALF * 1.28);
            // keep clear of lanes and bases (bases are ~18 wide at the corners)
            if (distToLanes(x, z) < 6) continue;
            if (distToCorner(x, z, pCorner) < 18) continue;
            if (distToCorner(x, z, eCorner) < 18) continue;
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

    // ----------------------------------------------------------------------
    // UNIT MATERIAL PALETTE per era. Each era reads differently:
    //   Stone earthy/wood, Ancient bronze, Medieval steel (metalness),
    //   Modern drab green/gray, Future chrome + emissive. Team color is an
    //   accent only (banner/trim/crest), never the whole body.
    // Materials are cached by (era, teamKey) so buildUnit stays cheap.
    // ----------------------------------------------------------------------
    const ERA_UNIT = [
        // Stone — hide/fur/wood
        { primary: 0x8a6b45, secondary: 0x5b3d24, trim: 0x9a8460, metal: 0.02, rough: 0.95 },
        // Ancient — bronze
        { primary: 0xb87333, secondary: 0x8a5a2b, trim: 0xdca24a, metal: 0.55, rough: 0.5 },
        // Medieval — steel
        { primary: 0x9aa3ad, secondary: 0x5c6773, trim: 0xd7dde3, metal: 0.8, rough: 0.35 },
        // Modern — drab green / gunmetal gray
        { primary: 0x59613a, secondary: 0x3a3f2c, trim: 0x6b7280, metal: 0.35, rough: 0.6 },
        // Future — chrome + emissive
        { primary: 0xc9d3dc, secondary: 0x5b6472, trim: 0x22d3ee, metal: 0.9, rough: 0.2 },
    ];
    function unitMats(era, teamKey) {
        const up = ERA_UNIT[era];
        const tc = TEAM[teamKey];
        return {
            // main structural material of this era
            primary: mat(`u_prim_${era}`, () => std(up.primary, { rough: up.rough, metal: up.metal })),
            // darker structural / straps / legs
            secondary: mat(`u_sec_${era}`, () => std(up.secondary, { rough: Math.min(0.95, up.rough + 0.15), metal: up.metal * 0.7 })),
            // era trim (crest / edge / accents), emissive on Future
            trim: mat(`u_trim_${era}`, () => std(up.trim, { rough: era >= 3 ? 0.3 : 0.45, metal: era >= 2 ? 0.7 : up.metal, emissive: era === 4 ? up.trim : 0x000000, ei: era === 4 ? 0.9 : 1 })),
            // team-tinted accent (banner/plume/shield boss)
            team: mat(`u_team_${teamKey}`, () => std(tc.main, { rough: 0.55, metal: 0.2, emissive: tc.main, ei: 0.12 })),
            // exposed skin
            skin: mat('u_skin', () => std(0xd8a066, { rough: 0.75 })),
            // wood (hafts, chariot, catapult)
            wood: mat('u_wood', () => std(0x6b4a2a, { rough: 0.9 })),
            // dark metal / iron (barrels, blades, tracks)
            iron: mat('u_iron', () => std(0x2f3338, { rough: 0.55, metal: 0.75 })),
            // fur (mammoth)
            fur: mat('u_fur', () => std(0x6b4a30, { rough: 1.0 })),
            // bone / tusk / ivory
            bone: mat('u_bone', () => std(0xe8e2cf, { rough: 0.7 })),
            // horse hide
            horse: mat('u_horse', () => std(0x8a5a3a, { rough: 0.85 })),
            // glow for lasers / drone eye / mech energy
            glow: mat('u_glow', () => std(0x22d3ee, { emissive: 0x22d3ee, ei: 1.8, rough: 0.3, color: 0x0a2a30 })),
        };
    }

    // Small helpers to keep the factory terse.
    const M = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); if (x !== undefined) o.position.set(x, y, z); o.castShadow = true; return o; };
    const G = {
        box: (w, h, d, k) => geo(k, () => new THREE.BoxGeometry(w, h, d)),
        cyl: (rt, rb, h, s, k) => geo(k, () => new THREE.CylinderGeometry(rt, rb, h, s)),
        cone: (r, h, s, k) => geo(k, () => new THREE.ConeGeometry(r, h, s)),
        sph: (r, k) => geo(k, () => new THREE.SphereGeometry(r, 12, 10)),
        ico: (r, d, k) => geo(k, () => new THREE.IcosahedronGeometry(r, d)),
        torus: (r, t, k) => geo(k, () => new THREE.TorusGeometry(r, t, 6, 16)),
        dodec: (r, k) => geo(k, () => new THREE.DodecahedronGeometry(r, 0)),
    };

    // A standing humanoid torso+head+two legs. Returns {torso, legL, legR, headGroup}.
    // Shared skeleton used by all foot soldiers so leg animation stays consistent.
    function humanoid(g, mats, opt = {}) {
        const torso = M(G.box(0.9, 1.1, 0.55, 'h_torso'), opt.torsoMat || mats.primary, 0, 1.5, 0);
        g.add(torso);
        // pelvis/hips
        g.add(M(G.box(0.8, 0.35, 0.5, 'h_hips'), mats.secondary, 0, 0.98, 0));
        const headGroup = new THREE.Group(); headGroup.position.set(0, 2.28, 0);
        headGroup.add(M(G.sph(0.34, 'h_head'), mats.skin, 0, 0, 0));
        g.add(headGroup);
        const legGeo = G.box(0.3, 0.95, 0.32, 'h_leg');
        const legL = M(legGeo, mats.secondary, 0.24, 0.5, 0); g.add(legL);
        const legR = M(legGeo, mats.secondary, -0.24, 0.5, 0); g.add(legR);
        // arms (static, thin) so the silhouette reads as a person
        if (!opt.noArms) {
            g.add(M(G.box(0.22, 0.9, 0.22, 'h_arm'), opt.armMat || mats.primary, 0.56, 1.55, 0));
            g.add(M(G.box(0.22, 0.9, 0.22, 'h_arm'), opt.armMat || mats.primary, -0.56, 1.55, 0));
        }
        return { torso, legL, legR, headGroup };
    }

    // Build a unit as a Group; parts kept in userData for animation.
    // NOTE: uses cached geometries/materials so buildUnit is cheap; reused by
    // the thumbnail renderer too. Every unit fills userData.parts with
    // { body, legL, legR, weapon, hp } plus optional `hover` for flyers.
    function buildUnit(era, ti, teamKey) {
        const g = new THREE.Group();
        const parts = {};
        const mats = unitMats(era, teamKey);
        // Melee = slot 0 (and Knight/Hoplite/Clubman/Spearman/Rifleman... no:
        // melee identity is decided in the animator via u.range; here we just
        // build the look. Slot 2 heavies get bigger silhouettes.

        // ==================================================================
        // FUTURE DRONE — hovering orb, no legs (special-cased first)
        // ==================================================================
        if (era === 4 && ti === 1) {
            const orb = M(G.ico(0.85, 1, 'd_orb'), mats.primary); orb.scale.set(1.15, 0.85, 1.15);
            g.add(orb); parts.body = orb;
            // sensor ring
            const ring = M(G.torus(0.95, 0.08, 'd_ring'), mats.trim); ring.rotation.x = Math.PI / 2; ring.position.y = 0;
            g.add(ring);
            // glowing eye + thruster underglow
            const eye = M(G.sph(0.3, 'd_eye'), mats.glow); eye.position.set(0.75, 0.05, 0);
            g.add(eye); parts.weapon = eye;
            g.add(M(G.cone(0.35, 0.4, 8, 'd_thrust'), mats.glow, 0, -0.7, 0));
            parts.hover = true;
            g.position.y = 2.4;
            const hp = hpBarSprite(); hp.position.y = 1.7; g.add(hp); parts.hp = hp;
            g.userData = { parts, era, ti, teamKey, animOff: Math.random() * 6.28 };
            return g;
        }

        switch (`${era}_${ti}`) {
            // ============================= STONE (0) =====================
            case '0_0': { // Clubman — caveman with a wooden club
                const h = humanoid(g, mats, { torsoMat: mats.skin, armMat: mats.skin });
                parts.body = h.torso; parts.legL = h.legL; parts.legR = h.legR;
                // fur loincloth + shoulder pelt
                g.add(M(G.box(0.95, 0.5, 0.6, 'cl_pelt'), mats.fur, 0, 1.0, 0));
                g.add(M(G.box(0.5, 0.25, 0.5, 'cl_shldr'), mats.fur, 0.4, 1.9, 0));
                h.headGroup.add(M(G.sph(0.36, 'cl_hair'), mats.fur, 0, 0.12, -0.06));
                // club: thick wooden bludgeon in right hand
                const club = new THREE.Group();
                club.add(M(G.cyl(0.09, 0.11, 1.0, 6, 'cl_haft'), mats.wood, 0, 0.4, 0));
                club.add(M(G.ico(0.34, 0, 'cl_head'), mats.wood, 0, 1.0, 0));
                club.position.set(0.7, 1.4, 0.15); club.rotation.z = -0.6;
                g.add(club); parts.weapon = club;
                break;
            }
            case '0_1': { // Spearman — humanoid with a long spear
                const h = humanoid(g, mats, { torsoMat: mats.fur });
                parts.body = h.torso; parts.legL = h.legL; parts.legR = h.legR;
                g.add(M(G.box(0.9, 0.4, 0.55, 'sp_wrap'), mats.fur, 0, 1.0, 0));
                // long spear held upright-forward in right hand
                const spear = new THREE.Group();
                spear.add(M(G.cyl(0.05, 0.05, 3.2, 6, 'sp_haft'), mats.wood, 0, 0, 0));
                spear.add(M(G.cone(0.12, 0.5, 6, 'sp_tip'), mats.bone, 0, 1.75, 0));
                spear.position.set(0.62, 1.6, 0.2); spear.rotation.x = -0.12;
                g.add(spear); parts.weapon = spear;
                break;
            }
            case '0_2': { // Mammoth Rider — woolly MAMMOTH + small rider
                g.scale.setScalar(1.0);
                // big furry body
                const body = M(G.sph(1.5, 'mm_body'), mats.fur, 0, 2.2, 0); body.scale.set(1.5, 1.25, 1.9);
                g.add(body); parts.body = body;
                // head
                const head = M(G.sph(0.95, 'mm_head'), mats.fur, 0, 2.5, 2.4); head.scale.set(1, 1.05, 0.9);
                g.add(head);
                // dome forehead tuft
                g.add(M(G.sph(0.8, 'mm_tuft'), mats.fur, 0, 3.2, 2.1));
                // trunk (stacked tapered segments curving down)
                const trunk = new THREE.Group();
                trunk.add(M(G.cyl(0.28, 0.4, 0.7, 7, 'mm_tr0'), mats.fur, 0, -0.35, 0));
                trunk.add(M(G.cyl(0.2, 0.28, 0.7, 7, 'mm_tr1'), mats.fur, 0, -1.0, 0.2));
                trunk.add(M(G.cyl(0.14, 0.2, 0.6, 7, 'mm_tr2'), mats.fur, 0.02, -1.55, 0.5));
                trunk.position.set(0, 2.7, 3.1);
                g.add(trunk);
                // two big white curved TUSKS: tapered cones sweeping forward &
                // curving up at the tip (base near mouth, point out front).
                const tuskGeo = G.cyl(0.03, 0.14, 1.8, 7, 'mm_tusk');
                function tusk(sx) {
                    const grp = new THREE.Group(); grp.position.set(sx * 0.5, 1.7, 3.0);
                    // lower straight segment angled forward-down
                    const s0 = M(tuskGeo, mats.bone, 0, 0.4, 0.5); s0.rotation.x = 1.15; grp.add(s0);
                    // upcurved tip
                    const tip = M(G.cyl(0.02, 0.06, 0.9, 7, 'mm_tusktip'), mats.bone, sx * 0.05, 0.55, 1.55); tip.rotation.x = 0.35; grp.add(tip);
                    grp.rotation.y = sx * 0.12;
                    return grp;
                }
                g.add(tusk(1)); g.add(tusk(-1));
                // ears
                g.add(M(G.box(0.12, 0.7, 0.6, 'mm_ear'), mats.fur, 0.95, 2.7, 2.2));
                g.add(M(G.box(0.12, 0.7, 0.6, 'mm_ear'), mats.fur, -0.95, 2.7, 2.2));
                // 4 legs (front pair animate)
                const legGeo = G.cyl(0.32, 0.38, 1.6, 7, 'mm_leg');
                const fL = M(legGeo, mats.fur, 0.9, 0.8, 1.5); g.add(fL);
                const fR = M(legGeo, mats.fur, -0.9, 0.8, 1.5); g.add(fR);
                g.add(M(legGeo, mats.fur, 0.9, 0.8, -1.2));
                g.add(M(legGeo, mats.fur, -0.9, 0.8, -1.2));
                parts.legL = fL; parts.legR = fR;
                // small rider on top with a spear (weapon animates)
                const rider = new THREE.Group(); rider.position.set(0, 3.6, -0.2);
                rider.add(M(G.box(0.5, 0.7, 0.35, 'mm_rtorso'), mats.skin, 0, 0.35, 0));
                rider.add(M(G.sph(0.24, 'mm_rhead'), mats.skin, 0, 0.85, 0));
                const rspear = M(G.cyl(0.04, 0.04, 1.8, 6, 'mm_rspear'), mats.wood, 0, 0, 0);
                rspear.position.set(0.35, 0.5, 0.2); rspear.rotation.x = -0.3;
                rider.add(rspear); parts.weapon = rspear;
                g.add(rider);
                break;
            }

            // ============================ ANCIENT (1) ===================
            case '1_0': { // Hoplite — round shield + short spear + crested helm
                const h = humanoid(g, mats, { torsoMat: mats.primary });
                parts.body = h.torso; parts.legL = h.legL; parts.legR = h.legR;
                // crested helm (bronze bowl + team-tinted crest)
                h.headGroup.add(M(G.sph(0.42, 'ho_helm'), mats.primary, 0, 0.06, 0));
                const crest = M(G.box(0.1, 0.28, 0.55, 'ho_crest'), mats.team, 0, 0.5, -0.05); crest.rotation.x = 0.1;
                h.headGroup.add(crest);
                // round shield (bronze disc + team boss) on left arm
                const shield = M(G.cyl(0.6, 0.6, 0.12, 16, 'ho_shield'), mats.trim);
                shield.rotation.z = Math.PI / 2; shield.position.set(-0.7, 1.5, 0.15);
                g.add(shield);
                g.add(M(G.sph(0.16, 'ho_boss'), mats.team, -0.78, 1.5, 0.15));
                // short spear in right hand
                const spear = new THREE.Group();
                spear.add(M(G.cyl(0.05, 0.05, 2.2, 6, 'ho_haft'), mats.wood, 0, 0, 0));
                spear.add(M(G.cone(0.1, 0.4, 6, 'ho_tip'), mats.trim, 0, 1.25, 0));
                spear.position.set(0.62, 1.6, 0.2);
                g.add(spear); parts.weapon = spear;
                break;
            }
            case '1_1': { // Archer — humanoid drawing a BOW
                const h = humanoid(g, mats, { torsoMat: mats.secondary, noArms: true });
                parts.body = h.torso; parts.legL = h.legL; parts.legR = h.legR;
                // simple hood
                h.headGroup.add(M(G.cone(0.4, 0.4, 7, 'ar_hood'), mats.primary, 0, 0.2, 0));
                // draw arm forward, string arm back
                g.add(M(G.box(0.2, 0.85, 0.2, 'ar_arm'), mats.secondary, 0.5, 1.6, 0.35));
                g.add(M(G.box(0.2, 0.7, 0.2, 'ar_arm2'), mats.secondary, -0.35, 1.55, -0.1));
                // BOW: a torus-arc (half ring) held forward + drawn arrow
                const bow = new THREE.Group();
                const arc = M(G.torus(0.7, 0.05, 'ar_bow'), mats.wood, 0, 0, 0);
                arc.rotation.y = Math.PI / 2;
                bow.add(arc);
                // string (thin box)
                bow.add(M(G.box(0.02, 1.3, 0.02, 'ar_string'), mats.bone, 0, 0, -0.62));
                // nocked arrow pointing forward (+z after facing)
                bow.add(M(G.cyl(0.03, 0.03, 1.1, 5, 'ar_arrow'), mats.wood, 0, 0, 0.3));
                bow.position.set(0.55, 1.6, 0.55);
                g.add(bow); parts.weapon = bow;
                break;
            }
            case '1_2': { // War Chariot — 2-wheeled chariot pulled by a horse + driver
                g.scale.setScalar(0.95);
                // horse in front (+z)
                const horse = new THREE.Group(); horse.position.set(0, 0, 2.2);
                const hbody = M(G.box(0.7, 0.75, 1.8, 'ch_hbody'), mats.horse, 0, 1.35, 0); horse.add(hbody);
                const neck = M(G.box(0.4, 0.9, 0.4, 'ch_neck'), mats.horse, 0, 1.9, 0.9); neck.rotation.x = -0.5; horse.add(neck);
                horse.add(M(G.box(0.35, 0.45, 0.6, 'ch_hhead'), mats.horse, 0, 2.35, 1.25));
                const hlegGeo = G.cyl(0.1, 0.1, 1.3, 6, 'ch_hleg');
                const hlL = M(hlegGeo, mats.horse, 0.25, 0.65, 0.7); horse.add(hlL);
                const hlR = M(hlegGeo, mats.horse, -0.25, 0.65, 0.7); horse.add(hlR);
                horse.add(M(hlegGeo, mats.horse, 0.25, 0.65, -0.7));
                horse.add(M(hlegGeo, mats.horse, -0.25, 0.65, -0.7));
                g.add(horse);
                parts.legL = hlL; parts.legR = hlR;
                // chariot cab (open box) behind
                const cab = M(G.box(1.4, 0.9, 1.1, 'ch_cab'), mats.wood, 0, 1.1, -0.4); g.add(cab); parts.body = cab;
                g.add(M(G.box(1.5, 0.15, 1.2, 'ch_floor'), mats.wood, 0, 0.65, -0.4));
                // trim rail (bronze)
                g.add(M(G.box(1.5, 0.12, 1.2, 'ch_rail'), mats.trim, 0, 1.6, -0.4));
                // two big wheels (spoked look via thin torus)
                const wheelGeo = G.torus(0.6, 0.09, 'ch_wheel');
                const wL = M(wheelGeo, mats.iron, 0.85, 0.6, -0.4); wL.rotation.y = Math.PI / 2;
                const wR = M(wheelGeo, mats.iron, -0.85, 0.6, -0.4); wR.rotation.y = Math.PI / 2;
                g.add(wL); g.add(wR);
                // driver in the cab holding a whip
                const driver = new THREE.Group(); driver.position.set(0, 1.6, -0.5);
                driver.add(M(G.box(0.4, 0.6, 0.3, 'ch_dtorso'), mats.primary, 0, 0.3, 0));
                driver.add(M(G.sph(0.22, 'ch_dhead'), mats.skin, 0, 0.75, 0));
                const whip = M(G.cyl(0.03, 0.03, 1.2, 5, 'ch_whip'), mats.wood, 0, 0, 0);
                whip.position.set(0.3, 0.5, 0.5); whip.rotation.x = -0.6;
                driver.add(whip); parts.weapon = whip;
                g.add(driver);
                break;
            }

            // ============================ MEDIEVAL (2) ==================
            case '2_0': { // Knight — sword + heater shield + plumed helm
                const h = humanoid(g, mats, { torsoMat: mats.primary });
                parts.body = h.torso; parts.legL = h.legL; parts.legR = h.legR;
                // steel helm with plume
                h.headGroup.add(M(G.cyl(0.36, 0.36, 0.55, 10, 'kn_helm'), mats.primary, 0, 0.05, 0));
                h.headGroup.add(M(G.box(0.5, 0.06, 0.06, 'kn_visor'), mats.secondary, 0, 0.02, 0.32));
                h.headGroup.add(M(G.cone(0.1, 0.5, 6, 'kn_plume'), mats.team, 0, 0.45, 0));
                // pauldrons
                g.add(M(G.sph(0.28, 'kn_pauld'), mats.trim, 0.55, 1.95, 0));
                g.add(M(G.sph(0.28, 'kn_pauld'), mats.trim, -0.55, 1.95, 0));
                // heater shield (tapered) on left, team charge
                const shield = new THREE.Group();
                shield.add(M(G.box(0.7, 0.9, 0.1, 'kn_shield'), mats.trim, 0, 0, 0));
                shield.add(M(G.cone(0.42, 0.5, 4, 'kn_shieldpt'), mats.trim, 0, -0.62, 0));
                shield.add(M(G.box(0.35, 0.35, 0.04, 'kn_charge'), mats.team, 0, 0.1, 0.08));
                shield.position.set(-0.72, 1.45, 0.2);
                g.add(shield);
                // longsword in right hand
                const sword = new THREE.Group();
                sword.add(M(G.box(0.12, 1.5, 0.05, 'kn_blade'), mats.trim, 0, 0.85, 0));
                sword.add(M(G.box(0.5, 0.12, 0.12, 'kn_guard'), mats.secondary, 0, 0.1, 0));
                sword.add(M(G.cyl(0.06, 0.06, 0.35, 6, 'kn_grip'), mats.wood, 0, -0.1, 0));
                sword.position.set(0.68, 1.5, 0.2);
                g.add(sword); parts.weapon = sword;
                break;
            }
            case '2_1': { // Crossbowman — horizontal CROSSBOW
                const h = humanoid(g, mats, { torsoMat: mats.secondary, noArms: true });
                parts.body = h.torso; parts.legL = h.legL; parts.legR = h.legR;
                h.headGroup.add(M(G.cyl(0.34, 0.34, 0.4, 10, 'cb_helm'), mats.primary, 0, 0.05, 0));
                g.add(M(G.box(0.2, 0.8, 0.2, 'cb_arm'), mats.secondary, 0.45, 1.6, 0.3));
                g.add(M(G.box(0.2, 0.8, 0.2, 'cb_arm2'), mats.secondary, -0.45, 1.6, 0.3));
                // CROSSBOW held horizontally forward: stock along +z, bow-arms across x
                const cbow = new THREE.Group();
                cbow.add(M(G.box(0.1, 0.12, 1.1, 'cb_stock'), mats.wood, 0, 0, 0.1));
                cbow.add(M(G.box(1.3, 0.06, 0.1, 'cb_arms'), mats.iron, 0, 0.02, 0.35));
                cbow.add(M(G.cyl(0.03, 0.03, 0.9, 5, 'cb_bolt'), mats.trim, 0, 0.08, 0.4)); // loaded bolt
                cbow.position.set(0.3, 1.55, 0.5);
                g.add(cbow); parts.weapon = cbow;
                break;
            }
            case '2_2': { // Catapult — wheeled wooden frame + throwing arm
                g.scale.setScalar(1.0);
                // base frame
                const frame = M(G.box(2.0, 0.5, 2.6, 'ct_frame'), mats.wood, 0, 0.9, 0); g.add(frame); parts.body = frame;
                g.add(M(G.box(0.25, 1.4, 0.25, 'ct_postA'), mats.wood, 0.7, 1.6, 0.3));
                g.add(M(G.box(0.25, 1.4, 0.25, 'ct_postB'), mats.wood, -0.7, 1.6, 0.3));
                // cross beam (fulcrum axle) — cylinder laid across x
                const axle = M(G.cyl(0.12, 0.12, 1.6, 8, 'ct_axle'), mats.iron, 0, 2.2, 0.3); axle.rotation.z = Math.PI / 2;
                g.add(axle);
                // throwing ARM (animates) — pivot near fulcrum, bucket at end
                const arm = new THREE.Group(); arm.position.set(0, 2.2, 0.3);
                const beam = M(G.box(0.18, 0.18, 2.6, 'ct_arm'), mats.wood, 0, 0, -1.0); arm.add(beam);
                arm.add(M(G.cyl(0.3, 0.3, 0.3, 10, 'ct_bucket'), mats.iron, 0, 0.15, -2.1));
                arm.add(M(G.ico(0.28, 0, 'ct_rock'), mats.secondary, 0, 0.35, -2.1));
                arm.rotation.x = -0.6;
                g.add(arm); parts.weapon = arm;
                // reinforcement + trim
                g.add(M(G.box(2.1, 0.15, 0.3, 'ct_brace'), mats.trim, 0, 1.2, -0.9));
                // two wheels each side
                const wheelGeo = G.torus(0.55, 0.14, 'ct_wheel');
                for (const [wx, wz] of [[1.1, 0.8], [-1.1, 0.8], [1.1, -0.8], [-1.1, -0.8]]) {
                    const w = M(wheelGeo, mats.iron, wx, 0.55, wz); w.rotation.y = Math.PI / 2; g.add(w);
                }
                parts.legL = null; parts.legR = null;
                break;
            }

            // ============================ MODERN (3) ====================
            case '3_0': { // Rifleman — soldier with rifle + helmet
                const h = humanoid(g, mats, { torsoMat: mats.primary, noArms: true });
                parts.body = h.torso; parts.legL = h.legL; parts.legR = h.legR;
                // combat helmet (flattened dome)
                const rfHelm = M(G.sph(0.4, 'rf_helm'), mats.primary, 0, 0.08, 0); rfHelm.scale.set(1, 0.8, 1.05);
                h.headGroup.add(rfHelm);
                // webbing / vest
                g.add(M(G.box(0.95, 0.5, 0.6, 'rf_vest'), mats.secondary, 0, 1.65, 0));
                // arms forward gripping rifle
                g.add(M(G.box(0.2, 0.8, 0.2, 'rf_arm'), mats.primary, 0.45, 1.6, 0.3));
                g.add(M(G.box(0.2, 0.7, 0.2, 'rf_arm2'), mats.primary, -0.35, 1.55, 0.15));
                // RIFLE along +z (forward), dark iron with wood stock
                const rifle = new THREE.Group();
                rifle.add(M(G.box(0.1, 0.14, 1.3, 'rf_body'), mats.iron, 0, 0, 0.15));
                const rfBarrel = M(G.cyl(0.04, 0.04, 0.6, 6, 'rf_barrel'), mats.iron); rfBarrel.rotation.x = Math.PI / 2; rfBarrel.position.set(0, 0.04, 0.85);
                rifle.add(rfBarrel);
                rifle.add(M(G.box(0.09, 0.22, 0.35, 'rf_stock'), mats.wood, 0, -0.05, -0.5));
                rifle.position.set(0.3, 1.55, 0.4);
                g.add(rifle); parts.weapon = rifle;
                break;
            }
            case '3_1': { // Grenadier — soldier with grenade launcher (fat barrel)
                const h = humanoid(g, mats, { torsoMat: mats.primary, noArms: true });
                parts.body = h.torso; parts.legL = h.legL; parts.legR = h.legR;
                h.headGroup.add(M(G.sph(0.4, 'gr_helm'), mats.primary, 0, 0.08, 0));
                g.add(M(G.box(0.95, 0.5, 0.62, 'gr_vest'), mats.secondary, 0, 1.65, 0));
                // grenade bandolier (team-tinted pouches)
                g.add(M(G.box(0.7, 0.18, 0.66, 'gr_belt'), mats.team, 0, 1.35, 0));
                g.add(M(G.box(0.2, 0.8, 0.2, 'gr_arm'), mats.primary, 0.45, 1.6, 0.3));
                g.add(M(G.box(0.2, 0.7, 0.2, 'gr_arm2'), mats.primary, -0.35, 1.55, 0.15));
                // GRENADE LAUNCHER — short fat barrel + drum
                const gl = new THREE.Group();
                gl.add(M(G.box(0.12, 0.16, 0.9, 'gl_body'), mats.iron, 0, 0, 0.05));
                const barrel = M(G.cyl(0.13, 0.13, 0.7, 10, 'gl_barrel'), mats.iron, 0, 0.02, 0.6); barrel.rotation.x = Math.PI / 2;
                gl.add(barrel);
                const drum = M(G.cyl(0.2, 0.2, 0.18, 10, 'gl_drum'), mats.trim, 0, -0.02, -0.05); drum.rotation.x = Math.PI / 2;
                gl.add(drum);
                gl.add(M(G.box(0.08, 0.2, 0.3, 'gl_stock'), mats.wood, 0, -0.05, -0.4));
                gl.position.set(0.3, 1.55, 0.4);
                g.add(gl); parts.weapon = gl;
                break;
            }
            case '3_2': { // Tank — actual armored TANK
                g.scale.setScalar(1.0);
                // hull
                const hull = M(G.box(2.6, 0.9, 3.4, 'tk_hull'), mats.primary, 0, 1.3, 0); g.add(hull); parts.body = hull;
                // sloped glacis
                const glacis = M(G.box(2.6, 0.7, 1.0, 'tk_glacis'), mats.primary, 0, 1.1, 1.8); glacis.rotation.x = 0.5; g.add(glacis);
                // turret + long barrel
                const turret = M(G.cyl(1.0, 1.15, 0.8, 10, 'tk_turret'), mats.secondary, 0, 2.1, -0.2); g.add(turret);
                const barrel = M(G.cyl(0.16, 0.16, 2.6, 10, 'tk_barrel'), mats.iron); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 2.15, 1.7);
                g.add(barrel); parts.weapon = barrel;
                g.add(M(G.box(0.4, 0.35, 0.4, 'tk_hatch'), mats.trim, 0.35, 2.6, -0.4));
                // tracks (two long boxes) — animate as "legs" (slight bob)
                const trackGeo = G.box(0.7, 0.85, 3.8, 'tk_track');
                const tL = M(trackGeo, mats.iron, 1.35, 0.7, 0); g.add(tL);
                const tR = M(trackGeo, mats.iron, -1.35, 0.7, 0); g.add(tR);
                parts.legL = tL; parts.legR = tR;
                // road wheels hint
                for (let i = -1; i <= 1; i++) {
                    const w = M(G.cyl(0.35, 0.35, 0.2, 8, 'tk_wheel'), mats.secondary, 1.35, 0.55, i * 1.1); w.rotation.z = Math.PI / 2; g.add(w);
                    const w2 = M(G.cyl(0.35, 0.35, 0.2, 8, 'tk_wheel'), mats.secondary, -1.35, 0.55, i * 1.1); w2.rotation.z = Math.PI / 2; g.add(w2);
                }
                break;
            }

            // ============================ FUTURE (4) ====================
            case '4_0': { // Laser Soldier — sleek trooper + glowing laser rifle
                const h = humanoid(g, mats, { torsoMat: mats.primary, noArms: true });
                parts.body = h.torso; parts.legL = h.legL; parts.legR = h.legR;
                // sleek visored helm with emissive trim
                h.headGroup.add(M(G.sph(0.4, 'ls_helm'), mats.primary, 0, 0.05, 0));
                h.headGroup.add(M(G.box(0.42, 0.1, 0.1, 'ls_visor'), mats.glow, 0, 0.02, 0.34));
                // chest core (emissive)
                g.add(M(G.box(0.3, 0.3, 0.1, 'ls_core'), mats.glow, 0, 1.7, 0.3));
                g.add(M(G.box(0.2, 0.8, 0.2, 'ls_arm'), mats.primary, 0.45, 1.6, 0.3));
                g.add(M(G.box(0.2, 0.7, 0.2, 'ls_arm2'), mats.primary, -0.35, 1.55, 0.15));
                // LASER RIFLE — chrome body + glowing emitter
                const lr = new THREE.Group();
                lr.add(M(G.box(0.12, 0.14, 1.2, 'ls_body'), mats.primary, 0, 0, 0.1));
                const emitter = M(G.cyl(0.08, 0.05, 0.5, 8, 'ls_emit'), mats.glow, 0, 0.02, 0.75); emitter.rotation.x = Math.PI / 2;
                lr.add(emitter);
                lr.add(M(G.box(0.06, 0.5, 0.06, 'ls_coil'), mats.glow, 0, 0.16, 0.2));
                lr.position.set(0.3, 1.55, 0.4);
                g.add(lr); parts.weapon = lr;
                break;
            }
            case '4_2': { // Battle Mech — big bipedal MECH + shoulder cannons
                g.scale.setScalar(1.0);
                // cockpit torso
                const torso = M(G.box(1.8, 1.6, 1.4, 'mc_torso'), mats.primary, 0, 3.4, 0); g.add(torso); parts.body = torso;
                // cockpit glow eye
                g.add(M(G.box(0.9, 0.3, 0.1, 'mc_eye'), mats.glow, 0, 3.7, 0.72));
                // hip block
                g.add(M(G.box(1.4, 0.7, 1.2, 'mc_hip'), mats.secondary, 0, 2.4, 0));
                // shoulder cannons (weapon = right cannon group, both visible)
                const cannons = new THREE.Group();
                const cannonGeo = G.cyl(0.18, 0.22, 1.6, 10, 'mc_cannon');
                const cL = M(cannonGeo, mats.iron); cL.rotation.x = Math.PI / 2; cL.position.set(1.15, 4.0, 0.6); cannons.add(cL);
                const cR = M(cannonGeo, mats.iron); cR.rotation.x = Math.PI / 2; cR.position.set(-1.15, 4.0, 0.6); cannons.add(cR);
                cannons.add(M(G.box(0.5, 0.5, 0.5, 'mc_pod'), mats.primary, 1.15, 4.0, -0.2));
                cannons.add(M(G.box(0.5, 0.5, 0.5, 'mc_pod'), mats.primary, -1.15, 4.0, -0.2));
                g.add(cannons); parts.weapon = cannons;
                // two big legs (thigh + shin), animate
                function mechLeg(sx) {
                    const leg = new THREE.Group(); leg.position.set(sx, 2.1, 0);
                    leg.add(M(G.box(0.55, 1.2, 0.6, 'mc_thigh'), mats.primary, 0, -0.5, 0));
                    leg.add(M(G.box(0.45, 1.1, 0.5, 'mc_shin'), mats.secondary, 0, -1.55, 0.1));
                    leg.add(M(G.box(0.6, 0.25, 0.9, 'mc_foot'), mats.iron, 0, -2.15, 0.25));
                    return leg;
                }
                const legL = mechLeg(0.65); g.add(legL); parts.legL = legL;
                const legR = mechLeg(-0.65); g.add(legR); parts.legR = legR;
                break;
            }

            default: { // fallback humanoid (shouldn't hit)
                const h = humanoid(g, mats);
                parts.body = h.torso; parts.legL = h.legL; parts.legR = h.legR;
                parts.weapon = M(G.box(0.15, 1.4, 0.15, 'fb_w'), mats.trim, 0.7, 1.9, 0.1);
                g.add(parts.weapon);
                break;
            }
        }

        // Silhouettes are sized per identity (foot soldiers ~2.5u tall, heavies
        // and mounts noticeably bigger), roughly matching each unit's sim
        // width/height so relative scale reads correctly on the field.
        const hp = hpBarSprite();
        hp.position.y = (ti === 2 ? (era === 4 ? 5.4 : 4.0) : 3.4);
        g.add(hp); parts.hp = hp;
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
    // SPECIAL-ATTACK PLACEMENT GHOST (translucent AoE disc + bright ring)
    // ======================================================================
    let aoeGroup = null, aoeDisc = null, aoeRing = null, aoeMark = null;
    let aoeRadius = -1;
    function ensureAoe() {
        if (aoeGroup) return;
        aoeGroup = new THREE.Group();
        // filled translucent disc (unit-radius circle, scaled per radius)
        const discMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
        aoeDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), discMat);
        aoeDisc.rotation.x = -Math.PI / 2; aoeDisc.position.y = 0.05;
        aoeDisc.userData.mat = discMat;
        aoeGroup.add(aoeDisc);
        // bright ring outline (geometry rebuilt only when radius changes)
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
        aoeRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 64), ringMat);
        aoeRing.rotation.x = -Math.PI / 2; aoeRing.position.y = 0.07;
        aoeRing.userData.mat = ringMat;
        aoeGroup.add(aoeRing);
        // small center marker (cross-ish)
        const markMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
        aoeMark = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), markMat);
        aoeMark.rotation.x = -Math.PI / 2; aoeMark.position.y = 0.09;
        aoeMark.userData.mat = markMat;
        aoeGroup.add(aoeMark);
        aoeGroup.visible = false;
        scene.add(aoeGroup);
    }
    function showAoeGhost(simX, simZ, radiusSim, valid) {
        ensureAoe();
        aoeGroup.visible = true;
        aoeGroup.position.set(mapX(simX), 0, mapZ(simZ));
        const col = valid ? 0x22c55e : 0xef4444;
        aoeDisc.userData.mat.color.setHex(col);
        aoeRing.userData.mat.color.setHex(col);
        aoeMark.userData.mat.color.setHex(col);
        const rad = Math.max(0.5, radiusSim * S);
        // scale the unit-radius disc; only rebuild the RING geometry on change.
        aoeDisc.scale.set(rad, rad, 1);
        if (Math.abs(rad - aoeRadius) > 0.05) {
            aoeRadius = rad;
            aoeRing.geometry.dispose();
            const w = Math.max(0.35, rad * 0.04);
            aoeRing.geometry = new THREE.RingGeometry(rad - w, rad, 72);
        }
    }
    function hideAoeGhost() {
        if (aoeGroup) aoeGroup.visible = false;
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
    const _thumbBox = new THREE.Box3();
    const _thumbCtr = new THREE.Vector3();
    const _thumbSz = new THREE.Vector3();
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
            g.rotation.y = -0.5; // 3/4 view
            thumbScene.add(g);
            // Auto-frame: measure the unit and pull the camera back so bigger
            // silhouettes (mech, tank, mammoth, catapult) fit and small
            // humanoids fill the portrait.
            _thumbBox.setFromObject(g);
            _thumbBox.getCenter(_thumbCtr);
            _thumbBox.getSize(_thumbSz);
            const radius = Math.max(_thumbSz.x, _thumbSz.y, _thumbSz.z) * 0.5 || 2;
            const dist = radius / Math.tan((thumbCam.fov * Math.PI / 180) / 2) * 1.35;
            const dir = new THREE.Vector3(0.62, 0.5, 0.78).normalize();
            thumbCam.position.copy(_thumbCtr).addScaledVector(dir, dist);
            thumbCam.lookAt(_thumbCtr);
            thumbCam.updateProjectionMatrix();
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

    // Which sim `type` strings fight in melee (they should visibly lunge in).
    const MELEE_TYPES = new Set(['melee', 'heavy_melee', 'shielded_melee']);
    // Wheeled/heavy vehicles: no biped stride, just a chassis rumble.
    function isVehicle(v) { return v.ti === 2 && v.era !== 4; }

    // Capture rest poses (positions/rotations) so animation always returns to them.
    function captureRest(v) {
        const p = v.group.userData.parts;
        if (p.body) v._bodyBaseY = p.body.position.y;
        if (p.weapon) {
            v._wRest = { x: p.weapon.position.x, y: p.weapon.position.y, z: p.weapon.position.z, rx: p.weapon.rotation.x, rz: p.weapon.rotation.z };
        }
    }

    function animateUnit(v, u, t) {
        const p = v.group.userData.parts;
        const g = v.group;
        const hpRatio = Math.max(0, u.hp / u.maxHp);
        if (p.hp) drawHp(p.hp, hpRatio, v.teamKey);
        if (!v._restCaptured) { captureRest(v); v._restCaptured = true; }

        if (u.state === 'die') {
            const dp = u.deathProgress || 0;
            g.rotation.z = (u.facing > 0 ? 1 : -1) * Math.PI / 2 * dp;
            g.position.y = -0.6 * dp * (p.hover ? 4 : 1);
            g.traverse(o => { if (o.isMesh && o.material) { o.material.transparent = true; o.material.opacity = Math.max(0, 1 - dp); } });
            return;
        }
        if (g.rotation.z !== 0) g.rotation.z = 0;

        const walking = u.state === 'walk' && !u.isBlocked;
        const rate = 8 * (u.speed || 1);
        const ph = t * rate;
        const veh = isVehicle(v);

        // ---- vertical bob / hover / chassis rumble ----
        if (p.hover) {
            g.position.y = 2.4 + Math.sin(t * 1.6) * 0.22;
        } else if (p.body) {
            const bob = walking ? (veh ? Math.abs(Math.sin(ph)) * 0.05 : Math.abs(Math.sin(ph)) * 0.12) : 0;
            p.body.position.y = v._bodyBaseY + bob;
        }

        // ---- leg / stride (bipeds + mammoth + mech; vehicles skip) ----
        if (!p.hover && !veh && p.legL && p.legR) {
            const s = walking ? Math.sin(ph) * 0.5 : 0;
            p.legL.rotation.x = s; p.legR.rotation.x = -s;
        }

        // ---- MELEE LUNGE toward heading on the strike (clear punch/thrust) ----
        const isMelee = MELEE_TYPES.has(u.type);
        if (u.state === 'attack') {
            if (v._lungePrev !== 'attack') v._lungeT = 0;
            v._lungeT = (v._lungeT || 0) + 0.16;          // advance strike cycle
            const cyc = v._lungeT % 1;
            // fast thrust out over first 35%, ease back over remainder
            const punch = cyc < 0.35 ? (cyc / 0.35) : 1 - ((cyc - 0.35) / 0.65);
            const eased = punch * punch * (3 - 2 * punch); // smoothstep
            v._lungeAmt = isMelee ? eased * (u.type === 'heavy_melee' ? 2.2 : 1.8) : -eased * 0.5;
        } else {
            v._lungeAmt = (v._lungeAmt || 0) * 0.6;
            if (Math.abs(v._lungeAmt) < 0.01) v._lungeAmt = 0;
        }
        v._lungePrev = u.state;
        if (v._lungeAmt) {
            const hdg = g.rotation.y;   // heading set by syncUnits
            g.position.x += Math.cos(hdg) * v._lungeAmt;
            g.position.z += Math.sin(hdg) * v._lungeAmt;
        }

        // ---- weapon action ----
        if (p.weapon && v._wRest) {
            const w = p.weapon, r = v._wRest;
            if (u.state === 'attack') {
                if (isMelee) {
                    // overhead/thrust swing on the weapon pivot
                    const swing = Math.sin(v._lungeT * Math.PI * 2);
                    w.rotation.z = r.rz - 0.9 - swing * 0.7;
                } else if (v.era === 2 && v.ti === 2) {
                    // Catapult: arm flings forward
                    w.rotation.x = r.rx + Math.max(0, Math.sin(t * 8)) * 1.4;
                } else if (veh) {
                    // Tank/Chariot: barrel recoil kick along its axis
                    w.position.z = r.z - Math.max(0, Math.sin(t * 18)) * 0.25;
                } else {
                    // ranged infantry / mech: small gun recoil
                    w.position.z = r.z - Math.max(0, Math.sin(t * 22)) * 0.12;
                }
            } else {
                // return to rest pose
                w.rotation.z = r.rz; w.rotation.x = r.rx; w.position.z = r.z;
            }
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
        showTowerGhost, hideTowerGhost,
        showAoeGhost, hideAoeGhost,
        renderUnitThumbnail,
    };
}
