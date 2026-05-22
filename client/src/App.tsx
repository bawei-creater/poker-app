import { GameProvider, useGame } from './context/GameContext';
import { Lobby } from './pages/Lobby';
import { GameRoom } from './pages/GameRoom';

function AppContent() {
  const { state } = useGame();
  return state.roomId ? <GameRoom /> : <Lobby />;
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
