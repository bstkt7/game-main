import Phaser from 'phaser';
// Убедитесь, что GameConfig импортируется ПРАВИЛЬНО
import { GameConfig } from '../config/GameConfig';
import { PlayerController } from './PlayerController';

export class EnemyManager {
    private scene: Phaser.Scene;
    private config = GameConfig; // Используем импортированный GameConfig
    // Группы врагов
    private zils: Phaser.Physics.Arcade.Group;
    private cruzaks: Phaser.Physics.Arcade.Group;
    private dogs: Phaser.Physics.Arcade.Group;
    private poops: Phaser.Physics.Arcade.Group;
    private meteors: Phaser.Physics.Arcade.Group;
    // Контроллер игрока
    private playerController: PlayerController;
    // Состояние
    private currentDifficulty: number = 1;

    constructor(
        scene: Phaser.Scene,
        groups: {
            zils: Phaser.Physics.Arcade.Group,
            cruzaks: Phaser.Physics.Arcade.Group,
            dogs: Phaser.Physics.Arcade.Group,
            poops: Phaser.Physics.Arcade.Group,
            meteors: Phaser.Physics.Arcade.Group
        },
        playerController: PlayerController
    ) {
        this.scene = scene;
        this.zils = groups.zils;
        this.cruzaks = groups.cruzaks;
        this.dogs = groups.dogs;
        this.poops = groups.poops;
        this.meteors = groups.meteors;
        this.playerController = playerController;

        // Создаем анимации при инициализации
        this.createAnimations();
        console.log("EnemyManager initialized.");
    }

    // Сброс состояния (сложности)
     public resetState() {
        this.currentDifficulty = 1;
        console.log("Enemy Manager state reset (difficulty = 1).");
    }

    // Установка текущей сложности (вызывается извне, например, WorldGenerator)
    public setCurrentDifficulty(difficulty: number) {
        this.currentDifficulty = Phaser.Math.Clamp(difficulty, 1, this.config.difficultyScaling.maxDifficulty);
         // console.log(`[EnemyManager] Difficulty updated to: ${this.currentDifficulty.toFixed(2)}`); // Лог изменения сложности
    }

    // Создание необходимых анимаций
    private createAnimations() {
        // Анимация бега собаки
        if (!this.scene.anims.exists(this.config.enemy.dog.animKey)) {
            try {
                this.scene.anims.create({
                    key: this.config.enemy.dog.animKey,
                    frames: this.config.enemy.dog.animFrames.map(frameKey => ({ key: frameKey })),
                    frameRate: this.config.enemy.dog.animFrameRate,
                    repeat: -1
                });
                console.log(`Animation '${this.config.enemy.dog.animKey}' created.`);
            } catch (error) {
                 console.error(`Failed to create animation '${this.config.enemy.dog.animKey}':`, error);
            }
        }
        // Добавить другие анимации врагов здесь, если нужно
    }

    // Главный метод попытки спавна врага (вызывается из WorldGenerator)
    public trySpawnEnemyNear(x: number, context: string) {
        const gvozdikiCollected = this.scene.registry.get('gvozdikiCollected') ?? 0;
        const cruzakRoll = Math.random();
        const dogRoll = Math.random();
        const zilRoll = Math.random();
        const spawnMultiplier = this.getSpawnMultiplier(context);

        console.log(`[EnemyManager trySpawn] Context: ${context}, PlayerX: ${x.toFixed(0)}, Gvozdiki: ${gvozdikiCollected}, Difficulty: ${this.currentDifficulty.toFixed(1)}`); // <-- ЛОГ 6

        // --- Логика Спавна Крузака ---
        const cruzakThreshold = this.config.enemy.cruzak.spawnThreshold; // Порог из конфига
        const canSpawnCruzak = gvozdikiCollected >= cruzakThreshold;
        const cruzakCount = this.cruzaks.countActive(true);
        const cruzakLimitOk = cruzakCount < this.config.maxObjects.cruzaks;
        const cruzakBaseChance = this.config.enemy.cruzak.spawnChanceAfterThreshold;
        // Шанс = Базовый * МножительКонтекста * МножительСложности
        const cruzakChance = cruzakBaseChance * spawnMultiplier * (1 + (this.currentDifficulty - 1) * 0.05); // 5% прирост шанса за ед. сложности
        console.log(`[EnemyManager Cruzer] Threshold: ${cruzakThreshold}(${canSpawnCruzak}), Count: ${cruzakCount}/${this.config.maxObjects.cruzaks}(${cruzakLimitOk}), Chance: ${cruzakChance.toFixed(3)}, Roll: ${cruzakRoll.toFixed(3)}`); // <-- ЛОГ 7
        if (canSpawnCruzak && cruzakLimitOk && cruzakRoll < cruzakChance) {
            console.log(`[EnemyManager Cruzer] ---> SPAWNING Cruzer near ${x.toFixed(0)}`); // <-- ЛОГ 8
            this.spawnCruzak(x + Phaser.Math.Between(-80, 80)); // Небольшой разброс по X
            return; // Спавним только одного крузака за раз
        }

        // --- Логика Спавна Собаки ---
        const dogCount = this.dogs.countActive(true);
        const dogLimitOk = dogCount < this.config.maxObjects.dogs;
        const dogBaseChance = this.config.enemy.dog.spawnChance;
        // Шанс = Базовый * МножительКонтекста * МножительСложности
        const dogChance = dogBaseChance * spawnMultiplier * (1 + (this.currentDifficulty - 1) * 0.08); // 8% прирост шанса за ед. сложности
        console.log(`[EnemyManager Dog] Count: ${dogCount}/${this.config.maxObjects.dogs}(${dogLimitOk}), Chance: ${dogChance.toFixed(3)}, Roll: ${dogRoll.toFixed(3)}`); // <-- ЛОГ 9
        if (dogLimitOk && dogRoll < dogChance) {
             console.log(`[EnemyManager Dog] ---> SPAWNING Dog near ${x.toFixed(0)}`); // <-- ЛОГ 10
            this.spawnDog(x + Phaser.Math.Between(-50, 150)); // Небольшой разброс
            // НЕ делаем return, собака может появиться вместе с ЗИЛом
        }

        // --- Логика Спавна ЗИЛа ---
        const zilCount = this.zils.countActive(true);
        const zilLimitOk = zilCount < this.config.maxObjects.zils;
        // Шанс = Базовый (из трубы) * МножительКонтекста * МножительСложности
        const zilChance = (this.config.enemy.pipeSpawnBaseChance) * spawnMultiplier * (1 + (this.currentDifficulty - 1) * 0.1); // 10% прирост шанса
         console.log(`[EnemyManager Zil] Count: ${zilCount}/${this.config.maxObjects.zils}(${zilLimitOk}), Chance: ${zilChance.toFixed(3)}, Roll: ${zilRoll.toFixed(3)}`); // <-- ЛОГ 11
        if (zilLimitOk && zilRoll < zilChance) {
             console.log(`[EnemyManager Zil] ---> SPAWNING Zil near ${x.toFixed(0)}`); // <-- ЛОГ 12
            this.spawnZil(x + Phaser.Math.Between(-80, 80)); // Небольшой разброс
        }
    }

    // Получение множителя шанса спавна в зависимости от контекста генерации
    private getSpawnMultiplier(context: string): number {
        switch(context) {
            case 'pipe_series': return 0.8;
            case 'complex': return 1.2;
            case 'elevated_platform_series': return 1.1;
            case 'pipe': return 1.0;
            case 'staggered_platform_static': return 0.9;
            case 'staggered_platform_moving': return 1.0;
            case 'moving_platform': return 1.1;
            case 'gap_moving_end': return 1.3; // Повышенный шанс после сложного участка
            default: return 1.0;
        }
    }

    // --- Методы Спавна Конкретных Врагов ---

    public spawnZil(x: number): Phaser.Physics.Arcade.Sprite | null {
        console.log(`[SpawnZil] Attempting spawn at ${x.toFixed(0)}`); // Лог входа
        if (this.zils.countActive(true) >= this.config.maxObjects.zils) {
            console.log("[SpawnZil] Limit reached."); return null;
        }
        try {
            // ... (логика выбора типа ЗИЛа без изменений) ...
            const difficultyFactor = Math.min(1, (this.currentDifficulty - 1) / (this.config.difficultyScaling.maxDifficulty - 1));
            const typeRoll = Math.random(); let typeIndex = 0;
            const bigThreshold = 0.7 + 0.2 * difficultyFactor; const fastThreshold = 0.4 + 0.3 * difficultyFactor;
            if (typeRoll > bigThreshold) typeIndex = 2; else if (typeRoll > fastThreshold) typeIndex = 1;
            typeIndex = Phaser.Math.Clamp(typeIndex, 0, this.config.enemy.zil.types.length - 1);
            const zilType = this.config.enemy.zil.types[typeIndex]; const baseSpeed = this.config.enemy.zil.speeds[typeIndex];
            const zilSpeed = baseSpeed * (1 + (this.currentDifficulty - 1) * 0.05); const zilScale = this.config.enemy.zil.scales[typeIndex];
            const zilDepth = this.config.enemy.zil.depth; const yPos = this.config.ground.top - 30;

            const zil = this.zils.create(x, yPos, zilType) as Phaser.Physics.Arcade.Sprite;
            if (!zil) { throw new Error("Failed to create Zil sprite object."); }

            zil.setScale(zilScale).setDepth(zilDepth).setCollideWorldBounds(false).setBounce(0).setGravityY(this.config.gravity);
            const initialDirection = -1; zil.setVelocityX(initialDirection * zilSpeed);
            zil.setDataEnabled();
            const patrolRange = this.config.enemy.zil.patrolRange * (1 + (this.currentDifficulty - 1) * 0.08);
            zil.setData({ startX: x, range: patrolRange, speed: zilSpeed, direction: initialDirection, type: zilType, isDead: false, lastShotTime: 0 });

            if(zil.body instanceof Phaser.Physics.Arcade.Body) {
                 zil.body.setSize(zil.width * 0.7, zil.height * 0.8); zil.body.setOffset(zil.width * 0.15, zil.height * 0.1);
            }
             console.log(`[SpawnZil] SUCCESS - Type: ${zilType}, Speed: ${zilSpeed.toFixed(1)}`); // Лог успеха
            return zil;
        } catch (error) {
            console.error('[SpawnZil] Error:', error); return null;
        }
    }

    public spawnCruzak(x: number): Phaser.Physics.Arcade.Sprite | null {
         console.log(`[SpawnCruzak] Attempting spawn at ${x.toFixed(0)}`); // Лог входа
        if (this.cruzaks.countActive(true) >= this.config.maxObjects.cruzaks) {
             console.log("[SpawnCruzak] Limit reached."); return null;
        }
        try {
            // ... (логика создания крузака без изменений) ...
            const cruzakSpeed = this.config.enemy.cruzak.speed * (1 + (this.currentDifficulty - 1) * 0.05);
            const cruzakScale = this.config.enemy.cruzak.scale; const cruzakDepth = this.config.enemy.cruzak.depth; const yPos = this.config.ground.top - 30;
            const cruzak = this.cruzaks.create(x, yPos, 'cruzak') as Phaser.Physics.Arcade.Sprite;
             if (!cruzak) { throw new Error("Failed to create Cruzer sprite object."); }
            cruzak.setScale(cruzakScale).setDepth(cruzakDepth).setCollideWorldBounds(false).setBounce(0).setGravityY(this.config.gravity);
            const initialDirection = -1; cruzak.setVelocityX(initialDirection * cruzakSpeed);
            cruzak.setDataEnabled();
            const patrolRange = this.config.enemy.cruzak.patrolRange * (1 + (this.currentDifficulty - 1) * 0.08);
            cruzak.setData({ startX: x, range: patrolRange, speed: cruzakSpeed, direction: initialDirection, type: 'cruzak', isDead: false });
            if(cruzak.body instanceof Phaser.Physics.Arcade.Body) {
                 cruzak.body.setSize(cruzak.width * 0.75, cruzak.height * 0.8); cruzak.body.setOffset(cruzak.width * 0.12, cruzak.height * 0.1);
            }
             console.log(`[SpawnCruzak] SUCCESS - Speed: ${cruzakSpeed.toFixed(1)}`); // Лог успеха
            return cruzak;
        } catch (error) {
            console.error('[SpawnCruzak] Error:', error); return null;
        }
    }

    public spawnDog(x: number): Phaser.Physics.Arcade.Sprite | null {
        console.log(`[SpawnDog] Attempting spawn at ${x.toFixed(0)}`); // Лог входа
        if (this.dogs.countActive(true) >= this.config.maxObjects.dogs) {
             console.log("[SpawnDog] Limit reached."); return null;
        }
        try {
            // ... (логика создания собаки без изменений) ...
            const dogSpeed = this.config.enemy.dog.speed * (1 + (this.currentDifficulty - 1) * 0.1);
            const dogScale = this.config.enemy.dog.scale; const dogDepth = this.config.enemy.dog.depth; const animKey = this.config.enemy.dog.animKey; const yPos = this.config.ground.top - 20;
            const dog = this.dogs.create(x, yPos, this.config.enemy.dog.animFrames[0]) as Phaser.Physics.Arcade.Sprite;
             if (!dog) { throw new Error("Failed to create Dog sprite object."); }
            dog.setScale(dogScale).setDepth(dogDepth).setCollideWorldBounds(false).setBounce(0).setGravityY(this.config.gravity);
            if (this.scene.anims.exists(animKey)) { dog.play(animKey); } else { console.warn(`Animation key '${animKey}' not found for dog.`); }
            dog.setVelocityX(-dogSpeed); dog.setFlipX(false);
             if (dog.body instanceof Phaser.Physics.Arcade.Body) { dog.body.setSize(dog.width * 0.8, dog.height * 0.9); }
            console.log(`[SpawnDog] SUCCESS - Speed: ${dogSpeed.toFixed(1)}`); // Лог успеха
            return dog;
        } catch (error) {
            console.error('[SpawnDog] Error:', error); return null;
        }
    }

     public shootPoop(zil: Phaser.Physics.Arcade.Sprite) {
        // ... (код без изменений) ...
        if (zil.getData('type') !== 'zil_big' || !zil.active || zil.getData('isDead')) return;
        if (this.poops.countActive(true) >= this.config.maxObjects.poops ) return;
        const direction = zil.getData('direction') ?? -1; const startX = zil.x + (direction * zil.displayWidth * 0.4); const startY = zil.y - zil.displayHeight * 0.1;
        const poop = this.poops.create(startX, startY, 'poop') as Phaser.Physics.Arcade.Sprite; if (!poop) return;
        poop.setScale(this.config.enemy.poop.scale).setDepth(this.config.enemy.poop.depth).setCollideWorldBounds(false);
        poop.setVelocityX(this.config.enemy.poop.speed * direction); poop.setVelocityY(0);
        this.scene.time.delayedCall(this.config.enemy.poop.lifetime, () => { if (poop?.active) { poop.destroy(); } }, [], this);
      }

    public spawnMeteor(): Phaser.Physics.Arcade.Sprite | null {
         // ... (код без изменений) ...
        if (this.meteors.countActive(true) >= this.config.maxObjects.meteors) return null;
        const cam = this.scene.cameras.main; const spawnX = cam.worldView.x + Phaser.Math.FloatBetween(50, cam.worldView.width - 50); const spawnY = cam.worldView.y - 50;
        const meteor = this.meteors.create(spawnX, spawnY, 'meteor') as Phaser.Physics.Arcade.Sprite; if (!meteor) return null;
        meteor.setScale(this.config.hazards.meteor.scale).setDepth(this.config.hazards.meteor.depth).setCollideWorldBounds(false);
        const angleDegrees = 90 + Phaser.Math.FloatBetween(-this.config.hazards.meteor.maxAngle, this.config.hazards.meteor.maxAngle); const angleRadians = Phaser.Math.DegToRad(angleDegrees);
        const speed = Phaser.Math.Between(this.config.hazards.meteor.minSpeed, this.config.hazards.meteor.maxSpeed);
        if (meteor.body instanceof Phaser.Physics.Arcade.Body) { this.scene.physics.velocityFromRotation(angleRadians, speed, meteor.body.velocity); meteor.body.setAngularVelocity(Phaser.Math.Between(-100, 100)); }
        else { console.warn("Meteor missing body!"); meteor.destroy(); return null; } return meteor;
    }

    // Обновление состояния врагов
    public update(time: number, _delta: number) { // delta не используется
        const playerSprite = this.playerController?.getPlayerSprite();
        if (!playerSprite?.active) return; // Не обновляем, если игрок не активен

        // Обновляем патрулирование и стрельбу ЗИЛов и Крузаков
        this.zils.getChildren().forEach((zilGO) => {
            if (zilGO.active && zilGO instanceof Phaser.Physics.Arcade.Sprite) { this.updateEnemyPatrolAndShoot(zilGO, time, playerSprite); } });
        this.cruzaks.getChildren().forEach((cruzakGO) => {
             if (cruzakGO.active && cruzakGO instanceof Phaser.Physics.Arcade.Sprite) { this.updateEnemyPatrolAndShoot(cruzakGO, time, playerSprite); } });

        // Спавн метеоров (шанс зависит от сложности)
        const meteorSpawnChance = this.config.hazards.meteor.spawnChance * (1 + (this.currentDifficulty - 1) * 0.1);
        // Метеоры появляются только при сложности > 1.5
        if (this.currentDifficulty > 1.5 && Math.random() < meteorSpawnChance) { this.spawnMeteor(); }

        // Очистка метеоров, улетевших далеко вниз
         this.meteors.getChildren().forEach((meteorGO) => {
            if (meteorGO instanceof Phaser.Physics.Arcade.Sprite && meteorGO.active) { if (meteorGO.y > this.scene.cameras.main.worldView.bottom + 200) { meteorGO.destroy(); } } });
    }

    // Логика патрулирования и стрельбы для ЗИЛов/Крузаков
    private updateEnemyPatrolAndShoot(enemy: Phaser.Physics.Arcade.Sprite, time: number, playerSprite: Phaser.GameObjects.Sprite) {
        if (!enemy.active || !(enemy.body instanceof Phaser.Physics.Arcade.Body) || enemy.getData('isDead')) return;

        const startX = enemy.getData('startX') ?? enemy.x; const range = enemy.getData('range') ?? 100;
        const speed = enemy.getData('speed') ?? 30; let direction = enemy.getData('direction') ?? -1;

        const body = enemy.body as Phaser.Physics.Arcade.Body;
        const isBlockedLeft = body.blocked.left || body.touching.left; const isBlockedRight = body.blocked.right || body.touching.right;
        const isOnFloor = body.blocked.down || body.touching.down;

        // Логика разворота
        if (!isBlockedLeft && !isBlockedRight) {
            if (direction < 0 && enemy.x < startX - range) { direction = 1; } else if (direction > 0 && enemy.x > startX + range) { direction = -1; }
        } else if (isBlockedRight && direction > 0) { direction = -1; } else if (isBlockedLeft && direction < 0) { direction = 1; }

        // Применяем новую скорость/направление
        if (direction !== enemy.getData('direction') || (Math.abs(body.velocity.x) < speed * 0.5 && isOnFloor)) {
             enemy.setData('direction', direction); enemy.setVelocityX(speed * direction); enemy.setFlipX(direction > 0);
        }

        // Логика стрельбы для 'zil_big'
        if (enemy.getData('type') === 'zil_big') {
            const lastShotTime = enemy.getData('lastShotTime') ?? 0; const shootCooldown = this.config.enemy.zil.shootCooldown; const shootRange = this.config.enemy.zil.shootRange;
            if (time > lastShotTime + shootCooldown) {
                if (!playerSprite?.active || !this.playerController.canBeHurt()) return;
                const playerDistance = Phaser.Math.Distance.Between(enemy.x, enemy.y, playerSprite.x, playerSprite.y);
                if (playerDistance < shootRange) {
                    const isPlayerInFront = (direction < 0 && playerSprite.x < enemy.x) || (direction > 0 && playerSprite.x > enemy.x);
                    const isPlayerLower = playerSprite.y > enemy.y - 50;
                    if (isPlayerInFront && isPlayerLower) { this.shootPoop(enemy); enemy.setData('lastShotTime', time); }
                }
            }
        }
    }

     // --- Обработчики Коллизий (вызываются из CollisionManager) ---

     public handleZilStomped(zil: Phaser.Physics.Arcade.Sprite) {
        if (!zil || !zil.active || zil.getData('isDead')) return;
        zil.setData('isDead', true);
        this.scene.events.emit('requestSoundPlay', 'zil_death'); // Используем событие для звука
        if (zil.body instanceof Phaser.Physics.Arcade.Body) { zil.disableBody(false, false); }
        zil.setVelocity(Phaser.Math.Between(-50, 50), -150); zil.setAngle(Phaser.Math.Between(-30, 30)); zil.setGravityY(this.config.gravity * 1.5);
        this.scene.tweens.add({ targets: zil, alpha: 0, scaleY: zil.scaleY * 0.5, duration: 400, delay: 100, ease: 'Power1', onComplete: () => { if (zil.active) { zil.destroy(); } } });
     }

     public handleEnemyPipeCollision(enemy: Phaser.Physics.Arcade.Sprite) {
        if (!enemy.active || !(enemy.body instanceof Phaser.Physics.Arcade.Body) || enemy.getData('isDead')) return;
        const body = enemy.body as Phaser.Physics.Arcade.Body;
        if (body.blocked.right || body.blocked.left || body.touching.left || body.touching.right) {
            const currentDirection = enemy.getData('direction') ?? -1; const newDirection = -currentDirection; const speed = enemy.getData('speed') ?? 30;
            enemy.setData('direction', newDirection); enemy.setVelocityX(speed * newDirection); enemy.setFlipX(newDirection > 0);
        }
     }

     public handlePoopHit(poop: Phaser.Physics.Arcade.Sprite) {
        if (poop?.active) { poop.destroy(); } // Просто уничтожаем какашку
     }

    public handleMeteorImpact(meteor: Phaser.Physics.Arcade.Sprite) {
        if (!meteor?.active) return;
        this.scene.events.emit('requestSoundPlay', 'meteor_impact'); // Используем событие для звука
        if (meteor.body instanceof Phaser.Physics.Arcade.Body && (meteor.body.velocity.x !== 0 || meteor.body.velocity.y !== 0)) {
            this.scene.cameras.main.shake( this.config.hazards.meteor.impactShakeDuration, this.config.hazards.meteor.impactShakeIntensity );
        }
        meteor.destroy(); // Уничтожаем метеор
    }
}