import Phaser from 'phaser';
// Убедитесь, что импортируется главный GameConfig и PlayerConfigType если нужен
import { GameConfig } from '../config/GameConfig'; // Обновленный импорт
import { PlayerController } from './PlayerController';

// Определим тип для настроек катсцены для удобства
type CutsceneConfigType = typeof GameConfig.cutscene;

export class CutsceneManager {
    private scene: Phaser.Scene;
    // Используем типизированный конфиг
    private config: CutsceneConfigType = GameConfig.cutscene;
    private playerController: PlayerController;
    private groupsToClear: (Phaser.Physics.Arcade.Group | Phaser.Physics.Arcade.StaticGroup)[];
    private topBar: Phaser.GameObjects.Rectangle;
    private bottomBar: Phaser.GameObjects.Rectangle;
    private photoSound: Phaser.Sound.BaseSound;
    private gvozdSocialSound: Phaser.Sound.BaseSound;

    private isActive = false;
    private hasPlayed = false;
    private cutsceneGameObjects: Phaser.GameObjects.GameObject[] = [];

    constructor(
        scene: Phaser.Scene,
        playerController: PlayerController,
        groupsToClear: (Phaser.Physics.Arcade.Group | Phaser.Physics.Arcade.StaticGroup)[],
        bars: { top: Phaser.GameObjects.Rectangle, bottom: Phaser.GameObjects.Rectangle }
    ) {
        this.scene = scene;
        this.playerController = playerController;
        this.groupsToClear = groupsToClear;
        this.topBar = bars.top;
        this.bottomBar = bars.bottom;

        // Безопасное добавление звуков
        this.photoSound = this.scene.sound.add('photo_sound', { volume: GameConfig.soundVolumes.photo ?? 0.8 });
        this.gvozdSocialSound = this.scene.sound.add('gvozd_social', { volume: GameConfig.soundVolumes.gvozd_social ?? 0.9 });
    }

    public isCutsceneActive(): boolean {
        return this.isActive;
    }

     public hasCutscenePlayed(): boolean {
         return this.hasPlayed;
     }

    public resetState() {
        this.isActive = false;
        this.hasPlayed = false;
        this.topBar.setVisible(false).setY(-this.config.barHeight / 2);
        this.bottomBar.setVisible(false).setY(GameConfig.gameHeight + this.config.barHeight / 2);
        this.cutsceneGameObjects.forEach(obj => { if (obj.active) obj.destroy(); });
        this.cutsceneGameObjects = [];
        console.log("Cutscene Manager state reset.");
    }

    public start() {
        if (this.isActive || this.hasPlayed) return;
        console.log('Starting Babka Cutscene...');
        this.isActive = true;
        this.hasPlayed = true;
        this.cutsceneGameObjects = [];

        this.playerController.disableInputAndPhysics();
        // Используем правильный ключ анимации из конфига игрока
        const playerIdleFrame = GameConfig.player.idleFrames[0] ?? 'i1'; // Запасной кадр
        this.playerController.getPlayerSprite().setTexture(playerIdleFrame).setFlipX(false);

        const objectsToRemove: Phaser.GameObjects.GameObject[] = [];
        this.groupsToClear.forEach(group => {
            // Проверяем, существует ли group и метод getChildren перед его вызовом
            if (group && typeof group.getChildren === 'function') {
                 objectsToRemove.push(...group.getChildren());
            } else {
                 console.warn("CutsceneManager: Encountered invalid group in groupsToClear.");
            }
        });


        if (objectsToRemove.length > 0) {
            // Фильтруем только активные объекты перед анимацией
            const activeObjects = objectsToRemove.filter(obj => obj.active);
             if(activeObjects.length > 0) {
                this.scene.tweens.add({
                    targets: activeObjects,
                    alpha: 0,
                    duration: 300, // Используем config.elementFadeDuration?
                    onComplete: () => {
                        // Очищаем группы ПОСЛЕ анимации
                        this.groupsToClear.forEach(group => {
                             if (group && typeof group.clear === 'function') {
                                 group.clear(true, true); // Удаляем из памяти и уничтожаем
                             }
                         });
                        console.log('Cutscene objects cleared');
                    }
                });
             } else {
                 // Если активных объектов не было, сразу очищаем группы
                 this.groupsToClear.forEach(group => {
                     if (group && typeof group.clear === 'function') {
                         group.clear(true, true);
                     }
                 });
             }
        }

        this.topBar.setVisible(true).setY(-this.config.barHeight / 2);
        this.bottomBar.setVisible(true).setY(GameConfig.gameHeight + this.config.barHeight / 2);
        // Используем config для длительности анимации баров
        this.scene.tweens.add({ targets: this.topBar, y: this.config.barHeight / 2, duration: this.config.barTweenDuration, ease: 'Power2' });
        this.scene.tweens.add({ targets: this.bottomBar, y: GameConfig.gameHeight - this.config.barHeight / 2, duration: this.config.barTweenDuration, ease: 'Power2', onComplete: () => this.spawnCharacters() });
    }

    private spawnCharacters() {
        if (!this.isActive) return;
        console.log('Spawning cutscene characters');
        const playerSprite = this.playerController.getPlayerSprite();
        if(!playerSprite) return; // Доп. проверка

        const playerX = playerSprite.x;
        const groundY = GameConfig.ground.top; // Y земли из основного конфига

        // Создаем персонажей используя свойства из this.config (GameConfig.cutscene)
        const babka = this.scene.add.image(playerX + this.config.babkaOffset, groundY, 'babka')
            .setOrigin(0.5, 1).setScale(this.config.babkaScale).setDepth(70).setAlpha(0);
        const photographer = this.scene.add.image(playerX + this.config.photoOffset, groundY, 'photo')
            .setOrigin(0.5, 1).setScale(this.config.photoScale).setDepth(71).setAlpha(0);

        this.cutsceneGameObjects.push(babka, photographer);

        // Используем длительность из this.config
        this.scene.tweens.add({
            targets: [babka, photographer],
            alpha: 1,
            duration: this.config.elementFadeDuration, // Общая длительность для появления
            delay: 100, // Небольшая задержка
            onComplete: () => this.dropGramota(babka)
        });
    }

    private dropGramota(babka: Phaser.GameObjects.Image) {
        if (!this.isActive || !babka?.active) return; // Проверка бабки
        console.log('Dropping gramota');

        // Используем свойства из this.config
        const gramota = this.scene.add.image(babka.x, babka.y - this.config.gramotaDropHeight, 'gramota')
            .setScale(this.config.gramotaScale).setDepth(75).setAlpha(0);

        this.cutsceneGameObjects.push(gramota);

        // Анимация появления
        this.scene.tweens.add({
            targets: gramota,
            alpha: 1,
            duration: 200, // Быстрое появление
            ease: 'Linear',
            onComplete: () => {
                if (!this.isActive) return;
                 // Анимация падения
                this.scene.tweens.add({
                    targets: gramota,
                    y: babka.y - babka.displayHeight * 0.7, // Примерное положение в руках
                    duration: this.config.gramotaFallDuration, // Используем из конфига
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        if (!this.isActive) return;
                        console.log('Gramota landed, triggering flash');
                        this.triggerFlash();
                         // Используем endDelay из конфига
                        this.scene.time.delayedCall(this.config.endDelay, this.end, [], this);
                    }
                });
            }
        });
    }

     private triggerFlash() {
         if (!this.isActive) return;
         console.log('Triggering photo flash!');

         this.photoSound?.play(); // Проверка на существование звука
         this.scene.time.delayedCall(100, () => this.gvozdSocialSound?.play(), [], this);

         const cam = this.scene.cameras.main;
         if (!cam) return; // Проверка камеры

         const flash = this.scene.add.rectangle(cam.scrollX + cam.width / 2, cam.scrollY + cam.height / 2, cam.width, cam.height, 0xffffff, 1)
             .setScrollFactor(0) // Важно для фиксации на камере
             .setDepth(9999)
             .setAlpha(0); // Начинаем с невидимого

         // Анимация вспышки
         this.scene.tweens.add({
             targets: flash,
             alpha: { from: 0, to: 1 }, // Явное указание начального и конечного значения
             duration: this.config.flashDuration / 3, // Быстрое появление
             ease: 'Linear',
             hold: this.config.flashDuration / 3, // Держим яркость
             yoyo: true, // Плавное исчезновение
             onComplete: () => {
                 // Убедимся, что объект все еще существует перед уничтожением
                 if (flash.active) {
                     flash.destroy();
                 }
                 console.log('Flash complete');
             }
         });
     }


    private end() {
        if (!this.isActive) return;
        console.log('Ending Babka Cutscene...');
        this.isActive = false;

        // Убираем бары используя длительность из конфига
        this.scene.tweens.add({ targets: this.topBar, y: -this.config.barHeight / 2, duration: this.config.barTweenDuration, ease: 'Power2', onComplete: () => this.topBar.setVisible(false) });
        this.scene.tweens.add({ targets: this.bottomBar, y: GameConfig.gameHeight + this.config.barHeight / 2, duration: this.config.barTweenDuration, ease: 'Power2', onComplete: () => this.bottomBar.setVisible(false) });

        // Убираем и уничтожаем объекты катсцены
        if (this.cutsceneGameObjects.length > 0) {
             // Фильтруем только активные объекты
             const activeCutsceneObjects = this.cutsceneGameObjects.filter(obj => obj.active);
             if (activeCutsceneObjects.length > 0) {
                 this.scene.tweens.add({
                     targets: activeCutsceneObjects,
                     alpha: 0,
                     duration: this.config.elementFadeDuration, // Используем из конфига
                     delay: 200, // Небольшая задержка перед исчезновением
                     onComplete: () => {
                         // Уничтожаем только те, что еще активны
                         activeCutsceneObjects.forEach(obj => { if (obj.active) obj.destroy(); });
                         this.cutsceneGameObjects = []; // Очищаем массив
                         this.emitFinishEvent(); // Вызываем событие ПОСЛЕ анимации
                     }
                 });
             } else {
                 this.cutsceneGameObjects = []; // Очищаем массив если не было активных
                 this.emitFinishEvent(); // Вызываем событие сразу
             }
        } else {
             this.emitFinishEvent(); // Вызываем событие если массив был пуст
        }
    }

    // Вынес вызов события в отдельный метод для чистоты
    private emitFinishEvent() {
         console.log('Cutscene finished. Emitting event.');
         // Проверяем, не закончилась ли игра во время катсцены
         const sceneInstance = this.scene as any; // Временно используем any для доступа к isGameOver (лучше передать флаг или использовать registry)
         if (sceneInstance && !sceneInstance.isGameOver) {
             this.scene.events.emit('cutsceneFinished'); // Сообщаем сцене о завершении
         } else {
             console.log('Game ended during cutscene, not resuming player.');
         }
    }
}