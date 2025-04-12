import Phaser from 'phaser';
import { PlayerController } from './PlayerController';
import { EnemyManager } from './EnemyManager';
import { CollectiblesManager } from './CollectiblesManager';
import { GameConfig } from '../config/GameConfig'; // Import for player bounce

export class CollisionManager {
    private scene: Phaser.Scene;
    private playerController: PlayerController;
    private enemyManager: EnemyManager;
    private collectiblesManager: CollectiblesManager;

    constructor(
        scene: Phaser.Scene,
        playerController: PlayerController,
        enemyManager: EnemyManager,
        collectiblesManager: CollectiblesManager
    ) {
        this.scene = scene;
        this.playerController = playerController;
        this.enemyManager = enemyManager;
        this.collectiblesManager = collectiblesManager;
    }

    // Setup all collisions (called once in scene create)
    public setupCollisions(groups: {
        player: Phaser.Physics.Arcade.Sprite,
        ground: Phaser.Physics.Arcade.StaticGroup,
        pipes: Phaser.Physics.Arcade.StaticGroup,
        staticPlatforms: Phaser.Physics.Arcade.StaticGroup,
        movingPlatforms: Phaser.Physics.Arcade.Group,
        // Blocks are handled separately in GvozdScene using worldGenerator.handlePlayerBlockHit
        zils: Phaser.Physics.Arcade.Group,
        cruzaks: Phaser.Physics.Arcade.Group,
        dogs: Phaser.Physics.Arcade.Group,
        poops: Phaser.Physics.Arcade.Group,
        gvozdiki: Phaser.Physics.Arcade.Group,
        money: Phaser.Physics.Arcade.Group,
        meteors: Phaser.Physics.Arcade.Group,
        fireSticks: Phaser.Physics.Arcade.Group
    }) {
        const player = groups.player;

        // --- Player and World ---
        this.scene.physics.add.collider(player, groups.ground);
        this.scene.physics.add.collider(player, groups.pipes);
        this.scene.physics.add.collider(player, groups.staticPlatforms);
        this.scene.physics.add.collider(player, groups.movingPlatforms);

        // --- Player and Hazards ---
        this.scene.physics.add.overlap(player, groups.zils, this.playerVsZilHandler, undefined, this);
        this.scene.physics.add.overlap(player, groups.cruzaks, this.playerVsCruzakHandler, undefined, this);
        this.scene.physics.add.overlap(player, groups.dogs, this.playerVsDogHandler, undefined, this);
        this.scene.physics.add.overlap(player, groups.poops, this.playerVsPoopHandler, undefined, this);
        this.scene.physics.add.overlap(player, groups.meteors, this.playerVsMeteorHandler, undefined, this);
        this.scene.physics.add.overlap(player, groups.fireSticks, this.playerVsFireStickHandler, undefined, this);

        // --- Player and Collectibles ---
        this.scene.physics.add.overlap(player, groups.gvozdiki, this.playerVsGvozdikHandler, undefined, this);
        this.scene.physics.add.overlap(player, groups.money, this.playerVsMoneyHandler, undefined, this);

        // --- Enemies and World ---
        // Zils
        this.scene.physics.add.collider(groups.zils, groups.ground);
        this.scene.physics.add.collider(groups.zils, groups.staticPlatforms);
        this.scene.physics.add.collider(groups.zils, groups.movingPlatforms);
        this.scene.physics.add.collider(groups.zils, groups.pipes, this.enemyVsPipeHandler, undefined, this);
        // Cruzaks
        this.scene.physics.add.collider(groups.cruzaks, groups.ground);
        this.scene.physics.add.collider(groups.cruzaks, groups.staticPlatforms);
        this.scene.physics.add.collider(groups.cruzaks, groups.movingPlatforms);
        this.scene.physics.add.collider(groups.cruzaks, groups.pipes, this.enemyVsPipeHandler, undefined, this);
        // Dogs
        this.scene.physics.add.collider(groups.dogs, groups.ground);
        this.scene.physics.add.collider(groups.dogs, groups.staticPlatforms);
        this.scene.physics.add.collider(groups.dogs, groups.movingPlatforms);
        this.scene.physics.add.collider(groups.dogs, groups.pipes); // Dogs turn on pipes like other enemies
        // Meteors
        this.scene.physics.add.collider(groups.meteors, groups.ground, this.meteorVsGroundHandler, undefined, this);
        this.scene.physics.add.collider(groups.meteors, groups.staticPlatforms, this.meteorVsGroundHandler, undefined, this);
        this.scene.physics.add.collider(groups.meteors, groups.movingPlatforms, this.meteorVsGroundHandler, undefined, this);
        this.scene.physics.add.collider(groups.meteors, groups.pipes, this.meteorVsGroundHandler, undefined, this);

        console.log("Collision manager setup complete.");
    }

    // --- Collision Handlers (private) ---

    private playerVsZilHandler(playerObj: any, zilObj: any) {
        const player = playerObj as Phaser.Physics.Arcade.Sprite;
        const zil = zilObj as Phaser.Physics.Arcade.Sprite;
        if (!player.active || !zil.active || !player.body || !zil.body || zil.getData('isDead') || !this.playerController.canBeHurt()) return;

        const playerBottom = player.body.bottom;
        const zilTop = zil.body.top;
        const playerVelocityY = player.body.velocity.y;

        // Check if player is falling onto the zil (stomp)
        if (playerVelocityY > 50 && playerBottom <= zilTop + 15) { // 15px threshold for stomp
            this.enemyManager.handleZilStomped(zil);
            const bounceMultiplier = this.playerController.isPlayerPoweredUp() ? GameConfig.player.powerUpJumpMultiplier : 1;
            // FIX: Use the correct stompBounceSpeed property from GameConfig
            player.setVelocityY(GameConfig.player.stompBounceSpeed * bounceMultiplier);
            this.scene.events.emit('requestSoundPlay', 'enemyStomp'); // Play stomp sound via event
        } else {
            this.playerController.applyDamage();
        }
    }

    private playerVsCruzakHandler(playerObj: any, cruzakObj: any) {
         const player = playerObj as Phaser.Physics.Arcade.Sprite;
         const cruzak = cruzakObj as Phaser.Physics.Arcade.Sprite;
         if (!player.active || !cruzak.active || !player.body || !cruzak.body || !this.playerController.canBeHurt()) return;
         // console.log("Collision with Cruzer!");
         this.playerController.applyDamage();
         // Cruzer is heavy, maybe stronger shake
         // this.scene.cameras.main.shake(120, 0.006);
    }

    private playerVsDogHandler(playerObj: any, dogObj: any) {
        const player = playerObj as Phaser.Physics.Arcade.Sprite;
        const dog = dogObj as Phaser.Physics.Arcade.Sprite;
        if (!player.active || !dog.active || !player.body || !dog.body || !this.playerController.canBeHurt()) return;
        // console.log("Collision with Dog!");
        this.playerController.applyDamage();
    }

     private playerVsPoopHandler(playerObj: any, poopObj: any) {
         const player = playerObj as Phaser.Physics.Arcade.Sprite;
         const poop = poopObj as Phaser.Physics.Arcade.Sprite;
         if (!player.active || !poop.active || !this.playerController.canBeHurt()) return;
         // console.log("Hit by Poop!");
         this.playerController.applyDamage();
         this.enemyManager.handlePoopHit(poop); // Let EnemyManager handle poop destruction/effect
     }

     // FIX: Prefixed unused parameter
     private playerVsGvozdikHandler(_playerObj: any, gvozdikObj: any) {
        const gvozdik = gvozdikObj as Phaser.Physics.Arcade.Sprite;
         // Prevent collection if already being attracted (prevents double count)
         if (!gvozdik.active || gvozdik.getData('isAttracted')) return;
         this.collectiblesManager.handleGvozdikCollected(gvozdik, true); // Pass true to show visual effect
     }

     // FIX: Prefixed unused parameter
     private playerVsMoneyHandler(_playerObj: any, moneyObj: any) {
         const money = moneyObj as Phaser.Physics.Arcade.Sprite;
         if (!money.active) return;
         this.collectiblesManager.handleMoneyCollected(money);
     }

    private playerVsMeteorHandler(playerObj: any, meteorObj: any) {
         const player = playerObj as Phaser.Physics.Arcade.Sprite;
         const meteor = meteorObj as Phaser.Physics.Arcade.Sprite;
         if (!player.active || !meteor.active || !this.playerController.canBeHurt()) return;
         // console.log("Player hit by Meteor!");
         this.playerController.applyDamage();
         this.enemyManager.handleMeteorImpact(meteor); // Meteor explodes on impact
    }

    private playerVsFireStickHandler(playerObj: any, fireStickObj: any) {
        const player = playerObj as Phaser.Physics.Arcade.Sprite;
        const fireStick = fireStickObj as Phaser.GameObjects.Sprite; // It's likely a GO Sprite, not physics sprite
        if (!player.active || !fireStick.active || !this.playerController.canBeHurt()) return;
        // console.log("Player hit by Fire Stick!");
        this.playerController.applyDamage();
        // Optional: Add visual/sound effect for burn
        // this.scene.events.emit('requestSoundPlay', 'burnSound'); // Need to load 'burnSound'
    }

    // FIX: Prefixed unused parameter
     private enemyVsPipeHandler(enemyObj: any, _pipeObj: any) {
        const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
        // Delegate to EnemyManager to handle turning logic
        this.enemyManager.handleEnemyPipeCollision(enemy);
     }

    // FIX: Prefixed unused parameter
    private meteorVsGroundHandler(meteorObj: any, _groundObj: any) {
        const meteor = meteorObj as Phaser.Physics.Arcade.Sprite;
        if (!meteor.active) return;
        // Let EnemyManager handle impact effect and destruction
        this.enemyManager.handleMeteorImpact(meteor);
    }
}