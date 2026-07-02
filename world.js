// ==========================================================================
// Era Battle - shared world constants & sim<->render mapping.
// DOTA-style diagonal map: player base in one corner, enemy base in the
// opposite corner. Three lanes run corner-to-corner: MID is a straight
// diagonal, TOP and BOTTOM are curved (quadratic-bezier) paths. Units advance
// by arc-length "dist" along their lane; their WORLD (x,z) comes from posAt().
//
// Pure ESM, NO three.js import (safe for the sim to load eagerly).
// ==========================================================================

// ---- SIM SPACE: a large square map (bigger => longer lanes) ----
export const MAP_SIZE = 2600;
export const VIRTUAL_WIDTH = MAP_SIZE;   // legacy alias
export const VIRTUAL_HEIGHT = MAP_SIZE;
export const GROUND_Y = 340;             // kept only for projectile arc-height math
export const BASE_HP_MAX = 2000;

export const PLAYER_CORNER = { x: 360, z: 360 };
export const ENEMY_CORNER = { x: MAP_SIZE - 360, z: MAP_SIZE - 360 };
// Legacy scalar aliases used for some FX; approximate the base corners.
export const PLAYER_BASE_X = PLAYER_CORNER.x;
export const ENEMY_BASE_X = ENEMY_CORNER.x;

export const BASE_REACH = 230;            // arc-length from a lane's end where a unit can hit the base
export const TOWER_MIN_SPACING = 150;     // towers can't be placed closer than this (world units)
export const TOWER_LANE_CLEARANCE = 80;   // towers must be at least this far OFF a lane path
export const LANE_UNLOCK_COST = 300;      // unlock TOP or BOTTOM (per side)

export const LANE_BY_IDX = ['mid', 'top', 'bottom'];
export const LANE_IDX = { mid: 0, top: 1, bottom: 2 };

// ---- Lane paths (quadratic bezier P0 -> control -> P2) ----
const P0 = PLAYER_CORNER, P2 = ENEMY_CORNER;
const LANE_CTRL = {
    mid: { x: (P0.x + P2.x) / 2, z: (P0.z + P2.z) / 2 },  // straight diagonal
    top: { x: MAP_SIZE * 0.17, z: MAP_SIZE * 0.83 },       // hug the (low-x, high-z) corner
    bottom: { x: MAP_SIZE * 0.83, z: MAP_SIZE * 0.17 },    // hug the (high-x, low-z) corner
};
function bez(c, t) {
    const u = 1 - t;
    return {
        x: u * u * P0.x + 2 * u * t * c.x + t * t * P2.x,
        z: u * u * P0.z + 2 * u * t * c.z + t * t * P2.z,
    };
}

// Precompute an arc-length lookup table per lane.
const SAMPLES = 120;
const LANE_TABLE = {};
for (const name of LANE_BY_IDX) {
    const c = LANE_CTRL[name];
    const pts = [bez(c, 0)];
    const cum = [0];
    let len = 0;
    for (let i = 1; i <= SAMPLES; i++) {
        const p = bez(c, i / SAMPLES);
        len += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
        pts.push(p);
        cum.push(len);
    }
    LANE_TABLE[name] = { pts, cum, len };
}

export function laneLength(name) { return (LANE_TABLE[name] || LANE_TABLE.mid).len; }

// World (x,z) at arc-length `dist` along a lane (0 = player corner, len = enemy corner)
export function posAt(name, dist) {
    const T = LANE_TABLE[name] || LANE_TABLE.mid;
    const d = Math.max(0, Math.min(T.len, dist));
    let i = 1;
    while (i < T.cum.length && T.cum[i] < d) i++;
    const i0 = i - 1;
    const seg = (T.cum[i] - T.cum[i0]) || 1;
    const f = (d - T.cum[i0]) / seg;
    const a = T.pts[i0], b = T.pts[i] || a;
    return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f };
}

// Unit tangent (normalized) pointing toward the ENEMY corner at `dist`
export function dirAt(name, dist) {
    const len = laneLength(name);
    const a = posAt(name, Math.max(0, dist - 8));
    const b = posAt(name, Math.min(len, dist + 8));
    const dx = b.x - a.x, dz = b.z - a.z;
    const m = Math.hypot(dx, dz) || 1;
    return { dx: dx / m, dz: dz / m };
}

// Render heading (radians about Y) for a unit moving with `dir` (+1 player, -1 enemy)
export function headingAt(name, dist, dir) {
    const d = dirAt(name, dist);
    return Math.atan2(d.dz * dir, d.dx * dir);
}

// Polyline samples along a lane in world space (for drawing lane ribbons)
export function laneSamples(name, n = 80) {
    const len = laneLength(name);
    const out = [];
    for (let i = 0; i <= n; i++) out.push(posAt(name, (len * i) / n));
    return out;
}

// Minimum distance from a world point to ANY lane path (for "no towers on the road")
export function distToLane(x, z) {
    let best = Infinity;
    for (const name of LANE_BY_IDX) {
        const pts = LANE_TABLE[name].pts;
        for (let i = 0; i < pts.length; i++) {
            const d = Math.hypot(pts[i].x - x, pts[i].z - z);
            if (d < best) best = d;
        }
    }
    return best;
}

// ---- RENDER MAPPING (square sim -> three.js units) ----
export const THREE_FIELD = 112;              // three-space width of the whole map
export const S = THREE_FIELD / MAP_SIZE;     // sim units -> three units
const HALF = MAP_SIZE / 2;
export const mapX = (x) => (x - HALF) * S;
export const mapZ = (z) => (z - HALF) * S;
export const mapYFromSimY = (y) => (GROUND_Y - y) * S;

export const CORNER3 = {
    player: { x: mapX(PLAYER_CORNER.x), z: mapZ(PLAYER_CORNER.z) },
    enemy: { x: mapX(ENEMY_CORNER.x), z: mapZ(ENEMY_CORNER.z) },
};

// 180° rotation about the map center = the guest's mirror (swaps corners).
export const mirrorX = (x) => (MAP_SIZE - x);
export const mirrorZ = (z) => (MAP_SIZE - z);
export const mirrorLane = (name) => (name === 'top' ? 'bottom' : name === 'bottom' ? 'top' : 'mid');
