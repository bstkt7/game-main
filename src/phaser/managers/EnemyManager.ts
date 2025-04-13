import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { PlayerController } from './PlayerController';

export class EnemyManager {
    private scene: Phaser.Scene;
    private config = GameConfig;
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
    // Минимальная дистанция между врагами одного типа при спавне в секции
    private minSectionSpawnDistance: number = 150; // Уменьшено для большей плотности

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

        this.createAnimations();
        console.log("EnemyManager initialized.");
    }

    public resetState() {
        this.currentDifficulty = 1;
        console.log("Enemy Manager state reset (difficulty = 1).");
    }

    public setCurrentDifficulty(difficulty: number) {
        this.currentDifficulty = Phaser.Math.Clamp(difficulty, 1, this.config.difficultyScaling.maxDifficulty);
        // Убрал лог сложности здесь, чтобы не спамить консоль
        // console.log(`[EnemyManager] Difficulty updated to: ${this.currentDifficulty.toFixed(2)}`);
    }

    private createAnimations() {
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
        // --- Добавить другие анимации врагов ---
        // Например, если у ЗИЛов или Крузаков будут анимации
    }

    // --- НОВЫЙ МЕТОД СПАВНА ВРАГОВ В СЕКЦИИ ---
    /**
     * Спавнит врагов в заданной секции мира.
     * @param startX Начальная X координата секции.
     * @param endX Конечная X координата секции.
     */
    public spawnEnemiesInSection(startX: number, endX: number) {
        const sectionLength = endX - startX;
        if (sectionLength <= 100) return; // Не спавним во врагов в слишком коротких секциях

        const gvozdikiCollected = this.scene.registry.get('gvozdikiCollected') ?? 0;

        // Базовое количество врагов + зависимость от длины секции и сложности
        const baseEnemyCount = 1;
        const lengthFactor = Math.floor(sectionLength / 400); // 1 враг на каждые 400 пикселей длины
        const difficultyFactor = Math.floor(this.currentDifficulty / 2); // 1 доп. враг за каждые 2 ед. сложности
        const numEnemiesToSpawn = baseEnemyCount + lengthFactor + difficultyFactor;

        console.log(`[SpawnInSection] Area: ${startX.toFixed(0)}-${endX.toFixed(0)} (L: ${sectionLength.toFixed(0)}), Diff: ${this.currentDifficulty.toFixed(1)}, Attempting to spawn ${numEnemiesToSpawn} enemies.`);

        let lastSpawnXByType = { zil: 0, cruzak: 0, dog: 0 }; // Отслеживание последнего спавна ВНУТРИ секции
        let spawnedCount = 0;

        for (let i = 0; i < numEnemiesToSpawn; i++) {
            // Определяем доступных врагов
            const availableTypes: ('zil' | 'cruzak' | 'dog')[] = [];
            const canSpawnCruzak = gvozdikiCollected >= this.config.enemy.cruzak.spawnThreshold;

            if (this.zils.countActive(true) < this.config.maxObjects.zils) availableTypes.push('zil');
            if (this.dogs.countActive(true) < this.config.maxObjects.dogs) availableTypes.push('dog');
            if (canSpawnCruzak && this.cruzaks.countActive(true) < this.config.maxObjects.cruzaks) availableTypes.push('cruzak');

            if (availableTypes.length === 0) {
                 console.log("[SpawnInSection] No available enemy types or max limits reached.");
                 break; // Прерываем цикл, если некого спавнить
            }

            // --- Весовой Рандомный Выбор ---
            let enemyType: 'zil' | 'cruzak' | 'dog';
            const weightZil = 50;
            const weightDog = 35 + 5 * (this.currentDifficulty - 1); // Шанс собаки растет со сложностью
            const weightCruzak = (canSpawnCruzak ? 15 + 10 * (this.currentDifficulty - 1) : 0); // Шанс крузака растет, если он доступен
            const totalWeight = weightZil + weightDog + weightCruzak;
            const roll = Math.random() * totalWeight;

            if (roll < weightZil && availableTypes.includes('zil')) {
                enemyType = 'zil';
            } else if (roll < weightZil + weightDog && availableTypes.includes('dog')) {
                enemyType = 'dog';
            } else if (availableTypes.includes('cruzak')) { // Крузак, если доступен и другие не выбраны
                enemyType = 'cruzak';
            } else {
                // Запасной вариант, если что-то пошло не так с весами или доступностью
                enemyType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            }
            // ---------------------------------

            // Выбираем позицию, избегая слишком близкого спавна к предыдущему врагу того же типа
            let spawnX = 0;
            let attempts = 0;
            const maxAttempts = 10;
            do {
                spawnX = Phaser.Math.Between(startX + 50, endX - 50); // Случайная позиция внутри секции (с отступами)
                attempts++;
            } while (Math.abs(spawnX - lastSpawnXByType[enemyType]) < this.minSectionSpawnDistance && attempts < maxAttempts);

            if (attempts >= maxAttempts) {
                 console.log(`[SpawnInSection] Could not find suitable position for ${enemyType} after ${maxAttempts} attempts.`);
                 continue; // Пропускаем спавн этого врага
            }

            // Спавним выбранного врага
            let spawned = false;
            if (enemyType === 'zil') {
                if (this.spawnZil(spawnX)) spawned = true;
            } else if (enemyType === 'dog') {
                if (this.spawnDog(spawnX)) spawned = true;
            } else if (enemyType === 'cruzak') {
                if (this.spawnCruzak(spawnX)) spawned = true;
            }

            // Обновляем позицию последнего спавна, если успешно
            if (spawned) {
                lastSpawnXByType[enemyType] = spawnX;
                spawnedCount++;
            }
        }
        console.log(`[SpawnInSection] Successfully spawned ${spawnedCount} enemies.`);
    }
    // --- КОНЕЦ НОВОГО МЕТОДА СПАВНА ---

    // (Старый метод trySpawnEnemyNear УДАЛЕН)



    // --- Методы Спавна Конкретных Врагов (С КОРРЕКЦИЕЙ ПОЗИЦИИ Y) ---

    public spawnZil(x: number): Phaser.Physics.Arcade.Sprite | null {
        if (this.zils.countActive(true) >= this.config.maxObjects.zils) {
            // console.log("[SpawnZil] Limit reached."); // Можно раскомментировать для отладки лимитов
            return null;
        }
        try {
            // Выбор типа ЗИЛа (оставляем как было)
            const difficultyFactor = Math.min(1, (this.currentDifficulty - 1) / (this.config.difficultyScaling.maxDifficulty - 1));
            const typeRoll = Math.random();
            let typeIndex = 0;
            const bigThreshold = 0.7 + 0.2 * difficultyFactor;
            const fastThreshold = 0.4 + 0.3 * difficultyFactor;
            if (typeRoll > bigThreshold) typeIndex = 2;
            else if (typeRoll > fastThreshold) typeIndex = 1;
            typeIndex = Phaser.Math.Clamp(typeIndex, 0, this.config.enemy.zil.types.length - 1);
            const zilType = this.config.enemy.zil.types[typeIndex];
            const baseSpeed = this.config.enemy.zil.speeds[typeIndex];
            const zilSpeed = baseSpeed * (1 + (this.currentDifficulty - 1) * 0.05);
            const zilScale = this.config.enemy.zil.scales[typeIndex];
            const zilDepth = this.config.enemy.zil.depth;

            // --- ИЗМЕНЕНО: Позиция Y ---
            // Спавним с центром X на заданной координате, Y на уровне земли
            // Физика и гравитация опустят его на землю. Origin(0.5, 1) разместит ноги на Y
            const yPos = this.config.ground.top;
            // ---------------------------

            const zil = this.zils.create(x, yPos, zilType) as Phaser.Physics.Arcade.Sprite;
            if (!zil) throw new Error("Failed to create Zil sprite object.");

            // --- ИЗМЕНЕНО: Ставим Origin Y в 1 ---
            zil.setOrigin(0.5, 1); // Важно для позиционирования по Y
            // -----------------------------------

            zil.setScale(zilScale)
                .setDepth(zilDepth)
                .setCollideWorldBounds(false) // Пусть выходят за пределы карты, если нужно
                .setBounce(0)
                .setGravityY(this.config.gravity) // Гравитация притянет к земле
                .setVisible(true);

            const initialDirection = (Math.random() < 0.5) ? 1 : -1; // Случайное начальное направление
            zil.setVelocityX(initialDirection * zilSpeed);
            zil.setFlipX(initialDirection > 0); // Поворачиваем спрайт в нужную сторону

            zil.setDataEnabled();
            const patrolRange = this.config.enemy.zil.patrolRange * (1 + (this.currentDifficulty - 1) * 0.08);
            zil.setData({ startX: x, range: patrolRange, speed: zilSpeed, direction: initialDirection, type: zilType, isDead: false, lastShotTime: 0 });

            // Настройка физического тела (можно подкорректировать под новый origin)
            if (zil.body instanceof Phaser.Physics.Arcade.Body) {
                 const bodyWidth = zil.width * 0.7;
                 const bodyHeight = zil.height * 0.9; // Немного уменьшим высоту тела, чтобы ноги касались земли
                 zil.body.setSize(bodyWidth, bodyHeight);
                 // Offset Y теперь отсчитывается от НИЗА спрайта из-за originY=1
                 zil.body.setOffset(zil.width * 0.15, zil.height * 0.05); // Смещаем чуть вверх от низа
            }
            console.log(`[SpawnZil] SUCCESS - Type: ${zilType}, Speed: ${zilSpeed.toFixed(1)}, Position: (${x.toFixed(0)}, ${yPos.toFixed(0)})`);
            return zil;
        } catch (error) {
            console.error('[SpawnZil] Error:', error);
            return null;
        }
    }

    public spawnCruzak(x: number): Phaser.Physics.Arcade.Sprite | null {
         if (this.cruzaks.countActive(true) >= this.config.maxObjects.cruzaks) return null;
         try {
             const cruzakSpeed = this.config.enemy.cruzak.speed * (1 + (this.currentDifficulty - 1) * 0.05);
             const cruzakScale = this.config.enemy.cruzak.scale;
             const cruzakDepth = this.config.enemy.cruzak.depth;
             // --- ИЗМЕНЕНО: Позиция Y ---
             const yPos = this.config.ground.top;
             // ---------------------------
             const cruzak = this.cruzaks.create(x, yPos, 'cruzak') as Phaser.Physics.Arcade.Sprite;
             if (!cruzak) throw new Error("Failed to create Cruzer sprite object.");

             // --- ИЗМЕНЕНО: Ставим Origin Y в 1 ---
             cruzak.setOrigin(0.5, 1);
             // -----------------------------------

             cruzak.setScale(cruzakScale)
                .setDepth(cruzakDepth)
                .setCollideWorldBounds(false)
                .setBounce(0)
                .setGravityY(this.config.gravity);

             const initialDirection = (Math.random() < 0.5) ? 1 : -1;
             cruzak.setVelocityX(initialDirection * cruzakSpeed);
             cruzak.setFlipX(initialDirection > 0);

             cruzak.setDataEnabled();
             const patrolRange = this.config.enemy.cruzak.patrolRange * (1 + (this.currentDifficulty - 1) * 0.08);
             cruzak.setData({ startX: x, range: patrolRange, speed: cruzakSpeed, direction: initialDirection, type: 'cruzak', isDead: false });

             // Настройка тела под новый origin
             if(cruzak.body instanceof Phaser.Physics.Arcade.Body) {
                  const bodyWidth = cruzak.width * 0.75;
                  const bodyHeight = cruzak.height * 0.85;
                  cruzak.body.setSize(bodyWidth, bodyHeight);
                  cruzak.body.setOffset(cruzak.width * 0.125, cruzak.height * 0.1); // Смещаем вверх от низа
             }
             console.log(`[SpawnCruzer] SUCCESS - Speed: ${cruzakSpeed.toFixed(1)}`);
             return cruzak;
         } catch (error) {
             console.error('[SpawnCruzer] Error:', error); return null;
         }
    }

    public spawnDog(x: number): Phaser.Physics.Arcade.Sprite | null {
        if (this.dogs.countActive(true) >= this.config.maxObjects.dogs) return null;
        try {
            const dogSpeed = this.config.enemy.dog.speed * (1 + (this.currentDifficulty - 1) * 0.1);
            const dogScale = this.config.enemy.dog.scale;
            const dogDepth = this.config.enemy.dog.depth;
            const animKey = this.config.enemy.dog.animKey;
            // --- ИЗМЕНЕНО: Позиция Y ---
            const yPos = this.config.ground.top;
            // ---------------------------
            const dog = this.dogs.create(x, yPos, this.config.enemy.dog.animFrames[0]) as Phaser.Physics.Arcade.Sprite;
            if (!dog) throw new Error("Failed to create Dog sprite object.");

            // --- ИЗМЕНЕНО: Ставим Origin Y в 1 ---
            dog.setOrigin(0.5, 1);
            // -----------------------------------

            dog.setScale(dogScale)
                .setDepth(dogDepth)
                .setCollideWorldBounds(false)
                .setBounce(0)
                .setGravityY(this.config.gravity)
                .setVisible(true);

            if (this.scene.anims.exists(animKey)) {
                dog.play(animKey);
            } else { console.warn(`Animation key '${animKey}' not found for dog.`); }

            const initialDirection = (Math.random() < 0.5) ? 1 : -1;
            dog.setVelocityX(initialDirection * dogSpeed);
            dog.setFlipX(initialDirection > 0); // Собака смотрит влево при -1, вправо при 1

            // Настройка тела под новый origin
            if (dog.body instanceof Phaser.Physics.Arcade.Body) {
                 const bodyWidth = dog.width * 0.8;
                 const bodyHeight = dog.height * 0.9;
                 dog.body.setSize(bodyWidth, bodyHeight);
                 dog.body.setOffset(dog.width * 0.1, dog.height * 0.05); // Смещаем вверх от низа
            }
            console.log(`[SpawnDog] SUCCESS - Speed: ${dogSpeed.toFixed(1)}`);
            return dog;
        } catch (error) {
            console.error('[SpawnDog] Error:', error); return null;
        }
    }

    public shootPoop(zil: Phaser.Physics.Arcade.Sprite) {
        if (zil.getData('type') !== 'zil_big' || !zil.active || zil.getData('isDead')) return;
        if (this.poops.countActive(true) >= this.config.maxObjects.poops ) return;
        const direction = zil.getData('direction') ?? -1;
        // Корректируем X старта какашки относительно центра ЗИЛа
        const startX = zil.x + (direction * zil.displayWidth * 0.3);
        // Y старта какашки примерно на уровне середины ЗИЛа
        const startY = zil.y - zil.displayHeight * 0.4; // Учитываем originY = 1
        const poop = this.poops.create(startX, startY, 'poop') as Phaser.Physics.Arcade.Sprite; if (!poop) return;
        poop.setScale(this.config.enemy.poop.scale).setDepth(this.config.enemy.poop.depth).setCollideWorldBounds(false);
        poop.setVelocityX(this.config.enemy.poop.speed * direction); poop.setVelocityY(Phaser.Math.Between(-20, 20)); // Небольшой разброс по Y
        this.scene.time.delayedCall(this.config.enemy.poop.lifetime, () => { if (poop?.active) { poop.destroy(); } }, [], this);
    }

    public spawnMeteor(): Phaser.Physics.Arcade.Sprite | null {
         if (this.meteors.countActive(true) >= this.config.maxObjects.meteors) return null;
         const cam = this.scene.cameras.main;
         // Спавн чуть выше видимой области
         const spawnX = cam.worldView.x + Phaser.Math.FloatBetween(50, cam.worldView.width - 50);
         const spawnY = cam.worldView.y - 80;
         const meteor = this.meteors.create(spawnX, spawnY, 'meteor') as Phaser.Physics.Arcade.Sprite; if (!meteor) return null;
         meteor.setScale(this.config.hazards.meteor.scale).setDepth(this.config.hazards.meteor.depth).setCollideWorldBounds(false);
         const angleDegrees = 90 + Phaser.Math.FloatBetween(-this.config.hazards.meteor.maxAngle, this.config.hazards.meteor.maxAngle);
         const angleRadians = Phaser.Math.DegToRad(angleDegrees);
         const speed = Phaser.Math.Between(this.config.hazards.meteor.minSpeed, this.config.hazards.meteor.maxSpeed);
         if (meteor.body instanceof Phaser.Physics.Arcade.Body) {
             // Устанавливаем и гравитацию, и начальную скорость
             meteor.body.setGravityY(this.config.gravity * 0.5); // Пусть гравитация тоже влияет
             this.scene.physics.velocityFromRotation(angleRadians, speed, meteor.body.velocity);
             meteor.body.setAngularVelocity(Phaser.Math.Between(-100, 100));
             meteor.body.setBounce(0.3); // Небольшой отскок при ударе
         }
         else { console.warn("Meteor missing body!"); meteor.destroy(); return null; }
         return meteor;
    }

    // Обновление состояния врагов
    public update(time: number, _delta: number) {
        const playerSprite = this.playerController?.getPlayerSprite();
        if (!playerSprite?.active) return;

        // Обновляем патрулирование и стрельбу ЗИЛов и Крузаков
        this.zils.getChildren().forEach((zilGO) => { if (zilGO.active && zilGO instanceof Phaser.Physics.Arcade.Sprite) this.updateEnemyPatrolAndShoot(zilGO, time, playerSprite); });
        this.cruzaks.getChildren().forEach((cruzakGO) => { if (cruzakGO.active && cruzakGO instanceof Phaser.Physics.Arcade.Sprite) this.updateEnemyPatrolAndShoot(cruzakGO, time, playerSprite); });
        // Обновляем собак (только патрулирование)
        this.dogs.getChildren().forEach((dogGO) => { if (dogGO.active && dogGO instanceof Phaser.Physics.Arcade.Sprite) this.updateEnemyPatrol(dogGO); });

        // Спавн метеоров
        const meteorSpawnChance = this.config.hazards.meteor.spawnChance * (1 + (this.currentDifficulty - 1) * 0.1);
        if (this.currentDifficulty > 1.2 && Math.random() < meteorSpawnChance) { this.spawnMeteor(); }

        // Очистка метеоров
         this.meteors.getChildren().forEach((meteorGO) => { if (meteorGO instanceof Phaser.Physics.Arcade.Sprite && meteorGO.active && meteorGO.y > this.scene.cameras.main.worldView.bottom + 200) meteorGO.destroy(); });
    }

    // Обновление патрулирования (для всех врагов)
    private updateEnemyPatrol(enemy: Phaser.Physics.Arcade.Sprite) {
        if (!enemy.active || !(enemy.body instanceof Phaser.Physics.Arcade.Body) || enemy.getData('isDead')) return;

        const startX = enemy.getData('startX') ?? enemy.x;
        const range = enemy.getData('range') ?? 100; // Используем range, если задан, иначе стандартный
        const speed = enemy.getData('speed') ?? 30;
        let direction = enemy.getData('direction') ?? -1;

        const body = enemy.body as Phaser.Physics.Arcade.Body;
        const isBlockedLeft = body.blocked.left || body.touching.left;
        const isBlockedRight = body.blocked.right || body.touching.right;
        const isOnFloor = body.blocked.down || body.touching.down;

        // Базовая логика разворота по range (если range задан и > 0)
        if (range > 0) {
             if (!isBlockedLeft && !isBlockedRight) { // Только если нет прямого препятствия
                 if (direction < 0 && enemy.x < startX - range) { direction = 1; }
                 else if (direction > 0 && enemy.x > startX + range) { direction = -1; }
             }
        }
        // Разворот при столкновении со стеной/препятствием
        if (isBlockedRight && direction > 0) { direction = -1; }
        else if (isBlockedLeft && direction < 0) { direction = 1; }

        // Применяем новую скорость/направление, если оно изменилось или враг почти остановился
        if (direction !== enemy.getData('direction') || (Math.abs(body.velocity.x) < speed * 0.5 && isOnFloor)) {
             enemy.setData('direction', direction);
             enemy.setVelocityX(speed * direction);
             enemy.setFlipX(direction > 0); // Поворот спрайта
        }
    }


    // Патрулирование и стрельба (для ЗИЛов/Крузаков - Крузак не стреляет)
    private updateEnemyPatrolAndShoot(enemy: Phaser.Physics.Arcade.Sprite, time: number, playerSprite: Phaser.GameObjects.Sprite) {
        this.updateEnemyPatrol(enemy); // Сначала общая логика патрулирования

        // Логика стрельбы для 'zil_big'
        if (enemy.getData('type') === 'zil_big' && !enemy.getData('isDead')) {
            const lastShotTime = enemy.getData('lastShotTime') ?? 0;
            const shootCooldown = this.config.enemy.zil.shootCooldown;
            const shootRange = this.config.enemy.zil.shootRange;
            const direction = enemy.getData('direction');

            if (time > lastShotTime + shootCooldown) {
                if (!playerSprite?.active || !this.playerController.canBeHurt()) return;
                const playerDistance = Phaser.Math.Distance.Between(enemy.x, enemy.y, playerSprite.x, playerSprite.y);

                if (playerDistance < shootRange) {
                    // Стреляет, если игрок впереди и примерно на той же высоте или ниже
                    const isPlayerInFront = (direction < 0 && playerSprite.x < enemy.x) || (direction > 0 && playerSprite.x > enemy.x);
                    const isPlayerVerticallyAligned = Math.abs(playerSprite.y - (enemy.y - enemy.displayHeight * 0.5)) < enemy.displayHeight; // Игрок по высоте примерно там же, где ЗИЛ

                    if (isPlayerInFront && isPlayerVerticallyAligned) {
                         this.shootPoop(enemy);
                         enemy.setData('lastShotTime', time);
                         // Опционально: Заставить ЗИЛ остановиться на короткое время для выстрела
                         // enemy.setVelocityX(0);
                         // this.scene.time.delayedCall(300, () => {
                         //    if (enemy.active && !enemy.getData('isDead')) {
                         //        enemy.setVelocityX(enemy.getData('speed') * enemy.getData('direction'));
                         //    }
                         // }, [], this);
                    }
                }
            }
        }
    }

     public handleZilStomped(zil: Phaser.Physics.Arcade.Sprite) {
        if (!zil || !zil.active || zil.getData('isDead')) return;
        zil.setData('isDead', true);
        this.scene.events.emit('requestSoundPlay', 'zil_death');
        if (zil.body instanceof Phaser.Physics.Arcade.Body) zil.disableBody(false, false);
        // Более простое удаление без анимации падения
        zil.setVisible(false);
        this.scene.time.delayedCall(100, () => { if(zil) zil.destroy(); }); // Удаляем с небольшой задержкой

        // Можно добавить эффект взрыва/дыма на месте ЗИЛа
        // const deathEffect = this.scene.add.sprite(zil.x, zil.y - zil.displayHeight*0.5, 'death_effect_texture').play('death_anim');
        // deathEffect.on('animationcomplete', () => deathEffect.destroy());
     }

     public handleEnemyPipeCollision(enemy: Phaser.Physics.Arcade.Sprite) {
         // Используем общую логику патрулирования, которая уже обрабатывает blocked.left/right
         this.updateEnemyPatrol(enemy);
     }

     public handlePoopHit(poop: Phaser.Physics.Arcade.Sprite) {
        if (poop?.active) { poop.destroy(); }
        // Можно добавить эффект попадания какашки
     }

    public handleMeteorImpact(meteor: Phaser.Physics.Arcade.Sprite) {
        if (!meteor?.active) return;
        this.scene.events.emit('requestSoundPlay', 'meteor_impact');
        // Эффект взрыва при ударе метеора
        // const impactEffect = this.scene.add.sprite(meteor.x, meteor.y, 'impact_texture').play('impact_anim');
        // impactEffect.on('animationcomplete', () => impactEffect.destroy());

        if (meteor.body instanceof Phaser.Physics.Arcade.Body && (meteor.body.velocity.x !== 0 || meteor.body.velocity.y !== 0)) {
            this.scene.cameras.main.shake( this.config.hazards.meteor.impactShakeDuration, this.config.hazards.meteor.impactShakeIntensity );
        }
        meteor.destroy();
    }
}