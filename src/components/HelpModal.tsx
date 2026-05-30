import React from "react";
import { X, Sparkles, Hand, ArrowRight, Shield, Video, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="relative backdrop-blur-3xl bg-black/90 w-full max-w-2xl rounded-3xl opacity-100 shadow-2xl overflow-hidden border border-white/20 max-h-[90vh] flex flex-col z-10"
          >
            {/* Elegant Colorful Header */}
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white p-6 relative flex items-center justify-between border-b border-white/10">
              <div>
                <span className="bg-white/20 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide inline-flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3 text-yellow-300" /> Game Guide
                </span>
                <h3 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 text-white">
                  Aturan, Cara Bermain "Cham Cham Cham" dan Implementasi Model untuk tiap Karakter
                </h3>
              </div>
              <button
                onClick={onClose}
                className="bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-all cursor-pointer border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with Scrollable Area */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-white no-scrollbar">
              {/* Introduction */}
              <p className="text-white/80 text-sm leading-relaxed border-l-4 border-yellow-400 pl-4 bg-white/5 py-2.5 rounded-r-xl">
                <strong>Cham Cham Cham (참참참)</strong> adalah permainan refleks tradisional Korea yang sangat populer di variety show (seperti Running Man). Aturannya sederhana tapi membutuhkan insting psikologis yang kuat untuk mengebak gerakan lawan!
              </p>

              {/* Roles Explanation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Role 1: Attacker */}
                <div className="backdrop-blur-xl bg-cyan-950/30 rounded-2xl p-5 border border-cyan-500/35 shadow-lg shadow-cyan-950/20">
                  <div className="flex items-center gap-2 text-cyan-300 font-black text-sm mb-2.5 uppercase tracking-wider">
                    <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                    KAMU MENYERANG ⚔️
                  </div>
                  <ul className="text-white/80 text-xs space-y-2 leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">&#8226;</span>
                      Kamu Mengaktifkan Triger dengan menggunakan gerakan tangan peace atau menekan space, agar countdownnya dimulai.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">&#8226;</span>
                      Kamu mengacungkan tangan ke arah yang diinginkan (<strong>Kiri, Kanan, atau Atas</strong>).
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">&#8226;</span>
                      Lawan AI memutar kepalanya ke salah satu arah.
                    </li>
                    <li className="flex items-start gap-1.5 font-bold text-white bg-cyan-950/70 p-2 rounded border border-cyan-500/30">
                      <span>🎯</span>
                      Jika arah tanganmu SAMA dengan arah kepala AI, kamu mendapat poin (MENANG)! Jika berbeda, AI selamat.
                    </li>
                  </ul>
                </div>

                {/* Role 2: Defender */}
                <div className="backdrop-blur-xl bg-pink-950/30 rounded-2xl p-5 border border-pink-500/35 shadow-lg shadow-pink-950/20">
                  <div className="flex items-center gap-2 text-pink-300 font-black text-sm mb-2.5 uppercase tracking-wider">
                    <Shield className="w-4 h-4 text-pink-400 animate-pulse" />
                    KAMU BERTAHAN 🛡️
                  </div>
                  <ul className="text-white/80 text-xs space-y-2 leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">&#8226;</span>
                      Kamu Mengaktifkan Triger dengan menggunakan gerakan tangan peace atau menekan space, agar countdownnya dimulai.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-pink-400 font-bold">&#8226;</span>
                      Lawan AI mengacungkan tangannya ke salah satu arah.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-pink-400 font-bold">&#8226;</span>
                      Kamu memutar kepala ke arah <strong>Kiri, Kanan, atau Atas</strong> saat countdown dimulai.
                    </li>
                    <li className="flex items-start gap-1.5 font-bold text-white bg-pink-950/70 p-2 rounded border border-pink-500/30">
                      <span>🎯</span>
                      Jika kepala/mata kamu SAMA dengan arah tangan AI, AI mendapat poin (KAMU KALAH)! Jika beda, kamu selamat.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Inputs Explained (Camera CV & Keyboard) */}
              <div>
                <h4 className="text-white text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-white/10 pb-2">
                  <Video className="w-4 h-4 text-pink-400" />
                  Alat Kontrol
                </h4>

                <div className="space-y-3.5 text-xs text-white/80">
                  {/* Camera Mode */}
                  <div className="flex flex-col md:flex-row items-start gap-3 bg-white/5 rounded-xl p-4 border border-white/10">
                    <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 p-1.5 rounded-lg font-bold font-mono text-[10px] uppercase shrink-0">MODE KAMERA</span>
                    <div className="leading-relaxed">
                      <strong>Deteksi Computer Vision (AI Referee)</strong>: AI menangkap gambar webcam-mu secara real-time!
                      <ul className="list-disc list-inside mt-2 space-y-1.5 text-white/60">
                        <li><strong>Menyerang</strong>: Tunjukkan tangan menunjuk lurus ke Kiri, Kanan, atau Atas pada frame.</li>
                        <li><strong>Bertahan</strong>: Putar kepala menengok secara jelas ke Kiri, Kanan, atau mendongak ke Atas.</li>
                        <li>Tekan tombol pelatuk kamera atau space atau bisa dengan menampilkan tanda peace untuk merekam gerakan dan referee AI akan menilainya secara instan!</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-white/5 border-t border-white/10 text-right backdrop-blur-md">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-yellow-400 text-black rounded-full text-xs font-black shadow-lg shadow-yellow-400/20 hover:bg-yellow-300 cursor-pointer transition-all"
              >
                Paham, Ayo Main!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
