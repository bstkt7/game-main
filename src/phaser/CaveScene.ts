import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';
import { PlayerController } from './managers/PlayerController';
import { WorldGenerator } from './managers/WorldGenerator';
import { EnemyManager } from './managers/EnemyManager';
import { CollectiblesManager } from './managers/CollectiblesManager';
import { CollisionManager } from './managers/CollisionManager';
import { CutsceneManager } from './managers/CutsceneManager';
import { UIManager } from './managers/UIManager';

export class CaveScene extends Phaser.Scene {
    private playerController!: PlayerController;
    private worldGenerator!: WorldGenerator;
    private enemyManager!: EnemyManager;
    private collectiblesManager!: CollectiblesManager;
    private collisionManager!: CollisionManager;
    private cutsceneManager!: CutsceneManager;
    private uiManager!: UIManager;
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private background!: Phaser.GameObjects.TileSprite;
    private topBar!: Phaser.GameObjects.Rectangle;
    private bottomBar!: Phaser.GameObjects.Rectangle;
    private music!: Phaser.Sound.BaseSound;
    private sounds: { [key: string]: Phaser.Sound.BaseSound } = {};
    private fireStickSprites: Phaser.GameObjects.Sprite[] = [];
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
    private isGameOver = false;
    private isMuted: boolean = false;
    private lastCleanupTime = 0;
    private currentLives = GameConfig.player.initialLives;

    public handleBlockHit(block: Phaser.GameObjects.Sprite) {
        if (!block.getData('used')) {
            block.setData('used', true);
            this.playSound('blockHit');
            // Тряска камеры при ударе по блоку
            this.cameras.main.shake(80, 0.005);
            if (this.textures.exists('cave_used_block')) {
                block.setTexture('cave_used_block');
            }
            const isBonus = block.getData('isBonus');
            if (isBonus && this.textures.exists('life')) {
                this.playSound('blockBonus');
                const bonusItem = this.physics.add.image(block.getCenter().x, block.y - block.displayHeight / 2, 'life')
                    .setDepth(block.depth + 1).setScale(GameConfig.collectibles.bonusItemScale);
                if (bonusItem.body instanceof Phaser.Physics.Arcade.Body) {
                    bonusItem.body.setAllowGravity(false);
                    bonusItem.setVelocityY(GameConfig.collectibles.bonusItemVelocityY);
                    this.tweens.add({
                        targets: bonusItem,
                        y: bonusItem.y - GameConfig.collectibles.bonusItemFlyHeight,
                        alpha: 0,
                        duration: GameConfig.collectibles.bonusItemDuration,
                        ease: 'Power1',
                        onComplete: () => bonusItem.destroy()
                    });
                    this.events.emit('bonusCollected', 'life');
                } else {
                    console.warn("Bonus item created without physics body.");
                    bonusItem.destroy();
                }
            }
        }
    }

    constructor() {
        super({ key: 'CaveScene' });
    }

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
            // Очистка старых текстур из первой сцены
            ['background', 'ground', 'block', 'bonus_block', 'used_block', 'pipe', 'platform'].forEach(key => {
                if (this.textures.exists(key)) {
                    this.textures.remove(key);
                    console.log(`Removed cached texture: ${key}`);
                }
            });

            // Загрузка ассетов
            this.load.image('cave_background', '/assets/gvozd/lvl2/cave_bg.png');
            this.load.image('cave_ground', '/assets/gvozd/lvl2/cave_ground.png');
            this.load.image('pipe', '/assets/gvozd/lvl2/cave_pipe.png');
            this.load.image('platform', '/assets/gvozd/lvl2/cave_platform.png');
            this.load.image('flagpole', '/assets/gvozd/flagpole.png');
            this.load.image('gvozdik', '/assets/gvozd/gvozdik.png');
            this.load.image('money', '/assets/gvozd/money.png');
            this.load.image('life', '/assets/gvozd/life.png');
            this.load.image('zil', '/assets/gvozd/lvl2/cave_zil.png');
            this.load.image('zil_fast', '/assets/gvozd/lvl2/cave_zil.png');
            this.load.image('zil_big', '/assets/gvozd/lvl2/cave_zil.png');
            this.load.image('cruzak', '/assets/gvozd/cruzak.png');
            this.load.image('poop', '/assets/gvozd/poop.png');
            this.load.image('meteor', '/assets/gvozd/meteor.png');
            this.load.image('fire_palka', '/assets/gvozd/fire_palka.png');
            for (let i = 1; i <= 4; i++) {
                this.load.image(`r${i}`, `/assets/gvozd/r${i}.png`);
                this.load.image(`j${i}`, `/assets/gvozd/j${i}.png`);
                this.load.image(`i${i}`, `/assets/gvozd/i${i}.png`);
                this.load.image(`d${i}`, `/assets/gvozd/d${i}.png`);
            }
            this.load.image('cave_block', '/assets/gvozd/lvl2/cave_block.png');
            this.load.image('cave_bonus_block', '/assets/gvozd/lvl2/cave_bonus_block.png');
            this.load.image('cave_used_block', '/assets/gvozd/lvl2/cave_used_block.png');
            this.load.image('babka', '/assets/gvozd/babka.png');
            this.load.image('photo', '/assets/gvozd/photo.png');
            this.load.image('gramota', '/assets/gvozd/gramota.png');

            // Аудио
            this.load.audio('bgm_cave', ['/assets/gvozd/cave_music.mp3', '/assets/gvozd/cave_music.ogg']);
            this.load.audio('collect', ['/assets/gvozd/collect.wav', '/assets/gvozd/collect.mp3']);
            this.load.audio('jump', ['/assets/gvozd/jump.wav', '/assets/gvozd/jump.mp3']);
            this.load.audio('playerDamage', ['/assets/gvozd/player_damage.wav', '/assets/gvozd/player_damage.mp3']);
            this.load.audio('enemyStomp', ['/assets/gvozd/enemy_stomp.wav', '/assets/gvozd/enemy_stomp.mp3']);
            this.load.audio('blockHit', ['/assets/gvozd/block_hit.wav', '/assets/gvozd/block_hit.mp3']);
            this.load.audio('blockBonus', ['/assets/gvozd/block_bonus.wav', '/assets/gvozd/block_bonus.mp3']);
            this.load.audio('powerUp', ['/assets/gvozd/power_up.wav', '/assets/gvozd/power_up.mp3']);
            this.load.audio('powerDown', ['/assets/gvozd/power_down.wav', '/assets/gvozd/power_down.mp3']);
            this.load.audio('zil_death', ['/assets/gvozd/zil_death.wav', '/assets/gvozd/zil_death.mp3']);
            this.load.audio('gvozd_social', ['/assets/gvozd/gvozd_social.mp3', '/assets/gvozd/gvozd_social.ogg']);
            this.load.audio('photo_sound', ['/assets/gvozd/photo.mp3', '/assets/gvozd/photo.ogg']);
            this.load.audio('meteor_impact', ['/assets/gvozd/meteor_impact.wav', '/assets/gvozd/meteor_impact.mp3']);

            // Обработчик ошибок загрузки
            this.load.on('loaderror', (file: Phaser.Loader.File) => {
                console.error(`Failed to load asset: ${file.key}, path: ${file.url}`);
            });

            console.log('CaveScene Preload completed.');
        } catch (error) {
            console.error('Error during CaveScene Preload:', error);
        }
    }

    create() {
        console.log('CaveScene Create starting...');
        try {
            this.isGameOver = false;
            this.physics.world.gravity.y = GameConfig.gravity;
            const levelLength = GameConfig.maxWorldDistance * 0.75;
            this.physics.world.setBounds(0, -200, levelLength, GameConfig.gameHeight + 400);
            this.cameras.main.setBounds(0, 0, levelLength, GameConfig.gameHeight);
            this.cursors = {
                up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
                down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
                left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
                right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
                space: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
                shift: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
            };
            this.input.addPointer(2);
            console.log('Cave World and Camera setup complete.');

            this.background = this.add.tileSprite(0, 0, GameConfig.gameWidth, GameConfig.gameHeight, 'cave_background')
                .setOrigin(0, 0).setScrollFactor(0).setDepth(-10);
            console.log('Cave Background created with texture: cave_background');

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
            console.log('Cave Physics Groups created.');

            this.topBar = this.add.rectangle(GameConfig.gameWidth / 2, -GameConfig.cutscene.barHeight / 2, GameConfig.gameWidth, GameConfig.cutscene.barHeight, 0x000000)
                .setScrollFactor(0).setDepth(150).setVisible(false).setAlpha(0.8);
            this.bottomBar = this.add.rectangle(GameConfig.gameWidth / 2, GameConfig.gameHeight + GameConfig.cutscene.barHeight / 2, GameConfig.gameWidth, GameConfig.cutscene.barHeight, 0x000000)
                .setScrollFactor(0).setDepth(150).setVisible(false).setAlpha(0.8);

            this.player = this.physics.add.sprite(100, GameConfig.ground.top - 50, GameConfig.player.idleFrames[0])
                .setScale(GameConfig.player.scale).setDepth(GameConfig.player.depth).setCollideWorldBounds(true);
            if (this.player.body instanceof Phaser.Physics.Arcade.Body) {
                this.player.body.gravity.y = GameConfig.player.gravityY;
                this.player.body.setSize(this.player.width * 0.6, this.player.height * 0.8);
                this.player.body.setOffset(this.player.width * 0.2, this.player.height * 0.1);
            } else {
                throw new Error("Player physics body not created in CaveScene!");
            }
            console.log('Cave Player created with texture:', GameConfig.player.idleFrames[0]);

            this.playerController = new PlayerController(this, this.player, this.cursors);
            this.playerController.setLives(this.currentLives);
            this.collectiblesManager = new CollectiblesManager(this, { gvozdiki: this.gvozdikiGroup, money: this.moneyGroup }, this.playerController);
            this.enemyManager = new EnemyManager(this, { zils: this.zilsGroup, bumblebees: this.cruzaksGroup, dogs: this.dogsGroup, poops: this.poopsGroup, meteors: this.meteorsGroup }, this.playerController);
            this.worldGenerator = new WorldGenerator(
                this,
                {
                    ground: this.groundGroup,
                    pipes: this.pipesGroup,
                    staticPlatforms: this.staticPlatformsGroup,
                    movingPlatforms: this.movingPlatformsGroup,
                    flagpole: this.flagpoleGroup,
                    blocks: this.blocksGroup
                },
                this.fireStickSprites,
                this.enemyManager,
                this.collectiblesManager,
                this.player,
                'cave_ground',
                'cave_block',
                'cave_bonus_block',
                'pipe',
                'platform'
            );
            this.collisionManager = new CollisionManager(this, this.playerController, this.enemyManager, this.collectiblesManager);
            const groupsToClearForCutscene: (Phaser.Physics.Arcade.Group | Phaser.Physics.Arcade.StaticGroup)[] = [
                this.pipesGroup, this.staticPlatformsGroup, this.movingPlatformsGroup, this.blocksGroup,
                this.zilsGroup, this.cruzaksGroup, this.dogsGroup, this.poopsGroup, this.gvozdikiGroup,
                this.moneyGroup, this.meteorsGroup
            ].filter(g => g);
            this.cutsceneManager = new CutsceneManager(this, this.playerController, groupsToClearForCutscene, { top: this.topBar, bottom: this.bottomBar });
            this.uiManager = new UIManager(this);
            console.log('Cave Managers created.');

            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            this.cameras.main.setFollowOffset(-150, 50);
            this.cameras.main.setDeadzone(100, 50);
            this.music = this.sound.add('bgm_cave', { loop: true, volume: GameConfig.soundVolumes.bgm });
            Object.keys(GameConfig.soundVolumes).forEach(key => {
                if (key !== 'bgm' && key !== 'bgm_cave' && this.cache.audio.exists(key)) {
                    this.sounds[key] = this.sound.add(key, { volume: GameConfig.soundVolumes[key as keyof typeof GameConfig.soundVolumes] });
                }
            });
            this.setMuteState(this.isMuted);
            console.log('Cave Camera and Sound setup complete.');

            this.worldGenerator.createInitialGround();
            console.log('Cave Initial Ground created with texture: cave_ground');

            this.collisionManager.setupCollisions({
                player: this.player, ground: this.groundGroup, pipes: this.pipesGroup,
                staticPlatforms: this.staticPlatformsGroup, movingPlatforms: this.movingPlatformsGroup,
                blocks: this.blocksGroup, zils: this.zilsGroup, bumblebees: this.cruzaksGroup,
                dogs: this.dogsGroup, poops: this.poopsGroup, gvozdiki: this.gvozdikiGroup,
                money: this.moneyGroup, meteors: this.meteorsGroup
            });
            console.log('Cave Collisions setup complete.');

            this.worldGenerator.setLevelLength(levelLength);
            console.log(`Cave level length set to: ${levelLength}`);

            this.physics.add.overlap(this.player, this.flagpoleGroup, (_p, _f) => {
                if (!this.isGameOver && !this.cutsceneManager.isCutsceneActive()) {
                    console.log("Player reached cave flagpole!");
                    this.endGame(true);
                }
            }, undefined, this);
            console.log('Cave Flagpole overlap setup complete.');

            this.events.on('playerDied', this.handlePlayerDied, this);
            this.events.on('startCutscene', this.handleStartCutscene, this);
            this.events.on('cutsceneFinished', this.handleCutsceneFinished, this);
            this.events.on('bonusCollected', this.handleBonusCollected, this);
            this.events.on('requestSoundPlay', this.playSound, this);
            console.log('Cave Event listeners setup complete.');

            (window as any)['caveScene'] = this;
            console.log('CaveScene Create completed successfully.');
        } catch (error) {
            console.error('CRITICAL Error in CaveScene Create:', error);
            this.handleCriticalError(error);
        }
    }

    update(time: number, delta: number) {
        if (!this.cutsceneManager) {
            console.error("CutsceneManager not initialized in CaveScene update!");
            if (!this.isGameOver) this.handleCriticalError("CutsceneManager not initialized");
            return;
        }
        if (this.isGameOver || this.scene.isPaused() || this.cutsceneManager.isCutsceneActive()) return;
        try {
            const playerSprite = this.playerController?.getPlayerSprite();
            if (!playerSprite?.active) {
                if (!this.isGameOver) {
                    console.warn("Cave Player inactive. Ending game.");
                    this.endGame(false);
                }
                return;
            }
            const playerX = playerSprite.x;
            const cam = this.cameras.main;
            const camLeft = cam.worldView.left;
            const camRight = cam.worldView.right;
            this.background.tilePositionX = cam.scrollX * 0.05;
            this.playerController.update(time, delta);
            this.enemyManager.update(time, delta);
            this.collectiblesManager.update(time, delta);
            this.worldGenerator.updateDifficulty(playerX, this.collectiblesManager.gvozdikiCollected);
            this.worldGenerator.checkAndGenerate(time, camRight, playerX);
            this.worldGenerator.ensureGroundExists(camRight + GameConfig.generationLookahead + 200);
            this.checkFireStickCollisions();
            if (time - this.lastCleanupTime > GameConfig.cleanupDelay) {
                this.cleanupObjects(camLeft);
                this.lastCleanupTime = time;
            }
        } catch (error) {
            console.error('[CaveScene Update] Error in update loop:', error);
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
            if (!stick.active) {
                continue;
            }
            const angleRad = Phaser.Math.DegToRad(stick.angle);
            const length = stick.displayHeight;
            const originOffsetY = length * stick.originY;
            const topRelX = 0;
            const topRelY = -originOffsetY;
            const bottomRelX = 0;
            const bottomRelY = length - originOffsetY;
            const cosA = Math.cos(angleRad);
            const sinA = Math.sin(angleRad);
            const rotatedTopX = topRelX * cosA - topRelY * sinA;
            const rotatedTopY = topRelX * sinA + topRelY * cosA;
            const rotatedBottomX = bottomRelX * cosA - bottomRelY * sinA;
            const rotatedBottomY = bottomRelX * sinA + bottomRelY * cosA;
            const p1x = stick.x + rotatedTopX;
            const p1y = stick.y + rotatedTopY;
            const p2x = stick.x + rotatedBottomX;
            const p2y = stick.y + rotatedBottomY;
            const stickLine = new Phaser.Geom.Line(p1x, p1y, p2x, p2y);
            if (Phaser.Geom.Intersects.LineToRectangle(stickLine, playerBounds)) {
                this.playerController.applyDamage();
                this.playSound('playerDamage');
                break;
            }
        }
    }

    private cleanupObjects(cameraLeftEdge: number) {
        if (!this.cutsceneManager || this.cutsceneManager.isCutsceneActive() || this.isGameOver) return;
        const buffer = GameConfig.cleanupBuffer;
        const cleanupLimitX = cameraLeftEdge - buffer;
        const cleanupChild = (child: Phaser.GameObjects.GameObject, groupRef?: Phaser.Physics.Arcade.Group | Phaser.Physics.Arcade.StaticGroup | null) => {
            if (child?.active) {
                const sprite = child as Phaser.GameObjects.Sprite;
                const width = sprite.displayWidth ?? sprite.width ?? 0;
                const originX = sprite.originX ?? 0.5;
                const childRightEdge = sprite.x + width * (1 - originX);
                if (childRightEdge < cleanupLimitX) {
                    if (groupRef === this.movingPlatformsGroup) {
                        this.tweens.killTweensOf(child);
                    } else if (groupRef === this.gvozdikiGroup && this.collectiblesManager) {
                        this.collectiblesManager.removeGvozdikTween(child as Phaser.Physics.Arcade.Sprite);
                    }
                    child.destroy();
                }
            }
        };
        const groupsToClean = [
            this.groundGroup, this.pipesGroup, this.staticPlatformsGroup,
            this.movingPlatformsGroup, this.blocksGroup, this.zilsGroup,
            this.cruzaksGroup, this.dogsGroup, this.poopsGroup, this.gvozdikiGroup,
            this.moneyGroup, this.meteorsGroup
        ].filter(g => g);
        groupsToClean.forEach(group => {
            group.getChildren().forEach(child => cleanupChild(child, group));
        });
        for (let i = this.fireStickSprites.length - 1; i >= 0; i--) {
            const stick = this.fireStickSprites[i];
            if (stick?.active && stick.x < cleanupLimitX) {
                this.tweens.killTweensOf(stick);
                stick.destroy();
                this.fireStickSprites.splice(i, 1);
            }
        }
    }

    private handlePlayerDied() {
        if (!this.isGameOver) {
            this.playSound('playerDamage');
            this.endGame(false);
        }
    }

    private handleStartCutscene() {
        if (!this.cutsceneManager || this.cutsceneManager.isCutsceneActive() || this.cutsceneManager.hasCutscenePlayed() || this.isGameOver) return;
        this.music?.pause();
        this.registry.set('isCutscenePlaying', true);
        this.cutsceneManager.start();
    }

    private handleCutsceneFinished() {
        if (this.isGameOver) return;
        this.registry.set('isCutscenePlaying', false);
        if (this.playerController) this.playerController.enableInputAndPhysics();
        if (this.music && !this.isMuted) {
            if (this.music.isPaused) this.music.resume();
            else if (!this.music.isPlaying) this.music.play();
        }
    }

    private handleBonusCollected(type: string) {
        if (!this.isGameOver && type === 'life' && this.playerController) {
            this.playerController.gainLife();
        }
    }

    private playSound(key: string, config?: Phaser.Types.Sound.SoundConfig) {
        if ((this.isGameOver && key !== 'gvozd_social') || this.isMuted) return;
        const sound = this.sounds[key];
        if (sound) sound.play(config);
    }

    public endGame(isVictory: boolean) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        const score = this.getScore();
        console.log(`CAVE SCENE: endGame. Victory: ${isVictory}, Score: ${score}`);
        if (this.playerController) this.playerController.disableInputAndPhysics();
        if (this.physics) this.physics.pause();
        if (this.tweens) this.tweens.pauseAll();
        if (this.music) this.music.stop();
        if (this.uiManager) {
            this.uiManager.emitGameOver(isVictory, score);
            if (isVictory) console.log("Cave level won! Emitted final victory.");
        } else {
            console.error("Cave UIManager not available to emit game over!");
        }
    }

    private handleCriticalError(error?: any) {
        console.error("!! CRITICAL CAVE SCENE ERROR !!", error);
        if (!this.isGameOver) {
            this.isGameOver = true;
            try {
                if (this.music) this.music.stop();
                if (this.physics) this.physics.pause();
                if (this.playerController) this.playerController.disableInputAndPhysics();
                if (this.tweens) this.tweens.pauseAll();
                if (this.time) this.time.removeAllEvents();
            } catch (e) {
                console.error("Error during critical error cleanup:", e);
            }
            if (this.uiManager) this.uiManager.emitGameOver(false, this.getScore());
            else console.error("Cave UIManager not available during critical error!");
            console.error("Cave game frozen due to critical error!");
        }
    }

    public setMuteState(newMutedState: boolean) {
        this.isMuted = newMutedState;
        this.sound.setMute(this.isMuted);
        if (this.isMuted) {
            this.music?.pause();
        } else {
            if (this.music && !this.scene.isPaused() && !this.isGameOver && this.cutsceneManager && !this.cutsceneManager.isCutsceneActive()) {
                if (this.music.isPaused) {
                    this.music.resume();
                } else if (!this.music.isPlaying) {
                    this.music.play();
                }
            }
        }
        console.log(`Cave game sounds ${this.isMuted ? 'MUTED' : 'UNMUTED'}`);
    }

    public getScore(): number {
        return this.collectiblesManager?.gvozdikiCollected ?? 0;
    }

    public getLives(): number {
        return this.playerController?.getLives() ?? 0;
    }

    public getCurrentDifficulty(): number {
        return this.worldGenerator?.getDifficultyValue() ?? 1;
    }

    public getPlayerControllerInstance(): PlayerController | null {
        return this.playerController ?? null;
    }
}