// src/phaser/managers/UIManager.ts
import Phaser from 'phaser';

export class UIManager {

    constructor(private scene: Phaser.Scene) {
        // Слушаем изменения реестра (если они нужны для логики ВНУТРИ Phaser)
        // В данном случае, эта подписка может быть даже не нужна,
        // т.к. React UI обновляется через setInterval в Gvozd.tsx.
        // Оставим ее на случай, если захотите добавить UI элементы прямо в Phaser.
        this.scene.registry.events.on('changedata', this.handleRegistryChange, this);

        console.log("UIManager initialized.");
    }

    // Обработчик изменений реестра (для потенциального Phaser UI)
    private handleRegistryChange(_parent: any, key: string, data: any, _previousData: any) {
        // console.log(`[UIManager - Phaser Registry] Key: ${key}, Data: ${data}`); // Лог для отладки реестра

        // Здесь можно добавить логику обновления UI ЭЛЕМЕНТОВ ВНУТРИ PHASER СЦЕНЫ,
        // если они будут созданы (например, текст счета прямо над игровым полем).
        // Сейчас эта функция не делает ничего важного для React UI.
        if (key === 'gvozdikiCollected') {
            this.updateScoreDisplay(data);
        } else if (key === 'lives') {
            this.updateLivesDisplay(data);
        }
    }

    // Методы для ОБНОВЛЕНИЯ UI ВНУТРИ PHASER СЦЕНЫ (если он есть)
    // Сейчас они не влияют на React UI. Можете их пока оставить пустыми.
    public updateScoreDisplay(_score: number) {
        // console.log("[UIManager - Phaser UI] updateScoreDisplay:", _score);
        // Пример: this.phaserScoreText?.setText(`Счет: ${_score}`);
    }

    public updateLivesDisplay(_lives: number) {
        // console.log("[UIManager - Phaser UI] updateLivesDisplay:", _lives);
        // Пример: обновить видимость иконок жизней в Phaser сцене
    }

    // --- ГЛАВНАЯ ФУНКЦИЯ: Отправка события окончания игры в React ---
    public emitGameOver(isVictory: boolean, score: number) {
        // Используем this.scene.game.events, чтобы React компонент мог слушать
        this.scene.game.events.emit('gameOver', { victory: isVictory, score: score });
        console.log("UIManager emitted 'gameOver' event via game emitter.");
    }

    // --- Очистка при завершении сцены ---
    public shutdown() {
         this.scene.registry.events.off('changedata', this.handleRegistryChange, this);
         // Уничтожить Phaser UI элементы, если создавались
         console.log("UIManager shutdown.");
    }
}