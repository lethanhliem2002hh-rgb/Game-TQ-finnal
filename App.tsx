import React, { useState, useEffect } from 'react';
import { readExcelFile, getPlayerState, savePlayerState } from './services';
import type { WordPair, PlayerState } from './types';
import { Game } from './types';
import MatchGame from './components/MatchGame';
import QuizGame from './components/QuizGame';
import FallingWordsGame from './components/FallingWordsGame';
import EndlessTowerGame from './components/EndlessTowerGame';
import Altar from './components/Altar';
import { getResultsLog } from './services';
import { CoinIcon } from './components/icons';

const VOCAB_KEY = 'chinese_game_vocab';

const FileUpload: React.FC<{ onFileUpload: (pairs: WordPair[]) => void; onError: (msg: string) => void }> = ({ onFileUpload, onError }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsLoading(true);
            onError('');
            try {
                const pairs = await readExcelFile(file);
                onFileUpload(pairs);
            } catch (error: any) {
                onError(error.message || 'Có lỗi xảy ra khi đọc file.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto text-center p-8 bg-slate-800 rounded-2xl shadow-2xl">
            <h2 className="text-3xl font-bold mb-2">Học tiếng Trung qua Game</h2>
            <p className="text-slate-400 mb-6">Tải lên file Excel có 2 cột: <code className="bg-slate-900 px-1 rounded">TiengViet</code> và <code className="bg-slate-900 px-1 rounded">TiengTrung</code></p>
            <label htmlFor="file-upload" className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg inline-block transition-transform transform hover:scale-105">
                {isLoading ? 'Đang xử lý...' : '📂 Chọn file Excel'}
            </label>
            <input id="file-upload" type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} disabled={isLoading} />
        </div>
    );
};

const ResultsLogModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const logs = getResultsLog();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800">
                    <h2 className="text-xl font-bold">Lịch sử chơi</h2>
                    <button onClick={onClose} className="text-2xl hover:text-red-500">&times;</button>
                </div>
                <div className="p-4">
                    {logs.length === 0 ? (
                        <p className="text-center text-slate-400 py-8">Chưa có kết quả nào được ghi lại.</p>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-600">
                                    <th className="p-2">Thời gian</th>
                                    <th className="p-2">Game</th>
                                    <th className="p-2 text-right">Điểm</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, index) => (
                                    <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/50">
                                        <td className="p-2 text-sm text-slate-400">{log.time}</td>
                                        <td className="p-2 capitalize">{log.game}</td>
                                        <td className="p-2 text-right font-bold text-cyan-400">{log.score}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

const Header: React.FC<{playerState: PlayerState; onShowLog: () => void; onNewFile: () => void;}> = ({ playerState, onShowLog, onNewFile }) => (
    <div className="w-full max-w-7xl mb-6 flex flex-wrap justify-between items-center gap-4 bg-slate-800/50 backdrop-blur-sm p-3 rounded-lg">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            🎮 Học Tiếng Trung
        </h1>
        <div className="flex items-center gap-4">
            <div className="bg-slate-900 px-4 py-2 rounded-lg font-bold text-lg flex items-center">
                <CoinIcon className="h-6 w-6 mr-2 text-yellow-400" />
                <span>{playerState.coins}</span>
            </div>
             <button onClick={onShowLog} className="px-4 py-2 rounded-md font-semibold bg-slate-700 hover:bg-slate-600">
                📜 Lịch sử
            </button>
            <button onClick={onNewFile} className="px-4 py-2 rounded-md font-semibold bg-indigo-600 hover:bg-indigo-700">
                Tải file khác
            </button>
        </div>
    </div>
);

type View = 'dashboard' | 'game' | 'altar';

const App: React.FC = () => {
  const [wordPairs, setWordPairs] = useState<WordPair[] | null>(() => {
    try {
        const saved = localStorage.getItem(VOCAB_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch(e) {
        console.error("Failed to load vocab from storage", e);
        return null;
    }
  });
  const [playerState, setPlayerState] = useState<PlayerState>(getPlayerState());
  const [activeGame, setActiveGame] = useState<Game>(Game.Match);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [error, setError] = useState('');
  const [showLog, setShowLog] = useState(false);
  
  useEffect(() => {
    savePlayerState(playerState);
  }, [playerState]);

  const handleFileUpload = (pairs: WordPair[]) => {
    setWordPairs(pairs);
    localStorage.setItem(VOCAB_KEY, JSON.stringify(pairs));
  };
  
  const updatePlayerState = () => {
      setPlayerState(getPlayerState());
  }
  
  const handleGameEnd = (coinsEarned: number) => {
      updatePlayerState();
      setCurrentView('dashboard');
  };

  const handleNewFile = () => {
      setWordPairs(null);
      setCurrentView('dashboard');
      localStorage.removeItem(VOCAB_KEY);
  }

  const renderGame = () => {
    if (!wordPairs) return null;

    switch (activeGame) {
      case Game.Match:
        return <MatchGame wordPairs={wordPairs} playerState={playerState} onGameEnd={handleGameEnd} />;
      case Game.Quiz:
        return <QuizGame wordPairs={wordPairs} playerState={playerState} onGameEnd={handleGameEnd} />;
      case Game.Falling:
        return <FallingWordsGame wordPairs={wordPairs} playerState={playerState} onGameEnd={handleGameEnd} />
      case Game.Tower:
        return <EndlessTowerGame wordPairs={wordPairs} playerState={playerState} onGameEnd={handleGameEnd} />
      default:
        return null;
    }
  };

  const renderCurrentView = () => {
      switch(currentView) {
          case 'altar':
              return <Altar playerState={playerState} onPurchase={updatePlayerState} />;
          case 'game':
              return renderGame();
          case 'dashboard':
          default:
            return (
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-6">Chọn một trò chơi</h2>
                    <div className="flex flex-wrap justify-center gap-4">
                         <button onClick={() => { setActiveGame(Game.Match); setCurrentView('game'); }} className="px-6 py-3 rounded-md font-semibold text-lg transition-colors bg-slate-700 hover:bg-blue-600">
                            🧩 Ghép Thẻ
                        </button>
                        <button onClick={() => { setActiveGame(Game.Quiz); setCurrentView('game'); }} className="px-6 py-3 rounded-md font-semibold text-lg transition-colors bg-slate-700 hover:bg-green-600">
                            ❓ Đố Vui
                        </button>
                        <button onClick={() => { setActiveGame(Game.Falling); setCurrentView('game'); }} className="px-6 py-3 rounded-md font-semibold text-lg transition-colors bg-slate-700 hover:bg-yellow-600">
                            ⬇️ Từ Rơi
                        </button>
                        <button onClick={() => { setActiveGame(Game.Tower); setCurrentView('game'); }} className="px-6 py-3 rounded-md font-semibold text-lg transition-colors bg-slate-700 hover:bg-red-600">
                            🗼 Tháp Vô Tận
                        </button>
                    </div>
                </div>
            )
      }
  }

  if (!wordPairs) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">
        {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg mb-4">{error}</p>}
        <FileUpload onFileUpload={handleFileUpload} onError={setError} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
        <Header playerState={playerState} onShowLog={() => setShowLog(true)} onNewFile={handleNewFile} />
        
        <div className="w-full max-w-7xl">
            <div className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-lg mb-6 flex justify-center items-center gap-4">
                <button onClick={() => setCurrentView('dashboard')} className={`px-4 py-2 rounded-md font-semibold transition-colors ${currentView === 'dashboard' || currentView === 'game' ? 'bg-cyan-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                    Trò chơi
                </button>
                <button onClick={() => setCurrentView('altar')} className={`px-4 py-2 rounded-md font-semibold transition-colors ${currentView === 'altar' ? 'bg-purple-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                    Bàn Thờ Tri Thức
                </button>
            </div>
            
            <div className="bg-slate-800 rounded-lg shadow-xl animate-fadeIn p-4">
                {renderCurrentView()}
            </div>
        </div>

        {showLog && <ResultsLogModal onClose={() => setShowLog(false)} />}
    </div>
  );
};

export default App;