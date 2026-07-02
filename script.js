/**
 * Era Battle - Game Engine & Core Logic (top-down 3D lane edition).
 * The simulation is authoritative and mostly 1D-per-lane; render3d.js is a pure
 * reflection of this state. Every player gesture ends in a player*() call.
 */

import {
    MAP_SIZE, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, GROUND_Y, BASE_HP_MAX,
    PLAYER_CORNER, ENEMY_CORNER, PLAYER_BASE_X, ENEMY_BASE_X,
    BASE_REACH, TOWER_MIN_SPACING, TOWER_LANE_CLEARANCE, LANE_UNLOCK_COST,
    LANE_BY_IDX, LANE_IDX,
    laneLength, posAt, headingAt, distToLane,
    S, mirrorX, mirrorZ, mirrorLane
} from './world.js';

// ==========================================================================
// CONFIGURATION AND CONSTANTS
// ==========================================================================

const ERA_DATA = [
    {
        name: "Stone Age",
        evolveXp: 2000,
        skyGradient: ["#1e1b18", "#451a03"], // Sunset brown/orange
        groundColor: "#57534e", // Slate stone Y-ground
        baseColor: "#78716c",
        towerColor: "#a8a29e",
        units: [
            {
                name: "Clubman",
                cost: 15,
                hp: 50,
                damage: 8,
                speed: 1.1,
                range: 30,
                cooldown: 900,
                goldReward: 8,
                xpReward: 15,
                type: "melee",
                width: 30,
                height: 40
            },
            {
                name: "Spearman",
                cost: 25,
                hp: 55,
                damage: 7,
                speed: 0.9,
                range: 150,
                cooldown: 1300,
                goldReward: 14,
                xpReward: 25,
                type: "ranged",
                projectile: "spear",
                width: 30,
                height: 40
            },
            {
                name: "Mammoth Rider",
                cost: 100,
                hp: 250,
                damage: 22,
                speed: 0.6,
                range: 55,
                cooldown: 1600,
                goldReward: 55,
                xpReward: 100,
                type: "heavy_melee",
                width: 70,
                height: 60
            }
        ],
        specialName: "Falling Rocks",
        specialType: "meteor",
        towerName: "Rock Slinger",
        towerDamage: 12,
        towerCooldown: 1500,
        towerRange: 320,
        towerProj: "pebble"
    },
    {
        name: "Ancient Age",
        evolveXp: 7500,
        skyGradient: ["#0b132b", "#1c2541"], // Bronze dark blue
        groundColor: "#6b7280", // Dusty sand
        baseColor: "#d97706", // Clay/Bronze
        towerColor: "#f59e0b",
        units: [
            {
                name: "Hoplite",
                cost: 45,
                hp: 110,
                damage: 16,
                speed: 1.2,
                range: 35,
                cooldown: 800,
                goldReward: 24,
                xpReward: 45,
                type: "melee",
                width: 32,
                height: 42
            },
            {
                name: "Archer",
                cost: 65,
                hp: 90,
                damage: 13,
                speed: 1.0,
                range: 200,
                cooldown: 1200,
                goldReward: 35,
                xpReward: 65,
                type: "ranged",
                projectile: "arrow",
                width: 30,
                height: 40
            },
            {
                name: "War Chariot",
                cost: 240,
                hp: 400,
                damage: 38,
                speed: 1.6,
                range: 60,
                cooldown: 1400,
                goldReward: 130,
                xpReward: 240,
                type: "heavy_melee",
                width: 75,
                height: 55
            }
        ],
        specialName: "Arrow Rain",
        specialType: "arrows",
        towerName: "Ballista",
        towerDamage: 25,
        towerCooldown: 1400,
        towerRange: 350,
        towerProj: "bolt"
    },
    {
        name: "Medieval Age",
        evolveXp: 25000,
        skyGradient: ["#022c22", "#064e3b"], // Forest Green
        groundColor: "#15803d", // Lush grass
        baseColor: "#475569", // Gray stone keep
        towerColor: "#64748b",
        units: [
            {
                name: "Knight",
                cost: 130,
                hp: 290,
                damage: 35,
                speed: 1.2,
                range: 40,
                cooldown: 900,
                goldReward: 70,
                xpReward: 130,
                type: "shielded_melee",
                width: 34,
                height: 44
            },
            {
                name: "Crossbowman",
                cost: 160,
                hp: 220,
                damage: 32,
                speed: 0.9,
                range: 240,
                cooldown: 1500,
                goldReward: 85,
                xpReward: 160,
                type: "ranged",
                projectile: "bolt",
                width: 32,
                height: 42
            },
            {
                name: "Catapult",
                cost: 500,
                hp: 600,
                damage: 90,
                speed: 0.5,
                range: 320,
                cooldown: 2500,
                goldReward: 270,
                xpReward: 500,
                type: "ranged",
                projectile: "firepot",
                width: 60,
                height: 50
            }
        ],
        specialName: "Fireball Rain",
        specialType: "fireball",
        towerName: "Trebuchet",
        towerDamage: 60,
        towerCooldown: 2200,
        towerRange: 380,
        towerProj: "firepot"
    },
    {
        name: "Modern Age",
        evolveXp: 75000,
        skyGradient: ["#111827", "#1f2937"], // Industrial steel gray
        groundColor: "#78350f", // Muddy dirt
        baseColor: "#27272a", // Steel Bunker
        towerColor: "#3f3f46",
        units: [
            {
                name: "Rifleman",
                cost: 380,
                hp: 550,
                damage: 65,
                speed: 1.2,
                range: 260,
                cooldown: 750,
                goldReward: 200,
                xpReward: 380,
                type: "hitscan",
                width: 32,
                height: 44
            },
            {
                name: "Grenadier",
                cost: 550,
                hp: 650,
                damage: 100,
                speed: 1.0,
                range: 210,
                cooldown: 1600,
                goldReward: 290,
                xpReward: 550,
                type: "ranged",
                projectile: "grenade",
                width: 32,
                height: 44
            },
            {
                name: "Tank",
                cost: 1300,
                hp: 2200,
                damage: 280,
                speed: 0.8,
                range: 280,
                cooldown: 2000,
                goldReward: 690,
                xpReward: 1300,
                type: "ranged",
                projectile: "shell",
                width: 80,
                height: 55
            }
        ],
        specialName: "Air Strike",
        specialType: "airstrike",
        towerName: "Flak Cannon",
        towerDamage: 120,
        towerCooldown: 1200,
        towerRange: 400,
        towerProj: "bullet"
    },
    {
        name: "Future Age",
        evolveXp: 999999, // Final Era
        skyGradient: ["#020617", "#1e1b4b"], // Deep cosmic indigo
        groundColor: "#0f172a", // Dark neon floor Grid
        baseColor: "#0284c7", // Sci-fi dome chrome
        towerColor: "#38bdf8",
        units: [
            {
                name: "Laser Soldier",
                cost: 1100,
                hp: 1400,
                damage: 190,
                speed: 1.3,
                range: 280,
                cooldown: 650,
                goldReward: 600,
                xpReward: 1100,
                type: "laser",
                width: 32,
                height: 44
            },
            {
                name: "Drone",
                cost: 1600,
                hp: 1600,
                damage: 160,
                speed: 1.9,
                range: 200,
                cooldown: 550,
                goldReward: 850,
                xpReward: 1600,
                type: "ranged",
                projectile: "plasma",
                width: 36,
                height: 36
            },
            {
                name: "Battle Mech",
                cost: 4500,
                hp: 6000,
                damage: 750,
                speed: 0.7,
                range: 240,
                cooldown: 1800,
                goldReward: 2400,
                xpReward: 4500,
                type: "laser_heavy",
                width: 90,
                height: 85
            }
        ],
        specialName: "Orbital Laser",
        specialType: "orbitallaser",
        towerName: "Plasma Turret",
        towerDamage: 300,
        towerCooldown: 1500,
        towerRange: 450,
        towerProj: "plasma"
    }
];

// Spatial constants (VIRTUAL_WIDTH/GROUND_Y/PLAYER_BASE_X/ENEMY_BASE_X/BASE_HP_MAX/...)
// are imported from world.js so the sim and the 3D renderer never disagree.
const SPECIAL_COOLDOWN_MS = 40000; // 40 seconds
const SPECIAL_RADIUS = 520;        // sim units — placement radius for the targeted special
const TOWER_SLOT_COSTS = [150, 400, 1000];
const TOWER_BUILD_COST = 250;

// Special attack must be purchased; 4 damage tiers.
// Index = level. Lv1 chips, Lv2 == the old baseline, Lv3 hits hard, Lv4 is brutal.
const SPECIAL_LEVEL_MULT = [0, 0.4, 1.0, 2.0, 4.0];
const SPECIAL_UPGRADE_COSTS = [250, 600, 1500, 4000]; // cost to go from level i -> i+1
const MAX_SPECIAL_LEVEL = 4;

// Ranged-unit range upgrade: each level lets your archers/gunners reach ~1 rank deeper.
const RANGE_BONUS_PER_LEVEL = 45;
const RANGE_UPGRADE_COSTS = [180, 320, 560, 950, 1600, 2700]; // cost to go from level i -> i+1
const MAX_RANGE_LEVEL = 6;
const RANGED_TYPES = ['ranged', 'hitscan', 'laser', 'laser_heavy'];

// Per-unit evolution (replaces the old whole-army "Evolve Era").
// Each of the 3 unit slots advances through the 5 eras independently, for gold.
const UNIT_EVOLVE_MULT = 2.5;   // evolve cost = next-tier unit's spawn cost * this
const UNIT3_UNLOCK_COST = 50;   // the heavy unit (slot 3) must be unlocked first

// ---- Lane helpers for the targeted special (world point -> nearest lane / arc-length) ----
// Which lane path passes closest to a world (x,z) point.
function nearestLaneTo(x, z) {
    let best = 'mid', bestD = Infinity;
    for (const name of LANE_BY_IDX) {
        const len = laneLength(name);
        for (let i = 0; i <= 40; i++) {
            const p = posAt(name, (len * i) / 40);
            const d = Math.hypot(p.x - x, p.z - z);
            if (d < bestD) { bestD = d; best = name; }
        }
    }
    return best;
}
// Approximate arc-length along `lane` of the point on the lane nearest to (x,z).
function distAlongLane(lane, x, z) {
    const len = laneLength(lane);
    let bestD = Infinity, bestT = 0;
    for (let i = 0; i <= 80; i++) {
        const d = (len * i) / 80;
        const p = posAt(lane, d);
        const dd = Math.hypot(p.x - x, p.z - z);
        if (dd < bestD) { bestD = dd; bestT = d; }
    }
    return bestT;
}

// ==========================================================================
// PARTICLE SYSTEM
// ==========================================================================

class Particle {
    constructor(x, y, color, type = 'spark', text = '', customSize = null, z = 900) {
        this.x = x;
        this.y = y;
        this.z = z;            // lane depth for the 3D FX bridge
        this._fx = false;      // set once the 3D renderer has spawned this effect
        this.color = color;
        this.type = type; // 'spark', 'blood', 'smoke', 'text', 'fire', 'laser'
        this.text = text;
        this.alpha = 1;
        this.size = customSize || (type === 'text' ? 14 : Math.random() * 3 + 2);
        
        // Random velocities
        if (type === 'blood') {
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = -Math.random() * 4 - 2;
            this.gravity = 0.2;
        } else if (type === 'spark') {
            this.vx = (Math.random() - 0.5) * 6;
            this.vy = (Math.random() - 0.5) * 6;
            this.gravity = 0.05;
        } else if (type === 'fire') {
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = -Math.random() * 3 - 1;
            this.gravity = -0.05; // floats up
        } else if (type === 'smoke') {
            this.vx = (Math.random() - 0.5) * 1;
            this.vy = -Math.random() * 1.5 - 0.5;
            this.gravity = -0.02;
            this.size = Math.random() * 8 + 4;
        } else if (type === 'text') {
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = -1.2;
            this.gravity = 0;
        } else {
            this.vx = 0;
            this.vy = 0;
            this.gravity = 0;
        }
        
        this.life = 1.0; // Decay factor
        this.decay = type === 'smoke' ? 0.015 : (type === 'text' ? 0.02 : 0.04);
    }

    update(dt) {
        const speedScale = dt / 16.666; // Normalized to 60fps
        this.x += this.vx * speedScale;
        this.y += this.vy * speedScale;
        if (this.gravity) {
            this.vy += this.gravity * speedScale;
        }
        this.life -= this.decay * speedScale;
        this.alpha = Math.max(0, this.life);
    }

    draw(ctx, cameraX) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        const drawX = this.x - cameraX;

        if (this.type === 'text') {
            ctx.font = `700 ${this.size}px 'Outfit', system-ui, sans-serif`;
            ctx.fillStyle = this.color;
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.textAlign = 'center';
            ctx.fillText(this.text, drawX, this.y);
        } else {
            ctx.beginPath();
            ctx.fillStyle = this.color;
            
            if (this.type === 'fire' || this.type === 'smoke') {
                // Circular fuzzy shapes
                ctx.arc(drawX, this.y, this.size * (2 - this.life), 0, Math.PI * 2);
            } else {
                ctx.arc(drawX, this.y, this.size, 0, Math.PI * 2);
            }
            
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// ==========================================================================
// TOWER CLASS
// ==========================================================================

class Tower {
    constructor(team, x, z) {
        this.team = team;
        this.x = x;
        this.z = z;
        this.cooldownTimer = 0;
    }

    update(dt, game) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
        }

        const era = this.team === 'player' ? game.playerEra : game.enemyEra;
        const eraConfig = ERA_DATA[era];

        if (this.cooldownTimer <= 0) {
            // Radial targeting: nearest enemy unit within the tower's 2D radius (any lane)
            const enemies = this.team === 'player' ? game.enemyUnits : game.playerUnits;
            let closestEnemy = null;
            let closestDist = eraConfig.towerRange;

            for (let enemy of enemies) {
                if (enemy.state === 'die') continue;
                const dist = Math.hypot(enemy.x - this.x, (enemy.z ?? 0) - this.z);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }

            if (closestEnemy) {
                this.shoot(closestEnemy, game, eraConfig);
            }
        }
    }

    shoot(target, game, eraConfig) {
        this.cooldownTimer = eraConfig.towerCooldown;

        const towerY = GROUND_Y - 90;
        game.projectiles.push(new Projectile(
            this.x,
            towerY,
            target,
            this.team,
            eraConfig.towerDamage,
            eraConfig.towerProj,
            2.5, 0, this.z // moderate speed multiplier, lane depth
        ));

        const flashColor = this.team === 'player' ? '#60a5fa' : '#f87171';
        game.particles.push(new Particle(this.x, towerY, flashColor, 'spark', '', 4, this.z));
    }

    draw(ctx, cameraX, game) {
        const era = this.team === 'player' ? game.playerEra : game.enemyEra;
        const eraConfig = ERA_DATA[era];
        
        const myBaseX = this.team === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X;
        const towerX = this.team === 'player' ? myBaseX + 35 : myBaseX - 35;
        const towerY = GROUND_Y - 90 - (this.slotIndex * 60);
        
        const drawX = towerX - cameraX;
        
        ctx.save();
        ctx.fillStyle = eraConfig.towerColor;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        
        // Draw tower mount platform
        ctx.beginPath();
        ctx.rect(drawX - 15, towerY + 5, 30, 8);
        ctx.fill();
        ctx.stroke();
        
        // Draw Tower Body by Era
        ctx.beginPath();
        if (era === 0) { // Stone Slinger
            // Wooden support frame
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 3;
            ctx.moveTo(drawX - 8, towerY + 5);
            ctx.lineTo(drawX, towerY - 10);
            ctx.lineTo(drawX + 8, towerY + 5);
            ctx.stroke();
            // Sling pebble
            ctx.fillStyle = '#78716c';
            ctx.beginPath();
            ctx.arc(drawX, towerY - 10, 5, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (era === 1) { // Ballista
            // Crossbow limbs
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 4;
            ctx.moveTo(drawX - 15, towerY - 5);
            ctx.lineTo(drawX + 15, towerY - 5);
            ctx.stroke();
            // Arrow/Bolt ready
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.moveTo(drawX, towerY - 2);
            ctx.lineTo(this.team === 'player' ? drawX + 10 : drawX - 10, towerY - 2);
            ctx.stroke();
        } 
        else if (era === 2) { // Trebuchet
            // Diagonal arm
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 4;
            ctx.moveTo(drawX - 8, towerY + 5);
            ctx.lineTo(this.team === 'player' ? drawX + 12 : drawX - 12, towerY - 10);
            ctx.stroke();
            // Counterweight
            ctx.fillStyle = '#4b5563';
            ctx.beginPath();
            ctx.arc(this.team === 'player' ? drawX - 8 : drawX + 8, towerY + 2, 6, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (era === 3) { // Flak / Machine Gun
            // Steel box turret
            ctx.rect(drawX - 10, towerY - 8, 20, 14);
            ctx.fill();
            ctx.stroke();
            // Gun barrels
            ctx.strokeStyle = '#18181b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(drawX, towerY - 2);
            ctx.lineTo(this.team === 'player' ? drawX + 18 : drawX - 18, towerY - 2);
            ctx.stroke();
        } 
        else if (era === 4) { // Plasma Turret
            // Glowing neon blue core
            const pulse = Math.abs(Math.sin(Date.now() / 200)) * 5;
            ctx.shadowBlur = 8 + pulse;
            ctx.shadowColor = '#06b6d4';
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(drawX, towerY - 2, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset
            
            // Outer casing
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(drawX, towerY - 2, 10, Math.PI, 0, this.team === 'player');
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// ==========================================================================
// BASE CLASS
// ==========================================================================

class Base {
    constructor(team) {
        this.team = team;
        this.hp = BASE_HP_MAX;
        const corner = team === 'player' ? PLAYER_CORNER : ENEMY_CORNER;
        this.x = corner.x;
        this.z = corner.z; // world depth of the base corner (projectiles aim here)
        this.y = GROUND_Y; // needed so projectiles aimed at the base get a valid target height
        this.width = 110;
        this.height = 320;
        this.towers = []; // Tower instances
        this.unlockedSlots = 0;
        this.damageIndicator = 0; // Screen/Base shake trigger
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        this.damageIndicator = 5; // trigger a small visual bounce/shake
    }

    update(dt, game) {
        if (this.damageIndicator > 0) {
            this.damageIndicator -= dt / 50;
        }
        
        // Update active towers
        for (let tower of this.towers) {
            tower.update(dt, game);
        }
    }

    draw(ctx, cameraX, game) {
        const era = this.team === 'player' ? game.playerEra : game.enemyEra;
        const eraConfig = ERA_DATA[era];
        const drawX = this.x - cameraX;
        
        ctx.save();
        
        // Apply damage base shake
        if (this.damageIndicator > 0) {
            const shake = Math.sin(Date.now() / 20) * 4 * this.damageIndicator;
            ctx.translate(shake, 0);
        }
        
        // Base visuals depend on Era
        ctx.fillStyle = eraConfig.baseColor;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        
        if (era === 0) { // Stone Age (Rock cave base)
            ctx.beginPath();
            if (this.team === 'player') {
                ctx.moveTo(drawX - 55, GROUND_Y);
                ctx.lineTo(drawX - 45, GROUND_Y - 220);
                ctx.quadraticCurveTo(drawX + 10, GROUND_Y - 260, drawX + 45, GROUND_Y - 180);
                ctx.quadraticCurveTo(drawX + 55, GROUND_Y - 90, drawX + 45, GROUND_Y);
            } else {
                ctx.moveTo(drawX + 55, GROUND_Y);
                ctx.lineTo(drawX + 45, GROUND_Y - 220);
                ctx.quadraticCurveTo(drawX - 10, GROUND_Y - 260, drawX - 45, GROUND_Y - 180);
                ctx.quadraticCurveTo(drawX - 55, GROUND_Y - 90, drawX - 45, GROUND_Y);
            }
            ctx.fill();
            ctx.stroke();
            
            // Add crack highlights
            ctx.strokeStyle = '#44403c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(drawX, GROUND_Y - 100);
            ctx.lineTo(this.team === 'player' ? drawX + 25 : drawX - 25, GROUND_Y - 140);
            ctx.moveTo(drawX, GROUND_Y - 180);
            ctx.lineTo(this.team === 'player' ? drawX - 15 : drawX + 15, GROUND_Y - 140);
            ctx.stroke();
        } 
        else if (era === 1) { // Ancient Age (Clay/Greek Pillars base)
            ctx.beginPath();
            ctx.rect(drawX - 40, GROUND_Y - 250, 80, 250);
            ctx.fill();
            ctx.stroke();
            
            // Triangular Roof
            ctx.fillStyle = '#b45309';
            ctx.beginPath();
            ctx.moveTo(drawX - 50, GROUND_Y - 250);
            ctx.lineTo(drawX, GROUND_Y - 290);
            ctx.lineTo(drawX + 50, GROUND_Y - 250);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Draw column details
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(drawX - 20, GROUND_Y - 230);
            ctx.lineTo(drawX - 20, GROUND_Y - 20);
            ctx.moveTo(drawX, GROUND_Y - 230);
            ctx.lineTo(drawX, GROUND_Y - 20);
            ctx.moveTo(drawX + 20, GROUND_Y - 230);
            ctx.lineTo(drawX + 20, GROUND_Y - 20);
            ctx.stroke();
        } 
        else if (era === 2) { // Medieval Age (Castle Keep)
            ctx.beginPath();
            ctx.rect(drawX - 45, GROUND_Y - 260, 90, 260);
            ctx.fill();
            ctx.stroke();
            
            // Castle Battlements (Crenellations)
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            const bx = drawX - 48;
            const by = GROUND_Y - 260;
            ctx.rect(bx, by - 12, 16, 12);
            ctx.rect(bx + 32, by - 12, 16, 12);
            ctx.rect(bx + 64, by - 12, 16, 12);
            ctx.fill();
            ctx.stroke();
            
            // Banner/Flag
            ctx.fillStyle = this.team === 'player' ? '#3b82f6' : '#ef4444';
            ctx.beginPath();
            ctx.rect(drawX - 3, GROUND_Y - 295, 3, 35); // pole
            ctx.fill();
            ctx.beginPath();
            if (this.team === 'player') {
                ctx.moveTo(drawX, GROUND_Y - 295);
                ctx.lineTo(drawX + 20, GROUND_Y - 285);
                ctx.lineTo(drawX, GROUND_Y - 275);
            } else {
                ctx.moveTo(drawX, GROUND_Y - 295);
                ctx.lineTo(drawX - 20, GROUND_Y - 285);
                ctx.lineTo(drawX, GROUND_Y - 275);
            }
            ctx.fill();
        } 
        else if (era === 3) { // Modern Age (Concrete/Steel military bunker)
            ctx.beginPath();
            ctx.rect(drawX - 50, GROUND_Y - 240, 100, 240);
            ctx.fill();
            ctx.stroke();
            
            // Bunker view slit
            ctx.fillStyle = '#18181b';
            ctx.beginPath();
            ctx.rect(this.team === 'player' ? drawX + 15 : drawX - 45, GROUND_Y - 140, 30, 10);
            ctx.fill();
            
            // Barbed wire deco on the base bottom
            ctx.strokeStyle = '#52525b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < 60; i += 10) {
                const wx = this.team === 'player' ? drawX + 45 + i/3 : drawX - 45 - i/3;
                ctx.arc(wx, GROUND_Y - 10 - i, 8, 0, Math.PI * 2);
            }
            ctx.stroke();
        } 
        else if (era === 4) { // Future Age (Neon Chrome Obelisk/Dome)
            ctx.beginPath();
            if (this.team === 'player') {
                ctx.moveTo(drawX - 50, GROUND_Y);
                ctx.lineTo(drawX - 30, GROUND_Y - 270);
                ctx.lineTo(drawX + 20, GROUND_Y - 270);
                ctx.lineTo(drawX + 45, GROUND_Y);
            } else {
                ctx.moveTo(drawX + 50, GROUND_Y);
                ctx.lineTo(drawX + 30, GROUND_Y - 270);
                ctx.lineTo(drawX - 20, GROUND_Y - 270);
                ctx.lineTo(drawX - 45, GROUND_Y);
            }
            ctx.fill();
            ctx.stroke();
            
            // Glowing Energy conduit
            const pulse = Math.abs(Math.sin(Date.now() / 400)) * 5;
            ctx.shadowBlur = 10 + pulse;
            ctx.shadowColor = '#38bdf8';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(drawX, GROUND_Y);
            ctx.lineTo(drawX, GROUND_Y - 240);
            ctx.stroke();
            ctx.shadowBlur = 0; // reset
        }
        
        ctx.restore();
        
        // Draw active towers on the base
        for (let tower of this.towers) {
            tower.draw(ctx, cameraX, game);
        }
    }
}

// ==========================================================================
// PROJECTILE CLASS
// ==========================================================================

class Projectile {
    constructor(startX, startY, target, team, damage, type, speedMultiplier = 1.0, splashRadius = 0, startZ = 450) {
        this.startX = startX;
        this.startY = startY;
        this.startZ = startZ;
        this.x = startX;
        this.y = startY;
        this.z = startZ;
        this.target = target; // Unit instance or Base instance
        this.team = team;
        this.damage = damage;
        this.type = type; // 'pebble', 'spear', 'arrow', 'bolt', 'firepot', 'bullet', 'grenade', 'shell', 'plasma'
        this.splashRadius = splashRadius; // >0 => area-of-effect (special attacks, missed lobs)
        this.t = 0; // Interpolation factor (0 to 1)
        // Lane depth: fly straight in the lane unless the target has its own z
        this.targetZ = (target && target.z !== undefined) ? target.z : startZ;
        
        // Speed scaling based on type
        let baseSpeed = 0.02;
        if (type === 'bullet' || type === 'laser') baseSpeed = 0.08;
        if (type === 'plasma') baseSpeed = 0.04;
        if (type === 'arrow' || type === 'bolt') baseSpeed = 0.025;
        if (type === 'firepot' || type === 'pebble') baseSpeed = 0.018;
        
        this.speed = baseSpeed * speedMultiplier;
        
        // For parabolic height tracking
        this.maxHeight = 0;
        if (type === 'arrow' || type === 'spear' || type === 'bolt' || type === 'firepot' || type === 'pebble' || type === 'grenade') {
            const dist = Math.abs(target.x - startX);
            this.maxHeight = Math.min(180, dist * 0.35); // taller arcs for further targets
        }
        
        // Record final target position in case target dies
        this.targetX = target.x;
        this.targetY = target.y - (target.height ? target.height / 2 : 50);
        this.isDead = false;
    }

    update(dt, game) {
        if (this.isDead) return;
        
        // Handle delta time speed adjustments
        const speedScale = dt / 16.666;
        this.t = Math.min(1.0, this.t + this.speed * speedScale);
        
        // Update target position if it's still alive
        if (this.target && this.target.hp > 0) {
            this.targetX = this.target.x;
            this.targetY = this.target.y - (this.target.height ? this.target.height / 2 : 50);
            if (this.target.z !== undefined) this.targetZ = this.target.z;
        }

        // Calculate coordinate
        this.x = this.startX + (this.targetX - this.startX) * this.t;
        this.z = this.startZ + (this.targetZ - this.startZ) * this.t;

        if (this.maxHeight > 0) {
            // Parabolic Arc
            this.y = this.startY + (this.targetY - this.startY) * this.t - this.maxHeight * Math.sin(this.t * Math.PI);
        } else {
            // Straight Vector
            this.y = this.startY + (this.targetY - this.startY) * this.t;
        }
        
        // Collision / Arrival Check
        if (this.t >= 1.0) {
            this.isDead = true;
            this.impact(game);
        }
    }

    applySplash(game) {
        const r = this.splashRadius;
        const enemies = this.team === 'player' ? game.enemyUnits : game.playerUnits;
        const enemyBase = this.team === 'player' ? game.enemyBase : game.playerBase;

        // Base sits at its corner (world x,z) -> radial distance
        if (Math.hypot(enemyBase.x - this.x, (enemyBase.z ?? 0) - (this.z ?? 0)) < r) {
            enemyBase.takeDamage(Math.round(this.damage * 0.5));
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
            const unit = enemies[i];
            if (unit.state === 'die') continue;
            const dist = Math.hypot(unit.x - this.x, (unit.z ?? 0) - (this.z ?? 0));
            if (dist < r) {
                const falloff = 1 - (dist / r) * 0.4; // heavier damage near the epicenter
                unit.takeDamage(Math.round(this.damage * falloff), game);
            }
        }
    }

    impact(game) {
        // Hit effects & Damage
        if (this.splashRadius > 0) {
            // Area-of-effect: special attacks and lobbed shots whose target vanished mid-air.
            // (This also guards against dummy "ground targets" that have no takeDamage()).
            this.applySplash(game);
        } else if (this.target && this.target.hp > 0 && typeof this.target.takeDamage === 'function') {
            // Apply shield mitigation (Medieval Knight takes less projectile damage)
            let actualDmg = this.damage;
            if (this.target.type === 'shielded_melee' &&
                (this.type === 'arrow' || this.type === 'bolt' || this.type === 'pebble' || this.type === 'bullet')) {
                actualDmg = Math.round(this.damage * 0.4); // 60% mitigation!
                // Spark indicator of shield hit (world z so it lands on the target's lane)
                game.particles.push(new Particle(this.x, this.y, '#e2e8f0', 'spark', '', 5, this.z));
            }
            this.target.takeDamage(actualDmg, game);
        } else if (this.maxHeight > 0 && (this.type === 'firepot' || this.type === 'grenade')) {
            // A lobbed shot whose target died mid-air still bursts where it lands
            this.splashRadius = this.type === 'firepot' ? 70 : 45;
            this.applySplash(game);
        }

        // Spawn Particles based on projectile type — all carry the projectile's world z
        // so the 3D FX bridge places the impact on the correct lane.
        if (this.type === 'firepot') {
            for (let i = 0; i < 15; i++) {
                game.particles.push(new Particle(this.x, this.y, '#f59e0b', 'fire', '', null, this.z));
                game.particles.push(new Particle(this.x, this.y, '#4b5563', 'smoke', '', null, this.z));
            }
        } else if (this.type === 'grenade' || this.type === 'shell') {
            for (let i = 0; i < 12; i++) {
                game.particles.push(new Particle(this.x, this.y, '#ef4444', 'fire', '', null, this.z));
                game.particles.push(new Particle(this.x, this.y, '#71717a', 'smoke', '', null, this.z));
            }
        } else if (this.type === 'plasma') {
            for (let i = 0; i < 8; i++) {
                game.particles.push(new Particle(this.x, this.y, '#38bdf8', 'spark', '', null, this.z));
            }
        } else {
            // Standard small spark / blood splat
            const hitColor = (this.target && this.target.hp > 0 && this.target.height) ? '#ef4444' : '#f59e0b';
            const particleType = hitColor === '#ef4444' ? 'blood' : 'spark';
            for (let i = 0; i < 5; i++) {
                game.particles.push(new Particle(this.x, this.y, hitColor, particleType, '', null, this.z));
            }
        }
    }

    draw(ctx, cameraX) {
        const drawX = this.x - cameraX;
        
        ctx.save();
        ctx.fillStyle = this.team === 'player' ? '#60a5fa' : '#f87171';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        
        // Draw projectile paths based on type
        if (this.type === 'pebble') {
            ctx.fillStyle = '#78716c';
            ctx.beginPath();
            ctx.arc(drawX, this.y, 4, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (this.type === 'spear') {
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(drawX - 10, this.y);
            ctx.lineTo(drawX + 10, this.y);
            ctx.stroke();
            // stone tip
            ctx.fillStyle = '#a8a29e';
            ctx.beginPath();
            ctx.arc(this.team === 'player' ? drawX + 10 : drawX - 10, this.y, 3, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (this.type === 'arrow') {
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(drawX - 8, this.y);
            ctx.lineTo(drawX + 8, this.y);
            ctx.stroke();
        } 
        else if (this.type === 'bolt') {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(drawX - 6, this.y);
            ctx.lineTo(drawX + 6, this.y);
            ctx.stroke();
        } 
        else if (this.type === 'firepot') {
            // flaming ball
            const pulse = Math.abs(Math.sin(Date.now() / 50)) * 3;
            ctx.fillStyle = '#ea580c';
            ctx.shadowBlur = 6 + pulse;
            ctx.shadowColor = '#f97316';
            ctx.beginPath();
            ctx.arc(drawX, this.y, 7, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (this.type === 'bullet') {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(drawX, this.y, 2, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (this.type === 'grenade') {
            ctx.fillStyle = '#1e3a8a';
            ctx.beginPath();
            ctx.arc(drawX, this.y, 4, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (this.type === 'shell') {
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.rect(drawX - 6, this.y - 3, 12, 6);
            ctx.fill();
        } 
        else if (this.type === 'plasma') {
            const glow = Math.abs(Math.sin(Date.now() / 100)) * 5;
            ctx.shadowBlur = 8 + glow;
            ctx.shadowColor = '#38bdf8';
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(drawX, this.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// ==========================================================================
// UNIT CLASS
// ==========================================================================

class Unit {
    constructor(era, typeIndex, team, stats) {
        this.era = era;
        this.typeIndex = typeIndex; // 0, 1, or 2
        this.team = team;
        
        // Extract stats
        this.name = stats.name;
        this.cost = stats.cost;
        this.hp = stats.hp;
        this.maxHp = stats.hp;
        this.damage = stats.damage;
        this.speed = stats.speed;
        this.attackRange = stats.range;
        this.attackCooldown = stats.cooldown;
        this.goldReward = stats.goldReward;
        this.xpReward = stats.xpReward;
        this.type = stats.type; // 'melee', 'ranged', 'heavy_melee', 'hitscan', 'laser', 'laser_heavy'
        this.projectileType = stats.projectile;
        this.width = stats.width;
        this.height = stats.height;
        
        // Spawning details
        this.y = GROUND_Y;

        // Lane / arc-length position (set properly by Game.addUnitFree).
        // The unit advances by `dist` along its lane; world (x,z) is derived from posAt().
        this.lane = 'mid';
        this.dist = 0;         // arc-length from the player corner (0 .. laneLength)
        this.heading = 0;      // render heading (radians about Y)
        this.x = team === 'player' ? PLAYER_CORNER.x : ENEMY_CORNER.x;
        this.z = team === 'player' ? PLAYER_CORNER.z : ENEMY_CORNER.z;

        this.attackTimer = 0;
        this.state = 'walk'; // 'walk', 'attack', 'die'
        this.deathProgress = 0;
        this.animTimer = Math.random() * 100; // randomized foot offset
        
        this.target = null;
        this.isBlocked = false;
        this.facing = team === 'player' ? 1 : -1;
    }

    takeDamage(amount, game) {
        if (this.state === 'die') return;
        this.hp = Math.max(0, this.hp - amount);
        
        // Blood splat particle — carry the unit's world z so the 3D FX lands on the right lane
        game.particles.push(new Particle(
            this.x + (Math.random() - 0.5) * 10,
            this.y - this.height / 2 + (Math.random() - 0.5) * 10,
            '#dc2626',
            'blood',
            '', null, this.z
        ));

        // Damage floating indicator (world z so the "-N" floats over the hit unit)
        game.particles.push(new Particle(
            this.x,
            this.y - this.height - 5,
            '#ef4444',
            'text',
            `-${amount}`,
            null, this.z
        ));

        if (this.hp <= 0) {
            this.state = 'die';
            // Reward the opposing commander's economy
            if (this.team === 'enemy') {
                game.addGold(this.goldReward);
                game.statsKilled++;
                // Floating "+Xg" bounty so the player sees the reward for the kill
                game.particles.push(new Particle(this.x, this.y - this.height - 12, '#fbbf24', 'text', `+${this.goldReward}g`, 15, this.z));
                sfx('kill_gold', { throttle: 130, volume: 0.6 });
            } else {
                game.awardEnemy(this.goldReward);
            }
        }
    }

    update(dt, game) {
        if (this.state === 'die') {
            const speedScale = dt / 16.666;
            this.deathProgress += 0.05 * speedScale;
            if (this.deathProgress >= 1.0) {
                // Remove unit
                const list = this.team === 'player' ? game.playerUnits : game.enemyUnits;
                const idx = list.indexOf(this);
                if (idx !== -1) list.splice(idx, 1);
            }
            return;
        }

        // Increment attack timers
        if (this.attackTimer > 0) {
            this.attackTimer -= dt;
        }

        // Scan Combat and Movement
        this.scanBattlefield(game);
        
        // State actions
        if (this.state === 'attack') {
            this.performAttack(dt, game);
        } else if (this.state === 'walk' && !this.isBlocked) {
            const speedScale = dt / 16.666;
            const len = laneLength(this.lane);
            this.dist += this.speed * this.facing * speedScale;
            if (this.dist < 0) this.dist = 0;
            else if (this.dist > len) this.dist = len;
            const p = posAt(this.lane, this.dist);
            this.x = p.x; this.z = p.z;
            this.heading = headingAt(this.lane, this.dist, this.facing);
            this.animTimer += this.speed * 0.15 * speedScale;
        }
    }

    isRanged() {
        return RANGED_TYPES.indexOf(this.type) !== -1;
    }

    // Effective attack range including the team's purchased range upgrade (ranged units only)
    getRange(game) {
        return this.attackRange + (this.isRanged() ? game.rangeBonus(this.team) : 0);
    }

    scanBattlefield(game) {
        const enemies = this.team === 'player' ? game.enemyUnits : game.playerUnits;
        const teammates = this.team === 'player' ? game.playerUnits : game.enemyUnits;
        const enemyBase = this.team === 'player' ? game.enemyBase : game.playerBase;
        const range = this.getRange(game);
        const len = laneLength(this.lane);

        // 1. Check for nearest enemy unit AHEAD on the same lane (compared via arc-length dist)
        let closestEnemy = null;
        let closestEnemyDist = 99999;

        for (let enemy of enemies) {
            if (enemy.state === 'die') continue;
            if (enemy.lane !== this.lane) continue; // combat is same-lane only

            // "Ahead" in the direction of travel: player advances up-dist, enemy down-dist
            const isAhead = this.facing > 0 ? (enemy.dist > this.dist) : (enemy.dist < this.dist);
            if (isAhead) {
                const dist = Math.abs(enemy.dist - this.dist) - (this.width / 2 + enemy.width / 2);
                if (dist < closestEnemyDist) {
                    closestEnemyDist = dist;
                    closestEnemy = enemy;
                }
            }
        }

        // 2. Distance to the enemy base (arc-length from the lane's far end)
        const baseDist = this.facing > 0 ? (len - this.dist - BASE_REACH) : (this.dist - BASE_REACH);

        // 3. Combat Decision
        if (closestEnemy && closestEnemyDist <= range) {
            this.state = 'attack';
            this.target = closestEnemy;
            return;
        }
        else if (baseDist <= range) {
            this.state = 'attack';
            this.target = enemyBase;
            return;
        }

        // 4. Teammate spacing blocking (same-lane, ahead, via dist)
        this.isBlocked = false;
        const teammateSpacingThreshold = 8;

        for (let mate of teammates) {
            if (mate === this || mate.state === 'die') continue;
            if (mate.lane !== this.lane) continue; // only block same-lane teammates

            const isAhead = this.facing > 0 ? (mate.dist > this.dist) : (mate.dist < this.dist);
            if (isAhead) {
                const dist = Math.abs(mate.dist - this.dist) - (this.width / 2 + mate.width / 2);
                if (dist < teammateSpacingThreshold) {
                    this.isBlocked = true;
                    this.state = 'walk'; // stay in walking animation frame, just stopped
                    return;
                }
            }
        }

        // Default to walking
        this.state = 'walk';
        this.target = null;
    }

    performAttack(dt, game) {
        if (!this.target || this.target.hp <= 0) {
            this.state = 'walk';
            this.target = null;
            return;
        }
        
        // Verify target is still within attack range (handles movement shifts).
        // Units compare via arc-length dist on the same lane; the base via lane-end reach.
        let dist;
        if (this.target instanceof Base) {
            const len = laneLength(this.lane);
            dist = this.facing > 0 ? (len - this.dist - BASE_REACH) : (this.dist - BASE_REACH);
        } else if (this.target.lane === this.lane && typeof this.target.dist === 'number') {
            dist = Math.abs(this.target.dist - this.dist) - (this.width / 2 + this.target.width / 2);
        } else {
            dist = Math.hypot(this.target.x - this.x, (this.target.z ?? 0) - (this.z ?? 0)) - (this.width / 2 + this.target.width / 2);
        }
        if (dist > this.getRange(game) + 15) {
            this.state = 'walk';
            this.target = null;
            return;
        }
        
        // Attack execution when timer finishes
        if (this.attackTimer <= 0) {
            this.attackTimer = this.attackCooldown;

            // Battle SFX (throttled globally so it's ambience, not a cacophony)
            const melee = (this.type === 'melee' || this.type === 'heavy_melee' || this.type === 'shielded_melee');
            sfx(melee ? 'attack_melee' : 'attack_ranged', { throttle: 110, volume: 0.5 });

            // Melee vs Ranged action
            if (this.type === 'melee' || this.type === 'heavy_melee' || this.type === 'shielded_melee') {
                // Immediate damage to target
                this.target.takeDamage(this.damage, game);

                // Strike impact splash particle (on the unit center, with world z)
                game.particles.push(new Particle(this.x, this.y - this.height / 2, '#fbbf24', 'spark', '', 3, this.z));
            } 
            else if (this.type === 'ranged') {
                // Spawn projectile
                const projX = this.x + (this.width / 2) * this.facing;
                const projY = this.y - this.height * 0.7;
                game.projectiles.push(new Projectile(
                    projX,
                    projY,
                    this.target,
                    this.team,
                    this.damage,
                    this.projectileType,
                    1.0, 0, this.z
                ));
            }
            else if (this.type === 'hitscan') {
                // Instant bullet fire visual
                const muzzleY = this.y - this.height * 0.75;
                const targetY = this.target.y - (this.target.height ? this.target.height / 2 : 50);

                // Muzzle flash on the shooter (world z = this.z)
                game.particles.push(new Particle(this.x, muzzleY, '#fbbf24', 'spark', '', 5, this.z)); // flash

                // Hit spark on the target — carry the target's world z so it lands on its lane
                game.particles.push(new Particle(this.target.x, targetY, '#ef4444', 'spark', '', 3, this.target.z ?? this.z));
                this.target.takeDamage(this.damage, game);
            }
            else if (this.type === 'laser') {
                // Neon blue laser projectile
                const projX = this.x + (this.width / 2) * this.facing;
                const projY = this.y - this.height * 0.7;
                game.projectiles.push(new Projectile(
                    projX,
                    projY,
                    this.target,
                    this.team,
                    this.damage,
                    'plasma',
                    1.8, 0, this.z // fast speed
                ));
            }
            else if (this.type === 'laser_heavy') {
                // Heavy walker twin beams
                const baseMuzzleY = this.y - this.height * 0.75;
                const muzzleX = this.x + (this.width / 2) * this.facing;

                game.projectiles.push(new Projectile(muzzleX, baseMuzzleY - 10, this.target, this.team, Math.round(this.damage / 2), 'plasma', 2.0, 0, this.z));
                game.projectiles.push(new Projectile(muzzleX, baseMuzzleY + 10, this.target, this.team, Math.round(this.damage / 2), 'plasma', 2.0, 0, this.z));
            }
        }
    }

    draw(ctx, cameraX) {
        const drawX = this.x - cameraX;
        
        ctx.save();
        
        // Handle death falling rotation & fading
        if (this.state === 'die') {
            ctx.globalAlpha = Math.max(0, 1 - this.deathProgress);
            ctx.translate(drawX, this.y);
            ctx.rotate(this.facing * Math.PI * 0.5 * this.deathProgress);
            ctx.translate(-drawX, -this.y);
        }
        
        // Colors & graphics theme setup
        const isPlayer = this.team === 'player';
        const primaryColor = isPlayer ? '#2563eb' : '#dc2626'; // Blue / Red team colors
        const detailColor = isPlayer ? '#60a5fa' : '#f87171';
        
        // Draw HP bar above active unit
        if (this.state !== 'die') {
            const hpBarW = this.width;
            const hpBarH = 4;
            const hpBarX = drawX - hpBarW / 2;
            const hpBarY = this.y - this.height - 8;
            
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
            
            ctx.fillStyle = this.team === 'player' ? '#10b981' : '#ef4444';
            const hpRatio = Math.max(0, this.hp / this.maxHp);
            ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
        }
        
        // Draw the procedural pixel-styled unit sprite
        ctx.fillStyle = primaryColor;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        
        // Walk animation: swing feet based on animTimer sine wave
        const feetSwing = this.state === 'walk' && !this.isBlocked ? Math.sin(this.animTimer) * 8 : 0;
        
        // --------------------------------------------------
        // STONE AGE DRAWINGS (ERA 0)
        // --------------------------------------------------
        if (this.era === 0) {
            if (this.typeIndex === 0) { // Clubman
                // Caveman skin color
                ctx.fillStyle = '#d97706';
                ctx.beginPath();
                ctx.arc(drawX, this.y - 32, 6, 0, Math.PI * 2); // Head
                ctx.fill();
                // Leopard cloth body
                ctx.fillStyle = '#ca8a04';
                ctx.beginPath();
                ctx.rect(drawX - 7, this.y - 26, 14, 16);
                ctx.fill();
                ctx.stroke();
                // Legs
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(drawX - 4, this.y - 10);
                ctx.lineTo(drawX - 4 + feetSwing, this.y);
                ctx.moveTo(drawX + 4, this.y - 10);
                ctx.lineTo(drawX + 4 - feetSwing, this.y);
                ctx.stroke();
                // Weapon: Wooden Club
                ctx.save();
                ctx.translate(drawX + 6 * this.facing, this.y - 20);
                if (this.state === 'attack' && this.attackTimer > this.attackCooldown * 0.5) {
                    ctx.rotate(this.facing * -Math.PI * 0.4); // swing posture
                }
                ctx.fillStyle = '#78350f';
                ctx.beginPath();
                ctx.rect(-3, -15, 6, 15);
                ctx.fill();
                ctx.restore();
            } 
            else if (this.typeIndex === 1) { // Spearman
                ctx.fillStyle = '#d97706';
                ctx.beginPath();
                ctx.arc(drawX, this.y - 32, 6, 0, Math.PI * 2); // Head
                ctx.fill();
                // Greenish leaves tunic
                ctx.fillStyle = '#15803d';
                ctx.beginPath();
                ctx.rect(drawX - 7, this.y - 26, 14, 16);
                ctx.fill();
                ctx.stroke();
                // Legs
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(drawX - 4, this.y - 10);
                ctx.lineTo(drawX - 4 + feetSwing, this.y);
                ctx.moveTo(drawX + 4, this.y - 10);
                ctx.lineTo(drawX + 4 - feetSwing, this.y);
                ctx.stroke();
                // Spear weapon in hand
                ctx.strokeStyle = '#78716c';
                ctx.lineWidth = 2;
                ctx.beginPath();
                const spearOffset = (this.state === 'attack' && this.attackTimer > this.attackCooldown * 0.5) ? 10 * this.facing : 0;
                ctx.moveTo(drawX - 4 * this.facing + spearOffset, this.y - 30);
                ctx.lineTo(drawX + 16 * this.facing + spearOffset, this.y - 18);
                ctx.stroke();
            } 
            else if (this.typeIndex === 2) { // Mammoth Rider
                // Huge Mammoth Body
                ctx.fillStyle = '#7c2d12'; // dark hairy brown
                ctx.beginPath();
                ctx.roundRect(drawX - 30, this.y - 48, 60, 36, 12);
                ctx.fill();
                ctx.stroke();
                // Chunky legs
                ctx.fillStyle = '#4c1d95'; // boots/shading
                ctx.strokeStyle = '#7c2d12';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(drawX - 18, this.y - 12);
                ctx.lineTo(drawX - 18 + feetSwing * 0.5, this.y);
                ctx.moveTo(drawX + 18, this.y - 12);
                ctx.lineTo(drawX + 18 - feetSwing * 0.5, this.y);
                ctx.stroke();
                // Head / Trunk / Tusks
                ctx.fillStyle = '#541c09';
                ctx.beginPath();
                ctx.arc(drawX + 25 * this.facing, this.y - 38, 14, 0, Math.PI*2);
                ctx.fill();
                // Tusks (white crescent curves)
                ctx.strokeStyle = '#f8fafc';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(drawX + 32 * this.facing, this.y - 32, 10, 0, Math.PI * 0.5 * this.facing, this.facing < 0);
                ctx.stroke();
                // Spearman rider on top
                ctx.fillStyle = '#d97706';
                ctx.beginPath();
                ctx.arc(drawX - 5 * this.facing, this.y - 62, 5, 0, Math.PI * 2); // Head
                ctx.fill();
                ctx.fillStyle = primaryColor;
                ctx.beginPath();
                ctx.rect(drawX - 10 * this.facing, this.y - 57, 10, 10);
                ctx.fill();
                ctx.stroke();
            }
        }
        // --------------------------------------------------
        // ANCIENT AGE DRAWINGS (ERA 1)
        // --------------------------------------------------
        else if (this.era === 1) {
            if (this.typeIndex === 0) { // Hoplite
                // Golden Helmet
                ctx.fillStyle = '#ca8a04';
                ctx.beginPath();
                ctx.arc(drawX, this.y - 34, 6, 0, Math.PI * 2);
                ctx.fill();
                // Plume
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.rect(drawX - 2, this.y - 44, 4, 10);
                ctx.fill();
                // Bronze Breastplate
                ctx.fillStyle = '#d97706';
                ctx.beginPath();
                ctx.rect(drawX - 7, this.y - 28, 14, 18);
                ctx.fill();
                ctx.stroke();
                // Shield (draw in front of body)
                ctx.fillStyle = '#b45309';
                ctx.beginPath();
                ctx.arc(drawX + 8 * this.facing, this.y - 20, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Spear tip pointing forward
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(drawX, this.y - 20);
                ctx.lineTo(drawX + 20 * this.facing, this.y - 20);
                ctx.stroke();
                // Legs
                ctx.strokeStyle = '#d97706';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(drawX - 4, this.y - 10);
                ctx.lineTo(drawX - 4 + feetSwing, this.y);
                ctx.moveTo(drawX + 4, this.y - 10);
                ctx.lineTo(drawX + 4 - feetSwing, this.y);
                ctx.stroke();
            } 
            else if (this.typeIndex === 1) { // Archer
                // Bronze head helmet
                ctx.fillStyle = '#94a3b8';
                ctx.beginPath();
                ctx.arc(drawX, this.y - 32, 6, 0, Math.PI * 2);
                ctx.fill();
                // Tunic
                ctx.fillStyle = '#1e3a8a';
                ctx.beginPath();
                ctx.rect(drawX - 6, this.y - 26, 12, 16);
                ctx.fill();
                ctx.stroke();
                // Bow weapon
                ctx.strokeStyle = '#b45309';
                ctx.lineWidth = 2;
                ctx.beginPath();
                // Draw curve
                ctx.arc(drawX + 6 * this.facing, this.y - 20, 8, -Math.PI*0.4, Math.PI*0.4);
                ctx.stroke();
                // Legs
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(drawX - 4, this.y - 10);
                ctx.lineTo(drawX - 4 + feetSwing, this.y);
                ctx.moveTo(drawX + 4, this.y - 10);
                ctx.lineTo(drawX + 4 - feetSwing, this.y);
                ctx.stroke();
            } 
            else if (this.typeIndex === 2) { // War Chariot
                // Chariot Cart base
                ctx.fillStyle = '#b45309';
                ctx.beginPath();
                ctx.rect(drawX - 25 * this.facing - 10, this.y - 24, 25, 14);
                ctx.fill();
                ctx.stroke();
                // Wheel
                ctx.fillStyle = '#451a03';
                ctx.beginPath();
                ctx.arc(drawX - 25 * this.facing, this.y - 10, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Hoplite Driver
                ctx.fillStyle = '#d97706';
                ctx.beginPath();
                ctx.arc(drawX - 20 * this.facing, this.y - 38, 5, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = primaryColor;
                ctx.beginPath();
                ctx.rect(drawX - 25 * this.facing, this.y - 33, 10, 10);
                ctx.fill();
                ctx.stroke();
                // Horse in front pulling
                ctx.fillStyle = '#78350f';
                ctx.beginPath();
                ctx.roundRect(drawX + 2 * this.facing - 12, this.y - 36, 24, 20, 6); // horse torso
                ctx.arc(drawX + 15 * this.facing, this.y - 42, 6, 0, Math.PI * 2); // horse head
                ctx.fill();
                // Legs (4 lines swinging)
                ctx.strokeStyle = '#451a03';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(drawX + 10 * this.facing, this.y - 18);
                ctx.lineTo(drawX + 10 * this.facing + feetSwing, this.y);
                ctx.moveTo(drawX - 6 * this.facing, this.y - 18);
                ctx.lineTo(drawX - 6 * this.facing - feetSwing, this.y);
                ctx.stroke();
            }
        }
        // --------------------------------------------------
        // MEDIEVAL AGE DRAWINGS (ERA 2)
        // --------------------------------------------------
        else if (this.era === 2) {
            if (this.typeIndex === 0) { // Knight
                // Silver Helmet and armor
                ctx.fillStyle = '#94a3b8';
                ctx.beginPath();
                ctx.arc(drawX, this.y - 34, 6, 0, Math.PI * 2);
                ctx.fill();
                // Red plume
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.moveTo(drawX, this.y - 40);
                ctx.lineTo(drawX - 8 * this.facing, this.y - 44);
                ctx.lineTo(drawX - 4 * this.facing, this.y - 38);
                ctx.closePath();
                ctx.fill();
                // Heavy breastplate
                ctx.fillStyle = '#64748b';
                ctx.beginPath();
                ctx.rect(drawX - 8, this.y - 28, 16, 18);
                ctx.fill();
                ctx.stroke();
                // Heater Shield (pointed bottom)
                ctx.fillStyle = detailColor;
                ctx.beginPath();
                const sx = drawX + 7 * this.facing;
                const sy = this.y - 22;
                ctx.moveTo(sx - 7, sy);
                ctx.lineTo(sx + 7, sy);
                ctx.lineTo(sx + 5, sy + 10);
                ctx.lineTo(sx, sy + 15);
                ctx.lineTo(sx - 5, sy + 10);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Sword raised
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(drawX - 4 * this.facing, this.y - 20);
                ctx.lineTo(drawX - 8 * this.facing, this.y - 36);
                ctx.stroke();
                // Legs
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.moveTo(drawX - 4, this.y - 10);
                ctx.lineTo(drawX - 4 + feetSwing, this.y);
                ctx.moveTo(drawX + 4, this.y - 10);
                ctx.lineTo(drawX + 4 - feetSwing, this.y);
                ctx.stroke();
            } 
            else if (this.typeIndex === 1) { // Crossbowman
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.arc(drawX, this.y - 32, 6, 0, Math.PI * 2); // Head
                ctx.fill();
                // Leather brigandine armor
                ctx.fillStyle = '#7c2d12';
                ctx.beginPath();
                ctx.rect(drawX - 7, this.y - 26, 14, 16);
                ctx.fill();
                ctx.stroke();
                // Crossbow horizontal limbs
                ctx.strokeStyle = '#7c3aed';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(drawX + 5 * this.facing, this.y - 22);
                ctx.lineTo(drawX + 18 * this.facing, this.y - 22);
                ctx.stroke();
                // Legs
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(drawX - 4, this.y - 10);
                ctx.lineTo(drawX - 4 + feetSwing, this.y);
                ctx.moveTo(drawX + 4, this.y - 10);
                ctx.lineTo(drawX + 4 - feetSwing, this.y);
                ctx.stroke();
            } 
            else if (this.typeIndex === 2) { // Catapult
                // Large Wooden Wheel Base
                ctx.fillStyle = '#78350f';
                ctx.beginPath();
                ctx.roundRect(drawX - 25, this.y - 30, 50, 18, 4);
                ctx.fill();
                ctx.stroke();
                // Wheels
                ctx.fillStyle = '#451a03';
                ctx.beginPath();
                ctx.arc(drawX - 16, this.y - 10, 10, 0, Math.PI * 2);
                ctx.arc(drawX + 16, this.y - 10, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Flinging Arm
                ctx.strokeStyle = '#b45309';
                ctx.lineWidth = 4;
                ctx.beginPath();
                if (this.state === 'attack' && this.attackTimer > this.attackCooldown * 0.7) {
                    // Arm pulled down back
                    ctx.moveTo(drawX, this.y - 24);
                    ctx.lineTo(drawX - 25 * this.facing, this.y - 30);
                    // Bucket with firepot
                    ctx.fillStyle = '#ea580c';
                    ctx.beginPath();
                    ctx.arc(drawX - 25 * this.facing, this.y - 30, 5, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Arm fired/neutral
                    ctx.moveTo(drawX, this.y - 24);
                    ctx.lineTo(drawX + 15 * this.facing, this.y - 48);
                    // Empty bucket
                    ctx.fillStyle = '#78350f';
                    ctx.beginPath();
                    ctx.arc(drawX + 15 * this.facing, this.y - 48, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.stroke();
            }
        }
        // --------------------------------------------------
        // MODERN AGE DRAWINGS (ERA 3)
        // --------------------------------------------------
        else if (this.era === 3) {
            if (this.typeIndex === 0) { // Rifleman
                // Green camo helmet
                ctx.fillStyle = '#3f6212';
                ctx.beginPath();
                ctx.arc(drawX, this.y - 34, 6, 0, Math.PI * 2);
                ctx.fill();
                // Camo Uniform
                ctx.fillStyle = '#4d7c0f';
                ctx.beginPath();
                ctx.rect(drawX - 7, this.y - 28, 14, 18);
                ctx.fill();
                ctx.stroke();
                // Rifle held forward
                ctx.strokeStyle = '#18181b';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(drawX, this.y - 22);
                ctx.lineTo(drawX + 16 * this.facing, this.y - 22);
                ctx.stroke();
                // Legs
                ctx.strokeStyle = '#1a2e05';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(drawX - 4, this.y - 10);
                ctx.lineTo(drawX - 4 + feetSwing, this.y);
                ctx.moveTo(drawX + 4, this.y - 10);
                ctx.lineTo(drawX + 4 - feetSwing, this.y);
                ctx.stroke();
            } 
            else if (this.typeIndex === 1) { // Grenadier
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(drawX, this.y - 34, 6, 0, Math.PI * 2); // Head
                ctx.fill();
                // Blue coat Uniform
                ctx.fillStyle = '#1e3a8a';
                ctx.beginPath();
                ctx.rect(drawX - 7, this.y - 28, 14, 18);
                ctx.fill();
                ctx.stroke();
                // Grenade Launcher weapon
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(drawX, this.y - 22);
                ctx.lineTo(drawX + 12 * this.facing, this.y - 20);
                ctx.stroke();
                // Legs
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(drawX - 4, this.y - 10);
                ctx.lineTo(drawX - 4 + feetSwing, this.y);
                ctx.moveTo(drawX + 4, this.y - 10);
                ctx.lineTo(drawX + 4 - feetSwing, this.y);
                ctx.stroke();
            } 
            else if (this.typeIndex === 2) { // Tank
                // Tank Hull
                ctx.fillStyle = '#166534'; // camo forest green
                ctx.beginPath();
                ctx.roundRect(drawX - 35, this.y - 32, 70, 22, 6);
                ctx.fill();
                ctx.stroke();
                // Tank Turret top
                ctx.fillStyle = '#14532d';
                ctx.beginPath();
                ctx.arc(drawX, this.y - 32, 14, Math.PI, 0);
                ctx.fill();
                ctx.stroke();
                // Tank Barrel
                ctx.strokeStyle = '#14532d';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(drawX, this.y - 38);
                ctx.lineTo(drawX + 45 * this.facing, this.y - 38);
                ctx.stroke();
                // Tracks / Wheels
                ctx.fillStyle = '#1f293d';
                ctx.beginPath();
                ctx.roundRect(drawX - 32, this.y - 12, 64, 12, 4);
                ctx.fill();
                ctx.stroke();
                // Track small wheels details
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc(drawX - 22, this.y - 6, 4, 0, Math.PI * 2);
                ctx.arc(drawX, this.y - 6, 4, 0, Math.PI * 2);
                ctx.arc(drawX + 22, this.y - 6, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // --------------------------------------------------
        // FUTURE AGE DRAWINGS (ERA 4)
        // --------------------------------------------------
        else if (this.era === 4) {
            if (this.typeIndex === 0) { // Laser Soldier
                // Chrome Helmet / cyan visor
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.arc(drawX, this.y - 34, 6, 0, Math.PI * 2);
                ctx.fill();
                // Visor glow
                ctx.fillStyle = '#06b6d4';
                ctx.beginPath();
                ctx.rect(this.facing === 1 ? drawX : drawX - 6, this.y - 36, 6, 3);
                ctx.fill();
                // Nano tech suit
                ctx.fillStyle = '#334155';
                ctx.beginPath();
                ctx.rect(drawX - 7, this.y - 28, 14, 18);
                ctx.fill();
                ctx.stroke();
                // Laser Rifle
                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(drawX, this.y - 22);
                ctx.lineTo(drawX + 16 * this.facing, this.y - 22);
                ctx.stroke();
                // Legs
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(drawX - 4, this.y - 10);
                ctx.lineTo(drawX - 4 + feetSwing, this.y);
                ctx.moveTo(drawX + 4, this.y - 10);
                ctx.lineTo(drawX + 4 - feetSwing, this.y);
                ctx.stroke();
            } 
            else if (this.typeIndex === 1) { // Drone
                // Hovering Sphere
                const pulse = Math.abs(Math.sin(Date.now() / 150)) * 6;
                ctx.shadowBlur = 8 + pulse;
                ctx.shadowColor = '#06b6d4';
                
                ctx.fillStyle = '#475569';
                ctx.beginPath();
                ctx.arc(drawX, this.y - 26, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.shadowBlur = 0; // reset
                
                // Sensor Visor (glowing core center)
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(drawX + 4 * this.facing, this.y - 26, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Thruster sparks dropping down (visual only)
                if (this.state === 'walk' && Math.random() < 0.2) {
                    game.particles.push(new Particle(this.x, this.y - 10, '#06b6d4', 'spark', '', 2));
                }
            } 
            else if (this.typeIndex === 2) { // Battle Mech (Titan Walker)
                // Mechanical legs
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 6;
                ctx.beginPath();
                // Left leg (upper/lower joints)
                ctx.moveTo(drawX - 16, this.y - 45);
                ctx.lineTo(drawX - 25 + feetSwing * 0.4, this.y - 20);
                ctx.lineTo(drawX - 20 + feetSwing * 0.4, this.y);
                // Right leg
                ctx.moveTo(drawX + 16, this.y - 45);
                ctx.lineTo(drawX + 25 - feetSwing * 0.4, this.y - 20);
                ctx.lineTo(drawX + 20 - feetSwing * 0.4, this.y);
                ctx.stroke();
                
                // Main Cabin Torso
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.roundRect(drawX - 30, this.y - 75, 60, 35, 8);
                ctx.fill();
                ctx.stroke();
                
                // Red glowing visor
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.rect(this.facing === 1 ? drawX + 10 : drawX - 24, this.y - 65, 14, 4);
                ctx.fill();
                
                // Shoulder Mounted Weapon Cannons
                ctx.fillStyle = '#475569';
                ctx.beginPath();
                ctx.rect(drawX - 15 * this.facing - 8, this.y - 88, 16, 14);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = '#0284c7';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(drawX, this.y - 82);
                ctx.lineTo(drawX + 45 * this.facing, this.y - 82);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
}

// ==========================================================================
// SPECIAL ATTACK CLASS
// ==========================================================================

class SpecialAttack {
    constructor(type, team, dmgMult = 1, targetX = null, targetZ = null) {
        this.type = type; // 'meteor', 'arrows', 'fireball', 'airstrike', 'orbitallaser'
        this.team = team;
        this.dmgMult = dmgMult; // scales all damage by the purchased special level
        this.timer = 0;
        this.duration = type === 'orbitallaser' ? 3000 : (type === 'airstrike' ? 2500 : 2000);
        this.isDead = false;

        // Placement center: where the player (or AI) aimed the special. Default to the
        // opponent's corner region if no target was supplied.
        this.opp = team === 'player' ? ENEMY_CORNER : PLAYER_CORNER;
        const clampMap = (v) => Math.max(60, Math.min(MAP_SIZE - 60, v));
        const tx = clampMap(Number.isFinite(targetX) ? targetX : this.opp.x);
        const tz = clampMap(Number.isFinite(targetZ) ? targetZ : this.opp.z);
        this.targetX = tx;
        this.targetZ = tz;

        this.projectilesToSpawn = [];
        // Scatter world (x,z) points within SPECIAL_RADIUS of the target center.
        const scatter = () => {
            const ang = Math.random() * Math.PI * 2;
            const rad = Math.sqrt(Math.random()) * SPECIAL_RADIUS; // uniform disc
            return {
                x: clampMap(tx + Math.cos(ang) * rad),
                z: clampMap(tz + Math.sin(ang) * rad),
            };
        };

        if (type === 'meteor') {
            for (let i = 0; i < 15; i++) { const p = scatter(); this.projectilesToSpawn.push({ delay: i * 120, x: p.x, z: p.z, spawned: false }); }
        } else if (type === 'arrows') {
            for (let i = 0; i < 50; i++) { const p = scatter(); this.projectilesToSpawn.push({ delay: i * 35, x: p.x, z: p.z, spawned: false }); }
        } else if (type === 'fireball') {
            for (let i = 0; i < 8; i++) { const p = scatter(); this.projectilesToSpawn.push({ delay: i * 220, x: p.x, z: p.z, spawned: false }); }
        } else if (type === 'airstrike') {
            // Carpet-bomb along the lane nearest the target, running the run THROUGH (tx,tz).
            this.airLane = nearestLaneTo(tx, tz);
            const len = laneLength(this.airLane);
            const center = distAlongLane(this.airLane, tx, tz);
            for (let i = 0; i < 8; i++) {
                // Sample points striding through the target center along the lane
                const d = center + (i - 4) * (SPECIAL_RADIUS / 4);
                const p = posAt(this.airLane, Math.max(0, Math.min(len, d)));
                this.projectilesToSpawn.push({ delay: 500 + i * 200, x: p.x, z: p.z, spawned: false });
            }
            // Plane flies in along the lane, approaching the target from behind.
            this.airFrom = Math.max(0, Math.min(len, center - SPECIAL_RADIUS));
            this.airTo = Math.max(0, Math.min(len, center + SPECIAL_RADIUS));
            const start = posAt(this.airLane, this.airFrom);
            this.airT = 0;
            this.x = start.x; this.z = start.z;
        } else if (type === 'orbitallaser') {
            // Beam parked at the target, sweeping across the placement radius (in z).
            this.laserX = tx;
            this.laserZ = tz - SPECIAL_RADIUS * 0.6;
            this.laserZEnd = tz + SPECIAL_RADIUS * 0.6;
            this.laserSpan = this.laserZEnd - this.laserZ; // total z travel over the duration
            this.x = this.laserX; this.z = this.laserZ;
        } else {
            this.x = tx; this.z = tz;
        }
    }

    update(dt, game) {
        this.timer += dt;
        if (this.timer >= this.duration) {
            this.isDead = true;
            return;
        }
        
        const speedScale = dt / 16.666;
        
        // Update spawning lists
        for (let item of this.projectilesToSpawn) {
            if (!item.spawned && this.timer >= item.delay) {
                item.spawned = true;
                this.triggerFall(item.x, item.z, game);
            }
        }

        if (this.type === 'airstrike') {
            // Sweep the plane along the chosen lane, running through the target center.
            const len = laneLength(this.airLane);
            this.airT = Math.min(1, this.airT + (dt / this.duration));
            const d = this.airFrom + (this.airTo - this.airFrom) * this.airT;
            const p = posAt(this.airLane, Math.max(0, Math.min(len, d)));
            this.x = p.x; this.z = p.z;
        }
        else if (this.type === 'orbitallaser') {
            // Sweep the beam across the placement radius around the target (in z),
            // covering the full span once over the special's duration.
            const sweep = (this.laserSpan / this.duration) * dt;
            this.laserZ = Math.min(this.laserZEnd, this.laserZ + sweep);
            this.z = this.laserZ; this.x = this.laserX;

            const laserRadius = 75;
            const enemies = this.team === 'player' ? game.enemyUnits : game.playerUnits;
            const enemyBase = this.team === 'player' ? game.enemyBase : game.playerBase;

            if (Math.hypot(enemyBase.x - this.laserX, (enemyBase.z ?? 0) - this.laserZ) < laserRadius) {
                enemyBase.takeDamage(Math.round(4 * this.dmgMult));
            }
            for (let unit of enemies) {
                if (unit.state === 'die') continue;
                if (Math.hypot(unit.x - this.laserX, (unit.z ?? 0) - this.laserZ) < laserRadius) {
                    unit.takeDamage(Math.round(8 * this.dmgMult), game);
                }
            }
            if (Math.random() < 0.8) {
                game.particles.push(new Particle(this.laserX + (Math.random() - 0.5) * 20, GROUND_Y, '#38bdf8', 'spark', '', 4, this.laserZ));
            }
        }
    }

    triggerFall(targetX, targetZ, game) {
        // Falling projectile aimed at a ground point (x, z); flies straight in z.
        const dummyTarget = { x: targetX, y: GROUND_Y, z: targetZ, hp: 1 };
        const m = this.dmgMult;
        if (this.type === 'meteor') {
            game.projectiles.push(new Projectile(targetX - 100, -50, dummyTarget, this.team, Math.round(45 * m), 'firepot', 0.8, 80, targetZ));
        } else if (this.type === 'arrows') {
            game.projectiles.push(new Projectile(targetX - 80, -40, dummyTarget, this.team, Math.round(18 * m), 'arrow', 1.3, 35, targetZ));
        } else if (this.type === 'fireball') {
            game.projectiles.push(new Projectile(targetX - 120, -50, dummyTarget, this.team, Math.round(95 * m), 'firepot', 0.6, 95, targetZ));
        } else if (this.type === 'airstrike') {
            game.projectiles.push(new Projectile(targetX, 80, dummyTarget, this.team, Math.round(250 * m), 'firepot', 1.5, 90, targetZ));
        }
    }

    draw(ctx, cameraX) {
        ctx.save();
        
        if (this.type === 'airstrike') {
            // Draw plane flying overhead
            const px = (this.x ?? 0) - cameraX;
            ctx.fillStyle = '#1e3a8a';
            ctx.beginPath();
            // Wing outline
            ctx.ellipse(px, 50, 24, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.rect(px - 16, 46, 32, 8);
            ctx.fill();
        } 
        else if (this.type === 'orbitallaser') {
            // Giant glowing neon vertical beam
            const lx = this.laserX - cameraX;
            const pulse = Math.abs(Math.sin(Date.now() / 80)) * 12;
            
            // Outer glow
            ctx.shadowBlur = 20 + pulse;
            ctx.shadowColor = '#06b6d4';
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
            ctx.lineWidth = 40 + pulse;
            ctx.beginPath();
            ctx.moveTo(lx, 0);
            ctx.lineTo(lx, GROUND_Y);
            ctx.stroke();
            
            // Inner Core
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 14 + pulse * 0.5;
            ctx.beginPath();
            ctx.moveTo(lx, 0);
            ctx.lineTo(lx, GROUND_Y);
            ctx.stroke();
            ctx.shadowBlur = 0; // reset
        }
        
        ctx.restore();
    }
}

// ==========================================================================
// GAME CORE CONTROLLER CLASS
// ==========================================================================

// ==========================================================================
// GAME CORE CONTROLLER CLASS
// ==========================================================================

// Networking / view tuning
const SNAPSHOT_INTERVAL_MS = 90;   // host broadcasts ~11x / second
const ZOOM_MAX = 1.6;              // closest zoom
const NET_LERP = 0.3;              // guest-side position smoothing per 60fps step

// Module-scoped reference so entity draw code (e.g. the Future-age Drone that
// emits thruster sparks) can reach the live game instance safely.
let game = null;

function fmtTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Firebase rejects NaN/Infinity — coerce any stray non-finite number to 0 for snapshots.
function safeInt(n) {
    n = Math.round(n);
    return Number.isFinite(n) ? n : 0;
}

// '#rrggbb' -> 0xRRGGBB for three.js colors
function hexToInt(str) {
    if (typeof str !== 'string') return 0xffffff;
    const h = str.replace('#', '');
    const n = parseInt(h, 16);
    return Number.isFinite(n) ? n : 0xffffff;
}

function el(id) { return document.getElementById(id); }

// Play a sound effect if the sound manager (sounds.js) is present.
function sfx(name, opts) { if (window.Sfx) window.Sfx.play(name, opts); }

class Game {
    constructor() {
        this.canvas = el("gameCanvas");
        this.r3d = null;            // 3D renderer (lazy-loaded in startMatch)
        this.interaction = null;    // pointer interaction controller

        // Multiplayer state
        this.mode = 'solo';        // 'solo' | 'host' | 'guest'
        this.net = null;           // EraNet module (lazy-imported)
        this.netAccum = 0;
        this.lastSnap = null;
        this.netUnits = new Map(); // guest-side interpolated units, keyed by id
        this.netProjectiles = [];
        this.netSpecials = [];
        this._started = false;
        this._matchOver = false;
        this._oppGraceTimer = null;

        this.nextUnitId = 1;
        this.winner = null;

        this.initGame();
        this.resize();
        window.addEventListener("resize", () => this.resize());

        this.setupEventListeners();
        this.setupMenu();

        this.lastTime = 0;
        this.gameState = 'menu';
        this.updateButtonsUI();

        // Main-menu soundtrack while sitting on the intro screen.
        if (window.Music) window.Music.play('mainmenu');
    }

    // ----------------------------------------------------------------------
    // VIEW / CAMERA / ZOOM
    // ----------------------------------------------------------------------

    resize() {
        if (this.r3d) this.r3d.resize();
    }

    zoomMin() { return Math.min(1, this.viewW / VIRTUAL_WIDTH); }
    clampZoom(z) { return Math.max(this.zoomMin(), Math.min(ZOOM_MAX, z)); }
    visibleWorldW() { return this.viewW / this.zoom; }
    maxCameraX() { return Math.max(0, VIRTUAL_WIDTH - this.visibleWorldW()); }
    clampCamera() { this.cameraX = Math.max(0, Math.min(this.maxCameraX(), this.cameraX)); }

    // Vertical world offset used by the render transform (kept in sync with draw())
    getOffY() {
        const worldPixH = VIRTUAL_HEIGHT * this.zoom;
        return worldPixH <= this.viewH ? (this.viewH - worldPixH) / 2 : (this.viewH - (GROUND_Y + 24) * this.zoom);
    }
    screenToWorld(sx, sy) {
        return { x: this.cameraX + sx / this.zoom, y: (sy - this.getOffY()) / this.zoom };
    }

    // Units currently drawn on screen (guest renders mirrored net units)
    renderedUnits() {
        if (this.mode === 'guest') return [...this.netUnits.values()].map(nu => nu.unit);
        return this.playerUnits.concat(this.enemyUnits);
    }

    findUnitAt(wx, wy) {
        let best = null, bestDx = Infinity;
        for (const u of this.renderedUnits()) {
            if (u.state === 'die') continue;
            const halfW = u.width / 2 + 5;
            if (wx >= u.x - halfW && wx <= u.x + halfW && wy >= u.y - u.height - 10 && wy <= u.y + 6) {
                const dx = Math.abs(wx - u.x);
                if (dx < bestDx) { bestDx = dx; best = u; }
            }
        }
        return best;
    }

    showUnitTooltip(u, clientX, clientY) {
        const tip = el("unit-tooltip");
        if (!tip) return;
        const maxHp = u.maxHp || u.hp;
        const hp = Math.max(0, Math.round(u.hp));
        const range = Math.round(u.getRange(this));
        const mine = u.team === 'player';
        tip.innerHTML =
            `<div class="tt-name ${mine ? 'you' : 'foe'}">${u.name} <span class="tt-side">${mine ? 'YOU' : 'ENEMY'}</span></div>` +
            `<div class="tt-row"><span>HP</span><b>${hp} / ${maxHp}</b></div>` +
            `<div class="tt-row"><span>Attack</span><b>${u.damage}</b></div>` +
            `<div class="tt-row"><span>Speed</span><b>${u.speed}</b></div>` +
            `<div class="tt-row"><span>Range</span><b>${range}</b></div>`;
        tip.classList.remove("hidden");
        const wrap = el("canvas-wrapper").getBoundingClientRect();
        let left = clientX - wrap.left + 16;
        let top = clientY - wrap.top + 16;
        const tw = tip.offsetWidth, th = tip.offsetHeight;
        if (left + tw > wrap.width - 4) left = clientX - wrap.left - tw - 16;
        if (top + th > wrap.height - 4) top = wrap.height - th - 4;
        if (left < 4) left = 4;
        if (top < 4) top = 4;
        tip.style.left = left + "px";
        tip.style.top = top + "px";
    }

    hideUnitTooltip() {
        const tip = el("unit-tooltip");
        if (tip) tip.classList.add("hidden");
    }

    setZoom(z, anchorScreenX) {
        const old = this.zoom;
        const nz = this.clampZoom(z);
        if (anchorScreenX == null) anchorScreenX = this.viewW / 2;
        const worldAtAnchor = this.cameraX + anchorScreenX / old;
        this.zoom = nz;
        this.cameraX = worldAtAnchor - anchorScreenX / nz;
        this.clampCamera();
        this.updateZoomLabel();
    }

    fitView() {
        this.zoom = this.zoomMin();
        this.cameraX = 0;
        this.clampCamera();
        this.updateZoomLabel();
    }

    updateZoomLabel() {
        const l = el("zoom-label");
        if (l) l.innerText = Math.round(this.zoom * 100) + "%";
    }

    // ----------------------------------------------------------------------
    // STATE SETUP
    // ----------------------------------------------------------------------

    initGame() {
        this.gold = 150;
        this.playerEra = 0; // derived = highest unit tier (drives base/tower/special/scenery theme)
        this.enemyEra = 0;

        // Enemy economy (used by online host + kept harmlessly in solo)
        this.enemyGold = 150;

        // Per-unit evolution tiers (0..4) — each of the 3 unit slots evolves on its own
        this.playerUnitTier = [0, 0, 0];
        this.enemyUnitTier = [0, 0, 0];
        // Heavy unit (slot 3 / Mammoth Rider line) must be unlocked before recruiting
        this.playerUnit3Unlocked = false;
        this.enemyUnit3Unlocked = false;

        // Lanes: mid open by default; top/bottom bought to unlock (per side)
        this.laneUnlocked = {
            player: { mid: true, top: false, bottom: false },
            enemy: { mid: true, top: false, bottom: false }
        };
        this.selectedLane = 'mid';

        this.playerBase = new Base('player');
        this.enemyBase = new Base('enemy');

        this.playerUnits = [];
        this.enemyUnits = [];
        this.projectiles = [];
        this.particles = [];
        this.specialAttacks = [];

        this.specialTimer = 0;
        this.enemySpecialTimer = 0;

        // Purchasable upgrades (levels). Special starts locked (must be bought).
        this.specialLevel = 0;
        this.enemySpecialLevel = 0;
        this.rangeLevel = 0;
        this.enemyRangeLevel = 0;

        this.timeElapsed = 0;
        this.statsSpawned = 0;
        this.statsKilled = 0;
        this.statsGoldEarned = 150;
        // Mirror stats for the enemy/guest side (so an online guest sees real numbers)
        this.enemyStatsSpawned = 0;
        this.enemyStatsKilled = 0;
        this.enemyStatsGold = 150;

        this.cameraX = 0;
        this.winner = null;
        this._matchOver = false;

        this.enemyAiTimer = 5000;

        this.netUnits.clear();
        this.netProjectiles = [];
        this.netSpecials = [];
        this.lastSnap = null;
        this.netAccum = 0;
        this.nextUnitId = 1;
    }

    // ----------------------------------------------------------------------
    // ECONOMY
    // ----------------------------------------------------------------------

    addGold(amount) {
        this.gold += amount;
        this.statsGoldEarned += amount;
        if (this.mode !== 'guest') {
            const gEl = el("gold-value");
            gEl.innerText = Math.round(this.gold);
            gEl.classList.remove("gold-pulse");
            void gEl.offsetWidth;
            gEl.classList.add("gold-pulse");
        }
    }

    awardEnemy(gold) {
        this.enemyGold += gold;
        this.enemyStatsGold += gold;
        this.enemyStatsKilled++;
    }

    // Visual theme era = the team's most-advanced unit line
    recomputeEras() {
        this.playerEra = Math.max(this.playerUnitTier[0], this.playerUnitTier[1], this.playerUnitTier[2]);
        this.enemyEra = Math.max(this.enemyUnitTier[0], this.enemyUnitTier[1], this.enemyUnitTier[2]);
        // The battle soundtrack tracks the player's current era.
        if (this.gameState === 'running' && this.mode !== 'guest') this.updateMusic();
    }

    // Pick and play the level track for the player's current era.
    updateMusic() {
        const trackByEra = { 0: 'level1', 1: 'mainmenu', 2: 'level3', 3: 'level3', 4: 'level3' };
        const track = trackByEra[this.playerEra] || 'level1';
        if (window.Music) window.Music.play(track);
    }

    unitEvolveCost(slot, tier) {
        if (tier >= 4) return Infinity;
        return Math.round(ERA_DATA[tier + 1].units[slot].cost * UNIT_EVOLVE_MULT);
    }

    // ----------------------------------------------------------------------
    // ACTIONS (unified for both teams)
    // ----------------------------------------------------------------------

    isUnit3Unlocked(team) {
        return team === 'player' ? this.playerUnit3Unlocked : this.enemyUnit3Unlocked;
    }

    trySpawn(team, index, lane = 'mid') {
        // Heavy unit gated behind a one-time unlock
        if (index === 2 && !this.isUnit3Unlocked(team)) return false;
        if (!this.laneUnlocked[team][lane]) return false; // lane must be open
        const tier = (team === 'player' ? this.playerUnitTier : this.enemyUnitTier)[index];
        const stats = ERA_DATA[tier].units[index];
        if (!stats) return false;
        if (team === 'player') {
            if (this.gold < stats.cost) return false;
            this.gold -= stats.cost;
            this.statsSpawned++;
            sfx('spawn', { throttle: 40 });
        } else {
            if (this.enemyGold < stats.cost) return false;
            this.enemyGold -= stats.cost;
            this.enemyStatsSpawned++;
        }
        this.addUnitFree(team, tier, index, lane);
        return true;
    }

    addUnitFree(team, tier, index, lane = 'mid') {
        const stats = ERA_DATA[tier].units[index];
        const u = new Unit(tier, index, team, stats);
        u.id = this.nextUnitId++;
        u.lane = lane;
        u.facing = team === 'player' ? 1 : -1;
        const len = laneLength(lane);
        // deterministic ±15 jitter along the lane so units don't perfectly stack
        const jitter = ((u.id * 53) % 31) - 15;
        let d = team === 'player' ? (20 + jitter) : (len - 20 + jitter);
        d = Math.max(0, Math.min(len, d));
        u.dist = d;
        const p = posAt(lane, d);
        u.x = p.x; u.z = p.z;
        u.heading = headingAt(lane, d, u.facing);
        (team === 'player' ? this.playerUnits : this.enemyUnits).push(u);
        const corner = team === 'player' ? PLAYER_CORNER : ENEMY_CORNER;
        this.particles.push(new Particle(corner.x, GROUND_Y - 20, '#cbd5e1', 'smoke', '', null, corner.z));
        return u;
    }

    // ---- Lane unlock (top / bottom) ----
    unlockLane(team, lane) {
        if (lane === 'mid' || this.laneUnlocked[team][lane]) return;
        if (team === 'player') {
            if (this.gold < LANE_UNLOCK_COST) return;
            this.gold -= LANE_UNLOCK_COST;
            this.laneUnlocked.player[lane] = true;
            const lp = posAt(lane, Math.min(120, laneLength(lane) * 0.15));
            for (let i = 0; i < 20; i++) this.particles.push(new Particle(lp.x, GROUND_Y - 40 - Math.random() * 60, '#fbbf24', 'spark', '', 5, lp.z));
            this.particles.push(new Particle(lp.x, GROUND_Y - 60, '#fbbf24', 'text', lane.toUpperCase() + ' LANE OPEN!', 16, lp.z));
            this.updateButtonsUI();
            sfx('lane_unlock');
        } else {
            if (this.enemyGold < LANE_UNLOCK_COST) return;
            this.enemyGold -= LANE_UNLOCK_COST;
            this.laneUnlocked.enemy[lane] = true;
        }
    }

    unlockUnit3(team) {
        if (this.isUnit3Unlocked(team)) return;
        if (team === 'player') {
            if (this.gold < UNIT3_UNLOCK_COST) return;
            this.gold -= UNIT3_UNLOCK_COST;
            this.playerUnit3Unlocked = true;
            this.particles.push(new Particle(PLAYER_CORNER.x, GROUND_Y - 40, '#fbbf24', 'text', 'UNLOCKED!', 18, PLAYER_CORNER.z));
            this.updateButtonsUI();
            sfx('purchase');
        } else {
            if (this.enemyGold < UNIT3_UNLOCK_COST) return;
            this.enemyGold -= UNIT3_UNLOCK_COST;
            this.enemyUnit3Unlocked = true;
        }
    }

    // Evolve a single unit slot to the next era's equivalent (for gold)
    evolveUnit(team, slot) {
        if (slot === 2 && !this.isUnit3Unlocked(team)) return;
        const tiers = team === 'player' ? this.playerUnitTier : this.enemyUnitTier;
        if (tiers[slot] >= 4) return;
        const cost = this.unitEvolveCost(slot, tiers[slot]);
        if (team === 'player') {
            if (this.gold < cost) return;
            this.gold -= cost;
        } else {
            if (this.enemyGold < cost) return;
            this.enemyGold -= cost;
        }
        tiers[slot]++;
        this.recomputeEras();
        const corner = team === 'player' ? PLAYER_CORNER : ENEMY_CORNER;
        const bx = corner.x, bz = corner.z;
        const col = team === 'player' ? '#a855f7' : '#ef4444';
        for (let i = 0; i < 24; i++) {
            this.particles.push(new Particle(bx + (Math.random() - 0.5) * 50, GROUND_Y - 90 - Math.random() * 130, col, 'spark', '', 4, bz));
        }
        this.particles.push(new Particle(bx, GROUND_Y - 240, col, 'text', ERA_DATA[tiers[slot]].units[slot].name.toUpperCase() + "!", 18, bz));
        const base = team === 'player' ? this.playerBase : this.enemyBase;
        for (const t of base.towers) t.cooldownTimer = 0;
        if (team === 'player') { this.updateButtonsUI(); sfx('evolve'); }
    }

    rangeBonus(team) {
        const lvl = team === 'player' ? this.rangeLevel : this.enemyRangeLevel;
        return lvl * RANGE_BONUS_PER_LEVEL;
    }

    // Fire the special onto a placed target center (tx, tz). If no target is given,
    // aim at the opponent's biggest unit cluster (AI) or fall back to their corner.
    triggerSpecial(team, tx, tz) {
        const level = team === 'player' ? this.specialLevel : this.enemySpecialLevel;
        if (level < 1) return; // must be purchased first
        const timer = team === 'player' ? this.specialTimer : this.enemySpecialTimer;
        if (timer > 0) return;

        const opp = team === 'player' ? ENEMY_CORNER : PLAYER_CORNER;
        if (!Number.isFinite(tx) || !Number.isFinite(tz)) {
            // Default target = the average position of the opponent's units, else their corner.
            const foes = team === 'player' ? this.enemyUnits : this.playerUnits;
            const live = foes.filter(u => u.state !== 'die');
            if (live.length) {
                tx = live.reduce((s, u) => s + u.x, 0) / live.length;
                tz = live.reduce((s, u) => s + u.z, 0) / live.length;
            } else {
                tx = opp.x; tz = opp.z;
            }
        }

        const cfg = ERA_DATA[team === 'player' ? this.playerEra : this.enemyEra];
        const sa = new SpecialAttack(cfg.specialType, team, SPECIAL_LEVEL_MULT[level], tx, tz);
        this.specialAttacks.push(sa);
        if (team === 'player') { this.specialTimer = SPECIAL_COOLDOWN_MS; sfx('special'); }
        else this.enemySpecialTimer = SPECIAL_COOLDOWN_MS;
        const label = (team === 'enemy' ? "ENEMY " : "") + cfg.specialName.toUpperCase();
        // Announce over the placement center (where the special will land)
        this.particles.push(new Particle(sa.targetX, 110, team === 'player' ? '#a855f7' : '#ef4444', 'text', label, 24, sa.targetZ));
    }

    upgradeSpecial(team) {
        const level = team === 'player' ? this.specialLevel : this.enemySpecialLevel;
        if (level >= MAX_SPECIAL_LEVEL) return;
        const cost = SPECIAL_UPGRADE_COSTS[level];
        if (team === 'player') {
            if (this.gold < cost) return;
            this.gold -= cost;
            this.specialLevel++;
            this.particles.push(new Particle(PLAYER_CORNER.x, 110, '#a855f7', 'text', 'SPECIAL Lv ' + this.specialLevel + '!', 22, PLAYER_CORNER.z));
            this.updateButtonsUI();
            sfx('upgrade');
        } else {
            if (this.enemyGold < cost) return;
            this.enemyGold -= cost;
            this.enemySpecialLevel++;
        }
    }

    upgradeRange(team) {
        const level = team === 'player' ? this.rangeLevel : this.enemyRangeLevel;
        if (level >= MAX_RANGE_LEVEL) return;
        const cost = RANGE_UPGRADE_COSTS[level];
        if (team === 'player') {
            if (this.gold < cost) return;
            this.gold -= cost;
            this.rangeLevel++;
            this.particles.push(new Particle(PLAYER_CORNER.x, GROUND_Y - 60, '#38bdf8', 'text', 'RANGE Lv ' + this.rangeLevel + '!', 20, PLAYER_CORNER.z));
            this.updateButtonsUI();
            sfx('upgrade');
        } else {
            if (this.enemyGold < cost) return;
            this.enemyGold -= cost;
            this.enemyRangeLevel++;
        }
    }

    buyTowerSlot(team) {
        const base = team === 'player' ? this.playerBase : this.enemyBase;
        if (base.unlockedSlots >= 3) return;
        const cost = TOWER_SLOT_COSTS[base.unlockedSlots];
        if (team === 'player') {
            if (this.gold < cost) return;
            this.gold -= cost;
        } else {
            if (this.enemyGold < cost) return;
            this.enemyGold -= cost;
        }
        base.unlockedSlots++;
        const sc = team === 'player' ? PLAYER_CORNER : ENEMY_CORNER;
        this.particles.push(new Particle(sc.x + 35, GROUND_Y - 140, '#fbbf24', 'spark', '', 6, sc.z));
        if (team === 'player') { this.updateButtonsUI(); sfx('purchase'); }
    }

    // Is (x,z) a legal tower spot for this team? Towers may be built ANYWHERE on the
    // map (no half restriction) — just in-bounds, clear of both base corners, and spaced.
    towerSpotValid(team, x, z) {
        if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
        // within map bounds with a margin
        if (x < 120 || x > MAP_SIZE - 120 || z < 120 || z > MAP_SIZE - 120) return false;
        // keep clear of either base corner
        if (Math.hypot(x - PLAYER_CORNER.x, z - PLAYER_CORNER.z) < 120) return false;
        if (Math.hypot(x - ENEMY_CORNER.x, z - ENEMY_CORNER.z) < 120) return false;
        // towers must sit OFF the lane paths (no building on the roads)
        if (distToLane(x, z) < TOWER_LANE_CLEARANCE) return false;
        const base = team === 'player' ? this.playerBase : this.enemyBase;
        if (base.towers.length >= base.unlockedSlots) return false;
        for (const t of base.towers) {
            if (Math.hypot(t.x - x, t.z - z) < TOWER_MIN_SPACING) return false;
        }
        return true;
    }

    buildTower(team, x, z) {
        const base = team === 'player' ? this.playerBase : this.enemyBase;
        if (base.towers.length >= base.unlockedSlots) return false;
        if (!this.towerSpotValid(team, x, z)) return false;
        if (team === 'player') {
            if (this.gold < TOWER_BUILD_COST) return false;
            this.gold -= TOWER_BUILD_COST;
        } else {
            if (this.enemyGold < TOWER_BUILD_COST) return false;
            this.enemyGold -= TOWER_BUILD_COST;
        }
        base.towers.push(new Tower(team, x, z));
        for (let i = 0; i < 8; i++) this.particles.push(new Particle(x + (Math.random() - 0.5) * 20, GROUND_Y - 40 - Math.random() * 40, '#fbbf24', 'spark', '', 6, z));
        if (team === 'player') { this.updateButtonsUI(); sfx('tower_build'); }
        return true;
    }

    // ----------------------------------------------------------------------
    // PLAYER INPUT ROUTING (guest forwards commands to the host)
    // ----------------------------------------------------------------------

    playerSpawn(index, lane = null) {
        if (this.gameState !== 'running') return;
        // Heavy unit: while locked, unlock it first
        if (index === 2 && !this.playerUnit3Unlocked) {
            if (this.mode === 'guest') { this.net && this.net.sendCommand({ a: 'unlock' }); return; }
            this.unlockUnit3('player');
            return;
        }
        lane = lane || this.selectedLane || 'mid';
        if (!this.laneUnlocked.player[lane]) return; // locked lane
        this.selectedLane = lane;
        if (this.mode === 'guest') { this.net && this.net.sendCommand({ a: 'spawn', i: index, l: LANE_IDX[lane] }); return; }
        this.trySpawn('player', index, lane);
    }
    playerOpenLane(lane) {
        if (this.gameState !== 'running' || lane === 'mid') return;
        if (this.laneUnlocked.player[lane]) return;
        if (this.mode === 'guest') { this.net && this.net.sendCommand({ a: 'lane', l: LANE_IDX[lane] }); return; }
        this.unlockLane('player', lane);
    }
    playerEvolveUnit(index) {
        if (this.gameState !== 'running') return;
        if (this.mode === 'guest') { this.net && this.net.sendCommand({ a: 'evolveu', i: index }); return; }
        this.evolveUnit('player', index);
    }
    playerSpecial() {
        if (this.gameState !== 'running') return;
        // Special is now a placed-on-map ability: must be owned and off cooldown.
        if (this.specialLevel < 1 || this.specialTimer > 0) return;
        // Guest and host/solo both arm a placement mode; the click resolves the target.
        if (this.interaction && typeof this.interaction.armSpecial === 'function') {
            this.interaction.armSpecial();
        }
    }
    playerBuySlot() {
        if (this.gameState !== 'running') return;
        if (this.mode === 'guest') { this.net && this.net.sendCommand({ a: 'slot' }); return; }
        this.buyTowerSlot('player');
    }
    playerBuildTower(x, z) {
        if (this.gameState !== 'running') return false;
        if (this.mode === 'guest') { this.net && this.net.sendCommand({ a: 'tower', x: Math.round(x), z: Math.round(z) }); return true; }
        return this.buildTower('player', x, z);
    }
    playerUpgradeSpecial() {
        if (this.gameState !== 'running') return;
        if (this.mode === 'guest') { this.net && this.net.sendCommand({ a: 'upspecial' }); return; }
        this.upgradeSpecial('player');
    }
    playerUpgradeRange() {
        if (this.gameState !== 'running') return;
        if (this.mode === 'guest') { this.net && this.net.sendCommand({ a: 'uprange' }); return; }
        this.upgradeRange('player');
    }

    onGuestCommand(cmd) {
        if (this.mode !== 'host' || this.gameState !== 'running' || !cmd) return;
        switch (cmd.a) {
            // Lane commands arrive in the GUEST's frame; mirror into the host's frame.
            case 'spawn': this.trySpawn('enemy', cmd.i | 0, mirrorLane(LANE_BY_IDX[cmd.l | 0] || 'mid')); break;
            case 'unlock': this.unlockUnit3('enemy'); break;
            case 'lane': this.unlockLane('enemy', mirrorLane(LANE_BY_IDX[cmd.l | 0] || 'mid')); break;
            case 'evolveu': this.evolveUnit('enemy', cmd.i | 0); break;
            case 'special': {
                // Guest sends its own (mirrored) target coords -> un-mirror into host space.
                if (Number.isFinite(cmd.x) && Number.isFinite(cmd.z)) {
                    this.triggerSpecial('enemy', mirrorX(cmd.x | 0), mirrorZ(cmd.z | 0));
                } else {
                    this.triggerSpecial('enemy');
                }
                break;
            }
            case 'slot': this.buyTowerSlot('enemy'); break;
            case 'tower': {
                // guest sends its own (mirrored) coords -> un-mirror x AND z to host space
                const hx = mirrorX(cmd.x | 0);
                const hz = mirrorZ(cmd.z | 0);
                this.buildTower('enemy', hx, hz);
                break;
            }
            case 'upspecial': this.upgradeSpecial('enemy'); break;
            case 'uprange': this.upgradeRange('enemy'); break;
        }
    }

    // ----------------------------------------------------------------------
    // HUD / BUTTONS
    // ----------------------------------------------------------------------

    updateButtonsUI() {
        // Small helpers that no-op when an element is absent (index.html may lag)
        const setText = (id, txt) => { const e = el(id); if (e) e.innerText = txt; };
        const setImg = (id, tier, slot, team) => {
            const e = el(id);
            if (e && this.r3d && typeof this.r3d.renderUnitThumbnail === 'function') {
                try { e.src = this.r3d.renderUnitThumbnail(tier, slot, team); } catch (err) {}
            }
        };

        // Per-unit MOBA spawn cards + evolve buttons
        for (let i = 0; i < 3; i++) {
            const n = i + 1;
            const tier = this.playerUnitTier[i];
            const unit = ERA_DATA[tier].units[i];
            const spawnBtn = el(`spawn-u${n}`);
            const evoBtn = el(`evolve-u${n}`);

            if (i === 2 && !this.playerUnit3Unlocked) {
                // Heavy unit still locked — card shows the unlock cost + a locked portrait
                setText(`unit-name-${n}`, unit.name);
                setText(`unit-tier-${n}`, `T${tier + 1}`);
                setText(`unit-cost-${n}`, `🔒 ${UNIT3_UNLOCK_COST}g`);
                setText(`ustat-hp-${n}`, unit.hp);
                setText(`ustat-atk-${n}`, unit.damage);
                setText(`ustat-spd-${n}`, unit.speed);
                setImg(`unit-img-${n}`, tier, i, 'player');
                if (spawnBtn) spawnBtn.classList.add("locked-unit");
                if (evoBtn) {
                    evoBtn.disabled = true;
                    setText(`evo-label-${n}`, "Locked");
                    setText(`evo-cost-${n}`, "");
                }
                setText(`evo-hp-${n}`, "—");
                setText(`evo-atk-${n}`, "—");
                setText(`evo-spd-${n}`, "—");
                continue;
            }

            if (spawnBtn) spawnBtn.classList.remove("locked-unit");
            setText(`unit-name-${n}`, unit.name);
            setText(`unit-tier-${n}`, `T${tier + 1}`);
            setText(`unit-cost-${n}`, `${unit.cost}g`);
            setText(`ustat-hp-${n}`, unit.hp);
            setText(`ustat-atk-${n}`, unit.damage);
            setText(`ustat-spd-${n}`, unit.speed);
            setImg(`unit-img-${n}`, tier, i, 'player');

            if (tier >= 4) {
                if (evoBtn) evoBtn.disabled = true;
                setText(`evo-label-${n}`, "MAX");
                setText(`evo-cost-${n}`, "");
                setText(`evo-hp-${n}`, unit.hp);
                setText(`evo-atk-${n}`, unit.damage);
                setText(`evo-spd-${n}`, unit.speed);
                setImg(`evo-img-${n}`, tier, i, 'player');
            } else {
                const next = ERA_DATA[tier + 1].units[i];
                if (evoBtn) evoBtn.disabled = false;
                setText(`evo-label-${n}`, `▲ ${next.name}`);
                setText(`evo-cost-${n}`, `${this.unitEvolveCost(i, tier)}g`);
                setText(`evo-hp-${n}`, next.hp);
                setText(`evo-atk-${n}`, next.damage);
                setText(`evo-spd-${n}`, next.speed);
                setImg(`evo-img-${n}`, tier + 1, i, 'player');
            }
        }

        // Guarded label setter for .tower-label spans inside control buttons
        const setLabel = (btn, txt) => { if (btn) { const l = btn.querySelector(".tower-label"); if (l) l.innerText = txt; } };

        const slotBtn = el("buy-tower-slot");
        const slotCostLabel = el("tower-slot-cost");
        if (this.playerBase.unlockedSlots < 3) {
            if (slotBtn) slotBtn.disabled = false;
            if (slotCostLabel) slotCostLabel.innerText = `${TOWER_SLOT_COSTS[this.playerBase.unlockedSlots]}g`;
            setLabel(slotBtn, `Slot ${this.playerBase.unlockedSlots + 1}`);
        } else {
            if (slotBtn) slotBtn.disabled = true;
            if (slotCostLabel) slotCostLabel.innerText = "MAX";
            setLabel(slotBtn, "Slots Locked");
        }

        const towerBtn = el("buy-tower");
        const towerCostLabel = el("tower-cost");
        if (this.playerBase.towers.length < this.playerBase.unlockedSlots) {
            if (towerBtn) towerBtn.disabled = false;
            if (towerCostLabel) towerCostLabel.innerText = `${TOWER_BUILD_COST}g`;
            setLabel(towerBtn, "Build Tower");
        } else {
            if (towerBtn) towerBtn.disabled = true;
            if (towerCostLabel) towerCostLabel.innerText = "MAX";
            setLabel(towerBtn, (this.playerBase.unlockedSlots === 0) ? "Unlock Slot First" : "Slots Full");
        }

        // Range upgrade button (with next-level reach preview)
        const rBtn = el("upgrade-range");
        const rCost = el("range-cost");
        const rStat = el("range-stat");
        if (this.rangeLevel >= MAX_RANGE_LEVEL) {
            if (rBtn) rBtn.disabled = true;
            setLabel(rBtn, "Range MAX");
            if (rCost) rCost.innerText = "MAX";
            if (rStat) rStat.innerText = `Reach +${this.rangeLevel * RANGE_BONUS_PER_LEVEL}`;
        } else {
            if (rBtn) rBtn.disabled = false;
            setLabel(rBtn, `Range → Lv ${this.rangeLevel + 1}`);
            if (rCost) rCost.innerText = `${RANGE_UPGRADE_COSTS[this.rangeLevel]}g`;
            if (rStat) rStat.innerText = `Reach +${(this.rangeLevel + 1) * RANGE_BONUS_PER_LEVEL} px`;
        }

        // Special buy/upgrade button (with next-level power preview)
        const sBtn = el("upgrade-special");
        const sCost = el("special-upg-cost");
        const sStat = el("special-stat");
        if (this.specialLevel >= MAX_SPECIAL_LEVEL) {
            if (sBtn) sBtn.disabled = true;
            setLabel(sBtn, "Special MAX");
            if (sCost) sCost.innerText = "MAX";
            if (sStat) sStat.innerText = `Power ×${SPECIAL_LEVEL_MULT[this.specialLevel]}`;
        } else {
            if (sBtn) sBtn.disabled = false;
            setLabel(sBtn, this.specialLevel === 0 ? "Buy Special" : `Special → Lv ${this.specialLevel + 1}`);
            if (sCost) sCost.innerText = `${SPECIAL_UPGRADE_COSTS[this.specialLevel]}g`;
            if (sStat) sStat.innerText = `Power ×${SPECIAL_LEVEL_MULT[this.specialLevel + 1]}`;
        }

        // Lane HUD pills
        for (const laneName of ['top', 'mid', 'bottom']) {
            const pill = el('lane-' + laneName);
            if (!pill) continue;
            const open = this.laneUnlocked.player[laneName];
            pill.classList.toggle('locked', !open);
            pill.classList.toggle('selected', open && this.selectedLane === laneName);
            const cost = pill.querySelector('.lane-cost');
            if (cost) cost.innerText = open ? '' : `🔒 ${LANE_UNLOCK_COST}g`;
        }
    }

    updateAffordance() {
        for (let i = 0; i < 3; i++) {
            const tier = this.playerUnitTier[i];
            const spawnBtn = el(`spawn-u${i + 1}`);
            const evoBtn = el(`evolve-u${i + 1}`);
            if (!spawnBtn && !evoBtn) continue;
            if (i === 2 && !this.playerUnit3Unlocked) {
                // Spawn button = unlock; evolve stays disabled
                if (spawnBtn) spawnBtn.classList.toggle("disabled", this.gold < UNIT3_UNLOCK_COST);
                if (evoBtn) evoBtn.classList.add("disabled");
                continue;
            }
            if (spawnBtn) spawnBtn.classList.toggle("disabled", this.gold < ERA_DATA[tier].units[i].cost);
            if (evoBtn) {
                if (tier >= 4) evoBtn.classList.add("disabled");
                else evoBtn.classList.toggle("disabled", this.gold < this.unitEvolveCost(i, tier));
            }
        }
        // Upgrade buttons grey out when unaffordable (but not when already maxed)
        const rMax = this.rangeLevel >= MAX_RANGE_LEVEL;
        const rEl = el("upgrade-range");
        if (rEl) rEl.classList.toggle("disabled", !rMax && this.gold < RANGE_UPGRADE_COSTS[this.rangeLevel]);
        const sMax = this.specialLevel >= MAX_SPECIAL_LEVEL;
        const sEl = el("upgrade-special");
        if (sEl) sEl.classList.toggle("disabled", !sMax && this.gold < SPECIAL_UPGRADE_COSTS[this.specialLevel]);
    }

    updateSpecialUI() {
        const overlay = el("special-cooldown-overlay");
        const status = el("special-status-text");
        const btn = el("special-btn");
        if (this.specialLevel < 1) {
            overlay.style.height = `0%`;
            status.innerText = "Locked — Buy it";
            btn.classList.add("disabled");
            return;
        }
        btn.classList.remove("disabled");
        if (this.specialTimer > 0) {
            overlay.style.height = `${(this.specialTimer / SPECIAL_COOLDOWN_MS) * 100}%`;
            status.innerText = `Lv ${this.specialLevel} · CD ${Math.ceil(this.specialTimer / 1000)}s`;
        } else {
            overlay.style.height = `0%`;
            status.innerText = `Lv ${this.specialLevel} · Ready`;
        }
    }

    updateHud() {
        el("gold-value").innerText = Math.round(this.gold);
        const pr = Math.max(0, this.playerBase.hp / BASE_HP_MAX);
        const er = Math.max(0, this.enemyBase.hp / BASE_HP_MAX);
        el("player-base-hp-bar").style.width = `${pr * 100}%`;
        el("enemy-base-hp-bar").style.width = `${er * 100}%`;
        el("player-base-hp-text").innerText = `${Math.max(0, Math.round(this.playerBase.hp))}/${BASE_HP_MAX} HP`;
        el("enemy-base-hp-text").innerText = `${Math.max(0, Math.round(this.enemyBase.hp))}/${BASE_HP_MAX} HP`;
        el("current-era-text").innerText = ERA_DATA[this.playerEra].name;
    }

    // ----------------------------------------------------------------------
    // ENEMY AI (single-player only)
    // ----------------------------------------------------------------------

    updateEnemyAI(dt) {
        let desiredEra = 0;
        if (this.timeElapsed >= 720) desiredEra = 4;
        else if (this.timeElapsed >= 450) desiredEra = 3;
        else if (this.timeElapsed >= 240) desiredEra = 2;
        else if (this.timeElapsed >= 90) desiredEra = 1;

        // AI advances all its unit lines together by time (unlocks the heavy unit)
        const prevEra = this.enemyEra;
        this.enemyUnitTier[0] = this.enemyUnitTier[1] = this.enemyUnitTier[2] = desiredEra;
        this.enemyUnit3Unlocked = true;
        this.recomputeEras();
        if (this.enemyEra > prevEra) {
            for (let i = 0; i < 30; i++) {
                this.particles.push(new Particle(ENEMY_BASE_X + (Math.random() - 0.5) * 50, GROUND_Y - 100 - Math.random() * 140, '#ef4444', 'spark', '', 4));
            }
            this.particles.push(new Particle(ENEMY_BASE_X, GROUND_Y - 250, '#ef4444', 'text', "ENEMY ADVANCES!", 18));
            for (const t of this.enemyBase.towers) t.cooldownTimer = 0;
        }

        // AI gets stronger specials + longer range as the match wears on
        this.enemySpecialLevel = Math.min(MAX_SPECIAL_LEVEL, 1 + this.enemyEra);
        this.enemyRangeLevel = Math.min(MAX_RANGE_LEVEL, this.enemyEra);

        // AI opens extra lanes over time
        if (!this.laneUnlocked.enemy.top && this.timeElapsed > 60) this.laneUnlocked.enemy.top = true;
        if (!this.laneUnlocked.enemy.bottom && this.timeElapsed > 150) this.laneUnlocked.enemy.bottom = true;

        // AI builds a few towers over time at valid spots anywhere (near the enemy
        // corner / along its lanes), sampling until it finds a legal spot.
        if (this.enemyBase.unlockedSlots < 3 && this.timeElapsed > (this.enemyBase.unlockedSlots * 120 + 60)) {
            this.enemyBase.unlockedSlots++;
        }
        if (this.enemyBase.towers.length < this.enemyBase.unlockedSlots) {
            const lanes = ['mid', 'top', 'bottom'];
            for (let attempt = 0; attempt < 6; attempt++) {
                const lane = lanes[Math.floor(Math.random() * lanes.length)];
                const len = laneLength(lane);
                // Somewhere on the enemy's side of the lane (defensive positions)
                const d = len * (0.55 + Math.random() * 0.35);
                const p = posAt(lane, Math.max(0, Math.min(len, d)));
                const tx = p.x + (Math.random() - 0.5) * 120;
                const tz = p.z + (Math.random() - 0.5) * 120;
                if (this.towerSpotValid('enemy', tx, tz)) { this.enemyBase.towers.push(new Tower('enemy', tx, tz)); break; }
            }
        }

        this.enemyAiTimer -= dt;
        if (this.enemyAiTimer <= 0) {
            const baseCooldown = Math.max(2200, 7500 - (this.timeElapsed * 6.5));
            this.enemyAiTimer = baseCooldown + Math.random() * 1800;

            const rand = Math.random();
            let unitIndex = 0;
            if (rand > 0.85) unitIndex = 2;
            else if (rand > 0.50) unitIndex = 1;

            // pick a random unlocked lane
            const open = ['mid', 'top', 'bottom'].filter(l => this.laneUnlocked.enemy[l]);
            const lane = open[Math.floor(Math.random() * open.length)] || 'mid';
            this.addUnitFree('enemy', this.enemyUnitTier[unitIndex], unitIndex, lane);

            if (this.playerUnits.length >= 4 && Math.random() < 0.25) {
                // Aim the AI's special at the average position of the player's live units.
                const live = this.playerUnits.filter(u => u.state !== 'die');
                let tx = PLAYER_CORNER.x, tz = PLAYER_CORNER.z;
                if (live.length) {
                    tx = live.reduce((s, u) => s + u.x, 0) / live.length;
                    tz = live.reduce((s, u) => s + u.z, 0) / live.length;
                }
                this.triggerSpecial('enemy', tx, tz);
            }
        }
    }

    // ----------------------------------------------------------------------
    // MAIN UPDATE
    // ----------------------------------------------------------------------

    update(dt) {
        if (this.gameState !== 'running') return;

        if (this.mode === 'guest') { this.updateGuest(dt); return; }

        const t = dt; // fixed 1x speed
        this.timeElapsed += t / 1000;

        // Gentle passive income keeps the economy flowing (era-scaled)
        this.gold += (1 + this.playerEra) * (t / 1000);
        if (this.mode === 'host') this.enemyGold += (1 + this.enemyEra) * (t / 1000);

        this.specialTimer = Math.max(0, this.specialTimer - t);
        this.enemySpecialTimer = Math.max(0, this.enemySpecialTimer - t);
        this.updateSpecialUI();

        this.playerBase.update(t, this);
        this.enemyBase.update(t, this);

        for (const u of [...this.playerUnits]) u.update(t, this);
        for (const u of [...this.enemyUnits]) u.update(t, this);

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(t, this);
            if (p.isDead) this.projectiles.splice(i, 1);
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(t);
            if (p.alpha <= 0) this.particles.splice(i, 1);
        }
        for (let i = this.specialAttacks.length - 1; i >= 0; i--) {
            const s = this.specialAttacks[i];
            s.update(t, this);
            if (s.isDead) this.specialAttacks.splice(i, 1);
        }

        if (this.mode === 'solo') this.updateEnemyAI(t);

        this.updateHud();
        this.updateAffordance();

        if (this.playerBase.hp <= 0) this.finish('player_lost');
        else if (this.enemyBase.hp <= 0) this.finish('player_won');

        if (this.mode === 'host') {
            this.netAccum += dt;
            if (this.netAccum >= SNAPSHOT_INTERVAL_MS) {
                this.netAccum = 0;
                this.broadcastSnapshot();
            }
        }
    }

    updateCamera(dt) {
        if (!this.isDragging) {
            this.cameraX += this.cameraVelocity * (dt / 16.666);
            this.cameraVelocity *= Math.pow(0.85, dt / 16.666);
            if (Math.abs(this.cameraVelocity) < 0.05) this.cameraVelocity = 0;
        }
        this.clampCamera();
    }

    updateGuest(dt) {
        const k = 1 - Math.pow(1 - NET_LERP, dt / 16.666);
        for (const [, nu] of this.netUnits) {
            nu.unit.x += (nu.tx - nu.unit.x) * k;
            if (nu.tz !== undefined) nu.unit.z += (nu.tz - nu.unit.z) * k;
            if (nu.unit.state === 'walk' && !nu.unit.isBlocked) {
                nu.unit.animTimer += nu.unit.speed * 0.15 * (dt / 16.666);
            }
            if (nu.unit.state === 'die') {
                nu.unit.deathProgress = Math.min(1, nu.unit.deathProgress + 0.05 * (dt / 16.666));
            }
        }
        for (const [id, nu] of [...this.netUnits]) {
            if (nu.remove && nu.unit.deathProgress >= 1) this.netUnits.delete(id);
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(dt);
            if (p.alpha <= 0) this.particles.splice(i, 1);
        }
        this.updateSpecialUI();
        this.updateAffordance();
        this.timeElapsed += dt / 1000;
    }

    // ----------------------------------------------------------------------
    // NETWORK SNAPSHOTS
    // ----------------------------------------------------------------------

    broadcastSnapshot() {
        const hround = (h) => { const v = Math.round((h || 0) * 100) / 100; return Number.isFinite(v) ? v : 0; };
        const u = [];
        for (const un of this.playerUnits) u.push([un.id, 'p', un.era, un.typeIndex, safeInt(un.x), safeInt(un.z), LANE_IDX[un.lane] || 0, safeInt(un.hp), un.state, un.facing, hround(un.heading), +un.deathProgress.toFixed(2)]);
        for (const un of this.enemyUnits) u.push([un.id, 'e', un.era, un.typeIndex, safeInt(un.x), safeInt(un.z), LANE_IDX[un.lane] || 0, safeInt(un.hp), un.state, un.facing, hround(un.heading), +un.deathProgress.toFixed(2)]);

        const p = [];
        for (const pr of this.projectiles) p.push([safeInt(pr.x), safeInt(pr.y), safeInt(pr.z ?? 0), pr.type, pr.team]);

        const s = [];
        for (const sa of this.specialAttacks) {
            if (sa.type === 'airstrike') s.push(['airstrike', sa.team, safeInt(sa.x ?? 0), safeInt(sa.z ?? 0)]);
            else if (sa.type === 'orbitallaser') s.push(['orbitallaser', sa.team, safeInt(sa.x ?? sa.laserX ?? 0), safeInt(sa.z ?? sa.laserZ ?? 0)]);
        }

        const tw = [];
        for (const t of this.playerBase.towers) tw.push(['p', safeInt(t.x), safeInt(t.z), this.playerEra]);
        for (const t of this.enemyBase.towers) tw.push(['e', safeInt(t.x), safeInt(t.z), this.enemyEra]);

        this.net && this.net.sendSnapshot({
            tm: Date.now(),
            ph: Math.round(this.playerBase.hp), eh: Math.round(this.enemyBase.hp),
            pe: this.playerEra, ee: this.enemyEra,
            pg: Math.round(this.gold),
            eg: Math.round(this.enemyGold),
            pst: Math.round(this.specialTimer), est: Math.round(this.enemySpecialTimer),
            pus: this.playerBase.unlockedSlots, eus: this.enemyBase.unlockedSlots,
            es: this.enemyStatsSpawned, ek: this.enemyStatsKilled, egn: Math.round(this.enemyStatsGold),
            psl: this.specialLevel, esl: this.enemySpecialLevel,
            prl: this.rangeLevel, erl: this.enemyRangeLevel,
            put: this.playerUnitTier, eut: this.enemyUnitTier,
            pu3: this.playerUnit3Unlocked, eu3: this.enemyUnit3Unlocked,
            plu: [!!this.laneUnlocked.player.mid, !!this.laneUnlocked.player.top, !!this.laneUnlocked.player.bottom],
            elu: [!!this.laneUnlocked.enemy.mid, !!this.laneUnlocked.enemy.top, !!this.laneUnlocked.enemy.bottom],
            u, p, s, tw,
            st: this.gameState,
            win: this.winner
        });
    }

    applySnapshot(snap) {
        if (this.mode !== 'guest') return;
        this.lastSnap = snap;

        // Guest is the host's opponent, so the guest's own economy = enemy* fields.
        this.gold = snap.eg;
        this.playerEra = snap.ee;
        this.enemyEra = snap.pe;
        this.updateMusic(); // guest tracks its own (mirrored) era for the soundtrack
        this.specialTimer = snap.est;

        // Guest's own purchased-upgrade levels (host's enemy side)
        this.specialLevel = snap.esl || 0;
        this.enemySpecialLevel = snap.psl || 0;
        this.rangeLevel = snap.erl || 0;
        this.enemyRangeLevel = snap.prl || 0;

        // Guest's own per-unit tiers + heavy-unit unlock (host's enemy side)
        this.playerUnitTier = (snap.eut || [0, 0, 0]).slice();
        this.enemyUnitTier = (snap.put || [0, 0, 0]).slice();
        this.playerUnit3Unlocked = !!snap.eu3;
        this.enemyUnit3Unlocked = !!snap.pu3;

        // Lanes: guest's own = enemy fields (elu); opponent = plu. Because top/bottom
        // swap under the 180° rotation, map each lane through mirrorLane so the guest's
        // TOP corresponds to the host's BOTTOM (and vice versa).
        const elu = snap.elu || [true, false, false];
        const plu = snap.plu || [true, false, false];
        const eluByName = { mid: !!elu[0], top: !!elu[1], bottom: !!elu[2] };
        const pluByName = { mid: !!plu[0], top: !!plu[1], bottom: !!plu[2] };
        this.laneUnlocked.player = {
            mid: eluByName[mirrorLane('mid')],
            top: eluByName[mirrorLane('top')],
            bottom: eluByName[mirrorLane('bottom')]
        };
        this.laneUnlocked.enemy = {
            mid: pluByName[mirrorLane('mid')],
            top: pluByName[mirrorLane('top')],
            bottom: pluByName[mirrorLane('bottom')]
        };

        // Guest's own end-of-match stats (tracked authoritatively by the host)
        this.statsSpawned = snap.es || 0;
        this.statsKilled = snap.ek || 0;
        this.statsGoldEarned = snap.egn || 150;

        this.playerBase.hp = snap.eh;
        this.enemyBase.hp = snap.ph;
        this.playerBase.unlockedSlots = snap.eus;
        this.enemyBase.unlockedSlots = snap.pus;

        // Towers rebuilt from tw[] (180° rotation: mirror x AND z). guest own = host 'e'.
        this.playerBase.towers = [];
        this.enemyBase.towers = [];
        for (const arr of (snap.tw || [])) {
            const [tc, tx, tz] = arr;
            const gTeam = tc === 'e' ? 'player' : 'enemy';
            const tw = new Tower(gTeam, mirrorX(tx), mirrorZ(tz));
            (gTeam === 'player' ? this.playerBase : this.enemyBase).towers.push(tw);
        }

        // HUD (mirrored: "Your Base" = the host's enemy base)
        el("gold-value").innerText = Math.round(this.gold);
        el("player-base-hp-bar").style.width = `${Math.max(0, snap.eh / BASE_HP_MAX) * 100}%`;
        el("enemy-base-hp-bar").style.width = `${Math.max(0, snap.ph / BASE_HP_MAX) * 100}%`;
        el("player-base-hp-text").innerText = `${Math.max(0, Math.round(snap.eh))}/${BASE_HP_MAX} HP`;
        el("enemy-base-hp-text").innerText = `${Math.max(0, Math.round(snap.ph))}/${BASE_HP_MAX} HP`;
        el("current-era-text").innerText = ERA_DATA[this.playerEra].name;
        this.updateButtonsUI();

        // Units — 180° rotation: mirror x AND z, swap lane top<->bottom, rotate heading.
        const seen = new Set();
        for (const arr of snap.u) {
            const [id, team, era, ti, x, z, laneIdx, hp, st, f, heading] = arr;
            seen.add(id);
            const gTeam = team === 'e' ? 'player' : 'enemy'; // guest's own units are host's 'enemy'
            const gx = mirrorX(x);
            const gz = mirrorZ(z);
            const gf = -f;
            const gLane = mirrorLane(LANE_BY_IDX[laneIdx] || 'mid');
            const gHeading = (heading || 0) + Math.PI;
            let nu = this.netUnits.get(id);
            if (!nu) {
                const stats = ERA_DATA[era].units[ti];
                const unit = new Unit(era, ti, gTeam, stats);
                unit.id = id; unit.x = gx; unit.z = gz; unit.lane = gLane; unit.facing = gf; unit.heading = gHeading;
                nu = { unit, tx: gx, tz: gz };
                this.netUnits.set(id, nu);
            }
            const unit = nu.unit;
            if (hp < unit.hp && unit.state !== 'die') this.spawnHitFx(gx, unit.height, gz);
            if (st === 'die' && unit.state !== 'die') {
                this.spawnDeathFx(gx, unit.height, gz);
                if (gTeam === 'enemy') this.spawnBountyFx(gx, unit.height, era, ti, gz);
            }
            unit.era = era; unit.typeIndex = ti; unit.team = gTeam; unit.lane = gLane;
            unit.hp = hp; unit.state = st; unit.facing = gf; unit.heading = gHeading;
            nu.tx = gx; nu.tz = gz;
            if (st === 'die') nu.remove = true;
        }
        for (const [, nu] of this.netUnits) {
            if (!seen.has(nu.unit.id) && !nu.remove) {
                nu.remove = true;
                if (nu.unit.state !== 'die') {
                    nu.unit.state = 'die';
                    this.spawnDeathFx(nu.unit.x, nu.unit.height, nu.unit.z);
                    if (nu.unit.team === 'enemy') this.spawnBountyFx(nu.unit.x, nu.unit.height, nu.unit.era, nu.unit.typeIndex, nu.unit.z);
                }
            }
        }

        // Projectiles / specials — 180° rotation: mirror x AND z, swap team
        this.netProjectiles = (snap.p || []).map(([x, y, z, type, team]) => ({
            x: mirrorX(x), y, z: mirrorZ(z), type, team: team === 'player' ? 'enemy' : 'player'
        }));
        this.netSpecials = (snap.s || []).map(([type, team, x, z]) => ({
            type, team: team === 'player' ? 'enemy' : 'player', x: mirrorX(x), z: mirrorZ(z)
        }));

        // End of match (host-authoritative result)
        if ((snap.st === 'victory' || snap.st === 'defeat') && !this._matchOver) {
            this._matchOver = true;
            this.gameState = snap.st === 'victory' ? 'defeat' : 'victory';
            this.showGameOver(this.gameState === 'victory', true);
        }
    }

    spawnHitFx(x, height, z = 0) {
        this.particles.push(new Particle(x + (Math.random() - 0.5) * 10, GROUND_Y - (height || 40) / 2, '#dc2626', 'blood', '', null, z));
    }
    spawnDeathFx(x, height, z = 0) {
        for (let i = 0; i < 4; i++) this.particles.push(new Particle(x + (Math.random() - 0.5) * 12, GROUND_Y - (height || 40) / 2, '#dc2626', 'blood', '', null, z));
        this.particles.push(new Particle(x, GROUND_Y - 20, '#cbd5e1', 'smoke', '', null, z));
    }
    spawnBountyFx(x, height, era, ti, z = 0) {
        const reward = (ERA_DATA[era] && ERA_DATA[era].units[ti] || {}).goldReward || 0;
        this.particles.push(new Particle(x, GROUND_Y - (height || 40) - 12, '#fbbf24', 'text', `+${reward}g`, 15, z));
    }

    // ----------------------------------------------------------------------
    // RENDERING
    // ----------------------------------------------------------------------

    draw(dt) {
        const r = this.r3d;
        if (!r) return;
        r.setEra(this.playerEra, this.enemyEra);
        if (this.mode === 'guest') {
            r.syncUnits([...this.netUnits.values()].map(n => n.unit));
            r.syncProjectiles(this.netProjectiles, false);
            r.syncSpecials(this.netSpecials, false);
        } else {
            r.syncUnits(this.playerUnits.concat(this.enemyUnits));
            r.syncProjectiles(this.projectiles, false);
            r.syncSpecials(this.specialAttacks, false);
        }
        r.syncBasesTowers(this.playerBase, this.enemyBase, this.mode);
        r.syncGates(this.laneUnlocked, this.mode);
        this.bridgeParticles();
        r.stepParticles(dt || 16);
        if (this.interaction) this.interaction.updateHover();
        r.render(dt || 16);
    }

    // Translate freshly-spawned sim particles into 3D renderer effects (one-shot).
    bridgeParticles() {
        const r = this.r3d;
        for (const p of this.particles) {
            if (p._fx) continue;
            p._fx = true;
            if (p.type === 'text') {
                r.floatText(p.x, p.z ?? 900, p.text, p.color, false);
            } else if (p.type === 'blood') {
                r.burst(p.x, p.z ?? 900, 0xdc2626, 3, false);
            } else if (p.type === 'fire') {
                r.burst(p.x, p.z ?? 900, 0xf97316, 2, false);
            } else if (p.type === 'spark') {
                r.burst(p.x, p.z ?? 900, hexToInt(p.color), 2, false);
            }
        }
    }

    // ----------------------------------------------------------------------
    // GAME LOOP + LIFECYCLE
    // ----------------------------------------------------------------------

    loop(time) {
        if (!this.lastTime) this.lastTime = time;
        const dt = Math.min(100, time - this.lastTime);
        this.lastTime = time;
        this.update(dt);
        this.draw(dt);
        requestAnimationFrame((t) => this.loop(t));
    }

    startMatch(mode) {
        this.mode = mode;
        this.initGame();
        this.gameState = 'running';
        this._matchOver = false;

        // Hide all overlays
        for (const id of ["intro-modal", "join-modal", "lobby-modal", "gameover-modal"]) {
            const m = el(id);
            if (m) m.classList.add("hidden");
        }

        // Reflect mode in the UI
        document.body.classList.toggle('is-multiplayer', mode !== 'solo');
        const badge = el("mp-badge");
        if (badge) {
            if (mode === 'solo') badge.classList.add('hidden');
            else {
                badge.classList.remove('hidden');
                badge.innerText = "● ONLINE" + (this.net && this.net.code ? " · " + this.net.code : "");
            }
        }
        el("pause-btn").innerText = "PAUSE";

        this.ensureRenderer();

        this.updateButtonsUI();
        this.updateHud();
        this.updateAffordance();
        this.updateSpecialUI();

        // Kick off the era-appropriate battle music.
        this.updateMusic();
    }

    async ensureRenderer() {
        if (this.r3d) { this.r3d.resize(); return; }
        try {
            const test = document.createElement('canvas');
            if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no-webgl');
            const mod = await import('./render3d.js');
            this.r3d = mod.createRenderer(this.canvas);
            this.interaction = new Interaction(this);
            this.r3d.resize();
            // Now that the renderer exists, populate unit-card portraits.
            this.updateButtonsUI();
        } catch (e) {
            console.error('3D renderer failed to load', e);
            alert('This game needs WebGL. Please use a modern browser with hardware acceleration enabled.');
        }
    }

    finish(result) {
        if (this._matchOver) return;
        this._matchOver = true;
        const won = result === 'player_won';
        this.gameState = won ? 'victory' : 'defeat';
        this.winner = won ? 'player' : 'enemy';
        if (this.mode === 'host') {
            this.broadcastSnapshot();
            this.net && this.net.setMeta({ state: 'ended', winner: this.winner });
        }
        this.showGameOver(won, this.mode !== 'solo');
    }

    showGameOver(isVictory, isOnline) {
        sfx(isVictory ? 'victory' : 'defeat');
        // Don't leave a frozen networked battlefield rendering behind the modal.
        this.netUnits.clear();
        this.netProjectiles = [];
        this.netSpecials = [];

        const modal = el("gameover-modal");
        const title = el("gameover-title");
        const subtitle = el("gameover-subtitle");

        modal.classList.remove("hidden", "victory-style", "defeat-style");
        if (isVictory) {
            modal.classList.add("victory-style");
            title.innerText = "VICTORY!";
            subtitle.innerText = isOnline
                ? "You crushed your opponent's stronghold. GG!"
                : "You successfully defended the era and smashed the enemy stronghold!";
        } else {
            modal.classList.add("defeat-style");
            title.innerText = "DEFEAT!";
            subtitle.innerText = isOnline
                ? "Your base was overrun by your opponent."
                : "Your base was overrun and crumbled to dust.";
        }

        el("stat-time").innerText = fmtTime(this.timeElapsed);
        el("stat-spawned").innerText = this.statsSpawned;
        el("stat-killed").innerText = this.statsKilled;
        el("stat-gold").innerText = Math.round(this.statsGoldEarned);
        el("stat-era").innerText = ERA_DATA[this.playerEra].name;
    }

    leaveMatch() {
        this.clearGraceTimer();
        if (this.net) {
            try { this.net.leave(); } catch (e) {}
            this.net = null;
        }
        this.mode = 'solo';
        this.gameState = 'menu';
        document.body.classList.remove('is-multiplayer');
        const badge = el("mp-badge");
        if (badge) badge.classList.add('hidden');
        for (const id of ["gameover-modal", "join-modal", "lobby-modal"]) {
            const m = el(id); if (m) m.classList.add("hidden");
        }
        this.showMenuView('menu');
        el("intro-modal").classList.remove("hidden");
        if (window.Music) window.Music.play('mainmenu');
    }

    // ----------------------------------------------------------------------
    // MENU + ONLINE MATCHMAKING
    // ----------------------------------------------------------------------

    setupMenu() {
        el("btn-solo").addEventListener("click", () => this.startMatch('solo'));
        el("btn-create").addEventListener("click", () => this.createOnline());
        el("btn-join").addEventListener("click", () => this.showJoin());

        el("btn-join-confirm").addEventListener("click", () => this.joinOnline());
        el("btn-join-back").addEventListener("click", () => { el("join-modal").classList.add("hidden"); el("intro-modal").classList.remove("hidden"); });
        el("join-code-input").addEventListener("keydown", (e) => { if (e.key === "Enter") this.joinOnline(); });

        el("btn-lobby-cancel").addEventListener("click", () => this.cancelOnline());
        el("btn-copy-code").addEventListener("click", () => {
            const code = el("lobby-code").innerText.trim();
            if (code && navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
            el("btn-copy-code").innerText = "Copied!";
            setTimeout(() => { el("btn-copy-code").innerText = "Copy"; }, 1200);
        });

        const howtoToggle = el("howto-toggle");
        if (howtoToggle) howtoToggle.addEventListener("click", () => el("howto-body").classList.toggle("open"));
    }

    showMenuView() {
        el("intro-modal").classList.remove("hidden");
        el("join-modal").classList.add("hidden");
        el("lobby-modal").classList.add("hidden");
    }

    showJoin() {
        el("intro-modal").classList.add("hidden");
        el("join-modal").classList.remove("hidden");
        el("join-error").innerText = "";
        el("join-code-input").value = "";
        el("join-code-input").focus();
    }

    setLobby(status, code) {
        el("lobby-status").innerText = status;
        const codeWrap = el("lobby-code-wrap");
        if (code) {
            codeWrap.classList.remove("hidden");
            el("lobby-code").innerText = code;
        } else {
            codeWrap.classList.add("hidden");
        }
    }

    async ensureNet() {
        if (this.net) return this.net;
        const mod = await import('./net.js');
        this.net = mod.EraNet;
        return this.net;
    }

    async createOnline() {
        el("intro-modal").classList.add("hidden");
        el("lobby-modal").classList.remove("hidden");
        this.setLobby("Connecting to server…", null);
        try {
            const net = await this.ensureNet();
            const code = await net.createGame();
            this.setLobby("Waiting for your opponent to join…", code);
            this._started = false;
            net.onMeta((meta) => {
                if (!meta) return;
                if (!this._started && meta.state === 'playing' && meta.guest) {
                    this._started = true;
                    this.beginAs('host');
                }
            });
        } catch (e) {
            console.error(e);
            this.setLobby("Could not create match: " + (e && e.message ? e.message : e), null);
        }
    }

    async joinOnline() {
        const code = (el("join-code-input").value || "").trim().toUpperCase();
        if (code.length < 4) { el("join-error").innerText = "Enter the 4-character code."; return; }
        el("join-error").innerText = "Joining…";
        try {
            const net = await this.ensureNet();
            await net.joinGame(code);
            this._started = true;
            el("join-modal").classList.add("hidden");
            this.beginAs('guest');
        } catch (e) {
            console.error(e);
            el("join-error").innerText = e && e.message ? e.message : "Failed to join.";
        }
    }

    beginAs(role) {
        this.startMatch(role);
        if (role === 'host') {
            this.net.onCommand((cmd) => this.onGuestCommand(cmd));
        } else {
            this.net.onSnapshot((snap) => this.applySnapshot(snap));
        }
        // Both sides: authoritative result / intentional-leave via meta, plus a
        // grace-guarded opponent-disconnect via presence (survives transient blips).
        this.net.onMeta((meta) => this.handleMetaUpdate(meta));
        this.net.onOpponentPresence((present) => this.handleOpponentPresence(present));
    }

    handleMetaUpdate(meta) {
        if (!meta || this._matchOver) return;
        if (meta.winner) {
            // Authoritative result decided by the host's simulation.
            const myTeam = this.mode === 'guest' ? 'enemy' : 'player';
            this._matchOver = true;
            this.gameState = meta.winner === myTeam ? 'victory' : 'defeat';
            this.showGameOver(this.gameState === 'victory', true);
        } else if (meta.state === 'ended') {
            // Opponent intentionally left the match.
            this.handleOpponentLeft();
        }
    }

    handleOpponentPresence(present) {
        if (this._matchOver) return;
        if (present) {
            if (this._oppGraceTimer) { clearTimeout(this._oppGraceTimer); this._oppGraceTimer = null; }
        } else if (!this._oppGraceTimer) {
            // Wait out transient network blips before declaring the opponent gone.
            this._oppGraceTimer = setTimeout(() => {
                this._oppGraceTimer = null;
                if (!this._matchOver && this.gameState === 'running') this.handleOpponentLeft();
            }, 8000);
        }
    }

    clearGraceTimer() {
        if (this._oppGraceTimer) { clearTimeout(this._oppGraceTimer); this._oppGraceTimer = null; }
    }

    handleOpponentLeft() {
        if (this._matchOver || this.gameState !== 'running') return;
        this._matchOver = true;
        this.gameState = 'victory';
        const modal = el("gameover-modal");
        modal.classList.remove("hidden", "defeat-style");
        modal.classList.add("victory-style");
        el("gameover-title").innerText = "OPPONENT LEFT";
        el("gameover-subtitle").innerText = "Your opponent disconnected. The battlefield is yours.";
        el("stat-time").innerText = fmtTime(this.timeElapsed);
        el("stat-spawned").innerText = this.statsSpawned;
        el("stat-killed").innerText = this.statsKilled;
        el("stat-gold").innerText = Math.round(this.statsGoldEarned);
        el("stat-era").innerText = ERA_DATA[this.playerEra].name;
    }

    cancelOnline() {
        this.clearGraceTimer();
        if (this.net) { try { this.net.leave(); } catch (e) {} this.net = null; }
        this._started = false;
        el("lobby-modal").classList.add("hidden");
        el("intro-modal").classList.remove("hidden");
        if (window.Music) window.Music.play('mainmenu');
    }

    // ----------------------------------------------------------------------
    // INPUT LISTENERS
    // ----------------------------------------------------------------------

    setupEventListeners() {
        // Spawn buttons are driven by the Interaction controller (drag-to-lane).
        for (let i = 1; i <= 3; i++) {
            el(`evolve-u${i}`).addEventListener("click", () => this.playerEvolveUnit(i - 1));
        }
        el("buy-tower-slot").addEventListener("click", () => this.playerBuySlot());
        el("buy-tower").addEventListener("click", () => { this.interaction && this.interaction.armTowerPlacement(); });
        el("upgrade-range").addEventListener("click", () => this.playerUpgradeRange());
        el("upgrade-special").addEventListener("click", () => this.playerUpgradeSpecial());
        el("special-btn").addEventListener("click", () => this.playerSpecial());

        // Lane HUD pills: unlock a locked lane, or pick the default spawn lane
        for (const laneName of ['top', 'mid', 'bottom']) {
            const pill = el('lane-' + laneName);
            if (!pill) continue;
            pill.addEventListener('click', () => {
                if (this.gameState !== 'running') return;
                if (!this.laneUnlocked.player[laneName]) this.playerOpenLane(laneName);
                else { this.selectedLane = laneName; this.updateButtonsUI(); }
            });
        }

        el("pause-btn").addEventListener("click", (e) => {
            if (this.mode !== 'solo') return; // pausing is disabled online
            if (this.gameState === 'running') { this.gameState = 'paused'; e.target.innerText = "RESUME"; }
            else if (this.gameState === 'paused') { this.gameState = 'running'; e.target.innerText = "PAUSE"; }
        });

        el("restart-btn").addEventListener("click", () => {
            if (this.mode !== 'solo') { this.leaveMatch(); return; }
            if (confirm("Restart the match?")) this.startMatch('solo');
        });

        el("menu-btn").addEventListener("click", () => {
            if (this.mode !== 'solo') {
                if (confirm("Leave the online match?")) this.leaveMatch();
            } else {
                this.gameState = 'menu';
                this.leaveMatch();
            }
        });

        el("start-game-btn") && el("start-game-btn").addEventListener("click", () => this.startMatch('solo'));
        el("play-again-btn").addEventListener("click", () => {
            if (this.mode === 'solo') this.startMatch('solo');
            else this.leaveMatch();
        });

        // Keyboard hotkeys (camera is handled by OrbitControls in the 3D view)
        window.addEventListener("keydown", (e) => {
            if (this.gameState !== 'running') return;
            if (e.target && e.target.tagName === 'INPUT') return;
            if (e.key === '1') this.playerSpawn(0, this.selectedLane);
            else if (e.key === '2') this.playerSpawn(1, this.selectedLane);
            else if (e.key === '3') this.playerSpawn(2, this.selectedLane);
            else if (e.key === ' ') { e.preventDefault(); this.playerSpecial(); }
        });
    }

    // ---- Unit tooltip (3D hover via raycast) ----
    unitById(id) {
        if (this.mode === 'guest') { const nu = this.netUnits.get(id); return nu ? nu.unit : null; }
        for (const u of this.playerUnits) if (u.id === id) return u;
        for (const u of this.enemyUnits) if (u.id === id) return u;
        return null;
    }
    showTip(u, clientX, clientY) {
        const tip = el("unit-tooltip");
        if (!tip) return;
        const maxHp = u.maxHp || u.hp;
        const hp = Math.max(0, Math.round(u.hp));
        const range = Math.round(u.getRange ? u.getRange(this) : u.attackRange);
        const mine = u.team === 'player';
        tip.innerHTML =
            `<div class="tt-name ${mine ? 'you' : 'foe'}">${u.name} <span class="tt-side">${mine ? 'YOU' : 'ENEMY'}</span></div>` +
            `<div class="tt-row"><span>HP</span><b>${hp} / ${maxHp}</b></div>` +
            `<div class="tt-row"><span>Attack</span><b>${u.damage}</b></div>` +
            `<div class="tt-row"><span>Speed</span><b>${u.speed}</b></div>` +
            `<div class="tt-row"><span>Range</span><b>${range}</b></div>`;
        tip.classList.remove("hidden");
        const wrap = el("canvas-wrapper").getBoundingClientRect();
        let left = clientX - wrap.left + 16;
        let top = clientY - wrap.top + 16;
        const tw = tip.offsetWidth, th = tip.offsetHeight;
        if (left + tw > wrap.width - 4) left = clientX - wrap.left - tw - 16;
        if (top + th > wrap.height - 4) top = wrap.height - th - 4;
        if (left < 4) left = 4;
        if (top < 4) top = 4;
        tip.style.left = left + "px";
        tip.style.top = top + "px";
    }
    hideTip() {
        const tip = el("unit-tooltip");
        if (tip) tip.classList.add("hidden");
    }
}

// ==========================================================================
// POINTER INTERACTION — drag-to-lane spawn, tower placement, hover tooltip.
// OrbitControls owns camera pan/zoom/orbit on the canvas; these gestures are
// disambiguated by where the pointer goes down (a unit button vs the ground).
// ==========================================================================
class Interaction {
    constructor(game) {
        this.game = game;
        this.r3d = game.r3d;
        this.canvas = game.canvas;
        this.mode = 'idle';          // 'idle' | 'spawn' | 'tower' | 'special'
        this.dragIndex = -1;
        this.dragMoved = false;
        this.ghost = el('drag-ghost');
        this.banner = el('tower-banner');
        this._hover = null;
        this._bind();
    }

    _bind() {
        for (let i = 1; i <= 3; i++) {
            el('spawn-u' + i).addEventListener('pointerdown', (e) => this._spawnDown(e, i - 1));
        }
        window.addEventListener('pointermove', (e) => this._move(e));
        window.addEventListener('pointerup', (e) => this._up(e));
        this.canvas.addEventListener('pointerdown', (e) => this._canvasDown(e));
        this.canvas.addEventListener('contextmenu', (e) => { if (this.mode === 'tower' || this.mode === 'special') { e.preventDefault(); this.cancel(); } });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.cancel(); });
        this.canvas.addEventListener('pointermove', (e) => {
            this._hover = { x: e.clientX, y: e.clientY };
            if (this.mode === 'tower') this._towerGhost(e.clientX, e.clientY);
            else if (this.mode === 'special') this._specialGhost(e.clientX, e.clientY);
        });
        this.canvas.addEventListener('pointerleave', () => { this._hover = null; this.game.hideTip(); });
    }

    _spawnDown(e, index) {
        const g = this.game;
        if (g.gameState !== 'running') return;
        // Heavy unit unlock is a plain action (no lane drag)
        if (index === 2 && !g.playerUnit3Unlocked) { g.playerSpawn(index); return; }
        const tier = g.playerUnitTier[index];
        const cost = ERA_DATA[tier].units[index].cost;
        if (g.gold < cost) {
            const b = el('spawn-u' + (index + 1));
            b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 300);
            sfx('error', { volume: 0.5 });
            return;
        }
        e.preventDefault();
        this.mode = 'spawn';
        this.dragIndex = index;
        this.dragMoved = false;
        if (this.r3d.controls) this.r3d.controls.enabled = false;
        if (this.ghost) {
            this.ghost.classList.remove('hidden');
            const unitName = ERA_DATA[tier].units[index].name;
            if (this.r3d && typeof this.r3d.renderUnitThumbnail === 'function') {
                let src = '';
                try { src = this.r3d.renderUnitThumbnail(tier, index, 'player'); } catch (err) {}
                this.ghost.innerHTML = `<img src="${src}"><span>${unitName}</span>`;
            } else {
                this.ghost.innerText = 'Drop on a lane: ' + unitName;
            }
        }
        this._moveGhost(e.clientX, e.clientY);
    }

    _move(e) {
        if (this.mode !== 'spawn') return;
        this.dragMoved = true;
        this._moveGhost(e.clientX, e.clientY);
    }

    _up(e) {
        if (this.mode !== 'spawn') return;
        const index = this.dragIndex;
        const lane = this._laneAt(e.clientX, e.clientY);
        this._endSpawn();
        const g = this.game;
        if (lane && g.laneUnlocked.player[lane]) g.playerSpawn(index, lane);
        else if (lane && !g.laneUnlocked.player[lane]) g.playerOpenLane(lane);
        else if (!this.dragMoved) g.playerSpawn(index, g.selectedLane);
    }

    _endSpawn() {
        this.mode = 'idle';
        this.dragIndex = -1;
        if (this.ghost) this.ghost.classList.add('hidden');
        if (this.r3d.controls) this.r3d.controls.enabled = true;
    }

    _moveGhost(x, y) {
        if (!this.ghost) return;
        this.ghost.style.left = x + 'px';
        this.ghost.style.top = y + 'px';
    }

    _laneAt(clientX, clientY) {
        const pt = this.r3d.raycastGround(clientX, clientY);
        if (!pt) return null;
        const info = this.r3d.laneOfHit(pt);
        // reject drops far from any lane centerline (~one lane width in three units)
        if (info.dist > 9) return null;
        return LANE_BY_IDX[info.laneIdx];
    }

    // ---- Tower placement ----
    armTowerPlacement() {
        const g = this.game;
        if (g.gameState !== 'running' || g.mode === 'guest' && false) return;
        if (g.playerBase.towers.length >= g.playerBase.unlockedSlots) return;
        if (g.gold < TOWER_BUILD_COST) return;
        this.mode = 'tower';
        if (this.r3d.controls) this.r3d.controls.enabled = false;
        if (this.banner) this.banner.classList.remove('hidden');
        g.updateButtonsUI();
    }

    // Live tower placement preview — show a range ring + validity at the cursor.
    _towerGhost(clientX, clientY) {
        const g = this.game;
        const r = this.r3d;
        if (!r || typeof r.raycastGround !== 'function' || typeof r.showTowerGhost !== 'function') return;
        const pt = r.raycastGround(clientX, clientY);
        if (!pt) { if (typeof r.hideTowerGhost === 'function') r.hideTowerGhost(); return; }
        const simX = pt.x / S + 900;
        const simZ = pt.z / S + 900;
        const range = ERA_DATA[g.playerEra].towerRange;
        const valid = g.towerSpotValid('player', simX, simZ) && g.gold >= TOWER_BUILD_COST;
        r.showTowerGhost(simX, simZ, range, valid);
    }

    // ---- Special-attack placement (targeted, radius) ----
    armSpecial() {
        const g = this.game;
        if (g.gameState !== 'running') return;
        if (g.specialLevel < 1 || g.specialTimer > 0) return;
        this.mode = 'special';
        if (this.r3d.controls) this.r3d.controls.enabled = false;
        if (this.banner) this.banner.classList.remove('hidden');
    }

    // Live special placement preview — show an AoE ring at the cursor.
    _specialGhost(clientX, clientY) {
        const r = this.r3d;
        if (!r || typeof r.raycastGround !== 'function') return;
        const pt = r.raycastGround(clientX, clientY);
        if (!pt) { if (typeof r.hideAoeGhost === 'function') r.hideAoeGhost(); return; }
        const simX = pt.x / S + MAP_SIZE / 2;
        const simZ = pt.z / S + MAP_SIZE / 2;
        // Valid anywhere on the map (both sides allowed).
        const valid = simX >= 0 && simX <= MAP_SIZE && simZ >= 0 && simZ <= MAP_SIZE;
        if (typeof r.showAoeGhost === 'function') r.showAoeGhost(simX, simZ, SPECIAL_RADIUS, valid);
    }

    _canvasDown(e) {
        if (this.mode === 'special') {
            if (e.button === 2) { this.cancel(); return; }
            const pt = this.r3d.raycastGround(e.clientX, e.clientY);
            if (!pt) return;
            const simX = pt.x / S + MAP_SIZE / 2;
            const simZ = pt.z / S + MAP_SIZE / 2;
            const valid = simX >= 0 && simX <= MAP_SIZE && simZ >= 0 && simZ <= MAP_SIZE;
            if (valid) {
                const g = this.game;
                if (g.mode === 'guest') {
                    g.net && g.net.sendCommand({ a: 'special', x: Math.round(simX), z: Math.round(simZ) });
                } else {
                    g.triggerSpecial('player', simX, simZ);
                }
            }
            this._endSpecial();
            return;
        }
        if (this.mode !== 'tower') return;
        if (e.button === 2) { this.cancel(); return; }
        const pt = this.r3d.raycastGround(e.clientX, e.clientY);
        if (!pt) return;
        const simX = pt.x / S + 900;
        const simZ = pt.z / S + 900;
        const g = this.game;
        if (g.playerBuildTower(simX, simZ)) {
            if (g.r3d && typeof g.r3d.hideTowerGhost === 'function') g.r3d.hideTowerGhost();
            if (g.playerBase.towers.length >= g.playerBase.unlockedSlots || g.gold < TOWER_BUILD_COST) this.cancel();
        }
    }

    _endSpecial() {
        this.mode = 'idle';
        if (this.r3d.controls) this.r3d.controls.enabled = true;
        if (this.banner) this.banner.classList.add('hidden');
        if (this.r3d && typeof this.r3d.hideAoeGhost === 'function') this.r3d.hideAoeGhost();
    }

    cancel() {
        if (this.mode === 'tower') {
            this.mode = 'idle';
            if (this.r3d.controls) this.r3d.controls.enabled = true;
            if (this.banner) this.banner.classList.add('hidden');
            if (this.r3d && typeof this.r3d.hideTowerGhost === 'function') this.r3d.hideTowerGhost();
            this.game.updateButtonsUI();
        } else if (this.mode === 'special') {
            this._endSpecial();
        } else if (this.mode === 'spawn') {
            this._endSpawn();
        }
    }

    // Called each frame from Game.draw() — resolve the hovered unit via raycast.
    updateHover() {
        if (this.mode !== 'idle' || !this._hover || this.game.gameState !== 'running') { this.game.hideTip(); return; }
        const id = this.r3d.raycastUnits(this._hover.x, this._hover.y);
        if (id == null) { this.game.hideTip(); return; }
        const u = this.game.unitById(id);
        if (u) this.game.showTip(u, this._hover.x, this._hover.y);
        else this.game.hideTip();
    }
}

// Instantiate engine when DOM is ready
window.addEventListener("DOMContentLoaded", () => {
    game = new Game();
    window.game = game; // expose for debugging / dev console
    requestAnimationFrame((t) => game.loop(t));
});
