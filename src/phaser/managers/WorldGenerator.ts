import Phaser from 'phaser';
// Убедитесь, что GameConfig импортируется ПРАВИЛЬНО
import { GameConfig } from '../config/GameConfig';
import { EnemyManager } from './EnemyManager';
import { CollectiblesManager } from './CollectiblesManager';

// Константы для текстур блоков
const BLOCK_TEXTURE = 'block';
const BONUS_BLOCK_TEXTURE = 'bonus_block';
const USED_BLOCK_TEXTURE = 'used_block';
const BONUS_ITEM_TEXTURE = 'life';

export class WorldGenerator {
    private scene: Phaser.Scene;
    private config = GameConfig; // Используем импортированный GameConfig
    // Группы объектов сцены
    private groundGroup: Phaser.Physics.Arcade.StaticGroup;
    private pipesGroup: Phaser.Physics.Arcade.StaticGroup;
    private staticPlatformsGroup: Phaser.Physics.Arcade.StaticGroup;
    private movingPlatformsGroup: Phaser.Physics.Arcade.Group;
    private fireSticksGroup: Phaser.Physics.Arcade.Group;
    private flagpoleGroup: Phaser.Physics.Arcade.StaticGroup;
    private blocksGroup: Phaser.Physics.Arcade.StaticGroup;
    // Менеджеры
    private enemyManager: EnemyManager;
    private collectiblesManager: CollectiblesManager;
    // Массивы для отслеживания специфичных объектов
    private movingPlatforms: Phaser.Physics.Arcade.Image[] = [];
    private fireSticks: Phaser.GameObjects.Sprite[] = [];
    // Состояние генератора
    private flagpoleSpawned: boolean = false;
    private lastTerrainType: number = -1;
    private lastSegmentEndTime = 0;
    private lastSegmentEndX = 0;
    private furthestGroundX = 0;
    private _currentDifficulty: number = 1;
    private isDebugMode = true; // <<<--- ВКЛЮЧИТЕ ДЛЯ ЛОГОВ

    // Шаблоны генерации уровней
    private levelTemplates = {
         easy: [ { type: 0, weight: 3 }, { type: 1, weight: 4 }, { type: 2, weight: 2 }, { type: 3, weight: 1 }, { type: 5, weight: 3 }, { type: 8, weight: 2 }, { type: 9, weight: 2 } ],
         medium: [ { type: 0, weight: 2 }, { type: 1, weight: 2 }, { type: 2, weight: 3 }, { type: 3, weight: 3 }, { type: 4, weight: 2 }, { type: 5, weight: 2 }, { type: 6, weight: 1 }, { type: 8, weight: 2 }, { type: 9, weight: 3 } ],
         hard: [ { type: 0, weight: 1 }, { type: 1, weight: 1 }, { type: 2, weight: 2 }, { type: 3, weight: 2 }, { type: 4, weight: 3 }, { type: 5, weight: 1 }, { type: 6, weight: 2 }, { type: 7, weight: 3 }, { type: 8, weight: 2 }, { type: 9, weight: 3 } ]
    };

    constructor(
        scene: Phaser.Scene,
        groups: {
            ground: Phaser.Physics.Arcade.StaticGroup, pipes: Phaser.Physics.Arcade.StaticGroup,
            staticPlatforms: Phaser.Physics.Arcade.StaticGroup, movingPlatforms: Phaser.Physics.Arcade.Group,
            fireSticks: Phaser.Physics.Arcade.Group, flagpole: Phaser.Physics.Arcade.StaticGroup,
            blocks: Phaser.Physics.Arcade.StaticGroup
        },
        enemyManager: EnemyManager,
        collectiblesManager: CollectiblesManager,
        _player: Phaser.Physics.Arcade.Sprite // Параметр нужен для сигнатуры, но не используется внутри
    ) {
        this.scene = scene;
        this.groundGroup = groups.ground;
        this.pipesGroup = groups.pipes;
        this.staticPlatformsGroup = groups.staticPlatforms;
        this.movingPlatformsGroup = groups.movingPlatforms;
        this.fireSticksGroup = groups.fireSticks;
        this.flagpoleGroup = groups.flagpole;
        this.blocksGroup = groups.blocks;
        this.enemyManager = enemyManager;
        this.collectiblesManager = collectiblesManager;
        this.lastSegmentEndX = 0;
        this.furthestGroundX = 0;
        this.resetState(); // Сброс состояния при создании
        console.log("WorldGenerator initialized."); // Лог инициализации
    }

    // Сброс состояния генератора (при рестарте сцены)
    public resetState() {
        this.lastTerrainType = -1; this.lastSegmentEndX = 0; this.furthestGroundX = 0;
        this._currentDifficulty = 1; this.lastSegmentEndTime = 0;
        this.movingPlatforms = []; this.flagpoleSpawned = false;
        this.cleanupAllFireSticks(); // Очистка огненных палок
        this.debugLog('[WorldGenerator] State reset.');
    }

    // Очистка всех активных огненных палок
    private cleanupAllFireSticks() {
        this.debugLog(`[Cleanup] Cleaning up ${this.fireSticks.length} fire sticks.`);
        for (let i = this.fireSticks.length - 1; i >= 0; i--) {
            const stick = this.fireSticks[i];
            if (stick?.active) {
                this.scene.tweens.killTweensOf(stick);
                this.fireSticksGroup?.remove(stick, true, true);
            }
        }
        this.fireSticks = [];
    }

    // Обновление текущей сложности игры
    public updateDifficulty(playerX: number, playerScore: number = 0) {
        const distanceTraveled = Math.max(0, playerX - this.config.difficultyScaling.startDistance);
        const distanceDifficulty = distanceTraveled * this.config.difficultyScaling.scaleFactor;
        const scoreDifficulty = Math.max(0, playerScore * this.config.difficultyScaling.scoreFactor); // Используем scoreFactor из конфига
        this._currentDifficulty = Math.min( this.config.difficultyScaling.maxDifficulty, 1 + distanceDifficulty + scoreDifficulty );
        this.enemyManager.setCurrentDifficulty(this._currentDifficulty); // Передаем сложность менеджеру врагов
    }

    // Получение текущего значения сложности
    public getDifficultyValue(): number { return this._currentDifficulty; }

    // Выбор шаблона генерации на основе сложности
    private getTemplateForDifficulty(): { type: number, weight: number }[] {
        if (this._currentDifficulty < 2.5) return this.levelTemplates.easy;
        else if (this._currentDifficulty < 5.0) return this.levelTemplates.medium;
        else return this.levelTemplates.hard;
    }

    // Выбор следующего типа паттерна для генерации
    private selectPatternType(): number {
        const template = this.getTemplateForDifficulty();
        let totalWeight = template.reduce((sum, item) => sum + item.weight, 0);
        const lastWeightReduction = 0.6; // Уменьшение шанса повторения паттерна
        const gapCooldownReduction = 0.05; // Сильное уменьшение шанса двух пропастей подряд

        // Корректировка весов на основе последнего сгенерированного типа
        if (this.lastTerrainType !== -1) {
            const lastTypeEntry = template.find(item => item.type === this.lastTerrainType);
            if (lastTypeEntry) {
                totalWeight -= lastTypeEntry.weight * (1 - lastWeightReduction);
            }
            // Уменьшаем шанс пропастей, если последней была пропасть
            if (this.lastTerrainType === 6 || this.lastTerrainType === 7) {
                template.forEach(item => {
                    if (item.type === 6 || item.type === 7) {
                        totalWeight -= item.weight * (1 - gapCooldownReduction);
                    }
                });
            }
        }

        if (totalWeight <= 0) { // Запасной вариант, если все веса стали <= 0
             this.debugLog("[SelectPatternType] Total weight became zero, selecting random.");
             return template[Math.floor(Math.random() * template.length)].type;
        }

        let randomRoll = Math.random() * totalWeight;
        let selectedType = template[template.length - 1].type; // По умолчанию последний

        // Выбираем тип на основе веса
        for (const item of template) {
            let currentWeight = item.weight;
            if (item.type === this.lastTerrainType) { currentWeight *= lastWeightReduction; }
            if ((this.lastTerrainType === 6 || this.lastTerrainType === 7) && (item.type === 6 || item.type === 7)) { currentWeight *= gapCooldownReduction; }
            randomRoll -= currentWeight;
            if (randomRoll <= 0) {
                selectedType = item.type;
                break;
            }
        }
        return selectedType;
    }

    // Основная функция проверки и генерации мира
    public checkAndGenerate(time: number, cameraRightX: number, playerX: number) {
        const generationThreshold = cameraRightX + this.config.generationLookahead;

        // Генерация флага перед концом уровня
        if (!this.flagpoleSpawned && playerX > this.config.maxWorldDistance - this.config.gameWidth) {
            if (this.scene.textures.exists('flagpole')) {
                this.createFlagpole(this.config.maxWorldDistance - 200);
                this.flagpoleSpawned = true;
                this.debugLog(`[Flagpole] Spawned at ${this.config.maxWorldDistance - 200}`);
            } else {
                 console.warn("Texture 'flagpole' not found, cannot spawn flagpole.");
                 this.flagpoleSpawned = true; // Отмечаем, чтобы не проверять снова
            }
        }

        // Цикл генерации новых сегментов, пока они нужны
        while ( (time - this.lastSegmentEndTime > this.config.generationDelay || this.lastSegmentEndX < cameraRightX + 100) // Генерируем если время прошло ИЛИ отстаем от камеры
                && this.lastSegmentEndX < generationThreshold // Не генерируем слишком далеко вперед
                && this.lastSegmentEndX < this.config.maxWorldDistance - this.config.gameWidth ) // Не генерируем в зоне флага
        {
            this.debugLog(`[WorldGenerator] Entering generation loop. LastEndX: ${this.lastSegmentEndX.toFixed(0)}, Thresh: ${generationThreshold.toFixed(0)}`); // <-- ЛОГ 1
            const nextGenStartX = this.lastSegmentEndX + Phaser.Math.Between(this.config.gap.minWidthBetweenSegments ?? 10, this.config.gap.maxWidthBetweenSegments ?? 50); // Используем конфиг или дефолт
            let patternType: number = this.selectPatternType();
            let segmentEndX = this.lastSegmentEndX; // Значение по умолчанию

            this.debugLog(`[WorldGenerator] Selected pattern type: ${patternType} at ${nextGenStartX.toFixed(0)}`); // <-- ЛОГ 2

            try {
                // Вызов соответствующего метода создания сегмента
                switch (patternType) {
                    case 0: segmentEndX = this.createPipeWithEnemy(nextGenStartX); this.debugLog('[WorldGenerator] Called createPipeWithEnemy'); break; // <-- ЛОГ 3 (пример)
                    case 1: segmentEndX = this.createPlatformWithCollectible(nextGenStartX); this.debugLog('[WorldGenerator] Called createPlatformWithCollectible'); break;
                    case 2: segmentEndX = this.createPipeSeries(nextGenStartX); this.debugLog('[WorldGenerator] Called createPipeSeries'); break;
                    case 3: segmentEndX = this.createElevatedPlatforms(nextGenStartX); this.debugLog('[WorldGenerator] Called createElevatedPlatforms'); break;
                    case 4: segmentEndX = this.createComplexPattern(nextGenStartX); this.debugLog('[WorldGenerator] Called createComplexPattern'); break;
                    case 5: segmentEndX = this.createGroundGvozdiki(nextGenStartX); this.debugLog('[WorldGenerator] Called createGroundGvozdiki'); break;
                    case 6: segmentEndX = this.createGap(nextGenStartX); this.debugLog('[WorldGenerator] Called createGap'); break;
                    case 7: segmentEndX = this.createGapWithMovingPlatforms(nextGenStartX); this.debugLog('[WorldGenerator] Called createGapWithMovingPlatforms'); break;
                    case 8: segmentEndX = this.createStaggeredPlatforms(nextGenStartX); this.debugLog('[WorldGenerator] Called createStaggeredPlatforms'); break;
                    case 9: segmentEndX = this.createBlockRowWithBonuses(nextGenStartX); this.debugLog('[WorldGenerator] Called createBlockRowWithBonuses'); break;
                    default:
                        this.debugLog(`[GenerateSegment] Unknown pattern type: ${patternType}. Skipping.`);
                        segmentEndX = nextGenStartX + 100; // Продвигаемся немного вперед
                }
                // Защита от зависания, если сегмент не продвинул lastSegmentEndX
                if (segmentEndX <= this.lastSegmentEndX) {
                    this.debugLog(`[GenerateSegment] Pattern type ${patternType} did not advance position (Start: ${nextGenStartX.toFixed(0)}, End: ${segmentEndX.toFixed(0)}). Failsafe advance.`);
                    segmentEndX = this.lastSegmentEndX + 50; // Принудительно сдвигаем
                    patternType = -1; // Сбрасываем тип для следующей итерации
                }
            } catch (error) {
                 console.error(`[GenerateSegment] Error during pattern type ${patternType} generation:`, error);
                 segmentEndX = this.lastSegmentEndX + 100; // Продвигаемся при ошибке
                 patternType = -1;
            }

            // Обновляем состояние генератора
            this.lastSegmentEndX = Math.max(this.lastSegmentEndX, segmentEndX); // Убеждаемся, что движемся вперед
            this.lastSegmentEndTime = time;
            this.lastTerrainType = patternType;
            this.debugLog(`[GenerateSegment] Finished. Actual Type: ${patternType}, New LastEndX: ${this.lastSegmentEndX.toFixed(0)}`);
        }
        // Обновляем позицию огненных палок (они привязаны к платформам)
        this.updateFireSticks();
    }

    // Создание начального участка земли
    public createInitialGround() {
        const initialEndX = this.ensureGroundExists(this.config.gameWidth + 200); // Создаем землю немного за пределы экрана
        this.furthestGroundX = initialEndX;
        this.lastSegmentEndX = initialEndX; // Начинаем генерацию после начальной земли
        this.debugLog(`[WorldGenerator] Initial ground created up to X: ${this.furthestGroundX.toFixed(0)}`);
    }

    // Гарантирует, что земля существует до указанной X координаты
    public ensureGroundExists(targetX: number): number {
        let currentGroundEndX = this.furthestGroundX; // Начинаем с последней известной точки
        if (currentGroundEndX >= targetX) return currentGroundEndX; // Уже достаточно земли

        // Проверяем фактический край последнего тайла, если нужно (например, после очистки)
        const groundChildren = this.groundGroup.getChildren();
        if (groundChildren.length > 0) {
            const lastGroundTile = groundChildren[groundChildren.length - 1] as Phaser.Physics.Arcade.Image;
            if (lastGroundTile?.active && typeof lastGroundTile.x === 'number') {
                 const tileWidth = lastGroundTile.displayWidth ?? this.config.ground.width;
                 const originFactor = lastGroundTile.originX ?? 0.5;
                 currentGroundEndX = Math.max(currentGroundEndX, lastGroundTile.x + tileWidth * (1 - originFactor));
            }
        } else {
            currentGroundEndX = 0; // Если земли нет, начинаем с нуля
        }

        let addedTiles = 0;
        const maxTiles = this.config.maxObjects.ground;
        const worldLimit = this.config.maxWorldDistance;

        // Добавляем тайлы, пока не достигнем цели или лимитов
        while (currentGroundEndX < targetX && this.groundGroup.countActive(true) < maxTiles && currentGroundEndX < worldLimit) {
            const tileWidth = this.config.ground.width; // Предполагаем одинаковую ширину
            const nextTileCenterX = currentGroundEndX + (tileWidth / 2);
            const newGround = this.groundGroup.create(
                nextTileCenterX,
                this.config.ground.top + this.config.ground.height / 2, // Центрируем по Y
                'ground'
            ).setDepth(this.config.ground.depth).refreshBody();

            if (!newGround) { console.error('[EnsureGroundExists] Failed to create a ground tile!'); break; }

            currentGroundEndX = newGround.x + (newGround.displayWidth ?? tileWidth) * (1 - (newGround.originX ?? 0.5)); // Обновляем край
            addedTiles++;
        }
        if (addedTiles > 0) {
            this.debugLog(`[EnsureGroundExists] Added ${addedTiles} ground tiles. New End X: ${currentGroundEndX.toFixed(0)}`);
        }
        this.furthestGroundX = Math.max(this.furthestGroundX, currentGroundEndX); // Обновляем самую дальнюю точку
        return this.furthestGroundX;
    }

    // --- Методы Создания Сегментов ---

    private createFlagpole(x: number): Phaser.Physics.Arcade.Sprite | null {
        // ... (код без изменений) ...
        if (this.flagpoleGroup.countActive(true) > 0 || !this.scene.textures.exists('flagpole')) return null;
        const flagpole = this.flagpoleGroup.create(x, this.config.ground.top, 'flagpole')
            .setOrigin(0.5, 1).setScale(0.5).setDepth(this.config.pipe.depth).refreshBody();
        if (flagpole && flagpole.body instanceof Phaser.Physics.Arcade.StaticBody) {
            const bodyWidth = flagpole.width * 0.2; const bodyHeight = flagpole.height * 0.9;
            flagpole.body.setSize(bodyWidth, bodyHeight);
            flagpole.body.setOffset( flagpole.width * (0.5 - 0.1), flagpole.height * 0.1 );
            flagpole.refreshBody();
        }
        return flagpole;
    }

    private createBlockRowWithBonuses(startX: number): number {
        // ... (код без изменений) ...
        const blockCount = Phaser.Math.Between(this.config.blocks.minCount, this.config.blocks.maxCount);
        const blockSpacing = this.config.blocks.spacing;
        const yPos = this.config.ground.top - this.config.blocks.heightAboveGround;
        if (!this.scene.textures.exists(BLOCK_TEXTURE) || !this.scene.textures.exists(BONUS_BLOCK_TEXTURE)) {
            console.warn(`[WorldGenerator] Block textures missing. Skipping block row.`); return startX + 100;
        }
        let lastBlockEndX = startX;
        for (let i = 0; i < blockCount; i++) {
            if (this.blocksGroup.countActive(true) >= this.config.maxObjects.blocks) { this.debugLog("[WorldGenerator] Max blocks reached."); break; }
            const xPos = startX + i * blockSpacing;
            const isBonus = Math.random() < this.config.blocks.bonusChance;
            const texture = isBonus ? BONUS_BLOCK_TEXTURE : BLOCK_TEXTURE;
            const block = this.blocksGroup.create(xPos, yPos, texture).setOrigin(0, 0.5).setDepth(this.config.blocks.depth).setScale(this.config.blocks.scale).refreshBody();
            block.setData('isBonus', isBonus); block.setData('used', false);
            lastBlockEndX = block.x + block.displayWidth;
        }
        return lastBlockEndX + Phaser.Math.Between(10, 30);
    }

    public handlePlayerBlockHit(player: Phaser.Physics.Arcade.Sprite, block: Phaser.GameObjects.GameObject) {
        // ... (код без изменений) ...
        if (!(block instanceof Phaser.Physics.Arcade.Sprite) || !block.body || !block.getData || !player || !player.body) return;
        const blockSprite = block as Phaser.Physics.Arcade.Sprite & { body: Phaser.Physics.Arcade.StaticBody };
        if (player.body.velocity.y < 0 && !blockSprite.getData('used')) {
            const playerBounds = player.getBounds(); const blockBounds = blockSprite.getBounds();
            const verticalOverlap = playerBounds.bottom - blockBounds.top;
            const horizontalOverlap = Phaser.Geom.Rectangle.Intersection(playerBounds, blockBounds).width;
            if (verticalOverlap > 5 && playerBounds.top < blockBounds.bottom && horizontalOverlap > playerBounds.width * 0.3) {
                this.debugLog("Block hit!"); blockSprite.setData('used', true); const isBonus = blockSprite.getData('isBonus');
                if (this.scene.textures.exists(USED_BLOCK_TEXTURE)) { blockSprite.setTexture(USED_BLOCK_TEXTURE); }
                if (isBonus) {
                    this.debugLog("Bonus block!");
                    if (this.scene.textures.exists(BONUS_ITEM_TEXTURE)) {
                        const bonusItem = this.scene.physics.add.image(blockSprite.getCenter().x, blockSprite.y, BONUS_ITEM_TEXTURE).setDepth(blockSprite.depth + 1).setScale(this.config.collectibles.bonusItemScale);
                        bonusItem.setVelocityY(this.config.collectibles.bonusItemVelocityY); (bonusItem.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
                        this.scene.tweens.add({ targets: bonusItem, y: bonusItem.y - this.config.collectibles.bonusItemFlyHeight, alpha: 0, duration: this.config.collectibles.bonusItemDuration, ease: 'Power1', onComplete: () => bonusItem.destroy() });
                        this.scene.events.emit('bonusCollected', 'life'); this.debugLog("Emitted 'bonusCollected' (life)");
                    } else { console.warn(`[WorldGenerator] Bonus item texture '${BONUS_ITEM_TEXTURE}' missing.`); }
                }
                this.scene.tweens.add({ targets: blockSprite, y: blockSprite.y - this.config.blocks.bumpHeight, yoyo: true, duration: this.config.blocks.bumpDuration, ease: 'Sine.easeInOut' });
                this.scene.events.emit('requestSoundPlay', isBonus ? 'blockBonus' : 'blockHit');
            }
        }
    }

    private createPipeWithEnemy(baseX: number): number {
        if (this.pipesGroup.countActive(true) >= this.config.maxObjects.pipes) return baseX + 50;
        const x = baseX + Phaser.Math.Between(50, 100);
        const pipe = this.pipesGroup.create(x, this.config.ground.top, 'pipe').setOrigin(0.5, 1).setScale(this.config.pipe.scale).setDepth(this.config.pipe.depth).refreshBody();
        if (!pipe) return baseX + 50;

        // Логика спавна врага
        const enemyChance = this.config.enemy.pipeSpawnBaseChance + (this._currentDifficulty - 1) * this.config.enemy.pipeSpawnDifficultyFactor; // Учитываем сложность
        const roll = Math.random();
        this.debugLog(`[WorldGenerator createPipeWithEnemy] Chance check: Roll ${roll.toFixed(2)} < ${enemyChance.toFixed(2)}?`); // <-- ЛОГ 4
        if (roll < enemyChance) {
            this.debugLog(`[WorldGenerator createPipeWithEnemy] ---> Trying to SPAWN ENEMY near ${x.toFixed(0)}`); // <-- ЛОГ 5
            this.enemyManager.trySpawnEnemyNear(x, 'pipe'); // Передаем контекст 'pipe'
        }
        return x + (pipe.displayWidth ?? this.config.pipe.width ?? 50) * 0.5; // Примерная ширина если displayWidth недоступен
    }

    private createPlatform(x: number, y: number, isMoving = false): Phaser.Physics.Arcade.Image | null {
        // ... (код без изменений) ...
        const targetGroup = isMoving ? this.movingPlatformsGroup : this.staticPlatformsGroup;
        const totalPlatforms = this.staticPlatformsGroup.countActive(true) + this.movingPlatformsGroup.countActive(true);
        if (totalPlatforms >= this.config.maxObjects.platforms) { this.debugLog("Max platforms reached."); return null; }
        const platform = targetGroup.create(x, y, 'platform').setScale(this.config.platform.scale).setDepth(this.config.platform.depth).refreshBody();
        if (platform && isMoving && platform.body instanceof Phaser.Physics.Arcade.Body) {
            platform.body.setImmovable(true).setAllowGravity(false); this.movingPlatforms.push(platform);
        } else if (!platform) { console.error("Failed to create platform."); return null; }
        return platform;
    }

    private createPlatformWithCollectible(baseX: number): number {
        // ... (код без изменений) ...
        const x = baseX + Phaser.Math.Between(80, 150);
        const y = Phaser.Math.Between( this.config.gameHeight - this.config.platform.maxYAboveGround, this.config.gameHeight - this.config.platform.minYAboveGround );
        const platform = this.createPlatform(x, y, false); if (!platform) return baseX + 50;
        if (Math.random() < this.config.collectibles.spawnOnPlatformChance) { this.collectiblesManager.trySpawnCollectibleOn( x, y - platform.displayHeight / 2 - 15, 'platform' ); }
        const platformWidth = platform.displayWidth ?? 0; return platform.x + platformWidth * (1 - platform.originX);
    }

    private createPipeSeries(baseX: number): number {
        const count = Phaser.Math.Between(2, Math.min(5, 2 + Math.floor(this._currentDifficulty)));
        if (this.pipesGroup.countActive(true) + count > this.config.maxObjects.pipes) return baseX + 50;
        const spacing = Phaser.Math.Between(this.config.pipe.seriesMinSpacing, this.config.pipe.seriesMaxSpacing);
        let currentX = baseX; let lastPipeEndX = baseX;
        for (let i = 0; i < count; i++) {
            currentX += spacing + Phaser.Math.Between(-10, 10);
            const pipe = this.pipesGroup.create(currentX, this.config.ground.top, 'pipe').setOrigin(0.5, 1).setScale(this.config.pipe.scale).setDepth(this.config.pipe.depth).refreshBody();
            if (!pipe) continue; lastPipeEndX = pipe.x + (pipe.displayWidth ?? 50) * 0.5;
        }
        // Логика спавна врага
        const enemyChance = this.config.enemy.pipeSeriesSpawnBaseChance + (this._currentDifficulty - 1) * this.config.enemy.pipeSeriesSpawnDifficultyFactor;
        const roll = Math.random();
        this.debugLog(`[WorldGenerator createPipeSeries] Chance check: Roll ${roll.toFixed(2)} < ${enemyChance.toFixed(2)}?`); // <-- ЛОГ
        if (roll < enemyChance) {
            const spawnX = baseX + (lastPipeEndX - baseX) * Phaser.Math.FloatBetween(0.3, 0.7);
            this.debugLog(`[WorldGenerator createPipeSeries] ---> Trying to SPAWN ENEMY near ${spawnX.toFixed(0)}`); // <-- ЛОГ
            this.enemyManager.trySpawnEnemyNear(spawnX, 'pipe_series');
        }
        return lastPipeEndX;
    }

    private createElevatedPlatforms(baseX: number): number {
        // ... (логика создания платформ без изменений) ...
        const count = Phaser.Math.Between(2, Math.min(4, 2 + Math.floor(this._currentDifficulty * 0.8)));
        const totalPlatforms = this.staticPlatformsGroup.countActive(true) + this.movingPlatformsGroup.countActive(true);
        if (totalPlatforms + count > this.config.maxObjects.platforms) return baseX + 50;
        const spacingX = Phaser.Math.Between(this.config.platform.elevatedMinSpacingX, this.config.platform.elevatedMaxSpacingX);
        const spacingYRange = this.config.platform.elevatedYVariation;
        let currentX = baseX; let lastY = Phaser.Math.Between( this.config.gameHeight - this.config.platform.maxYAboveGround, this.config.gameHeight - this.config.platform.minYAboveGround );
        let lastPlatformEndX = baseX;
        for (let i = 0; i < count; i++) {
            currentX += spacingX + Phaser.Math.Between(-20, 20);
            lastY = Phaser.Math.Clamp( lastY + Phaser.Math.Between(-spacingYRange, spacingYRange), this.config.gameHeight - this.config.platform.maxYAboveGround, this.config.gameHeight - this.config.platform.minYAboveGround );
            const platform = this.createPlatform(currentX, lastY, false); if (!platform) continue;
            if (Math.random() < this.config.collectibles.spawnOnPlatformChance) { this.collectiblesManager.trySpawnCollectibleOn( currentX, lastY - platform.displayHeight / 2 - 15, 'elevated_platform' ); }
            const platformWidth = platform.displayWidth ?? 0; lastPlatformEndX = platform.x + platformWidth * (1 - platform.originX);
        }

        // Логика спавна врага
        const enemyChance = this.config.enemy.elevatedSpawnBaseChance + (this._currentDifficulty -1) * this.config.enemy.elevatedSpawnDifficultyFactor;
        const roll = Math.random();
        this.debugLog(`[WorldGenerator createElevatedPlatforms] Chance check: Roll ${roll.toFixed(2)} < ${enemyChance.toFixed(2)}?`); // <-- ЛОГ
        if (roll < enemyChance) {
            const spawnX = baseX + (lastPlatformEndX - baseX) * Phaser.Math.FloatBetween(0.4, 0.8);
             this.debugLog(`[WorldGenerator createElevatedPlatforms] ---> Trying to SPAWN ENEMY near ${spawnX.toFixed(0)}`); // <-- ЛОГ
            this.enemyManager.trySpawnEnemyNear(spawnX, 'elevated_platform_series');
        }
        return lastPlatformEndX;
    }

    private createStaggeredPlatforms(baseX: number): number {
        // ... (код создания платформ без изменений) ...
        const count = Phaser.Math.Between(3, 5);
        const totalPlatforms = this.staticPlatformsGroup.countActive(true) + this.movingPlatformsGroup.countActive(true);
        if (totalPlatforms + count > this.config.maxObjects.platforms) return baseX + 50;
        const spacingX = Phaser.Math.Between(100, 150); let currentX = baseX;
        let lastY = Phaser.Math.Between( this.config.gameHeight - this.config.platform.maxYAboveGround, this.config.gameHeight - this.config.platform.minYAboveGround );
        let lastPlatformEndX = baseX; let direction = Math.random() < 0.5 ? 1 : -1; const yStep = Phaser.Math.Between(40, 80);
        for (let i = 0; i < count; i++) {
            currentX += spacingX + Phaser.Math.Between(-10, 10);
            lastY = Phaser.Math.Clamp( lastY + (direction * yStep), this.config.gameHeight - this.config.platform.maxYAboveGround, this.config.gameHeight - this.config.platform.minYAboveGround );
            const isMoving = Math.random() < this.config.platform.staggeredMovingChance && i > 0;
            const platform = this.createPlatform(currentX, lastY, isMoving); if (!platform) continue;
            if (isMoving) {
                const moveDistance = Phaser.Math.Between(this.config.platform.movingYMinDistance, this.config.platform.movingYMaxDistance);
                const duration = Phaser.Math.Between(this.config.platform.movingMinDuration, this.config.platform.movingMaxDuration);
                this.scene.tweens.add({ targets: platform, y: platform.y + (Math.random() < 0.5 ? moveDistance : -moveDistance), duration: duration, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: i * 200 });
                if (Math.random() < this.config.hazards.fireStick.chanceOnMoving) { this.addFireStickToPlatform(platform); }
                else if (Math.random() < this.config.collectibles.spawnOnPlatformChance * 0.5) { this.collectiblesManager.trySpawnCollectibleOn( currentX, lastY - platform.displayHeight / 2 - 15, 'staggered_platform_moving' ); }
            } else {
                if (Math.random() < this.config.collectibles.spawnOnPlatformChance) { this.collectiblesManager.trySpawnCollectibleOn( currentX, lastY - platform.displayHeight / 2 - 15, 'staggered_platform_static' ); }
            }
            direction *= -1; const platformWidth = platform.displayWidth ?? 0; lastPlatformEndX = platform.x + platformWidth * (1 - platform.originX);
        }
         // Добавим небольшой шанс спавна врага и здесь
         if (Math.random() < 0.15 * this._currentDifficulty) { // Простой шанс, зависящий от сложности
             const spawnX = baseX + (lastPlatformEndX - baseX) * Phaser.Math.FloatBetween(0.2, 0.8);
             this.debugLog(`[WorldGenerator createStaggeredPlatforms] ---> Trying to SPAWN ENEMY near ${spawnX.toFixed(0)}`); // <-- ЛОГ
             this.enemyManager.trySpawnEnemyNear(spawnX, 'staggered_platforms');
         }
        return lastPlatformEndX;
    }

    private createComplexPattern(baseX: number): number {
         // ... (код создания элементов без изменений) ...
        let currentX = baseX; const segmentLength = Phaser.Math.Between(400, 600); const endX = baseX + segmentLength;
        let lastElementEndX = baseX; let elementCount = 0; const maxElements = 8;
        while (currentX < endX && elementCount < maxElements) {
            const nextElementX = currentX + Phaser.Math.Between(80, 150); if (nextElementX >= endX) break;
            const elementTypeRoll = Math.random(); let createdSomething = false;
            if (elementTypeRoll < 0.6 && (this.staticPlatformsGroup.countActive(true) + this.movingPlatformsGroup.countActive(true)) < this.config.maxObjects.platforms) {
                const y = Phaser.Math.Between( this.config.gameHeight - this.config.platform.maxYAboveGround, this.config.gameHeight - this.config.platform.minYAboveGround );
                const platform = this.createPlatform(nextElementX, y, false);
                if (platform) { if (Math.random() < this.config.collectibles.spawnOnPlatformChance) { this.collectiblesManager.trySpawnCollectibleOn( nextElementX, y - platform.displayHeight / 2 - 15, 'complex_platform' ); }
                     const platformWidth = platform.displayWidth ?? 0; lastElementEndX = platform.x + platformWidth * (1 - platform.originX); createdSomething = true;
                }
            } else if (elementTypeRoll >= 0.6 && this.pipesGroup.countActive(true) < this.config.maxObjects.pipes) {
                 const pipe = this.pipesGroup.create(nextElementX, this.config.ground.top, 'pipe').setOrigin(0.5, 1).setScale(this.config.pipe.scale).setDepth(this.config.pipe.depth).refreshBody();
                 if (pipe) { lastElementEndX = pipe.x + (pipe.displayWidth ?? 50) * 0.5; createdSomething = true; }
            }
            if (createdSomething) { currentX = nextElementX; elementCount++; }
            else { currentX = nextElementX + 50; lastElementEndX = Math.max(lastElementEndX, currentX); }
        }

        // Логика спавна врагов (здесь она уже была)
        const enemyCount = Phaser.Math.Between(1, Math.min(3, 1 + Math.floor(this._currentDifficulty * 0.5)));
        this.debugLog(`[WorldGenerator createComplexPattern] Attempting to spawn ${enemyCount} enemies.`); // <-- ЛОГ
        for (let i = 0; i < enemyCount; i++) {
             const spawnX = baseX + Phaser.Math.Between(50, Math.max(50, lastElementEndX - baseX - 50));
              this.debugLog(`[WorldGenerator createComplexPattern] ---> Trying to SPAWN ENEMY ${i+1} near ${spawnX.toFixed(0)}`); // <-- ЛОГ
             this.enemyManager.trySpawnEnemyNear(spawnX, 'complex');
        }
        return Math.max(lastElementEndX, endX);
    }

    private createGroundGvozdiki(baseX: number): number {
        // ... (код без изменений, враги здесь не спавнятся) ...
        const count = Phaser.Math.Between(3, 6); const spacing = Phaser.Math.Between(40, 70); let currentX = baseX; let lastGvozdikX = baseX;
        for (let i = 0; i < count; i++) {
            currentX += spacing; const gvozdik = this.collectiblesManager.spawnCollectible('gvozdik', currentX, this.config.ground.top - 20);
            if (gvozdik) { lastGvozdikX = gvozdik.x; }
        } return lastGvozdikX + 20;
    }

    private createGap(startX: number): number {
         // ... (код без изменений, враги здесь не спавнятся) ...
        const baseGapWidth = this.config.gap.baseWidth; const difficultyFactor = Math.max(0, this._currentDifficulty - 1);
        const maxGapWidth = Math.min( this.config.gap.maxWidth, baseGapWidth + difficultyFactor * this.config.gap.difficultyWidthFactor );
        const gapWidth = Phaser.Math.Between(baseGapWidth, maxGapWidth); const nextGroundStartX = startX + gapWidth;
        this.debugLog(`[GenerateSegment] Creating Gap from ${startX.toFixed(0)} to ${nextGroundStartX.toFixed(0)} (Width: ${gapWidth.toFixed(0)})`);
        this.ensureGroundExists(nextGroundStartX + this.config.gameWidth); return nextGroundStartX;
    }

    private createGapWithMovingPlatforms(startX: number): number {
        // ... (код создания платформ без изменений) ...
        const baseGapWidth = this.config.gap.movingPlatformBaseWidth; const difficultyFactor = Math.max(0, this._currentDifficulty - 1.5);
        const maxGapWidth = Math.min( this.config.gap.movingPlatformMaxWidth, baseGapWidth + difficultyFactor * this.config.gap.movingPlatformDifficultyWidthFactor );
        const gapWidth = Phaser.Math.Between(baseGapWidth, maxGapWidth); const nextGroundStartX = startX + gapWidth;
        const platformCount = Phaser.Math.Between(this.config.gap.movingPlatformMinCount, this.config.gap.movingPlatformMaxCount);
        const verticalRange = this.config.platform.movingYMinDistance + difficultyFactor * 10;
        const moveDuration = Phaser.Math.Between(this.config.platform.movingMinDuration, this.config.platform.movingMaxDuration) / (1 + difficultyFactor * 0.1);
        this.debugLog(`[GenerateSegment] Creating Gap w/ Platforms from ${startX.toFixed(0)} to ${nextGroundStartX.toFixed(0)} (Width: ${gapWidth.toFixed(0)}, Count: ${platformCount})`);
        for (let i = 0; i < platformCount; i++) {
             const platformX = startX + (gapWidth / (platformCount + 1)) * (i + 1) + Phaser.Math.Between(-20, 20);
             const platformY = Phaser.Math.Between( this.config.gameHeight - this.config.platform.maxYAboveGround + 50, this.config.gameHeight - this.config.platform.minYAboveGround - 50 );
             const platform = this.createPlatform(platformX, platformY, true); if (!platform) continue;
             this.scene.tweens.add({ targets: platform, y: platform.y + (Math.random() < 0.5 ? verticalRange : -verticalRange), duration: moveDuration / 2, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: i * (moveDuration / platformCount * 0.7) });
             const fireStickChance = this.config.hazards.fireStick.chanceOnMoving + difficultyFactor * 0.1;
             if (Math.random() < fireStickChance) { this.addFireStickToPlatform(platform); }
             else { if (Math.random() < this.config.collectibles.spawnOnPlatformChance * 0.8) { this.collectiblesManager.trySpawnCollectibleOn( platformX, platformY - platform.displayHeight / 2 - 15, 'moving_platform' ); } }
        }
        this.ensureGroundExists(nextGroundStartX + this.config.gameWidth);

        // Добавим шанс спавна врага (например, ЗИЛа) в конце этой секции
        if (Math.random() < 0.2 * this._currentDifficulty) { // Простой шанс
             this.debugLog(`[WorldGenerator createGapWithMovingPlatforms] ---> Trying to SPAWN ENEMY near ${nextGroundStartX + 50}`); // <-- ЛОГ
             this.enemyManager.trySpawnEnemyNear(nextGroundStartX + 50, 'gap_moving_end'); // Контекст конца разрыва
        }

        return nextGroundStartX;
    }

    private addFireStickToPlatform(platform: Phaser.Physics.Arcade.Image) {
        // ... (код без изменений) ...
         if (!this.scene.textures.exists('fire_palka') || this.fireSticksGroup.countActive(true) >= this.config.maxObjects.fireSticks) {
             if (!this.scene.textures.exists('fire_palka')) console.warn("Texture 'fire_palka' missing!"); return;
         }
         const stickOffsetY = -platform.displayHeight * platform.originY - this.config.hazards.fireStick.offset;
         const fireStick = this.scene.add.sprite(platform.x, platform.y + stickOffsetY, 'fire_palka').setOrigin(0.5, 1).setScale(this.config.hazards.fireStick.scale).setDepth(platform.depth + 1);
         this.fireSticksGroup.add(fireStick); fireStick.setDataEnabled(); fireStick.setData('parentPlatform', platform); fireStick.setData('offsetY', stickOffsetY);
         this.fireSticks.push(fireStick);
         this.scene.tweens.add({ targets: fireStick, angle: 360, duration: Phaser.Math.Between(this.config.hazards.fireStick.minRotationSpeed, this.config.hazards.fireStick.maxRotationSpeed), repeat: -1, ease: 'Linear' });
    }

    private updateFireSticks() {
        // ... (код без изменений) ...
         this.fireSticks = this.fireSticks.filter(stick => {
             if (!stick.active) return false;
             const parentPlatform = stick.getData('parentPlatform') as Phaser.Physics.Arcade.Image; const offsetY = stick.getData('offsetY') as number ?? 0;
             if (!parentPlatform || !parentPlatform.active) { this.scene.tweens.killTweensOf(stick); this.fireSticksGroup?.remove(stick, true, true); return false; }
             stick.setPosition(parentPlatform.x, parentPlatform.y + offsetY); return true;
         });
    }

    // Вывод логов в консоль, если включен режим отладки
    private debugLog(message: string) {
        if (this.isDebugMode) {
            console.log(message);
        }
    }
}