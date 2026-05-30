import React, { useState, useEffect } from "react";
import { PlayHistoryItem, Opponent, OpponentId, PlayRole, RoundWinner, OpponentExpression, Direction } from "./types";
import OpponentSelect from "./components/OpponentSelect";
import GameScreen from "./components/GameScreen";
import HistorySidebar from "./components/HistorySidebar";
import HelpModal from "./components/HelpModal";
import { Sparkles, HelpCircle, Gamepad2, Info, Moon, Sun, ArrowLeft, Trophy } from "lucide-react";

const OPPONENTS_LIST: Opponent[] = [
  {
    id: "minjun",
    name: "Min-jun",
    title: "Bocah Cantik Pembual (The Cocky Kid)",
    bio: "Min-jun adalah anak laki-laki yang sangat percaya diri, suka pamer, dan suka mengejek jika ia menang. Tapi kalau kalah sedikit saja, dia langsung merengek-rengek kaget 'Heol! Masak aku bisa kalah!'.",
    personalities: ["Sombong", "Ekspresif", "Manja"]
  },
  {
    id: "jihee",
    name: "Ji-hee",
    title: "Pembawa Acara Variety Hype (The Variety MC)",
    bio: "Ji-hee adalah MC variety show Korea yang super energik, heboh, dan ekspresif. Dia selalu berteriak 'Daebak!' jika kamu sukses bertahan, dan sangat dramatis ketika bertanding.",
    personalities: ["Hype", "Dramatis", "Ceria"]
  },
  {
    id: "master_kim",
    name: "Master Kim",
    title: "Suhu Zen yang Santai (The Calm Master)",
    bio: "Suhu Kim adalah kakek ahli meditasi yang santai dan bijaksana, namun senang memberikan komentar satir yang lucu. Dia jarang panik, tapi kalau kalah dia akan berdeham 'Ahem... anginnya kencang sekali ya hari ini'.",
    personalities: ["Tenang", "Bijaksana", "Satir"]
  }
];

export default function App() {
  const [activeScreen, setActiveScreen] = useState<"menu" | "game">("menu");
  const [selectedOpponentId, setSelectedOpponentId] = useState<OpponentId | null>(null);
  const [maxScore, setMaxScore] = useState<number>(3); // Standard best of 3 or first to 3
  const [userScore, setUserScore] = useState<number>(0);
  const [aiScore, setAiScore] = useState<number>(0);
  const [currentRole, setCurrentRole] = useState<PlayRole>("user_attack");
  const [history, setHistory] = useState<PlayHistoryItem[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>("");

  const currentOpponent = OPPONENTS_LIST.find((o) => o.id === selectedOpponentId) || OPPONENTS_LIST[1];

  // Callback on each turn completion
  const handleRoundComplete = (roundData: {
    userAction: Direction;
    aiAction: Direction;
    winner: RoundWinner;
    commentary: string;
    refereeMessage: string;
    opponentExpression: OpponentExpression;
  }) => {
    // 1. Log to history
    const nextRoundNumber = history.length + 1;
    const item: PlayHistoryItem = {
      round: nextRoundNumber,
      role: currentRole,
      userAction: roundData.userAction,
      aiAction: roundData.aiAction,
      winner: roundData.winner,
      commentary: roundData.commentary,
      refereeMessage: roundData.refereeMessage,
    };

    setHistory((prev) => [...prev, item]);

    // 2. Adjust Game scores safely
    if (roundData.winner === "user") {
      setUserScore((prev) => prev + 1);
    } else if (roundData.winner === "ai") {
      setAiScore((prev) => prev + 1);
    }

    // 3. Switch Roles for variety turn-based mechanics (Attacker <=> Defender model)
    // Only switch role if match is still running
    const nextUserScore = roundData.winner === "user" ? userScore + 1 : userScore;
    const nextAiScore = roundData.winner === "ai" ? aiScore + 1 : aiScore;
    if (nextUserScore < maxScore && nextAiScore < maxScore) {
      setCurrentRole((prev) => (prev === "user_attack" ? "user_defend" : "user_attack"));
    }
  };

  const handleStartGame = () => {
    setActiveScreen("game");
    setUserScore(0);
    setAiScore(0);
    setCurrentRole("user_attack");
    setHistory([]);
  };

  const handleResetGame = () => {
    setUserScore(0);
    setAiScore(0);
    setCurrentRole("user_attack");
    setHistory([]);
  };

  const handleExitToMenu = () => {
    setActiveScreen("menu");
    handleResetGame();
  };

  return (
    <div 
      className="min-h-screen md:h-screen md:overflow-hidden text-slate-100 font-sans flex flex-col antialiased selection:bg-rose-500/30"
      style={{
        background: "radial-gradient(circle at 0% 0%, #4f46e5 0%, transparent 50%), radial-gradient(circle at 100% 0%, #ec4899 0%, transparent 50%), radial-gradient(circle at 100% 100%, #06b6d4 0%, transparent 50%), radial-gradient(circle at 0% 100%, #f59e0b 0%, transparent 50%)",
        backgroundColor: "#0F172A"
      }}
    >
      {/* Dynamic Header Navbar */}
      <header className="backdrop-blur-xl bg-white/10 border-b border-white/20 py-2.5 px-6 sticky top-0 z-[100] shadow-lg shrink-0">
        <div className="w-full max-w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-400 text-black font-black px-4 py-1.5 skew-x-[-12deg] text-xs flex items-center gap-2 shadow-md">
              <Gamepad2 className="w-4 h-4 text-black stroke-[2.5]" />
              CHAM CHAM CHAM!
            </div>
            <div>
              <h2 className="text-[15px] font-black text-white-400 tracking-tight leading-none flex items-center gap-1.5 uppercase">
                GEORGE ANANDA
              </h2>
              <span className="text-[9px] text-white/50 font-mono tracking-tighter mt-0.5 block">
                GAME CREATOR &bull; REF_CORE_V.2.4
              </span>
            </div>
          </div>

          {/* Real-time details HUD / Instruction triggers */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-lg border border-white/20 backdrop-blur-md"
            >
              <HelpCircle className="w-3.5 h-3.5 text-yellow-400" /> Cara Bermain
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Dashboard */}
      <main className="flex-1 flex flex-col py-3 md:py-4 overflow-hidden min-h-0">
        {activeScreen === "menu" ? (
          <div className="overflow-y-auto flex-1">
            <OpponentSelect
              opponents={OPPONENTS_LIST}
              onSelect={setSelectedOpponentId}
              selectedId={selectedOpponentId}
              onStartGame={handleStartGame}
              maxScore={maxScore}
              setMaxScore={setMaxScore}
              playerName={playerName}
              setPlayerName={setPlayerName}
              onOpenHelp={() => setIsHelpOpen(true)}
            />
          </div>
        ) : (
          <div className="w-full max-w-full px-4 md:px-8 flex-1 flex flex-col min-h-0 overflow-hidden">
            <GameScreen
              opponent={currentOpponent}
              currentRole={currentRole}
              userScore={userScore}
              aiScore={aiScore}
              maxScore={maxScore}
              roundCount={history.length}
              history={history}
              onRoundComplete={handleRoundComplete}
              onExit={handleExitToMenu}
              onResetGame={handleResetGame}
              playerName={playerName}
            />
          </div>
        )}
      </main>

      {/* Unified footer without decoration clutter */}
      <footer className="backdrop-blur-md bg-black/40 border-t border-white/10 py-2.5 text-center text-[10px] text-white/40 shrink-0">
        <p className="font-semibold tracking-wide">
          Cham Cham Cham AI Referee &copy; 2026 &bull; Powered by Google Gemini-3.5-flash
        </p>
      </footer>

      {/* Guides popup dialogue manual */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
