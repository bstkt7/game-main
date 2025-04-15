import Phaser from 'phaser';
// Import the specific player config type and the main config for bounce values
import { GameConfig, PlayerConfigType } from '../config/GameConfig';

export class PlayerController {
    private scene: Phaser.Scene;
    private player: Phaser.Physics.Arcade.Sprite; // Keep 'player' name consistent
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private config: PlayerConfigType = GameConfig.player; // Use specific PlayerConfigType

    private lives: number = GameConfig.player.initialLives;
    private isInvulnerable: boolean = false; // Renamed from isInvincible
    private invulnerabilityTimer?: Phaser.Time.TimerEvent;
    private invulnerabilityTween?: Phaser.Tweens.Tween;
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
        this.isInvulnerable = false;
        this.isPoweredUp = false;

        try {
            console.log('[PlayerController] Creating animations...');
            this.createAnimations();
            console.log('[PlayerController] Animations created.');

            if (this.player && this.player.active) {
                 console.log('>>> Playing initial animation:', this.config.idleAnimKey);
                 this.playAnimation(this.config.idleAnimKey); // Use helper
                 console.log('[PlayerController] Initial animation set.');
            } else {
                console.warn('[PlayerController] Player sprite invalid in constructor.');
            }
        } catch (error) {
            console.error('[PlayerController] Error in constructor during animation setup:', error);
        }
    }

    private createAnimations() {
        console.log('[PlayerController Anims] Attempting to create animations.');
        const anims = this.scene.anims;
        const createAnim = (config: Phaser.Types.Animations.Animation) => {
             if (config.key && !anims.exists(config.key)) {
                 try { anims.create(config); }
                 catch(e) { console.error(`Error creating anim ${config.key}`, e); }
             }
        }
        // Idle
        createAnim({ key: this.config.idleAnimKey, frames: this.config.idleFrames.map(key => ({ key })), frameRate: this.config.idleFrameRate, repeat: -1 });
        // Run
        createAnim({ key: this.config.runAnimKey, frames: this.config.runFrames.map(key => ({ key })), frameRate: this.config.runFrameRate, repeat: -1 });
        // Jump
        createAnim({ key: this.config.jumpAnimKey, frames: this.config.jumpFrames.map(key => ({ key })), frameRate: this.config.jumpFrameRate, repeat: 0 });
        // Fall
        try {
             const fallFrameKey = this.config.jumpFrames[this.config.jumpFrames.length - 1];
             if (this.scene.textures.exists(fallFrameKey)) {
                 createAnim({ key: this.config.fallAnimKey, frames: [{ key: fallFrameKey }], frameRate: 5, repeat: -1 });
             } else { console.error(`[PlayerController Anims] Fall frame texture missing: ${fallFrameKey}`); }
        } catch (error) { console.error(`[PlayerController Anims] Error creating fall animation '${this.config.fallAnimKey}':`, error); }

        console.log('[PlayerController Anims] Finished creating animations.');
    }


    public update(time: number, _delta: number): void {
        if (!this.player?.active || !this.player.body) return;

        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const touchingDown = body.blocked.down || body.touching.down;

        // --- Combine Keyboard & Mobile Input ---
        const isMovingLeft = this.cursors.left?.isDown || this.mobileInputLeft;
        const isMovingRight = this.cursors.right?.isDown || this.mobileInputRight;
        let justPressedJump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.space) || this.mobileInputJump;
        if (this.mobileInputJump) this.mobileInputJump = false; // Reset mobile jump flag

        // --- State Updates ---
        if (touchingDown) {
            this.canDoubleJump = true; // Reset double jump on ground
            this.lastJumpTime = time; // Update last time on ground for coyote time
        }

        // --- Movement ---
        if (isMovingLeft) {
            body.setVelocityX(-this.config.moveSpeed);
            this.player.setFlipX(true);
            if (touchingDown) this.playAnimation(this.config.runAnimKey);
        } else if (isMovingRight) {
            body.setVelocityX(this.config.moveSpeed);
            this.player.setFlipX(false);
            if (touchingDown) this.playAnimation(this.config.runAnimKey);
        } else { // Standing still
            body.setVelocityX(0);
            if (touchingDown) this.playAnimation(this.config.idleAnimKey);
        }

        // --- Jumping ---
        const canCoyoteJump = !touchingDown && (time < this.lastJumpTime + this.jumpGracePeriod);

        if (justPressedJump && (touchingDown || canCoyoteJump)) {
            this.performJump();
            this.canDoubleJump = true;
        }
        else if (justPressedJump && !touchingDown && this.canDoubleJump && this.config.allowDoubleJump) {
            this.performJump();
            this.canDoubleJump = false;
        }

        // --- Animation in Air ---
        if (!touchingDown) {
            if (body.velocity.y < -10) { // Moving up
                 this.playAnimation(this.config.jumpAnimKey, false); // Allow jump animation to play fully
            } else if (body.velocity.y > 10) { // Falling down
                 this.playAnimation(this.config.fallAnimKey);
            }
        }
    }

    private performJump() {
        if (!this.player?.body) return;
        let jumpVelocity = this.config.jumpSpeed;
        if (this.isPoweredUp) { jumpVelocity *= this.config.powerUpJumpMultiplier; }
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocityY(jumpVelocity);
        this.playSound('jump');
        this.playAnimation(this.config.jumpAnimKey, false); // Play jump anim, don't ignore if playing
        this.lastJumpTime = 0; // Reset coyote time eligibility
    }

    // --- Added / Updated Methods ---

    /** Returns true if the player can currently take damage. */
    public canBeHurt(): boolean {
        return !this.isInvulnerable && !!this.player?.active && this.lives > 0;
    }

    /** Applies the player's bounce effect after stomping an enemy. */
    public triggerStompBounce(): void {
        if (this.player?.body instanceof Phaser.Physics.Arcade.Body) {
            // Увеличиваем силу отскока для более заметного эффекта
            let bounceSpeed = this.config.stompBounceSpeed * 1.5; // Увеличиваем силу отскока на 50%
            
            if (this.isPlayerPoweredUp()) {
                bounceSpeed *= this.config.powerUpJumpMultiplier;
            }
            
            // Устанавливаем высокую скорость отскока вверх
            this.player.body.setVelocityY(-bounceSpeed);
            
            // Добавляем небольшой горизонтальный импульс для более динамичного отскока
            const currentVelocityX = this.player.body.velocity.x;
            this.player.body.setVelocityX(currentVelocityX * 0.8); // Сохраняем часть горизонтальной скорости
            
            // Воспроизводим анимацию прыжка
            this.playAnimation(this.config.jumpAnimKey, false);
            
            // Воспроизводим звук отскока
            this.playSound('jump');
            
            console.log("Player bounced after stomping enemy with speed:", bounceSpeed);
        }
    }

    /** Handles the logic when the player collides with an enemy (non-stomp). */
    public handleEnemyCollision(enemy?: Phaser.Physics.Arcade.Sprite): void {
        if (!this.canBeHurt()) return; // Exit if invulnerable

        this.lives--;
        this.scene.registry.set('lives', this.lives); // Update global lives count
        this.playSound('playerDamage'); // Use helper method
        this.scene.cameras.main.shake(150, 0.008); // Screen shake

        console.log(`Player damaged! Lives remaining: ${this.lives}`);

        // If powered up, lose power-up (optional behavior)
        if (this.isPoweredUp) {
            this.deactivatePowerUp(false);
        }

        if (this.lives <= 0) {
            this.gameOver(false); // Trigger game over
        } else {
            // --- Apply Invulnerability ---
            this.isInvulnerable = true;
            this.invulnerabilityTimer?.remove(); // Clear previous timer/tween
            this.invulnerabilityTween?.stop();
            this.player?.setAlpha(1); // Ensure alpha is reset

            // Blinking effect using Tween
            this.invulnerabilityTween = this.scene.tweens.add({
                targets: this.player, alpha: { from: 0.5, to: 1 }, duration: 150, ease: 'Linear',
                repeat: Math.floor(this.config.invulnerabilityDuration / (150 * 2)) - 1, yoyo: true,
                onComplete: () => { if (this.player?.active) { this.player.setAlpha(1); } }
            });

            // Timer to end invulnerability state
            this.invulnerabilityTimer = this.scene.time.delayedCall(this.config.invulnerabilityDuration, () => {
                this.isInvulnerable = false;
                if (this.player?.active) { this.player.setAlpha(1); } // Ensure alpha is reset
                this.invulnerabilityTween = undefined; this.invulnerabilityTimer = undefined;
                console.log("Player invulnerability ended.");
            }, [], this);

            // --- Apply Knockback (Optional) ---
            if (this.player?.body instanceof Phaser.Physics.Arcade.Body && enemy) {
                const knockbackX = (enemy.x < this.player.x) ? 120 : -120;
                const knockbackY = -200;
                this.player.body.setVelocity(knockbackX, knockbackY);
            }
        }
    }

    /** Simple damage application (can be called by handleEnemyCollision or other hazards) */
    public applyDamage(): void {
        // Calls the main handler, assuming most damage sources behave similarly
        this.handleEnemyCollision();
    }

    // --- Other Methods ---

    public gainLife() {
        if (this.lives < this.config.maxLives) {
            this.lives++;
            this.scene.registry.set('lives', this.lives);
            this.playSound('powerUp'); // Or a specific "lifeUp" sound
            const lifeText = this.scene.add.text(this.player.x, this.player.y - 30, '+1 ЖИЗНЬ', {
                 fontSize: '16px', color: '#00ff00', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(this.player.depth + 1);
            this.scene.tweens.add({ targets: lifeText, y: lifeText.y - 50, alpha: 0, duration: 1000, ease: 'Power1', onComplete: () => lifeText.destroy() });
            console.log("Life gained. Total lives:", this.lives);
        } else {
            console.log("Max lives reached.");
            // Optional: Grant score instead
            // this.scene.registry.values.score += 1000;
            // this.scene.events.emit('updateScore', this.scene.registry.values.score);
        }
    }

    public activatePowerUp() {
        if (this.isPoweredUp && this.powerUpTimer) {
            this.powerUpTimer.remove(); // Refresh timer if already powered up
             console.log("Power-up timer refreshed!");
        } else {
             this.isPoweredUp = true;
             this.player.setTint(0xffff00); // Example power-up tint
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
        // Only clear tint if not currently invulnerable (which might have its own tint)
        if (!this.isInvulnerable) {
            this.player?.clearTint();
        }
        if (this.powerUpTimer) { this.powerUpTimer.remove(); this.powerUpTimer = undefined; }
        console.log("Power-up deactivated.");
    }

    public getPlayerSprite(): Phaser.Physics.Arcade.Sprite { return this.player; }
    public getLives(): number { return this.lives; }
    public setLives(lives: number): void { 
        this.lives = lives;
        this.scene.registry.set('lives', this.lives);
    }
    public isPlayerPoweredUp(): boolean { return this.isPoweredUp; }

    public disableInputAndPhysics() {
        this.player?.setVelocity(0);
        this.player?.setActive(false);
        if (this.player?.body) { (this.player.body as Phaser.Physics.Arcade.Body).enable = false; }
        this.playAnimation(this.config.idleAnimKey); // Set to idle anim
        // Reset mobile flags
        this.mobileInputLeft = false; this.mobileInputRight = false; this.mobileInputJump = false;
    }

    public enableInputAndPhysics() {
        this.player?.setActive(true);
        if (this.player?.body) { (this.player.body as Phaser.Physics.Arcade.Body).enable = true; }
        // Animation will update in the next frame via update()
    }

    /** Plays the specified animation if it exists and is different from the current one. */
    private playAnimation(key: string, ignoreIfPlaying: boolean = true): void {
       if (this.player && this.player.anims && this.player.active) {
            try {
                 if (!ignoreIfPlaying || this.player.anims.currentAnim?.key !== key) {
                     // console.log(`>>> Playing animation: ${key}`); // Optional debug
                     this.player.play(key, true);
                 }
            } catch (error) { console.error(`Error playing animation "${key}":`, error) }
        }
    }

    /** Handles game over logic */
    private gameOver(victory: boolean): void {
         console.log(`PlayerController triggering Game Over! Victory: ${victory}`);
         this.disableInputAndPhysics(); // Disable player
         // Emit event for the scene/UI manager
         this.scene.events.emit('gameOver', { victory: victory, score: this.scene.registry.get('score') || 0 });
         // Scene should pause physics etc. based on this event
    }

    private playSound(key: string){
        this.scene.events.emit('requestSoundPlay', key);
    }
}