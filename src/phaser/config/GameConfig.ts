// src/phaser/config/GameConfig.ts

// --- Интерфейсы для типизации конфига ---

// Тип для Настроек Игрока
interface PlayerConfigDefinition {
    scale: number;
    moveSpeed: number;
    jumpSpeed: number;
    stompBounceSpeed: number;      // Отскок игрока после прыжка на врага
    gravityY: number;              // Персональная гравитация игрока
    depth: number;
    runFrames: string[];
    jumpFrames: string[];
    idleFrames: string[];
    runAnimKey: string;
    jumpAnimKey: string;
    idleAnimKey: string;
    fallAnimKey: string;           // Ключ для анимации падения
    runFrameRate: number;
    jumpFrameRate: number;
    idleFrameRate: number;
    allowDoubleJump: boolean;      // Разрешен ли двойной прыжок
    initialLives: number;          // Начальное кол-во жизней
    maxLives: number;              // Максимальное кол-во жизней
    invulnerabilityDuration: number;// Длительность неуязвимости после урона (ms)
    powerUpDuration: number;       // Длительность бонуса (ms)
    powerUpScaleMultiplier: number;// Множитель размера при бонусе
    powerUpJumpMultiplier: number; // Множитель силы прыжка при бонусе
}

// Тип для Настроек Земли
interface GroundConfigDefinition {
    width: number;
    height: number;
    top: number;
    depth: number;
}

// Тип для Настроек Труб
interface PipeConfigDefinition {
    scale: number;
    depth: number;
    seriesMinSpacing: number;
    seriesMaxSpacing: number;
    width?: number;
    height?: number;
}

// Тип для Настроек Платформ
interface PlatformConfigDefinition {
    scale: number;
    depth: number;
    minYAboveGround: number;
    maxYAboveGround: number;
    elevatedMinSpacingX: number;
    elevatedMaxSpacingX: number;
    elevatedYVariation: number;
    movingYMinDistance: number;
    movingYMaxDistance: number;
    movingMinDuration: number; // ms
    movingMaxDuration: number; // ms
    staggeredMovingChance: number; // Шанс (0-1)
}

// Тип для Настроек Блоков
interface BlocksConfigDefinition {
    scale: number;
    depth: number;
    minCount: number;
    maxCount: number;
    spacing: number;
    heightAboveGround: number;
    bonusChance: number; // Шанс (0-1)
    bumpHeight: number;
    bumpDuration: number; // ms
}

// Тип для Настроек Коллекционных Предметов
interface CollectiblesConfigDefinition {
    gvozdik: {
        scale: number;
        depth: number;
        swingAngle: number;
        swingSpeed: number; // ms
        magnetRange: number;
        magnetSpeed: number;
        collectDistance: number;
        cutsceneThreshold: number;
    };
    money: {
        scale: number;
        depth: number;
        spawnChance: number; // Шанс (0-1)
    };
    spawnOnPlatformChance: number; // Шанс (0-1)
    bonusItemScale: number;
    bonusItemVelocityY: number;
    bonusItemFlyHeight: number;
    bonusItemDuration: number; // ms
}

// Тип для Настроек Врагов (Общий)
interface EnemyConfigDefinition {
    // --- ADDED: Stomp Physics ---
    stompBounceY: number; // Initial upward velocity for ENEMY when stomped
    stompBounceX: number; // Initial horizontal velocity for ENEMY when stomped
    // -------------------------
    zil: ZilConfigDefinition;
    dog: DogConfigDefinition;
    bumblebee: BumblebeeConfigDefinition; // ADDED
    poop: PoopConfigDefinition;
}

// Типы для конкретных врагов
interface ZilConfigDefinition {
    depth: number;
    patrolRange: number;
    shootRange: number;      // Для zil_big
    shootCooldown: number;   // ms, для zil_big
    types: string[];         // ['zil', 'zil_fast', 'zil_big']
    speeds: number[];        // Соответствуют types
    scales: number[];        // Соответствуют types
}

interface DogConfigDefinition {
    depth: number;
    scale: number;
    speed: number;
    patrolRange: number;
    animKey: string;
    animFrames: string[];
    animFrameRate: number;
}

interface BumblebeeConfigDefinition {
    depth: number;
    scale: number;
    speed: number;          // Horizontal speed
    patrolRange: number;    // Horizontal patrol range
    spawnHeightOffset: number; // Vertical offset from ground.top at spawn
    animKey: string;
    animFrames: string[];
    animFrameRate: number;
    verticalRange: number;      // Max distance to move up/down from start Y
    verticalSpeedFactor: number;// Controls speed of vertical oscillation
}

interface PoopConfigDefinition {
    scale: number;
    depth: number;
    speed: number;
    lifetime: number; // ms
}

// Тип для Настроек Опасностей
interface HazardsConfigDefinition {
    meteor: {
        depth: number;
        scale: number;
        spawnChance: number; // Шанс (0-1)
        minSpeed: number;
        maxSpeed: number;
        maxAngle: number; // градусы
        impactShakeDuration: number; // ms
        impactShakeIntensity: number; // (0-1)
    };
    fireStick: {
        depth: number;
        scale: number;
        offset: number;
        minRotationSpeed: number; // ms per revolution
        maxRotationSpeed: number; // ms per revolution
        chanceOnMoving: number; // Шанс (0-1)
    };
}

// Тип для Настроек Разрывов
interface GapConfigDefinition {
    baseWidth: number;
    maxWidth: number;
    difficultyWidthFactor: number;
    movingPlatformBaseWidth: number;
    movingPlatformMaxWidth: number;
    movingPlatformDifficultyWidthFactor: number;
    movingPlatformMinCount: number;
    movingPlatformMaxCount: number;
    minWidthBetweenSegments?: number;
    maxWidthBetweenSegments?: number;
}

// Тип для Настроек Катсцены
interface CutsceneConfigDefinition {
    barHeight: number;
    barTweenDuration: number;
    elementFadeDuration: number;
    displayDuration: number;
    endDelay: number;
    flashDuration: number;
    babkaOffset: number;
    babkaScale: number;
    photoOffset: number;
    photoScale: number;
    gramotaScale: number;
    gramotaDropHeight: number;
    gramotaFallDuration: number;
}

// Тип для Настроек Сложности
interface DifficultyScalingDefinition {
    startDistance: number;
    scaleFactor: number;
    scoreFactor: number;
    maxDifficulty: number;
}

// Тип для Максимального Количества Объектов
interface MaxObjectsDefinition {
    ground: number;
    pipes: number;
    platforms: number;
    blocks: number;
    zils: number;
    dogs: number;
    bumblebees: number; // ADDED
    poops: number;
    gvozdiki: number;
    money: number;
    meteors: number;
    fireSticks: number;
}

// Тип для Громкости Звуков
interface SoundVolumesDefinition {
    bgm: number;
    collect: number;
    jump: number;
    playerDamage: number;
    enemyStomp: number; // ADDED: Sound for stomping an enemy
    blockHit: number;
    blockBonus: number;
    powerUp: number;
    powerDown: number;
    zil_death: number; // Keep for potential non-stomp deaths?
    bumblebee_death: number;
    meteor_impact: number;
    gvozd_social: number;
    photo_sound: number;
    [key: string]: number;
}


// --- Главный Интерфейс Конфигурации ---
interface GameConfigDefinition {
    gameWidth: number;
    gameHeight: number;
    gravity: number;
    maxWorldDistance: number;
    generationLookahead: number;
    generationDelay: number; // ms
    cleanupDelay: number; // ms
    cleanupBuffer: number; // px
    player: PlayerConfigDefinition;
    ground: GroundConfigDefinition;
    pipe: PipeConfigDefinition;
    platform: PlatformConfigDefinition;
    blocks: BlocksConfigDefinition;
    collectibles: CollectiblesConfigDefinition;
    enemy: EnemyConfigDefinition;
    hazards: HazardsConfigDefinition;
    gap: GapConfigDefinition;
    cutscene: CutsceneConfigDefinition;
    difficultyScaling: DifficultyScalingDefinition;
    maxObjects: MaxObjectsDefinition;
    soundVolumes: SoundVolumesDefinition;
}

// --- КОНСТАНТА КОНФИГУРАЦИИ ---
export const GameConfig: GameConfigDefinition = {
    gameWidth: 1368,
    gameHeight: 600,
    gravity: 900, // Общая гравитация мира
    maxWorldDistance: 15000, // Примерная длина уровня

    generationLookahead: 600, // Generate world 600px ahead of camera
    generationDelay: 150,     // Wait at least 150ms between generation checks
    cleanupDelay: 3000,       // Check for object cleanup every 3 seconds
    cleanupBuffer: 500,       // Remove objects 500px behind camera's left edge

    player: {
        scale: 0.4,
        moveSpeed: 250,
        jumpSpeed: -550,            // Negative for upward jump
        stompBounceSpeed: -380,     // Player's bounce velocity after stomp
        gravityY: 800,
        depth: 10,
        runFrames: ['r1', 'r2', 'r3', 'r4'],
        jumpFrames: ['j1', 'j2', 'j3', 'j4'],
        idleFrames: ['i1', 'i2', 'i3', 'i4'],
        runAnimKey: 'player-run',
        jumpAnimKey: 'player-jump',
        idleAnimKey: 'player-idle',
        fallAnimKey: 'player-fall',
        runFrameRate: 4,
        jumpFrameRate: 4,
        idleFrameRate: 4,
        allowDoubleJump: true,
        initialLives: 5,
        maxLives: 10,
        invulnerabilityDuration: 2000,
        powerUpDuration: 10000,
        powerUpScaleMultiplier: 2,
        powerUpJumpMultiplier: 2,
    },

    ground: {
        width: 77,
        height: 77,
        top: 532, // gameHeight - height
        depth: 5,
    },

    pipe: {
        scale: 0.25,
        depth: 6,
        seriesMinSpacing: 300,
        seriesMaxSpacing: 500,
        width: 55,
        height: 55
    },

    platform: {
        scale: 0.27,
        depth: 7,
        minYAboveGround: 150,
        maxYAboveGround: 300,
        elevatedMinSpacingX: 180,
        elevatedMaxSpacingX: 350,
        elevatedYVariation: 70,
        movingYMinDistance: 60,
        movingYMaxDistance: 150,
        movingMinDuration: 1800,
        movingMaxDuration: 3500,
        staggeredMovingChance: 0.45,
    },

    blocks: {
        scale: 0.10,
        depth: 8,
        minCount: 3,
        maxCount: 7,
        spacing: 38,
        heightAboveGround: 110,
        bonusChance: 0.1,
        bumpHeight: 20,
        bumpDuration: 200,
    },

    collectibles: {
        gvozdik: {
            scale: 0.25,
            depth: 9,
            swingAngle: 18,
            swingSpeed: 900,
            magnetRange: 200,
            magnetSpeed: 1900,
            collectDistance: 25,
            cutsceneThreshold: 150,
        },
        money: {
            scale: 0.15,
            depth: 9,
            spawnChance: 0.25,
        },
        spawnOnPlatformChance: 0.35,
        bonusItemScale: 0.35,
        bonusItemVelocityY: -180,
        bonusItemFlyHeight: 35,
        bonusItemDuration: 550,
    },

    enemy: {
        // Stomp Physics Config
        stompBounceY: -200, // Enemy bounces UP (-Y) when stomped
        stompBounceX: 150,   // Enemy gets knocked sideways slightly
        // Enemy Types
        zil: {
            depth: 12,
            patrolRange: 200,
            shootRange: 320,
            shootCooldown: 2300,
            types: ['zil', 'zil_fast', 'zil_big'],
            speeds: [50, 85, 35],
            scales: [0.38, 0.48, 0.58],
        },
        dog: {
            depth: 11,
            scale: 0.20,
            speed: 80,
            patrolRange: 280,
            animKey: 'dog-run',
            animFrames: ['d1', 'd2', 'd3', 'd4'],
            animFrameRate: 4,
        },
        bumblebee: {
             depth: 11,
             scale: 0.25,
             speed: 110,
             patrolRange: 150,
             spawnHeightOffset: -350,
             animKey: 'bumblebee_fly',
             animFrames: ['s1', 's2', 's3'],
             animFrameRate: 4,
             verticalRange: 40,
             verticalSpeedFactor: 0.0015
        },
        poop: {
            scale: 0.21,
            depth: 8,
            speed: 280,
            lifetime: 2800,
        },
    },

    hazards: {
        meteor: {
            depth: 15,
            scale: 0.2,
            spawnChance: 0.003,
            minSpeed: 320,
            maxSpeed: 550,
            maxAngle: 45,
            impactShakeDuration: 120,
            impactShakeIntensity: 0.006,
        },
        fireStick: {
            depth: 8,
            scale: 0.21,
            offset: 8,
            minRotationSpeed: 1800,
            maxRotationSpeed: 3500,
            chanceOnMoving: 0.40,
        },
    },

    gap: {
        baseWidth: 90,
        maxWidth: 400,
        difficultyWidthFactor: 25,
        movingPlatformBaseWidth: 180,
        movingPlatformMaxWidth: 500,
        movingPlatformDifficultyWidthFactor: 30,
        movingPlatformMinCount: 1,
        movingPlatformMaxCount: 3,
        minWidthBetweenSegments: 30,
        maxWidthBetweenSegments: 80,
    },

    cutscene: {
        barHeight: 80,
        barTweenDuration: 500,
        elementFadeDuration: 400,
        displayDuration: 2000,
        endDelay: 1500,
        flashDuration: 300,
        babkaOffset: 200,
        babkaScale: 0.4,
        photoOffset: -150,
        photoScale: 0.35,
        gramotaScale: 0.2,
        gramotaDropHeight: 100,
        gramotaFallDuration: 800,
    },

    difficultyScaling: {
        startDistance: 400,
        scaleFactor: 0.00025,
        scoreFactor: 0.006,
        maxDifficulty: 10,
    },

    maxObjects: {
        ground: 60,
        pipes: 35,
        platforms: 45,
        blocks: 35,
        zils: 12,
        dogs: 10,
        bumblebees: 8, // Bumblebee limit
        poops: 18,
        gvozdiki: 60,
        money: 12,
        meteors: 10,
        fireSticks: 18,
    },

    soundVolumes: {
        bgm: 0.3,
        collect: 0.6,
        jump: 0.5,
        playerDamage: 0.7,
        enemyStomp: 0.6, // Stomp sound volume
        blockHit: 0.5,
        blockBonus: 0.7,
        powerUp: 0.7,
        powerDown: 0.6,
        zil_death: 0.6, // Volume for non-stomp death?
        bumblebee_death: 0.5,
        meteor_impact: 0.8,
        gvozd_social: 0.9,
        photo_sound: 0.8,
    },
};

// --- Константа Ключей Сцен ---
export const SceneKeys = {
    PreloadScene: 'PreloadScene',
    // MainMenuScene: 'MainMenuScene',
    GvozdScene: 'GvozdScene',
    // CaveScene: 'CaveScene',
    TransitionScene: 'TransitionScene',
    // CutsceneScene: 'CutsceneScene',
    // GameOverScene: 'GameOverScene',
    // WinScene: 'WinScene',
} as const;

// --- Экспорт Типов ---
export type GameConfigType = typeof GameConfig;
export type PlayerConfigType = typeof GameConfig.player;
export type EnemyConfigType = typeof GameConfig.enemy;
export type BumblebeeConfigType = typeof GameConfig.enemy.bumblebee;