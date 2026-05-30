import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Opponent, OpponentId } from "../types";
import { RefreshCw, Play, Sparkles, Smile, MessageSquare, ShieldAlert, User, HelpCircle, Zap, Shield, Video, Brain, Cpu, X, Layers, Activity } from "lucide-react";
import OpponentAvatar from "./OpponentAvatar";

interface OpponentSelectProps {
  opponents: Opponent[];
  onSelect: (id: OpponentId) => void;
  selectedId: OpponentId | null;
  onStartGame: () => void;
  maxScore: number;
  setMaxScore: (score: number) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  onOpenHelp: () => void;
}

export default function OpponentSelect({
  opponents,
  onSelect,
  selectedId,
  onStartGame,
  maxScore,
  setMaxScore,
  playerName,
  setPlayerName,
  onOpenHelp,
}: OpponentSelectProps) {
  const [isGuideUnrolled, setIsGuideUnrolled] = useState<boolean>(false);
  const [hoveredId, setHoveredId] = useState<OpponentId | null>(null);
  const [activeMlInfo, setActiveMlInfo] = useState<OpponentId | null>(null);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>("");

  const handleStartGameClick = () => {
    if (!playerName || !playerName.trim()) {
      setWarningMessage("Silakan masukkan nama kamu terlebih dahulu! 👤");
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 4000);
      return;
    }
    if (!selectedId) {
      setWarningMessage("Silakan pilih karakter lawan terlebih dahulu untuk bertanding! 🎮");
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 4000);
      return;
    }
    setShowWarning(false);
    onStartGame();
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
      {/* Visual Header */}
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-pink-500/20 text-pink-300 border border-pink-500/30 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 shadow-sm backdrop-blur-md"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-pink-400" />
          Game Variety Show Korea
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mt-1 drop-shadow-md">
          CHAM CHAM CHAM! <span className="text-pink-500">참참참</span>
        </h1>
        <p className="text-white/70 max-w-3xl mx-auto mt-2 text-sm sm:text-base leading-relaxed">
          Pilih lawan tandingmu, tantang kecerdasan buatan mereka, dan buktikan ketangkasan refleks kepalamu!
        </p>
      </div>

      {/* Guide "How to Play" Button above Inputs */}
      <div className="w-full max-w-5xl mx-auto mb-5 px-1">
        <button
          type="button"
          onClick={() => setIsGuideUnrolled(!isGuideUnrolled)}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/10 hover:bg-white/15 active:bg-white/5 text-white/90 border border-white/20 font-black text-xs rounded-3xl shadow-lg backdrop-blur-xl transition-all duration-300 cursor-pointer group uppercase tracking-widest font-sans text-center"
        >
          {/* Tanda panah ke bawah (SVG) */}
          <motion.div
            animate={{ rotate: isGuideUnrolled ? 180 : 0, y: isGuideUnrolled ? 0 : [0, 3, 0] }}
            transition={{ 
              rotate: { duration: 0.3 },
              y: isGuideUnrolled ? { duration: 0.1 } : { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
            }}
            className="flex items-center justify-center text-pink-400 group-hover:scale-115 shrink-0"
          >
            <svg className="w-4.5 h-4.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-6l-7 7-7-7" />
            </svg>
          </motion.div>
          
          <span className="text-center font-bold tracking-widest">
            Apa itu permainan "Cham Cham Cham"
          </span>
        </button>

        {/* Collapsible roller drawer (gulungan menjulur ke bawah) */}
        <AnimatePresence initial={false}>
          {isGuideUnrolled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-6 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl text-white space-y-6 shadow-2xl">
                {/* Custom User Paragraphs (Indonesian explanation) with enlarged font sizes */}
                <div className="space-y-4 text-white/90 font-sans">
                  <p className="border-l-4 border-yellow-400 pl-4 bg-white/5 py-3 rounded-r-xl text-[19px] leading-[29px] font-normal">
                    <strong>Cham Cham Cham (참참참)</strong> adalah permainan refleks tradisional Korea yang sangat populer di variety show. Inti dari permainan ini adalah adu insting dan kecepatan antara dua orang, di mana satu orang bertindak sebagai penyerang dan orang lainnya bertindak sebagai bertahan/penghindar.
                  </p>
                  <p className= "border-l-4 border-pink-400 pl-4 bg-white/5 py-3 rounded-r-xl text-[19px] leading-[29px] font-normal"> 
                    Permainan ini menggunakan gerakan tangan untuk menyerang dan gerakan wajah untuk menghindar. Biasanya terdapat 2 arah yang valid dalam permainan ini yaitu <strong>Kiri</strong>, dan <strong>Kanan</strong>. Namun, pada permainan yang dibuat ini saya menambahkan 1 arah lain yaitu <strong>Atas</strong>.
                    Jika pemain yang bertahan berhasil menghindar (arah berbeda), maka di ronde berikutnya posisi akan dibalik: pemain yang bertahan tadi berubah menjadi penyerang, dan sebaliknya. Permainan terus berlanjut sampai ada yang berhasil mencetak poin atau sesuai kesepakatan batas skor.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Nama & Target Points Grid Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
        {/* Player Name Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-5 shadow-lg border border-white/20 flex flex-col justify-center gap-2.5">
          <label className="text-white/90 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-pink-400 shrink-0" />
            Nama Kamu:
          </label>
          <input
            id="player-name-input"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="INPUT YOUR NAME"
            className="w-full bg-white/10 border border-white/20 focus:border-pink-500/80 rounded-2xl px-4 py-3 text-sm font-mono font-bold tracking-widest text-center text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all shadow-inner uppercase"
          />
        </div>

        {/* Target Points Selection Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-5 shadow-lg border border-white/20 flex flex-col justify-center gap-2.5">
          <span className="text-white/90 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-pink-400 shrink-0" />
            Skor Kemenangan:
          </span>
          <div className="flex gap-2 w-full">
            {[1, 3, 5].map((points) => (
              <button
                key={points}
                type="button"
                onClick={() => setMaxScore(points)}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border ${
                  maxScore === points
                    ? "bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-400/20"
                    : "bg-white/5 hover:bg-white/10 text-white/70 border-white/15"
                }`}
              >
                {points} Poin
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Opponents Grid */}
      <h2 className="text-center text-white/50 text-[11px] font-mono font-extrabold uppercase tracking-widest mb-6">
        — Pilih Karakter Lawan —
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {opponents.map((opp, idx) => {
          const isSelected = selectedId === opp.id;
          const isHovered = hoveredId === opp.id;
          const isActiveVisual = isSelected || isHovered;
          return (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              onHoverStart={() => setHoveredId(opp.id)}
              onHoverEnd={() => setHoveredId(null)}
              onClick={() => onSelect(opp.id)}
              className={`relative cursor-pointer rounded-3xl p-6 text-center transition-all flex flex-col justify-between overflow-hidden duration-350 ${
                isSelected
                  ? "backdrop-blur-3xl bg-pink-500/25 border-2 border-pink-500 shadow-2xl shadow-pink-500/30 scale-[1.03] z-10"
                  : isHovered
                  ? "backdrop-blur-3xl bg-pink-500/15 border-2 border-pink-500/70 shadow-xl shadow-pink-500/20 scale-[1.02]"
                  : "backdrop-blur-2xl bg-white/5 border border-white/10 opacity-70 hover:opacity-100"
              }`}
            >
              {/* Machine Learning Model Overlay */}
              <AnimatePresence>
                {activeMlInfo === opp.id && (
                  <motion.div
                    initial={{ opacity: 0, y: "100%" }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 180 }}
                    className="absolute inset-0 p-5 rounded-[22px] bg-black/95 backdrop-blur-2xl text-left border border-pink-500/50 flex flex-col justify-between overflow-y-auto z-40"
                    onClick={(e) => e.stopPropagation()} // Prevent selecting card when clicking overlay
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-1.5 text-pink-400 font-mono font-bold text-[10px] tracking-widest uppercase">
                          <Brain className="w-4 h-4 text-pink-500 animate-[pulse_2s_infinite]" />
                          INTELLIGENCE CORE
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMlInfo(null);
                          }}
                          className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <h4 className="text-white text-base font-black uppercase tracking-wide mb-1">
                        {opp.id === "minjun" && "Markov Chain"}
                        {opp.id === "jihee" && "Multilayer Perceptron"}
                        {opp.id === "master_kim" && "Q-Learning Agent"}
                      </h4>
                      <span className="inline-block text-white/50 text-[9px] font-mono tracking-widest uppercase mb-3 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {opp.id === "minjun" && "Probabilitas Sekuensial"}
                        {opp.id === "jihee" && "Jaringan Saraf Tiruan"}
                        {opp.id === "master_kim" && "Reinforcement Learning"}
                      </span>

                      <p className="text-white/85 text-[11px] leading-relaxed mb-4">
                        {opp.id === "minjun" && (
                          <>
                            Min-jun menganalisis pilihan arah terakhirmu (<em>state transitions</em>) melalui tabel peluang dinamis. Dia melacak frekuensi perpindahan gerakmu (misal: setelah Kiri, berapa persen kemungkinan kamu memilih Atas, Kiri, atau Kanan) untuk mendeteksi pola repetitif jangka pendek secara instan!
                          </>
                        )}
                        {opp.id === "jihee" && (
                          <>
                            Ji-hee ditenagai model Artificial Neural Network (Feedforward Perceptron dengan lapisan tersembunyi ReLU dan softmax). Dia merekam rentetan pergerakanmu ke dalam buffer memori berkala, lalu menggunakannya untuk memprediksi varian taktik gerakan yang lebih acak dan kompleks.
                          </>
                        )}
                        {opp.id === "master_kim" && (
                          <>
                            Suhu Kim bertarung adaptif mengoptimalkan Nilai Q (State-Action Value). Setiap tebakan tepat memberinya reward positif, sementara kekalahan menghasilkan penalti. Semakin lama pertandingan, model mentalnya semakin optimal dalam mengunci dan mendominasi refleksmu!
                          </>
                        )}
                      </p>

                      {/* Technical Data Details */}
                      <div className="space-y-2 bg-white/5 rounded-xl p-2.5 border border-white/10 font-mono text-[9px] text-white/80">
                        <div className="flex justify-between items-center">
                          <span className="text-white/40">ALGORITMA:</span>
                          <span className="text-yellow-300 font-bold">
                            {opp.id === "minjun" && "First-Order Transition"}
                            {opp.id === "jihee" && "Backprop ANN / SGD"}
                            {opp.id === "master_kim" && "SARSA/Q-Table"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/40">KEKUATAN KOGNITIF:</span>
                          <span className="text-pink-400 font-bold">
                            {opp.id === "minjun" && "⚡⚡⚡ (Refleks)"}
                            {opp.id === "jihee" && "⚡⚡⚡⚡ (Pola Seri)"}
                            {opp.id === "master_kim" && "⚡⚡⚡⚡⚡ (Eksploitasi)"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/40">MEMORI BUFFER:</span>
                          <span>
                            {opp.id === "minjun" && "1 State Transition"}
                            {opp.id === "jihee" && "2-step Sliding Window"}
                            {opp.id === "master_kim" && "Q-Table State Space"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(opp.id);
                        setActiveMlInfo(null);
                      }}
                      className="w-full mt-3 py-2 bg-pink-500 hover:bg-pink-600 font-black text-[10px] tracking-widest text-white uppercase rounded-xl transition-all cursor-pointer"
                    >
                      PILIH KARAKTER & TUTUP 🎮
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selected Badge */}
              {isActiveVisual && (
                <div className="absolute top-4 right-4 bg-pink-500 text-white p-1 rounded-full shadow-md z-10 animate-bounce">
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
              )}

              {/* Avatar Preview */}
              <div className="h-44 flex items-center justify-center overflow-hidden mb-4">
                <div className="scale-75 md:scale-[0.8] drop-shadow-lg">
                  <OpponentAvatar
                    opponentId={opp.id}
                    expression={isActiveVisual ? "smiling" : "neutral"}
                    action={null}
                    gameState="idle"
                    role="user_attack"
                  />
                </div>
              </div>

              {/* Opponent Info */}
              <div>
                <h3 className="text-lg font-black text-white mb-1 leading-snug">
                  {opp.name}
                </h3>
                <p className="text-pink-400 text-xs font-bold mb-3">
                  {opp.title}
                </p>
                <p className="text-white/70 text-xs leading-relaxed mb-4 line-clamp-3">
                  {opp.bio}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                  {opp.personalities.map((trait) => (
                    <span
                      key={trait}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors duration-350 ${
                        isActiveVisual
                          ? "bg-pink-500/20 text-pink-200 border-pink-500/30 font-semibold"
                          : "bg-white/10 text-white/80 border-white/10"
                      }`}
                    >
                      #{trait}
                    </span>
                  ))}
                </div>

                {/* Interactive ML Info Trigger Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMlInfo(opp.id);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md transition-all duration-300 cursor-pointer group ${
                    isActiveVisual
                      ? "bg-pink-500 text-white hover:bg-pink-600 shadow-lg shadow-pink-500/30"
                      : "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/50 text-pink-400 hover:text-pink-300"
                  }`}
                >
                  <Brain className={`w-3.5 h-3.5 group-hover:scale-110 transition-transform ${
                    isActiveVisual ? "text-white" : "text-pink-500"
                  }`} />
                  <span>DETAIL MODEL ML 🤖</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Start Button */}
      <div className="text-center flex flex-col items-center gap-4">
        <AnimatePresence>
          {showWarning && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: [0, -10, 10, -10, 10, -5, 5, 0] }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className="px-6 py-3 bg-red-500/20 border-2 border-red-500/70 text-red-200 rounded-2xl flex items-center justify-center gap-2.5 shadow-xl shadow-red-950/40 text-xs sm:text-sm font-black uppercase tracking-wider select-none"
            >
              <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
              <span>{warningMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={handleStartGameClick}
          whileTap={{ scale: 0.95 }}
          className="relative inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-base font-black rounded-full shadow-lg shadow-pink-500/35 hover:from-pink-400 hover:to-rose-500 transition-all cursor-pointer select-none border-b-4 border-rose-800"
        >
          MULAI CHAMPIONSHIP <Play className="w-5 h-5 fill-current" />
        </motion.button>
      </div>
    </div>
  );
}
