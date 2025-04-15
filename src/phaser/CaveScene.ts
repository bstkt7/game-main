// src/phaser/CaveScene.ts
import Phaser from 'phaser';
import { SceneKeys, GameConfig } from './config/GameConfig';
import { PlayerController } from './managers/PlayerController';
import { WorldGenerator } from './managers/WorldGenerator';
import { EnemyManager } from './managers/EnemyManager';
import { CollectiblesManager } from './managers/CollectiblesManager';
import { CollisionManager } from './managers/CollisionManager';
import { CutsceneManager } from './managers/CutsceneManager';
import { UIManager } from './managers/UIManager';

export class CaveScene extends Phaser.Scene {
    // Managers
    private playerController!: PlayerController;
    private worldGenerator!: WorldGenerator;
    private enemyManager!: EnemyManager;
    private collectiblesManager!: CollectiblesManager;
    private collisionManager!: CollisionManager;
    private cutsceneManager!: CutsceneManager;
    private uiManager!: UIManager;
    // Game Objects
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private background!: Phaser.GameObjects.TileSprite;
    private topBar!: Phaser.GameObjects.Rectangle;
    private bottomBar!: Phaser.GameObjects.Rectangle;
    private music!: Phaser.Sound.BaseSound;
    private sounds: { [key: string]: Phaser.Sound.BaseSound } = {};
    // УБРАНО: staticClouds
    private fireStickSprites: Phaser.GameObjects.Sprite[] = [];
    // Groups
    private groundGroup!: Phaser.Physics.Arcade.StaticGroup;
    private pipesGroup!: Phaser.Physics.Arcade.StaticGroup;
    private staticPlatformsGroup!: Phaser.Physics.Arcade.StaticGroup;
    private movingPlatformsGroup!: Phaser.Physics.Arcade.Group;
    private blocksGroup!: Phaser.Physics.Arcade.StaticGroup;
    private flagpoleGroup!: Phaser.Physics.Arcade.StaticGroup;
    private zilsGroup!: Phaser.Physics.Arcade.Group;
    private cruzaksGroup!: Phaser.Physics.Arcade.Group;
    private dogsGroup!: Phaser.Physics.Arcade.Group;
    private poopsGroup!: Phaser.Physics.Arcade.Group;
    private meteorsGroup!: Phaser.Physics.Arcade.Group;
    private gvozdikiGroup!: Phaser.Physics.Arcade.Group;
    private moneyGroup!: Phaser.Physics.Arcade.Group;
    // State
    private isGameOver = false;
    private isMuted: boolean = false;
    private lastCleanupTime = 0;
    private currentLives = GameConfig.player.initialLives;

    // Обработчик удара по блоку
    public handleBlockHit(block: Phaser.GameObjects.Sprite) {
        if (!block.getData('used')) {
            block.setData('used', true);
            this.playSound('blockHit');
            if (this.textures.exists('used_block')) {
                block.setTexture('used_block');
            }
            const isBonus = block.getData('isBonus');
            if (isBonus && this.textures.exists('life')) {
                this.playSound('blockBonus');
                const bonusItem = this.physics.add.image(block.getCenter().x, block.y - block.displayHeight / 2, 'life')
                    .setDepth(block.depth + 1).setScale(GameConfig.collectibles.bonusItemScale);
                // Проверка на существование body перед установкой свойств
                if (bonusItem.body instanceof Phaser.Physics.Arcade.Body) {
                    bonusItem.body.setAllowGravity(false);
                    bonusItem.setVelocityY(GameConfig.collectibles.bonusItemVelocityY);
                    this.tweens.add({ targets: bonusItem, y: bonusItem.y - GameConfig.collectibles.bonusItemFlyHeight, alpha: 0, duration: GameConfig.collectibles.bonusItemDuration, ease: 'Power1', onComplete: () => bonusItem.destroy() });
                    this.events.emit('bonusCollected', 'life');
                } else {
                     console.warn("Bonus item created without physics body.");
                     bonusItem.destroy(); // Удаляем, если нет тела
                }
            }
        }
    }

    constructor() { super({ key: 'CaveScene' }); }

    init(data: { muted?: boolean, lives?: number }) {
        this.isMuted = data.muted ?? false;
        this.currentLives = data.lives ?? GameConfig.player.initialLives;
        this.isGameOver = false;
        this.lastCleanupTime = 0;
        this.registry.set('gvozdikiCollected', 0);
        this.registry.set('lives', this.currentLives);
        this.registry.set('isCutscenePlaying', false);
        this.fireStickSprites = [];
        console.log('CaveScene init. Muted:', this.isMuted, 'Lives:', this.currentLives);
    }

    preload() {
        console.log('CaveScene Preload starting...');
        try {
            // Пути к фону и земле
            this.load.image('cave_background', `/assets/gvozd/lvl2/cave_bg.png`);
            this.load.image('cave_ground', `/assets/gvozd/lvl2/cave_ground.png`);
            // УБРАНО: Загрузка облаков

            // --- Остальные ассеты ---
            this.load.image('pipe', `/assets/gvozd/lvl2/cave_pipe.png`);
            this.load.image('platform', `/assets/gvozd/lvl2/cave_platform.png`);
            this.load.image('flagpole', `/assets/gvozd/flagpole.png`);
            this.load.image('gvozdik', `/assets/gvozd/gvozdik.png`);
            this.load.image('money', `/assets/gvozd/money.png`);
            this.load.image('life', `/assets/gvozd/life.png`);
            this.load.image('zil', `/assets/gvozd/lvl2/cave_zil.png`);
            this.load.image('zil_fast', `/assets/gvozd/lvl2/cave_zil.png`);
            this.load.image('zil_big', `/assets/gvozd/lvl2/cave_zil.png`);
            this.load.image('cruzak', `/assets/gvozd/cruzak.png`);
            this.load.image('poop', `/assets/gvozd/poop.png`);
            this.load.image('meteor', `/assets/gvozd/meteor.png`); // Убрать, если метеоров нет
            this.load.image('fire_palka', `/assets/gvozd/fire_palka.png`);
            for (let i = 1; i <= 4; i++) { this.load.image(`r${i}`, `/assets/gvozd/r${i}.png`); }
            for (let i = 1; i <= 4; i++) { this.load.image(`j${i}`, `/assets/gvozd/j${i}.png`); }
            for (let i = 1; i <= 4; i++) { this.load.image(`i${i}`, `/assets/gvozd/i${i}.png`); }
            for (let i = 1; i <= 4; i++) { this.load.image(`d${i}`, `/assets/gvozd/d${i}.png`); }
            this.load.image('block', `/assets/gvozd/lvl2/cave_block.png`);
            this.load.image('bonus_block', `/assets/gvozd/lvl2/cave_bonus_block.png`);
            this.load.image('used_block', `/assets/gvozd/lvl2/cave_used_block.png`);
            // Ассеты катсцены можно убрать, если ее нет в пещере
            this.load.image('babka', `/assets/gvozd/babka.png`);
            this.load.image('photo', `/assets/gvozd/photo.png`);
            this.load.image('gramota', `/assets/gvozd/gramota.png`);

            // Audio
            this.load.audio('bgm_cave', [`/assets/gvozd/cave_music.mp3`, `/assets/gvozd/cave_music.ogg`]); // Новая музыка
            // Остальные звуки
            this.load.audio('collect', [`/assets/gvozd/collect.wav`, `/assets/gvozd/collect.mp3`]);
            this.load.audio('jump', [`/assets/gvozd/jump.wav`, `/assets/gvozd/jump.mp3`]);
            this.load.audio('playerDamage', [`/assets/gvozd/player_damage.wav`, `/assets/gvozd/player_damage.mp3`]);
            this.load.audio('enemyStomp', [`/assets/gvozd/enemy_stomp.wav`, `/assets/gvozd/enemy_stomp.mp3`]);
            this.load.audio('blockHit', [`/assets/gvozd/block_hit.wav`, `/assets/gvozd/block_hit.mp3`]);
            this.load.audio('blockBonus', [`/assets/gvozd/block_bonus.wav`, `/assets/gvozd/block_bonus.mp3`]);
            this.load.audio('powerUp', [`/assets/gvozd/power_up.wav`, `/assets/gvozd/power_up.mp3`]);
            this.load.audio('powerDown', [`/assets/gvozd/power_down.wav`, `/assets/gvozd/power_down.mp3`]);
            this.load.audio('zil_death', [`/assets/gvozd/zil_death.wav`, `/assets/gvozd/zil_death.mp3`]);
            this.load.audio('gvozd_social', [`/assets/gvozd/gvozd_social.mp3`, `/assets/gvozd/gvozd_social.ogg`]);
            this.load.audio('photo_sound', [`/assets/gvozd/photo.mp3`, `/assets/gvozd/photo.ogg`]);
            this.load.audio('meteor_impact', [`/assets/gvozd/meteor_impact.wav`, `/assets/gvozd/meteor_impact.mp3`]); // Убрать, если метеоров нет

            console.log('CaveScene Preload completed.');
        } catch (error) {
            console.error('Error during CaveScene Preload:', error);
        }
    }

    create() {
        console.log('CaveScene Create starting...');
        try {
            // World & Camera
            this.isGameOver = false;
            this.physics.world.gravity.y = GameConfig.gravity;
            // Длина уровня пещеры
            const levelLength = GameConfig.maxWorldDistance * 0.75; // Например, 75% от оригинальной
            this.physics.world.setBounds(0, -200, levelLength, GameConfig.gameHeight + 400);
            this.cameras.main.setBounds(0, 0, levelLength, GameConfig.gameHeight);
            this.cursors = {
                up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
                down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
                left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
                right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
                space: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
                shift: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT) // Если используется
            };
            this.input.addPointer(2);
            console.log('Cave World and Camera setup complete.');

            // Фон
            this.background = this.add.tileSprite(0, 0, GameConfig.gameWidth, GameConfig.gameHeight, 'cave_background')
                .setOrigin(0, 0).setScrollFactor(0).setDepth(-10);
            // УБРАНО: Создание облаков
            console.log('Cave Background created (no clouds).');

            // Groups
            this.groundGroup = this.physics.add.staticGroup();
            this.pipesGroup = this.physics.add.staticGroup();
            this.staticPlatformsGroup = this.physics.add.staticGroup();
            this.movingPlatformsGroup = this.physics.add.group({ immovable: true, allowGravity: false });
            this.blocksGroup = this.physics.add.staticGroup();
            this.flagpoleGroup = this.physics.add.staticGroup();
            this.zilsGroup = this.physics.add.group({ runChildUpdate: true });
            this.cruzaksGroup = this.physics.add.group({ runChildUpdate: false });
            this.dogsGroup = this.physics.add.group({ runChildUpdate: false });
            this.gvozdikiGroup = this.physics.add.group({ runChildUpdate: false, allowGravity: false });
            this.moneyGroup = this.physics.add.group({ allowGravity: false });
            this.poopsGroup = this.physics.add.group({ allowGravity: false });
            this.meteorsGroup = this.physics.add.group({ allowGravity: false, maxSize: GameConfig.maxObjects.meteors }); // Убрать, если не нужны
            console.log('Cave Physics Groups created.');

            // Cutscene Bars (можно убрать, если катсцены нет)
            this.topBar = this.add.rectangle(GameConfig.gameWidth / 2, -GameConfig.cutscene.barHeight / 2, GameConfig.gameWidth, GameConfig.cutscene.barHeight, 0x000000).setScrollFactor(0).setDepth(150).setVisible(false).setAlpha(0.8);
            this.bottomBar = this.add.rectangle(GameConfig.gameWidth / 2, GameConfig.gameHeight + GameConfig.cutscene.barHeight / 2, GameConfig.gameWidth, GameConfig.cutscene.barHeight, 0x000000).setScrollFactor(0).setDepth(150).setVisible(false).setAlpha(0.8);

            // Player
            this.player = this.physics.add.sprite(100, GameConfig.ground.top - 50, GameConfig.player.idleFrames[0])
                .setScale(GameConfig.player.scale).setDepth(GameConfig.player.depth).setCollideWorldBounds(true);
            if (this.player.body instanceof Phaser.Physics.Arcade.Body) { /* ... body setup ... */ this.player.body.gravity.y = GameConfig.player.gravityY; this.player.body.setSize(this.player.width * 0.6, this.player.height * 0.8); this.player.body.setOffset(this.player.width * 0.2, this.player.height * 0.1); }
            else { throw new Error("Player physics body not created in CaveScene!"); }
            console.log('Cave Player created.');

            // Managers
            this.playerController = new PlayerController(this, this.player, this.cursors);
            this.collectiblesManager = new CollectiblesManager(this, { gvozdiki: this.gvozdikiGroup, money: this.moneyGroup }, this.playerController);
            this.enemyManager = new EnemyManager(this, { zils: this.zilsGroup, bumblebees: this.cruzaksGroup, dogs: this.dogsGroup, poops: this.poopsGroup, meteors: this.meteorsGroup }, this.playerController);
             // !!!!! ИСПРАВЛЕН ВЫЗОВ: 7 аргументов !!!!!
            this.worldGenerator = new WorldGenerator(this, { ground: this.groundGroup, pipes: this.pipesGroup, staticPlatforms: this.staticPlatformsGroup, movingPlatforms: this.movingPlatformsGroup, flagpole: this.flagpoleGroup, blocks: this.blocksGroup }, this.fireStickSprites, this.enemyManager, this.collectiblesManager, this.player, 'cave_ground'); // Передаем 'cave_ground' как 7-й аргумент
             // !!!!! ИСПРАВЛЕН ВЫЗОВ: CollisionManager принимает this (CaveScene) !!!!!
            this.collisionManager = new CollisionManager(this, this.playerController, this.enemyManager, this.collectiblesManager);
            // Катсцену можно убрать
            const groupsToClearForCutscene: (Phaser.Physics.Arcade.Group | Phaser.Physics.Arcade.StaticGroup)[] = [this.pipesGroup, this.staticPlatformsGroup, this.movingPlatformsGroup, this.blocksGroup, this.zilsGroup, this.cruzaksGroup, this.dogsGroup, this.poopsGroup, this.gvozdikiGroup, this.moneyGroup, this.meteorsGroup].filter(g => g); // Фильтруем undefined на всякий случай
            this.cutsceneManager = new CutsceneManager(this, this.playerController, groupsToClearForCutscene, { top: this.topBar, bottom: this.bottomBar });
            this.uiManager = new UIManager(this);
            console.log('Cave Managers created.');

            // Camera & Sound
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            this.cameras.main.setFollowOffset(-150, 50);
            this.cameras.main.setDeadzone(100, 50);
            this.music = this.sound.add('bgm_cave', { loop: true, volume: GameConfig.soundVolumes.bgm }); // Используем bgm_cave
            Object.keys(GameConfig.soundVolumes).forEach(key => { /* ... load sounds ... */ if (key !== 'bgm' && key !== 'bgm_cave' && this.cache.audio.exists(key)) { this.sounds[key] = this.sound.add(key, { volume: GameConfig.soundVolumes[key as keyof typeof GameConfig.soundVolumes] }); } });
            this.setMuteState(this.isMuted);
            console.log('Cave Camera and Sound setup complete.');

            // Initial World
            this.worldGenerator.createInitialGround();
            console.log('Cave Initial Ground created.');

            // Collisions
            this.collisionManager.setupCollisions({
                player: this.player, ground: this.groundGroup, pipes: this.pipesGroup, staticPlatforms: this.staticPlatformsGroup, movingPlatforms: this.movingPlatformsGroup, blocks: this.blocksGroup, zils: this.zilsGroup, bumblebees: this.cruzaksGroup, dogs: this.dogsGroup, poops: this.poopsGroup, gvozdiki: this.gvozdikiGroup, money: this.moneyGroup, meteors: this.meteorsGroup
            });
            console.log('Cave Collisions setup complete.');

             // !!!!! ИСПРАВЛЕН ВЫЗОВ: Используем метод setLevelLength !!!!!
            this.worldGenerator.setLevelLength(levelLength); // Сообщаем генератору длину уровня

            // Player vs Flagpole
            this.physics.add.overlap(this.player, this.flagpoleGroup, (_p, _f) => { /* ... end game logic ... */ if (!this.isGameOver && !this.cutsceneManager.isCutsceneActive()) { console.log("Player reached cave flagpole!"); this.endGame(true); } }, undefined, this);
            console.log('Cave Flagpole overlap setup complete.');

            // Events
            this.events.on('playerDied', this.handlePlayerDied, this);
            this.events.on('startCutscene', this.handleStartCutscene, this); // Убрать, если нет катсцены
            this.events.on('cutsceneFinished', this.handleCutsceneFinished, this); // Убрать, если нет катсцены
            this.events.on('bonusCollected', this.handleBonusCollected, this);
            this.events.on('requestSoundPlay', this.playSound, this);
            console.log('Cave Event listeners setup complete.');

            // Debug
            (window as any)['caveScene'] = this;
            console.log('CaveScene Create completed successfully.');

        } catch (error) {
            console.error('CRITICAL Error in CaveScene Create:', error);
            this.handleCriticalError(error);
        }
    }

    update(time: number, delta: number) {
        if (!this.cutsceneManager) { console.error("CutsceneManager not initialized in CaveScene update!"); if (!this.isGameOver) this.handleCriticalError("CutsceneManager not initialized"); return; }
        if (this.isGameOver || this.scene.isPaused() || this.cutsceneManager.isCutsceneActive()) return;

        try {
            const playerSprite = this.playerController?.getPlayerSprite();
            if (!playerSprite?.active) { if (!this.isGameOver) { console.warn("Cave Player inactive. Ending game."); this.endGame(false); } return; }
            const playerX = playerSprite.x;
            const cam = this.cameras.main;
            const camLeft = cam.worldView.left;
            const camRight = cam.worldView.right;

            // Прокрутка фона пещеры
            this.background.tilePositionX = cam.scrollX * 0.05;

            // Update Managers
            this.playerController.update(time, delta);
            this.enemyManager.update(time, delta);
            this.collectiblesManager.update(time, delta);

            // World Generation
            this.worldGenerator.updateDifficulty(playerX, this.collectiblesManager.gvozdikiCollected);
            this.worldGenerator.checkAndGenerate(time, camRight, playerX);
            this.worldGenerator.ensureGroundExists(camRight + GameConfig.generationLookahead + 200);

            // Fire Stick Collisions
            this.checkFireStickCollisions();

            // Cleanup
            if (time - this.lastCleanupTime > GameConfig.cleanupDelay) {
                this.cleanupObjects(camLeft);
                this.lastCleanupTime = time;
            }

        } catch (error) {
            console.error('[CaveScene Update] Error in update loop:', error);
            this.handleCriticalError(error);
        }
    }

    // Проверка коллизий с огненными палками
    private checkFireStickCollisions() {
       // Логика без изменений...
       if (!this.playerController || !this.playerController.canBeHurt() || !this.player?.active || this.fireStickSprites.length === 0) { return; }
       const playerBounds = this.player.getBounds();
       for (let i = this.fireStickSprites.length - 1; i >= 0; i--) {
           const stick = this.fireStickSprites[i];
           if (!stick.active) { continue; }
           // ... (расчет линии палки)
           const angleRad = Phaser.Math.DegToRad(stick.angle); const length = stick.displayHeight; const originOffsetY = length * stick.originY; const topRelX = 0; const topRelY = -originOffsetY; const bottomRelX = 0; const bottomRelY = length - originOffsetY; const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad); const rotatedTopX = topRelX * cosA - topRelY * sinA; const rotatedTopY = topRelX * sinA + topRelY * cosA; const rotatedBottomX = bottomRelX * cosA - bottomRelY * sinA; const rotatedBottomY = bottomRelX * sinA + bottomRelY * cosA; const p1x = stick.x + rotatedTopX; const p1y = stick.y + rotatedTopY; const p2x = stick.x + rotatedBottomX; const p2y = stick.y + rotatedBottomY; const stickLine = new Phaser.Geom.Line(p1x, p1y, p2x, p2y);
           if (Phaser.Geom.Intersects.LineToRectangle(stickLine, playerBounds)) { console.log("Player hit by Fire Stick in Cave!"); this.playerController.applyDamage(); this.playSound('playerDamage'); break; }
       }
    }

    // Обработчики событий
    private handlePlayerDied() { /* ... */ if (!this.isGameOver) { this.playSound('playerDamage'); this.endGame(false); } }
    private handleStartCutscene() { /* ... */ if (!this.cutsceneManager || this.cutsceneManager.isCutsceneActive() || this.cutsceneManager.hasCutscenePlayed() || this.isGameOver) return; this.music?.pause(); this.registry.set('isCutscenePlaying', true); this.cutsceneManager.start(); }
    private handleCutsceneFinished() { /* ... */ if (this.isGameOver) return; this.registry.set('isCutscenePlaying', false); if(this.playerController) this.playerController.enableInputAndPhysics(); if (this.music && !this.isMuted) { /* ... resume music ... */ if (this.music.isPaused) this.music.resume(); else if (!this.music.isPlaying) this.music.play(); } }
    private handleBonusCollected(type: string) { /* ... */ if (!this.isGameOver && type === 'life' && this.playerController) { this.playerController.gainLife(); } }
    private playSound(key: string, config?: Phaser.Types.Sound.SoundConfig) { /* ... */ if ((this.isGameOver && key !== 'gvozd_social') || this.isMuted) return; const sound = this.sounds[key]; if (sound) sound.play(config); }

    // Завершение игры/уровня
    public endGame(isVictory: boolean) {
        if (this.isGameOver) return; this.isGameOver = true;
        const score = this.getScore(); console.log(`CAVE SCENE: endGame. Victory: ${isVictory}, Score: ${score}`);
        // ... (остановка физики, анимаций, звука)
        if (this.playerController) this.playerController.disableInputAndPhysics(); if (this.physics) this.physics.pause(); if (this.tweens) this.tweens.pauseAll(); if (this.music) this.music.stop();

        // Если победа в пещере, сообщить UI о победе
        if (this.uiManager) {
             this.uiManager.emitGameOver(isVictory, score);
             if(isVictory) console.log("Cave level won! Emitted final victory.");
        } else {
             console.error("Cave UIManager not available to emit game over!");
        }
        // Можно добавить запуск сцены "YouWinScreen" здесь, если она есть
        // if (isVictory) { this.scene.start('YouWinScreen', { score }); }
    }

    // Обработка критической ошибки
    private handleCriticalError(error?: any) { /* ... */ console.error("!! CRITICAL CAVE SCENE ERROR !!", error); if (!this.isGameOver) { this.isGameOver = true; try { /* ... cleanup ... */ if (this.music) this.music.stop(); if (this.physics) this.physics.pause(); if (this.playerController) this.playerController.disableInputAndPhysics(); if (this.tweens) this.tweens.pauseAll(); if (this.time) this.time.removeAllEvents(); } catch (e) { console.error("Error during critical error cleanup:", e); } if (this.uiManager) this.uiManager.emitGameOver(false, this.getScore()); else console.error("Cave UIManager not available during critical error!"); console.error("Cave game frozen due to critical error!"); } }

    // Вкл/Выкл звука
    public setMuteState(newMutedState: boolean) { /* ... */ this.isMuted = newMutedState; this.sound.setMute(this.isMuted); if (this.isMuted) { this.music?.pause(); } else { if (this.music && !this.scene.isPaused() && !this.isGameOver && this.cutsceneManager && !this.cutsceneManager.isCutsceneActive()) { /* ... resume music ... */ if (this.music.isPaused) { this.music.resume(); } else if (!this.music.isPlaying) { this.music.play(); } } } console.log(`Cave game sounds ${this.isMuted ? 'MUTED' : 'UNMUTED'}`); }

    // Геттеры
    public getScore(): number { /* ... */ return this.collectiblesManager?.gvozdikiCollected ?? 0; }
    public getLives(): number { /* ... */ return this.playerController?.getLives() ?? 0; }
    public getCurrentDifficulty(): number { /* ... */ return this.worldGenerator?.getDifficultyValue() ?? 1; }
    public getPlayerControllerInstance(): PlayerController | null { /* ... */ return this.playerController ?? null; }

    // !!!!! ИСПРАВЛЕНО: Логика очистки !!!!!
    private cleanupObjects(cameraLeftEdge: number) {
        if (!this.cutsceneManager || this.cutsceneManager.isCutsceneActive() || this.isGameOver) return;

        const buffer = GameConfig.cleanupBuffer;
        const cleanupLimitX = cameraLeftEdge - buffer; // Предел для удаления

        // Определяем функцию очистки один раз
        const cleanupChild = (child: Phaser.GameObjects.GameObject | any, groupRef?: Phaser.Physics.Arcade.Group | Phaser.Physics.Arcade.StaticGroup | null) => {
             // Проверяем, активен ли объект и есть ли у него координата x
             if (child?.active && typeof child.x === 'number') {
                  // Определяем правый край объекта
                  const width = child.displayWidth ?? child.width ?? 0;
                  const originX = child.originX ?? 0.5;
                  const childRightEdge = child.x + width * (1 - originX);

                  // Если правый край объекта левее предела очистки
                  if (childRightEdge < cleanupLimitX) {
                      // Специальная логика для определенных групп перед уничтожением
                      if (groupRef === this.movingPlatformsGroup) {
                          this.tweens.killTweensOf(child);
                      } else if (groupRef === this.gvozdikiGroup && this.collectiblesManager) {
                          this.collectiblesManager.removeGvozdikTween(child as Phaser.Physics.Arcade.Sprite);
                      }
                      // Уничтожаем объект
                      child.destroy();
                      // console.log(`Cleaned up object at x: ${child.x}`); // DEBUG
                  }
             }
        };

        // Массив групп для очистки (убедитесь, что все они инициализированы)
        const groupsToClean = [
            this.groundGroup, this.pipesGroup, this.staticPlatformsGroup,
            this.movingPlatformsGroup, this.blocksGroup, this.gvozdikiGroup,
            this.moneyGroup, this.zilsGroup, this.cruzaksGroup,
            this.dogsGroup, this.poopsGroup, this.meteorsGroup // Убрать метеоры, если не используются
        ];

        // Проходим по каждой группе и очищаем её дочерние элементы
        try {
            groupsToClean.forEach(group => {
                if (group && typeof group.getChildren === 'function') {
                    group.getChildren().forEach(child => cleanupChild(child, group));
                }
            });
            // Очистка огненных палок (они не в группе)
            for (let i = this.fireStickSprites.length - 1; i >= 0; i--) {
                 const stick = this.fireStickSprites[i];
                 if (stick.active && stick.x < cleanupLimitX - 50) { // Доп. буфер для палок
                      this.tweens.killTweensOf(stick);
                      stick.destroy();
                      this.fireStickSprites.splice(i, 1);
                 }
            }

        } catch (e) {
            console.error('Error during cave object cleanup:', e);
        }
   }


    // Завершение сцены (очистка ресурсов)
    shutdown() {
        console.log('CaveScene Shutdown initiated...');
        // Отписка от событий
        this.events.off('playerDied', this.handlePlayerDied, this);
        this.events.off('startCutscene', this.handleStartCutscene, this);
        this.events.off('cutsceneFinished', this.handleCutsceneFinished, this);
        this.events.off('bonusCollected', this.handleBonusCollected, this);
        this.events.off('requestSoundPlay', this.playSound, this);
        // Остановка звуков, анимаций, таймеров
        this.sound.stopAll(); this.tweens.killAll(); this.time.removeAllEvents();
        // Уничтожение групп
        this.groundGroup?.destroy(true); this.pipesGroup?.destroy(true); this.staticPlatformsGroup?.destroy(true); this.movingPlatformsGroup?.destroy(true); this.blocksGroup?.destroy(true); this.flagpoleGroup?.destroy(true); this.zilsGroup?.destroy(true); this.cruzaksGroup?.destroy(true); this.dogsGroup?.destroy(true); this.poopsGroup?.destroy(true); this.meteorsGroup?.destroy(true); this.gvozdikiGroup?.destroy(true); this.moneyGroup?.destroy(true);
        // Уничтожение отдельных объектов и массивов
        // УБРАНО: Очистка staticClouds
        this.fireStickSprites.forEach(stick => stick.destroy()); this.fireStickSprites = [];
        this.player?.destroy(); this.player = null!;
        this.background?.destroy(); this.background = null!;
        this.topBar?.destroy(); this.topBar = null!;
        this.bottomBar?.destroy(); this.bottomBar = null!;
        // Обнуление ссылок на менеджеры и другие объекты
        this.playerController = null!; this.worldGenerator = null!; this.enemyManager = null!; this.collectiblesManager = null!; this.collisionManager = null!; this.cutsceneManager = null!;
        this.uiManager?.shutdown(); this.uiManager = null!;
        this.cursors = null!; this.music = null!; this.sounds = {};
        // Уничтожение реестра сцены
        this.registry.destroy();
        console.log('CaveScene Shutdown completed.');
    }
}
