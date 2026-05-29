import React from 'react';

interface GameUIProps {
  score: number;
  lives: number;
  difficulty: number;
  paused: boolean;
  muted: boolean;
  isGameOver: boolean;
  victory: boolean;
  onPauseToggle: () => void;
  onMuteToggle: () => void;
  onRestart: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  isMobile: boolean;
}

const GameUI: React.FC<GameUIProps> = ({
  score,
  lives,
  difficulty,
  paused,
  muted,
  isGameOver,
  victory,
  onPauseToggle,
  onMuteToggle,
  onRestart,
  onToggleFullscreen,
  isFullscreen,
  isMobile,
}) => {

  // --- Стили ---
  const uiContainerStyle: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: 20, color: 'white',
    // fontFamily: "'Press Start 2P', cursive", // <-- УДАЛЕНО (наследуется из CSS)
    textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
  };
  const textBgStyle: React.CSSProperties = {
      backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '4px 8px',
      borderRadius: '4px', display: 'inline-block',
  };
  const scoreStyle: React.CSSProperties = {
      position: 'absolute',
      top: 'calc(60px + env(safe-area-inset-top))',
      left: 'calc(16px + env(safe-area-inset-left))',
      fontSize: '16px',
      ...textBgStyle
  };
  const difficultyStyle: React.CSSProperties = {
      position: 'absolute',
      top: 'calc(90px + env(safe-area-inset-top))',
      left: 'calc(16px + env(safe-area-inset-left))',
      fontSize: '16px',
      ...textBgStyle
  };
  const livesContainerStyle: React.CSSProperties = {
      position: 'absolute',
      top: 'calc(15px + env(safe-area-inset-top))',
      left: 'calc(16px + env(safe-area-inset-left))',
      display: 'flex',
      gap: '5px',
  };
  const lifeIconStyle: React.CSSProperties = { width: '25px', height: 'auto' };
  const buttonsContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(16px + env(safe-area-inset-top))',
    right: 'calc(16px + env(safe-area-inset-right))',
    display: 'flex',
    flexDirection: isMobile ? 'row' : 'column',
    gap: '8px',
    pointerEvents: 'auto',
    zIndex: 30,
  };
  // --- СТИЛЬ КНОПОК ---
  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: '#dc2626', // Красный фон по умолчанию
    color: 'white',
    border: '1px solid #b91c1c', // Темно-красная граница
    borderRadius: '6px',
    fontWeight: 600, // Можно оставить или убрать, если шрифт сам по себе жирный
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    // fontFamily: 'Arial, sans-serif', // <-- УДАЛЕНА ЭТА СТРОКА
    fontSize: '10px', // Уменьшил размер, т.к. Press Start 2P крупный
    lineHeight: 1.2, // Можно добавить для лучшего центрирования текста
    textTransform: 'uppercase', // Опционально: сделать текст заглавным
    // Добавим немного padding сверху/снизу для пиксельного шрифта
    paddingTop: '10px',
    paddingBottom: '10px',
  };
  // --- КОНЕЦ СТИЛЯ КНОПОК ---

   const gameOverOverlayStyle: React.CSSProperties = {
       position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex',
       flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 40,
       pointerEvents: 'auto', color: victory ? '#22c55e' : '#ef4444', fontSize: '36px',
       textAlign: 'center', lineHeight: 1.4,
   };
   const pauseOverlayStyle: React.CSSProperties = {
       position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.65)', display: 'flex',
       flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 25,
       pointerEvents: 'auto', color: '#eab308', fontSize: '36px',
       textAlign: 'center', lineHeight: 1.4,
   };
  // --- Конец стилей ---

  return (
    <>
      {/* Основной UI */}
      <div style={uiContainerStyle}>
        {/* Счет */}
        <div style={scoreStyle}>Звезды: {score ?? 0}</div>
        {/* Сложность */}
        <div style={difficultyStyle}>Сложность: {(difficulty ?? 1).toFixed(1)}</div>
        {/* Жизни */}
        <div style={livesContainerStyle}>
          {Array.from({ length: Math.max(0, lives ?? 0) }, (_, i) => (
            <img key={`life-${i}`} src="/assets/gvozd/life.png" alt="life" style={lifeIconStyle} />
          ))}
        </div>
      </div>

      {/* Кнопки управления */}
      <div style={buttonsContainerStyle}>
        {/* Сделаем стиль кнопки Пауза/Продолжить немного другим */}
        <button
            style={{...buttonStyle, backgroundColor: '#eab308', border: '1px solid #ca8a04'}} // Желтый
            onClick={(e) => { e.currentTarget.blur(); onPauseToggle(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={isGameOver}
        >
          {paused && !isGameOver ? 'Продолжить' : 'Пауза'}
        </button>
        <button 
            style={{...buttonStyle, backgroundColor: '#3b82f6', border: '1px solid #1d4ed8'}} 
            onClick={(e) => { e.currentTarget.blur(); onMuteToggle(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        > {/* Синий */}
          {muted ? '🔊 Звук' : '🔇 Звук'} {/* Изменил текст */}
        </button>
        <button 
            style={{...buttonStyle, backgroundColor: '#6b7280', border: '1px solid #4b5563'}} 
            onClick={(e) => { e.currentTarget.blur(); onRestart(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        > {/* Серый */}
          Рестарт {/* Изменил текст */}
        </button>
        {/* Кнопка полноэкранного режима (только для мобильных) */}
        {isMobile && (
          <button 
            style={{...buttonStyle, backgroundColor: '#8b5cf6', border: '1px solid #6d28d9'}} 
            onClick={(e) => { e.currentTarget.blur(); onToggleFullscreen(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {isFullscreen ? '↗️ Выйти' : '↘️ Полный'}
          </button>
        )}
      </div>

      {/* Экран паузы */}
      {paused && !isGameOver && (
          <div style={pauseOverlayStyle}>
              <div className="pulse-animation" style={{ marginBottom: '20px' }}>ПАУЗА</div>
              <button
                  style={{ ...buttonStyle, backgroundColor: '#4f46e5', border:'1px solid #3730a3' }} // Фиолетовый
                  onClick={(e) => { e.currentTarget.blur(); onPauseToggle(); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
              >
                  Продолжить
              </button>
          </div>
      )}

      {/* Экран Game Over */}
      {isGameOver && (
          <div style={gameOverOverlayStyle}>
              <div>{victory ? 'Победа!' : 'Конец Игры!'}</div> {/* Изменил текст */}
              {!victory && <div style={{ fontSize: '24px', marginTop: '10px' }}>Счет: {score ?? 0}</div>}
              <button
                  // Используем базовый стиль кнопки, но меняем цвет и отступ
                  style={{ ...buttonStyle, marginTop: '30px', backgroundColor: '#4f46e5', border:'1px solid #3730a3' }} // Фиолетовый
                  onClick={(e) => { e.currentTarget.blur(); onRestart(); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
              >
                  Заново {/* Изменил текст */}
              </button>
          </div>
      )}
    </>
  );
};

export default GameUI;