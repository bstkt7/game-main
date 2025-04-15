import React from 'react';

interface StartScreenProps {
  onStart: () => void;
  isMobile: boolean;
  isPortrait: boolean;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, isMobile, isPortrait }) => {
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: isMobile && isPortrait ? 'column' : 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isMobile ? '#FAE296' : '#1f2937',
    padding: isMobile ? '0' : '32px',
    gap: isMobile ? '0' : '48px',
    zIndex: 10,
    overflow: 'hidden',
    height: '100%',
    width: '100%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  // Container styles for mobile landscape mode
  const mobileLandscapeContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    position: 'relative',
  };

  // Левая колонка в горизонтальной мобильной ориентации
  const leftColumnStyle: React.CSSProperties = {
    width: '50%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: '10px',
    overflow: 'hidden',
  };

  // Right column style for mobile landscape
  const rightColumnLandscapeStyle: React.CSSProperties = {
    width: '50%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
  };

  // Container styles for mobile portrait mode - updated with flex structure
  const mobilePortraitContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    position: 'relative',
    padding: '10px',
    justifyContent: 'space-between', // Changed to distribute items across the full height
  };

  // Стиль контейнера логотипа
  const logoContainerStyle: React.CSSProperties = {
    width: '90%',
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '5px',
  };

  const logoStyle: React.CSSProperties = {
    width: isMobile ? '60%' : '0',
    height: 'auto',
    marginBottom: isMobile ? '10px' : '0',
  };

  // Контейнер шершней в горизональной мобильной ориентации
  const hornetsLandscapeContainerStyle: React.CSSProperties = {
    width: '60%',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: '5px',
    paddingBottom: '5px',
  };

  // Стиль изображений шершней
  const hornetLandscapeImageStyle: React.CSSProperties = {
    width: '42%',
    height: 'auto',
    maxHeight: '50vh',
    objectFit: 'contain',
    margin: '0 3px',
  };

  // Updated hornets container for portrait mode - now at bottom
  const hornetsContainerStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 'auto', // Push to bottom
    paddingBottom: '20px', // Add some padding at bottom
  };

  const hornetImageStyle: React.CSSProperties = {
    width: isMobile ? '45%' : '0',
    height: 'auto',
    borderRadius: '0',
    objectFit: 'cover',
  };

  // Updated right column style for portrait
  const rightColumnStyle: React.CSSProperties = {
    width: isMobile ? '100%' : '40%',
    maxWidth: isMobile ? '100%' : '480px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: isMobile ? '10px' : '20px',
    position: isMobile ? 'relative' : 'static',
    height: isMobile ? 'auto' : 'auto',
    justifyContent: isMobile ? 'flex-start' : 'flex-start',
    padding: isMobile ? '10px' : '0',
  };

  const imageStyle: React.CSSProperties = {
    width: isMobile ? '80%' : '50%',
    maxWidth: isMobile ? '80%' : '600px',
    height: 'auto',
    borderRadius: isMobile ? '8px' : '16px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
    objectFit: 'cover',
    marginBottom: isMobile ? '10px' : '0',
  };

  const buttonStyle: React.CSSProperties = {
    padding: isMobile ? '0' : '16px 32px',
    backgroundColor: isMobile ? 'transparent' : '#22c55e',
    color: isMobile ? 'transparent' : 'white',
    fontSize: isMobile ? '0' : '1.25rem',
    borderRadius: '0',
    border: isMobile ? 'none' : '2px solid #15803d',
    fontWeight: 600,
    boxShadow: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
    width: isMobile ? '150px' : '100%',
    height: isMobile ? '150px' : 'auto',
    textAlign: 'center',
    zIndex: 20,
    backgroundImage: isMobile ? 'url(/assets/gvozd/start_button.png)' : 'none',
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  };

  // Updated mobile landscape button style
  const buttonLandscapeStyle: React.CSSProperties = {
    ...buttonStyle,
    width: '240px',
    height: '240px',
    position: 'relative',
    alignSelf: 'center',
    margin: '0 auto',
    marginTop: '15px',
    marginBottom: '15px',
  };

  // Updated Mobile portrait button style - now below logo
  const buttonPortraitStyle: React.CSSProperties = {
    ...buttonStyle,
    alignSelf: 'center',
    marginTop: '20px',
    marginBottom: '20px',
    width: '180px',
    height: '180px',
  };

  const buttonHover = isMobile ? 'url(/assets/gvozd/start_button_hover.png)' : '#16a34a';

  // Updated instructions box style for portrait
  const instructionsBoxStyle: React.CSSProperties = {
    backgroundColor: isMobile ? 'rgba(255, 255, 255, 0.7)' : 'rgba(55, 65, 81, 0.85)',
    borderRadius: isMobile ? '8px' : '8px',
    padding: isMobile ? '10px' : '20px',
    width: isMobile ? '90%' : '100%',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
    border: isMobile ? '1px solid rgba(0, 0, 0, 0.2)' : '1px solid #4b5563',
    backdropFilter: 'blur(2px)',
    marginTop: isMobile ? '0' : '0',
    marginBottom: isMobile ? '20px' : '0',
  };

  // Mobile landscape instructions box style
  const instructionsLandscapeBoxStyle: React.CSSProperties = {
    ...instructionsBoxStyle,
    marginBottom: '0',
    width: '95%',
    maxHeight: '50%',
    overflowY: 'auto',
  };

  const instructionsTitleStyle: React.CSSProperties = {
    fontSize: isMobile ? '0.9rem' : '1.25rem',
    fontWeight: 'bold',
    marginBottom: isMobile ? '6px' : '12px',
    color: isMobile ? '#000000' : '#fde047',
    textAlign: 'center',
  };

  const instructionsListStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: isMobile ? '0.8rem' : '0.9rem',
    lineHeight: 1.5,
    color: isMobile ? '#000000' : '#f3f4f6',
  };

  const disclaimerStyle: React.CSSProperties = {
    fontSize: isMobile ? '0.7rem' : '0.70rem',
    lineHeight: 1.4,
    padding: '0 2px',
    textAlign: 'left',
    color: isMobile ? '#000000' : '#9ca3af',
  };

  // New style for rotation overlay
  const rotationOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    color: 'white',
    textAlign: 'center',
    padding: '20px',
  };

  const rotateIconStyle: React.CSSProperties = {
    fontSize: '50px',
    marginBottom: '20px',
    transform: 'rotate(90deg)',
  };

  const rotateTextStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 'bold',
  };

  const renderMobileLandscape = () => (
    <div style={mobileLandscapeContainerStyle}>
      {/* Left Column */}
      <div style={leftColumnStyle}>
        {/* Logo at top */}
        <div style={logoContainerStyle}>
          <img src="/assets/gvozd/logo.png" alt="Логотип" style={logoStyle} />
        </div>
        {/* Hornets at bottom */}
        <div style={hornetsLandscapeContainerStyle}>
          <img src="/assets/gvozd/start_s1.png" alt="Шершень 1" style={hornetLandscapeImageStyle} />
          <img src="/assets/gvozd/start_s2.png" alt="Шершень 2" style={hornetLandscapeImageStyle} />
        </div>
      </div>
      
      {/* Right Column */}
      <div style={rightColumnLandscapeStyle}>
        {/* Game description at top */}
        <div style={instructionsLandscapeBoxStyle}>
          <h3 style={instructionsTitleStyle}>Управление:</h3>
          <ul style={instructionsListStyle}>
            <li>← → для движения</li>
            <li>↑ или пробел для прыжка</li>
            <li>Прыгайте на врагов сверху</li>
          </ul>
          <li style={disclaimerStyle}> 
            ККШИ попала в беду — таинственные шершни проникли в окрестности школы и рассыпали уставы, документы, учебные материалы по всей территории школы-интерната. Некоторые из кадетских символов украдены.

            Кадет — лучший кадет, и именно он отправляется в путь, чтобы вернуть порядок, собрать уставы, найти потерянные шевроны, спасти кадетов, и в финале — отстоять честь школы в поединке с Шершнем-Командиром.
          </li>
        </div>
        
        {/* Start button centered and twice as large */}
        <button
          onClick={onStart}
          style={buttonLandscapeStyle}
          onMouseOver={(e) => !isMobile && (e.currentTarget.style.backgroundColor = buttonHover)}
          onMouseOut={(e) => !isMobile && (e.currentTarget.style.backgroundColor = '#22c55e')}
          onTouchStart={(e) => { 
            if (isMobile) {
              e.currentTarget.style.backgroundImage = buttonHover;
            } else {
              e.currentTarget.style.transform = 'scale(0.97)'; 
              e.currentTarget.style.backgroundColor = buttonHover;
            }
          }}
          onTouchEnd={(e) => { 
            if (isMobile) {
              e.currentTarget.style.backgroundImage = 'url(/assets/gvozd/start_button.png)';
            } else {
              e.currentTarget.style.transform = 'scale(1)'; 
              e.currentTarget.style.backgroundColor = '#22c55e';
            }
          }}
        >
          {!isMobile && 'СТАРТ!'}
        </button>
      </div>
    </div>
  );

  // Updated renderMobilePortrait with new order and rotation overlay
  const renderMobilePortrait = () => (
    <div style={mobilePortraitContainerStyle}>
      {/* Logo at top */}
      <div style={logoContainerStyle}>
        <img src="/assets/gvozd/logo.png" alt="Логотип" style={logoStyle} />
      </div>
      
      {/* Middle section with play button and instructions */}
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
        {/* Play button */}
        <button
          onClick={onStart}
          style={buttonPortraitStyle}
          onMouseOver={(e) => !isMobile && (e.currentTarget.style.backgroundColor = buttonHover)}
          onMouseOut={(e) => !isMobile && (e.currentTarget.style.backgroundColor = '#22c55e')}
          onTouchStart={(e) => { 
            if (isMobile) {
              e.currentTarget.style.backgroundImage = buttonHover;
            } else {
              e.currentTarget.style.transform = 'scale(0.97)'; 
              e.currentTarget.style.backgroundColor = buttonHover;
            }
          }}
          onTouchEnd={(e) => { 
            if (isMobile) {
              e.currentTarget.style.backgroundImage = 'url(/assets/gvozd/start_button.png)';
            } else {
              e.currentTarget.style.transform = 'scale(1)'; 
              e.currentTarget.style.backgroundColor = '#22c55e';
            }
          }}
        >
          {!isMobile && 'СТАРТ!'}
        </button>
        
        {/* Instructions */}
        <div style={instructionsBoxStyle}>
          <h3 style={instructionsTitleStyle}>Управление:</h3>
          <ul style={instructionsListStyle}>
            <li>← → для движения</li>
            <li>↑ или пробел для прыжка</li>
            <li>Прыгайте на врагов сверху</li>
          </ul>
          <li style={disclaimerStyle}> 
            ККШИ попала в беду — таинственные шершни проникли в окрестности школы и рассыпали уставы, документы, учебные материалы по всей территории школы-интерната. Некоторые из кадетских символов украдены.

            Кадет — лучший кадет, и именно он отправляется в путь, чтобы вернуть порядок, собрать уставы, найти потерянные шевроны, спасти кадетов, и в финале — отстоять честь школы в поединке с Шершнем-Командиром.
          </li>
        </div>
      </div>
      
      {/* Hornets at bottom */}
      <div style={hornetsContainerStyle}>
        <img src="/assets/gvozd/start_s1.png" alt="Шершень 1" style={hornetImageStyle} />
        <img src="/assets/gvozd/start_s2.png" alt="Шершень 2" style={hornetImageStyle} />
      </div>
      
      {/* Rotation overlay */}
      <div style={rotationOverlayStyle}>
        <div style={rotateIconStyle}>⟳</div>
        <div style={rotateTextStyle}>Пожалуйста, переверните устройство горизонтально для лучшего игрового опыта</div>
      </div>
    </div>
  );

  const renderDesktop = () => (
    <>
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
          onTouchStart={(e) => { 
            if (isMobile) {
              e.currentTarget.style.backgroundImage = buttonHover;
            } else {
              e.currentTarget.style.transform = 'scale(0.97)'; 
              e.currentTarget.style.backgroundColor = buttonHover;
            }
          }}
          onTouchEnd={(e) => { 
            if (isMobile) {
              e.currentTarget.style.backgroundImage = 'url(/assets/gvozd/start_button.png)';
            } else {
              e.currentTarget.style.transform = 'scale(1)'; 
              e.currentTarget.style.backgroundColor = '#22c55e';
            }
          }}
        >
          {!isMobile && 'СТАРТ!'}
        </button>
        <div style={instructionsBoxStyle}>
          <h3 style={instructionsTitleStyle}>Управление:</h3>
          <ul style={instructionsListStyle}>
            <li>← → для движения</li>
            <li>↑ или пробел для прыжка</li>
            <li>Прыгайте на врагов сверху</li>
          </ul>
          <li style={disclaimerStyle}> 
            ККШИ попала в беду — таинственные шершни проникли в окрестности школы и рассыпали уставы, документы, учебные материалы по всей территории школы-интерната. Некоторые из кадетских символов украдены.

            Кадет — лучший кадет, и именно он отправляется в путь, чтобы вернуть порядок, собрать уставы, найти потерянные шевроны, спасти кадетов, и в финале — отстоять честь школы в поединке с Шершнем-Командиром.
          </li>
        </div>
      </div>
    </>
  );

  return (
    <div style={overlayStyle}>
      {isMobile ? (
        isPortrait ? renderMobilePortrait() : renderMobileLandscape()
      ) : (
        renderDesktop()
      )}
    </div>
  );
};

export default StartScreen;