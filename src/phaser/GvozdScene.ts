// src/phaser/GvozdScene.ts
import Phaser from 'phaser';
import { SceneKeys, GameConfig } from './config/GameConfig';
import { PlayerController } from './managers/PlayerController';
import { WorldGenerator } from './managers/WorldGenerator';
import { EnemyManager } from './managers/EnemyManager';
import { CollectiblesManager } from './managers/CollectiblesManager';
import { CollisionManager } from './managers/CollisionManager';
import { CutsceneManager } from './managers/CutsceneManager';
import { UIManager } from './managers/UIManager';

export class GvozdScene extends Phaser.Scene {
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
    private staticClouds: Phaser.GameObjects.Image[] = [];
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
                 if (bonusItem.body instanceof Phaser.Physics.Arcade.Body) {
                    bonusItem.body.setAllowGravity(false);
                    bonusItem.setVelocityY(GameConfig.collectibles.bonusItemVelocityY);
                    this.tweens.add({ targets: bonusItem, y: bonusItem.y - GameConfig.collectibles.bonusItemFlyHeight, alpha: 0, duration: GameConfig.collectibles.bonusItemDuration, ease: 'Power1', onComplete: () => bonusItem.destroy() });
                    this.events.emit('bonusCollected', 'life');
                 } else {
                     console.warn("Bonus item created without physics body in GvozdScene.");
                     bonusItem.destroy();
                 }
            }
        }
    }

    constructor() { super({ key: 'GvozdScene' }); }

    init(data: { muted?: boolean }) {
        this.isMuted = data.muted ?? false;
        this.isGameOver = false;
        this.lastCleanupTime = 0;
        this.registry.set('gvozdikiCollected', 0);
        this.registry.set('lives', GameConfig.player.initialLives);
        this.registry.set('isCutscenePlaying', false);
        this.staticClouds = []; // Очищаем массив облаков при инициализации
        this.fireStickSprites = []; // Очищаем массив палок
        console.log('GvozdScene init. Muted state:', this.isMuted);
    }

    preload() {
        console.log('GvozdScene Preload starting...');
        // Удалена неиспользуемая переменная basePath
        try {
            // Images
            this.load.image('background', `/assets/gvozd/bg.png`);
            this.load.image('ground', `/assets/gvozd/ground.png`);
            this.load.image('pipe', `/assets/gvozd/pipe.png`);
            this.load.image('platform', `/assets/gvozd/platform.png`);
            this.load.image('cloud', `/assets/gvozd/cloud.png`);
            this.load.image('flagpole', `/assets/gvozd/flagpole.png`);
            this.load.image('gvozdik', `/assets/gvozd/gvozdik.png`);
            this.load.image('money', `/assets/gvozd/money.png`);
            this.load.image('life', `/assets/gvozd/life.png`);
            this.load.image('zil', `/assets/gvozd/zil.png`);
            this.load.image('zil_fast', `/assets/gvozd/zil.png`);
            this.load.image('zil_big', `/assets/gvozd/zil.png`);
            this.load.image('cruzak', `/assets/gvozd/cruzak.png`);
            this.load.image('poop', `/assets/gvozd/poop.png`);
            this.load.image('meteor', `/assets/gvozd/meteor.png`);
            this.load.image('fire_palka', `/assets/gvozd/fire_palka.png`);
            for (let i = 1; i <= 4; i++) { this.load.image(`r${i}`, `/assets/gvozd/r${i}.png`); }
            for (let i = 1; i <= 4; i++) { this.load.image(`j${i}`, `/assets/gvozd/j${i}.png`); }
            for (let i = 1; i <= 4; i++) { this.load.image(`i${i}`, `/assets/gvozd/i${i}.png`); }
            for (let i = 1; i <= 4; i++) { this.load.image(`d${i}`, `/assets/gvozd/d${i}.png`); }
            this.load.image('block', `/assets/gvozd/block.png`);
            this.load.image('bonus_block', `/assets/gvozd/bonus_block.png`);
            this.load.image('used_block', `/assets/gvozd/used_block.png`);
            this.load.image('babka', `/assets/gvozd/babka.png`);
            this.load.image('photo', `/assets/gvozd/photo.png`);
            this.load.image('gramota', `/assets/gvozd/gramota.png`);
            this.load.image('s1', `/assets/gvozd/s1.png`);
            this.load.image('s2', `/assets/gvozd/s2.png`);
            this.load.image('s3', `/assets/gvozd/s2.png`);

            // Audio
            this.load.audio('bgm', [`/assets/gvozd/bg.mp3`, `/assets/gvozd/bg.ogg`]);
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
            this.load.audio('meteor_impact', [`/assets/gvozd/meteor_impact.wav`, `/assets/gvozd/meteor_impact.mp3`]);

            console.log('GvozdScene Preload completed.');
        } catch (error) {
            console.error('Error during GvozdScene Preload:', error);
        }
    }

    create() {
        console.log('GvozdScene Create starting...');
        try {
            // World & Camera
            this.isGameOver = false;
            this.physics.world.gravity.y = GameConfig.gravity;
            this.physics.world.setBounds(0, -200, GameConfig.maxWorldDistance, GameConfig.gameHeight + 400);
            this.cameras.main.setBounds(0, 0, GameConfig.maxWorldDistance, GameConfig.gameHeight);
            this.cursors = {
                up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
                down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
                left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
                right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
                space: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
                shift: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT) // Если используется
            };
            this.input.addPointer(2);

            // Background & Clouds
            this.background = this.add.tileSprite(0, 0, GameConfig.gameWidth, GameConfig.gameHeight, 'background')
                .setOrigin(0, 0).setScrollFactor(0).setDepth(-10); // setScrollFactor(0) для фона
            const cloudTextures = ['cloud'];
            for (let i = 0; i < 8; i++) {
                const x = Phaser.Math.Between(50, GameConfig.gameWidth - 50);
                const y = Phaser.Math.Between(GameConfig.clouds.minY, GameConfig.clouds.maxY);
                const scale = Phaser.Math.FloatBetween(GameConfig.clouds.minScale, GameConfig.clouds.maxScale);
                const alpha = Phaser.Math.FloatBetween(GameConfig.clouds.minAlpha, GameConfig.clouds.maxAlpha);
                const scrollFactor = Phaser.Math.FloatBetween(0.1, 0.4); // Горизонтальный параллакс
                const texture = Phaser.Utils.Array.GetRandom(cloudTextures);
                const cloud = this.add.image(x, y, texture)
                    .setScale(scale).setAlpha(alpha).setDepth(GameConfig.clouds.depth);
                // Устанавливаем свойства scrollFactorX и scrollFactorY
                cloud.scrollFactorX = scrollFactor;
                cloud.scrollFactorY = 1; // Движется с камерой по Y
                this.staticClouds.push(cloud);
            }
            console.log('Background and Clouds created.');

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
            this.meteorsGroup = this.physics.add.group({ allowGravity: false, maxSize: GameConfig.maxObjects.meteors });

            // Cutscene Bars
            this.topBar = this.add.rectangle(GameConfig.gameWidth / 2, -GameConfig.cutscene.barHeight / 2, GameConfig.gameWidth, GameConfig.cutscene.barHeight, 0x000000).setScrollFactor(0).setDepth(150).setVisible(false).setAlpha(0.8);
            this.bottomBar = this.add.rectangle(GameConfig.gameWidth / 2, GameConfig.gameHeight + GameConfig.cutscene.barHeight / 2, GameConfig.gameWidth, GameConfig.cutscene.barHeight, 0x000000).setScrollFactor(0).setDepth(150).setVisible(false).setAlpha(0.8);

            // Player
            this.player = this.physics.add.sprite(100, GameConfig.ground.top - 50, GameConfig.player.idleFrames[0])
                .setScale(GameConfig.player.scale).setDepth(GameConfig.player.depth).setCollideWorldBounds(true);
            if (this.player.body instanceof Phaser.Physics.Arcade.Body) {
                 this.player.body.gravity.y = GameConfig.player.gravityY;
                 this.player.body.setSize(this.player.width * 0.6, this.player.height * 0.8);
                 this.player.body.setOffset(this.player.width * 0.2, this.player.height * 0.1);
            } else { throw new Error("Player physics body not created!"); }

            // Managers
            this.playerController = new PlayerController(this, this.player, this.cursors);
            this.collectiblesManager = new CollectiblesManager(this, { gvozdiki: this.gvozdikiGroup, money: this.moneyGroup }, this.playerController);
            this.enemyManager = new EnemyManager(this, { zils: this.zilsGroup, bumblebees: this.cruzaksGroup, dogs: this.dogsGroup, poops: this.poopsGroup, meteors: this.meteorsGroup }, this.playerController);
            // Передаем 'ground' как 7-й аргумент
            this.worldGenerator = new WorldGenerator(this, { ground: this.groundGroup, pipes: this.pipesGroup, staticPlatforms: this.staticPlatformsGroup, movingPlatforms: this.movingPlatformsGroup, flagpole: this.flagpoleGroup, blocks: this.blocksGroup }, this.fireStickSprites, this.enemyManager, this.collectiblesManager, this.player, 'ground');
            this.collisionManager = new CollisionManager(this, this.playerController, this.enemyManager, this.collectiblesManager); // Передаем 'this' как Phaser.Scene
            const groupsToClearForCutscene = [this.pipesGroup, this.staticPlatformsGroup, this.movingPlatformsGroup, this.blocksGroup, this.zilsGroup, this.cruzaksGroup, this.dogsGroup, this.poopsGroup, this.gvozdikiGroup, this.moneyGroup, this.meteorsGroup].filter(g => g);
            this.cutsceneManager = new CutsceneManager(this, this.playerController, groupsToClearForCutscene, { top: this.topBar, bottom: this.bottomBar });
            this.uiManager = new UIManager(this);

            // Camera & Sound
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            this.cameras.main.setFollowOffset(-150, 50);
            this.cameras.main.setDeadzone(100, 50);
            this.music = this.sound.add('bgm', { loop: true, volume: GameConfig.soundVolumes.bgm });
            Object.keys(GameConfig.soundVolumes).forEach(key => {
                 if (key !== 'bgm' && key !== 'bgm_cave' && this.cache.audio.exists(key)) { // Пропускаем bgm_cave тоже
                      this.sounds[key] = this.sound.add(key, { volume: GameConfig.soundVolumes[key as keyof typeof GameConfig.soundVolumes] });
                 }
            });
            this.setMuteState(this.isMuted);

            // Initial World
            this.worldGenerator.setLevelLength(GameConfig.maxWorldDistance); // Устанавливаем длину для GvozdScene
            this.worldGenerator.createInitialGround();

            // Collisions
            this.collisionManager.setupCollisions({
                 player: this.player, ground: this.groundGroup, pipes: this.pipesGroup, staticPlatforms: this.staticPlatformsGroup, movingPlatforms: this.movingPlatformsGroup, blocks: this.blocksGroup, zils: this.zilsGroup, bumblebees: this.cruzaksGroup, dogs: this.dogsGroup, poops: this.poopsGroup, gvozdiki: this.gvozdikiGroup, money: this.moneyGroup, meteors: this.meteorsGroup
            });

            // Player vs Flagpole overlap
            this.physics.add.overlap(this.player, this.flagpoleGroup, (_p, _f) => {
                 if (!this.isGameOver && !this.cutsceneManager.isCutsceneActive()) {
                      console.log("Player reached flagpole!");
                      this.endGame(true); // Вызываем endGame с флагом победы
                 }
            }, undefined, this);

            // Events
            this.events.on('playerDied', this.handlePlayerDied, this);
            this.events.on('startCutscene', this.handleStartCutscene, this);
            this.events.on('cutsceneFinished', this.handleCutsceneFinished, this);
            this.events.on('bonusCollected', this.handleBonusCollected, this);
            this.events.on('requestSoundPlay', this.playSound, this);

            // Debug
            (window as any)['gvozdScene'] = this;
            console.log('GvozdScene Create completed successfully.');

        } catch (error) {
            console.error('CRITICAL Error in GvozdScene Create:', error);
            this.handleCriticalError(error);
        }
    }

    update(time: number, delta: number) {
        if (!this.cutsceneManager) {
             console.error("CutsceneManager not initialized in GvozdScene update!");
             if (!this.isGameOver) this.handleCriticalError("CutsceneManager not initialized");
             return;
        }
        if (this.isGameOver || this.scene.isPaused() || this.cutsceneManager.isCutsceneActive()) return;

        try {
            const playerSprite = this.playerController?.getPlayerSprite();
            if (!playerSprite?.active) {
                 if (!this.isGameOver) { console.warn("Player inactive. Ending game."); this.endGame(false); }
                 return;
            }
            const playerX = playerSprite.x;
            const cam = this.cameras.main;
            const camLeft = cam.worldView.left;
            const camRight = cam.worldView.right;

            this.background.tilePositionX = cam.scrollX * 0.1; // Фон скроллится медленнее камеры

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
            console.error('[GvozdScene Update] Error in update loop:', error);
            this.handleCriticalError(error);
        }
    }

    private checkFireStickCollisions() {
        if (!this.playerController || !this.playerController.canBeHurt() || !this.player?.active || this.fireStickSprites.length === 0) {
            return;
        }
        const playerBounds = this.player.getBounds();
        for (let i = this.fireStickSprites.length - 1; i >= 0; i--) {
             const stick = this.fireStickSprites[i];
             if (!stick.active) { continue; }
             // Расчет линии палки
             const angleRad = Phaser.Math.DegToRad(stick.angle); const length = stick.displayHeight; const originOffsetY = length * stick.originY; const topRelX = 0; const topRelY = -originOffsetY; const bottomRelX = 0; const bottomRelY = length - originOffsetY; const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad); const rotatedTopX = topRelX * cosA - topRelY * sinA; const rotatedTopY = topRelX * sinA + topRelY * cosA; const rotatedBottomX = bottomRelX * cosA - bottomRelY * sinA; const rotatedBottomY = bottomRelX * sinA + bottomRelY * cosA; const p1x = stick.x + rotatedTopX; const p1y = stick.y + rotatedTopY; const p2x = stick.x + rotatedBottomX; const p2y = stick.y + rotatedBottomY; const stickLine = new Phaser.Geom.Line(p1x, p1y, p2x, p2y);
             if (Phaser.Geom.Intersects.LineToRectangle(stickLine, playerBounds)) {
                  console.log("Player hit by Fire Stick!");
                  this.playerController.applyDamage();
                  this.playSound('playerDamage');
                  break; // Выходим из цикла после первого попадания за кадр
             }
        }
    }

    // --- Обработчики событий ---
    private handlePlayerDied() {
         if (!this.isGameOver) {
              this.playSound('playerDamage');
              this.endGame(false); // Вызываем endGame с флагом проигрыша
         }
    }

    private handleStartCutscene() {
         if (!this.cutsceneManager || this.cutsceneManager.isCutsceneActive() || this.cutsceneManager.hasCutscenePlayed() || this.isGameOver) return;
         this.music?.pause();
         this.registry.set('isCutscenePlaying', true);
         this.cutsceneManager.start();
    }

    private handleCutsceneFinished() {
         if (this.isGameOver) return; // Если игра закончилась во время катсцены, не возобновляем
         this.registry.set('isCutscenePlaying', false);
         if(this.playerController) this.playerController.enableInputAndPhysics();
         // Возобновляем музыку, если она не выключена
         if (this.music && !this.isMuted) {
              if (this.music.isPaused) { this.music.resume(); }
              else if (!this.music.isPlaying) { this.music.play(); }
         }
    }

    private handleBonusCollected(type: string) {
         if (!this.isGameOver && type === 'life' && this.playerController) {
             this.playerController.gainLife();
         }
    }

    private playSound(key: string, config?: Phaser.Types.Sound.SoundConfig) {
         // Не проигрываем звуки, если игра закончена (кроме звуков катсцены/UI) или звук выключен
         if ((this.isGameOver && key !== 'gvozd_social' && key !== 'photo_sound') || this.isMuted) return;
         const sound = this.sounds[key];
         if (sound) {
              sound.play(config);
         } else {
              console.warn(`Sound key "${key}" not found in loaded sounds.`);
         }
    }

    // --- Завершение игры/уровня ---
    public endGame(isVictory: boolean) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        const score = this.getScore();
        const lives = this.getLives();
        console.log(`GVOZD SCENE: endGame. Victory: ${isVictory}, Score: ${score}, Lives: ${lives}`);

        // Останавливаем основные процессы игры
        if (this.playerController) this.playerController.disableInputAndPhysics();
        if (this.physics) this.physics.pause();
        if (this.tweens) this.tweens.pauseAll();
        if (this.music) this.music.stop();

        // Переход на следующий уровень или сообщение UI
        if (isVictory) {
            console.log("Gvozd level won! Starting transition to CaveScene...");
            this.scene.start('TransitionScene', {
                nextScene: 'CaveScene',
                lives: lives,
                muted: this.isMuted
            });
            // Не вызываем emitGameOver, т.к. игра продолжается
        } else {
            // Если проигрыш, сообщаем UI
            if (this.uiManager) {
                 this.uiManager.emitGameOver(isVictory, score);
            } else {
                 console.error("Gvozd UIManager not available to emit game over!");
            }
        }
    }

    // --- Обработка критической ошибки ---
    private handleCriticalError(error?: any) {
         console.error("!! CRITICAL GVOZD SCENE ERROR !!", error);
         if (!this.isGameOver) {
              this.isGameOver = true;
              try {
                   // Пытаемся остановить всё, что можно
                   if (this.music) this.music.stop();
                   if (this.physics) this.physics.pause();
                   if (this.playerController) this.playerController.disableInputAndPhysics();
                   if (this.tweens) this.tweens.pauseAll();
                   if (this.time) this.time.removeAllEvents();
              } catch (e) { console.error("Error during critical error handling cleanup:", e); }
              // Сообщаем UI о проигрыше
              if (this.uiManager) {
                   this.uiManager.emitGameOver(false, this.getScore());
              } else {
                   console.error("Gvozd UIManager not available during critical error!");
              }
              console.error("Gvozd game frozen due to critical error!");
              // Можно добавить сообщение пользователю на экране
         }
    }

    // --- Управление звуком ---
    public setMuteState(newMutedState: boolean) {
         this.isMuted = newMutedState;
         this.sound.setMute(this.isMuted); // Глобальное вкл/выкл звука Phaser
         if (this.isMuted) {
              this.music?.pause(); // Ставим фоновую музыку на паузу
         } else {
              // Возобновляем музыку, только если игра активна и не идет катсцена
              if (this.music && !this.scene.isPaused() && !this.isGameOver && this.cutsceneManager && !this.cutsceneManager.isCutsceneActive()) {
                   if (this.music.isPaused) { this.music.resume(); }
                   else if (!this.music.isPlaying) { this.music.play(); }
              }
         }
         console.log(`Gvozd game sounds ${this.isMuted ? 'MUTED' : 'UNMUTED'}`);
    }

    // --- Геттеры ---
    public getScore(): number { return this.collectiblesManager?.gvozdikiCollected ?? 0; }
    public getLives(): number { return this.playerController?.getLives() ?? 0; }
    public getCurrentDifficulty(): number { return this.worldGenerator?.getDifficultyValue() ?? 1; }
    public getPlayerControllerInstance(): PlayerController | null { return this.playerController ?? null; }

    // --- Очистка объектов ---
    private cleanupObjects(cameraLeftEdge: number) {
        if (!this.cutsceneManager || this.cutsceneManager.isCutsceneActive() || this.isGameOver) return;
        const buffer = GameConfig.cleanupBuffer;
        const cleanupLimitX = cameraLeftEdge - buffer;

        // Функция для очистки дочерних элементов группы
        const cleanupChild = (child: Phaser.GameObjects.GameObject | any, groupRef?: Phaser.Physics.Arcade.Group | Phaser.Physics.Arcade.StaticGroup | null) => {
             if (child?.active && typeof child.x === 'number') {
                  const width = child.displayWidth ?? child.width ?? 0;
                  const originX = child.originX ?? 0.5;
                  const childRightEdge = child.x + width * (1 - originX);
                  if (childRightEdge < cleanupLimitX) {
                      // Специальная обработка перед уничтожением
                      if (groupRef === this.movingPlatformsGroup) { this.tweens.killTweensOf(child); }
                      else if (groupRef === this.gvozdikiGroup && this.collectiblesManager) { this.collectiblesManager.removeGvozdikTween(child as Phaser.Physics.Arcade.Sprite); }
                      child.destroy();
                  }
             }
        };

        // Группы для очистки
        const groupsToClean = [ this.groundGroup, this.pipesGroup, this.staticPlatformsGroup, this.movingPlatformsGroup, this.blocksGroup, this.gvozdikiGroup, this.moneyGroup, this.zilsGroup, this.cruzaksGroup, this.dogsGroup, this.poopsGroup, this.meteorsGroup ];

        try {
            // Очистка групп
            groupsToClean.forEach(group => {
                 if (group && typeof group.getChildren === 'function') {
                      group.getChildren().forEach(child => cleanupChild(child, group));
                 }
            });

            // Очистка облаков (массив staticClouds)
            this.staticClouds = this.staticClouds.filter(cloud => {
                 // Используем мировую координату X для проверки
                 if (cloud.active && cloud.x < cleanupLimitX - 200) { // Доп. буфер для облаков
                      cloud.destroy();
                      return false; // Удаляем из массива
                 }
                 return cloud.active; // Оставляем только активные
            });

            // Очистка огненных палок (массив fireStickSprites)
            for (let i = this.fireStickSprites.length - 1; i >= 0; i--) {
                 const stick = this.fireStickSprites[i];
                 if (stick.active && stick.x < cleanupLimitX - 50) { // Доп. буфер
                      this.tweens.killTweensOf(stick);
                      stick.destroy();
                      this.fireStickSprites.splice(i, 1); // Удаляем из массива
                 } else if (!stick.active) {
                     // Если палка стала неактивной по другой причине, тоже удаляем
                     this.fireStickSprites.splice(i, 1);
                 }
            }
        } catch (e) {
            console.error('Error during Gvozd object cleanup:', e);
        }
    }

    // --- Завершение работы сцены ---
    shutdown() {
        console.log('GvozdScene Shutdown initiated...');
        // Отписка от событий
        this.events.off('playerDied', this.handlePlayerDied, this);
        this.events.off('startCutscene', this.handleStartCutscene, this);
        this.events.off('cutsceneFinished', this.handleCutsceneFinished, this);
        this.events.off('bonusCollected', this.handleBonusCollected, this);
        this.events.off('requestSoundPlay', this.playSound, this);

        // Остановка звуков, анимаций, таймеров
        this.sound.stopAll();
        this.tweens.killAll(); // Важно остановить все твины
        this.time.removeAllEvents();

        // Уничтожение групп (проверяем на null перед destroy)
        this.groundGroup?.destroy(true);
        this.pipesGroup?.destroy(true);
        this.staticPlatformsGroup?.destroy(true);
        this.movingPlatformsGroup?.destroy(true);
        this.blocksGroup?.destroy(true);
        this.flagpoleGroup?.destroy(true);
        this.zilsGroup?.destroy(true);
        this.cruzaksGroup?.destroy(true);
        this.dogsGroup?.destroy(true);
        this.poopsGroup?.destroy(true);
        this.meteorsGroup?.destroy(true);
        this.gvozdikiGroup?.destroy(true);
        this.moneyGroup?.destroy(true);

        // Уничтожение отдельных объектов и массивов
        this.staticClouds.forEach(cloud => cloud.destroy());
        this.staticClouds = []; // Очищаем массив
        this.fireStickSprites.forEach(stick => stick.destroy());
        this.fireStickSprites = []; // Очищаем массив
        this.player?.destroy();
        this.background?.destroy();
        this.topBar?.destroy();
        this.bottomBar?.destroy();

        // Обнуление ссылок на менеджеры и другие объекты
        this.playerController = null!;
        this.worldGenerator = null!;
        this.enemyManager = null!;
        this.collectiblesManager = null!;
        this.collisionManager = null!;
        this.cutsceneManager = null!; // Уничтожаем и катсцену
        this.uiManager?.shutdown(); // Вызываем shutdown для UI менеджера, если он есть
        this.uiManager = null!;
        this.cursors = null!;
        this.music = null!; // Обнуляем ссылку на музыку
        this.sounds = {}; // Очищаем объект со звуками

        // Уничтожение реестра сцены
        this.registry.destroy();
        console.log('GvozdScene Shutdown completed.');
    }
} // Конец класса GvozdScene
