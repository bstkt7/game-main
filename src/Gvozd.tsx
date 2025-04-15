// src/Gvozd.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Phaser from 'phaser';
import { GvozdScene } from './phaser/GvozdScene';
import { TransitionScene } from './phaser/TransitionScene';
import { CaveScene } from './phaser/CaveScene';
import StartScreen from './components/StartScreen';
import GameUI from './components/GameUI';
import MobileControls from './components/MobileControls';
import { GameConfig } from './phaser/config/GameConfig';

// Ключи сцен (теперь будут использоваться)
const GVOZD_SCENE_KEY = 'GvozdScene';
const TRANSITION_SCENE_KEY = 'TransitionScene';

const getStyles = (isMobile: boolean): { [key: string]: React.CSSProperties } => ({
  pageWrapper: { 
    position: 'relative', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    color: 'white', 
    minHeight: '100vh', 
    width: '100vw', 
    padding: isMobile ? '0' : '10px', 
    boxSizing: 'border-box', 
    overflow: 'hidden' 
  },
  gameContainer: { 
    position: 'relative', 
    zIndex: 1, 
    border: isMobile ? 'none' : '4px solid #374151', 
    borderRadius: isMobile ? '0' : '8px', 
    boxShadow: isMobile ? 'none' : '0 6px 12px rgba(0, 0, 0, 0.5)', 
    overflow: 'hidden', 
    backgroundColor: '#000000', 
    width: '100%', 
    height: isMobile ? '100vh' : 'auto', 
    maxWidth: isMobile ? '100vw' : `${GameConfig.gameWidth}px`, 
    maxHeight: isMobile ? '100vh' : `calc(100vh - 40px)`, 
    aspectRatio: isMobile ? 'auto' : `${GameConfig.gameWidth} / ${GameConfig.gameHeight}`, 
    margin: isMobile ? '0' : 'auto' 
  },
  backgroundVideo: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    width: '100vw', 
    height: '100vh', 
    objectFit: 'cover', 
    zIndex: -1, 
    opacity: 0.7,
    display: isMobile ? 'none' : 'block' 
  },
});

const GvozdGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [activeScene, setActiveScene] = useState<Phaser.Scene | null>(null);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [lives, setLives] = useState(GameConfig.player.initialLives);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  console.log("[GvozdGame.tsx] Component rendering, started:", started, "activeScene:", !!activeScene);

  // --- Функция для установки фокуса ---
  const focusGameContainer = useCallback(() => {
    setTimeout(() => {
      if (containerRef.current && document.activeElement !== containerRef.current) {
        console.log("[GvozdGame.tsx] Attempting to focus game container");
        containerRef.current.focus({ preventScroll: true });
        // Отладочный лог фокуса
        setTimeout(() => {
             console.log("[GvozdGame.tsx] Active element after focus attempt:", document.activeElement);
        }, 50);
      }
    }, 150); // Задержка для React/браузера
  }, []);

  // Определение мобильного устройства и ориентации
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768 || navigator.maxTouchPoints > 0);
    const checkOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth);
    
    checkMobile();
    checkOrientation();
    
    window.addEventListener('resize', () => {
      checkMobile();
      checkOrientation();
    });
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('resize', checkOrientation);
    };
  }, []);

  // Обработчик Game Over
  const handleGameOverEvent = useCallback((data: { victory: boolean, score: number }) => {
    console.log('[GvozdGame.tsx] Received gameOver event:', data);
    setIsGameOver(true);
    setVictory(data.victory);
    setScore(data.score);
    setPaused(true);
    if (gameRef.current) {
      gameRef.current.scene.getScenes(true).forEach(scene => {
        if (scene.scene.key !== TRANSITION_SCENE_KEY) { // Используем константу
          console.log(`[GameOver] Stopping scene: ${scene.scene.key}`);
          scene.scene.stop();
        }
      });
    }
  }, []);

  // Создание игры Phaser
  const createGame = useCallback(() => {
    if (gameRef.current || !containerRef.current || isLoading) {
      console.log("[GvozdGame.tsx] CreateGame skipped:", !!gameRef.current, !!containerRef.current, isLoading);
      return;
    }
    setIsLoading(true);
    console.log("[GvozdGame.tsx] Creating Phaser Game...");

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GameConfig.gameWidth,
        height: GameConfig.gameHeight,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: GameConfig.gravity },
          debug: false,
        },
      },
      // !!! Указываем ВСЕ сцены и правильный порядок для старта !!!
      scene: [GvozdScene, TransitionScene, CaveScene], // GvozdScene стартует первой
      render: { pixelArt: true, antialias: false }, // antialias: false для пиксель-арта
      audio: { disableWebAudio: false },
      // Убрали input capture, т.к. обрабатываем в React
      callbacks: {
        postBoot: (game) => { game.canvas.setAttribute('tabindex', '0'); }
      }
    };

    const newGame = new Phaser.Game(config);
    gameRef.current = newGame;
    (window as any).myPhaserGame = newGame; // Для отладки через консоль

    newGame.events.once('ready', () => {
      console.log("[GvozdGame.tsx] Phaser Game Ready");
      setIsLoading(false);
      const initialScene = newGame.scene.getScene(GVOZD_SCENE_KEY); // Получаем по ключу
      if (initialScene) {
        console.log("[GvozdGame.tsx] Initial scene instance obtained:", initialScene.scene.key);
        setActiveScene(initialScene);
        if (typeof (initialScene as GvozdScene).init === 'function') {
          (initialScene as GvozdScene).init({ muted });
        }
        newGame.events.on('gameOver', handleGameOverEvent);
        focusGameContainer(); // Фокусируемся при готовности
      } else {
        console.error("[GvozdGame.tsx] Failed to get initial scene instance by key:", GVOZD_SCENE_KEY);
        // Попытка получить первую активную как запасной вариант
        const firstActive = newGame.scene.getScenes(true)[0];
        if (firstActive) {
            console.log("[GvozdGame.tsx] Falling back to first active scene:", firstActive.scene.key);
            setActiveScene(firstActive);
            if (typeof (firstActive as any).init === 'function') {
                 (firstActive as any).init({ muted });
            }
             newGame.events.on('gameOver', handleGameOverEvent);
             focusGameContainer();
        } else {
             console.error("[GvozdGame.tsx] No active scene found after ready!");
        }
      }
    });

    newGame.events.once('booterror', (error: any) => {
      console.error("[GvozdGame.tsx] Phaser Boot Error:", error);
      setIsLoading(false);
    });

  }, [muted, handleGameOverEvent, focusGameContainer, isLoading]);

  // Уничтожение игры Phaser
  const destroyGame = useCallback(() => {
    // Убираем отладочную переменную
     if ((window as any).myPhaserGame === gameRef.current) {
         delete (window as any).myPhaserGame;
     }

    if (gameRef.current) {
      console.log("[GvozdGame.tsx] Destroying Phaser Game");
      gameRef.current.events.off('gameOver', handleGameOverEvent);
      gameRef.current.destroy(true, false);
      gameRef.current = null; // Важно обнулить ref
      setActiveScene(null); // Сбрасываем активную сцену
      console.log("[GvozdGame.tsx] Phaser Game Destroyed");
    }
  }, [handleGameOverEvent]);

  // Жизненный цикл создания/уничтожения
  useEffect(() => {
    if (started && !gameRef.current && !isLoading) { // Добавили !isLoading
      createGame();
    } else if (!started && gameRef.current) {
      destroyGame();
    }
    return () => {
      destroyGame(); // Гарантированная очистка
    };
  }, [started, createGame, destroyGame, isLoading]);

  // Обновление UI
  useEffect(() => {
    let intervalId: number | undefined;
    if (started && !isGameOver && activeScene) {
      // Проверяем наличие методов перед запуском интервала
      const sceneHasMethods = typeof (activeScene as any).getScore === 'function' &&
                              typeof (activeScene as any).getLives === 'function' &&
                              typeof (activeScene as any).getCurrentDifficulty === 'function';

      if (sceneHasMethods) {
          console.log("[GvozdGame.tsx] Starting UI Update Interval for scene:", activeScene.scene.key);
          intervalId = window.setInterval(() => {
            if (activeScene && activeScene.scene.isActive() && !activeScene.scene.isPaused()) {
              try {
                const currentScore = (activeScene as any).getScore();
                const currentLives = (activeScene as any).getLives();
                const currentDifficulty = (activeScene as any).getCurrentDifficulty();
                setScore(prev => (prev !== currentScore ? currentScore : prev));
                setLives(prev => (prev !== currentLives ? currentLives : prev));
                setDifficulty(prev => (prev !== currentDifficulty ? currentDifficulty : prev));
              } catch (e) {
                console.warn("[GvozdGame.tsx] Error in UI update interval:", e);
              }
            }
          }, 300);
      } else {
           console.warn(`[GvozdGame.tsx] Active scene ${activeScene.scene.key} does not have required methods for UI update.`);
      }
    }
    return () => {
      if (intervalId) {
        console.log("[GvozdGame.tsx] Clearing UI Update Interval");
        clearInterval(intervalId);
      }
    };
  }, [started, isGameOver, activeScene]); // Убрали score, lives, difficulty из зависимостей

  // --- ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ КЛАВИАТУРЫ ---
  useEffect(() => {
    if (!started || paused || isGameOver) {
      return;
    }
    console.log("[GvozdGame.tsx] Adding GLOBAL keyboard listeners");

    const handleKeyDown = (event: KeyboardEvent) => {
      // Получаем текущую активную сцену *в момент нажатия*
      const currentActiveScene = gameRef.current?.scene.getScenes(true)[0];
      if (!currentActiveScene) return; // Выходим, если нет активной сцены

      const playerCtrl = typeof (currentActiveScene as any).getPlayerControllerInstance === 'function'
                           ? (currentActiveScene as any).getPlayerControllerInstance()
                           : null;

      if (!playerCtrl || paused || isGameOver || !currentActiveScene.scene.isActive()) return;

      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
      }

      let control: 'left' | 'right' | 'jump' | null = null;
      const active = true;

      switch (event.key) { // Используем event.key для большей совместимости
        case 'ArrowLeft': case 'a': case 'A': control = 'left'; break;
        case 'ArrowRight': case 'd': case 'D': control = 'right'; break;
        case 'ArrowUp': case ' ': case 'w': case 'W': control = 'jump'; break;
      }

      if (control) {
        event.preventDefault();
        try {
            switch (control) {
                case 'left': playerCtrl.mobileInputLeft = active; break;
                case 'right': playerCtrl.mobileInputRight = active; break;
                case 'jump': playerCtrl.mobileInputJump = true; break;
            }
        } catch(e) { console.warn("[GvozdGame.tsx] Error setting keyboard input (keydown):", e); }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
        const currentActiveScene = gameRef.current?.scene.getScenes(true)[0];
        if (!currentActiveScene) return;
         const playerCtrl = typeof (currentActiveScene as any).getPlayerControllerInstance === 'function'
                           ? (currentActiveScene as any).getPlayerControllerInstance()
                           : null;
         if (!playerCtrl) return;

        let control: 'left' | 'right' | 'jump' | null = null; // 'jump' добавлено для полноты
        const active = false;

        switch (event.key) {
            case 'ArrowLeft': case 'a': case 'A': control = 'left'; break;
            case 'ArrowRight': case 'd': case 'D': control = 'right'; break;
            case 'ArrowUp': case ' ': case 'w': case 'W': control = 'jump'; break; // Jump тоже обрабатываем
        }

        if (control) {
             try {
                 switch (control) {
                     case 'left': playerCtrl.mobileInputLeft = active; break;
                     case 'right': playerCtrl.mobileInputRight = active; break;
                     // Сброс флага прыжка при отпускании не нужен, т.к. он сбрасывается в PlayerController
                     case 'jump': break;
                 }
              } catch(e) { console.warn("[GvozdGame.tsx] Error setting keyboard input (keyup):", e); }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      console.log("[GvozdGame.tsx] Removing GLOBAL keyboard listeners");
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
       const currentActiveScene = gameRef.current?.scene.getScenes(true)[0];
       const playerCtrl = currentActiveScene && typeof (currentActiveScene as any).getPlayerControllerInstance === 'function'
                           ? (currentActiveScene as any).getPlayerControllerInstance()
                           : null;
       if(playerCtrl) {
           try {
             playerCtrl.mobileInputLeft = false;
             playerCtrl.mobileInputRight = false;
             playerCtrl.mobileInputJump = false;
           } catch(e) { /* Игнор */ }
       }
    };
    // Зависим от активной сцены, чтобы перепривязать слушатели при её смене (хотя сцена меняется через start/stop)
  }, [started, paused, isGameOver, activeScene]); // Зависим от activeScene


  // --- Обработчики кнопок UI ---
  const handleStart = () => {
    console.log('[GvozdGame.tsx] Start button clicked');
    setIsGameOver(false); setVictory(false); setScore(0);
    setLives(GameConfig.player.initialLives); setDifficulty(1);
    setPaused(false); setStarted(true);
  };

   const handlePauseToggle = () => { // Убрали параметр event
      if (!activeScene || !started || isGameOver) return;
      const newPausedState = !paused;

      if (newPausedState) {
          if (activeScene.scene.isPaused()) return;
          activeScene.scene.pause();
          console.log(`[GvozdGame.tsx] Game paused (Scene: ${activeScene.scene.key})`);
      } else {
          if (!activeScene.scene.isPaused()) return;
           // Возвращаем фокус контейнеру ПЕРЕД возобновлением
          focusGameContainer();
          activeScene.scene.resume();
          console.log(`[GvozdGame.tsx] Game resumed (Scene: ${activeScene.scene.key})`);
      }
      setPaused(newPausedState);
   };

  const handleMuteToggle = () => { // Убрали параметр event
    const newMutedState = !muted;
    setMuted(newMutedState);
    gameRef.current?.sound.setMute(newMutedState); // Глобальное вкл/выкл звука
    console.log(`[GvozdGame.tsx] Mute toggled: ${newMutedState}`);
    focusGameContainer(); // Возвращаем фокус
  };

  const handleRestart = () => { // Убрали параметр event
    console.log('[GvozdGame.tsx] Restart button clicked');
    setStarted(false); // Вызовет destroyGame
    setIsGameOver(false); setVictory(false); setPaused(false);
    // Сброс score/lives произойдет в handleStart
    setTimeout(() => {
      handleStart(); // Вызовет createGame
    }, 150);
  };

  // Обработчик для мобильных контролов
  const handleMobileControl = (control: 'left' | 'right' | 'jump', active: boolean) => {
    const playerCtrl = activeScene && typeof (activeScene as any).getPlayerControllerInstance === 'function'
                       ? (activeScene as any).getPlayerControllerInstance()
                       : null;
    // Проверяем, активна ли сцена перед отправкой команды
    if (!playerCtrl || paused || isGameOver || !activeScene?.scene.isActive()) return;
    try {
      switch (control) {
        case 'left': playerCtrl.mobileInputLeft = active; break;
        case 'right': playerCtrl.mobileInputRight = active; break;
        case 'jump': if (active) { playerCtrl.mobileInputJump = true; } break;
      }
    } catch (e) { console.warn("[GvozdGame.tsx] Error setting mobile input:", e); }
  };

  // --- Рендер компонента ---
  return (
    <div style={getStyles(isMobile).pageWrapper}>
      <video style={getStyles(isMobile).backgroundVideo} autoPlay loop muted playsInline preload="auto">
        <source src="/assets/gvozd/bg.mp4" type="video/mp4" />
        Ваш браузер не поддерживает тег video.
      </video>

      <div style={getStyles(isMobile).gameContainer}>
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%', display: started ? 'block' : 'none' }}
          id="phaser-container"
          tabIndex={0}
          onClick={focusGameContainer}
        />
        {!started && (
          <StartScreen 
            onStart={handleStart} 
            isMobile={isMobile}
            isPortrait={isPortrait}
          />
        )}
        {started && (
          <GameUI
            score={score}
            lives={lives}
            difficulty={difficulty}
            paused={paused}
            muted={muted}
            isGameOver={isGameOver}
            victory={victory}
            // !!! Передаем функции без аргументов !!!
            onPauseToggle={handlePauseToggle}
            onMuteToggle={handleMuteToggle}
            onRestart={handleRestart}
          />
        )}
        {started && !isGameOver && isMobile && (
          <MobileControls onControlChange={handleMobileControl} />
        )}
      </div>
    </div>
  );
};

export default GvozdGame;