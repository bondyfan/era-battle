// ==========================================================================
// Era Battle - shared world constants & sim<->render mapping.
// DOTA-style diagonal map: player base in one corner, enemy base in the
// opposite corner. Three lanes run corner-to-corner: MID is a straight
// diagonal, TOP and BOTTOM are curved (quadratic-bezier) paths that hug the
// off-diagonal corners. Units advance by arc-length "dist" along their lane;
// their WORLD (x,z) position is derived from the lane path via posAt().
//
// Pure ESM, NO three.js import (safe for the sim to load eagerly).
// ==========================================================================

// ---- SIM SPACE: a square map ----
export const MAP_SIZE = 1800;
export const VIRTUAL_WIDTH = 1800;   // legacy alias
export const VIRTUAL_HEIGHT = 1800;
export const GROUND_Y = 340;         // kept only for projectile arc-height math
export const BASE_HP_MAX = 2000;

export const PLAYER_CORNER = { x: 260, z: 260 };
export const ENEMY_CORNER = { x: 1540, z: 1540 };
// Legacy scalar aliases used for some FX; approximate the base corners.
export const PLAYER_BASE_X = PLAYER_CORNER.x;
export const ENEMY_BASE_X = ENEMY_CORNER.x;

export const BASE_REACH = 170;        // arc-length from a lane's end where a unit can hit the base
export const TOWER_MIN_SPACING = 110; // towers can't be placed closer than this (world units)
export const LANE_UNLOCK_COST = 300;  // unlock TOP or BOTTOM (per side)

export const LANE_BY_IDX = ['mid', 'top', 'bottom'];
export const LANE_IDX = { mid: 0, top: 1, bottom: 2 };

// ---- Lane paths (quadratic bezier P0 -> control -> P2) ----
const P0 = PLAYER_CORNER, P2 = ENEMY_CORNER;
const LANE_CTRL = {
    mid: { x: (P0.x + P2.x) / 2, z: (P0.z + P2.z) / 2 },  // straight diagonal
    top: { x: 300, z: 1500 },                              // hug the (low-x, high-z) corner
    bottom: { x: 1500, z: 300 },                           // hug the (high-x, low-z) corner
};
function bez(c, t) {
    const u = 1 - t;
    return {
        x: u * u * P0.x + 2 * u * t * c.x + t * t * P2.x,
        z: u * u * P0.z + 2 * u * t * c.z + t * t * P2.z,
    };
}

// Precompute an arc-length lookup table per lane.
const SAMPLES = 96;
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
    const a = posAt(name, Math.max(0, dist - 6));
    const b = posAt(name, Math.min(len, dist + 6));
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
export function laneSamples(name, n = 60) {
    const len = laneLength(name);
    const out = [];
    for (let i = 0; i <= n; i++) out.push(posAt(name, (len * i) / n));
    return out;
}

// ---- RENDER MAPPING (square sim -> three.js units) ----
export const S = 100 / 1800;                 // 1800 sim -> 100 three units
export const mapX = (x) => (x - 900) * S;     // center the square at origin
export const mapZ = (z) => (z - 900) * S;
export const mapYFromSimY = (y) => (GROUND_Y - y) * S;

export const CORNER3 = {
    player: { x: mapX(PLAYER_CORNER.x), z: mapZ(PLAYER_CORNER.z) },
    enemy: { x: mapX(ENEMY_CORNER.x), z: mapZ(ENEMY_CORNER.z) },
};

// 180° rotation about the map center = the guest's mirror (swaps corners).
// Lane top<->bottom also swap under this rotation.
export const mirrorX = (x) => (MAP_SIZE - x);
export const mirrorZ = (z) => (MAP_SIZE - z);
export const mirrorLane = (name) => (name === 'top' ? 'bottom' : name === 'bottom' ? 'top' : 'mid');
