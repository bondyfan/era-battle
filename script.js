/**
 * Era Battle - Game Engine & Core Logic
 * Inspired by Age of War. All rights reserved for original concepts.
 * 
 * Architecture:
 * - Game: Core manager, holds state, lists, inputs, and canvas drawing.
 * - Base: Player & Enemy fortress. Handles HP and tower slots.
 * - Tower: Mounted base defenses that shoot projectiles at nearest enemies.
 * - Unit: Soldier instances, movements, collision, queuing, and animations.
 * - Projectile: Ranged attacks moving via linear or parabolic physics.
 * - SpecialAttack: Sweeping and dropping field effects.
 * - Particle: Combat gore, sparks, smoke, and floating text awards.
 */

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

const VIRTUAL_WIDTH = 1800;
const VIRTUAL_HEIGHT = 400;
const GROUND_Y = 340;
const PLAYER_BASE_X = 100;
const ENEMY_BASE_X = 1700;
const BASE_HP_MAX = 2000;
const SPECIAL_COOLDOWN_MS = 40000; // 40 seconds
const TOWER_SLOT_COSTS = [150, 400, 1000];
const TOWER_BUILD_COST = 250;

// ==========================================================================
// PARTICLE SYSTEM
// ==========================================================================

class Particle {
    constructor(x, y, color, type = 'spark', text = '', customSize = null) {
        this.x = x;
        this.y = y;
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
            ctx.font = `bold ${this.size}px var(--font-family)`;
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
    constructor(team, slotIndex) {
        this.team = team;
        this.slotIndex = slotIndex; // 0, 1, or 2
        this.cooldownTimer = 0;
    }

    update(dt, game) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
        }
        
        const era = this.team === 'player' ? game.playerEra : game.enemyEra;
        const eraConfig = ERA_DATA[era];
        
        if (this.cooldownTimer <= 0) {
            // Find target
            const enemies = this.team === 'player' ? game.enemyUnits : game.playerUnits;
            const myBaseX = this.team === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X;
            
            let closestEnemy = null;
            let closestDist = eraConfig.towerRange;
            
            // Loop through enemies
            for (let enemy of enemies) {
                const dist = Math.abs(enemy.x - myBaseX);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }
            
            // Check if enemy base is in range (towers can't reach bases usually due to range, but check anyway)
            const enemyBase = this.team === 'player' ? game.enemyBase : game.playerBase;
            const enemyBaseX = this.team === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X;
            const baseDist = Math.abs(enemyBaseX - myBaseX);
            if (!closestEnemy && baseDist < closestDist) {
                closestEnemy = enemyBase;
            }
            
            if (closestEnemy) {
                this.shoot(closestEnemy, game, eraConfig);
            }
        }
    }

    shoot(target, game, eraConfig) {
        this.cooldownTimer = eraConfig.towerCooldown;
        
        // Calculate spawn position on base
        const myBaseX = this.team === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X;
        const towerX = this.team === 'player' ? myBaseX + 35 : myBaseX - 35;
        const towerY = GROUND_Y - 90 - (this.slotIndex * 60);
        
        game.projectiles.push(new Projectile(
            towerX,
            towerY,
            target,
            this.team,
            eraConfig.towerDamage,
            eraConfig.towerProj,
            2.5 // moderate speed multiplier
        ));
        
        // Firing flash particle
        const flashColor = this.team === 'player' ? '#60a5fa' : '#f87171';
        game.particles.push(new Particle(towerX, towerY, flashColor, 'spark', '', 4));
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
    constructor(startX, startY, target, team, damage, type, speedMultiplier = 1.0) {
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.target = target; // Unit instance or Base instance
        this.team = team;
        this.damage = damage;
        this.type = type; // 'pebble', 'spear', 'arrow', 'bolt', 'firepot', 'bullet', 'grenade', 'shell', 'plasma'
        this.t = 0; // Interpolation factor (0 to 1)
        
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
        }
        
        // Calculate coordinate
        this.x = this.startX + (this.targetX - this.startX) * this.t;
        
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

    impact(game) {
        // Hit effects & Damage
        if (this.target && this.target.hp > 0) {
            // Apply shield mitigation (Medieval Knight takes less projectile damage)
            let actualDmg = this.damage;
            if (this.target.type === 'shielded_melee' && 
                (this.type === 'arrow' || this.type === 'bolt' || this.type === 'pebble' || this.type === 'bullet')) {
                actualDmg = Math.round(this.damage * 0.4); // 60% mitigation!
                // Spark indicator of shield hit
                game.particles.push(new Particle(this.x, this.y, '#e2e8f0', 'spark', '', 5));
            }
            
            this.target.takeDamage(actualDmg, game);
        } else if (this.maxHeight > 0) {
            // Splash damage check if it's a splash projectile (grenade or catapult pot)
            if (this.type === 'firepot' || this.type === 'grenade') {
                const splashRadius = this.type === 'firepot' ? 70 : 45;
                const enemies = this.team === 'player' ? game.enemyUnits : game.playerUnits;
                
                // Damage enemy base if nearby
                const enemyBase = this.team === 'player' ? game.enemyBase : game.playerBase;
                const baseDist = Math.abs(enemyBase.x - this.x);
                if (baseDist < splashRadius) {
                    enemyBase.takeDamage(Math.round(this.damage * 0.5));
                }
                
                // Damage units in area
                for (let unit of enemies) {
                    const dist = Math.abs(unit.x - this.x);
                    if (dist < splashRadius) {
                        unit.takeDamage(Math.round(this.damage * 0.7), game);
                    }
                }
            }
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
            // Reward opponent
            if (this.team === 'enemy') {
                game.addGold(this.goldReward);
                game.addXp(this.xpReward);
                game.statsKilled++;
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

    scanBattlefield(game) {
        const enemies = this.team === 'player' ? game.enemyUnits : game.playerUnits;
        const teammates = this.team === 'player' ? game.playerUnits : game.enemyUnits;
        const enemyBase = this.team === 'player' ? game.enemyBase : game.playerBase;
        
        // 1. Check for nearest enemy unit
        let closestEnemy = null;
        let closestEnemyDist = 99999;
        
        for (let enemy of enemies) {
            if (enemy.state === 'die') continue;
            
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
        if (closestEnemy && closestEnemyDist <= this.attackRange) {
            this.state = 'attack';
            this.target = closestEnemy;
            return;
        } 
        else if (baseDist <= this.attackRange) {
            this.state = 'attack';
            this.target = enemyBase;
            return;
        }
        
        // 4. Teammate spacing blocking
        this.isBlocked = false;
        const teammateSpacingThreshold = 8;
        
        for (let mate of teammates) {
            if (mate === this || mate.state === 'die') continue;
            
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
        if (dist > this.attackRange + 15) {
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
                    this.projectileType
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
                    1.8 // fast speed
                ));
            }
            else if (this.type === 'laser_heavy') {
                // Heavy walker twin beams
                const baseMuzzleY = this.y - this.height * 0.75;
                const muzzleX = this.x + (this.width / 2) * this.facing;
                
                game.projectiles.push(new Projectile(muzzleX, baseMuzzleY - 10, this.target, this.team, Math.round(this.damage / 2), 'plasma', 2.0));
                game.projectiles.push(new Projectile(muzzleX, baseMuzzleY + 10, this.target, this.team, Math.round(this.damage / 2), 'plasma', 2.0));
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
    constructor(type, team) {
        this.type = type; // 'meteor', 'arrows', 'fireball', 'airstrike', 'orbitallaser'
        this.team = team;
        this.timer = 0;
        this.duration = type === 'orbitallaser' ? 3000 : (type === 'airstrike' ? 2500 : 2000);
        this.isDead = false;
        
        // Spawn elements based on type
        this.projectilesToSpawn = [];
        this.airstrikePlaneX = team === 'player' ? 0 : VIRTUAL_WIDTH;
        
        if (type === 'meteor') {
            for (let i = 0; i < 15; i++) {
                this.projectilesToSpawn.push({
                    delay: i * 120,
                    x: (team === 'player' ? ENEMY_BASE_X - 700 : PLAYER_BASE_X + 200) + Math.random() * 500,
                    y: 0,
                    spawned: false
                });
            }
        } 
        else if (type === 'arrows') {
            for (let i = 0; i < 50; i++) {
                this.projectilesToSpawn.push({
                    delay: i * 35,
                    x: (team === 'player' ? ENEMY_BASE_X - 800 : PLAYER_BASE_X + 100) + Math.random() * 700,
                    y: 0,
                    spawned: false
                });
            }
        } 
        else if (type === 'fireball') {
            for (let i = 0; i < 8; i++) {
                this.projectilesToSpawn.push({
                    delay: i * 220,
                    x: (team === 'player' ? ENEMY_BASE_X - 600 : PLAYER_BASE_X + 200) + Math.random() * 450,
                    y: 0,
                    spawned: false
                });
            }
        }
        else if (type === 'airstrike') {
            // Bombs logic scheduled along plane trajectory
            for (let i = 0; i < 8; i++) {
                this.projectilesToSpawn.push({
                    delay: 500 + i * 200,
                    x: team === 'player' ? (PLAYER_BASE_X + 300 + i * 140) : (ENEMY_BASE_X - 300 - i * 140),
                    y: 80,
                    spawned: false
                });
            }
        }
        else if (type === 'orbitallaser') {
            // Sweeping laser coordinate
            this.laserX = team === 'player' ? PLAYER_BASE_X + 200 : ENEMY_BASE_X - 200;
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
                this.triggerFall(item.x, item.y, game);
            }
        }
        
        // Type specific frames
        if (this.type === 'airstrike') {
            const pathDistance = VIRTUAL_WIDTH;
            const planeSpeed = (pathDistance / (this.duration / 1000)) * (dt / 1000);
            if (this.team === 'player') {
                this.airstrikePlaneX += planeSpeed;
            } else {
                this.airstrikePlaneX -= planeSpeed;
            }
        } 
        else if (this.type === 'orbitallaser') {
            // Sweeps across the map
            const targetWidth = VIRTUAL_WIDTH - 400;
            const sweepSpeed = (targetWidth / (this.duration / 1000)) * (dt / 1000);
            
            if (this.team === 'player') {
                this.laserX += sweepSpeed;
            } else {
                this.laserX -= sweepSpeed;
            }
            
            // Laser ticks damage every frame on intersection
            const laserRadius = 50;
            const enemies = this.team === 'player' ? game.enemyUnits : game.playerUnits;
            const enemyBase = this.team === 'player' ? game.enemyBase : game.playerBase;
            
            if (Math.abs(enemyBase.x - this.laserX) < laserRadius) {
                enemyBase.takeDamage(4); // heavy damage over time
            }
            
            for (let unit of enemies) {
                if (Math.abs(unit.x - this.laserX) < laserRadius) {
                    unit.takeDamage(8, game);
                }
            }
            
            // Neon laser sparks spawning from ground
            if (Math.random() < 0.8) {
                game.particles.push(new Particle(this.laserX + (Math.random() - 0.5) * 20, GROUND_Y, '#38bdf8', 'spark', '', 4));
                game.particles.push(new Particle(this.laserX + (Math.random() - 0.5) * 20, GROUND_Y, '#0284c7', 'smoke', '', 6));
            }
        }
    }

    triggerFall(targetX, startY, game) {
        // Create falling projectile with generic coordinate targets
        const dummyTarget = { x: targetX, y: GROUND_Y, hp: 1 };
        
        if (this.type === 'meteor') {
            // Large boulder falling diagonally
            const startX = targetX - 100;
            const startY = -50;
            game.projectiles.push(new Projectile(startX, startY, dummyTarget, this.team, 45, 'firepot', 0.8));
        } 
        else if (this.type === 'arrows') {
            const startX = targetX - 80;
            const startY = -40;
            game.projectiles.push(new Projectile(startX, startY, dummyTarget, this.team, 18, 'arrow', 1.3));
        } 
        else if (this.type === 'fireball') {
            const startX = targetX - 120;
            const startY = -50;
            game.projectiles.push(new Projectile(startX, startY, dummyTarget, this.team, 95, 'firepot', 0.6));
        }
        else if (this.type === 'airstrike') {
            // Carpet Bomb dropped vertically down from current plane
            game.projectiles.push(new Projectile(targetX, startY, dummyTarget, this.team, 250, 'firepot', 1.5));
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

class Game {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        
        // Viewport and camera settings
        this.cameraX = 0;
        this.cameraVelocity = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragCameraStartX = 0;
        
        // Setup initial entities and values
        this.initGame();
        
        // Attach user UI events
        this.setupEventListeners();
        
        // Start Loop
        this.lastTime = 0;
        this.gameState = 'menu'; // 'menu', 'running', 'paused', 'victory', 'defeat'
        
        // Initial button update
        this.updateButtonsUI();
    }

    initGame() {
        this.gold = 150;
        this.xp = 0;
        this.playerEra = 0;
        this.enemyEra = 0;
        
        this.playerBase = new Base('player');
        this.enemyBase = new Base('enemy');
        
        this.playerUnits = [];
        this.enemyUnits = [];
        this.projectiles = [];
        this.particles = [];
        this.specialAttacks = [];
        
        // Cooldown timer
        this.specialTimer = 0; // cooldown counter
        this.gameSpeed = 1;
        
        // Stats for victory screen
        this.timeElapsed = 0;
        this.statsSpawned = 0;
        this.statsKilled = 0;
        this.statsGoldEarned = 150;
        
        this.cameraX = 0;
        
        // AI spawn timer
        this.enemyAiTimer = 5000; // time until next spawn
        this.enemyAiBaseXp = 0; // simulated enemy XP
    }

    addGold(amount) {
        this.gold += amount;
        this.statsGoldEarned += amount;
        
        // Animate HUD gold value indicator
        const el = document.getElementById("gold-value");
        el.innerText = Math.round(this.gold);
        el.classList.remove("gold-pulse");
        void el.offsetWidth; // trigger reflow
        el.classList.add("gold-pulse");
    }

    addXp(amount) {
        this.xp += amount;
        
        // XP progress display
        const nextXp = ERA_DATA[this.playerEra].evolveXp;
        const el = document.getElementById("xp-value");
        el.innerText = `${Math.round(this.xp)} / ${nextXp}`;
        
        el.classList.remove("xp-pulse");
        void el.offsetWidth;
        el.classList.add("xp-pulse");
        
        // Update evolve button state
        const evolveBtn = document.getElementById("evolve-btn");
        const evolveCostText = document.getElementById("evolve-cost-text");
        
        if (this.xp >= nextXp && this.playerEra < 4) {
            evolveBtn.classList.remove("disabled");
            evolveBtn.classList.add("ready-to-evolve");
            evolveCostText.innerText = "READY! Press E";
        } else {
            evolveBtn.classList.add("disabled");
            evolveBtn.classList.remove("ready-to-evolve");
            if (this.playerEra === 4) {
                evolveCostText.innerText = "Max Era Reached";
            } else {
                evolveCostText.innerText = `Need ${nextXp} XP`;
            }
        }
    }

    evolveEra() {
        const currentNextXp = ERA_DATA[this.playerEra].evolveXp;
        if (this.xp >= currentNextXp && this.playerEra < 4) {
            this.xp -= currentNextXp;
            this.playerEra++;
            
            // Spawn celebrate particles on base
            for (let i = 0; i < 40; i++) {
                this.particles.push(new Particle(
                    PLAYER_BASE_X + (Math.random() - 0.5) * 50,
                    GROUND_Y - 100 - Math.random() * 150,
                    '#a855f7',
                    'spark',
                    '',
                    4
                ));
            }
            
            // Evolve active towers to the new era towers
            for (let tower of this.playerBase.towers) {
                tower.cooldownTimer = 0; // reset active delay
            }
            
            // Update Base HP ratio scaling
            // (Base retains its damage, but visually upgrades)
            
            // Floating text
            this.particles.push(new Particle(
                PLAYER_BASE_X,
                GROUND_Y - 260,
                '#a855f7',
                'text',
                "EVOLVED ERA!",
                20
            ));
            
            // Sync Displays
            document.getElementById("current-era-text").innerText = ERA_DATA[this.playerEra].name;
            this.addXp(0); // recalculates HUD Evolve text
            this.updateButtonsUI();
        }
    }

    spawnPlayerUnit(index) {
        const eraConfig = ERA_DATA[this.playerEra];
        const unitStats = eraConfig.units[index];
        
        if (this.gold >= unitStats.cost) {
            this.gold -= unitStats.cost;
            document.getElementById("gold-value").innerText = Math.round(this.gold);
            
            this.playerUnits.push(new Unit(this.playerEra, index, 'player', unitStats));
            this.statsSpawned++;
            
            // Spawn puff on gate
            this.particles.push(new Particle(PLAYER_BASE_X + 30, GROUND_Y - 20, '#cbd5e1', 'smoke'));
        }
    }

    triggerPlayerSpecial() {
        if (this.specialTimer <= 0) {
            const eraConfig = ERA_DATA[this.playerEra];
            this.specialAttacks.push(new SpecialAttack(eraConfig.specialType, 'player'));
            
            // Set cooldown
            this.specialTimer = SPECIAL_COOLDOWN_MS;
            
            // Trigger visual splash text
            this.particles.push(new Particle(480, 100, '#ef4444', 'text', eraConfig.specialName.toUpperCase(), 24));
        }
    }

    buyTowerSlot() {
        if (this.playerBase.unlockedSlots < 3) {
            const cost = TOWER_SLOT_COSTS[this.playerBase.unlockedSlots];
            if (this.gold >= cost) {
                this.gold -= cost;
                this.playerBase.unlockedSlots++;
                
                // Spawn sparks
                this.particles.push(new Particle(PLAYER_BASE_X + 35, GROUND_Y - 140, '#fbbf24', 'spark', '', 6));
                
                this.updateButtonsUI();
                document.getElementById("gold-value").innerText = Math.round(this.gold);
            }
        }
    }

    buildTower() {
        if (this.playerBase.towers.length < this.playerBase.unlockedSlots) {
            if (this.gold >= TOWER_BUILD_COST) {
                this.gold -= TOWER_BUILD_COST;
                
                const nextSlotIndex = this.playerBase.towers.length;
                this.playerBase.towers.push(new Tower('player', nextSlotIndex));
                
                // Spawn sparks
                this.particles.push(new Particle(PLAYER_BASE_X + 35, GROUND_Y - 90 - (nextSlotIndex * 60), '#fbbf24', 'spark', '', 6));
                
                this.updateButtonsUI();
                document.getElementById("gold-value").innerText = Math.round(this.gold);
            }
        }
    }

    updateButtonsUI() {
        const eraConfig = ERA_DATA[this.playerEra];
        
        // 1. Spawner Buttons
        for (let i = 1; i <= 3; i++) {
            const btn = document.getElementById(`spawn-u${i}`);
            const unit = eraConfig.units[i - 1];
            btn.querySelector(".unit-name").innerText = unit.name;
            btn.querySelector(".unit-cost").innerText = `${unit.cost}g`;
        }
        
        // 2. Tower Slot button
        const slotBtn = document.getElementById("buy-tower-slot");
        const slotCostLabel = document.getElementById("tower-slot-cost");
        if (this.playerBase.unlockedSlots < 3) {
            slotBtn.disabled = false;
            slotCostLabel.innerText = `${TOWER_SLOT_COSTS[this.playerBase.unlockedSlots]}g`;
            slotBtn.querySelector(".tower-label").innerText = `Slot ${this.playerBase.unlockedSlots + 1}`;
        } else {
            slotBtn.disabled = true;
            slotCostLabel.innerText = "MAX";
            slotBtn.querySelector(".tower-label").innerText = "Slots Locked";
        }
        
        // 3. Build Tower button
        const towerBtn = document.getElementById("buy-tower");
        const towerCostLabel = document.getElementById("tower-cost");
        if (this.playerBase.towers.length < this.playerBase.unlockedSlots) {
            towerBtn.disabled = false;
            towerCostLabel.innerText = `${TOWER_BUILD_COST}g`;
            towerBtn.querySelector(".tower-label").innerText = "Build Tower";
        } else {
            towerBtn.disabled = true;
            towerCostLabel.innerText = "MAX";
            towerBtn.querySelector(".tower-label").innerText = (this.playerBase.unlockedSlots === 0) ? "Unlock Slot First" : "Slots Full";
        }
    }

    // ==========================================================================
    // ENEMY AI ENGINE
// ==========================================================================
    
    updateEnemyAI(dt) {
        // AI slowly evolves era based on elapsed match time
        // Stone (0) -> Ancient (1): ~90s
        // Ancient (1) -> Medieval (2): ~240s
        // Medieval (2) -> Modern (3): ~450s
        // Modern (3) -> Future (4): ~720s
        let desiredEra = 0;
        if (this.timeElapsed >= 720) desiredEra = 4;
        else if (this.timeElapsed >= 450) desiredEra = 3;
        else if (this.timeElapsed >= 240) desiredEra = 2;
        else if (this.timeElapsed >= 90) desiredEra = 1;
        
        if (desiredEra > this.enemyEra) {
            this.enemyEra = desiredEra;
            
            // Spark effect on enemy base
            for (let i = 0; i < 30; i++) {
                this.particles.push(new Particle(
                    ENEMY_BASE_X + (Math.random() - 0.5) * 50,
                    GROUND_Y - 100 - Math.random() * 150,
                    '#ef4444',
                    'spark',
                    '',
                    4
                ));
            }
            
            this.particles.push(new Particle(
                ENEMY_BASE_X,
                GROUND_Y - 260,
                '#ef4444',
                'text',
                "ENEMY EVOLVED ERA!",
                20
            ));
            
            // Upgrade enemy towers
            for (let tower of this.enemyBase.towers) {
                tower.cooldownTimer = 0;
            }
        }
        
        // Manage AI defenses (Towers slots scaling)
        if (this.enemyBase.unlockedSlots < 3 && this.timeElapsed > (this.enemyBase.unlockedSlots * 120 + 60)) {
            this.enemyBase.unlockedSlots++;
            this.enemyBase.towers.push(new Tower('enemy', this.enemyBase.towers.length));
        }
        
        // Spawn timer checks
        this.enemyAiTimer -= dt;
        if (this.enemyAiTimer <= 0) {
            // Determine spawning delay
            // Base cooldown starts at 7000ms, decreases to min 2000ms as game lasts
            const baseCooldown = Math.max(2200, 7500 - (this.timeElapsed * 6.5));
            this.enemyAiTimer = baseCooldown + Math.random() * 1800;
            
            // Choose unit weighting based on time/difficulty
            // Unit 1 (Cheap): 0.50, Unit 2 (Medium): 0.35, Unit 3 (Strong): 0.15
            const rand = Math.random();
            let unitIndex = 0;
            if (rand > 0.85) {
                unitIndex = 2; // spawn Tank/Mech/Mammoth
            } else if (rand > 0.50) {
                unitIndex = 1; // spawn Archer/Crossbowman
            }
            
            const stats = ERA_DATA[this.enemyEra].units[unitIndex];
            this.enemyUnits.push(new Unit(this.enemyEra, unitIndex, 'enemy', stats));
            
            // Spawn puff on gate
            this.particles.push(new Particle(ENEMY_BASE_X - 30, GROUND_Y - 20, '#cbd5e1', 'smoke'));
            
            // Occasionally, if outnumbered, Enemy triggers a Special Attack
            if (this.playerUnits.length >= 4 && Math.random() < 0.25) {
                const eraConfig = ERA_DATA[this.enemyEra];
                this.specialAttacks.push(new SpecialAttack(eraConfig.specialType, 'enemy'));
                this.particles.push(new Particle(480, 100, '#ef4444', 'text', "ENEMY " + eraConfig.specialName.toUpperCase(), 24));
            }
        }
    }

    // ==========================================================================
    // RENDER & PHYSICS CYCLE
    // ==========================================================================

    update(dt) {
        if (this.gameState !== 'running') return;
        
        const scaledDt = dt * this.gameSpeed;
        
        this.timeElapsed += scaledDt / 1000;
        
        // Update Cooldown overlay UI
        if (this.specialTimer > 0) {
            this.specialTimer = Math.max(0, this.specialTimer - scaledDt);
            const ratio = this.specialTimer / SPECIAL_COOLDOWN_MS;
            document.getElementById("special-cooldown-overlay").style.height = `${ratio * 100}%`;
            
            const cdSecs = Math.ceil(this.specialTimer / 1000);
            document.getElementById("special-status-text").innerText = `CD: ${cdSecs}s`;
        } else {
            document.getElementById("special-cooldown-overlay").style.height = `0%`;
            document.getElementById("special-status-text").innerText = `Ready`;
        }
        
        // Camera edge-scrolling or drag physics damping
        if (!this.isDragging) {
            this.cameraX += this.cameraVelocity * (dt / 16.666);
            this.cameraVelocity *= Math.pow(0.85, dt / 16.666); // Friction
            if (Math.abs(this.cameraVelocity) < 0.05) this.cameraVelocity = 0;
        }
        this.cameraX = Math.max(0, Math.min(VIRTUAL_WIDTH - this.canvas.width, this.cameraX));
        
        // Bases
        this.playerBase.update(scaledDt, this);
        this.enemyBase.update(scaledDt, this);
        
        // Units loop
        // (Copy lists to prevent index skips during mutations)
        const pUnits = [...this.playerUnits];
        const eUnits = [...this.enemyUnits];
        
        for (let unit of pUnits) unit.update(scaledDt, this);
        for (let unit of eUnits) unit.update(scaledDt, this);
        
        // Projectiles loop
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update(scaledDt, this);
            if (proj.isDead) this.projectiles.splice(i, 1);
        }
        
        // Particles loop
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(scaledDt);
            if (p.alpha <= 0) this.particles.splice(i, 1);
        }
        
        // Special attacks
        for (let i = this.specialAttacks.length - 1; i >= 0; i--) {
            const sa = this.specialAttacks[i];
            sa.update(scaledDt, this);
            if (sa.isDead) this.specialAttacks.splice(i, 1);
        }
        
        // Update Enemy AI
        this.updateEnemyAI(scaledDt);
        
        // Sync Base Health Displays
        const playerHpRatio = Math.max(0, this.playerBase.hp / BASE_HP_MAX);
        const enemyHpRatio = Math.max(0, this.enemyBase.hp / BASE_HP_MAX);
        
        document.getElementById("player-base-hp-bar").style.width = `${playerHpRatio * 100}%`;
        document.getElementById("enemy-base-hp-bar").style.width = `${enemyHpRatio * 100}%`;
        document.getElementById("player-base-hp-text").innerText = `${this.playerBase.hp}/${BASE_HP_MAX} HP`;
        document.getElementById("enemy-base-hp-text").innerText = `${this.enemyBase.hp}/${BASE_HP_MAX} HP`;
        
        // Update unit spawn button disables based on current gold
        const eraConfig = ERA_DATA[this.playerEra];
        for (let i = 1; i <= 3; i++) {
            const btn = document.getElementById(`spawn-u${i}`);
            if (this.gold < eraConfig.units[i - 1].cost) {
                btn.classList.add("disabled");
            } else {
                btn.classList.remove("disabled");
            }
        }
        
        // Check gameover conditions
        if (this.playerBase.hp <= 0) {
            this.endGame(false);
        } else if (this.enemyBase.hp <= 0) {
            this.endGame(true);
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const eraConfig = ERA_DATA[this.playerEra];
        
        // 1. Draw Sky Parallax Background
        const grad = this.ctx.createLinearGradient(0, 0, 0, GROUND_Y);
        grad.addColorStop(0, eraConfig.skyGradient[0]);
        grad.addColorStop(1, eraConfig.skyGradient[1]);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, GROUND_Y);
        
        // 2. Parallax background scenery (draw columns, mountains, structures)
        this.drawParallaxScenery(eraConfig);
        
        // 3. Draw Ground
        this.ctx.fillStyle = eraConfig.groundColor;
        this.ctx.fillRect(0, GROUND_Y, this.canvas.width, this.canvas.height - GROUND_Y);
        
        // Draw decorative ground line border
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, GROUND_Y);
        this.ctx.lineTo(this.canvas.width, GROUND_Y);
        this.ctx.stroke();
        
        // 4. Draw game entities with respect to camera offset
        this.playerBase.draw(this.ctx, this.cameraX, this);
        this.enemyBase.draw(this.ctx, this.cameraX, this);
        
        // Draw Units
        for (let unit of this.playerUnits) unit.draw(this.ctx, this.cameraX);
        for (let unit of this.enemyUnits) unit.draw(this.ctx, this.cameraX);
        
        // Draw Projectiles
        for (let proj of this.projectiles) proj.draw(this.ctx, this.cameraX);
        
        // Draw Specials
        for (let sa of this.specialAttacks) sa.draw(this.ctx, this.cameraX);
        
        // Draw Particles
        for (let p of this.particles) p.draw(this.ctx, this.cameraX);
        
        // 5. Draw mouse drag navigation guidelines if needed
        // (Just keeping drawing simple and optimized)
    }

    drawParallaxScenery(eraConfig) {
        this.ctx.save();
        
        // Scale elements by camera parallax factor
        const pxOffset = this.cameraX * 0.25; // 4x slower movement
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        
        if (this.playerEra === 0) { // Stone age: Mountains and rocky ceiling curves
            this.ctx.beginPath();
            this.ctx.moveTo(-pxOffset, GROUND_Y);
            this.ctx.lineTo(200 - pxOffset, GROUND_Y - 140);
            this.ctx.lineTo(400 - pxOffset, GROUND_Y - 80);
            this.ctx.lineTo(650 - pxOffset, GROUND_Y - 200);
            this.ctx.lineTo(850 - pxOffset, GROUND_Y - 90);
            this.ctx.lineTo(1200 - pxOffset, GROUND_Y - 150);
            this.ctx.lineTo(1500 - pxOffset, GROUND_Y);
            this.ctx.fill();
        } 
        else if (this.playerEra === 1) { // Greek Pillars/Temples
            this.ctx.fillStyle = 'rgba(217, 119, 6, 0.07)';
            // Columns
            for (let i = 0; i < 6; i++) {
                const cx = (i * 300) - pxOffset;
                this.ctx.fillRect(cx, GROUND_Y - 180, 25, 180);
                this.ctx.fillRect(cx - 5, GROUND_Y - 180, 35, 10);
            }
        } 
        else if (this.playerEra === 2) { // Medieval castle walls
            this.ctx.fillStyle = 'rgba(100, 116, 139, 0.07)';
            this.ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const cx = (i * 240) - pxOffset;
                this.ctx.rect(cx, GROUND_Y - 120, 160, 120);
                // crenellation tops
                this.ctx.rect(cx, GROUND_Y - 135, 30, 15);
                this.ctx.rect(cx + 65, GROUND_Y - 135, 30, 15);
                this.ctx.rect(cx + 130, GROUND_Y - 135, 30, 15);
            }
            this.ctx.fill();
        } 
        else if (this.playerEra === 3) { // Modern smoke stacks & city silhouettes
            this.ctx.fillStyle = 'rgba(39, 39, 42, 0.09)';
            for (let i = 0; i < 5; i++) {
                const cx = (i * 350) - pxOffset;
                this.ctx.fillRect(cx, GROUND_Y - 220, 80, 220); // building silhouette
                this.ctx.fillRect(cx + 120, GROUND_Y - 160, 50, 160);
            }
        } 
        else if (this.playerEra === 4) { // Future Hologram grids and spires
            this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            // grid lines
            for (let i = 0; i < 15; i++) {
                const lx = (i * 120) - pxOffset;
                this.ctx.moveTo(lx, 100);
                this.ctx.lineTo(lx, GROUND_Y);
            }
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    // ==========================================================================
    // GAME LOOPS & TIMING
    // ==========================================================================

    loop(time) {
        if (!this.lastTime) this.lastTime = time;
        const dt = Math.min(100, time - this.lastTime); // Caps max timestep lag
        
        this.lastTime = time;
        
        // Process mechanics & redraw
        this.update(dt);
        this.draw();
        
        // Loop continuation
        requestAnimationFrame((t) => this.loop(t));
    }

    startGame() {
        this.initGame();
        this.gameState = 'running';
        document.getElementById("intro-modal").classList.add("hidden");
        document.getElementById("gameover-modal").classList.add("hidden");
        
        // Reset speed to normal
        this.gameSpeed = 1;
        document.getElementById("speed-btn").innerText = "SPEED: 1x";
        
        // Sound or audio triggers here if necessary
    }

    endGame(isVictory) {
        this.gameState = isVictory ? 'victory' : 'defeat';
        
        // Sync Game Over overlay styles
        const modal = document.getElementById("gameover-modal");
        const title = document.getElementById("gameover-title");
        const subtitle = document.getElementById("gameover-subtitle");
        
        modal.classList.remove("hidden");
        modal.classList.remove("victory-style");
        modal.classList.remove("defeat-style");
        
        if (isVictory) {
            modal.classList.add("victory-style");
            title.innerText = "VICTORY!";
            subtitle.innerText = "You successfully defended the era and smashed the enemy stronghold!";
        } else {
            modal.classList.add("defeat-style");
            title.innerText = "DEFEAT!";
            subtitle.innerText = "Your base was overrun and crumbled to dust.";
        }
        
        // Populate stats grid
        const formatTime = (secs) => {
            const m = Math.floor(secs / 60).toString().padStart(2, '0');
            const s = Math.floor(secs % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        };
        
        document.getElementById("stat-time").innerText = formatTime(this.timeElapsed);
        document.getElementById("stat-spawned").innerText = this.statsSpawned;
        document.getElementById("stat-killed").innerText = this.statsKilled;
        document.getElementById("stat-gold").innerText = Math.round(this.statsGoldEarned);
        document.getElementById("stat-era").innerText = ERA_DATA[this.playerEra].name;
    }

    // ==========================================================================
    // USER INPUT LISTENERS
    // ==========================================================================

    setupEventListeners() {
        // Spawners
        for (let i = 1; i <= 3; i++) {
            document.getElementById(`spawn-u${i}`).addEventListener("click", () => {
                if (this.gameState === 'running') this.spawnPlayerUnit(i - 1);
            });
        }
        
        // Tower shop
        document.getElementById("buy-tower-slot").addEventListener("click", () => {
            if (this.gameState === 'running') this.buyTowerSlot();
        });
        document.getElementById("buy-tower").addEventListener("click", () => {
            if (this.gameState === 'running') this.buildTower();
        });
        
        // Action triggers
        document.getElementById("evolve-btn").addEventListener("click", () => {
            if (this.gameState === 'running') this.evolveEra();
        });
        document.getElementById("special-btn").addEventListener("click", () => {
            if (this.gameState === 'running') this.triggerPlayerSpecial();
        });
        
        // Game control buttons
        document.getElementById("pause-btn").addEventListener("click", (e) => {
            if (this.gameState === 'running') {
                this.gameState = 'paused';
                e.target.innerText = "RESUME";
            } else if (this.gameState === 'paused') {
                this.gameState = 'running';
                e.target.innerText = "PAUSE";
            }
        });
        
        document.getElementById("speed-btn").addEventListener("click", (e) => {
            if (this.gameSpeed === 1) {
                this.gameSpeed = 2;
                e.target.innerText = "SPEED: 2x";
            } else {
                this.gameSpeed = 1;
                e.target.innerText = "SPEED: 1x";
            }
        });
        
        document.getElementById("restart-btn").addEventListener("click", () => {
            if (confirm("Are you sure you want to restart the match?")) {
                this.startGame();
            }
        });
        
        // Modal Start triggers
        document.getElementById("start-game-btn").addEventListener("click", () => {
            this.startGame();
        });
        document.getElementById("play-again-btn").addEventListener("click", () => {
            this.startGame();
        });
        
        // Keyboard Hotkeys
        window.addEventListener("keydown", (e) => {
            if (this.gameState !== 'running') return;
            
            if (e.key === '1') this.spawnPlayerUnit(0);
            if (e.key === '2') this.spawnPlayerUnit(1);
            if (e.key === '3') this.spawnPlayerUnit(2);
            if (e.key.toLowerCase() === 'e') this.evolveEra();
            if (e.key === ' ') {
                e.preventDefault(); // prevent scroll
                this.triggerPlayerSpecial();
            }
        });
        
        // Drag scrolling logic on Canvas
        this.canvas.addEventListener("mousedown", (e) => {
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragCameraStartX = this.cameraX;
            this.cameraVelocity = 0; // stop sliding
        });
        
        window.addEventListener("mousemove", (e) => {
            if (!this.isDragging) return;
            
            const dx = e.clientX - this.dragStartX;
            this.cameraX = this.dragCameraStartX - dx;
            this.cameraX = Math.max(0, Math.min(VIRTUAL_WIDTH - this.canvas.width, this.cameraX));
        });
        
        window.addEventListener("mouseup", (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            
            // Calculate a sliding velocity based on final movement speed
            const dx = e.clientX - this.dragStartX;
            this.cameraVelocity = -dx * 0.15; // slide throw speed
        });
        
        // Edge Scrolling (Hover mouse on edges scroll)
        this.canvas.addEventListener("mousemove", (e) => {
            if (this.isDragging) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            
            const edgeWidth = 90;
            if (mouseX < edgeWidth) {
                // Scroll Left
                this.cameraVelocity = -8 * (1 - mouseX / edgeWidth);
            } else if (mouseX > rect.width - edgeWidth) {
                // Scroll Right
                this.cameraVelocity = 8 * (1 - (rect.width - mouseX) / edgeWidth);
            } else {
                this.cameraVelocity *= 0.8; // Damping
            }
        });
        
        // Mousewheel scrolling
        this.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            this.cameraX += e.deltaY * 0.5;
            this.cameraX = Math.max(0, Math.min(VIRTUAL_WIDTH - this.canvas.width, this.cameraX));
        }, { passive: false });
        
        // Scroll HUD buttons
        const scrollBtnLeft = document.getElementById("scroll-left-btn");
        const scrollBtnRight = document.getElementById("scroll-right-btn");
        
        let scrollBtnInterval = null;
        
        const startScroll = (dir) => {
            scrollBtnInterval = setInterval(() => {
                this.cameraX += dir * 15;
                this.cameraX = Math.max(0, Math.min(VIRTUAL_WIDTH - this.canvas.width, this.cameraX));
            }, 16);
        };
        
        const stopScroll = () => {
            if (scrollBtnInterval) {
                clearInterval(scrollBtnInterval);
                scrollBtnInterval = null;
            }
        };
        
        scrollBtnLeft.addEventListener("mousedown", () => startScroll(-1));
        scrollBtnRight.addEventListener("mousedown", () => startScroll(1));
        
        scrollBtnLeft.addEventListener("mouseup", stopScroll);
        scrollBtnRight.addEventListener("mouseup", stopScroll);
        scrollBtnLeft.addEventListener("mouseleave", stopScroll);
        scrollBtnRight.addEventListener("mouseleave", stopScroll);
        
        // Touch supports (drag)
        this.canvas.addEventListener("touchstart", (e) => {
            this.isDragging = true;
            this.dragStartX = e.touches[0].clientX;
            this.dragCameraStartX = this.cameraX;
            this.cameraVelocity = 0;
        }, { passive: true });
        
        this.canvas.addEventListener("touchmove", (e) => {
            if (!this.isDragging) return;
            const dx = e.touches[0].clientX - this.dragStartX;
            this.cameraX = this.dragCameraStartX - dx;
            this.cameraX = Math.max(0, Math.min(VIRTUAL_WIDTH - this.canvas.width, this.cameraX));
        }, { passive: true });
        
        this.canvas.addEventListener("touchend", () => {
            this.isDragging = false;
        });
    }
}

// Instantiate engine when DOM is ready
window.addEventListener("DOMContentLoaded", () => {
    const game = new Game();
    // Start drawing loops
    requestAnimationFrame((t) => game.loop(t));
});
