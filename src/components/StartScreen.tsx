import React, { useState, useLayoutEffect, useRef, useEffect, useMemo } from 'react';

// --- CSS for Floating Animation ---
/* ВАЖНО: Этот CSS код должен быть добавлен в ваш глобальный CSS файл 
  (например, index.css или App.css) или через CSS-in-JS решение (styled-components, etc.)
  Чтобы он был доступен компоненту StartScreen.


*/

interface StartScreenProps {
  onStart: () => void;
  isMobile: boolean;
  isPortrait: boolean;
}

interface OrientationState {
  beta: number | null;
  gamma: number | null;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, isMobile, isPortrait }) => {

  const [viewportHeight, setViewportHeight] = useState<number | string>('100vh');
  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<OrientationState>({ beta: null, gamma: null });
  // --- НОВОЕ СОСТОЯНИЕ: Активен ли гироскоп (получены ли данные)? ---
  const [gyroscopeActive, setGyroscopeActive] = useState<boolean>(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const PARALLAX_INTENSITY = 0.1;
  const MAX_PARALLAX_OFFSET = 15;

  // Эффект для visualViewport height (без изменений)
  useLayoutEffect(() => {
    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      } else {
        setViewportHeight('100svh'); // Fallback
      }
    };
    updateHeight();
    const vv = window.visualViewport;
    let resizeHandler = updateHeight;
    let scrollHandler = updateHeight;

    if (vv) {
      vv.addEventListener('resize', resizeHandler);
      vv.addEventListener('scroll', scrollHandler);
    } else {
      window.addEventListener('resize', resizeHandler);
    }

    return () => {
      if (vv) {
        vv.removeEventListener('resize', resizeHandler);
        vv.removeEventListener('scroll', scrollHandler);
      } else {
        window.removeEventListener('resize', resizeHandler);
      }
    };
  }, []);

  // Эффект для отслеживания изменений Fullscreen (без изменений)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isActive = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );
      setIsFullscreenActive(isActive);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    handleFullscreenChange(); // Initial check
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Эффект для фоновой музыки (без изменений)
  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.loop = true;
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise.then(_ => {
          console.log("Background music started playing.");
        }).catch(error => {
          console.warn("Background music autoplay was prevented.", error);
        });
      }
    }
    return () => {
      if (audioElement) {
        audioElement.pause();
        console.log("Background music paused on unmount.");
      }
    };
  }, []);

  // --- ИЗМЕНЕННЫЙ Эффект для отслеживания ориентации устройства (Параллакс) ---
  useEffect(() => {
    // Сбрасываем состояние гироскопа при изменении isMobile
    setGyroscopeActive(false);
    setOrientation({ beta: null, gamma: null }); // Сбрасываем углы

    // Запускаем только на мобильных
    if (!isMobile) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
        const beta = event.beta;
        const gamma = event.gamma;

        // Проверяем, что получены валидные числовые значения
        if (beta !== null && gamma !== null && !isNaN(beta) && !isNaN(gamma)) {
            setOrientation({ beta, gamma });
            // Если гироскоп еще не был активен, помечаем его как активный
            if (!gyroscopeActive) {
                 setGyroscopeActive(true);
                 console.log("Gyroscope activated and sending data.");
            }
        } else if (gyroscopeActive) {
            // Если данные перестали приходить или стали невалидными,
            // можно сбросить состояние (опционально)
            // setGyroscopeActive(false);
            // console.log("Gyroscope data became invalid.");
        }
    };

    // Проверяем поддержку API
    if (window.DeviceOrientationEvent) {
        // Пытаемся запросить разрешение, если это iOS 13+
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            (DeviceOrientationEvent as any).requestPermission()
                .then((permissionState: string) => {
                    if (permissionState === 'granted') {
                        console.log("DeviceOrientationEvent permission granted.");
                        window.addEventListener('deviceorientation', handleOrientation, true);
                    } else {
                        console.warn("DeviceOrientationEvent permission denied.");
                    }
                })
                .catch(console.error);
        } else {
            // Для других браузеров/устройств просто добавляем слушатель
            console.log("DeviceOrientationEvent supported. Adding listener.");
            window.addEventListener('deviceorientation', handleOrientation, true);
        }
    } else {
        console.warn("DeviceOrientationEvent API not supported on this device/browser.");
    }

    // Функция очистки для удаления слушателя
    return () => {
      if (window.DeviceOrientationEvent) {
        console.log("Removing device orientation listener.");
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
       // Сбрасываем состояние при размонтировании или смене isMobile
      setGyroscopeActive(false);
      setOrientation({ beta: null, gamma: null });
    };
    // Перезапускаем эффект, если isMobile изменится
    // gyroscopeActive не нужно в зависимостях, так как мы управляем им внутри эффекта
  }, [isMobile]);


  // --- ИЗМЕНЕННЫЙ Расчет смещения для параллакса ---
  const parallaxOffset = useMemo(() => {
    // Параллакс работает только на мобильных И если гироскоп активен
    if (!isMobile || !gyroscopeActive || orientation.beta === null || orientation.gamma === null) {
      return { x: 0, y: 0 };
    }

    // Рассчитываем смещение
    let offsetX = orientation.gamma * PARALLAX_INTENSITY * -1;
    let offsetY = orientation.beta * PARALLAX_INTENSITY * -1;

    // Ограничиваем максимальное смещение
    offsetX = Math.max(-MAX_PARALLAX_OFFSET, Math.min(MAX_PARALLAX_OFFSET, offsetX));
    offsetY = Math.max(-MAX_PARALLAX_OFFSET, Math.min(MAX_PARALLAX_OFFSET, offsetY));

    // Можно добавить логику для смены осей в зависимости от isPortrait, если нужно
    // if (isPortrait) { [offsetX, offsetY] = [offsetY, offsetX]; }

    return { x: offsetX, y: offsetY };
    // Добавляем gyroscopeActive в зависимости useMemo
  }, [isMobile, gyroscopeActive, orientation.beta, orientation.gamma, isPortrait]);


  // --- Стили ---

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex',
    flexDirection: isMobile && isPortrait ? 'column' : 'row',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: isMobile ? '#FAE296' : '#1f2937',
    backgroundImage: isMobile ? 'url(/assets/gvozd/start_bg.png)' : 'none',
    backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    padding: isMobile ? `0 calc(10px + env(safe-area-inset-right)) 0 calc(10px + env(safe-area-inset-left))` : '32px',
    gap: isMobile ? '0' : '48px', zIndex: 10, overflow: 'hidden',
    height: typeof viewportHeight === 'number' ? `${viewportHeight}px` : viewportHeight,
    width: '100vw', boxSizing: 'border-box', overscrollBehavior: 'none',
  };

  // --- Базовый стиль для элементов (шершней), которые будут двигаться ---
  // Убираем transform отсюда, он будет применен либо через inline style (параллакс),
  // либо через CSS класс (плавание)
  const parallaxElementBaseStyle: React.CSSProperties = {
      transition: 'transform 0.2s ease-out', // Плавный переход для transform (для параллакса)
      willChange: 'transform', // Оптимизация
      // Добавляем сюда общие стили, которые не зависят от параллакса/анимации
      objectFit: 'contain',
      height: 'auto',
  };

  // ... (остальные стили БЕЗ ИЗМЕНЕНИЙ) ...
    const mobileLandscapeContainerStyle: React.CSSProperties = {
     display: 'flex', flexDirection: 'row', width: '100%', height: '100%', position: 'relative',
   };

   const leftColumnStyle: React.CSSProperties = {
     width: '50%', height: '100%', display: 'flex', flexDirection: 'column',
     justifyContent: 'flex-start',
     alignItems: 'center', padding: '0px', overflow: 'hidden', boxSizing: 'border-box',
   };

   const rightColumnLandscapeStyle: React.CSSProperties = {
     width: '50%', height: '100%', display: 'flex', flexDirection: 'column',
     justifyContent: 'space-between', alignItems: 'center', padding: '10px',
     boxSizing: 'border-box', gap: '10px',
   };

   const mobilePortraitContainerStyle: React.CSSProperties = {
     display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
     position: 'relative', padding: '10px', justifyContent: 'space-between',
     boxSizing: 'border-box',
   };

   const logoContainerStyle: React.CSSProperties = {
     width: '90%', display: 'flex', justifyContent: 'center',
     paddingTop: isMobile && isPortrait ? 'env(safe-area-inset-top)' : '0',
     flexShrink: 0,
   };

   const logoStyle: React.CSSProperties = {
     width: isMobile ? (isPortrait ? '60%' : '80%') : '0', // Десктоп лого не видно здесь
     maxWidth: isMobile && !isPortrait ? '200px' : '100%', height: 'auto',
   };

   const hornetsLandscapeContainerStyle: React.CSSProperties = {
     width: '90%', display: 'flex', justifyContent: 'space-around',
     alignItems: 'center', flexShrink: 0,
     marginTop: 'auto',
     paddingBottom: '0px',
   };

    // --- ИЗМЕНЕННЫЙ Стиль шершней для Landscape ---
    const hornetLandscapeImageStyle: React.CSSProperties = {
      ...parallaxElementBaseStyle, // Базовые стили
      width: '45%',
      maxHeight: '100%', // Увеличено
      margin: '0 3px',
      // transform убран отсюда
   };

   const hornetsContainerStyle: React.CSSProperties = { // Для портретного режима
     width: '100%', display: 'flex', justifyContent: 'space-between',
     alignItems: 'flex-end',
     paddingBottom: `calc(10px + env(safe-area-inset-bottom))`,
   };

    // --- ИЗМЕНЕННЫЙ Стиль шершней для Portrait ---
    const hornetImageStyle: React.CSSProperties = { // Для портретного режима
      ...parallaxElementBaseStyle, // Базовые стили
      width: '45%',
      maxHeight: '30vh',
      borderRadius: '0',
      // transform убран отсюда
   };

   // ... (Остальные стили без изменений) ...
    const rightColumnStyle: React.CSSProperties = { // Для десктопа
     width: isMobile ? '100%' : '40%', maxWidth: isMobile ? '100%' : '480px',
     display: 'flex', flexDirection: 'column', alignItems: 'center',
     gap: isMobile ? '10px' : '20px', position: 'relative', height: 'auto',
     justifyContent: isMobile ? (isPortrait ? 'flex-start' : 'space-between') : 'flex-start',
     padding: isMobile ? '0px' : '0', boxSizing: 'border-box',
   };
   const imageStyle: React.CSSProperties = { // Для десктопа
     width: '50%', maxWidth: '600px', height: 'auto', maxHeight: '80vh',
     borderRadius: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
     objectFit: 'cover',
   };
   const buttonBaseStyle: React.CSSProperties = {
     padding: '0', backgroundColor: 'transparent', color: 'transparent',
     fontSize: '0', borderRadius: '0', border: 'none', fontWeight: 600,
     boxShadow: 'none', cursor: 'pointer', transition: 'transform 0.1s ease',
     width: '150px', height: '150px', textAlign: 'center', zIndex: 20,
     backgroundImage: 'url(/assets/gvozd/start_button.png)',
     backgroundSize: 'contain', backgroundRepeat: 'no-repeat',
     backgroundPosition: 'center', alignSelf: 'center', flexShrink: 0,
   };
   const buttonDesktopStyle: React.CSSProperties = {
     ...buttonBaseStyle, padding: '16px 32px', backgroundColor: '#22c55e',
     color: 'white', fontSize: '1.25rem', borderRadius: '8px',
     border: '2px solid #15803d', boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
     backgroundImage: 'none', width: '100%', height: 'auto',
     transition: 'background-color 0.2s ease, transform 0.1s ease',
   };
   const buttonLandscapeStyle: React.CSSProperties = {
     ...buttonBaseStyle, width: '160px', height: '160px',
   };
   const buttonPortraitStyle: React.CSSProperties = {
     ...buttonBaseStyle, width: '150px', height: '150px',
   };
   const buttonHoverMobile = 'url(/assets/gvozd/start_button_hover.png)';
   const buttonHoverDesktop = '#16a34a';
   const instructionsBoxBaseStyle: React.CSSProperties = {
     backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: '8px',
     padding: '10px', width: '90%', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
     border: '1px solid rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(2px)',
     boxSizing: 'border-box',
   };
   const instructionsBoxDesktopStyle: React.CSSProperties = {
     ...instructionsBoxBaseStyle, backgroundColor: 'rgba(55, 65, 81, 0.85)',
     padding: '0px', width: '100%', border: '1px solid #4b5563',
     marginTop: '0', marginBottom: '0',
   };
   const instructionsLandscapeBoxStyle: React.CSSProperties = {
     ...instructionsBoxBaseStyle, width: '100%', flexGrow: 1, minHeight: 0,
     overflowY: 'auto',
   };
   const instructionsPortraitBoxStyle: React.CSSProperties = {
     ...instructionsBoxBaseStyle, width: '90%', margin: '0 auto',
   };
   const instructionsTitleStyle: React.CSSProperties = {
     fontSize: isMobile ? '0.9rem' : '1.25rem', fontWeight: 'bold',
     marginBottom: isMobile ? '6px' : '12px',
     color: isMobile ? '#000000' : '#fde047', textAlign: 'center',
   };
   const instructionsListStyle: React.CSSProperties = {
     listStyle: 'none', padding: 0, margin: 0,
     fontSize: isMobile ? '0.8rem' : '0.9rem', lineHeight: 1.5,
     color: isMobile ? '#000000' : '#f3f4f6',
   };
   const disclaimerStyle: React.CSSProperties = {
     fontSize: isMobile ? '0.75rem' : '0.75rem', lineHeight: 1.4,
     padding: '8px 2px 0 2px', textAlign: 'left',
     color: isMobile ? '#000000' : '#9ca3af', marginTop: '8px',
     borderTop: isMobile ? '1px solid rgba(0,0,0,0.1)' : '1px solid #4b5563',
   };
   const rotationOverlayStyle: React.CSSProperties = {
     position: 'absolute', bottom: 0, left: 0, width: '100%', height: 'auto',
     backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 30, color: 'white',
     textAlign: 'center', padding: '15px', boxSizing: 'border-box',
     display: isMobile && isPortrait ? 'block' : 'none', // Показываем только на мобильных в портрете
   };
   const rotateIconStyle: React.CSSProperties = {
     fontSize: '24px', marginBottom: '8px', display: 'inline-block',
     transform: 'rotate(90deg)',
   };
   const rotateTextStyle: React.CSSProperties = {
     fontSize: '14px', fontWeight: 'bold', marginLeft: '10px',
     display: 'inline-block', verticalAlign: 'middle',
   };
   const fullscreenButtonStyle: React.CSSProperties = {
     border: `1px solid ${isFullscreenActive ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.4)'}`,
     color: 'white',
     width: '44px', height: '44px', borderRadius: '8px', padding: '0',
     marginLeft: '15px', cursor: 'pointer', display: 'flex',
     justifyContent: 'center', alignItems: 'center', flexShrink: 0,
     transition: 'background-color 0.2s ease, transform 0.1s ease, border-color 0.2s ease',
     boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
     backgroundImage: `url('/assets/gvozd/fscreen.svg')`,
     backgroundSize: '60% 60%',
     backgroundRepeat: 'no-repeat',
     backgroundPosition: 'center',
   };
   const buttonContainerStyle: React.CSSProperties = {
       display: 'flex', alignItems: 'center', justifyContent: 'center',
       width: '100%', margin: '10px 0',
   };


  // --- Обработчики событий (без изменений) ---
  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (e.currentTarget.style.backgroundImage !== fullscreenButtonStyle.backgroundImage) {
        e.currentTarget.style.backgroundImage = buttonHoverMobile;
        e.currentTarget.style.transform = 'scale(0.97)';
    }
  };
  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
     if (e.currentTarget.style.backgroundImage !== fullscreenButtonStyle.backgroundImage) {
         e.currentTarget.style.backgroundImage = 'url(/assets/gvozd/start_button.png)';
         e.currentTarget.style.transform = 'scale(1)';
       }
  };
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
     if (isMobile) {
       if (e.currentTarget.style.backgroundImage !== fullscreenButtonStyle.backgroundImage) {
            e.currentTarget.style.backgroundImage = buttonHoverMobile;
            e.currentTarget.style.transform = 'scale(0.97)';
       }
     } else {
       e.currentTarget.style.backgroundColor = buttonHoverDesktop;
       e.currentTarget.style.transform = 'scale(0.97)';
     }
  };
  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
     if (isMobile) {
       if (e.currentTarget.style.backgroundImage !== fullscreenButtonStyle.backgroundImage) {
            e.currentTarget.style.backgroundImage = 'url(/assets/gvozd/start_button.png)';
            e.currentTarget.style.transform = 'scale(1)';
       }
     } else {
       e.currentTarget.style.backgroundColor = '#22c55e';
       e.currentTarget.style.transform = 'scale(1)';
     }
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isMobile) {
      if (e.currentTarget.style.backgroundImage !== fullscreenButtonStyle.backgroundImage && e.currentTarget.style.transform === 'scale(0.97)') {
            e.currentTarget.style.backgroundImage = 'url(/assets/gvozd/start_button.png)';
            e.currentTarget.style.transform = 'scale(1)';
      }
    } else {
       if (e.currentTarget.style.transform === 'scale(0.97)') {
            e.currentTarget.style.backgroundColor = '#22c55e';
            e.currentTarget.style.transform = 'scale(1)';
       }
    }
    if (e.currentTarget.style.backgroundImage === fullscreenButtonStyle.backgroundImage) {
      e.currentTarget.style.transform = 'scale(1)';
    }
  };
  const handleDesktopMouseOver = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = buttonHoverDesktop;
  };
  const handleDesktopMouseOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = '#22c55e';
    e.currentTarget.style.transform = 'scale(1)';
  };

  const handleStartClick = () => {
    audioRef.current?.play().catch(e => console.log("Audio play on start click failed:", e));
    onStart();
  };

  const enterFullscreen = () => {
    const element = overlayRef.current;
    if (!element) return;
    console.log("Requesting fullscreen for:", element);
    try {
      if (element.requestFullscreen) { element.requestFullscreen().catch(err => console.error("FS Error:", err)); }
      else if ((element as any).webkitRequestFullscreen) { (element as any).webkitRequestFullscreen(); }
      else if ((element as any).mozRequestFullScreen) { (element as any).mozRequestFullScreen(); }
      else if ((element as any).msRequestFullscreen) { (element as any).msRequestFullscreen(); }
      else { console.warn("Fullscreen API not supported."); }
    } catch (e) { console.error("FS request failed:", e); }
  };

  const exitFullscreen = () => {
     console.log("Exiting fullscreen");
     try {
      if (document.exitFullscreen) { document.exitFullscreen(); }
      else if ((document as any).webkitExitFullscreen) { (document as any).webkitExitFullscreen(); }
      else if ((document as any).mozCancelFullScreen) { (document as any).mozCancelFullScreen(); }
      else if ((document as any).msExitFullscreen) { (document as any).msExitFullscreen(); }
      else { console.warn("Exit Fullscreen API not supported."); }
     } catch (e) { console.error("Exit FS failed:", e); }
  };

  const toggleFullscreen = () => {
    audioRef.current?.play().catch(e => console.log("Audio play on fullscreen toggle failed:", e));
    const isActive = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement);
    console.log("Toggle fullscreen requested. Currently active:", isActive);
    if (!isActive) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
  };

  // --- Функции рендеринга ---

  // --- ИЗМЕНЕННЫЙ рендер Mobile Landscape ---
  const renderMobileLandscape = () => {
      const baseStyle = hornetLandscapeImageStyle; // Базовый стиль для ландшафта
      const useParallax = isMobile && gyroscopeActive; // Условие для параллакса

      return (
          <div style={mobileLandscapeContainerStyle}>
              <div style={leftColumnStyle}>
                  <div style={logoContainerStyle}> <img src="/assets/gvozd/logo.png" alt="Логотип" style={logoStyle} /> </div>
                  <div style={hornetsLandscapeContainerStyle}>
                      {/* Шершень 1 */}
                      <img
                          src="/assets/gvozd/start_s1.png"
                          alt="Шершень 1"
                          // Применяем класс анимации, если НЕТ параллакса
                          className={!useParallax ? 'float-animation' : ''}
                          // Применяем transform стиль, ТОЛЬКО если ЕСТЬ параллакс
                          style={useParallax
                              ? { ...baseStyle, transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)` }
                              : baseStyle // Иначе просто базовый стиль
                          }
                      />
                      {/* Шершень 2 */}
                      <img
                          src="/assets/gvozd/start_s2.png"
                          alt="Шершень 2"
                          // Другой класс анимации для разнообразия, если НЕТ параллакса
                          className={!useParallax ? 'float-animation float-animation--alt' : ''}
                           // Другое смещение для параллакса, ТОЛЬКО если он активен
                          style={useParallax
                              ? { ...baseStyle, transform: `translate(${-parallaxOffset.x * 0.8}px, ${-parallaxOffset.y * 0.8}px)` }
                              : baseStyle // Иначе просто базовый стиль
                          }
                      />
                  </div>
              </div>
              {/* Правая колонка без изменений */}
              <div style={rightColumnLandscapeStyle}>
                  <div style={instructionsLandscapeBoxStyle}>
                      <h3 style={instructionsTitleStyle}>Управление:</h3>
                      <ul style={instructionsListStyle}><li>← → для движения</li><li>↑ или пробел для прыжка</li><li>Прыгайте на врагов сверху</li></ul>
                      <div style={disclaimerStyle}> ККШИ попала в беду — таинственные шершни проникли в окрестности школы и рассыпали уставы, документы, учебные материалы по всей территории школы-интерната. Некоторые из кадетских символов украдены.<br/><br/>Кадет — лучший кадет, и именно он отправляется в путь, чтобы вернуть порядок, собрать уставы, найти потерянные шевроны, спасти кадетов, и в финале — отстоять честь школы в поединке с Шершнем-Командиром. </div>
                  </div>
                  <div style={buttonContainerStyle}>
                      <button
                          onClick={handleStartClick}
                          style={buttonLandscapeStyle}
                          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
                          onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}
                      />
                      <button
                          title={isFullscreenActive ? "Выйти из полноэкранного режима" : "Перейти в полноэкранный режим"}
                          style={{
                              ...fullscreenButtonStyle,
                              backgroundColor: isFullscreenActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                          }}
                          onClick={toggleFullscreen}
                          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      />
                  </div>
              </div>
          </div>
      );
  };

  // --- ИЗМЕНЕННЫЙ рендер Mobile Portrait ---
  const renderMobilePortrait = () => {
      const baseStyle = hornetImageStyle; // Базовый стиль для портрета
      const useParallax = isMobile && gyroscopeActive; // Условие для параллакса

      return (
          <div style={mobilePortraitContainerStyle}>
              <div style={logoContainerStyle}> <img src="/assets/gvozd/logo.png" alt="Логотип" style={logoStyle} /> </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flexGrow: 1, justifyContent: 'center', gap: '15px' }}>
                  <div style={buttonContainerStyle}>
                      <button
                          onClick={handleStartClick}
                          style={buttonPortraitStyle}
                          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
                          onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}
                      />
                      <button
                          title={isFullscreenActive ? "Выйти из полноэкранного режима" : "Перейти в полноэкранный режим"}
                          style={{
                              ...fullscreenButtonStyle,
                              backgroundColor: isFullscreenActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                          }}
                          onClick={toggleFullscreen}
                          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      />
                  </div>
                  <div style={instructionsPortraitBoxStyle}>
                      <h3 style={instructionsTitleStyle}>Управление:</h3>
                      <ul style={instructionsListStyle}><li>← → для движения</li><li>↑ или пробел для прыжка</li><li>Прыгайте на врагов сверху</li></ul>
                      <div style={disclaimerStyle}> ККШИ попала в беду — таинственные шершни проникли в окрестности школы и рассыпали уставы, документы, учебные материалы по всей территории школы-интерната. Некоторые из кадетских символов украдены.<br/><br/>Кадет — лучший кадет, и именно он отправляется в путь, чтобы вернуть порядок, собрать уставы, найти потерянные шевроны, спасти кадетов, и в финале — отстоять честь школы в поединке с Шершнем-Командиром. </div>
                  </div>
              </div>
              <div style={hornetsContainerStyle}>
                   {/* Шершень 1 */}
                   <img
                      src="/assets/gvozd/start_s1.png"
                      alt="Шершень 1"
                      className={!useParallax ? 'float-animation' : ''}
                      style={useParallax
                          ? { ...baseStyle, transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)` }
                          : baseStyle
                      }
                  />
                  {/* Шершень 2 */}
                  <img
                      src="/assets/gvozd/start_s2.png"
                      alt="Шершень 2"
                      className={!useParallax ? 'float-animation float-animation--alt' : ''}
                      style={useParallax
                          ? { ...baseStyle, transform: `translate(${-parallaxOffset.x * 0.8}px, ${-parallaxOffset.y * 0.8}px)` }
                          : baseStyle
                      }
                  />
              </div>
              {/* rotationOverlayStyle остается, он не зависит от параллакса/анимации */}
              <div style={rotationOverlayStyle}> <div style={rotateIconStyle}>⟳</div> <div style={rotateTextStyle}>Пожалуйста, переверните устройство</div> </div>
          </div>
      );
  };

  // renderDesktop без изменений (там нет шершней)
  const renderDesktop = () => (
      <>
        <img src="/assets/gvozd/start.png" alt="Стартовая картинка" style={imageStyle} />
        <div style={rightColumnStyle}>
          <button
            onClick={handleStartClick}
            style={buttonDesktopStyle}
            onMouseOver={handleDesktopMouseOver} onMouseOut={handleDesktopMouseOut}
            onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}
          >
            СТАРТ!
          </button>
          <div style={instructionsBoxDesktopStyle}>
              <h3 style={instructionsTitleStyle}>Управление:</h3>
              <ul style={instructionsListStyle}><li>← → для движения</li><li>↑ или пробел для прыжка</li><li>Прыгайте на врагов сверху</li></ul>
              <div style={disclaimerStyle}> ККШИ попала в беду — таинственные шершни проникли в окрестности школы и рассыпали уставы, документы, учебные материалы по всей территории школы-интерната. Некоторые из кадетских символов украдены.<br/><br/>Кадет — лучший кадет, и именно он отправляется в путь, чтобы вернуть порядок, собрать уставы, найти потерянные шевроны, спасти кадетов, и в финале — отстоять честь школы в поединке с Шершнем-Командиром. </div>
          </div>
        </div>
      </>
    );


  // --- Основной рендер компонента ---
  return (
    <div style={overlayStyle} ref={overlayRef}>
      {/* Скрытый аудио элемент */}
      <audio ref={audioRef} src="/assets/gvozd/start_bg.wav" preload="auto" loop></audio>

      {/* Условный рендеринг */}
      {isMobile
        ? (isPortrait ? renderMobilePortrait() : renderMobileLandscape())
        : renderDesktop()
      }
    </div>
  );
};

export default StartScreen;