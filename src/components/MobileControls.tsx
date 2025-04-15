import React from 'react';
// Если вы используете CSS Modules, раскомментируйте следующую строку
// import styles from './MobileControls.module.css';

interface MobileControlsProps {
  onControlChange: (control: 'left' | 'right' | 'jump', active: boolean) => void;
}

const MobileControls: React.FC<MobileControlsProps> = ({ onControlChange }) => {

  // Обработчик начала касания (или нажатия мыши для десктопа)
  const handleInteractionStart = (
      e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>, // Принимает оба типа событий
      control: 'left' | 'right' | 'jump'
    ) => {
    // Предотвращаем стандартное поведение (скролл, зум на тач)
    if (e.type === 'touchstart') {
         e.preventDefault();
    }
    onControlChange(control, true); // Сообщаем об активации контроля
    // Добавляем CSS класс для визуального эффекта нажатия
    e.currentTarget.classList.add('active');
    // Если используете CSS Modules:
    // e.currentTarget.classList.add(styles.active);
  };

  // Обработчик окончания касания (или отпускания/ухода мыши)
  const handleInteractionEnd = (
       e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>, // Принимает оба типа событий
       control: 'left' | 'right' | 'jump'
     ) => {
     if (e.type === 'touchend') {
          e.preventDefault();
     }
    onControlChange(control, false); // Сообщаем о деактивации контроля
    // Удаляем CSS класс нажатия
    e.currentTarget.classList.remove('active');
     // Если используете CSS Modules:
     // e.currentTarget.classList.remove(styles.active);
  };

  // Inline стили для позиционирования контейнеров
  const controlsContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    right: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end', // Выравниваем кнопки по нижнему краю
    zIndex: 50,
    pointerEvents: 'none', // Контейнер не ловит события
  };

  const leftRightContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '20px', // Расстояние между кнопками влево/вправо
    pointerEvents: 'auto', // Разрешаем события для этого блока
  };

  const jumpButtonContainerStyle: React.CSSProperties = {
     pointerEvents: 'auto', // Разрешаем события для кнопки прыжка
  };

  // --- Имена CSS классов (используйте их в вашем CSS файле) ---
  // Если вы НЕ используете CSS Modules:
  const btnBaseClass = "mobileButton";
  const btnJumpClass = "jumpButton";
  const btnActiveClass = "active"; // Класс для нажатого состояния

  // Если вы ИСПОЛЬЗУЕТЕ CSS Modules:
  // const btnBaseClass = styles.mobileButton;
  // const btnJumpClass = styles.jumpButton;
  // const btnActiveClass = styles.active; // Имя класса должно совпадать с CSS

  return (
    <div style={controlsContainerStyle}>
      {/* Контейнер для кнопок влево/вправо */}
      <div style={leftRightContainerStyle}>
        {/* Кнопка Влево */}
        <div
          className={btnBaseClass} // Применяем базовый класс
          onTouchStart={(e) => handleInteractionStart(e, 'left')}
          onTouchEnd={(e) => handleInteractionEnd(e, 'left')}
          onTouchCancel={(e) => handleInteractionEnd(e, 'left')} // На случай прерывания касания
          // Поддержка мыши для десктопа/тестирования
          onMouseDown={(e) => handleInteractionStart(e, 'left')}
          onMouseUp={(e) => handleInteractionEnd(e, 'left')}
          onMouseLeave={(e) => {
              // Убираем класс active, только если кнопка была нажата (содержит класс)
              if (e.currentTarget.classList.contains(btnActiveClass)) {
                  handleInteractionEnd(e, 'left');
              }
          }}
        >
          ⬅
        </div>

        {/* Кнопка Вправо */}
        <div
          className={btnBaseClass}
          onTouchStart={(e) => handleInteractionStart(e, 'right')}
          onTouchEnd={(e) => handleInteractionEnd(e, 'right')}
          onTouchCancel={(e) => handleInteractionEnd(e, 'right')}
          onMouseDown={(e) => handleInteractionStart(e, 'right')}
          onMouseUp={(e) => handleInteractionEnd(e, 'right')}
          onMouseLeave={(e) => {
               if (e.currentTarget.classList.contains(btnActiveClass)) {
                   handleInteractionEnd(e, 'right');
               }
           }}
        >
          ➡
        </div>
      </div>

      {/* Контейнер для кнопки прыжка */}
      <div style={jumpButtonContainerStyle}>
        {/* Кнопка Прыжок */}
        <div
          // Применяем базовый класс и класс для кнопки прыжка
          className={`${btnBaseClass} ${btnJumpClass}`}
          onTouchStart={(e) => handleInteractionStart(e, 'jump')}
          onTouchEnd={(e) => handleInteractionEnd(e, 'jump')}
          onTouchCancel={(e) => handleInteractionEnd(e, 'jump')}
          onMouseDown={(e) => handleInteractionStart(e, 'jump')}
          onMouseUp={(e) => handleInteractionEnd(e, 'jump')}
           onMouseLeave={(e) => {
               if (e.currentTarget.classList.contains(btnActiveClass)) {
                   handleInteractionEnd(e, 'jump');
               }
           }}
        >
          ⬆
        </div>
      </div>
    </div>
  );
};

export default MobileControls;