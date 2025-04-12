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

    // --- Mobile Input Flags --- ADDED
    public mobileInputLeft: boolean = false;
    public mobileInputRight: boolean = false;
    public mobileInputJump: boolean = false;
    // --------------------------

    constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite, cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
        this.scene = scene;
        this.player = player;
        this.cursors = cursors;
        this.lives = this.scene.registry.get('lives') ?? GameConfig.player.initialLives;

        this.createAnimations();
        // FIX: Use correct anim key from config
        this.player.play(this.config.idleAnimKey);

        // Example sound loading (adjust as needed)
        // Sounds are emitted via events now, direct sound management here might be redundant
    }

    private createAnimations() {
        // Idle Animation
        // FIX: Use correct anim key from config
        if (!this.scene.anims.exists(this.config.idleAnimKey)) {
            this.scene.anims.create({
                key: this.config.idleAnimKey,
                frames: this.config.idleFrames.map(key => ({ key })),
                frameRate: this.config.idleFrameRate,
                repeat: -1
            });
        }
        // Run Animation
        // FIX: Use correct anim key from config
        if (!this.scene.anims.exists(this.config.runAnimKey)) {
            this.scene.anims.create({
                key: this.config.runAnimKey,
                frames: this.config.runFrames.map(key => ({ key })),
                frameRate: this.config.runFrameRate,
                repeat: -1
            });
        }
        // Jump Animation
        // FIX: Use correct anim key and frame rate from config
        if (!this.scene.anims.exists(this.config.jumpAnimKey)) {
            this.scene.anims.create({
                key: this.config.jumpAnimKey,
                frames: this.config.jumpFrames.map(key => ({ key })),
                frameRate: this.config.jumpFrameRate, // FIX: Use jumpFrameRate
                repeat: 0
            });
        }
         // Fall Animation (Optional)
         // FIX: Use correct anim key from config
         if (!this.scene.anims.exists(this.config.fallAnimKey)) {
             this.scene.anims.create({
                 key: this.config.fallAnimKey,
                 frames: [{ key: this.config.jumpFrames[this.config.jumpFrames.length - 1] }], // Example: last jump frame
                 frameRate: 5,
                 repeat: -1
             });
         }
    }

    public update(time: number, _delta: number): void {
        if (!this.player.active || !this.player.body) return;

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const touchingDown = body.blocked.down || body.touching.down;

        // --- Combine Keyboard & Mobile Input ---
        const isMovingLeft = this.cursors.left?.isDown || this.mobileInputLeft;
        const isMovingRight = this.cursors.right?.isDown || this.mobileInputRight;
        // Check keyboard OR mobile jump flag, then reset mobile flag
        const justPressedJump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.space) || this.mobileInputJump;
        if (this.mobileInputJump) {
            this.mobileInputJump = false; // Reset mobile jump flag after checking
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
            // FIX: Use correct anim key from config
            if (touchingDown) this.player.play(this.config.runAnimKey, true);
        } else if (isMovingRight) {
            body.setVelocityX(this.config.moveSpeed);
            this.player.setFlipX(false);
            // FIX: Use correct anim key from config
            if (touchingDown) this.player.play(this.config.runAnimKey, true);
        } else {
            body.setVelocityX(0);
            // FIX: Use correct anim key from config
            if (touchingDown) this.player.play(this.config.idleAnimKey, true);
        }

        // --- Jumping ---
        const canCoyoteJump = time < this.lastJumpTime + this.jumpGracePeriod;

        // Primary Jump
        if (justPressedJump && (touchingDown || canCoyoteJump)) {
            this.performJump();
            this.canDoubleJump = true;
        }
        // Double Jump
        // FIX: Use correct config flag
        else if (justPressedJump && !touchingDown && this.canDoubleJump && this.config.allowDoubleJump) {
            this.performJump();
            this.canDoubleJump = false;
        }

        // --- Animation ---
        if (!touchingDown) {
             // FIX: Use correct anim keys from config
            if (body.velocity.y < 0) {
                this.player.play(this.config.jumpAnimKey, true);
            } else if (body.velocity.y > 10) {
                this.player.play(this.config.fallAnimKey, true);
            }
        }

        // Invincibility Flash
        if (this.isInvincible) {
            this.player.setVisible(((time % 300) < 150)); // Slightly better blink
        } else {
            this.player.setVisible(true);
        }
    }

    private performJump() {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocityY(this.config.jumpSpeed);
        this.playSound('jump');
        // FIX: Use correct anim key from config
        this.player.play(this.config.jumpAnimKey, true);
        this.lastJumpTime = 0;
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
            this.player.setTint(0xff8888);
            if (this.invincibilityTimer) this.invincibilityTimer.remove();
            // FIX: Use correct config property name
            this.invincibilityTimer = this.scene.time.delayedCall(this.config.invulnerabilityDuration, () => {
                this.isInvincible = false;
                this.player.setVisible(true);
                // Clear tint only if not still powered up
                if (!this.isPoweredUp) {
                    this.player.clearTint();
                } else {
                    this.player.setTint(0xffff00); // Reapply powerup tint
                }
                this.invincibilityTimer = undefined;
            }, [], this);
        }
    }

    public gainLife() {
        // FIX: Use correct config property name
        if (this.lives < this.config.maxLives) {
            this.lives++;
            this.scene.registry.set('lives', this.lives);
            this.playSound('powerUp'); // Or a specific "extra life" sound
            const lifeText = this.scene.add.text(this.player.x, this.player.y - 30, '+1 LIFE', {
                 fontSize: '18px', color: '#00ff00', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(this.player.depth + 1);
            this.scene.tweens.add({ targets: lifeText, y: lifeText.y - 50, alpha: 0, duration: 1000, ease: 'Power1', onComplete: () => lifeText.destroy() });
            console.log("Life gained. Total lives:", this.lives);
        } else {
            console.log("Max lives reached.");
        }
    }

    public activatePowerUp() {
        if (this.isPoweredUp) {
             if(this.powerUpTimer) this.powerUpTimer.remove();
        } else {
             this.isPoweredUp = true;
             this.player.setTint(0xffff00);
             this.playSound('powerUp');
             console.log("Power-up activated!");
        }
        this.powerUpTimer = this.scene.time.delayedCall(this.config.powerUpDuration, () => {
            this.deactivatePowerUp(true);
        }, [], this);
    }

     private deactivatePowerUp(playPowerDownSound: boolean) {
         if (!this.isPoweredUp) return;
         this.isPoweredUp = false;
         if (playPowerDownSound) this.playSound('powerDown');
         if (!this.isInvincible) { // Don't clear tint if invincible
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
        this.player.setActive(false);
        if (this.player.body) { (this.player.body as Phaser.Physics.Arcade.Body).enable = false; }
        // FIX: Use correct anim key from config
        this.player.play(this.config.idleAnimKey);
        // Reset mobile flags on disable
        this.mobileInputLeft = false;
        this.mobileInputRight = false;
        this.mobileInputJump = false;
    }

    public enableInputAndPhysics() {
        this.player.setActive(true);
        if (this.player.body) { (this.player.body as Phaser.Physics.Arcade.Body).enable = true; }
    }

    private playSound(key: string){
        this.scene.events.emit('requestSoundPlay', key);
    }
}