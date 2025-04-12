import React, { useRef, useState, useEffect, useCallback } from 'react';
import Phaser from 'phaser';
import { GvozdScene } from './phaser/GvozdScene'; // Убедитесь, что путь верный
// Убираем импорт PlayerController, т.к. напрямую его тип здесь не нужен
// import { PlayerController } from './phaser/managers/PlayerController';
import StartScreen from './components/StartScreen';   // Убедитесь, что путь верный
import GameUI from './components/GameUI';           // Убедитесь, что путь верный
import MobileControls from './components/MobileControls'; // Убедитесь, что путь верный
import { GameConfig } from './phaser/config/GameConfig'; // Импортируем для начальных жизней

// Ключ сцены Phaser для надежности
const PHASER_SCENE_KEY = 'GvozdScene';

// --- GvozdGame React Component ---
const GvozdGame: React.FC = () => {
  // --- Refs ---
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  // Храним сцену в state, чтобы React реагировал на ее появление
  const [sceneInstance, setSceneInstance] = useState<GvozdScene | null>(null);

  // --- State ---
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Инициализируем жизни из конфига
  const [lives, setLives] = useState(GameConfig.player.initialLives);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [victory, setVictory] = useState(false);

  // --- Effects ---

  // Определение мобильного устройства (без изменений)
  useEffect(() => {
    const checkMobile = () => { setIsMobile(window.innerWidth < 768 || navigator.maxTouchPoints > 0); };
    checkMobile(); window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Обработчик события 'gameOver' от Phaser (без изменений)
  const handleGameOverEvent = useCallback((data: { victory: boolean, score: number }) => {
    console.log('[React] Received gameOver event:', data);
    setIsGameOver(true); setVictory(data.victory); setScore(data.score); setPaused(true);
  }, []);

  // Создание игры Phaser
  const createGame = useCallback(() => {
    if (gameRef.current || !containerRef.current) return;
    console.log("[React] Creating Phaser Game...");

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current, // Явно указываем родителя
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: GameConfig.gameWidth,  // Используем из конфига
            height: GameConfig.gameHeight, // Используем из конфига
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { x: 0, y: GameConfig.gravity }, // Используем из конфига
                debug: false, // ОСТАВЬТЕ true ДЛЯ ОТЛАДКИ ВРАГОВ!
            },
        },
        // Передаем класс сцены и ее ключ
        scene: [GvozdScene], // Можно передать массив, если сцен несколько
        render: { pixelArt: true, antialias: false },
        audio: { disableWebAudio: false },
    };

    // Создаем игру
    const newGame = new Phaser.Game(config);
    gameRef.current = newGame;

    // --- Более надежное получение сцены и подписка на события ---
    // Подписываемся на событие 'ready', которое срабатывает один раз, когда игра готова
    newGame.events.once('ready', () => {
        console.log("[React] Phaser Game Ready event received.");
        // Получаем сцену по ключу ПОСЛЕ того, как игра готова
        const scene = newGame.scene.getScene(PHASER_SCENE_KEY) as GvozdScene | null;
        if (scene) {
            console.log("[React] Scene instance obtained:", scene);
            setSceneInstance(scene); // Сохраняем сцену в state
            scene.init({ muted }); // Инициализируем сцену с состоянием звука
            // Подписываемся на событие gameOver от ИГРЫ Phaser
            newGame.events.on('gameOver', handleGameOverEvent);
        } else {
            console.error("[React] Failed to get scene instance after game ready!");
        }
    });
    // Опционально: обработка ошибок инициализации Phaser
    newGame.events.once('booterror', (error: any) => {
        console.error("[React] Phaser Boot Error:", error);
    });

  }, [muted, handleGameOverEvent]); // Добавляем handleGameOverEvent в зависимости

  // Уничтожение игры Phaser (без изменений)
  const destroyGame = useCallback(() => {
    // Отписываемся от слушателя перед уничтожением
    if (gameRef.current) {
         gameRef.current.events.off('gameOver', handleGameOverEvent);
         console.log("[React] Destroying Phaser Game...");
         gameRef.current.destroy(true, false); // true - remove canvas, false - keep canvas element if needed (usually true)
         gameRef.current = null;
         setSceneInstance(null); // Сбрасываем state сцены
         console.log("[React] Phaser Game Destroyed.");
    }
  }, [handleGameOverEvent]);

  // Управление жизненным циклом игры (без изменений)
  useEffect(() => {
    if (started && !gameRef.current) { createGame(); }
    else if (!started && gameRef.current) { destroyGame(); }
    return () => { destroyGame(); }; // Очистка при размонтировании компонента
  }, [started, createGame, destroyGame]);

  // --- useEffect для обновления UI ИЗМЕНЕН ---
  useEffect(() => {
      // Запускаем интервал только если игра запущена, не окончена И ЕСТЬ экземпляр сцены
      if (started && !isGameOver && sceneInstance) {
          console.log("[React] Starting UI Update Interval."); // Лог запуска интервала
          const intervalId = window.setInterval(() => {
              // Дополнительно проверяем, что сцена все еще активна и не на паузе
              if (sceneInstance.scene.isActive() && !sceneInstance.scene.isPaused()) {
                  try {
                      const currentScore = sceneInstance.getScore();
                      const currentLives = sceneInstance.getLives();
                      const currentDifficulty = sceneInstance.getCurrentDifficulty();

                      // Лог получаемых значений
                      // console.log(`[React UI Update Interval] Score: ${currentScore}, Lives: ${currentLives}, Diff: ${currentDifficulty.toFixed(1)}`);

                      // Обновляем state React, только если значения изменились
                      setScore(prev => prev !== currentScore ? currentScore : prev);
                      setLives(prev => prev !== currentLives ? currentLives : prev);
                      setDifficulty(prev => prev !== currentDifficulty ? currentDifficulty : prev);

                  } catch (e) {
                      console.warn("[React UI Update Interval] Error accessing scene properties:", e);
                      // Не останавливаем интервал при временной ошибке, Phaser может восстановиться
                  }
              } else {
                   // Можно добавить лог, если сцена не активна или на паузе
                   // console.log("[React UI Update Interval] Scene not active or paused.");
              }
          }, 300); // Увеличим интервал до 300ms

          // Функция очистки интервала
          return () => {
               console.log("[React] Clearing UI Update Interval."); // Лог очистки
               clearInterval(intervalId);
          };
      }
      // Если игра не запущена, окончена или нет сцены, интервал не создается или очищается
  }, [started, isGameOver, sceneInstance]); // ЗАВИСИМОСТИ: started, isGameOver, и ВАЖНО: sceneInstance

  // --- Обработчики UI ---
  const handleStart = () => {
    console.log('[React] Start button clicked');
    setIsGameOver(false); setVictory(false); setScore(0);
    setLives(GameConfig.player.initialLives); // Сброс жизней из конфига
    setDifficulty(1); setPaused(false);
    // Важно: Устанавливаем started, useEffect создаст игру
    setStarted(true);
  };

  const handlePause = () => {
    // Используем state сцены для проверки
    if (!sceneInstance || !started || isGameOver) return;
    const newPausedState = !paused;
    if (newPausedState) {
      if (!sceneInstance.scene.isPaused()) {
        sceneInstance.scene.pause();
        sceneInstance.setMuteState(muted); // Обновляем звук при паузе
      }
    } else {
      if (sceneInstance.scene.isPaused()) {
        sceneInstance.scene.resume();
        sceneInstance.setMuteState(muted); // Обновляем звук при возобновлении
      }
    }
    setPaused(newPausedState);
    console.log(`[React] Game ${newPausedState ? 'paused' : 'resumed'}`);
  };

  const handleMute = () => {
    const newMutedState = !muted;
    setMuted(newMutedState);
    // Используем state сцены для вызова метода
    sceneInstance?.setMuteState(newMutedState);
    console.log(`[React] Mute toggled: ${newMutedState}`);
  };

  const handleRestart = () => {
    console.log('[React] Restart button clicked');
    setStarted(false); // Это триггернет destroyGame в useEffect
    setIsGameOver(false); setVictory(false); setPaused(false);
    // Небольшая задержка перед стартом, чтобы Phaser успел уничтожиться
    setTimeout(() => {
      handleStart(); // Затем вызываем handleStart, который установит started=true и создаст игру
    }, 150);
  };

  // Обработчик мобильного управления
  const handleMobileControl = (control: 'left' | 'right' | 'jump', active: boolean) => {
    // Используем state сцены для получения контроллера
    const playerCtrl = sceneInstance?.getPlayerControllerInstance();
    // Проверяем сцену и контроллер
    if (!sceneInstance || !playerCtrl || !sceneInstance.scene.isActive() || paused || isGameOver) return;

    try {
        switch (control) {
          case 'left': playerCtrl.mobileInputLeft = active; break;
          case 'right': playerCtrl.mobileInputRight = active; break;
          case 'jump': if (active) { playerCtrl.mobileInputJump = true; } break;
        }
    } catch(e) { console.warn("Error setting mobile input:", e); }
  };

  // --- Рендер Компонента ---
  return (
    <div style={styles.pageWrapper}>
      <video style={styles.backgroundVideo} autoPlay loop muted playsInline preload="auto">
        <source src="/assets/gvozd/bg.mp4" type="video/mp4" />
        Ваш браузер не поддерживает тег video.
      </video>

      <div style={styles.gameContainer}>
        {/* Phaser Canvas рендерится здесь */}
        <div ref={containerRef} style={{ width: '100%', height: '100%', display: started ? 'block' : 'none' }} id="phaser-container" />

        {/* Стартовый Экран */}
        {!started && <StartScreen onStart={handleStart} isMobile={isMobile} />}

        {/* Игровой UI */}
        {started && (
          <GameUI
            score={score}
            lives={lives}
            difficulty={difficulty}
            paused={paused}
            muted={muted}
            isGameOver={isGameOver}
            victory={victory}
            onPauseToggle={handlePause}
            onMuteToggle={handleMute}
            onRestart={handleRestart}
          />
        )}

        {/* Мобильные Кнопки */}
        {started && !isGameOver && isMobile && (
          <MobileControls onControlChange={handleMobileControl} />
        )}
      </div>
    </div>
  );
};

// --- Стили (без изменений) ---
const styles: { [key: string]: React.CSSProperties } = {
  pageWrapper: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', minHeight: '100vh', width: '100vw', padding: '10px', boxSizing: 'border-box', overflow: 'hidden', },
  gameContainer: { position: 'relative', zIndex: 1, border: '4px solid #374151', borderRadius: '8px', boxShadow: '0 6px 12px rgba(0, 0, 0, 0.5)', overflow: 'hidden', backgroundColor: '#000000', width: '100%', height: 'auto', maxWidth: `${GameConfig.gameWidth}px`, maxHeight: `calc(100vh - 40px)`, aspectRatio: `${GameConfig.gameWidth} / ${GameConfig.gameHeight}`, margin: 'auto', },
  backgroundVideo: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', objectFit: 'cover', zIndex: -1, opacity: 0.7, },
};

export default GvozdGame;