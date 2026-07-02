// ==========================================================================
// Era Battle - shared world constants & sim<->render coordinate mapping.
// Imported by both the sim (script.js) and the 3D renderer (render3d.js) so
// they can never disagree. Pure ESM, NO three.js import (safe to load eagerly).
// ==========================================================================

// ---- SIM SPACE (the X spine is unchanged from the old 2D game) ----
export const VIRTUAL_WIDTH = 1800;
export const VIRTUAL_HEIGHT = 400;
export const GROUND_Y = 340;
export const PLAYER_BASE_X = 100;
export const ENEMY_BASE_X = 1700;
export const BASE_HP_MAX = 2000;

export const MIDLINE_X = 900;      // boundary of "your half" (tower placement)
export const TOWER_MARGIN = 60;    // no-build buffer around the midline
export const TOWER_MIN_SPACING = 90;

// ---- LANES ----
export const LANE_BY_IDX = ['mid', 'top', 'bottom'];
export const LANE_IDX = { mid: 0, top: 1, bottom: 2 };
export const LANE_Z = { mid: 450, top: 180, bottom: 720 };
export const LANE_Z_BY_IDX = [450, 180, 720];   // [mid, top, bottom]
export const LANE_HALF_WIDTH = 100;             // same-lane combat band (± sim units)
export const WORLD_Z_MIN = 120, WORLD_Z_MAX = 780;
export const LANE_UNLOCK_COST = 300;            // unlock top or bottom, per side

export function laneZOf(lane) { return LANE_Z[lane] !== undefined ? LANE_Z[lane] : 450; }

// ---- RENDER SCALE (sim units -> three.js units) ----
export const S = 1 / 18;                        // 1800 sim wide -> 100 three units
export const mapX = (simX) => (simX - 900) * S;         // -> [-50 .. +50]
export const mapZ = (simZ) => (simZ - 450) * S;         // mid(450)->0, top->-15, bottom->+15
export const laneZ3 = (laneIdx) => mapZ(LANE_Z_BY_IDX[laneIdx] ?? 450);
export const mapYFromSimY = (simY) => (GROUND_Y - simY) * S; // projectile arc height

// Render-space landmarks
export const FIELD_HALF_X = mapX(ENEMY_BASE_X);   // ~ +44.4
export const LANE_Z3 = [laneZ3(0), laneZ3(1), laneZ3(2)];
