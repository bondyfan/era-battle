/**
 * Era Battle - Game Engine & Core Logic (top-down 3D lane edition).
 * The simulation is authoritative and mostly 1D-per-lane; render3d.js is a pure
 * reflection of this state. Every player gesture ends in a player*() call.
 */

import {
    VIRTUAL_WIDTH, VIRTUAL_HEIGHT, GROUND_Y, PLAYER_BASE_X, ENEMY_BASE_X, BASE_HP_MAX,
    MIDLINE_X, TOWER_MARGIN, TOWER_MIN_SPACING,
    LANE_BY_IDX, LANE_IDX, LANE_Z, LANE_Z_BY_IDX, LANE_HALF_WIDTH,
    WORLD_Z_MIN, WORLD_Z_MAX, LANE_UNLOCK_COST, laneZOf, laneZ3, mapX, mapZ, S
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

// ==========================================================================
// PARTICLE SYSTEM
// ==========================================================================

class Particle {
    constructor(x, y, color, type = 'spark', text = '', customSize = null, z = 450) {
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
                const dist = Math.hypot(enemy.x - this.x, (enemy.z ?? 450) - this.z);
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
        game.particles.push(new Particle(this.x, towerY, flashColor, 'spark', '', 4));
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
        this.x = team === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X;
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

        // Base is a wall spanning all lanes -> distance measured on X only
        if (Math.abs(enemyBase.x - this.x) < r) {
            enemyBase.takeDamage(Math.round(this.damage * 0.5));
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
            const unit = enemies[i];
            if (unit.state === 'die') continue;
            const dist = Math.hypot(unit.x - this.x, (unit.z ?? 450) - (this.z ?? 450));
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
                // Spark indicator of shield hit
                game.particles.push(new Particle(this.x, this.y, '#e2e8f0', 'spark', '', 5));
            }
            this.target.takeDamage(actualDmg, game);
        } else if (this.maxHeight > 0 && (this.type === 'firepot' || this.type === 'grenade')) {
            // A lobbed shot whose target died mid-air still bursts where it lands
            this.splashRadius = this.type === 'firepot' ? 70 : 45;
            this.applySplash(game);
        }

        // Spawn Particles based on projectile type
        if (this.type === 'firepot') {
            for (let i = 0; i < 15; i++) {
                game.particles.push(new Particle(this.x, this.y, '#f59e0b', 'fire'));
                game.particles.push(new Particle(this.x, this.y, '#4b5563', 'smoke'));
            }
        } else if (this.type === 'grenade' || this.type === 'shell') {
            for (let i = 0; i < 12; i++) {
                game.particles.push(new Particle(this.x, this.y, '#ef4444', 'fire'));
                game.particles.push(new Particle(this.x, this.y, '#71717a', 'smoke'));
            }
        } else if (this.type === 'plasma') {
            for (let i = 0; i < 8; i++) {
                game.particles.push(new Particle(this.x, this.y, '#38bdf8', 'spark'));
            }
        } else {
            // Standard small spark / blood splat
            const hitColor = (this.target && this.target.hp > 0 && this.target.height) ? '#ef4444' : '#f59e0b';
            const particleType = hitColor === '#ef4444' ? 'blood' : 'spark';
            for (let i = 0; i < 5; i++) {
                game.particles.push(new Particle(this.x, this.y, hitColor, particleType));
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
        this.x = team === 'player' ? PLAYER_BASE_X + 30 : ENEMY_BASE_X - 30;

        // Lane / depth (set properly by Game.addUnitFree)
        this.lane = 'mid';
        this.laneZ = LANE_Z.mid;
        this.z = LANE_Z.mid;

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
        
        // Blood splat particle
        game.particles.push(new Particle(
            this.x + (Math.random() - 0.5) * 10,
            this.y - this.height / 2 + (Math.random() - 0.5) * 10,
            '#dc2626',
            'blood'
        ));
        
        // Damage floating indicator
        game.particles.push(new Particle(
            this.x,
            this.y - this.height - 5,
            '#ef4444',
            'text',
            `-${amount}`
        ));

        if (this.hp <= 0) {
            this.state = 'die';
            // Reward the opposing commander's economy
            if (this.team === 'enemy') {
                game.addGold(this.goldReward);
                game.statsKilled++;
                // Floating "+Xg" bounty so the player sees the reward for the kill
                game.particles.push(new Particle(this.x, this.y - this.height - 12, '#fbbf24', 'text', `+${this.goldReward}g`, 15));
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
            this.x += this.speed * this.facing * speedScale;
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

        // 1. Check for nearest enemy unit
        let closestEnemy = null;
        let closestEnemyDist = 99999;
        
        for (let enemy of enemies) {
            if (enemy.state === 'die') continue;
            if (enemy.lane !== this.lane) continue; // combat is same-lane only
            if (Math.abs((enemy.z ?? 450) - this.z) > LANE_HALF_WIDTH) continue;

            // Check direction relative to team
            const isAhead = this.team === 'player' ? (enemy.x > this.x) : (enemy.x < this.x);
            if (isAhead) {
                const dist = Math.abs(enemy.x - this.x) - (this.width / 2 + enemy.width / 2);
                if (dist < closestEnemyDist) {
                    closestEnemyDist = dist;
                    closestEnemy = enemy;
                }
            }
        }
        
        // 2. Check for Enemy Base
        const baseDist = Math.abs(enemyBase.x - this.x) - (this.width / 2 + enemyBase.width / 2);
        
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
        
        // 4. Teammate spacing blocking
        this.isBlocked = false;
        const teammateSpacingThreshold = 8;
        
        for (let mate of teammates) {
            if (mate === this || mate.state === 'die') continue;
            if (mate.lane !== this.lane) continue; // only block same-lane teammates

            const isAhead = this.team === 'player' ? (mate.x > this.x) : (mate.x < this.x);
            if (isAhead) {
                const dist = Math.abs(mate.x - this.x) - (this.width / 2 + mate.width / 2);
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
        
        // Verify target is still within attack range (handles movement shifts)
        const dist = Math.abs(this.target.x - this.x) - (this.width / 2 + this.target.width / 2);
        if (dist > this.getRange(game) + 15) {
            this.state = 'walk';
            this.target = null;
            return;
        }
        
        // Attack execution when timer finishes
        if (this.attackTimer <= 0) {
            this.attackTimer = this.attackCooldown;
            
            // Melee vs Ranged action
            if (this.type === 'melee' || this.type === 'heavy_melee' || this.type === 'shielded_melee') {
                // Immediate damage to target
                this.target.takeDamage(this.damage, game);
                
                // Strike impact splash particle
                const strikeX = this.x + (this.width / 2) * this.facing;
                game.particles.push(new Particle(strikeX, this.y - this.height / 2, '#fbbf24', 'spark', '', 3));
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
                const muzzleX = this.x + (this.width / 2) * this.facing;
                const muzzleY = this.y - this.height * 0.75;
                const targetY = this.target.y - (this.target.height ? this.target.height / 2 : 50);
                
                game.particles.push(new Particle(muzzleX, muzzleY, '#fbbf24', 'spark', '', 5)); // flash
                
                // Draw a quick bullet line in particles (custom light beam)
                game.particles.push(new Particle(this.target.x, targetY, '#ef4444', 'spark', '', 3));
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
    constructor(type, team, dmgMult = 1) {
        this.type = type; // 'meteor', 'arrows', 'fireball', 'airstrike', 'orbitallaser'
        this.team = team;
        this.dmgMult = dmgMult; // scales all damage by the purchased special level
        this.timer = 0;
        this.duration = type === 'orbitallaser' ? 3000 : (type === 'airstrike' ? 2500 : 2000);
        this.isDead = false;
        
        // Scatter across the OPPONENT's half, spanning all lanes (z)
        this.projectilesToSpawn = [];
        const xLo = team === 'player' ? ENEMY_BASE_X - 720 : PLAYER_BASE_X + 220;
        const xHi = team === 'player' ? ENEMY_BASE_X - 220 : PLAYER_BASE_X + 720;
        const rx = () => xLo + Math.random() * (xHi - xLo);
        const rz = () => WORLD_Z_MIN + Math.random() * (WORLD_Z_MAX - WORLD_Z_MIN);

        if (type === 'meteor') {
            for (let i = 0; i < 15; i++) this.projectilesToSpawn.push({ delay: i * 120, x: rx(), z: rz(), spawned: false });
        } else if (type === 'arrows') {
            for (let i = 0; i < 50; i++) this.projectilesToSpawn.push({ delay: i * 35, x: rx(), z: rz(), spawned: false });
        } else if (type === 'fireball') {
            for (let i = 0; i < 8; i++) this.projectilesToSpawn.push({ delay: i * 220, x: rx(), z: rz(), spawned: false });
        } else if (type === 'airstrike') {
            // Carpet-bomb one random lane
            this.laneZ = LANE_Z_BY_IDX[Math.floor(Math.random() * 3)];
            for (let i = 0; i < 8; i++) {
                this.projectilesToSpawn.push({
                    delay: 500 + i * 200,
                    x: team === 'player' ? (PLAYER_BASE_X + 300 + i * 140) : (ENEMY_BASE_X - 300 - i * 140),
                    z: this.laneZ, spawned: false
                });
            }
            this.airstrikePlaneX = team === 'player' ? 0 : VIRTUAL_WIDTH;
            this.x = this.airstrikePlaneX; this.z = this.laneZ;
        } else if (type === 'orbitallaser') {
            // Beam parked in enemy territory, sweeping across the lanes (z)
            this.laserX = team === 'player' ? ENEMY_BASE_X - 420 : PLAYER_BASE_X + 420;
            this.laserZ = WORLD_Z_MIN;
            this.x = this.laserX; this.z = this.laserZ;
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
            const planeSpeed = (VIRTUAL_WIDTH / (this.duration / 1000)) * (dt / 1000);
            this.airstrikePlaneX += (this.team === 'player' ? planeSpeed : -planeSpeed);
            this.x = this.airstrikePlaneX;
        }
        else if (this.type === 'orbitallaser') {
            // Sweep the beam across the lanes (z) at a fixed x
            const sweep = ((WORLD_Z_MAX - WORLD_Z_MIN) / (this.duration / 1000)) * (dt / 1000);
            this.laserZ += sweep;
            this.z = this.laserZ; this.x = this.laserX;

            const laserRadius = 75;
            const enemies = this.team === 'player' ? game.enemyUnits : game.playerUnits;
            const enemyBase = this.team === 'player' ? game.enemyBase : game.playerBase;

            if (Math.abs(enemyBase.x - this.laserX) < laserRadius) {
                enemyBase.takeDamage(Math.round(4 * this.dmgMult));
            }
            for (let unit of enemies) {
                if (unit.state === 'die') continue;
                if (Math.hypot(unit.x - this.laserX, (unit.z ?? 450) - this.laserZ) < laserRadius) {
                    unit.takeDamage(Math.round(8 * this.dmgMult), game);
                }
            }
            if (Math.random() < 0.8) {
                game.particles.push(new Particle(this.laserX + (Math.random() - 0.5) * 20, GROUND_Y, '#38bdf8', 'spark', '', 4));
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
            const px = this.airstrikePlaneX - cameraX;
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
        // deterministic ±20 spread within the lane so units don't perfectly overlap
        u.zJitter = ((u.id * 53) % 41) - 20;
        u.laneZ = laneZOf(lane) + u.zJitter;
        u.z = u.laneZ;
        (team === 'player' ? this.playerUnits : this.enemyUnits).push(u);
        const gx = team === 'player' ? PLAYER_BASE_X + 30 : ENEMY_BASE_X - 30;
        this.particles.push(new Particle(gx, GROUND_Y - 20, '#cbd5e1', 'smoke'));
        return u;
    }

    // ---- Lane unlock (top / bottom) ----
    unlockLane(team, lane) {
        if (lane === 'mid' || this.laneUnlocked[team][lane]) return;
        if (team === 'player') {
            if (this.gold < LANE_UNLOCK_COST) return;
            this.gold -= LANE_UNLOCK_COST;
            this.laneUnlocked.player[lane] = true;
            const z = laneZOf(lane);
            for (let i = 0; i < 20; i++) this.particles.push(new Particle(PLAYER_BASE_X + 90, GROUND_Y - 40 - Math.random() * 60, '#fbbf24', 'spark', '', 5));
            this.particles.push(new Particle(PLAYER_BASE_X + 90, GROUND_Y - 60, '#fbbf24', 'text', lane.toUpperCase() + ' LANE OPEN!', 16));
            this.updateButtonsUI();
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
            this.particles.push(new Particle(PLAYER_BASE_X + 30, GROUND_Y - 40, '#fbbf24', 'text', 'UNLOCKED!', 18));
            this.updateButtonsUI();
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
        const bx = team === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X;
        const col = team === 'player' ? '#a855f7' : '#ef4444';
        for (let i = 0; i < 24; i++) {
            this.particles.push(new Particle(bx + (Math.random() - 0.5) * 50, GROUND_Y - 90 - Math.random() * 130, col, 'spark', '', 4));
        }
        this.particles.push(new Particle(bx, GROUND_Y - 240, col, 'text', ERA_DATA[tiers[slot]].units[slot].name.toUpperCase() + "!", 18));
        const base = team === 'player' ? this.playerBase : this.enemyBase;
        for (const t of base.towers) t.cooldownTimer = 0;
        if (team === 'player') this.updateButtonsUI();
    }

    rangeBonus(team) {
        const lvl = team === 'player' ? this.rangeLevel : this.enemyRangeLevel;
        return lvl * RANGE_BONUS_PER_LEVEL;
    }

    triggerSpecial(team) {
        const level = team === 'player' ? this.specialLevel : this.enemySpecialLevel;
        if (level < 1) return; // must be purchased first
        const timer = team === 'player' ? this.specialTimer : this.enemySpecialTimer;
        if (timer > 0) return;
        const cfg = ERA_DATA[team === 'player' ? this.playerEra : this.enemyEra];
        this.specialAttacks.push(new SpecialAttack(cfg.specialType, team, SPECIAL_LEVEL_MULT[level]));
        if (team === 'player') this.specialTimer = SPECIAL_COOLDOWN_MS;
        else this.enemySpecialTimer = SPECIAL_COOLDOWN_MS;
        const label = (team === 'enemy' ? "ENEMY " : "") + cfg.specialName.toUpperCase();
        const cx = team === 'player' ? PLAYER_BASE_X + 320 : ENEMY_BASE_X - 320;
        this.particles.push(new Particle(cx, 110, team === 'player' ? '#a855f7' : '#ef4444', 'text', label, 24));
    }

    upgradeSpecial(team) {
        const level = team === 'player' ? this.specialLevel : this.enemySpecialLevel;
        if (level >= MAX_SPECIAL_LEVEL) return;
        const cost = SPECIAL_UPGRADE_COSTS[level];
        if (team === 'player') {
            if (this.gold < cost) return;
            this.gold -= cost;
            this.specialLevel++;
            this.particles.push(new Particle(PLAYER_BASE_X + 320, 110, '#a855f7', 'text', 'SPECIAL Lv ' + this.specialLevel + '!', 22));
            this.updateButtonsUI();
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
            this.particles.push(new Particle(PLAYER_BASE_X + 30, GROUND_Y - 60, '#38bdf8', 'text', 'RANGE Lv ' + this.rangeLevel + '!', 20));
            this.updateButtonsUI();
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
        this.particles.push(new Particle((team === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X) + 35, GROUND_Y - 140, '#fbbf24', 'spark', '', 6));
        if (team === 'player') this.updateButtonsUI();
    }

    // Is (x,z) a legal tower spot for this team? (own half only, in bounds, spaced)
    towerSpotValid(team, x, z) {
        if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
        if (z < WORLD_Z_MIN || z > WORLD_Z_MAX) return false;
        // own half only
        if (team === 'player' && x > MIDLINE_X - TOWER_MARGIN) return false;
        if (team === 'enemy' && x < MIDLINE_X + TOWER_MARGIN) return false;
        if (x < PLAYER_BASE_X + 40 || x > ENEMY_BASE_X - 40) return false;
        const base = team === 'player' ? this.playerBase : this.enemyBase;
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
        for (let i = 0; i < 8; i++) this.particles.push(new Particle(x + (Math.random() - 0.5) * 20, GROUND_Y - 40 - Math.random() * 40, '#fbbf24', 'spark', '', 6));
        if (team === 'player') this.updateButtonsUI();
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
        if (this.mode === 'guest') { this.net && this.net.sendCommand({ a: 'special' }); return; }
        this.triggerSpecial('player');
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
            case 'spawn': this.trySpawn('enemy', cmd.i | 0, LANE_BY_IDX[cmd.l | 0] || 'mid'); break;
            case 'unlock': this.unlockUnit3('enemy'); break;
            case 'lane': this.unlockLane('enemy', LANE_BY_IDX[cmd.l | 0] || 'mid'); break;
            case 'evolveu': this.evolveUnit('enemy', cmd.i | 0); break;
            case 'special': this.triggerSpecial('enemy'); break;
            case 'slot': this.buyTowerSlot('enemy'); break;
            case 'tower': {
                // guest sends its own (mirrored) coords -> un-mirror to host space, then validate
                const hx = VIRTUAL_WIDTH - (cmd.x | 0);
                const hz = cmd.z | 0;
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
        // Per-unit spawn + evolve cards
        for (let i = 0; i < 3; i++) {
            const tier = this.playerUnitTier[i];
            const unit = ERA_DATA[tier].units[i];
            const spawnBtn = el(`spawn-u${i + 1}`);
            const evoBtn = el(`evolve-u${i + 1}`);
            const evoStats = el(`evo-stats-${i + 1}`);

            // Current stats of the unit you'd spawn right now
            el(`unit-stats-${i + 1}`).innerText = `HP ${unit.hp} · ATK ${unit.damage} · SPD ${unit.speed}`;

            if (i === 2 && !this.playerUnit3Unlocked) {
                // Heavy unit still locked — spawn button becomes the unlock button
                spawnBtn.querySelector(".unit-name").innerText = unit.name;
                spawnBtn.querySelector(".unit-cost").innerText = `🔒 Unlock ${UNIT3_UNLOCK_COST}g`;
                spawnBtn.classList.add("locked-unit");
                evoBtn.disabled = true;
                evoBtn.querySelector(".evo-label").innerText = "Locked";
                evoBtn.querySelector(".evo-cost").innerText = "";
                evoStats.innerText = "Unlock the unit first";
                continue;
            }
            spawnBtn.classList.remove("locked-unit");
            spawnBtn.querySelector(".unit-name").innerText = `${unit.name} · T${tier + 1}`;
            spawnBtn.querySelector(".unit-cost").innerText = `${unit.cost}g`;

            if (tier >= 4) {
                evoBtn.disabled = true;
                evoBtn.querySelector(".evo-label").innerText = "MAX TIER";
                evoBtn.querySelector(".evo-cost").innerText = "";
                evoStats.innerText = `HP ${unit.hp} · ATK ${unit.damage} · SPD ${unit.speed}`;
            } else {
                const next = ERA_DATA[tier + 1].units[i];
                evoBtn.disabled = false;
                evoBtn.querySelector(".evo-label").innerText = `▲ ${next.name}`;
                evoBtn.querySelector(".evo-cost").innerText = `${this.unitEvolveCost(i, tier)}g`;
                evoStats.innerText = `HP ${next.hp} · ATK ${next.damage} · SPD ${next.speed}`;
            }
        }

        const slotBtn = el("buy-tower-slot");
        const slotCostLabel = el("tower-slot-cost");
        if (this.playerBase.unlockedSlots < 3) {
            slotBtn.disabled = false;
            slotCostLabel.innerText = `${TOWER_SLOT_COSTS[this.playerBase.unlockedSlots]}g`;
            slotBtn.querySelector(".tower-label").innerText = `Slot ${this.playerBase.unlockedSlots + 1}`;
        } else {
            slotBtn.disabled = true;
            slotCostLabel.innerText = "MAX";
            slotBtn.querySelector(".tower-label").innerText = "Slots Locked";
        }

        const towerBtn = el("buy-tower");
        const towerCostLabel = el("tower-cost");
        if (this.playerBase.towers.length < this.playerBase.unlockedSlots) {
            towerBtn.disabled = false;
            towerCostLabel.innerText = `${TOWER_BUILD_COST}g`;
            towerBtn.querySelector(".tower-label").innerText = "Build Tower";
        } else {
            towerBtn.disabled = true;
            towerCostLabel.innerText = "MAX";
            towerBtn.querySelector(".tower-label").innerText = (this.playerBase.unlockedSlots === 0) ? "Unlock Slot First" : "Slots Full";
        }

        // Range upgrade button (with next-level reach preview)
        const rBtn = el("upgrade-range");
        const rCost = el("range-cost");
        const rStat = el("range-stat");
        if (this.rangeLevel >= MAX_RANGE_LEVEL) {
            rBtn.disabled = true;
            rBtn.querySelector(".tower-label").innerText = "Range MAX";
            rCost.innerText = "MAX";
            rStat.innerText = `Reach +${this.rangeLevel * RANGE_BONUS_PER_LEVEL}`;
        } else {
            rBtn.disabled = false;
            rBtn.querySelector(".tower-label").innerText = `Range → Lv ${this.rangeLevel + 1}`;
            rCost.innerText = `${RANGE_UPGRADE_COSTS[this.rangeLevel]}g`;
            rStat.innerText = `Reach +${(this.rangeLevel + 1) * RANGE_BONUS_PER_LEVEL} px`;
        }

        // Special buy/upgrade button (with next-level power preview)
        const sBtn = el("upgrade-special");
        const sCost = el("special-upg-cost");
        const sStat = el("special-stat");
        if (this.specialLevel >= MAX_SPECIAL_LEVEL) {
            sBtn.disabled = true;
            sBtn.querySelector(".tower-label").innerText = "Special MAX";
            sCost.innerText = "MAX";
            sStat.innerText = `Power ×${SPECIAL_LEVEL_MULT[this.specialLevel]}`;
        } else {
            sBtn.disabled = false;
            sBtn.querySelector(".tower-label").innerText = this.specialLevel === 0 ? "Buy Special" : `Special → Lv ${this.specialLevel + 1}`;
            sCost.innerText = `${SPECIAL_UPGRADE_COSTS[this.specialLevel]}g`;
            sStat.innerText = `Power ×${SPECIAL_LEVEL_MULT[this.specialLevel + 1]}`;
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
            if (i === 2 && !this.playerUnit3Unlocked) {
                // Spawn button = unlock; evolve stays disabled
                spawnBtn.classList.toggle("disabled", this.gold < UNIT3_UNLOCK_COST);
                evoBtn.classList.add("disabled");
                continue;
            }
            spawnBtn.classList.toggle("disabled", this.gold < ERA_DATA[tier].units[i].cost);
            if (tier >= 4) evoBtn.classList.add("disabled");
            else evoBtn.classList.toggle("disabled", this.gold < this.unitEvolveCost(i, tier));
        }
        // Upgrade buttons grey out when unaffordable (but not when already maxed)
        const rMax = this.rangeLevel >= MAX_RANGE_LEVEL;
        el("upgrade-range").classList.toggle("disabled", !rMax && this.gold < RANGE_UPGRADE_COSTS[this.rangeLevel]);
        const sMax = this.specialLevel >= MAX_SPECIAL_LEVEL;
        el("upgrade-special").classList.toggle("disabled", !sMax && this.gold < SPECIAL_UPGRADE_COSTS[this.specialLevel]);
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

        // AI builds towers on its own half (radial), a few over time
        if (this.enemyBase.unlockedSlots < 3 && this.timeElapsed > (this.enemyBase.unlockedSlots * 120 + 60)) {
            this.enemyBase.unlockedSlots++;
        }
        if (this.enemyBase.towers.length < this.enemyBase.unlockedSlots) {
            const laneIdx = this.enemyBase.towers.length % 3;
            const tz = LANE_Z_BY_IDX[laneIdx];
            const tx = ENEMY_BASE_X - 180 - this.enemyBase.towers.length * 40;
            if (this.towerSpotValid('enemy', tx, tz)) this.enemyBase.towers.push(new Tower('enemy', tx, tz));
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
                this.triggerSpecial('enemy');
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
        const u = [];
        for (const un of this.playerUnits) u.push([un.id, 'p', un.era, un.typeIndex, safeInt(un.x), safeInt(un.z), LANE_IDX[un.lane] || 0, safeInt(un.hp), un.state, un.facing, +un.deathProgress.toFixed(2)]);
        for (const un of this.enemyUnits) u.push([un.id, 'e', un.era, un.typeIndex, safeInt(un.x), safeInt(un.z), LANE_IDX[un.lane] || 0, safeInt(un.hp), un.state, un.facing, +un.deathProgress.toFixed(2)]);

        const p = [];
        for (const pr of this.projectiles) p.push([safeInt(pr.x), safeInt(pr.y), safeInt(pr.z ?? 450), pr.type, pr.team]);

        const s = [];
        for (const sa of this.specialAttacks) {
            if (sa.type === 'airstrike') s.push(['airstrike', sa.team, safeInt(sa.x ?? sa.airstrikePlaneX), safeInt(sa.z ?? 450)]);
            else if (sa.type === 'orbitallaser') s.push(['orbitallaser', sa.team, safeInt(sa.x ?? sa.laserX), safeInt(sa.z ?? sa.laserZ ?? 450)]);
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

        // Lanes: guest's own = enemy fields (elu); opponent = plu
        const elu = snap.elu || [true, false, false];
        const plu = snap.plu || [true, false, false];
        this.laneUnlocked.player = { mid: !!elu[0], top: !!elu[1], bottom: !!elu[2] };
        this.laneUnlocked.enemy = { mid: !!plu[0], top: !!plu[1], bottom: !!plu[2] };

        // Guest's own end-of-match stats (tracked authoritatively by the host)
        this.statsSpawned = snap.es || 0;
        this.statsKilled = snap.ek || 0;
        this.statsGoldEarned = snap.egn || 150;

        this.playerBase.hp = snap.eh;
        this.enemyBase.hp = snap.ph;
        this.playerBase.unlockedSlots = snap.eus;
        this.enemyBase.unlockedSlots = snap.pus;

        // Towers rebuilt from tw[] (mirror x, keep z). guest own = host 'e' towers.
        this.playerBase.towers = [];
        this.enemyBase.towers = [];
        for (const arr of (snap.tw || [])) {
            const [tc, tx, tz] = arr;
            const gTeam = tc === 'e' ? 'player' : 'enemy';
            const tw = new Tower(gTeam, VIRTUAL_WIDTH - tx, tz);
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

        // Units — mirror x into guest-space, keep z + lane
        const seen = new Set();
        for (const arr of snap.u) {
            const [id, team, era, ti, x, z, laneIdx, hp, st, f] = arr;
            seen.add(id);
            const gTeam = team === 'e' ? 'player' : 'enemy'; // guest's own units are host's 'enemy'
            const gx = VIRTUAL_WIDTH - x;
            const gz = z;
            const gf = -f;
            const gLane = LANE_BY_IDX[laneIdx] || 'mid';
            let nu = this.netUnits.get(id);
            if (!nu) {
                const stats = ERA_DATA[era].units[ti];
                const unit = new Unit(era, ti, gTeam, stats);
                unit.id = id; unit.x = gx; unit.z = gz; unit.lane = gLane; unit.facing = gf;
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
            unit.hp = hp; unit.state = st; unit.facing = gf;
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

        // Projectiles / specials — mirror x, keep z
        this.netProjectiles = (snap.p || []).map(([x, y, z, type, team]) => ({
            x: VIRTUAL_WIDTH - x, y, z, type, team: team === 'player' ? 'enemy' : 'player'
        }));
        this.netSpecials = (snap.s || []).map(([type, team, x, z]) => ({
            type, team: team === 'player' ? 'enemy' : 'player', x: VIRTUAL_WIDTH - x, z
        }));

        // End of match (host-authoritative result)
        if ((snap.st === 'victory' || snap.st === 'defeat') && !this._matchOver) {
            this._matchOver = true;
            this.gameState = snap.st === 'victory' ? 'defeat' : 'victory';
            this.showGameOver(this.gameState === 'victory', true);
        }
    }

    setTowerCount(base, team, count) {
        while (base.towers.length < count) base.towers.push(new Tower(team, base.towers.length));
        while (base.towers.length > count) base.towers.pop();
    }

    spawnHitFx(x, height, z = 450) {
        this.particles.push(new Particle(x + (Math.random() - 0.5) * 10, GROUND_Y - (height || 40) / 2, '#dc2626', 'blood', '', null, z));
    }
    spawnDeathFx(x, height, z = 450) {
        for (let i = 0; i < 4; i++) this.particles.push(new Particle(x + (Math.random() - 0.5) * 12, GROUND_Y - (height || 40) / 2, '#dc2626', 'blood', '', null, z));
        this.particles.push(new Particle(x, GROUND_Y - 20, '#cbd5e1', 'smoke', '', null, z));
    }
    spawnBountyFx(x, height, era, ti, z = 450) {
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
                r.floatText(p.x, p.z ?? 450, p.text, p.color, false);
            } else if (p.type === 'blood') {
                r.burst(p.x, p.z ?? 450, 0xdc2626, 3, false);
            } else if (p.type === 'fire') {
                r.burst(p.x, p.z ?? 450, 0xf97316, 2, false);
            } else if (p.type === 'spark') {
                r.burst(p.x, p.z ?? 450, hexToInt(p.color), 2, false);
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
        this.mode = 'idle';          // 'idle' | 'spawn' | 'tower'
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
        this.canvas.addEventListener('contextmenu', (e) => { if (this.mode === 'tower') { e.preventDefault(); this.cancel(); } });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.cancel(); });
        this.canvas.addEventListener('pointermove', (e) => { this._hover = { x: e.clientX, y: e.clientY }; });
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
            return;
        }
        e.preventDefault();
        this.mode = 'spawn';
        this.dragIndex = index;
        this.dragMoved = false;
        if (this.r3d.controls) this.r3d.controls.enabled = false;
        if (this.ghost) { this.ghost.classList.remove('hidden'); this.ghost.innerText = 'Drop on a lane: ' + ERA_DATA[tier].units[index].name; }
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

    _canvasDown(e) {
        if (this.mode !== 'tower') return;
        if (e.button === 2) { this.cancel(); return; }
        const pt = this.r3d.raycastGround(e.clientX, e.clientY);
        if (!pt) return;
        const simX = pt.x / S + 900;
        const simZ = pt.z / S + 450;
        const g = this.game;
        if (g.playerBuildTower(simX, simZ)) {
            if (g.playerBase.towers.length >= g.playerBase.unlockedSlots || g.gold < TOWER_BUILD_COST) this.cancel();
        }
    }

    cancel() {
        if (this.mode === 'tower') {
            this.mode = 'idle';
            if (this.r3d.controls) this.r3d.controls.enabled = true;
            if (this.banner) this.banner.classList.add('hidden');
            this.game.updateButtonsUI();
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
