// src/phaser/managers/WorldGenerator.ts
import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { EnemyManager } from './EnemyManager';
import { CollectiblesManager } from './CollectiblesManager';

const BLOCK_TEXTURE = 'block';
const BONUS_BLOCK_TEXTURE = 'bonus_block';
// const USED_BLOCK_TEXTURE = 'used_block'; // Текстура задается в GvozdScene/CaveScene
// const BONUS_ITEM_TEXTURE = 'life'; // Текстура задается в GvozdScene/CaveScene

export class WorldGenerator {
    private scene: Phaser.Scene;
    private config = GameConfig;
    // Groups
    private groundGroup: Phaser.Physics.Arcade.StaticGroup;
    private pipesGroup: Phaser.Physics.Arcade.StaticGroup;
    private staticPlatformsGroup: Phaser.Physics.Arcade.StaticGroup;
    private movingPlatformsGroup: Phaser.Physics.Arcade.Group;
    private fireSticksSprites: Phaser.GameObjects.Sprite[] = [];
    private flagpoleGroup: Phaser.Physics.Arcade.StaticGroup;
    private blocksGroup: Phaser.Physics.Arcade.StaticGroup;
    // Managers
    private enemyManager: EnemyManager;
    private collectiblesManager: CollectiblesManager;
    // Отслеживание состояния
    private movingPlatforms: Phaser.Physics.Arcade.Image[] = [];
    private flagpoleSpawned: boolean = false;
    private lastTerrainType: number = -1;
    private lastSegmentEndTime = 0;
    private lastSegmentEndX = 0;
    private furthestGroundX = 0;
    private _currentDifficulty: number = 1;
    private isDebugMode = false; // Отключаем логи по умолчанию

    // !!!!! ДОБАВЛЕНО/ИЗМЕНЕНО !!!!!
    private groundTextureKey: string; // Ключ текстуры земли ('ground' или 'cave_ground')
    private currentLevelLength: number; // Длина текущего уровня

    // Шаблоны генерации (можно настроить для разных уровней)
    private levelTemplates = {
         easy: [ { type: 0, weight: 3 }, { type: 1, weight: 4 }, { type: 2, weight: 2 }, { type: 3, weight: 1 }, { type: 5, weight: 3 }, { type: 8, weight: 2 }, { type: 9, weight: 2 } ],
         medium: [ { type: 0, weight: 2 }, { type: 1, weight: 2 }, { type: 2, weight: 3 }, { type: 3, weight: 3 }, { type: 4, weight: 2 }, { type: 5, weight: 2 }, { type: 6, weight: 1 }, { type: 8, weight: 2 }, { type: 9, weight: 3 } ],
         hard: [ { type: 0, weight: 1 }, { type: 1, weight: 1 }, { type: 2, weight: 2 }, { type: 3, weight: 2 }, { type: 4, weight: 3 }, { type: 5, weight: 1 }, { type: 6, weight: 2 }, { type: 7, weight: 3 }, { type: 8, weight: 2 }, { type: 9, weight: 3 } ],
         // Можно добавить шаблоны для cave
         cave_easy: [ /* ... другие веса или типы для пещеры ... */ { type: 1, weight: 3 }, { type: 3, weight: 4 }, { type: 4, weight: 2 }, { type: 8, weight: 3 }, { type: 9, weight: 1 } ],
         cave_medium: [ /* ... */ ],
         cave_hard: [ /* ... */ ],
    };

    // !!!!! КОНСТРУКТОР ПРИНИМАЕТ 7 ПАРАМЕТРОВ !!!!!
    constructor(
        scene: Phaser.Scene,
        groups: {
            ground: Phaser.Physics.Arcade.StaticGroup, pipes: Phaser.Physics.Arcade.StaticGroup,
            staticPlatforms: Phaser.Physics.Arcade.StaticGroup, movingPlatforms: Phaser.Physics.Arcade.Group,
            flagpole: Phaser.Physics.Arcade.StaticGroup, blocks: Phaser.Physics.Arcade.StaticGroup
        },
        fireStickSpritesRef: Phaser.GameObjects.Sprite[],
        enemyManager: EnemyManager,
        collectiblesManager: CollectiblesManager,
        _player: Phaser.Physics.Arcade.Sprite, // Этот параметр не используется внутри, но он есть для совместимости вызова
        groundTextureKey: string = 'ground' // 7-й параметр! По умолчанию 'ground'
    ) {
        this.scene = scene;
        this.groundGroup = groups.ground;
        this.pipesGroup = groups.pipes;
        this.staticPlatformsGroup = groups.staticPlatforms;
        this.movingPlatformsGroup = groups.movingPlatforms;
        this.flagpoleGroup = groups.flagpole;
        this.blocksGroup = groups.blocks;
        this.fireSticksSprites = fireStickSpritesRef;
        this.enemyManager = enemyManager;
        this.collectiblesManager = collectiblesManager;
        // СОХРАНЯЕМ КЛЮЧ И ДЛИНУ
        this.groundTextureKey = groundTextureKey;
        this.currentLevelLength = GameConfig.maxWorldDistance; // По умолчанию общая длина
        this.resetState();
        console.log(`WorldGenerator initialized with ground: ${this.groundTextureKey}`);
    }

    // !!!!! МЕТОД setLevelLength ДОЛЖЕН СУЩЕСТВОВАТЬ !!!!!
    public setLevelLength(length: number) {
        this.currentLevelLength = length;
        console.log(`WorldGenerator level length set to: ${this.currentLevelLength}`);
    }

    public resetState() {
        this.lastTerrainType = -1; this.lastSegmentEndX = 0; this.furthestGroundX = 0;
        this._currentDifficulty = 1; this.lastSegmentEndTime = 0;
        this.movingPlatforms = []; this.flagpoleSpawned = false;
        this.cleanupAllFireSticks();
        this.debugLog('[WorldGenerator] State reset.');
    }

    // Очистка огненных палок
    private cleanupAllFireSticks() {
        this.debugLog(`[Cleanup] Cleaning up ${this.fireSticksSprites.length} fire sticks.`);
        for (let i = this.fireSticksSprites.length - 1; i >= 0; i--) {
            const stick = this.fireSticksSprites[i];
            if (stick?.active) {
                this.scene.tweens.killTweensOf(stick);
                stick.destroy();
            }
        }
        this.fireSticksSprites.length = 0;
    }

    public updateDifficulty(playerX: number, playerScore: number = 0) {
        const distanceTraveled = Math.max(0, playerX - this.config.difficultyScaling.startDistance);
        const distanceDifficulty = distanceTraveled * this.config.difficultyScaling.scaleFactor;
        const scoreDifficulty = Math.max(0, playerScore * this.config.difficultyScaling.scoreFactor);
        this._currentDifficulty = Math.min( this.config.difficultyScaling.maxDifficulty, 1 + distanceDifficulty + scoreDifficulty );
        this.enemyManager.setCurrentDifficulty(this._currentDifficulty);
    }

    public getDifficultyValue(): number { return this._currentDifficulty; }

    private getTemplateForDifficulty(): { type: number, weight: number }[] {
        const isCave = this.groundTextureKey === 'cave_ground';
        let baseTemplate;

        if (isCave) {
             // Используем запасные варианты, если шаблоны для пещеры не определены
            if (this._currentDifficulty < 2.5) baseTemplate = this.levelTemplates.cave_easy ?? this.levelTemplates.easy;
            else if (this._currentDifficulty < 5.0) baseTemplate = this.levelTemplates.cave_medium ?? this.levelTemplates.cave_easy ?? this.levelTemplates.medium;
            else baseTemplate = this.levelTemplates.cave_hard ?? this.levelTemplates.cave_medium ?? this.levelTemplates.cave_easy ?? this.levelTemplates.hard;
        } else {
            if (this._currentDifficulty < 2.5) baseTemplate = this.levelTemplates.easy;
            else if (this._currentDifficulty < 5.0) baseTemplate = this.levelTemplates.medium;
            else baseTemplate = this.levelTemplates.hard;
        }
         // Убедимся, что шаблон не пустой
         if (!baseTemplate || baseTemplate.length === 0) {
             console.warn(`No valid level template found for difficulty ${this._currentDifficulty} and ground ${this.groundTextureKey}. Using default easy.`);
             return this.levelTemplates.easy; // Возвращаем стандартный легкий шаблон как запасной
         }
         return baseTemplate;
    }


    private selectPatternType(): number {
        const template = this.getTemplateForDifficulty();
        if (!template || template.length === 0) {
             console.error("Cannot select pattern type: Template is empty or invalid.");
             return 0;
        }
        let totalWeight = template.reduce((sum, item) => sum + item.weight, 0);
        const lastWeightReduction = 0.6; const gapCooldownReduction = 0.05;
        if (this.lastTerrainType !== -1) {
            const lastTypeEntry = template.find(item => item.type === this.lastTerrainType);
            if (lastTypeEntry) totalWeight -= lastTypeEntry.weight * (1 - lastWeightReduction);
            if (this.lastTerrainType === 6 || this.lastTerrainType === 7) {
                template.forEach(item => { if (item.type === 6 || item.type === 7) totalWeight -= item.weight * (1 - gapCooldownReduction); });
            }
        }
        // Защита от деления на ноль или отрицательного веса
        if (totalWeight <= 0) totalWeight = template.reduce((sum, item) => sum + item.weight, 0); // Пересчитываем без скидок, если вес ушел в ноль
        if (totalWeight <= 0) return template[Math.floor(Math.random() * template.length)].type; // Крайний случай

        let randomRoll = Math.random() * totalWeight; let selectedType = template[template.length - 1].type;
        for (const item of template) {
            let currentWeight = item.weight;
            if (item.type === this.lastTerrainType) currentWeight *= lastWeightReduction;
            if ((this.lastTerrainType === 6 || this.lastTerrainType === 7) && (item.type === 6 || item.type === 7)) currentWeight *= gapCooldownReduction;
            // Убедимся, что вес не отрицательный
            currentWeight = Math.max(0, currentWeight);
            randomRoll -= currentWeight;
            if (randomRoll <= 0) { selectedType = item.type; break; }
        }
        return selectedType;
    }

    // Основная функция проверки и генерации мира
    public checkAndGenerate(time: number, cameraRightX: number, playerX: number) {
        const generationThreshold = cameraRightX + this.config.generationLookahead;
        const levelEndThreshold = this.currentLevelLength - this.config.gameWidth; // Используем currentLevelLength

        // Генерация флага
        if (!this.flagpoleSpawned && playerX > levelEndThreshold) {
            if (this.scene.textures.exists('flagpole')) {
                const flagX = this.currentLevelLength - 200; // Позиция относительно currentLevelLength
                this.createFlagpole(flagX);
                this.flagpoleSpawned = true; // Устанавливаем флаг здесь, после успешного создания
                this.debugLog(`[Flagpole] Attempted spawn at ${flagX.toFixed(0)}.`);
            } else {
                console.warn("Texture 'flagpole' not found, cannot spawn flagpole.");
                this.flagpoleSpawned = true; // Отмечаем, чтобы не пытаться снова
            }
        }

        // Цикл генерации сегментов
        // Используем currentLevelLength
        while ( (time - this.lastSegmentEndTime > this.config.generationDelay || this.lastSegmentEndX < cameraRightX + 100)
                && this.lastSegmentEndX < generationThreshold
                && this.lastSegmentEndX < this.currentLevelLength - this.config.gameWidth ) // Ограничение по длине уровня
        {
            this.debugLog(`[WorldGenerator] Entering loop. LastEndX: ${this.lastSegmentEndX.toFixed(0)}, Thresh: ${generationThreshold.toFixed(0)}`);
            const segmentSpacing = Phaser.Math.Between( (this.config.gap.minWidthBetweenSegments ?? 10), (this.config.gap.maxWidthBetweenSegments ?? 80) );
            const nextGenStartX = this.lastSegmentEndX + segmentSpacing;
            let patternType: number = this.selectPatternType();
            let segmentEndX = this.lastSegmentEndX;

            this.debugLog(`[WorldGenerator] Selected type: ${patternType} at ${nextGenStartX.toFixed(0)}`);

            try {
                switch (patternType) {
                    case 0: segmentEndX = this.createPipeSegment(nextGenStartX); break;
                    case 1: segmentEndX = this.createPlatformWithCollectible(nextGenStartX); break;
                    case 2: segmentEndX = this.createPipeSeries(nextGenStartX); break;
                    case 3: segmentEndX = this.createElevatedPlatforms(nextGenStartX); break;
                    case 4: segmentEndX = this.createComplexPattern(nextGenStartX); break;
                    case 5: segmentEndX = this.createGroundGvozdiki(nextGenStartX); break;
                    case 6: segmentEndX = this.createGap(nextGenStartX); break;
                    case 7: segmentEndX = this.createGapWithMovingPlatforms(nextGenStartX); break;
                    case 8: segmentEndX = this.createStaggeredPlatforms(nextGenStartX); break;
                    case 9: segmentEndX = this.createBlockRowWithBonuses(nextGenStartX); break;
                    default: this.debugLog(`Unknown pattern type: ${patternType}. Skipping.`); segmentEndX = nextGenStartX + 100;
                }
                if (segmentEndX <= this.lastSegmentEndX) {
                    this.debugLog(`Pattern type ${patternType} did not advance position. Failsafe advance.`);
                    segmentEndX = this.lastSegmentEndX + 50; patternType = -1;
                }
            } catch (error) {
                 console.error(`Error during pattern ${patternType} generation:`, error);
                 segmentEndX = this.lastSegmentEndX + 100; patternType = -1;
            }

            // Спавн врагов ПОСЛЕ генерации сегмента
            if (patternType !== 6 && patternType !== 5 && segmentEndX > nextGenStartX) {
                 this.enemyManager.spawnEnemiesInSection(nextGenStartX, segmentEndX);
            }

            this.lastSegmentEndX = Math.max(this.lastSegmentEndX, segmentEndX);
            this.lastSegmentEndTime = time;
            this.lastTerrainType = patternType;
            this.debugLog(`[GenerateSegment] Finished. Type: ${patternType}, New LastEndX: ${this.lastSegmentEndX.toFixed(0)}`);
        }
        // Обновляем позицию огненных палок
        this.updateFireSticks();
    }

    public createInitialGround() {
        const initialEndX = this.ensureGroundExists(this.config.gameWidth + 200);
        this.furthestGroundX = initialEndX;
        this.lastSegmentEndX = initialEndX;
        this.debugLog(`[WorldGenerator] Initial ground created up to X: ${this.furthestGroundX.toFixed(0)}`);
    }

    public ensureGroundExists(targetX: number): number {
        let currentGroundEndX = this.furthestGroundX;
        if (currentGroundEndX >= targetX) return currentGroundEndX;

        const groundChildren = this.groundGroup.getChildren();
        if (groundChildren.length > 0) {
            const lastGroundTile = groundChildren[groundChildren.length - 1] as Phaser.Physics.Arcade.Image;
            if (lastGroundTile?.active && typeof lastGroundTile.x === 'number') {
                 currentGroundEndX = Math.max(currentGroundEndX, lastGroundTile.getRightCenter().x);
            }
        } else { currentGroundEndX = 0; }

        let addedTiles = 0;
        const maxTiles = this.config.maxObjects.ground;
        // Используем currentLevelLength
        const worldLimit = this.currentLevelLength;
        const tileY = this.config.ground.top;

        // Используем this.groundTextureKey
        const textureKey = this.groundTextureKey;
        if (!this.scene.textures.exists(textureKey)) {
             console.error(`[EnsureGroundExists] Ground texture "${textureKey}" not found!`);
             return this.furthestGroundX;
        }

        while (currentGroundEndX < targetX && this.groundGroup.countActive(true) < maxTiles && currentGroundEndX < worldLimit) {
            const nextTileStartX = currentGroundEndX;
            const newGround = this.groundGroup.create(
                nextTileStartX, tileY, textureKey // Используем сохраненный ключ
            )
            .setOrigin(0, 0).setDepth(this.config.ground.depth).refreshBody();

            if (!newGround) { console.error('[EnsureGroundExists] Failed to create a ground tile!'); break; }

            currentGroundEndX = newGround.getRightCenter().x;
            addedTiles++;
        }
        // Лог включает ключ текстуры
        if (addedTiles > 0) { this.debugLog(`[EnsureGroundExists using ${textureKey}] Added ${addedTiles} tiles. New End X: ${currentGroundEndX.toFixed(0)}`); }
        this.furthestGroundX = Math.max(this.furthestGroundX, currentGroundEndX);
        return this.furthestGroundX;
    }

    // Метод создания флагштока
    private createFlagpole(x: number): Phaser.Physics.Arcade.Sprite | null {
        if (this.flagpoleGroup.countActive(true) > 0 || !this.scene.textures.exists('flagpole')) {
             this.debugLog(`[CreateFlagpole] Skipped. Already exists or texture missing. Count: ${this.flagpoleGroup.countActive(true)}`);
             return null;
        }

        // Убедимся, что земля доходит до места установки флага (это важно)
        this.ensureGroundExists(x + 50);

        const flagpole = this.flagpoleGroup.create(x, this.config.ground.top, 'flagpole')
            .setOrigin(0.5, 1).setScale(0.5).setDepth(this.config.pipe.depth).refreshBody();

        if (!flagpole) { console.error("[CreateFlagpole] Failed to create flagpole sprite!"); return null; }

        if (flagpole.body instanceof Phaser.Physics.Arcade.StaticBody) {
             const bodyWidth = flagpole.width * 0.2; const bodyHeight = flagpole.height * 0.95;
             flagpole.body.setSize(bodyWidth, bodyHeight);
             flagpole.body.setOffset(flagpole.width * (0.5 - 0.1), flagpole.height * 0.05);
             flagpole.refreshBody();
             this.debugLog(`[CreateFlagpole] Successfully created at ${x.toFixed(0)}`);
        } else { console.warn("[CreateFlagpole] Flagpole body is not StaticBody?"); }
        return flagpole;
    }


    private createBlockRowWithBonuses(startX: number): number {
        const blockCount = Phaser.Math.Between(this.config.blocks.minCount, this.config.blocks.maxCount);
        const blockSpacing = this.config.blocks.spacing;
        const yPos = this.config.ground.top - this.config.blocks.heightAboveGround;
        if (!this.scene.textures.exists(BLOCK_TEXTURE) || !this.scene.textures.exists(BONUS_BLOCK_TEXTURE)) {
            console.warn(`Block textures missing. Skipping block row.`); return startX + 100;
        }
        let lastBlockEndX = startX;
        for (let i = 0; i < blockCount; i++) {
            if (this.blocksGroup.countActive(true) >= this.config.maxObjects.blocks) break;
            const xPos = startX + i * blockSpacing;
            const isBonus = Math.random() < this.config.blocks.bonusChance;
            const texture = isBonus ? BONUS_BLOCK_TEXTURE : BLOCK_TEXTURE;
            const block = this.blocksGroup.create(xPos, yPos, texture)
                .setOrigin(0, 0.5).setDepth(this.config.blocks.depth).setScale(this.config.blocks.scale).refreshBody();
            block.setData('isBonus', isBonus); block.setData('used', false);
            lastBlockEndX = block.getRightCenter().x;
        }
        return lastBlockEndX + Phaser.Math.Between(10, 30);
    }

    private createPipeSegment(baseX: number): number {
        // Логика остается прежней, позиционируется на config.ground.top
        if (this.pipesGroup.countActive(true) >= this.config.maxObjects.pipes) return baseX + 50;
        const x = baseX + Phaser.Math.Between(50, 100);
        const y = this.config.ground.top;
        const pipe = this.pipesGroup.create(x, y, 'pipe')
            .setOrigin(0.5, 1).setScale(this.config.pipe.scale).setDepth(this.config.pipe.depth).refreshBody();
        if (!pipe) return baseX + 50;
        if (pipe.body instanceof Phaser.Physics.Arcade.StaticBody) { /* ... body adjust ... */ pipe.body.setSize(pipe.width * 0.9, pipe.height * 0.95).setOffset(pipe.width * 0.05, pipe.height * 0.05); pipe.refreshBody(); }
        return pipe.getRightCenter().x + Phaser.Math.Between(10, 40);
    }

    private createPlatform(x: number, y: number, isMoving = false): Phaser.Physics.Arcade.Image | null {
        // Логика остается прежней
        const targetGroup = isMoving ? this.movingPlatformsGroup : this.staticPlatformsGroup;
        const totalPlatforms = this.staticPlatformsGroup.countActive(true) + this.movingPlatformsGroup.countActive(true);
        if (totalPlatforms >= this.config.maxObjects.platforms) { this.debugLog("Max platforms reached."); return null; }
        const platform = targetGroup.create(x, y, 'platform')
            .setScale(this.config.platform.scale).setDepth(this.config.platform.depth).refreshBody();
        if (platform && platform.body instanceof Phaser.Physics.Arcade.Body) { /* ... body adjust ... */ platform.body.setSize(platform.displayWidth, platform.displayHeight).setOffset(0, 0); platform.refreshBody(); if (isMoving) { /* ... body props ... */ platform.body.setImmovable(true).setAllowGravity(false); this.movingPlatforms.push(platform); } }
        else if (!platform) { console.error("Failed to create platform."); return null; }
        return platform;
    }

    private createPlatformWithCollectible(baseX: number): number {
        // Логика остается прежней
        const x = baseX + Phaser.Math.Between(80, 150);
        const y = Phaser.Math.Between( this.config.gameHeight - this.config.platform.maxYAboveGround, this.config.gameHeight - this.config.platform.minYAboveGround );
        const platform = this.createPlatform(x, y, false); if (!platform) return baseX + 50;
        if (Math.random() < this.config.collectibles.spawnOnPlatformChance) { this.collectiblesManager.trySpawnCollectibleOn( x, y - platform.displayHeight / 2 - 15, 'platform' ); }
        return platform.getRightCenter().x + Phaser.Math.Between(20, 50);
    }

    private createPipeSeries(baseX: number): number {
        // Логика остается прежней
        const count = Phaser.Math.Between(2, Math.min(5, 2 + Math.floor(this._currentDifficulty)));
        if (this.pipesGroup.countActive(true) + count > this.config.maxObjects.pipes) return baseX + 50;
        const spacing = Phaser.Math.Between(this.config.pipe.seriesMinSpacing, this.config.pipe.seriesMaxSpacing);
        let currentX = baseX; let lastPipeEndX = baseX;
        for (let i = 0; i < count; i++) { /* ... create pipe ... */ currentX += spacing + Phaser.Math.Between(-10, 10); const y = this.config.ground.top; const pipe = this.pipesGroup.create(currentX, y, 'pipe').setOrigin(0.5, 1).setScale(this.config.pipe.scale).setDepth(this.config.pipe.depth).refreshBody(); if (!pipe) continue; if (pipe.body instanceof Phaser.Physics.Arcade.StaticBody) { /* ... body adjust ... */ pipe.body.setSize(pipe.width * 0.9, pipe.height * 0.95).setOffset(pipe.width * 0.05, pipe.height * 0.05); pipe.refreshBody(); } lastPipeEndX = pipe.getRightCenter().x; }
        return lastPipeEndX + Phaser.Math.Between(10, 40);
    }

    private createElevatedPlatforms(baseX: number): number {
        // Логика остается прежней
        const count = Phaser.Math.Between(2, Math.min(4, 2 + Math.floor(this._currentDifficulty * 0.8)));
        const totalPlatforms = this.staticPlatformsGroup.countActive(true) + this.movingPlatformsGroup.countActive(true);
        if (totalPlatforms + count > this.config.maxObjects.platforms) return baseX + 50;
        const spacingX = Phaser.Math.Between(
            this.config.platform.elevatedMinSpacingX + 20, // Увеличиваем минимум
            this.config.platform.elevatedMaxSpacingX + 10
        );
        const spacingYRange = this.config.platform.elevatedYVariation;
        let currentX = baseX; let lastY = Phaser.Math.Between( this.config.gameHeight - this.config.platform.maxYAboveGround, this.config.gameHeight - this.config.platform.minYAboveGround ); let lastPlatformEndX = baseX;
        for (let i = 0; i < count; i++) { /* ... create platform ... */ currentX += spacingX + Phaser.Math.Between(-20, 20); lastY = Phaser.Math.Clamp( lastY + Phaser.Math.Between(-spacingYRange, spacingYRange), this.config.gameHeight - this.config.platform.maxYAboveGround, this.config.gameHeight - this.config.platform.minYAboveGround ); const platform = this.createPlatform(currentX, lastY, false); if (!platform) continue; if (Math.random() < this.config.collectibles.spawnOnPlatformChance) { this.collectiblesManager.trySpawnCollectibleOn( currentX, lastY - platform.displayHeight / 2 - 15, 'elevated_platform' ); } lastPlatformEndX = platform.getRightCenter().x; }
        return lastPlatformEndX + Phaser.Math.Between(20, 60);
    }

    private createStaggeredPlatforms(baseX: number): number {
        // Логика остается прежней
        const count = Phaser.Math.Between(3, 5);
        const totalPlatforms = this.staticPlatformsGroup.countActive(true) + this.movingPlatformsGroup.countActive(true);
        if (totalPlatforms + count > this.config.maxObjects.platforms) return baseX + 50;
        const spacingX = Phaser.Math.Between(130, 180); let currentX = baseX; let lastY = Phaser.Math.Between( this.config.gameHeight - this.config.platform.maxYAboveGround, this.config.gameHeight - this.config.platform.minYAboveGround ); let lastPlatformEndX = baseX; let direction = Math.random() < 0.5 ? 1 : -1; const yStep = Phaser.Math.Between(40, 80);
        for (let i = 0; i < count; i++) { /* ... create platform, maybe moving, maybe firestick/collectible ... */ currentX += spacingX + Phaser.Math.Between(-10, 10); lastY = Phaser.Math.Clamp( lastY + (direction * yStep), this.config.gameHeight - this.config.platform.maxYAboveGround, this.config.gameHeight - this.config.platform.minYAboveGround ); const isMoving = Math.random() < this.config.platform.staggeredMovingChance && i > 0; const platform = this.createPlatform(currentX, lastY, isMoving); if (!platform) continue; if (isMoving) { const moveDistance = Phaser.Math.Between(this.config.platform.movingYMinDistance, this.config.platform.movingYMaxDistance); const duration = Phaser.Math.Between(this.config.platform.movingMinDuration, this.config.platform.movingMaxDuration); this.scene.tweens.add({ targets: platform, y: platform.y + (Math.random() < 0.5 ? moveDistance : -moveDistance), duration: duration, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: i * 200 }); if (Math.random() < this.config.hazards.fireStick.chanceOnMoving) { this.addFireStickToPlatform(platform); } else if (Math.random() < this.config.collectibles.spawnOnPlatformChance * 0.5) { this.collectiblesManager.trySpawnCollectibleOn( currentX, lastY - platform.displayHeight / 2 - 15, 'staggered_moving' ); } } else { if (Math.random() < this.config.collectibles.spawnOnPlatformChance) { this.collectiblesManager.trySpawnCollectibleOn( currentX, lastY - platform.displayHeight / 2 - 15, 'staggered_static' ); } } direction *= -1; lastPlatformEndX = platform.getRightCenter().x; }
        return lastPlatformEndX + Phaser.Math.Between(30, 70);
    }

    private createComplexPattern(baseX: number): number {
         // Логика остается прежней
         let currentX = baseX; const segmentLength = Phaser.Math.Between(400, 600); const endX = baseX + segmentLength; let lastElementEndX = baseX; let elementCount = 0; const maxElements = 8;
         while (currentX < endX && elementCount < maxElements) { /* ... randomly create platform or pipe ... */ const nextElementX = currentX + Phaser.Math.Between(80, 150); if (nextElementX >= endX) break; const elementTypeRoll = Math.random(); let createdSomething = false; if (elementTypeRoll < 0.6 && (this.staticPlatformsGroup.countActive(true) + this.movingPlatformsGroup.countActive(true)) < this.config.maxObjects.platforms) { const y = Phaser.Math.Between( this.config.gameHeight - this.config.platform.maxYAboveGround, this.config.gameHeight - this.config.platform.minYAboveGround ); const platform = this.createPlatform(nextElementX, y, false); if (platform) { if (Math.random() < this.config.collectibles.spawnOnPlatformChance) this.collectiblesManager.trySpawnCollectibleOn( nextElementX, y - platform.displayHeight / 2 - 15, 'complex_platform' ); lastElementEndX = platform.getRightCenter().x; createdSomething = true; } } else if (elementTypeRoll >= 0.6 && this.pipesGroup.countActive(true) < this.config.maxObjects.pipes) { const yPipe = this.config.ground.top; const pipe = this.pipesGroup.create(nextElementX, yPipe, 'pipe').setOrigin(0.5, 1).setScale(this.config.pipe.scale).setDepth(this.config.pipe.depth).refreshBody(); if (pipe) { if (pipe.body instanceof Phaser.Physics.Arcade.StaticBody) { /* Коррекция тела трубы */ pipe.body.setSize(pipe.width*0.9, pipe.height*0.95).setOffset(pipe.width*0.05, pipe.height*0.05); pipe.refreshBody(); } lastElementEndX = pipe.getRightCenter().x; createdSomething = true; } } if (createdSomething) { currentX = nextElementX; elementCount++; } else { currentX = nextElementX + 50; lastElementEndX = Math.max(lastElementEndX, currentX); } }
         return Math.max(lastElementEndX, endX) + Phaser.Math.Between(10, 50);
    }

    private createGroundGvozdiki(baseX: number): number {
        // Логика остается прежней
        const count = Phaser.Math.Between(3, 6); const spacing = Phaser.Math.Between(40, 70); let currentX = baseX; let lastGvozdikX = baseX;
        for (let i = 0; i < count; i++) { /* ... spawn gvozdik ... */ currentX += spacing; const gvozdik = this.collectiblesManager.spawnCollectible('gvozdik', currentX, this.config.ground.top - 25); if (gvozdik) lastGvozdikX = gvozdik.x; }
        return lastGvozdikX + 40;
    }

    private createGap(startX: number): number {
        // Логика остается прежней
        const baseGapWidth = this.config.gap.baseWidth; const difficultyFactor = Math.max(0, this._currentDifficulty - 1); const maxGapWidth = Math.min( this.config.gap.maxWidth, baseGapWidth + difficultyFactor * this.config.gap.difficultyWidthFactor ); const gapWidth = Phaser.Math.Between(baseGapWidth, maxGapWidth); const nextGroundStartX = startX + gapWidth;
        this.debugLog(`[GenerateSegment] Creating Gap from ${startX.toFixed(0)} to ${nextGroundStartX.toFixed(0)} (Width: ${gapWidth.toFixed(0)})`);
        this.ensureGroundExists(nextGroundStartX + this.config.gameWidth + 200);
        return nextGroundStartX;
    }

    private createGapWithMovingPlatforms(startX: number): number {
        // Логика остается прежней
        const baseGapWidth = this.config.gap.movingPlatformBaseWidth; const difficultyFactor = Math.max(0, this._currentDifficulty - 1.5); const maxGapWidth = Math.min( this.config.gap.movingPlatformMaxWidth, baseGapWidth + difficultyFactor * this.config.gap.movingPlatformDifficultyWidthFactor ); const gapWidth = Phaser.Math.Between(baseGapWidth, maxGapWidth); const nextGroundStartX = startX + gapWidth; const platformCount = Phaser.Math.Between(this.config.gap.movingPlatformMinCount, this.config.gap.movingPlatformMaxCount); const verticalRange = this.config.platform.movingYMinDistance + difficultyFactor * 10; const moveDuration = Phaser.Math.Between(this.config.platform.movingMinDuration, this.config.platform.movingMaxDuration) / (1 + difficultyFactor * 0.1);
        this.debugLog(`[GenerateSegment] Creating Gap w/ Platforms from ${startX.toFixed(0)} to ${nextGroundStartX.toFixed(0)} (Width: ${gapWidth.toFixed(0)}, Count: ${platformCount})`);
        for (let i = 0; i < platformCount; i++) { /* ... create moving platform, maybe firestick/collectible ... */ const platformX = startX + (gapWidth / (platformCount + 1)) * (i + 1) + Phaser.Math.Between(-20, 20); const platformY = Phaser.Math.Between( this.config.gameHeight - this.config.platform.maxYAboveGround + 50, this.config.gameHeight - this.config.platform.minYAboveGround - 50 ); const platform = this.createPlatform(platformX, platformY, true); if (!platform) continue; this.scene.tweens.add({ targets: platform, y: platform.y + (Math.random() < 0.5 ? verticalRange : -verticalRange), duration: moveDuration / 2, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: i * (moveDuration / platformCount * 0.7) }); const fireStickChance = this.config.hazards.fireStick.chanceOnMoving + difficultyFactor * 0.1; if (Math.random() < fireStickChance) { this.addFireStickToPlatform(platform); } else { if (Math.random() < this.config.collectibles.spawnOnPlatformChance * 0.8) { this.collectiblesManager.trySpawnCollectibleOn( platformX, platformY - platform.displayHeight / 2 - 15, 'moving_platform_gap' ); } } }
        this.ensureGroundExists(nextGroundStartX + this.config.gameWidth + 200);
        return nextGroundStartX;
    }

    private addFireStickToPlatform(platform: Phaser.Physics.Arcade.Image) {
         // Логика остается прежней
         if (!this.scene.textures.exists('fire_palka')) { console.warn("Texture 'fire_palka' missing!"); return; }
         const stickOffsetY = -this.config.hazards.fireStick.offset;
         const fireStick = this.scene.add.sprite(platform.x, platform.y + stickOffsetY, 'fire_palka').setOrigin(0.5, 1).setScale(this.config.hazards.fireStick.scale).setDepth(platform.depth + 1);
         fireStick.setDataEnabled(); fireStick.setData('parentPlatform', platform); fireStick.setData('offsetY', stickOffsetY);
         this.fireSticksSprites.push(fireStick);
         this.scene.tweens.add({ targets: fireStick, angle: 360, duration: Phaser.Math.Between(this.config.hazards.fireStick.minRotationSpeed, this.config.hazards.fireStick.maxRotationSpeed), repeat: -1, ease: 'Linear' });
    }

    private updateFireSticks() {
         // Логика остается прежней
         for (let i = this.fireSticksSprites.length - 1; i >= 0; i--) { const stick = this.fireSticksSprites[i]; if (!stick?.active) { this.fireSticksSprites.splice(i, 1); continue; } const parentPlatform = stick.getData('parentPlatform') as Phaser.Physics.Arcade.Image; const offsetY = stick.getData('offsetY') as number ?? 0; if (!parentPlatform || !parentPlatform.active) { this.scene.tweens.killTweensOf(stick); stick.destroy(); this.fireSticksSprites.splice(i, 1); } else { stick.setPosition(parentPlatform.x, parentPlatform.y + offsetY); } }
    }

    private debugLog(message: string) { if (this.isDebugMode) console.log(message); }
}
