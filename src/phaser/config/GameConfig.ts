// src/phaser/config/GameConfig.ts
// Убрали 'import Phaser from 'phaser';' т.к. конкретные типы Phaser здесь не нужны

// --- Интерфейсы для типизации конфига ---

// Тип для Настроек Игрока
interface PlayerConfigDefinition {
    scale: number;
    moveSpeed: number;
    jumpSpeed: number;
    stompBounceSpeed: number;        // Отскок после прыжка на врага
    gravityY: number;                // Персональная гравитация игрока
    depth: number;
    // Анимации - Кадры (ключи текстур)
    runFrames: string[];
    jumpFrames: string[];
    idleFrames: string[];
    // Анимации - Ключи (для this.anims.play)
    runAnimKey: string;
    jumpAnimKey: string;
    idleAnimKey: string;
    fallAnimKey: string;            // Ключ для анимации падения (может быть таким же как jump)
    // Анимации - Скорость (кадров/сек)
    runFrameRate: number;
    jumpFrameRate: number;
    idleFrameRate: number;
    // Настройки геймплея
    allowDoubleJump: boolean;       // Разрешен ли двойной прыжок
    initialLives: number;           // Начальное кол-во жизней
    maxLives: number;               // Максимальное кол-во жизней
    invulnerabilityDuration: number;// Длительность неуязвимости после урона (ms)
    powerUpDuration: number;        // Длительность бонуса (ms)
    powerUpScaleMultiplier: number; // Множитель размера при бонусе (1 = без изменений)
    powerUpJumpMultiplier: number;  // Множитель силы прыжка при бонусе
}

// Тип для Настроек Земли
interface GroundConfigDefinition {
    width: number;  // Примерная ширина тайла земли для расчетов
    height: number; // Примерная высота тайла земли
    top: number;    // Y-координата верха земли
    depth: number;
}

// Тип для Настроек Труб
interface PipeConfigDefinition {
    scale: number;
    depth: number;
    seriesMinSpacing: number;
    seriesMaxSpacing: number;
    width?: number;
    height?: number; // Необязательная ширина для расчетов, если displayWidth недоступен
}

// Тип для Настроек Платформ
interface PlatformConfigDefinition {
    scale: number;
    depth: number;
    minYAboveGround: number; // Минимальная высота платформы над землей
    maxYAboveGround: number; // Максимальная высота платформы над землей
    // Статические серии
    elevatedMinSpacingX: number;
    elevatedMaxSpacingX: number;
    elevatedYVariation: number;
    // Движущиеся платформы
    movingYMinDistance: number;
    movingYMaxDistance: number;
    movingMinDuration: number; // ms
    movingMaxDuration: number; // ms
    staggeredMovingChance: number; // Шанс (0-1), что платформа в staggered будет движущейся
}

// Тип для Настроек Блоков
interface BlocksConfigDefinition {
    scale: number;
    depth: number;
    minCount: number;
    maxCount: number;
    spacing: number;
    heightAboveGround: number;
    bonusChance: number; // Шанс (0-1) что блок будет бонусным
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
        cutsceneThreshold: number; // Кол-во гвоздик для катсцены
    };
    money: {
        scale: number;
        depth: number;
        spawnChance: number; // Шанс (0-1) появления денег вместо гвоздики при спавне
    };
    spawnOnPlatformChance: number; // Общий шанс (0-1) спавна предмета на платформе
    bonusItemScale: number;        // Масштаб бонусного предмета (жизни) из блока
    bonusItemVelocityY: number;    // Скорость полета вверх бонусного предмета
    bonusItemFlyHeight: number;    // Высота полета бонусного предмета
    bonusItemDuration: number;     // Длительность анимации бонусного предмета (ms)
}

// Тип для Настроек Врагов (Общий)
interface EnemyConfigDefinition {
    pipeSpawnBaseChance: number;        // Базовый шанс спавна врага у трубы
    pipeSpawnDifficultyFactor: number;  // Как сильно сложность влияет на шанс у трубы
    pipeSeriesSpawnBaseChance: number;  // Шанс спавна в серии труб
    pipeSeriesSpawnDifficultyFactor: number;
    elevatedSpawnBaseChance: number;    // Шанс спавна на возвышенностях
    elevatedSpawnDifficultyFactor: number;
    // Конкретные враги
    zil: ZilConfigDefinition;
    cruzak: CruzerConfigDefinition;
    dog: DogConfigDefinition;
    poop: PoopConfigDefinition;
}

// Типы для конкретных врагов
interface ZilConfigDefinition {
    depth: number;
    patrolRange: number;
    shootRange: number;    // Для zil_big
    shootCooldown: number; // ms, для zil_big
    // Типы ЗИЛов (текстуры, скорости, размеры)
    types: string[];       // ['zil', 'zil_fast', 'zil_big']
    speeds: number[];      // Соответствуют types
    scales: number[];      // Соответствуют types
}
interface CruzerConfigDefinition {
    depth: number;
    scale: number;
    speed: number;
    patrolRange: number;
    spawnThreshold: number; // Кол-во гвоздик для начала спавна
    spawnChanceAfterThreshold: number; // Шанс спавна после порога (0-1)
}
interface DogConfigDefinition {
    depth: number;
    scale: number;
    speed: number;
    spawnChance: number; // Базовый шанс спавна (0-1)
    animKey: string;     // Ключ анимации бега
    animFrames: string[];// Кадры анимации
    animFrameRate: number;
}
interface PoopConfigDefinition {
    scale: number;
    depth: number;
    speed: number;
    lifetime: number; // ms
}

// Тип для Настроек Опасностей (Метеоры, Огненные палки)
interface HazardsConfigDefinition {
    meteor: {
        depth: number;
        scale: number;
        spawnChance: number; // Шанс спавна за апдейт (0-1)
        minSpeed: number;
        maxSpeed: number;
        maxAngle: number; // Максимальное отклонение от вертикали (градусы)
        impactShakeDuration: number; // ms
        impactShakeIntensity: number; // (0-1)
    };
    fireStick: {
        depth: number;
        scale: number;
        offset: number; // Смещение по Y от центра платформы
        minRotationSpeed: number; // ms per revolution
        maxRotationSpeed: number; // ms per revolution
        chanceOnMoving: number; // Шанс (0-1) появления на движущейся платформе
    };
}

// Тип для Настроек Облаков
interface CloudsConfigDefinition {
    depth: number;
    count: number; // Начальное количество
    minY: number;
    maxY: number;
    minScale: number;
    maxScale: number;
    minAlpha: number;
    maxAlpha: number;
    minScroll: number;
    maxScroll: number;
    minSpeed: number;  // Базовая скорость (умножается на scrollFactor)
    maxSpeed: number;
    creationChance: number; // Шанс создания нового облака за секунду (0-1)
}

// Тип для Настроек Разрывов (Пропастей)
interface GapConfigDefinition {
    baseWidth: number; // Минимальная ширина
    maxWidth: number; // Максимальная ширина
    difficultyWidthFactor: number; // Насколько сложность увеличивает ширину
    // Для разрывов с платформами
    movingPlatformBaseWidth: number;
    movingPlatformMaxWidth: number;
    movingPlatformDifficultyWidthFactor: number;
    movingPlatformMinCount: number;
    movingPlatformMaxCount: number;
    minWidthBetweenSegments?: number; // Необязательно: мин. расстояние между сегментами
    maxWidthBetweenSegments?: number; // Необязательно: макс. расстояние между сегментами
}

// Тип для Настроек Катсцены
interface CutsceneConfigDefinition {
    barHeight: number;
    barTweenDuration: number;
    elementFadeDuration: number;
    displayDuration: number; // Может быть не используется, но пусть будет
    endDelay: number;
    flashDuration: number;
    // --- Свойства персонажей/объектов катсцены ---
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
    startDistance: number; // Дистанция, после которой начинает расти сложность
    scaleFactor: number;   // Множитель влияния дистанции
    scoreFactor: number;   // Множитель влияния очков
    maxDifficulty: number; // Максимальное значение сложности
}

// Тип для Максимального Количества Объектов
interface MaxObjectsDefinition {
    ground: number;
    pipes: number;
    platforms: number; // Сумма статических и движущихся
    blocks: number;
    zils: number;
    cruzaks: number;
    dogs: number;
    poops: number;
    gvozdiki: number;
    money: number;
    meteors: number;
    fireSticks: number;
    clouds: number;
}

// Тип для Громкости Звуков
interface SoundVolumesDefinition {
    bgm: number;
    collect: number;
    jump: number;
    playerDamage: number;
    enemyStomp: number;
    blockHit: number;
    blockBonus: number;
    powerUp: number;
    powerDown: number;
    zil_death: number;
    meteor_impact: number;
    gvozd_social: number;
    photo_sound: number;
    // Добавьте другие звуки если нужно
    [key: string]: number; // Позволяет добавлять любые строковые ключи
}


// --- Главный Интерфейс Конфигурации ---
interface GameConfigDefinition {
    gameWidth: number;
    gameHeight: number;
    gravity: number;                 // Гравитация мира по умолчанию
    maxWorldDistance: number;        // Максимальная длина уровня
    // --- Генерация и Очистка ---
    generationLookahead: number;     // Насколько далеко вперед генерировать мир
    generationDelay: number;         // Минимальная задержка между генерацией сегментов (ms)
    cleanupDelay: number;            // Как часто проверять объекты для удаления (ms)
    cleanupBuffer: number;           // Расстояние за левым краем экрана для удаления объектов
    // --- Вложенные Конфиги ---
    player: PlayerConfigDefinition;
    ground: GroundConfigDefinition;
    pipe: PipeConfigDefinition;
    platform: PlatformConfigDefinition;
    blocks: BlocksConfigDefinition;
    collectibles: CollectiblesConfigDefinition;
    enemy: EnemyConfigDefinition;
    hazards: HazardsConfigDefinition;
    clouds: CloudsConfigDefinition;
    gap: GapConfigDefinition;
    cutscene: CutsceneConfigDefinition;
    difficultyScaling: DifficultyScalingDefinition;
    maxObjects: MaxObjectsDefinition;
    soundVolumes: SoundVolumesDefinition;
}

// --- КОНСТАНТА КОНФИГУРАЦИИ ---
// Применяем главный интерфейс к объекту
export const GameConfig: GameConfigDefinition = {
    gameWidth: 800,
    gameHeight: 600,
    gravity: 900, // Общая гравитация мира
    maxWorldDistance: 15000, // Примерная длина уровня

    generationLookahead: 600,
    generationDelay: 150, // ms
    cleanupDelay: 3000, // ms
    cleanupBuffer: 500, // px

    player: {
        scale: 0.4,
        moveSpeed: 250, // Увеличена скорость для динамики
        jumpSpeed: -550,            // Увеличен прыжок
        stompBounceSpeed: -380,     // Немного увеличен отскок
        gravityY: 1000,             // Нормальная гравитация для игрока
        depth: 10,
        // Анимации - Кадры
        runFrames: ['r1', 'r2', 'r3', 'r4'],
        jumpFrames: ['j1', 'j2', 'j3', 'j4'],
        idleFrames: ['i1', 'i2', 'i3', 'i4'],
        // Анимации - Ключи
        runAnimKey: 'player-run',
        jumpAnimKey: 'player-jump',
        idleAnimKey: 'player-idle',
        fallAnimKey: 'player-fall', // Используем отдельный ключ (можно 'player-jump')
        // Анимации - Скорость
        runFrameRate: 12,
        jumpFrameRate: 15,
        idleFrameRate: 12,
        // Геймплей
        allowDoubleJump: true,
        initialLives: 5,
        maxLives: 10,
        invulnerabilityDuration: 1800, // Увеличена неуязвимость
        powerUpDuration: 10000,       // 10 секунд бонуса
        powerUpScaleMultiplier: 1.5, // Без изменения размера
        powerUpJumpMultiplier: 1.5, // Прыгает на 30% выше/сильнее
    },

    ground: {
        width: 77, // Примерная ширина тайла земли (изменено для примера)
        height: 77, // Примерная высота тайла земли (изменено для примера)
        top: 532, // gameHeight - height = 600 - 71
        depth: 5,
    },

    pipe: {
        scale: 0.23, // Немного увеличены трубы
        depth: 6,
        seriesMinSpacing: 200, // Больше разброс
        seriesMaxSpacing: 300,
        width: 55,
        height: 70 // Примерная ширина спрайта трубы
    },

    platform: {
        scale: 0.27, // Немного увеличены платформы
        depth: 7,
        minYAboveGround: 70,
        maxYAboveGround: 240, // Выше максимальная высота
        elevatedMinSpacingX: 180,
        elevatedMaxSpacingX: 350,
        elevatedYVariation: 70,
        movingYMinDistance: 60,
        movingYMaxDistance: 150, // Больше диапазон движения
        movingMinDuration: 1800,
        movingMaxDuration: 3500,
        staggeredMovingChance: 0.45, // 45% шанс
    },

    blocks: {
        scale: 0.12,
        depth: 8,
        minCount: 3,
        maxCount: 7, // Может быть больше блоков
        spacing: 49,
        heightAboveGround: 110,
        bonusChance: 0.30, // 30% шанс на бонус
        bumpHeight: 20,
        bumpDuration: 200, // ms
    },

    collectibles: {
        gvozdik: {
            scale: 0.25,
            depth: 9,
            swingAngle: 18,
            swingSpeed: 900,
            magnetRange: 200, // Больше радиус притяжения
            magnetSpeed: 1200, // Быстрее притягиваются
            collectDistance: 25,
            cutsceneThreshold: 50,
        },
        money: {
            scale: 0.15, // Деньги чуть больше
            depth: 9,
            spawnChance: 0.12, // 12% шанс
        },
        spawnOnPlatformChance: 0.35, // 35% шанс спавна на платформе
        bonusItemScale: 0.35,
        bonusItemVelocityY: -180,
        bonusItemFlyHeight: 35,
        bonusItemDuration: 550,
    },

    // --- ШАНСЫ ВРАГОВ (СИЛЬНО УВЕЛИЧЕНЫ ДЛЯ ТЕСТА) ---
    enemy: {
        pipeSpawnBaseChance: 0.5,           // 80% шанс у трубы
        pipeSpawnDifficultyFactor: 0.1,     // +10% за ед. сложности
        pipeSeriesSpawnBaseChance: 0.9,     // 90% шанс в серии труб
        pipeSeriesSpawnDifficultyFactor: 0.1,
        elevatedSpawnBaseChance: 0.85,      // 85% шанс на платформах
        elevatedSpawnDifficultyFactor: 0.8,
        // -------------------------------------------
        zil: {
            depth: 12, // Позади игрока, но выше платформ/труб/земли
            patrolRange: 110,
            shootRange: 320,
            shootCooldown: 2300,
            types: ['zil', 'zil_fast', 'zil_big'],
            speeds: [50, 85, 35], // ЗИЛы чуть быстрее
            scales: [0.38, 0.48, 0.58], // Большой ЗИЛ заметнее
        },
        cruzak: {
            depth: 10, // Та же глубина, что у ЗИЛа
            scale: 0.09, // Чуть больше
            speed: 30,
            patrolRange: 130,
            spawnThreshold: 0,          // <-- 0 для теста (спавнится сразу)
            spawnChanceAfterThreshold: 0.5, // <-- 70% шанс для теста
        },
        dog: {
            depth: 11, // Та же глубина
            scale: 0.14,
            speed: 200, // Очень быстрые
            spawnChance: 0.75,        // <-- 75% шанс для теста
            animKey: 'dog-run',
            animFrames: ['d1', 'd2', 'd3', 'd4'],
            animFrameRate: 12, // Бегут быстрее
        },
        poop: {
            scale: 0.18,
            depth: 8, // Позади врага, но выше фона
            speed: 280,
            lifetime: 2800,
        },
    },

    hazards: {
        meteor: {
            depth: 15,
            scale: 0.2, // Метеоры чуть больше
            spawnChance: 0.003, // Чуть чаще
            minSpeed: 220,
            maxSpeed: 450,
            maxAngle: 30,
            impactShakeDuration: 120,
            impactShakeIntensity: 0.006,
        },
        fireStick: {
            depth: 8,
            scale: 0.25,
            offset: 8,
            minRotationSpeed: 1800,
            maxRotationSpeed: 3500,
            chanceOnMoving: 0.40, // 40% шанс
        },
    },

    clouds: {
        depth: -5,
        count: 0, // Больше облаков
        minY: 40,
        maxY: 280,
        minScale: 0.05, // Облака чуть крупнее
        maxScale: 0.25,
        minAlpha: 0.5,
        maxAlpha: 0.85,
        minScroll: 0.08,
        maxScroll: 0.35,
        minSpeed: -15,
        maxSpeed: -45,
        creationChance: 0.15, // Чуть чаще появляются новые
    },

    gap: {
        baseWidth: 90,
        maxWidth: 400, // Макс. пропасть шире
        difficultyWidthFactor: 25,
        movingPlatformBaseWidth: 180,
        movingPlatformMaxWidth: 500, // Макс. пропасть с платформами шире
        movingPlatformDifficultyWidthFactor: 30,
        movingPlatformMinCount: 1,
        movingPlatformMaxCount: 3,
        minWidthBetweenSegments: 30, // Больше минимальное расстояние
        maxWidthBetweenSegments: 80, // Больше максимальное расстояние
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
        startDistance: 400, // Сложность растет чуть раньше
        scaleFactor: 0.00025, // Чуть быстрее от дистанции
        scoreFactor: 0.006,   // Чуть больше от очков
        maxDifficulty: 10,    // Максимальная сложность выше
    },

    maxObjects: { // Лимиты можно немного поднять
        ground: 60,
        pipes: 35,
        platforms: 45,
        blocks: 35,
        zils: 12,
        cruzaks: 40,
        dogs: 10,
        poops: 18,
        gvozdiki: 60,
        money: 12,
        meteors: 10,
        fireSticks: 18,
        clouds: 25,
    },

    soundVolumes: {
        bgm: 0.3,
        collect: 0.6,
        jump: 0.5,
        playerDamage: 0.7,
        enemyStomp: 0.6,
        blockHit: 0.5,
        blockBonus: 0.7,
        powerUp: 0.7,
        powerDown: 0.6,
        zil_death: 0.6,
        meteor_impact: 0.8,
        gvozd_social: 0.9,
        photo_sound: 0.8
    },

    
};

export const SceneKeys = {
    GvozdScene: 'GvozdScene',
    TransitionScene: 'TransitionScene',
    CaveScene: 'CaveScene',
    // StartScreen: 'StartScreen', // Если сделаете сценой
    // GameOverScreen: 'GameOverScreen' // Если сделаете сценой
} as const; // 'as const' для строгих типов

// --- Экспорт Типов (остается как было) ---
export type GameConfigType = typeof GameConfig;
export type PlayerConfigType = typeof GameConfig.player;