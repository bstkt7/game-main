import GvozdGame from './Gvozd';
import './index.css'; // Подключаем базовые стили

const App = () => {
  // Можно добавить роутинг или другую логику приложения здесь,
  // но для простоты пока только рендерим игру
  return (
      <GvozdGame />
  );
};

export default App;