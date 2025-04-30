import Phaser from 'phaser';
// ВАЖНО: Проверь путь к GameConfig
import { GameConfig } from '../config/GameConfig';
// ВАЖНО: Проверь путь к PlayerController
import { PlayerController } from './PlayerController';

const GVOZDIK_MAGNET_RANGE = GameConfig.collectibles.gvozdik.magnetRange;
const GVOZDIK_MAGNET_SPEED = GameConfig.collectibles.gvozdik.magnetSpeed;
const GVOZDIK_COLLECT_DISTANCE = GameConfig.collectibles.gvozdik.collectDistance;

export class CollectiblesManager {
    private scene: Phaser.Scene;
    private config = GameConfig;
    private gvozdikiGroup: Phaser.Physics.Arcade.Group;
    private moneyGroup: Phaser.Physics.Arcade.Group;
    private playerController: PlayerController;
    // FIX: Removed unused 'collectSound' property
    // private collectSound: Phaser.Sound.BaseSound;
    public gvozdikiCollected: number = 0;
    private gvozdikTweens: Map<Phaser.Physics.Arcade.Sprite, Phaser.Tweens.Tween> = new Map();

    constructor(
        scene: Phaser.Scene,
        groups: { gvozdiki: Phaser.Physics.Arcade.Group, money: Phaser.Physics.Arcade.Group },
        playerController: PlayerController
    ) {
        this.scene = scene;
        this.gvozdikiGroup = groups.gvozdiki;
        this.moneyGroup = groups.money;
        this.playerController = playerController;
        // FIX: Removed initialization of 'collectSound'
        // this.collectSound = scene.sound.add('collect', { volume: GameConfig.soundVolumes.collect });
        this.scene.registry.set('gvozdikiCollected', this.gvozdikiCollected);
    }

    public resetState() {
        this.gvozdikiCollected = 0;
        this.scene.registry.set('gvozdikiCollected', this.gvozdikiCollected);
        this.gvozdikTweens.forEach(tween => tween?.stop());
        this.gvozdikTweens.clear();
        console.log("Collectibles Manager state reset.");
    }

    public trySpawnCollectibleOn(x: number, y: number, _context: string) {
        if (Math.random() < this.config.collectibles.money.spawnChance) {
            this.spawnCollectible('money', x, y);
        } else {
            this.spawnCollectible('gvozdik', x, y);
        }
    }

    public spawnCollectible(type: 'gvozdik' | 'money', x: number, y: number): Phaser.Physics.Arcade.Sprite | null {
        let spawnedItem: Phaser.Physics.Arcade.Sprite | null = null;
        switch (type) {
            case 'gvozdik':
                if (this.gvozdikiGroup.countActive(true) < this.config.maxObjects.gvozdiki) {
                    spawnedItem = this.gvozdikiGroup.create(x, y, 'gvozdik') as Phaser.Physics.Arcade.Sprite;
                    if (spawnedItem) {
                        spawnedItem.setScale(this.config.collectibles.gvozdik.scale ?? 0.25).setDepth(this.config.collectibles.gvozdik.depth);
                        spawnedItem.setData('isAttracted', false);
                        // Directly add the tween here
                        const tween = this.scene.tweens.add({
                            targets: spawnedItem,
                            angle: { from: -this.config.collectibles.gvozdik.swingAngle, to: this.config.collectibles.gvozdik.swingAngle },
                            duration: this.config.collectibles.gvozdik.swingSpeed * Phaser.Math.FloatBetween(0.8, 1.2),
                            ease: 'Sine.easeInOut', yoyo: true, repeat: -1
                        });
                        this.gvozdikTweens.set(spawnedItem, tween);
                    }
                }
                break;
            case 'money':
                if (this.moneyGroup.countActive(true) < this.config.maxObjects.money) {
                    spawnedItem = this.moneyGroup.create(x, y, 'money') as Phaser.Physics.Arcade.Sprite;
                    if (spawnedItem) {
                        spawnedItem.setScale(this.config.collectibles.money.scale)
                            .setDepth(this.config.collectibles.money.depth)
                            .setCollideWorldBounds(false)
                            .setBounce(0.5)
                            .setGravityY(this.config.gravity)
                            .setVisible(true);
                        if (spawnedItem.body) {
                            (spawnedItem.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
                            (spawnedItem.body as Phaser.Physics.Arcade.Body).immovable = true;
                        }
                        this.scene.tweens.add({ targets: spawnedItem, y: y + Phaser.Math.Between(-3, 3), duration: Phaser.Math.Between(800, 1200), ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
                    }
                }
                break;
        }
        return spawnedItem;
    }

    // FIX: Prefixed unused parameters
    public update(_time: number, _delta: number) {
        const playerSprite = this.playerController.getPlayerSprite();
        if (!playerSprite?.active || !playerSprite.body) return;

        Phaser.Actions.Call(this.gvozdikiGroup.getChildren(), (gvozdikGO) => {
            const gvozdik = gvozdikGO as Phaser.Physics.Arcade.Sprite;
            if (!gvozdik?.active || !(gvozdik.body instanceof Phaser.Physics.Arcade.Body)) return;

            const distance = Phaser.Math.Distance.Between(playerSprite.x, playerSprite.y, gvozdik.x, gvozdik.y);

            if (gvozdik.getData('isAttracted')) {
                if (distance < GVOZDIK_COLLECT_DISTANCE) {
                    this.handleGvozdikCollected(gvozdik, false);
                } else if (distance > GVOZDIK_MAGNET_RANGE * 2) {
                    this.stopAttraction(gvozdik);
                } else {
                    this.scene.physics.accelerateToObject(gvozdik, playerSprite, GVOZDIK_MAGNET_SPEED);
                }
            } else if (distance < GVOZDIK_MAGNET_RANGE) {
                gvozdik.setData('isAttracted', true);
                const tween = this.gvozdikTweens.get(gvozdik);
                if (tween) { tween.stop(); this.gvozdikTweens.delete(gvozdik); gvozdik.setAngle(0); }
                gvozdik.body.enable = true;
                gvozdik.body.setAllowGravity(false);
                this.scene.physics.accelerateToObject(gvozdik, playerSprite, GVOZDIK_MAGNET_SPEED);
            }
        }, this);
    }

    private stopAttraction(gvozdik: Phaser.Physics.Arcade.Sprite) {
        if (!gvozdik?.active || !(gvozdik.body instanceof Phaser.Physics.Arcade.Body)) return;
        gvozdik.setData('isAttracted', false);
        gvozdik.body.stop();
        // FIX: Removed call to the deleted startGvozdikSwing method
        // Maybe re-add swing tween here if needed when attraction stops
        // if (!this.gvozdikTweens.has(gvozdik)) {
        //     const tween = this.scene.tweens.add({...}); // Re-add swing tween
        //     this.gvozdikTweens.set(gvozdik, tween);
        // }
    }

    // FIX: Removed unused method startGvozdikSwing
    // private startGvozdikSwing(gvozdik: Phaser.Physics.Arcade.Sprite) { ... }

    public removeGvozdikTween(gvozdik: Phaser.Physics.Arcade.Sprite) {
         const tween = this.gvozdikTweens.get(gvozdik);
         if (tween) {
             tween.stop();
             this.gvozdikTweens.delete(gvozdik);
         }
    }


    public spawnGvozdikFromBlock(block: Phaser.GameObjects.Sprite) {
        const x = block.x;
        const y = block.y - block.displayHeight / 2; // Появление сверху блока
    
        const gvozdik = this.scene.physics.add.sprite(x, y, 'gvozdik');
        gvozdik.setBounce(0.2);
        gvozdik.setVelocity(Phaser.Math.Between(-100, 100), -200); // Летит в случайном направлении
        gvozdik.setData('isCollected', false);
    
        // Устанавливаем правильный масштаб из конфига
        gvozdik.setScale(this.config.collectibles.gvozdik.scale ?? 0.25); // или другое подходящее значение
    
        this.gvozdikiGroup.add(gvozdik);
    }

    public handleGvozdikCollected(gvozdik: Phaser.Physics.Arcade.Sprite, showEffect: boolean = true) {
        if (!gvozdik?.active) return;
        this.removeGvozdikTween(gvozdik);

        if (gvozdik.body instanceof Phaser.Physics.Arcade.Body) {
             gvozdik.body.stop();
        }

        gvozdik.disableBody(true, true);
        this.playSound('collect');

        this.gvozdikiCollected++;
        console.log("[CollectiblesManager] Gvozdiki increased to:", this.gvozdikiCollected); // <-- ЛОГ СЧЕТА 1
        this.scene.registry.set('gvozdikiCollected', this.gvozdikiCollected);

        if (showEffect) {
            const collectEffect = this.scene.add.text(gvozdik.x, gvozdik.y - 10, '+1', { fontSize: '16px', color: '#ffd700' }).setOrigin(0.5);
            this.scene.tweens.add({ targets: collectEffect, y: gvozdik.y - 40, alpha: 0, duration: 600, ease: 'Power1', onComplete: () => collectEffect.destroy() });
        }

        if (this.gvozdikiCollected >= this.config.collectibles.gvozdik.cutsceneThreshold) {
            // Check if cutscene has already played using CutsceneManager's state if available
            // Or use a flag within CollectiblesManager or the Scene registry if needed
            // Example: if (!this.scene.registry.get('cutscenePlayed')) { ... }
            this.scene.events.emit('startCutscene');
            // this.scene.registry.set('cutscenePlayed', true); // Mark it as played
        }
    }

    public handleMoneyCollected(money: Phaser.Physics.Arcade.Sprite) {
        if (!money?.active) return;
        this.scene.tweens.killTweensOf(money);
        money.disableBody(true, true);
        this.playSound('powerUp');
        const collectEffect = this.scene.add.text(money.x, money.y - 10, 'POWER!', { fontSize: '16px', color: '#00ff00', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5);
        this.scene.tweens.add({ targets: collectEffect, y: money.y - 40, alpha: 0, duration: 800, ease: 'Power1', onComplete: () => collectEffect.destroy() });
        this.playerController.activatePowerUp();
    }

    // Method for playing sound via scene event emitter
    private playSound(key: string){
        this.scene.events.emit('requestSoundPlay', key);
    }

    public spawnMoney(x: number, y: number, isBonus: boolean = false): Phaser.Physics.Arcade.Sprite | null {
        if (!this.moneyGroup || this.moneyGroup.countActive(true) >= this.config.maxObjects.money) return null;
        
        try {
            const money = this.moneyGroup.create(x, y, 'money') as Phaser.Physics.Arcade.Sprite;
            if (!money) return null;
            
            money.setScale(this.config.collectibles.money.scale)
                .setDepth(this.config.collectibles.money.depth)
                .setCollideWorldBounds(false)
                .setBounce(0.3)
                .setGravityY(this.config.gravity)
                .setVisible(true);
            
            // Устанавливаем данные для денег
            money.setDataEnabled();
            money.setData('isCollected', false);
            money.setData('isBonus', isBonus);
            
            // Добавляем более яркое свечение для бонусных денег
            if (isBonus) {
                // Увеличиваем масштаб для бонусных денег
                money.setScale(this.config.collectibles.money.scale * 1.5);
                
                // Добавляем свечение
                const glow = this.scene.add.sprite(x, y, 'money_glow');
                glow.setScale(this.config.collectibles.money.scale * 2);
                glow.setDepth(this.config.collectibles.money.depth - 1);
                glow.setAlpha(0.7);
                
                // Добавляем пульсацию свечения
                this.scene.tweens.add({
                    targets: glow,
                    alpha: { from: 0.7, to: 0.3 },
                    scale: { from: this.config.collectibles.money.scale * 2, to: this.config.collectibles.money.scale * 2.5 },
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                // Привязываем свечение к деньгам
                money.setData('glow', glow);
                
                // Добавляем вращение для бонусных денег
                if (money.body instanceof Phaser.Physics.Arcade.Body) {
                    money.body.setAngularVelocity(Phaser.Math.Between(-100, 100));
                }
            }
            
            // Добавляем небольшую случайную скорость для реалистичного эффекта
            if (money.body instanceof Phaser.Physics.Arcade.Body) {
                money.body.setVelocityX(Phaser.Math.Between(-50, 50));
                money.body.setVelocityY(Phaser.Math.Between(-100, -50));
            }
            
            // Уничтожаем деньги через некоторое время
            this.scene.time.delayedCall(5000, () => {
                if (money && money.active) {
                    // Уничтожаем свечение, если оно есть
                    const glow = money.getData('glow');
                    if (glow) glow.destroy();
                    
                    money.destroy();
                }
            });
            
            return money;
        } catch (error) {
            console.error("[SpawnMoney] Error:", error);
            return null;
        }
    }
}