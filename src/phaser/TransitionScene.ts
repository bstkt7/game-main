// src/phaser/TransitionScene.ts
import Phaser from 'phaser';
import { SceneKeys, GameConfig } from './config/GameConfig'; // Импортируем SceneKeys

export class TransitionScene extends Phaser.Scene {
    private nextSceneKey!: string;
    private passData!: object; // Используем более общий тип object

    constructor() {
        super({ key: SceneKeys.TransitionScene }); // Используем ключ из SceneKeys
    }

    // Принимаем данные, включая ключ следующей сцены
    init(data: { nextScene: string, [key: string]: any }) { // Используем индексную подпись для гибкости
        this.nextSceneKey = data.nextScene;
        // Копируем все данные, КРОМЕ 'nextScene'
        const { nextScene, ...restData } = data;
        this.passData = restData;
        console.log(`TransitionScene init. Next scene: ${this.nextSceneKey}`, this.passData);
    }

    preload() {
        console.log("TransitionScene preload.");
        // Загрузка специфичных для перехода ассетов, если нужно
        // Шрифты лучше грузить через CSS (@font-face)
    }

    create() {
        console.log("TransitionScene create.");
        this.cameras.main.setBackgroundColor('#111827'); // Темно-серый фон

        const screenCenterX = GameConfig.gameWidth / 2;
        const screenCenterY = GameConfig.gameHeight / 2;

        // Текст в зависимости от следующей сцены (пример)
        let transitionText = 'Loading...';
        if (this.nextSceneKey === 'CaveScene') {
            transitionText = 'ПОДЗЕМЕЛЬЕ';
        } // Добавить другие варианты, если будут еще уровни

        this.add.text(
            screenCenterX, screenCenterY, transitionText,
            { fontFamily: '"Press Start 2P", cursive', fontSize: '48px', color: '#ffffff', align: 'center' }
        ).setOrigin(0.5);

        // Длительность перехода
        const transitionDuration = 2500; // 2.5 секунды
        this.time.delayedCall(transitionDuration, () => {
            console.log(`Transitioning to ${this.nextSceneKey}`);
            this.scene.start(this.nextSceneKey, this.passData); // Запускаем следующую сцену
        }, [], this);
    }
}