import React from 'react';

interface StartScreenProps {
  onStart: () => void;
  isMobile: boolean;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, isMobile }) => {

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'row', // Всегда используем row (горизонтальное размещение)
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: isMobile ? '12px' : '32px',
    gap: isMobile ? '12px' : '48px',
    zIndex: 10,
    overflow: 'hidden', // Убираем скроллбар везде
    height: '100%',
  };

  const imageStyle: React.CSSProperties = {
    width: isMobile ? '45%' : '50%', // Уменьшаем ширину на мобильных
    maxWidth: isMobile ? '200px' : '600px',
    height: 'auto',
    borderRadius: isMobile ? '12px' : '16px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
    objectFit: 'cover',
  };

  const rightColumnStyle: React.CSSProperties = {
    width: isMobile ? '50%' : '40%',
    maxWidth: isMobile ? '200px' : '480px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: isMobile ? '12px' : '20px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: isMobile ? '10px 16px' : '16px 32px',
    backgroundColor: '#22c55e',
    color: 'white',
    fontSize: isMobile ? '0.9rem' : '1.25rem',
    borderRadius: isMobile ? '6px' : '8px',
    border: '2px solid #15803d',
    fontWeight: 600,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    width: '100%',
    textAlign: 'center',
    zIndex: 20,
    position: 'relative', // Чтобы кнопка была над другими элементами
  };

  const buttonHover = '#16a34a';

  const instructionsBoxStyle: React.CSSProperties = {
    backgroundColor: 'rgba(55, 65, 81, 0.85)',
    borderRadius: isMobile ? '6px' : '8px',
    padding: isMobile ? '10px' : '20px',
    width: '100%',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
    border: '1px solid #4b5563',
    backdropFilter: 'blur(2px)',
  };

  const instructionsTitleStyle: React.CSSProperties = {
    fontSize: isMobile ? '0.9rem' : '1.25rem',
    fontWeight: 'bold',
    marginBottom: isMobile ? '6px' : '12px',
    color: '#fde047',
    textAlign: 'center',
  };

  const instructionsListStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: isMobile ? '0.7rem' : '0.9rem',
    lineHeight: 1.5,
    color: '#f3f4f6',
  };

  const strongStyle: React.CSSProperties = {
    fontWeight: 'bold',
    margin: '0 3px',
  };

  const disclaimerStyle: React.CSSProperties = {
    fontSize: isMobile ? '0.75rem' : '0.70rem',
    lineHeight: 1.4,
    padding: '0 2px',
    textAlign: 'left',
  };

  return (
    <div style={overlayStyle}>
      <img
        src="/assets/gvozd/start.png"
        alt="Стартовая картинка"
        style={imageStyle}
      />

      <div style={rightColumnStyle}>
        <button
          onClick={onStart}
          style={buttonStyle}
          onMouseOver={(e) => !isMobile && (e.currentTarget.style.backgroundColor = buttonHover)}
          onMouseOut={(e) => !isMobile && (e.currentTarget.style.backgroundColor = '#22c55e')}
          onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.backgroundColor = buttonHover; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = '#22c55e'; }}
        >
          СТАРТ!
        </button>
        <div style={instructionsBoxStyle}>
            <li style={disclaimerStyle}> 
            ККШИ попала в беду — таинственные шершни проникли в окрестности школы и рассыпали уставы, документы, учебные материалы по всей территории школы-интерната. Некоторые из кадетских символов украдены.

Кадет Пчёла — лучший кадет, и именно он отправляется в путь, чтобы вернуть порядок, собрать уставы, найти потерянные шевроны, спасти кадетов, и в финале — отстоять честь школы в поединке с Шершнем-Командиром.
            </li>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;