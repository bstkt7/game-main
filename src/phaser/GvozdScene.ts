import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';
import { PlayerController } from './managers/PlayerController';
import { WorldGenerator } from './managers/WorldGenerator';
import { EnemyManager } from './managers/EnemyManager';
import { CollectiblesManager } from './managers/CollectiblesManager';
import { CollisionManager } from './managers/CollisionManager';
import { CutsceneManager } from './managers/CutsceneManager';
import { UIManager } from './managers/UIManager';

export class GvozdScene extends Phaser.Scene {
    private playerController!: PlayerController;
    private worldGenerator!: WorldGenerator;
    private enemyManager!: EnemyManager;
    private collectiblesManager!: CollectiblesManager;
    private collisionManager!: CollisionManager;
    private cutsceneManager!: CutsceneManager;
    private uiManager!: UIManager;
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
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
    private fireSticksGroup!: Phaser.Physics.Arcade.Group;
    private gvozdikiGroup!: Phaser.Physics.Arcade.Group;
    private moneyGroup!: Phaser.Physics.Arcade.Group;
    private cloudsGroup!: Phaser.Physics.Arcade.Group;
    // Other Objects
    private background!: Phaser.GameObjects.Image;
    private topBar!: Phaser.GameObjects.Rectangle;
    private bottomBar!: Phaser.GameObjects.Rectangle;
    private music!: Phaser.Sound.BaseSound;
    private sounds: { [key: string]: Phaser.Sound.BaseSound } = {};
    // State
    private isGameOver = false;
    private isMuted: boolean = false;
    private lastCleanupTime = 0;

    constructor() { super({ key: 'GvozdScene' }); }

    init(data: { muted?: boolean }) {
        this.isMuted = data.muted ?? false;
        this.isGameOver = false;
        this.lastCleanupTime = 0;
        // Reset registry (important for scene restarts)
        this.registry.set('gvozdikiCollected', 0);
        this.registry.set('lives', GameConfig.player.initialLives);
        this.registry.set('isCutscenePlaying', false);
        console.log('GvozdScene init. Muted state:', this.isMuted);
    }

    preload() {
        console.log('GvozdScene Preload starting...');
        const basePath = '/assets/gvozd/';
        try {
            // Images
            this.load.image('background', `${basePath}bg.png`);
            this.load.image('ground', `${basePath}ground.png`);
            this.load.image('pipe', `${basePath}pipe.png`);
            this.load.image('platform', `${basePath}platform.png`);
            this.load.image('cloud', `${basePath}cloud.png`);
            this.load.image('flagpole', `${basePath}flagpole.png`);
            this.load.image('gvozdik', `${basePath}gvozdik.png`);
            this.load.image('money', `${basePath}money.png`);
            this.load.image('life', `${basePath}life.png`); // Bonus item
            this.load.image('zil', `${basePath}zil.png`);
            this.load.image('zil_fast', `${basePath}zil.png`);
            this.load.image('zil_big', `${basePath}zil.png`);
            this.load.image('cruzak', `${basePath}cruzak.png`);
            this.load.image('poop', `${basePath}poop.png`);
            this.load.image('meteor', `${basePath}meteor.png`);
            this.load.image('fire_palka', `${basePath}fire_palka.png`);
            for (let i = 1; i <= 4; i++) { this.load.image(`r${i}`, `${basePath}r${i}.png`); }
            for (let i = 1; i <= 4; i++) { this.load.image(`j${i}`, `${basePath}j${i}.png`); }
            for (let i = 1; i <= 4; i++) { this.load.image(`i${i}`, `${basePath}i${i}.png`); }
            for (let i = 1; i <= 4; i++) { this.load.image(`d${i}`, `${basePath}d${i}.png`); }
            this.load.image('block', `${basePath}block.png`);
            this.load.image('bonus_block', `${basePath}bonus_block.png`);
            this.load.image('used_block', `${basePath}used_block.png`);
            this.load.image('babka', `${basePath}babka.png`);
            this.load.image('photo', `${basePath}photo.png`);
            this.load.image('gramota', `${basePath}gramota.png`);

            // Audio
            this.load.audio('bgm', [`${basePath}bg.mp3`, `${basePath}bg.ogg`]);
            this.load.audio('collect', [`${basePath}collect.wav`, `${basePath}collect.mp3`]);
            this.load.audio('jump', [`${basePath}jump.wav`, `${basePath}jump.mp3`]);
            this.load.audio('playerDamage', [`${basePath}player_damage.wav`, `${basePath}player_damage.mp3`]);
            this.load.audio('enemyStomp', [`${basePath}enemy_stomp.wav`, `${basePath}enemy_stomp.mp3`]);
            this.load.audio('blockHit', [`${basePath}block_hit.wav`, `${basePath}block_hit.mp3`]);
            this.load.audio('blockBonus', [`${basePath}block_bonus.wav`, `${basePath}block_bonus.mp3`]);
            this.load.audio('powerUp', [`${basePath}power_up.wav`, `${basePath}power_up.mp3`]);
            this.load.audio('powerDown', [`${basePath}power_down.wav`, `${basePath}power_down.mp3`]);
            this.load.audio('zil_death', [`${basePath}zil_death.wav`, `${basePath}zil_death.mp3`]);
            this.load.audio('gvozd_social', [`${basePath}gvozd_social.mp3`, `${basePath}gvozd_social.ogg`]);
            this.load.audio('photo_sound', [`${basePath}photo.mp3`, `${basePath}photo.ogg`]);
            this.load.audio('meteor_impact', [`${basePath}meteor_impact.wav`, `${basePath}meteor_impact.mp3`]);

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
            this.cursors = this.input.keyboard!.createCursorKeys();
            this.input.addPointer(2);

            // Background & Groups
            this.background = this.add.image(0, 0, 'background').setOrigin(0).setScrollFactor(0).setDepth(-10);
            this.groundGroup = this.physics.add.staticGroup();
            this.pipesGroup = this.physics.add.staticGroup();
            this.staticPlatformsGroup = this.physics.add.staticGroup();
            this.movingPlatformsGroup = this.physics.add.group({ immovable: true, allowGravity: false });
            this.blocksGroup = this.physics.add.staticGroup();
            this.flagpoleGroup = this.physics.add.staticGroup();
            this.zilsGroup = this.physics.add.group({ runChildUpdate: false });
            this.cruzaksGroup = this.physics.add.group({ runChildUpdate: false });
            this.dogsGroup = this.physics.add.group({ runChildUpdate: false });
            this.gvozdikiGroup = this.physics.add.group({ runChildUpdate: false, allowGravity: false });
            this.moneyGroup = this.physics.add.group({ allowGravity: false });
            this.poopsGroup = this.physics.add.group({ allowGravity: false });
            this.meteorsGroup = this.physics.add.group({ allowGravity: false, maxSize: GameConfig.maxObjects.meteors });
            this.fireSticksGroup = this.physics.add.group({ allowGravity: false }); // Group for overlap checks
            this.cloudsGroup = this.physics.add.group({ allowGravity: false, immovable: true, maxSize: GameConfig.maxObjects.clouds });

            // Cutscene Bars
            this.topBar = this.add.rectangle(GameConfig.gameWidth / 2, -GameConfig.cutscene.barHeight / 2, GameConfig.gameWidth, GameConfig.cutscene.barHeight, 0x000000).setScrollFactor(0).setDepth(150).setVisible(false).setAlpha(0.8);
            this.bottomBar = this.add.rectangle(GameConfig.gameWidth / 2, GameConfig.gameHeight + GameConfig.cutscene.barHeight / 2, GameConfig.gameWidth, GameConfig.cutscene.barHeight, 0x000000).setScrollFactor(0).setDepth(150).setVisible(false).setAlpha(0.8);

            // Player
            this.player = this.physics.add.sprite(100, GameConfig.ground.top - 50, GameConfig.player.idleFrames[0]).setScale(GameConfig.player.scale).setDepth(GameConfig.player.depth).setCollideWorldBounds(true);
            if (this.player.body instanceof Phaser.Physics.Arcade.Body) {
                this.player.body.gravity.y = GameConfig.player.gravityY;
            } else { throw new Error("Player physics body not created!"); }

            // Managers
            this.playerController = new PlayerController(this, this.player, this.cursors);
            this.collectiblesManager = new CollectiblesManager(this, { gvozdiki: this.gvozdikiGroup, money: this.moneyGroup }, this.playerController);
            this.enemyManager = new EnemyManager(this, { zils: this.zilsGroup, cruzaks: this.cruzaksGroup, dogs: this.dogsGroup, poops: this.poopsGroup, meteors: this.meteorsGroup }, this.playerController);
            // FIX: Pass 'this.player' as the 5th argument to WorldGenerator
            this.worldGenerator = new WorldGenerator(this, { ground: this.groundGroup, pipes: this.pipesGroup, staticPlatforms: this.staticPlatformsGroup, movingPlatforms: this.movingPlatformsGroup, fireSticks: this.fireSticksGroup, flagpole: this.flagpoleGroup, blocks: this.blocksGroup }, this.enemyManager, this.collectiblesManager, this.player);
            this.collisionManager = new CollisionManager(this, this.playerController, this.enemyManager, this.collectiblesManager);
            this.cutsceneManager = new CutsceneManager(this, this.playerController, [this.pipesGroup, this.staticPlatformsGroup, this.movingPlatformsGroup, this.blocksGroup, this.zilsGroup, this.cruzaksGroup, this.dogsGroup, this.poopsGroup, this.gvozdikiGroup, this.moneyGroup, this.meteorsGroup, this.fireSticksGroup], { top: this.topBar, bottom: this.bottomBar });
            this.uiManager = new UIManager(this); // UI manager relies on registry events

            // Camera & Sound
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            this.cameras.main.setFollowOffset(-150, 50);
            this.cameras.main.setDeadzone(100, 50);
            this.music = this.sound.add('bgm', { loop: true, volume: GameConfig.soundVolumes.bgm });
            Object.keys(GameConfig.soundVolumes).forEach(key => {
                if (key !== 'bgm' && this.cache.audio.exists(key)) {
                    this.sounds[key] = this.sound.add(key, { volume: GameConfig.soundVolumes[key as keyof typeof GameConfig.soundVolumes] });
                }
            });
            this.setMuteState(this.isMuted); // Apply initial mute state AFTER sounds are loaded

            // Initial World
            this.worldGenerator.createInitialGround();
            for (let i = 0; i < GameConfig.clouds.count; i++) { this.createCloud(Phaser.Math.Between(0, GameConfig.gameWidth)); }

            // Collisions
            this.collisionManager.setupCollisions({
                player: this.player, ground: this.groundGroup, pipes: this.pipesGroup,
                staticPlatforms: this.staticPlatformsGroup, movingPlatforms: this.movingPlatformsGroup,
                zils: this.zilsGroup, cruzaks: this.cruzaksGroup, dogs: this.dogsGroup,
                poops: this.poopsGroup, gvozdiki: this.gvozdikiGroup, money: this.moneyGroup,
                meteors: this.meteorsGroup, fireSticks: this.fireSticksGroup
            });
            // Player vs Blocks
            this.physics.add.collider(this.player, this.blocksGroup, (playerHit, blockHit) => {
                if (playerHit instanceof Phaser.Physics.Arcade.Sprite && blockHit instanceof Phaser.GameObjects.GameObject) {
                    this.worldGenerator.handlePlayerBlockHit(playerHit, blockHit);
                }
            }, undefined, this);
            // Player vs Flagpole
            this.physics.add.overlap(this.player, this.flagpoleGroup, (_playerObj, _flagpoleObj) => { // FIX: Underscore unused params
                if (!this.isGameOver && !this.cutsceneManager.isCutsceneActive()) {
                    console.log("Player reached flagpole!"); this.endGame(true);
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
        if (this.isGameOver || this.scene.isPaused()) return;
        if (this.cutsceneManager.isCutsceneActive()) {
            // Cutscene manager might use tweens/timers, no direct update needed unless specified
            return;
        }

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

            // Update Managers (pass delta if needed, otherwise use _)
            this.playerController.update(time, delta); // Player likely uses delta
            this.enemyManager.update(time, delta);     // Enemy manager might use delta
            this.collectiblesManager.update(time, delta); // Collectibles manager might use delta

            // World Generation
            const generationThreshold = camRight + GameConfig.generationLookahead;
            this.worldGenerator.updateDifficulty(playerX, this.collectiblesManager.gvozdikiCollected);
            this.worldGenerator.checkAndGenerate(time, generationThreshold, playerX);
            this.worldGenerator.ensureGroundExists(generationThreshold + GameConfig.ground.width);

            // Environment
            this.updateClouds(delta, camLeft, camRight);

            // Cleanup
            if (time - this.lastCleanupTime > GameConfig.cleanupDelay) {
                this.cleanupObjects(camLeft); this.lastCleanupTime = time;
            }

        } catch (error) {
            console.error('Error during GvozdScene Update loop:', error);
            this.handleCriticalError(error);
        }
    }

    private handlePlayerDied() {
        if (this.isGameOver) return;
        this.playSound('playerDamage'); this.endGame(false);
    }
    private handleStartCutscene() {
        if (this.cutsceneManager.isCutsceneActive() || this.cutsceneManager.hasCutscenePlayed() || this.isGameOver) return;
        this.music?.pause(); this.registry.set('isCutscenePlaying', true); this.cutsceneManager.start();
    }
    private handleCutsceneFinished() {
        if (this.isGameOver) return;
        this.registry.set('isCutscenePlaying', false); this.playerController?.enableInputAndPhysics();
        if (this.music && !this.isMuted) { if (this.music.isPaused) this.music.resume(); else if (!this.music.isPlaying) this.music.play(); }
    }
    private handleBonusCollected(type: string) {
        if (this.isGameOver) return;
        if (type === 'life') {
            // FIX: Call gainLife which MUST exist on PlayerController
            this.playerController?.gainLife();
            // UI update is handled by UIManager listening to registry changes
        }
    }
    private playSound(key: string, config?: Phaser.Types.Sound.SoundConfig) {
        if (this.isGameOver && key !== 'gvozd_social') return;
        const sound = this.sounds[key];
        if (sound && !this.isMuted) { sound.play(config); }
    }

    public endGame(isVictory: boolean) {
        if (this.isGameOver) return; this.isGameOver = true;
        const score = this.getScore(); console.log(`SCENE: endGame. Victory: ${isVictory}, Score: ${score}`);
        this.playerController?.disableInputAndPhysics(); this.physics.pause(); this.tweens.pauseAll(); this.music?.stop();
        this.uiManager?.emitGameOver(isVictory, score);
    }
    private handleCriticalError(error?: any) {
        console.error("!! CRITICAL SCENE ERROR !!", error);
        if (!this.isGameOver) {
             this.isGameOver = true;
             try { this.music?.stop(); this.physics?.pause(); this.playerController?.disableInputAndPhysics(); this.tweens?.pauseAll(); this.time?.removeAllEvents(); }
             catch (e) { console.error("Error during critical error handling:", e); }
             this.uiManager?.emitGameOver(false, this.getScore()); console.error("Game frozen!");
        }
    }

    public setMuteState(newMutedState: boolean) {
        this.isMuted = newMutedState; this.sound.setMute(this.isMuted);
        if (this.isMuted) { this.music?.pause(); }
        else { if (this.music && !this.scene.isPaused() && !this.isGameOver && !this.cutsceneManager?.isCutsceneActive()) { if (this.music.isPaused) { this.music.resume(); } else if (!this.music.isPlaying) { this.music.play(); } } }
        console.log(`Game sounds ${this.isMuted ? 'MUTED' : 'UNMUTED'}`);
    }

    public getScore(): number { return this.collectiblesManager?.gvozdikiCollected ?? 0; }
    public getLives(): number { return this.playerController?.getLives() ?? 0; }
    public getCurrentDifficulty(): number { return this.worldGenerator?.getDifficultyValue() ?? 1; }
    public getPlayerControllerInstance(): PlayerController | null { return this.playerController ?? null; }

    private updateClouds(delta: number, camLeft: number, camRight: number) {
         Phaser.Actions.Call(this.cloudsGroup.getChildren(), (cloudGO) => {
             const cloud = cloudGO as Phaser.GameObjects.Sprite; if (!cloud?.active) return;
             const cloudRightEdge = cloud.x + cloud.displayWidth * (1 - cloud.originX);
             if (cloudRightEdge < camLeft) {
                 const randomOffsetX = Phaser.Math.Between(100, 300); const scrollFactor = Phaser.Math.FloatBetween(GameConfig.clouds.minScroll, GameConfig.clouds.maxScroll);
                 cloud.x = camRight + randomOffsetX; cloud.y = Phaser.Math.Between(GameConfig.clouds.minY, GameConfig.clouds.maxY);
                 cloud.setScrollFactor(scrollFactor, 1); cloud.setAlpha(Phaser.Math.FloatBetween(GameConfig.clouds.minAlpha, GameConfig.clouds.maxAlpha)); cloud.setScale(Phaser.Math.FloatBetween(GameConfig.clouds.minScale, GameConfig.clouds.maxScale));
                 const speed = Phaser.Math.Between(GameConfig.clouds.minSpeed, GameConfig.clouds.maxSpeed) * scrollFactor;
                 if (cloud.body instanceof Phaser.Physics.Arcade.Body) { cloud.body.setVelocityX(speed); }
                 else { console.warn("Cloud missing body!"); if(!cloud.body) this.physics.world.enableBody(cloud, Phaser.Physics.Arcade.DYNAMIC_BODY); if(cloud.body instanceof Phaser.Physics.Arcade.Body){ cloud.body.setAllowGravity(false); cloud.body.setVelocityX(speed); cloud.body.immovable = true; } }
             }
         }, this);
         if (this.cloudsGroup.countActive(true) < GameConfig.maxObjects.clouds) { if (Math.random() < GameConfig.clouds.creationChance * (delta / 1000)) { this.createCloud(); } }
    }
    private createCloud(x?: number, y?: number): Phaser.GameObjects.Sprite | null {
         if (this.cloudsGroup.countActive(true) >= GameConfig.maxObjects.clouds) return null;
         const camRight = this.cameras.main.worldView.right; const spawnX = x ?? camRight + Phaser.Math.Between(50, 200); const spawnY = y ?? Phaser.Math.Between(GameConfig.clouds.minY, GameConfig.clouds.maxY);
         const scrollFactor = Phaser.Math.FloatBetween(GameConfig.clouds.minScroll, GameConfig.clouds.maxScroll); const alpha = Phaser.Math.FloatBetween(GameConfig.clouds.minAlpha, GameConfig.clouds.maxAlpha); const scale = Phaser.Math.FloatBetween(GameConfig.clouds.minScale, GameConfig.clouds.maxScale); const speed = Phaser.Math.Between(GameConfig.clouds.minSpeed, GameConfig.clouds.maxSpeed) * scrollFactor;
         const cloud = this.cloudsGroup.create(spawnX, spawnY, 'cloud') as Phaser.GameObjects.Sprite; if (!cloud) return null;
         cloud.setAlpha(alpha).setScale(scale).setDepth(GameConfig.clouds.depth).setScrollFactor(scrollFactor, 1);
         if (cloud.body instanceof Phaser.Physics.Arcade.Body) { cloud.body.setAllowGravity(false); cloud.body.setVelocityX(speed); cloud.body.immovable = true; }
         else { console.warn("New cloud missing body!"); this.physics.world.enableBody(cloud, Phaser.Physics.Arcade.DYNAMIC_BODY); if (cloud.body instanceof Phaser.Physics.Arcade.Body) { cloud.body.setAllowGravity(false); cloud.body.setVelocityX(speed); cloud.body.immovable = true; } }
         return cloud;
    }

   private cleanupObjects(cameraLeftEdge: number) {
        if (this.cutsceneManager?.isCutsceneActive() || this.isGameOver) return;
        const buffer = GameConfig.cleanupBuffer; const cleanupLimitX = cameraLeftEdge - buffer;
        const cleanupGroup = (group: Phaser.Physics.Arcade.Group | Phaser.Physics.Arcade.StaticGroup | null) => {
             if (!group?.getChildren) return;
             group.getChildren().forEach((child: any) => {
                 if (child?.active && typeof child.x === 'number') {
                      const width = child.displayWidth ?? child.width ?? 0; const originX = child.originX ?? 0.5; const childRightEdge = child.x + width * (1 - originX);
                      if (childRightEdge < cleanupLimitX) {
                          if (group === this.movingPlatformsGroup) { this.tweens.killTweensOf(child); }
                          else if (group === this.gvozdikiGroup) { this.collectiblesManager?.removeGvozdikTween(child as Phaser.Physics.Arcade.Sprite); }
                          else if (group === this.fireSticksGroup) { this.tweens.killTweensOf(child); /* WorldGen handles internal array */ }
                          child.destroy();
                      }
                 }
             });
        };
        try {
            cleanupGroup(this.groundGroup); cleanupGroup(this.pipesGroup); cleanupGroup(this.staticPlatformsGroup); cleanupGroup(this.movingPlatformsGroup); cleanupGroup(this.blocksGroup); cleanupGroup(this.gvozdikiGroup); cleanupGroup(this.moneyGroup); cleanupGroup(this.zilsGroup); cleanupGroup(this.cruzaksGroup); cleanupGroup(this.dogsGroup); cleanupGroup(this.poopsGroup); cleanupGroup(this.meteorsGroup); cleanupGroup(this.fireSticksGroup);
        } catch (e) { console.error('Error during object cleanup:', e); }
   }

    shutdown() {
        console.log('GvozdScene Shutdown initiated...');
        this.events.off('playerDied', this.handlePlayerDied, this);
        this.events.off('startCutscene', this.handleStartCutscene, this);
        this.events.off('cutsceneFinished', this.handleCutsceneFinished, this);
        this.events.off('bonusCollected', this.handleBonusCollected, this);
        this.events.off('requestSoundPlay', this.playSound, this);
        this.sound.stopAll(); this.tweens.killAll(); this.time.removeAllEvents();
        this.groundGroup?.destroy(true); this.pipesGroup?.destroy(true); this.staticPlatformsGroup?.destroy(true); this.movingPlatformsGroup?.destroy(true); this.blocksGroup?.destroy(true); this.gvozdikiGroup?.destroy(true); this.moneyGroup?.destroy(true); this.zilsGroup?.destroy(true); this.cruzaksGroup?.destroy(true); this.dogsGroup?.destroy(true); this.poopsGroup?.destroy(true); this.meteorsGroup?.destroy(true); this.fireSticksGroup?.destroy(true); this.cloudsGroup?.destroy(true); this.flagpoleGroup?.destroy(true);
        this.playerController = null!; this.worldGenerator = null!; this.enemyManager = null!; this.collectiblesManager = null!; this.collisionManager = null!; this.cutsceneManager = null!; this.uiManager?.shutdown(); this.uiManager = null!; // Shutdown UIManager too
        this.player?.destroy(); this.player = null!; this.background?.destroy(); this.background = null!; this.topBar?.destroy(); this.topBar = null!; this.bottomBar?.destroy(); this.bottomBar = null!;
        this.cursors = null!; this.music = null!; this.sounds = {};
        this.registry.destroy(); // Destroy scene-specific registry
        console.log('GvozdScene Shutdown completed.');
    }
}