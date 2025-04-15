import Phaser from 'phaser';
import { PlayerController } from './PlayerController'; // Import PlayerController
import { EnemyManager } from './EnemyManager';
import { CollectiblesManager } from './CollectiblesManager';
import { GameConfig } from '../config/GameConfig'; // Keep config import

export class CollisionManager {
    private scene: Phaser.Scene;
    private playerController: PlayerController; // Ensure this has the required methods
    private enemyManager: EnemyManager;
    private collectiblesManager: CollectiblesManager;
    private config = GameConfig; // Store config reference

    constructor(
        scene: Phaser.Scene,
        playerController: PlayerController, // Make sure the passed instance has the methods
        enemyManager: EnemyManager,
        collectiblesManager: CollectiblesManager
    ) {
        this.scene = scene;
        this.playerController = playerController;
        this.enemyManager = enemyManager;
        this.collectiblesManager = collectiblesManager;
        this.config = GameConfig; // Assign config
    }

    // Setup all collisions
    public setupCollisions(groups: {
        player: Phaser.Physics.Arcade.Sprite,
        ground?: Phaser.Physics.Arcade.StaticGroup | Phaser.Tilemaps.TilemapLayer, // Allow TilemapLayer for ground
        pipes?: Phaser.Physics.Arcade.StaticGroup | Phaser.Tilemaps.TilemapLayer, // Allow TilemapLayer for pipes
        staticPlatforms?: Phaser.Physics.Arcade.StaticGroup | Phaser.Tilemaps.TilemapLayer,
        movingPlatforms?: Phaser.Physics.Arcade.Group,
        blocks?: Phaser.Physics.Arcade.StaticGroup | Phaser.Tilemaps.TilemapLayer,
        zils?: Phaser.Physics.Arcade.Group,
        // cruzaks removed
        dogs?: Phaser.Physics.Arcade.Group,
        bumblebees?: Phaser.Physics.Arcade.Group, // Added bumblebees
        poops?: Phaser.Physics.Arcade.Group,
        gvozdiki?: Phaser.Physics.Arcade.Group,
        money?: Phaser.Physics.Arcade.Group,
        meteors?: Phaser.Physics.Arcade.Group,
        // Add other groups like fireSticks if needed
    }) {
        const player = groups.player; // Player sprite reference
        if (!player) { console.error("CollisionManager: Player sprite missing!"); return; }

        // --- Player and World Solid Objects ---
        // Add checks to ensure groups exist before adding colliders
        if (groups.ground) this.scene.physics.add.collider(player, groups.ground);
        if (groups.pipes) this.scene.physics.add.collider(player, groups.pipes);
        if (groups.staticPlatforms) this.scene.physics.add.collider(player, groups.staticPlatforms);
        if (groups.movingPlatforms) this.scene.physics.add.collider(player, groups.movingPlatforms);
        if (groups.blocks) this.scene.physics.add.collider(
            player, groups.blocks,
            this.playerVsBlockHandler as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined, this
        );

        // --- Player vs Enemies (Collider + ProcessCallback for Stomps) ---
        if (groups.zils) this.scene.physics.add.collider( // Use COLLIDER
            player, groups.zils,
            this.handlePlayerEnemyCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, // Side damage
            this.processPlayerEnemyStomp as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, // Stomp check
            this
        );
        if (groups.dogs) this.scene.physics.add.collider( // Use COLLIDER
            player, groups.dogs,
            this.handlePlayerEnemyCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            this.processPlayerEnemyStomp as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, // Stomp check
            this
        );
        if (groups.bumblebees) this.scene.physics.add.collider( // Bumblebees don't get stomped
             player, groups.bumblebees,
             this.handlePlayerEnemyCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
             undefined, // No stomp process needed
             this
         );

        // --- Player vs Projectiles/Hazards (Overlap) ---
        if (groups.poops) this.scene.physics.add.overlap(player, groups.poops, this.playerVsPoopHandler as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
        if (groups.meteors) this.scene.physics.add.overlap(player, groups.meteors, this.playerVsMeteorHandler as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);

        // --- Player and Collectibles (Overlap) ---
        if (groups.gvozdiki) this.scene.physics.add.overlap(player, groups.gvozdiki, this.playerVsGvozdikHandler as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
        if (groups.money) this.scene.physics.add.overlap(player, groups.money, this.playerVsMoneyHandler as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);

        // --- Enemies and World ---
        const groundEnemyGroups = [groups.zils, groups.dogs];
        groundEnemyGroups.forEach(enemyGroup => {
            if (!enemyGroup) return; // Skip if group doesn't exist
            // Add checks for world groups as well
            if (groups.ground) this.scene.physics.add.collider(enemyGroup, groups.ground);
            if (groups.staticPlatforms) this.scene.physics.add.collider(enemyGroup, groups.staticPlatforms);
            if (groups.movingPlatforms) this.scene.physics.add.collider(enemyGroup, groups.movingPlatforms);
            if (groups.pipes) this.scene.physics.add.collider(enemyGroup, groups.pipes, this.enemyVsPipeHandler as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
        });

        // --- Meteors and World ---
        if (groups.meteors) {
            if (groups.ground) this.scene.physics.add.collider(groups.meteors, groups.ground, this.meteorVsGroundHandler as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
            if (groups.staticPlatforms) this.scene.physics.add.collider(groups.meteors, groups.staticPlatforms, this.meteorVsGroundHandler as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
            if (groups.movingPlatforms) this.scene.physics.add.collider(groups.meteors, groups.movingPlatforms, this.meteorVsGroundHandler as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
            if (groups.pipes) this.scene.physics.add.collider(groups.meteors, groups.pipes, this.meteorVsGroundHandler as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
        }

        console.log("Collision manager setup complete.");
    }

    // --- Collision Handler Methods ---

    /** Process Callback: Checks for player stomping on an enemy (Zil or Dog). Returns true if collision should proceed, false if stomp processed. */
    private processPlayerEnemyStomp(
        playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
    ): boolean {
        const player = playerObj as Phaser.Physics.Arcade.Sprite;
        const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;

        if (!player?.active || !enemy?.active || !player.body || !enemy.body) return false;
        if (!(player.body instanceof Phaser.Physics.Arcade.Body) || !(enemy.body instanceof Phaser.Physics.Arcade.Body)) return false;

        const pBody = player.body; 
        const eBody = enemy.body; 
        const enemyType = enemy.getData('type');

        // Проверка прыжка на врага сверху - теперь для всех типов врагов
        // Уменьшаем порог скорости падения для более легкого определения прыжка
        const isPlayerFalling = pBody.velocity.y > 30; // Уменьшенный порог скорости падения
        const isTouchingTop = pBody.touching.down && eBody.touching.up; // Надежная проверка касания сверху
        const isEnemyAlive = !enemy.getData('isDead');
        
        // Добавляем дополнительную проверку на относительное положение игрока и врага
        const isPlayerAboveEnemy = player.y < enemy.y - enemy.height * 0.3;

        console.log(`Stomp check: falling=${isPlayerFalling}, touching=${isTouchingTop}, alive=${isEnemyAlive}, above=${isPlayerAboveEnemy}`);

        if ((isPlayerFalling && isTouchingTop && isEnemyAlive) || (isPlayerAboveEnemy && isPlayerFalling && isEnemyAlive)) {
            // --- Произошел прыжок на врага ---
            console.log(`Player stomped on ${enemyType}!`);
            this.enemyManager.handleEnemyStomped(enemy, player); // Обработка эффекта прыжка на врага
            
            // Проверка наличия метода перед вызовом
            if (typeof this.playerController.triggerStompBounce === 'function') {
                this.playerController.triggerStompBounce(); // Обработка отскока игрока
            } else {
                console.error("PlayerController missing 'triggerStompBounce' method!");
                pBody.setVelocityY(-this.config.player.stompBounceSpeed); // Запасной вариант отскока
            }
            return false; // Обработка столкновения завершена (прыжок), отключаем стандартное разрешение (урон)
        }
        
        // Разрешаем стандартное столкновение, если не прыжок И враг еще не мертв
        return !enemy.getData('isDead');
    }

    /** Collider Callback: Handles player taking damage from side/bottom collision with any enemy type. */
    private handlePlayerEnemyCollision(
        playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
    ) {
        const player = playerObj as Phaser.Physics.Arcade.Sprite;
        const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;

        if (player?.active && enemy?.active && !enemy.getData('isDead') && this.playerController.canBeHurt()) {
             // FIXED: Check if method exists before calling PlayerController method
             if (typeof this.playerController.handleEnemyCollision === 'function') {
                 this.playerController.handleEnemyCollision(enemy); // Pass enemy for context
             } else {
                 console.error("PlayerController missing 'handleEnemyCollision' method!");
                 this.playerController.applyDamage(); // Fallback to simpler damage method if available
             }

             // Optional: If bumblebee collision should destroy the bumblebee
             if (enemy.getData('type') === 'bumblebee') {
                 this.enemyManager.handleBumblebeeHit(enemy);
             }
        }
    }

    // Handler for player hitting a block from below
    private playerVsBlockHandler(
        playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        blockObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
    ) {
        const player = playerObj as Phaser.Physics.Arcade.Sprite;
        const block = blockObj as Phaser.Physics.Arcade.Sprite | Phaser.Tilemaps.Tile; // Block could be tile or sprite

        // Need to handle both Sprite and Tile cases for block body/properties
        let blockBody: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null = null;
        let blockGameObject: Phaser.GameObjects.GameObject | null = null; // To access getData/setData if it's a sprite

        if (block instanceof Phaser.Physics.Arcade.Sprite && block.body) {
            blockBody = block.body as Phaser.Physics.Arcade.StaticBody; // Assume static blocks
            blockGameObject = block;
        } else if (block instanceof Phaser.Tilemaps.Tile && (block.physics as any).arcade) {
            // Tile collision doesn't usually have a dynamic body in the same way
             // blockBody = block.physics.worldBody; // Accessing internal might be risky
            // Need a different approach for tile data/animation
             console.warn("Tile block collision - bump logic might need adjustment.");
             // For now, let's assume blocks are sprites
             if (!(block instanceof Phaser.Physics.Arcade.Sprite)) return; // Exit if it's a tile and we haven't handled it
             blockBody = block.body as Phaser.Physics.Arcade.StaticBody;
             blockGameObject = block;

        }

        if (!player?.active || !blockBody || !player.body || !(player.body instanceof Phaser.Physics.Arcade.Body)) return;

        const playerBody = player.body;

        // Hit from below
        if (playerBody.blocked.up || playerBody.touching.up) {
            // Use blockGameObject to check/set data if it's a sprite
            if (blockGameObject?.getData('isAnimating')) return;
            blockGameObject?.setData('isAnimating', true);
            this.scene.events.emit('requestSoundPlay', 'blockHit');

            // Perform bump tween only on the GameObject (Sprite)
            if (blockGameObject instanceof Phaser.GameObjects.Sprite) {
                const originalY = blockGameObject.y;
                this.scene.tweens.add({
                    targets: blockGameObject, y: originalY - this.config.blocks.bumpHeight,
                    duration: this.config.blocks.bumpDuration / 2, yoyo: true, ease: 'Power1',
                    onComplete: () => {
                        blockGameObject?.setData('isAnimating', false);
                        if (typeof (this.scene as any).handleBlockHit === 'function') {
                            (this.scene as any).handleBlockHit(blockGameObject, player); // Pass sprite
                        } else { console.warn('Scene does not have handleBlockHit method!'); }
                    }
                });
            } else {
                // Handle tile hit differently if needed (e.g., replace tile)
                if (typeof (this.scene as any).handleBlockHit === 'function') {
                    (this.scene as any).handleBlockHit(block, player); // Pass tile
                }
            }
            // Optional push down
             if (playerBody.velocity.y < 0) playerBody.velocity.y = 10;
        }
    }

    // Handler for player collecting Gvozdik
    private playerVsGvozdikHandler(
        _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        gvozdikObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
    ) {
        const gvozdik = gvozdikObj as Phaser.Physics.Arcade.Sprite;
        if (!gvozdik?.active || gvozdik.getData('isAttracted') || gvozdik.getData('isCollected')) return;
        gvozdik.setData('isCollected', true);
        this.collectiblesManager.handleGvozdikCollected(gvozdik, true);
    }

    // Handler for player collecting Money
    private playerVsMoneyHandler(
        _playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        moneyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
    ) {
        const money = moneyObj as Phaser.Physics.Arcade.Sprite;
        if (!money?.active || money.getData('isCollected')) return;
        money.setData('isCollected', true);
        this.collectiblesManager.handleMoneyCollected(money);
    }

    // Handler for player hitting Poop projectile
    private playerVsPoopHandler(
        playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        poopObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
    ) {
        const player = playerObj as Phaser.Physics.Arcade.Sprite;
        const poop = poopObj as Phaser.Physics.Arcade.Sprite;
        if (!player?.active || !poop?.active) return;
        if (this.playerController.canBeHurt()) { this.playerController.applyDamage(); }
        this.enemyManager.handlePoopHit(poop, player); // Pass player for context if needed
    }

    // Handler for player hitting a Meteor
    private playerVsMeteorHandler(
        playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        meteorObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
    ) {
        const player = playerObj as Phaser.Physics.Arcade.Sprite;
        const meteor = meteorObj as Phaser.Physics.Arcade.Sprite;
        if (!player?.active || !meteor?.active) return;
        if (this.playerController.canBeHurt()) { this.playerController.applyDamage(); }
        this.enemyManager.handleMeteorImpact(meteor, player); // Pass player
    }

    // Handler for Enemy hitting a Pipe (used for reversal)
    private enemyVsPipeHandler(
        enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        pipeObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
    ) {
        const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
        const pipe = pipeObj; // Keep original type for passing
        if (enemy?.active && !enemy.getData('isDead') && this.enemyManager) {
            // Pass original pipe object, let manager handle type if needed
            this.enemyManager.handleEnemyPipeCollision(enemy, pipe as Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject);
        }
    }

    // Handler for Meteor hitting Ground/Platforms/Pipes
    private meteorVsGroundHandler(
        meteorObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        groundObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
    ) {
        const meteor = meteorObj as Phaser.Physics.Arcade.Sprite;
        if (!meteor?.active) return;
        if (this.enemyManager) {
            // Pass original ground object, let manager handle type if needed
            this.enemyManager.handleMeteorImpact(meteor, groundObj); // Pass original ground object
        }
    }
}