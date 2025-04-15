import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { PlayerController } from './PlayerController'; // Assuming PlayerController exists

export class EnemyManager {
    private scene: Phaser.Scene;
    private config = GameConfig; // Use imported config
    // Enemy Groups
    private zils!: Phaser.Physics.Arcade.Group;
    private dogs!: Phaser.Physics.Arcade.Group;
    private bumblebees!: Phaser.Physics.Arcade.Group;
    private poops!: Phaser.Physics.Arcade.Group;
    private meteors!: Phaser.Physics.Arcade.Group;
    // Player Controller
    private playerController: PlayerController;
    // State
    private currentDifficulty: number = 1;
    // Spawning
    private minSectionSpawnDistance: number = 150;

    constructor(
        scene: Phaser.Scene,
        groups: {
            zils: Phaser.Physics.Arcade.Group,
            dogs: Phaser.Physics.Arcade.Group,
            bumblebees: Phaser.Physics.Arcade.Group,
            poops: Phaser.Physics.Arcade.Group,
            meteors: Phaser.Physics.Arcade.Group
        },
        playerController: PlayerController
    ) {
        this.scene = scene;
        this.config = GameConfig; // Assign config from import
        this.playerController = playerController;

        // Assign groups and perform checks
        this.zils = groups.zils;
        this.dogs = groups.dogs;
        this.bumblebees = groups.bumblebees;
        this.poops = groups.poops;
        this.meteors = groups.meteors;

        if (!(this.zils instanceof Phaser.Physics.Arcade.Group)) console.error("EnemyManager: Invalid 'zils' group provided!");
        if (!(this.dogs instanceof Phaser.Physics.Arcade.Group)) console.error("EnemyManager: Invalid 'dogs' group provided!");
        if (!(this.bumblebees instanceof Phaser.Physics.Arcade.Group)) console.error("EnemyManager: Invalid 'bumblebees' group provided!");
        if (!(this.poops instanceof Phaser.Physics.Arcade.Group)) console.error("EnemyManager: Invalid 'poops' group provided!");
        if (!(this.meteors instanceof Phaser.Physics.Arcade.Group)) console.error("EnemyManager: Invalid 'meteors' group provided!");

        this.createAnimations();
        console.log("EnemyManager initialized.");
    }

    // --- State Management ---
    public resetState() {
        this.currentDifficulty = 1;
        console.log("Enemy Manager state reset (difficulty = 1).");
    }

    public setCurrentDifficulty(difficulty: number) {
        this.currentDifficulty = Phaser.Math.Clamp(difficulty, 1, this.config.difficultyScaling.maxDifficulty);
    }

    // --- Animations ---
    private createAnimations() {
        const anims = this.scene.anims;
        const createAnim = (config: Phaser.Types.Animations.Animation) => {
             if (config.key && !anims.exists(config.key)) {
                 try {
                      anims.create(config);
                      console.log(`Animation '${config.key}' created.`);
                 } catch(e) { console.error(`Error creating anim ${config.key}`, e); }
             }
        }
        // Dog animation
        createAnim({ key: this.config.enemy.dog.animKey, frames: this.config.enemy.dog.animFrames.map(k=>({key:k})), frameRate: this.config.enemy.dog.animFrameRate, repeat: -1 });
        // Bumblebee Animation
        createAnim({ key: this.config.enemy.bumblebee.animKey, frames: this.config.enemy.bumblebee.animFrames.map(k=>({key:k})), frameRate: this.config.enemy.bumblebee.animFrameRate, repeat: -1 });
    }

    // --- Spawning Logic ---
    public spawnEnemiesInSection(startX: number, endX: number) {
         const sectionLength = endX - startX;
         if (sectionLength <= 100) return;

         const baseEnemyCount = 1;
         const lengthFactor = Math.floor(sectionLength / 400);
         const difficultyFactor = Math.floor(this.currentDifficulty / 2);
         const numEnemiesToSpawn = baseEnemyCount + lengthFactor + difficultyFactor;

         let lastSpawnXByType = { zil: 0, dog: 0, bumblebee: 0 };
         let spawnedCount = 0;

         for (let i = 0; i < numEnemiesToSpawn; i++) {
             const availableTypes: ('zil' | 'dog' | 'bumblebee')[] = [];
             if (this.zils?.countActive(true) < this.config.maxObjects.zils) availableTypes.push('zil');
             if (this.dogs?.countActive(true) < this.config.maxObjects.dogs) availableTypes.push('dog');
             if (this.bumblebees?.countActive(true) < this.config.maxObjects.bumblebees) availableTypes.push('bumblebee');
             if (availableTypes.length === 0) break;

             let enemyType: 'zil' | 'dog' | 'bumblebee';
             const weightZil = 50; const weightDog = 35 + 5 * (this.currentDifficulty - 1); const weightBumblebee = 20 + 8 * (this.currentDifficulty - 1);
             const totalWeight = weightZil + weightDog + weightBumblebee; const roll = Math.random() * totalWeight;
             if (roll < weightZil && availableTypes.includes('zil')) { enemyType = 'zil'; }
             else if (roll < weightZil + weightDog && availableTypes.includes('dog')) { enemyType = 'dog'; }
             else if (roll < weightZil + weightDog + weightBumblebee && availableTypes.includes('bumblebee')) { enemyType = 'bumblebee'; }
             else { enemyType = availableTypes[Math.floor(Math.random() * availableTypes.length)]; }

             let spawnX = 0; let attempts = 0; const maxAttempts = 10;
             do { spawnX = Phaser.Math.Between(startX + 50, endX - 50); attempts++; }
             while (Math.abs(spawnX - lastSpawnXByType[enemyType]) < this.minSectionSpawnDistance && attempts < maxAttempts);
             if (attempts >= maxAttempts) continue;

             let spawned = false;
             if (enemyType === 'zil') { if (this.spawnZil(spawnX)) spawned = true; }
             else if (enemyType === 'dog') { if (this.spawnDog(spawnX)) spawned = true; }
             else if (enemyType === 'bumblebee') { if (this.spawnBumblebee(spawnX)) spawned = true; }
             if (spawned) { lastSpawnXByType[enemyType] = spawnX; spawnedCount++; }
         }
    }

    public spawnZil(x: number): Phaser.Physics.Arcade.Sprite | null {
        if (!this.zils || this.zils.countActive(true) >= this.config.maxObjects.zils) return null;
        try {
            const difficultyFactor=Math.min(1,(this.currentDifficulty-1)/(this.config.difficultyScaling.maxDifficulty-1));const typeRoll=Math.random();let typeIndex=0;if(typeRoll>0.7+0.2*difficultyFactor)typeIndex=2;else if(typeRoll>0.4+0.3*difficultyFactor)typeIndex=1;typeIndex=Phaser.Math.Clamp(typeIndex,0,this.config.enemy.zil.types.length-1);const zilType=this.config.enemy.zil.types[typeIndex];const baseSpeed=this.config.enemy.zil.speeds[typeIndex];const zilSpeed=baseSpeed*(1+(this.currentDifficulty-1)*0.05);const zilScale=this.config.enemy.zil.scales[typeIndex];const zilDepth=this.config.enemy.zil.depth;const yPos=this.config.ground.top;const zil=this.zils.create(x,yPos,zilType)as Phaser.Physics.Arcade.Sprite;if(!zil)return null;zil.setOrigin(0.5,1).setScale(zilScale).setDepth(zilDepth).setCollideWorldBounds(false).setBounce(0).setGravityY(this.config.gravity).setVisible(true);const initialDirection=(Math.random()<0.5)?1:-1;zil.setVelocityX(initialDirection*zilSpeed);zil.setFlipX(initialDirection>0);zil.setDataEnabled();const patrolRange=this.config.enemy.zil.patrolRange*(1+(this.currentDifficulty-1)*0.08);zil.setData({startX:x,range:patrolRange,speed:zilSpeed,direction:initialDirection,type:zilType,isDead:false,lastShotTime:0});if(zil.body instanceof Phaser.Physics.Arcade.Body){zil.body.setSize(zil.width*0.7,zil.height*0.9);zil.body.setOffset(zil.width*0.15,zil.height*0.05);}else{console.warn(`Zil spawned without physics body at (${x}, ${yPos})`);}return zil;
        } catch (error) { console.error('[SpawnZil] Error:', error); return null; }
    }

    public spawnDog(x: number): Phaser.Physics.Arcade.Sprite | null {
         if (!this.dogs || this.dogs.countActive(true) >= this.config.maxObjects.dogs) return null;
         try {
             const dogSpeed=this.config.enemy.dog.speed*(1+(this.currentDifficulty-1)*0.1);const dogScale=this.config.enemy.dog.scale;const dogDepth=this.config.enemy.dog.depth;const animKey=this.config.enemy.dog.animKey;const yPos=this.config.ground.top;const dog=this.dogs.create(x,yPos,this.config.enemy.dog.animFrames[0])as Phaser.Physics.Arcade.Sprite;if(!dog)return null;dog.setOrigin(0.5,1).setScale(dogScale).setDepth(dogDepth).setCollideWorldBounds(false).setBounce(0).setGravityY(this.config.gravity).setVisible(true);if(this.scene.anims.exists(animKey))dog.play(animKey);else console.warn(`Animation key '${animKey}' not found for dog.`);const initialDirection=(Math.random()<0.5)?1:-1;dog.setVelocityX(initialDirection*dogSpeed);dog.setFlipX(initialDirection>0);dog.setDataEnabled();const patrolRange=this.config.enemy.dog.patrolRange*(1+(this.currentDifficulty-1)*0.08);dog.setData({startX:x,range:patrolRange,speed:dogSpeed,direction:initialDirection,type:'dog',isDead:false});if(dog.body instanceof Phaser.Physics.Arcade.Body){dog.body.setSize(dog.width*0.8,dog.height*0.9);dog.body.setOffset(dog.width*0.1,dog.height*0.05);}else{console.warn(`Dog spawned without physics body at (${x}, ${yPos})`);}return dog;
         } catch (error) { console.error('[SpawnDog] Error:', error); return null; }
    }

    public spawnBumblebee(x: number): Phaser.Physics.Arcade.Sprite | null {
         if (!this.bumblebees || this.bumblebees.countActive(true) >= this.config.maxObjects.bumblebees) return null;
         try {
             const beeSpeed=this.config.enemy.bumblebee.speed*(1+(this.currentDifficulty-1)*0.07);const beeScale=this.config.enemy.bumblebee.scale;const beeDepth=this.config.enemy.bumblebee.depth;const animKey=this.config.enemy.bumblebee.animKey;const firstFrame=this.config.enemy.bumblebee.animFrames[0];const yPos=this.config.ground.top+this.config.enemy.bumblebee.spawnHeightOffset;const baseVerticalRange=this.config.enemy.bumblebee.verticalRange;const verticalSpeedFactor=this.config.enemy.bumblebee.verticalSpeedFactor;const verticalRange=baseVerticalRange*(1+(this.currentDifficulty-1)*0.05);const bumblebee=this.bumblebees.create(x,yPos,firstFrame)as Phaser.Physics.Arcade.Sprite;if(!bumblebee)return null;bumblebee.setOrigin(0.5,0.5).setScale(beeScale).setDepth(beeDepth).setCollideWorldBounds(false).setBounce(0).setGravityY(0).setVisible(true);if(this.scene.anims.exists(animKey))bumblebee.play(animKey);else console.warn(`Animation key '${animKey}' not found for bumblebee.`);const initialDirection=(Math.random()<0.5)?1:-1;bumblebee.setVelocityX(initialDirection*beeSpeed);bumblebee.setFlipX(initialDirection>0);bumblebee.setDataEnabled();const patrolRange=this.config.enemy.bumblebee.patrolRange*(1+(this.currentDifficulty-1)*0.08);bumblebee.setData({startX:x,startY:yPos,range:patrolRange,speed:beeSpeed,direction:initialDirection,type:'bumblebee',isDead:false,verticalRange:verticalRange,verticalSpeedFactor:verticalSpeedFactor});if(bumblebee.body instanceof Phaser.Physics.Arcade.Body){bumblebee.body.setSize(bumblebee.width*0.8,bumblebee.height*0.7);}else{console.warn(`Bumblebee spawned without physics body at (${x}, ${yPos})`);}return bumblebee;
         } catch (error) { console.error('[SpawnBumblebee] Error:', error); return null; }
    }

    public shootPoop(zil: Phaser.Physics.Arcade.Sprite) {
         if(!this.poops)return;if(zil.getData('type')!=='zil_big'||!zil.active||zil.getData('isDead'))return;if(this.poops.countActive(true)>=this.config.maxObjects.poops)return;try{const direction=zil.getData('direction')??-1;const startX=zil.x+(direction*zil.displayWidth*0.3);const startY=zil.y-zil.displayHeight*0.4;const poop=this.poops.create(startX,startY,'poop')as Phaser.Physics.Arcade.Sprite;if(!poop)return;poop.setScale(this.config.enemy.poop.scale).setDepth(this.config.enemy.poop.depth).setCollideWorldBounds(false);poop.setVelocityX(this.config.enemy.poop.speed*direction);poop.setVelocityY(Phaser.Math.Between(-20,20));this.scene.time.delayedCall(this.config.enemy.poop.lifetime,()=>{if(poop?.active){poop.destroy();}},[],this);}catch(error){console.error("[ShootPoop] Error:",error)}
    }

    public spawnMeteor(): Phaser.Physics.Arcade.Sprite | null {
         if(!this.meteors||this.meteors.countActive(true)>=this.config.maxObjects.meteors)return null;try{const cam=this.scene.cameras.main;const spawnX=cam.worldView.x+Phaser.Math.FloatBetween(50,cam.worldView.width-50);const spawnY=cam.worldView.y-100;const meteor=this.meteors.create(spawnX,spawnY,'meteor')as Phaser.Physics.Arcade.Sprite;if(!meteor)return null;meteor.setScale(this.config.hazards.meteor.scale).setDepth(this.config.hazards.meteor.depth).setCollideWorldBounds(false).setBounce(0.3);const angleDegrees=90+Phaser.Math.FloatBetween(-this.config.hazards.meteor.maxAngle,this.config.hazards.meteor.maxAngle);const angleRadians=Phaser.Math.DegToRad(angleDegrees);const speed=Phaser.Math.Between(this.config.hazards.meteor.minSpeed,this.config.hazards.meteor.maxSpeed);if(meteor.body instanceof Phaser.Physics.Arcade.Body){meteor.body.setGravityY(this.config.gravity*0.5);this.scene.physics.velocityFromRotation(angleRadians,speed,meteor.body.velocity);meteor.body.setAngularVelocity(Phaser.Math.Between(-100,100));meteor.body.onWorldBounds=true;}else{console.warn("Meteor missing physics body!");meteor.destroy();return null;}return meteor;}catch(error){console.error("[SpawnMeteor] Error:",error);return null;}
    }

    // --- Update & Patrol ---
    // FIXED: Changed 'delta' to '_delta' as it's unused
    public update(time: number, _delta: number) {
        const playerSprite = this.playerController?.getPlayerSprite();
        if (!playerSprite?.active) return;

        // Update Enemies (only if not dead)
        try { this.zils?.getChildren().forEach(go => { if (go.active && go instanceof Phaser.Physics.Arcade.Sprite && !go.getData('isDead')) this.updateEnemyPatrolAndShoot(go, time, playerSprite); }); } catch (e) { console.error("Err Zils:", e); }
        try { this.dogs?.getChildren().forEach(go => { if (go.active && go instanceof Phaser.Physics.Arcade.Sprite && !go.getData('isDead')) this.updateEnemyPatrol(go, time); }); } catch (e) { console.error("Err Dogs:", e); }
        try { this.bumblebees?.getChildren().forEach(go => { if (go.active && go instanceof Phaser.Physics.Arcade.Sprite && !go.getData('isDead')) this.updateEnemyPatrol(go, time); }); } catch (e) { console.error("Err Bees:", e); }

        // Spawn Hazards
        try {
             const meteorSpawnChance = this.config.hazards.meteor.spawnChance * (1 + (this.currentDifficulty - 1) * 0.1);
             if (this.currentDifficulty > 1.2 && Math.random() < meteorSpawnChance) this.spawnMeteor();
        } catch (error) { console.error("Error spawning meteor:", error); }

        // Cleanup Logic
        try {
            const cleanupBottom = this.scene.cameras.main.worldView.bottom + 400;
            const cleanupBounds = this.scene.cameras.main.worldView;
            const destroyOffscreen = (go: Phaser.GameObjects.GameObject) => {
                if (go instanceof Phaser.Physics.Arcade.Sprite && go.active) {
                    const isDead = go.getData('isDead'); const body = go.body as Phaser.Physics.Arcade.Body;
                    // Destroy if way below screen (especially stomped enemies)
                    if (go.y > cleanupBottom && (isDead || !body?.collideWorldBounds)) { go.destroy(); }
                }
            };
            this.zils?.getChildren().forEach(destroyOffscreen);
            this.dogs?.getChildren().forEach(destroyOffscreen);
            this.meteors?.getChildren().forEach(destroyOffscreen);
            this.poops?.getChildren().forEach((poopGO) => {
                 if (poopGO instanceof Phaser.Physics.Arcade.Sprite && poopGO.active) {
                     if (poopGO.x<cleanupBounds.x-200||poopGO.x>cleanupBounds.right+200||poopGO.y>cleanupBottom) { poopGO.destroy(); }
                 }
             });
        } catch (error) { console.error("Error during cleanup:", error); }
    }

    private updateEnemyPatrol(enemy: Phaser.Physics.Arcade.Sprite, time: number) {
         if (!enemy.active || !(enemy.body instanceof Phaser.Physics.Arcade.Body) || enemy.getData('isDead')) return;
         const startX=enemy.getData('startX')??enemy.x;const range=enemy.getData('range')??100;const speed=enemy.getData('speed')??30;let direction=enemy.getData('direction')??-1;const enemyType=enemy.getData('type');const body=enemy.body as Phaser.Physics.Arcade.Body;let newDirection=direction;
         
         if(enemyType==='zil'||enemyType==='dog'){
             const isBlockedLeft=body.blocked.left||body.touching.left;
             const isBlockedRight=body.blocked.right||body.touching.right;
             const isOnFloor=body.blocked.down||body.touching.down;
             
             // Проверка столкновения с препятствиями для разворота
             if(isBlockedRight&&direction>0){
                 newDirection=-1;
                 // Добавляем небольшую задержку перед разворотом
                 enemy.setVelocityX(0);
                 this.scene.time.delayedCall(100, () => {
                     if(enemy.active && !enemy.getData('isDead')) {
                         enemy.setVelocityX(speed*newDirection);
                         enemy.setFlipX(newDirection>0);
                     }
                 });
             }else if(isBlockedLeft&&direction<0){
                 newDirection=1;
                 // Добавляем небольшую задержку перед разворотом
                 enemy.setVelocityX(0);
                 this.scene.time.delayedCall(100, () => {
                     if(enemy.active && !enemy.getData('isDead')) {
                         enemy.setVelocityX(speed*newDirection);
                         enemy.setFlipX(newDirection>0);
                     }
                 });
             }
             
             // Проверка патрулирования в пределах диапазона
             if(range>0&&!isBlockedLeft&&!isBlockedRight){
                 if(direction<0&&enemy.x<startX-range){
                     newDirection=1;
                 }else if(direction>0&&enemy.x>startX+range){
                     newDirection=-1;
                 }
             }
             
             // Обновляем направление и скорость, если оно изменилось
             if(newDirection!==direction||(Math.abs(body.velocity.x)<speed*0.5&&isOnFloor)){
                 enemy.setData('direction',newDirection);
                 enemy.setVelocityX(speed*newDirection);
                 enemy.setFlipX(newDirection>0);
             }
         }else if(enemyType==='bumblebee'){
             const startY=enemy.getData('startY');
             const verticalRange=enemy.getData('verticalRange');
             const verticalSpeedFactor=enemy.getData('verticalSpeedFactor');
             if(startY!==undefined&&verticalRange!==undefined&&verticalSpeedFactor!==undefined){
                 const targetY=startY+Math.sin(time*verticalSpeedFactor)*verticalRange;
                 enemy.y=targetY;
             }
             if(range>0){
                 if(direction<0&&enemy.x<startX-range){
                     newDirection=1;
                 }else if(direction>0&&enemy.x>startX+range){
                     newDirection=-1;
                 }
             }
             if(newDirection!==direction){
                 enemy.setData('direction',newDirection);
                 enemy.setVelocityX(speed*newDirection);
                 enemy.setFlipX(newDirection>0);
             }
         }
    }

    private updateEnemyPatrolAndShoot(enemy: Phaser.Physics.Arcade.Sprite, time: number, playerSprite: Phaser.GameObjects.Sprite) {
         if(!enemy.active||!(enemy.body instanceof Phaser.Physics.Arcade.Body)||enemy.getData('isDead'))return;this.updateEnemyPatrol(enemy,time);if(enemy.getData('type')==='zil_big'){const lastShotTime=enemy.getData('lastShotTime')??0;const shootCooldown=this.config.enemy.zil.shootCooldown;const shootRange=this.config.enemy.zil.shootRange;const direction=enemy.getData('direction');if(time>lastShotTime+shootCooldown){if(!playerSprite?.active||!this.playerController.canBeHurt())return;const playerDistance=Phaser.Math.Distance.Between(enemy.x,enemy.y,playerSprite.x,playerSprite.y);if(playerDistance<shootRange){const isPlayerInFront=(direction<0&&playerSprite.x<enemy.x)||(direction>0&&playerSprite.x>enemy.x);const isPlayerVerticallyAligned=Math.abs(playerSprite.y-(enemy.y-enemy.displayHeight*0.5))<enemy.displayHeight*1.2;if(isPlayerInFront&&isPlayerVerticallyAligned){this.shootPoop(enemy);enemy.setData('lastShotTime',time);}}}}
    }

    // --- Hit Handlers ---

    /** Handles the "stomp" effect when the player jumps on top of an enemy (Zil or Dog). */
    public handleEnemyStomped(enemy: Phaser.Physics.Arcade.Sprite, playerSprite?: Phaser.GameObjects.Sprite) {
        if (!enemy || !enemy.active || enemy.getData('isDead')) return;
        
        console.log(`Enemy ${enemy.getData('type')} was stomped!`);
        
        // Помечаем врага как мертвого
        enemy.setData('isDead', true);
        
        // Воспроизводим звук прыжка на врага
        this.scene.events.emit('requestSoundPlay', 'enemyStomp');
        
        // Останавливаем анимацию
        enemy.stop(); 
        
        // Добавляем эффект "сплющивания" врага
        enemy.setScale(enemy.scaleX, enemy.scaleY * 0.5);
        
        // Добавляем визуальный эффект
        this.scene.tweens.add({
            targets: enemy,
            alpha: 0.7,
            duration: 100,
            yoyo: true,
            repeat: 1
        });
        
        if (enemy.body instanceof Phaser.Physics.Arcade.Body) {
            const body = enemy.body; 
            body.enable = true;
            
            // Устанавливаем высокую скорость падения вниз
            body.velocity.y = this.config.gravity * 2;
            
            // Определяем направление отскока в зависимости от положения игрока
            const knockbackDirection = (playerSprite && enemy.x < playerSprite.x) ? -1 : 1;
            body.velocity.x = knockbackDirection * 150; // Увеличиваем горизонтальный отскок
            
            // Отключаем коллизии с миром, чтобы враг мог упасть за пределы экрана
            body.setCollideWorldBounds(false); 
            body.setGravityY(this.config.gravity * 1.5); // Увеличиваем гравитацию для быстрого падения
            body.setBounce(0.1, 0.1); // Минимальный отскок
            
            // Добавляем вращение для более динамичного эффекта
            body.setAngularVelocity(knockbackDirection * 200);
        } else {
            // Если нет физического тела, просто скрываем врага
            enemy.setVisible(false); 
            this.scene.time.delayedCall(100, () => { 
                if (enemy) enemy.destroy(); 
            });
        }
        
        // Добавляем частицы или другие визуальные эффекты
        this.scene.events.emit('enemyStomped', enemy);
        
        // Очистка в update() обрабатывает уничтожение
    }

    public handleBumblebeeHit(bumblebee: Phaser.Physics.Arcade.Sprite) {
         if (!bumblebee || !bumblebee.active || bumblebee.getData('isDead')) return;
         bumblebee.setData('isDead', true);
         this.scene.events.emit('requestSoundPlay', 'bumblebee_death');
         if (bumblebee.body instanceof Phaser.Physics.Arcade.Body) bumblebee.disableBody(false, false);
         bumblebee.stop(); bumblebee.setVisible(false);
         this.scene.time.delayedCall(100, () => { if (bumblebee) bumblebee.destroy(); });
     }

    // FIXED: Changed 'enemy' to '_enemy' as parameter isn't used in the function body
    public handleEnemyPipeCollision(_enemy: Phaser.Physics.Arcade.Sprite, _pipe: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject) {
        // Patrol logic handles reversal based on body.blocked state. Nothing needed here currently.
    }

    public handlePoopHit(poop: Phaser.Physics.Arcade.Sprite, _target: Phaser.GameObjects.GameObject) {
        if (poop?.active) {
             poop.destroy();
             // Optional: Add splat effect here
        }
    }

    // FIXED: Changed target type to 'any' (or a specific union if preferred) to avoid Tile error
    public handleMeteorImpact(meteor: Phaser.Physics.Arcade.Sprite, _target?: any) {
        if (!meteor?.active) return;
        this.scene.events.emit('requestSoundPlay', 'meteor_impact');
        if (meteor.body instanceof Phaser.Physics.Arcade.Body && (meteor.body.velocity.x !== 0 || meteor.body.velocity.y !== 0)) {
            this.scene.cameras.main.shake( this.config.hazards.meteor.impactShakeDuration, this.config.hazards.meteor.impactShakeIntensity );
        }
         // Optional: Add explosion effect here
        meteor.destroy(); // Destroy meteor on impact
    }
}