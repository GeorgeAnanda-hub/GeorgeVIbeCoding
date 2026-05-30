import React from "react";
import { OpponentExpression, Direction } from "../types";

interface OpponentAvatarProps {
  opponentId: string;
  expression: OpponentExpression;
  action: Direction | null;
  gameState: "idle" | "countdown" | "reveal" | "ended";
  role: "user_attack" | "user_defend";
}

export default function OpponentAvatar({
  opponentId,
  expression,
  action,
  gameState,
  role,
}: OpponentAvatarProps) {
  // Determine looking offset
  // Note: if AI is defending (look), they look. If AI is attacking (point), they point (maybe hand appears).
  let dx = 0;
  let dy = 0;
  if (gameState === "reveal") {
    if (action === "Left") {
      dx = -15;
    } else if (action === "Right") {
      dx = 15;
    } else if (action === "Up") {
      dy = -15;
    }
  }

  // Expression-based mouth and eyes renderers
  const renderEyesAndMouth = () => {
    switch (expression) {
      case "smiling":
        return (
          <>
            {/* Safe/Happy curved eyes */}
            <path
              d="M 25 35 Q 35 25 45 35"
              stroke="#1e293b"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 55 35 Q 65 25 75 35"
              stroke="#1e293b"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            {/* Big smiling mouth */}
            <path d="M 35 60 Q 50 75 65 60 Z" fill="#e11d48" stroke="#1e293b" strokeWidth="3" />
          </>
        );
      case "shocked":
        return (
          <>
            {/* Wide open circle eyes */}
            <circle cx="35" cy="35" r="7" fill="#1e293b" />
            <circle cx="65" cy="35" r="7" fill="#1e293b" />
            <circle cx="35" cy="35" r="10" stroke="#f43f5e" strokeWidth="2" fill="none" />
            <circle cx="65" cy="35" r="10" stroke="#f43f5e" strokeWidth="2" fill="none" />
            {/* Round gasp mouth */}
            <circle cx="50" cy="62" r="12" fill="#881337" stroke="#1e293b" strokeWidth="3" />
          </>
        );
      case "shouting":
        return (
          <>
            {/* Intent eyebrows and eyes */}
            <path d="M 22 24 L 42 30" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
            <path d="M 78 24 L 58 30" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
            <circle cx="35" cy="36" r="6" fill="#1e293b" />
            <circle cx="65" cy="36" r="6" fill="#1e293b" />
            {/* Wide screaming mouth */}
            <path d="M 30 55 Q 50 85 70 55 Z" fill="#9f1239" stroke="#1e293b" strokeWidth="4" />
          </>
        );
      case "smug":
        return (
          <>
            {/* Smug eyebrows, sly eyes */}
            <path d="M 22 23 Q 32 18 42 26" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 78 23 Q 68 18 58 26" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* Sleepy smug eyelids */}
            <path d="M 25 35 L 45 35" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
            <path d="M 55 35 L 75 35" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="35" cy="38" rx="4" ry="2" fill="#1e293b" />
            <ellipse cx="65" cy="38" rx="4" ry="2" fill="#1e293b" />
            {/* Smirk mouth */}
            <path d="M 40 60 Q 55 68 62 58" stroke="#1e293b" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        );
      case "crying":
        return (
          <>
            {/* Frown brows */}
            <path d="M 22 28 L 40 23" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            <path d="M 78 28 L 60 23" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            {/* Closed squinting eyes */}
            <path d="M 24 38 L 42 34" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
            <path d="M 76 38 L 58 34" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
            {/* Falling tears */}
            <path d="M 33 40 Q 30 55 33 65" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 67 40 Q 70 55 67 65" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* Wavy sad mouth */}
            <path d="M 40 62 Q 50 54 60 62" stroke="#1e293b" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        );
      case "neutral":
      default:
        return (
          <>
            {/* Warm neutral eyes */}
            <circle cx="35" cy="35" r="5" fill="#1e293b" />
            <circle cx="65" cy="35" r="5" fill="#1e293b" />
            {/* Cute simple smile */}
            <path d="M 42 58 Q 50 66 58 58" stroke="#1e293b" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        );
    }
  };

  return (
    <div className="relative flex items-center justify-center w-64 h-64 mx-auto md:w-80 md:h-80 select-none">
      {/* Dynamic Background Board Effect */}
      <div className="absolute inset-0 bg-radial from-slate-100 to-slate-200/50 rounded-full scale-95 border-4 border-slate-300 shadow-inner -z-10" />

      {/* Main SVG Avatar Container */}
      <svg
        id="opponent-avatar-svg"
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-lg transition-transform duration-300"
      >
        {/* DEFINE GRADIENTS */}
        <defs>
          <linearGradient id="skin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffedd5" />
            <stop offset="100%" stopColor="#fed7aa" />
          </linearGradient>
          <linearGradient id="hair-kim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="hair-jun" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="cap-jun" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="hair-hee" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="robo-body" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="robo-visor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e1e30" />
          </linearGradient>
          <linearGradient id="robo-circuit" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {/* CHARACTER 1: MIN-JUN (COCKY KID) */}
        {opponentId === "minjun" && (
          <g>
            {/* Ears */}
            <circle cx="15" cy="50" r="6" fill="#fed7aa" stroke="#1e293b" strokeWidth="2" />
            <circle cx="85" cy="50" r="6" fill="#fed7aa" stroke="#1e293b" strokeWidth="2" />

            {/* Neck & Shoulders */}
            <path d="M 35 75 L 35 85 L 65 85 L 65 75 Z" fill="#fed7aa" stroke="#1e293b" strokeWidth="2" />
            <path d="M 20 85 Q 50 78 80 85 L 82 98 L 18 98 Z" fill="#3b82f6" stroke="#1e293b" strokeWidth="2" />

            {/* Face base */}
            <circle cx="50" cy="50" r="32" fill="url(#skin)" stroke="#1e293b" strokeWidth="2.5" />

            {/* Shifting Face Group (Eyes, Mouth, Cheeks based on look) */}
            <g transform={`translate(${dx}, ${dy})`}>
              {/* Cute rose cheeks */}
              <circle cx="28" cy="46" r="4.5" fill="#f43f5e" opacity="0.3" />
              <circle cx="72" cy="46" r="4.5" fill="#f43f5e" opacity="0.3" />
              {renderEyesAndMouth()}
            </g>

            {/* Hair bangs (Doesn't shift as much, stays mostly bound) */}
            <path d="M 18 42 C 22 26, 78 26, 82 42 C 72 34, 28 34, 18 42" fill="url(#hair-jun)" />

            {/* Red Cap (Min-jun's signature style) */}
            <path d="M 17 38 Q 50 12 83 38 Q 80 34 20 34 Z" fill="url(#cap-jun)" stroke="#1e293b" strokeWidth="2" />
            <path d="M 19 32 Q 50 6 81 32 Z" fill="#ef4444" stroke="#1e293b" strokeWidth="2" />
            <circle cx="50" cy="8" r="3.5" fill="#facc15" stroke="#1e293b" strokeWidth="1.5" />
            {/* Cap Visor, slightly tilted */}
            <path d="M 12 36 Q 40 46 88 34 L 80 29 Q 40 38 15 29 Z" fill="#1e293b" />
          </g>
        )}

        {/* CHARACTER 2: JI-HEE (VARIETY SHOW MC) */}
        {opponentId === "jihee" && (
          <g>
            {/* Big cute hair back */}
            <circle cx="50" cy="46" r="36" fill="url(#hair-hee)" stroke="#1e293b" strokeWidth="2" />

            {/* Ears */}
            <circle cx="16" cy="52" r="5" fill="#fed7aa" stroke="#1e293b" strokeWidth="2" />
            <circle cx="84" cy="52" r="5" fill="#fed7aa" stroke="#1e293b" strokeWidth="2" />

            {/* Neck & Shoulders */}
            <path d="M 37 75 L 37 85 L 63 85 L 63 75 Z" fill="#fed7aa" stroke="#1e293b" strokeWidth="2" />
            {/* Colorful variety star hoodie costume */}
            <path d="M 22 85 Q 50 78 78 85 L 81 98 L 19 98 Z" fill="#ec4899" stroke="#1e293b" strokeWidth="2" />
            <path d="M 38 83 L 50 95 L 62 83 Z" fill="#fef08a" stroke="#1e293b" strokeWidth="1.5" />

            {/* Face base */}
            <circle cx="50" cy="50" r="30" fill="url(#skin)" stroke="#1e293b" strokeWidth="2.5" />

            {/* Shifting Head Elements */}
            <g transform={`translate(${dx}, ${dy})`}>
              {/* Star-themed cheek paint */}
              <polygon points="23,43 25,48 20,45 23,43" fill="#facc15" />
              <polygon points="77,43 75,48 80,45 77,43" fill="#facc15" />
              {renderEyesAndMouth()}
            </g>

            {/* Hype MC Headset */}
            <path d="M 17 50 Q 15 15 50 15 Q 85 15 83 50" fill="none" stroke="#2563eb" strokeWidth="4.5" strokeLinecap="round" />
            {/* Cyan Ear Pads for headset */}
            <rect x="10" y="42" width="10" height="16" rx="4" fill="#06b6d4" stroke="#1e293b" strokeWidth="2" />
            <rect x="80" y="42" width="10" height="16" rx="4" fill="#06b6d4" stroke="#1e293b" strokeWidth="2" />
            {/* Headset microphone stick going to mouth */}
            <path d="M 18 52 Q 28 66 38 60" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            <circle cx="39" cy="59" r="3" fill="#ec4899" stroke="#1e293b" strokeWidth="2.5" />

            {/* Front beautiful hair bangs */}
            <path d="M 20 40 C 25 24, 75 24, 80 40 C 70 32, 50 34, 50 42 C 50 34, 30 32, 20 40" fill="url(#hair-hee)" />
          </g>
        )}

        {/* CHARACTER 3: MASTER KIM (ZEN MASTER) */}
        {opponentId === "master_kim" && (
          <g>
            {/* Shoulders with traditional brown robes */}
            <path d="M 36 75 L 36 84 L 64 84 L 64 75 Z" fill="#fed7aa" stroke="#1e293b" strokeWidth="2" />
            <path d="M 18 84 Q 50 78 82 84 L 84 98 L 16 98 Z" fill="#78350f" stroke="#1e293b" strokeWidth="2" />
            <path d="M 32 84 L 50 98 L 68 84 Z" fill="#d97706" />

            {/* Bald head shadow back */}
            <circle cx="50" cy="46" r="30" fill="#e2e8f0" />

            {/* Face base */}
            <circle cx="50" cy="48" r="28" fill="url(#skin)" stroke="#1e293b" strokeWidth="2.5" />

            {/* Wispy gray side hair */}
            <path d="M 21 44 Q 15 60 17 65 Q 23 60 25 46 Z" fill="url(#hair-kim)" stroke="#1e293b" strokeWidth="1.5" />
            <path d="M 79 44 Q 85 60 83 65 Q 77 60 75 46 Z" fill="url(#hair-kim)" stroke="#1e293b" strokeWidth="1.5" />

            {/* Shifting face features */}
            <g transform={`translate(${dx}, ${dy})`}>
              {/* Wise round wire-frame spectacles */}
              <circle cx="36" cy="38" r="9" fill="none" stroke="#d97706" strokeWidth="3" opacity="0.8" />
              <circle cx="64" cy="38" r="9" fill="none" stroke="#d97706" strokeWidth="3" opacity="0.8" />
              <line x1="45" y1="38" x2="55" y2="38" stroke="#d97706" strokeWidth="3" />

              {/* Eyes & Mouth */}
              {renderEyesAndMouth()}

              {/* Master's huge fluffy gray beard */}
              <path d="M 30 54 Q 50 94 70 54 C 60 76, 40 76, 30 54 Z" fill="url(#hair-kim)" stroke="#1e293b" strokeWidth="1.5" />
              {/* Cute white eyebrows */}
              <path d="M 24 22 Q 35 14 44 26" stroke="#f1f5f9" strokeWidth="4.5" fill="none" strokeLinecap="round" />
              <path d="M 76 22 Q 65 14 56 26" stroke="#f1f5f9" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            </g>
          </g>
        )}

        {/* CHARACTER 4: CHAM-BOT 3000 (ROBOT) */}
        {opponentId === "robo_cham" && (
          <g>
            {/* Robo Neck & Collar Plates */}
            <rect x="42" y="70" width="16" height="15" rx="3" fill="url(#robo-body)" stroke="#1e293b" strokeWidth="2" />
            <line x1="45" y1="77.5" x2="55" y2="77.5" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
            <path d="M 38 76 L 62 76 Q 66 83 72 85 Q 50 82 28 85 Q 34 83 38 76" fill="#475569" stroke="#1e293b" strokeWidth="2" />

            {/* Robo Shoulders / Armor chestplates */}
            <path d="M 22 84 Q 50 75 78 84 L 81 98 L 19 98 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="2.5" />
            <path d="M 23 88 C 40 82, 60 82, 77 88 L 79 97 L 21 97 Z" fill="#334155" stroke="url(#robo-circuit)" strokeWidth="1.5" />
            
            {/* Left and Right futuristic audio-sensor antennae ears with glowing pink tips */}
            <g>
              {/* Left Antenna */}
              <rect x="13" y="40" width="5" height="16" rx="2" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="15.5" y1="40" x2="15.5" y2="24" stroke="#cbd5e1" strokeWidth="2" />
              <circle cx="15.5" cy="22" r="3" fill="#f43f5e" />

              {/* Right Antenna */}
              <rect x="82" y="40" width="5" height="16" rx="2" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
              <line x1="84.5" y1="40" x2="84.5" y2="24" stroke="#cbd5e1" strokeWidth="2" />
              <circle cx="84.5" cy="22" r="3" fill="#f43f5e" />
            </g>

            {/* Futuristic Head Frame */}
            <polygon points="20,44 26,24 50,18 74,24 80,44 72,68 50,73 28,68" fill="url(#robo-body)" stroke="#1e293b" strokeWidth="3.5" />
            
            {/* Visor Bezel Shield Frame */}
            <polygon points="24,42 29,28 50,23 71,28 76,42 69,63 50,67 31,63" fill="url(#robo-visor)" stroke="#0f172a" strokeWidth="2" />

            {/* Metallic top rivet / bolt Details */}
            <circle cx="34" cy="22" r="1.5" fill="#64748b" />
            <circle cx="66" cy="22" r="1.5" fill="#64748b" />

            {/* Glowing Face Matrix Inside shifting group */}
            <g transform={`translate(${dx}, ${dy})`}>
              {expression === "smiling" && (
                <>
                  <path d="M 30 38 Q 35 28 40 38" fill="none" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M 60 38 Q 65 28 70 38" fill="none" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M 42 54 Q 50 62 58 54" fill="none" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
                </>
              )}
              {expression === "shocked" && (
                <>
                  <circle cx="35" cy="36" r="5" fill="none" stroke="#facc15" strokeWidth="3" />
                  <circle cx="65" cy="36" r="5" fill="none" stroke="#facc15" strokeWidth="3" />
                  <circle cx="50" cy="53" r="7" fill="none" stroke="#facc15" strokeWidth="3" />
                </>
              )}
              {expression === "shouting" && (
                <>
                  <path d="M 29 32 L 39 38 M 29 44 L 39 38" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                  <path d="M 71 32 L 61 38 M 71 44 L 61 38" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                  <path d="M 38 52 L 41 47 L 45 54 L 48 45 L 52 54 L 56 47 L 59 52 Q 50 58 38 52" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                </>
              )}
              {expression === "smug" && (
                <>
                  <path d="M 30 35 Q 35 31 40 35" fill="none" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M 60 35 Q 65 31 70 35" fill="none" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M 40 53 Q 55 45 61 53" fill="none" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" />
                </>
              )}
              {expression === "crying" && (
                <>
                  <path d="M 29 34 L 39 42 M 39 34 L 29 42" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
                  <path d="M 61 34 L 71 42 M 71 34 L 61 42" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
                  <path d="M 42 55 Q 50 49 58 55" fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="34" y1="44" x2="34" y2="59" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="3,3" />
                  <line x1="66" y1="44" x2="66" y2="59" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="3,3" />
                </>
              )}
              {expression === "neutral" && (
                <>
                  <line x1="30" y1="36" x2="40" y2="36" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="60" y1="36" x2="70" y2="36" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="42" y1="52" x2="58" y2="52" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
                </>
              )}
            </g>
          </g>
        )}

        {/* AI ATTACK TONGKAT / HAND POINTER IN REVEAL STATE (Only if user_defend and point is decided) */}
        {gameState === "reveal" && role === "user_defend" && action && (
          <g>
            {/* Draw pointing hand/glove pointing Left, Right, or Up */}
            {action === "Left" && (
              <g transform="translate(10, 60) scale(0.65)">
                <circle cx="20" cy="20" r="16" fill="#facc15" stroke="#1e293b" strokeWidth="2" />
                {/* Pointer finger */}
                <path d="M 12 14 L -20 10 L -20 22 L 12 26 Z" fill="#eb5a3c" stroke="#1e293b" strokeWidth="2" />
                {/* Visual motion speed sparks */}
                <line x1="-28" y1="4" x2="-38" y2="4" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="-30" y1="16" x2="-44" y2="16" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                <line x1="-28" y1="28" x2="-38" y2="28" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" />
              </g>
            )}
            {action === "Right" && (
              <g transform="translate(64, 60) scale(0.65)">
                <circle cx="20" cy="20" r="16" fill="#facc15" stroke="#1e293b" strokeWidth="2" />
                {/* Pointer finger */}
                <path d="M 28 14 L 60 10 L 60 22 L 28 26 Z" fill="#eb5a3c" stroke="#1e293b" strokeWidth="2" />
                {/* Visual speed sparks */}
                <line x1="68" y1="4" x2="78" y2="4" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="70" y1="16" x2="84" y2="16" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                <line x1="68" y1="28" x2="78" y2="28" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" />
              </g>
            )}
            {action === "Up" && (
              <g transform="translate(36, 15) scale(0.65)">
                <circle cx="20" cy="20" r="16" fill="#facc15" stroke="#1e293b" strokeWidth="2" />
                {/* Pointer finger */}
                <path d="M 14 12 L 10 -20 L 22 -20 L 26 12 Z" fill="#eb5a3c" stroke="#1e293b" strokeWidth="2" />
                {/* Visual speed sparks */}
                <line x1="4" y1="-28" x2="4" y2="-38" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="16" y1="-30" x2="16" y2="-44" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                <line x1="28" y1="-28" x2="28" y2="-38" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" />
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
