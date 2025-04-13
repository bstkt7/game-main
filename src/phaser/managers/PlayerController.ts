import Phaser from 'phaser';
// Import the specific player config type for better typing
import { GameConfig, PlayerConfigType } from '../config/GameConfig';

export class PlayerController {
    private scene: Phaser.Scene;
    private player: Phaser.Physics.Arcade.Sprite;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    // Use the specific type for config
    private config: PlayerConfigType = GameConfig.player;

    private lives: number = GameConfig.player.initialLives;
    private isInvincible: boolean = false;
    private invincibilityTimer?: Phaser.Time.TimerEvent;
    private isPoweredUp: boolean = false;
    private powerUpTimer?: Phaser.Time.TimerEvent;
    private canDoubleJump: boolean = false;
    private lastJumpTime: number = 0;
    private jumpGracePeriod: number = 100; // Milliseconds for coyote time

    // --- Mobile Input Flags ---
    public mobileInputLeft: boolean = false;
    public mobileInputRight: boolean = false;
    public mobileInputJump: boolean = false;
    // --------------------------

    constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite, cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
        this.scene = scene;
        this.player = player;
        this.cursors = cursors;
        this.lives = this.scene.registry.get('lives') ?? GameConfig.player.initialLives;

        try {
            console.log('[PlayerController] Creating animations...');
            this.createAnimations();
            console.log('[PlayerController] Animations created.');

            // Устанавливаем начальную анимацию
            console.log('>>> Playing initial animation:', this.config.idleAnimKey); // DEBUG LOG
            this.player.play(this.config.idleAnimKey);
            console.log('[PlayerController] Initial animation set.');

        } catch (error) {
             console.error('[PlayerController] Error in constructor during animation setup:', error);
             // Можно предпринять дополнительные действия при ошибке, например, установить текстуру по умолчанию
             // this.player.setTexture('default_player_texture'); // Если есть такая текстура
        }
    }

    private createAnimations() {
        console.log('[PlayerController Anims] Attempting to create animations.'); // DEBUG LOG

        // Idle Animation
        if (!this.scene.anims.exists(this.config.idleAnimKey)) {
             console.log(`[PlayerController Anims] Creating animation: ${this.config.idleAnimKey}`); // DEBUG LOG
            this.scene.anims.create({
                key: this.config.idleAnimKey,
                frames: this.config.idleFrames.map(key => ({ key })),
                frameRate: this.config.idleFrameRate,
                repeat: -1
            });
        } else {
             console.log(`[PlayerController Anims] Animation already exists: ${this.config.idleAnimKey}`); // DEBUG LOG
        }

        // Run Animation
        if (!this.scene.anims.exists(this.config.runAnimKey)) {
            console.log(`[PlayerController Anims] Creating animation: ${this.config.runAnimKey}`); // DEBUG LOG
            this.scene.anims.create({
                key: this.config.runAnimKey,
                frames: this.config.runFrames.map(key => ({ key })),
                frameRate: this.config.runFrameRate,
                repeat: -1
            });
        } else {
            console.log(`[PlayerController Anims] Animation already exists: ${this.config.runAnimKey}`); // DEBUG LOG
        }

        // Jump Animation
        if (!this.scene.anims.exists(this.config.jumpAnimKey)) {
            console.log(`[PlayerController Anims] Creating animation: ${this.config.jumpAnimKey}`); // DEBUG LOG
            this.scene.anims.create({
                key: this.config.jumpAnimKey,
                frames: this.config.jumpFrames.map(key => ({ key })),
                frameRate: this.config.jumpFrameRate,
                repeat: 0 // Прыжок не должен повторяться
            });
        } else {
            console.log(`[PlayerController Anims] Animation already exists: ${this.config.jumpAnimKey}`); // DEBUG LOG
        }

         // Fall Animation
         if (!this.scene.anims.exists(this.config.fallAnimKey)) {
             console.log(`[PlayerController Anims] Creating animation: ${this.config.fallAnimKey}`); // DEBUG LOG
             try {
                 // Убедимся, что кадр для падения существует
                 const fallFrameKey = this.config.jumpFrames[this.config.jumpFrames.length - 1];
                 if (!this.scene.textures.exists(fallFrameKey)) {
                      console.error(`[PlayerController Anims] Texture key not found for fall animation frame: ${fallFrameKey}`);
                      // Можно не создавать анимацию или использовать запасной кадр
                      return; // Прерываем создание этой анимации
                 }
                 this.scene.anims.create({
                     key: this.config.fallAnimKey,
                     frames: [{ key: fallFrameKey }],
                     frameRate: 5,
                     repeat: -1 // Повторяем один кадр
                 });
             } catch (error) {
                 console.error(`[PlayerController Anims] Error creating fall animation '${this.config.fallAnimKey}':`, error);
             }
         } else {
              console.log(`[PlayerController Anims] Animation already exists: ${this.config.fallAnimKey}`); // DEBUG LOG
         }
         console.log('[PlayerController Anims] Finished creating animations.'); // DEBUG LOG
    }


    public update(time: number, _delta: number): void {
        if (!this.player.active || !this.player.body) return;
    // --- DEBUG -
    // -----------
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const touchingDown = body.blocked.down || body.touching.down;

        // --- Combine Keyboard & Mobile Input ---
        const isMovingLeft = this.cursors.left?.isDown || this.mobileInputLeft;
        const isMovingRight = this.cursors.right?.isDown || this.mobileInputRight;
        const justPressedJump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.space) || this.mobileInputJump;
        if (this.mobileInputJump) {
            this.mobileInputJump = false;
        }
        // -----------------------------------------

        if (touchingDown) {
            this.canDoubleJump = true;
            this.lastJumpTime = time;
        }

        // --- Movement ---
        if (isMovingLeft) {
            body.setVelocityX(-this.config.moveSpeed);
            this.player.setFlipX(true);
            if (touchingDown) {
                 // Проверяем, не играется ли уже эта анимация
                 if (this.player.anims.getName() !== this.config.runAnimKey) {
                     console.log('>>> Playing animation:', this.config.runAnimKey); // DEBUG LOG
                     this.player.play(this.config.runAnimKey, true);
                 }
            }
        } else if (isMovingRight) {
            body.setVelocityX(this.config.moveSpeed);
            this.player.setFlipX(false);
            if (touchingDown) {
                 if (this.player.anims.getName() !== this.config.runAnimKey) {
                     console.log('>>> Playing animation:', this.config.runAnimKey); // DEBUG LOG
                     this.player.play(this.config.runAnimKey, true);
                 }
            }
        } else { // Стоит на месте
            body.setVelocityX(0);
            if (touchingDown) {
                 if (this.player.anims.getName() !== this.config.idleAnimKey) {
                     console.log('>>> Playing animation:', this.config.idleAnimKey); // DEBUG LOG
                     this.player.play(this.config.idleAnimKey, true);
                 }
            }
        }

        // --- Jumping ---
        const canCoyoteJump = time < this.lastJumpTime + this.jumpGracePeriod;

        // Primary Jump
        if (justPressedJump && (touchingDown || canCoyoteJump)) {
            this.performJump();
            this.canDoubleJump = true;
        }
        // Double Jump
        else if (justPressedJump && !touchingDown && this.canDoubleJump && this.config.allowDoubleJump) {
            this.performJump();
            this.canDoubleJump = false;
        }

        // --- Animation in Air ---
        if (!touchingDown) {
            if (body.velocity.y < 0) { // Движется вверх
                 if (this.player.anims.getName() !== this.config.jumpAnimKey) {
                    console.log('>>> Playing animation:', this.config.jumpAnimKey); // DEBUG LOG
                    this.player.play(this.config.jumpAnimKey, true);
                 }
            } else if (body.velocity.y > 10) { // Падает вниз
                 if (this.player.anims.getName() !== this.config.fallAnimKey) {
                     // Проверяем существование анимации падения перед воспроизведением
                     if (this.scene.anims.exists(this.config.fallAnimKey)) {
                         console.log('>>> Playing animation:', this.config.fallAnimKey); // DEBUG LOG
                         this.player.play(this.config.fallAnimKey, true);
                     } else {
                         // Если анимации падения нет, можно использовать последний кадр прыжка
                         console.log('>>> Fall animation missing, setting jump frame texture'); // DEBUG LOG
                         this.player.anims.stop(); // Останавливаем текущую анимацию
                         this.player.setTexture(this.config.jumpFrames[this.config.jumpFrames.length - 1]);
                     }
                 }
            }
        }

        // Invincibility Flash
        if (this.isInvincible) {
            this.player.setVisible(((time % 300) < 150));
        } else {
            this.player.setVisible(true);
        }
    }

    private performJump() {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocityY(this.config.jumpSpeed);
        this.playSound('jump');
        // Проверяем существование анимации прыжка
        if (this.scene.anims.exists(this.config.jumpAnimKey)) {
             console.log('>>> Playing animation (performJump):', this.config.jumpAnimKey); // DEBUG LOG
            this.player.play(this.config.jumpAnimKey, true);
        } else {
            console.warn(`[PlayerController] Jump animation '${this.config.jumpAnimKey}' not found during performJump!`);
        }
        this.lastJumpTime = 0; // Сбрасываем время для койот-тайма
    }

    public applyDamage() {
        if (this.isInvincible) return;

        this.lives--;
        this.scene.registry.set('lives', this.lives);
        this.playSound('playerDamage');
        this.scene.cameras.main.shake(150, 0.008);

        if (this.isPoweredUp) {
            this.deactivatePowerUp(false);
        }

        if (this.lives <= 0) {
            this.scene.events.emit('playerDied');
        } else {
            this.isInvincible = true;
            this.player.setTint(0xff8888); // Красный оттенок при получении урона
            if (this.invincibilityTimer) this.invincibilityTimer.remove();
            this.invincibilityTimer = this.scene.time.delayedCall(this.config.invulnerabilityDuration, () => {
                this.isInvincible = false;
                this.player.setVisible(true);
                // Убираем оттенок, если не активен бонус
                if (!this.isPoweredUp) {
                    this.player.clearTint();
                } else {
                    this.player.setTint(0xffff00); // Возвращаем желтый оттенок бонуса
                }
                this.invincibilityTimer = undefined;
            }, [], this);
        }
    }

    public gainLife() {
        if (this.lives < this.config.maxLives) {
            this.lives++;
            this.scene.registry.set('lives', this.lives);
            this.playSound('powerUp'); // Звук получения жизни
            const lifeText = this.scene.add.text(this.player.x, this.player.y - 30, '+1 ЖИЗНЬ', { // Изменил текст
                 fontSize: '16px', color: '#00ff00', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(this.player.depth + 1);
            this.scene.tweens.add({ targets: lifeText, y: lifeText.y - 50, alpha: 0, duration: 1000, ease: 'Power1', onComplete: () => lifeText.destroy() });
            console.log("Life gained. Total lives:", this.lives);
        } else {
            console.log("Max lives reached.");
            // Можно дать очки вместо жизни при максимуме
        }
    }

    public activatePowerUp() {
        if (this.isPoweredUp) { // Если уже активен, просто перезапускаем таймер
             if(this.powerUpTimer) this.powerUpTimer.remove();
             console.log("Power-up timer refreshed!");
        } else { // Если не активен, активируем
             this.isPoweredUp = true;
             this.player.setTint(0xffff00); // Желтый оттенок
             this.playSound('powerUp');
             console.log("Power-up activated!");
        }
        // Обновляем или устанавливаем таймер
        this.powerUpTimer = this.scene.time.delayedCall(this.config.powerUpDuration, () => {
            this.deactivatePowerUp(true);
        }, [], this);
    }

     private deactivatePowerUp(playPowerDownSound: boolean) {
         if (!this.isPoweredUp) return;
         this.isPoweredUp = false;
         if (playPowerDownSound) this.playSound('powerDown');
         if (!this.isInvincible) { // Не убираем красный оттенок, если неуязвим
             this.player.clearTint();
         }
         if (this.powerUpTimer) { this.powerUpTimer.remove(); this.powerUpTimer = undefined; }
         console.log("Power-up deactivated.");
     }

    public getPlayerSprite(): Phaser.Physics.Arcade.Sprite { return this.player; }
    public getLives(): number { return this.lives; }
    public canBeHurt(): boolean { return !this.isInvincible; }
    public isPlayerPoweredUp(): boolean { return this.isPoweredUp; }

    public disableInputAndPhysics() {
        this.player.setVelocity(0);
        this.player.setActive(false); // Делаем неактивным для обновлений и коллизий
        if (this.player.body) { (this.player.body as Phaser.Physics.Arcade.Body).enable = false; } // Выключаем тело

        // Устанавливаем анимацию idle, если она существует
        if (this.scene.anims.exists(this.config.idleAnimKey)) {
            console.log('>>> Playing animation (disableInputAndPhysics):', this.config.idleAnimKey); // DEBUG LOG
            this.player.play(this.config.idleAnimKey);
        } else {
             console.warn(`[PlayerController] Idle animation '${this.config.idleAnimKey}' not found during disable!`);
             this.player.anims.stop();
             this.player.setTexture(this.config.idleFrames[0]); // Устанавливаем базовую текстуру
        }

        // Reset mobile flags on disable
        this.mobileInputLeft = false;
        this.mobileInputRight = false;
        this.mobileInputJump = false;
    }

    public enableInputAndPhysics() {
        this.player.setActive(true);
        if (this.player.body) { (this.player.body as Phaser.Physics.Arcade.Body).enable = true; }
        // Анимация сама обновится в следующем цикле update()
    }

    // Метод для проигрывания звука через события сцены
    private playSound(key: string){
        this.scene.events.emit('requestSoundPlay', key);
    }
}
