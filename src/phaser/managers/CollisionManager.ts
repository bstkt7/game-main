import Phaser from 'phaser';
import { PlayerController } from './PlayerController';
import { EnemyManager } from './EnemyManager';
import { CollectiblesManager } from './CollectiblesManager';
import { GameConfig } from '../config/GameConfig';
// Убираем импорт GvozdScene, так как используем Phaser.Scene
// import { GvozdScene } from '../GvozdScene';

export class CollisionManager {
    // !!!!! ИСПРАВЛЕНО: Тип сцены изменен на Phaser.Scene !!!!!
    private scene: Phaser.Scene;
    private playerController: PlayerController;
    private enemyManager: EnemyManager;
    private collectiblesManager: CollectiblesManager;

        constructor(
            // !!!!! ИСПРАВЛЕНО: Тип сцены изменен на Phaser.Scene !!!!!
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
        blocks: Phaser.Physics.Arcade.StaticGroup,
        zils: Phaser.Physics.Arcade.Group,
        cruzaks: Phaser.Physics.Arcade.Group,
        dogs: Phaser.Physics.Arcade.Group,
        poops: Phaser.Physics.Arcade.Group,
        gvozdiki: Phaser.Physics.Arcade.Group,
        money: Phaser.Physics.Arcade.Group,
        meteors: Phaser.Physics.Arcade.Group,
        // Добавьте flagpoleGroup, если нужно обрабатывать коллизии с ним здесь
    }) {
        const player = groups.player;

        // --- Player and World ---
        this.scene.physics.add.collider(player, groups.ground);
        this.scene.physics.add.collider(player, groups.pipes);
        this.scene.physics.add.collider(player, groups.staticPlatforms);
        this.scene.physics.add.collider(player, groups.movingPlatforms);
        // Используем проверку типа для доступа к handleBlockHit, если он специфичен для сцены
        this.scene.physics.add.collider(
            player,
            groups.blocks,
            this.playerVsBlockHandler as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, // Явное приведение типа для уверенности
            undefined,
            this
        );


        // --- Player and Hazards ---
        this.scene.physics.add.overlap(player, groups.zils, this.playerVsZilHandler, undefined, this);
        this.scene.physics.add.overlap(player, groups.cruzaks, this.playerVsCruzakHandler, undefined, this);
        this.scene.physics.add.overlap(player, groups.dogs, this.playerVsDogHandler, undefined, this);
        this.scene.physics.add.overlap(player, groups.poops, this.playerVsPoopHandler, undefined, this);
        this.scene.physics.add.overlap(player, groups.meteors, this.playerVsMeteorHandler, undefined, this);
        // Добавить коллизию с огненными палками, если нужно обрабатывать через физику (сейчас через update)


        // --- Player and Collectibles ---
        this.scene.physics.add.overlap(player, groups.gvozdiki, this.playerVsGvozdikHandler, undefined, this);
        this.scene.physics.add.overlap(player, groups.money, this.playerVsMoneyHandler, undefined, this);

        // --- Enemies and World ---
        const enemyGroups = [groups.zils, groups.cruzaks, groups.dogs];
        //const worldGroups = [groups.ground, groups.staticPlatforms, groups.movingPlatforms, groups.pipes];

        enemyGroups.forEach(enemyGroup => {
             if(!enemyGroup) return; // Проверка на случай, если группа не передана
             this.scene.physics.add.collider(enemyGroup, groups.ground);
             this.scene.physics.add.collider(enemyGroup, groups.staticPlatforms);
             this.scene.physics.add.collider(enemyGroup, groups.movingPlatforms);
             // Коллизия с трубами (для разворота)
             this.scene.physics.add.collider(enemyGroup, groups.pipes, this.enemyVsPipeHandler, undefined, this);
             // Коллизия врагов между собой (опционально)
             // this.scene.physics.add.collider(enemyGroup, enemyGroup);
        });


        // Meteors
        this.scene.physics.add.collider(groups.meteors, groups.ground, this.meteorVsGroundHandler, undefined, this);
        this.scene.physics.add.collider(groups.meteors, groups.staticPlatforms, this.meteorVsGroundHandler, undefined, this);
        this.scene.physics.add.collider(groups.meteors, groups.movingPlatforms, this.meteorVsGroundHandler, undefined, this);
        this.scene.physics.add.collider(groups.meteors, groups.pipes, this.meteorVsGroundHandler, undefined, this);

        console.log("Collision manager setup complete.");
    }

    // --- Collision Handlers (private) ---

    private playerVsBlockHandler(
        playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
        blockObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
    ) {
        // Приводим типы внутри для удобства, если уверены, что это спрайты
        const player = playerObj as Phaser.Physics.Arcade.Sprite;
        const block = blockObj as Phaser.Physics.Arcade.Sprite;

        // Проверяем, что это действительно спрайты с телами
        if (!player?.active || !block?.active || !player.body || !block.body || !(player.body instanceof Phaser.Physics.Arcade.Body) || !(block.body instanceof Phaser.Physics.Arcade.StaticBody)) {
            return;
        }

        const playerBody = player.body;

        // Удар головой снизу
        if (playerBody.blocked.up) {
            if (block.getData('isAnimating')) { return; }
            block.setData('isAnimating', true);
            this.scene.events.emit('requestSoundPlay', 'blockHit');

            const originalY = block.y;
            this.scene.tweens.add({
                targets: block,
                y: originalY - GameConfig.blocks.bumpHeight,
                duration: GameConfig.blocks.bumpDuration / 2,
                yoyo: true,
                ease: 'Power1',
                onComplete: () => {
                    block.setData('isAnimating', false);
                    if (typeof (this.scene as any).handleBlockHit === 'function') {
                        (this.scene as any).handleBlockHit(block);
                    } else {
                        console.warn('Scene does not have handleBlockHit method!');
                    }
                }
            });
            playerBody.velocity.y = 10; // Отталкиваем игрока немного вниз
        }
    }



    private playerVsZilHandler(playerObj: any, zilObj: any) {
        const player = playerObj as Phaser.Physics.Arcade.Sprite;
        const zil = zilObj as Phaser.Physics.Arcade.Sprite;
        if (!player.active || !zil.active || !player.body || !zil.body || zil.getData('isDead') || !this.playerController.canBeHurt()) return;

        const playerBody = player.body as Phaser.Physics.Arcade.Body;
        const zilBody = zil.body as Phaser.Physics.Arcade.Body;

        // Проверка на прыжок сверху (stomp)
        if (playerBody.velocity.y > 50 && playerBody.bottom <= zilBody.top + 15) { // Условие прыжка сверху
            this.enemyManager.handleZilStomped(zil); // Обработка в EnemyManager
            const bounceMultiplier = this.playerController.isPlayerPoweredUp() ? GameConfig.player.powerUpJumpMultiplier : 1;
            playerBody.setVelocityY(GameConfig.player.stompBounceSpeed * bounceMultiplier); // Отскок
            this.scene.events.emit('requestSoundPlay', 'enemyStomp'); // Звук через событие
        } else { // Иначе - урон игроку
            this.playerController.applyDamage();
        }
    }

    private playerVsCruzakHandler(playerObj: any, cruzakObj: any) {
         const player = playerObj as Phaser.Physics.Arcade.Sprite;
         const cruzak = cruzakObj as Phaser.Physics.Arcade.Sprite;
         // Крузака нельзя убить прыжком, всегда урон
         if (!player.active || !cruzak.active || !player.body || !cruzak.body || cruzak.getData('isDead') || !this.playerController.canBeHurt()) return;
         this.playerController.applyDamage();
    }

    private playerVsDogHandler(playerObj: any, dogObj: any) {
        const player = playerObj as Phaser.Physics.Arcade.Sprite;
        const dog = dogObj as Phaser.Physics.Arcade.Sprite;
        // Собаку нельзя убить прыжком, всегда урон
        if (!player.active || !dog.active || !player.body || !dog.body || dog.getData('isDead') || !this.playerController.canBeHurt()) return;
        this.playerController.applyDamage();
    }

     private playerVsPoopHandler(playerObj: any, poopObj: any) {
         const player = playerObj as Phaser.Physics.Arcade.Sprite;
         const poop = poopObj as Phaser.Physics.Arcade.Sprite;
         if (!player.active || !poop.active || !this.playerController.canBeHurt()) return;
         this.playerController.applyDamage();
         this.enemyManager.handlePoopHit(poop); // Уничтожаем какашку
     }

     private playerVsGvozdikHandler(_playerObj: any, gvozdikObj: any) {
        const gvozdik = gvozdikObj as Phaser.Physics.Arcade.Sprite;
        if (!gvozdik.active || gvozdik.getData('isAttracted')) return; // Не собираем, если уже притягивается
        this.collectiblesManager.handleGvozdikCollected(gvozdik, true); // Передаем в CollectiblesManager
     }

     private playerVsMoneyHandler(_playerObj: any, moneyObj: any) {
         const money = moneyObj as Phaser.Physics.Arcade.Sprite;
         if (!money.active) return;
         this.collectiblesManager.handleMoneyCollected(money); // Передаем в CollectiblesManager
     }

    private playerVsMeteorHandler(playerObj: any, meteorObj: any) {
         const player = playerObj as Phaser.Physics.Arcade.Sprite;
         const meteor = meteorObj as Phaser.Physics.Arcade.Sprite;
         if (!player.active || !meteor.active || !this.playerController.canBeHurt()) return;
         this.playerController.applyDamage();
         this.enemyManager.handleMeteorImpact(meteor); // Обработка взрыва метеора
    }

    // Обработчик столкновения врага с трубой (для разворота)
    private enemyVsPipeHandler(enemyObj: any, _pipeObj: any) {
        const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
        // Передаем управление разворотом в EnemyManager
        if (enemy.active && !enemy.getData('isDead') && this.enemyManager) {
            this.enemyManager.handleEnemyPipeCollision(enemy);
        }
    }

    // Обработчик столкновения метеора с землей/платформами/трубами
    private meteorVsGroundHandler(meteorObj: any, _groundObj: any) {
        const meteor = meteorObj as Phaser.Physics.Arcade.Sprite;
        if (!meteor.active) return;
        // Передаем управление эффектом и уничтожением в EnemyManager
        if (this.enemyManager) {
            this.enemyManager.handleMeteorImpact(meteor);
        }
    }
}