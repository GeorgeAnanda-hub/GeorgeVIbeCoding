import React from "react";
import { PlayHistoryItem, Opponent } from "../types";
import { Trophy, ShieldCheck, Flame, ArrowRight, User, Cpu, Smile, HelpCircle } from "lucide-react";

interface HistorySidebarProps {
  history: PlayHistoryItem[];
  opponent: Opponent;
  userScore: number;
  aiScore: number;
  maxScore: number;
}

export default function HistorySidebar({
  history,
  opponent,
  userScore,
  aiScore,
  maxScore,
}: HistorySidebarProps) {
  return (
    <div className="backdrop-blur-2xl bg-white/5 rounded-3xl p-6 border border-white/15 shadow-2xl flex flex-col h-full max-h-[600px] lg:max-h-[700px]">
      {/* Live scoreboard */}
      <div className="mb-6 pb-6 border-b border-white/10 flex flex-col items-center">
        <h3 className="text-white text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          Live Scoreboard
        </h3>

        <div className="flex items-center gap-6 justify-center w-full">
          {/* User Side */}
          <div className="text-center flex-1">
            <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest block mb-1">KAMU</span>
            <span className="text-4xl font-black text-white leading-none">{userScore}</span>
          </div>

          {/* Versus Divider */}
          <div className="text-xs font-black text-yellow-400 select-none bg-white/10 px-3 py-1.5 rounded-full border border-white/20 shadow-md">
            VS
          </div>

          {/* AI Side */}
          <div className="text-center flex-1">
            <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest block mb-1">{opponent.name.toUpperCase()}</span>
            <span className="text-4xl font-black text-pink-400 leading-none">{aiScore}</span>
          </div>
        </div>

        {/* Victory Threshold progress indicator */}
        <div className="w-full bg-white/10 h-2.5 rounded-full mt-5 overflow-hidden flex border border-white/5">
          <div
            className="bg-cyan-400 h-full transition-all duration-300 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            style={{ width: `${(userScore / maxScore) * 100}%` }}
          />
          <div
            className="bg-pink-500 h-full transition-all duration-300 ml-auto shadow-[0_0_8px_rgba(236,72,153,0.5)]"
            style={{ width: `${(aiScore / maxScore) * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mt-2.5 text-center">
          First to <strong className="text-yellow-400">{maxScore}</strong> wins the match!
        </p>
      </div>

      {/* Rounds history list */}
      <div className="flex-1 overflow-y-auto pr-1">
        <h4 className="text-white/80 text-xs font-black tracking-wider uppercase mb-3 text-left">
          Log Pertandingan
        </h4>

        {history.length === 0 ? (
          <div className="text-center py-12 text-white/30 h-full flex flex-col items-center justify-center gap-2">
            <HelpCircle className="w-8 h-8 text-white/10 stroke-[1.5]" />
            <p className="text-xs font-bold leading-normal text-white/50">Belum ada serangan!</p>
            <p className="text-[10px] text-white/40">Tekan tombol aksi untuk memulai ronde pertama.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {history
              .slice()
              .reverse()
              .map((item, index) => {
                const roundNum = item.round;
                const isUserWinner = item.winner === "user";
                const isAiWinner = item.winner === "ai";
                const isSafe = item.winner === "none";

                return (
                  <div
                    key={roundNum}
                    className={`rounded-2xl p-4 border transition-all ${
                      isUserWinner
                        ? "bg-cyan-500/10 border-cyan-500/30"
                        : isAiWinner
                        ? "bg-pink-500/10 border-pink-500/30"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">
                        Ronde {roundNum}
                      </span>
                      <span
                        className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          isUserWinner
                            ? "bg-cyan-400/20 text-cyan-300 border-cyan-500/30"
                            : isAiWinner
                            ? "bg-pink-500/20 text-pink-300 border-pink-500/30"
                            : "bg-white/10 text-white/70 border-white/10"
                        }`}
                      >
                        {isUserWinner
                          ? "Kamu Win!"
                          : isAiWinner
                          ? `${opponent.name} Win!`
                          : "AI Selamat!"}
                      </span>
                    </div>

                    {/* Action Flow display (Left, Right, Up) */}
                    <div className="flex items-center justify-between bg-black/30 border border-white/10 rounded-xl p-2.5 mb-2 text-xs">
                      {/* Left side */}
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-white/40" />
                        <span className="font-bold text-white/70 text-[11px]">
                          {item.role === "user_attack" ? "Point" : "Look"}
                        </span>
                        <span className="bg-white/10 px-1.5 py-0.5 rounded font-black text-[10px] text-yellow-400 uppercase">
                          {item.userAction}
                        </span>
                      </div>

                      <ArrowRight className="w-3.5 h-3.5 text-white/30" />

                      {/* Right side */}
                      <div className="flex items-center gap-1.5">
                        <span className="bg-pink-500/25 px-1.5 py-0.5 rounded font-black text-[10px] text-pink-300 uppercase">
                          {item.aiAction}
                        </span>
                        <span className="font-bold text-white/70 text-[11px]">
                          {item.role === "user_attack" ? "Look" : "Point"}
                        </span>
                        <Cpu className="w-3 h-3 text-pink-400" />
                      </div>
                    </div>

                    {/* Dialog message */}
                    {item.commentary && (
                      <div className="text-[11px] text-white/80 italic leading-relaxed border-l-2 border-pink-400 pl-2 py-1 mb-1.5 bg-white/5 rounded-r">
                        &ldquo;{item.commentary}&rdquo;
                      </div>
                    )}

                    {/* Referee official logs */}
                    {item.refereeMessage && (
                      <div className="text-[10.5px] text-white/60 font-medium leading-relaxed mt-1 flex items-center gap-1.5">
                        <small className="font-bold text-yellow-400 text-[9px] uppercase tracking-wider">Wasit:</small>
                        <span>{item.refereeMessage}</span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
