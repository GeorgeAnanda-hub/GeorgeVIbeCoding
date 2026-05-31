import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Direction, Opponent, PlayRole, OpponentExpression, RoundWinner, PlayHistoryItem } from "../types";
import { AlertCircle, Camera, Keyboard, RotateCcw, HelpCircle, ArrowLeft, ArrowUp, ArrowRight, Play, Loader2, Sparkles, Trophy, Hand, Brain, Cpu, X } from "lucide-react";
import OpponentAvatar from "./OpponentAvatar";
import { playTickSound, playSwipeSound, playWinSound, playLossSound, playDrawSound, speakText, speakTextWithTTS, cancelTTS, registerSpeechListener } from "../utils/audio";

interface GameScreenProps {
  opponent: Opponent;
  currentRole: PlayRole;
  userScore: number;
  aiScore: number;
  maxScore: number;
  roundCount: number;
  history?: PlayHistoryItem[];
  onRoundComplete: (result: {
    userAction: Direction;
    aiAction: Direction;
    winner: RoundWinner;
    commentary: string;
    refereeMessage: string;
    opponentExpression: OpponentExpression;
    snapshot?: string;
  }) => void;
  onExit: () => void;
  onResetGame: () => void;
  playerName: string;
}

export default function GameScreen({
  opponent,
  currentRole,
  userScore,
  aiScore,
  maxScore,
  roundCount,
  history = [],
  onRoundComplete,
  onExit,
  onResetGame,
  playerName,
}: GameScreenProps) {
  const [useCamera, setUseCamera] = useState<boolean>(true);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Match statistics calculations computed from total game play history
  const userAttackRounds = history.filter((h) => h.role === "user_attack");
  const totalUserAttacks = userAttackRounds.length;
  const successfulUserAttacks = userAttackRounds.filter((h) => h.winner === "user").length;
  const attackAccuracy = totalUserAttacks > 0 ? Math.round((successfulUserAttacks / totalUserAttacks) * 100) : 0;

  const userDefendRounds = history.filter((h) => h.role === "user_defend");
  const totalUserDefends = userDefendRounds.length;
  const successfulUserDefends = userDefendRounds.filter((h) => h.winner !== "ai" && h.winner !== "none" ? true : h.winner === "none").length; // success is keeping safe
  const dodgeRate = totalUserDefends > 0 ? Math.round((successfulUserDefends / totalUserDefends) * 100) : 0;

  const directionCounts = { Left: 0, Right: 0, Up: 0 };
  history.forEach((h) => {
    if (h.userAction === "Left" || h.userAction === "Right" || h.userAction === "Up") {
      directionCounts[h.userAction as Direction]++;
    }
  });
  let maxDir: Direction = "Up";
  if (directionCounts.Left >= directionCounts.Right && directionCounts.Left >= directionCounts.Up) {
    maxDir = "Left";
  } else if (directionCounts.Right >= directionCounts.Left && directionCounts.Right >= directionCounts.Up) {
    maxDir = "Right";
  }
  const favoriteDirectionLabel = maxDir === "Left" ? "KIRI" : maxDir === "Right" ? "KANAN" : "ATAS";
  
  // Gameplay states
  const [gamePhase, setGamePhase] = useState<"idle" | "countdown" | "refereeing" | "match_ended">("idle");
  const isMatchEndedRef = useRef<boolean>(false);
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [aiAction, setAiAction] = useState<Direction | null>(null);
  const [userAction, setUserAction] = useState<Direction | null>(null);
  const [lastRoundSnapshot, setLastRoundSnapshot] = useState<string | null>(null);
  const [showRoundSplash, setShowRoundSplash] = useState<boolean>(true);

  useEffect(() => {
    setShowRoundSplash(true);
    const timer = setTimeout(() => {
      setShowRoundSplash(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [roundCount]);

  // visual results
  const [currExpression, setCurrExpression] = useState<OpponentExpression>("neutral");
  const [refereeText, setRefereeText] = useState<string>("");
  const [commentaryText, setCommentaryText] = useState<string>(
    `Hei! Siap kalah? Aku ${opponent.name} tidak akan memberimu ampun!`
  );

  // Subtitle & Model Info popup states
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [isModelInfoOpen, setIsModelInfoOpen] = useState<boolean>(false);

  // Particles state for fireworks
  interface FireworkParticle {
    id: number;
    cx: string;
    cy: string;
    color: string;
    angle: number;
    distance: number;
    size: number;
    delay: number;
  }
  const [particles, setParticles] = useState<FireworkParticle[]>([]);

  const triggerFireworks = () => {
    const centers = [
      { cx: "25vw", cy: "45vh" },
      { cx: "50vw", cy: "35vh" },
      { cx: "75vw", cy: "45vh" },
    ];
    
    const newParticles = centers.flatMap((center, cIdx) => 
      Array.from({ length: 24 }).map((_, i) => ({
        id: Date.now() + cIdx * 100 + i,
        cx: center.cx,
        cy: center.cy,
        color: ["#ec4899", "#22d3ee", "#eab308", "#10b981", "#a855f7", "#f97316", "#38bdf8", "#f43f5e"][Math.floor(Math.random() * 8)],
        angle: Math.random() * 360,
        distance: 50 + Math.random() * 160,
        size: 3 + Math.random() * 6,
        delay: cIdx * 0.12 + Math.random() * 0.08, // staggered launch
      }))
    );
    
    setParticles(newParticles);
    // Auto-clean
    setTimeout(() => {
      setParticles([]);
    }, 2500);
  };

  useEffect(() => {
    registerSpeechListener((text) => {
      setActiveSubtitle(text);
    });
    return () => {
      registerSpeechListener(() => {});
    };
  }, []);

  useEffect(() => {
    if (commentaryText) {
      speakTextWithTTS(commentaryText, opponent.id);
    }
    return () => {
      cancelTTS();
    };
  }, [commentaryText, opponent.id]);

  // --- BRAIN MACHINE LEARNING MODELS SYSTEM STATES ---
  const [userMoveHistory, setUserMoveHistory] = useState<Direction[]>(() => {
    try {
      const saved = localStorage.getItem("cham_user_move_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [livePredictions, setLivePredictions] = useState<Record<Direction, number>>({ Left: 0.33, Right: 0.33, Up: 0.33 });

  // Model 1: Min-jun's Markov Chain Transition matrix
  const [markovMatrix, setMarkovMatrix] = useState<Record<Direction, Record<Direction, number>>>(() => {
    try {
      const saved = localStorage.getItem("cham_markov_matrix");
      return saved ? JSON.parse(saved) : {
        Left: { Left: 1, Right: 1, Up: 1 },
        Right: { Left: 1, Right: 1, Up: 1 },
        Up: { Left: 1, Right: 1, Up: 1 }
      };
    } catch {
      return {
        Left: { Left: 1, Right: 1, Up: 1 },
        Right: { Left: 1, Right: 1, Up: 1 },
        Up: { Left: 1, Right: 1, Up: 1 }
      };
    }
  });

  // Model 2: Ji-hee's Feedforward Neural Network Weights (MLP backprop offline model)
  const [mlpWeights, setMlpWeights] = useState<{
    w1: number[][]; // shape 4x6 (hidden x input)
    b1: number[];   // bias hidden size 4
    w2: number[][]; // shape 3x4 (output x hidden)
    b2: number[];   // bias output size 3
  }>(() => {
    try {
      const saved = localStorage.getItem("cham_mlp_weights");
      if (saved) return JSON.parse(saved);
    } catch {}
    const randomMatrix = (rows: number, cols: number) =>
      Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() - 0.5) * 0.4));
    const randomArray = (size: number) => Array.from({ length: size }, () => (Math.random() - 0.5) * 0.4);
    return {
      w1: randomMatrix(4, 6),
      b1: randomArray(4),
      w2: randomMatrix(3, 4),
      b2: randomArray(3)
    };
  });

  // Model 3: Master Kim's Reinforcement Q-Table Agent
  const [qTable, setQTable] = useState<Record<string, Record<Direction, number>>>(() => {
    try {
      const saved = localStorage.getItem("cham_q_table");
      return saved ? JSON.parse(saved) : {
        None: { Left: 0, Right: 0, Up: 0 },
        Left: { Left: 0, Right: 0, Up: 0 },
        Right: { Left: 0, Right: 0, Up: 0 },
        Up: { Left: 0, Right: 0, Up: 0 }
      };
    } catch {
      return {
        None: { Left: 0, Right: 0, Up: 0 },
        Left: { Left: 0, Right: 0, Up: 0 },
        Right: { Left: 0, Right: 0, Up: 0 },
        Up: { Left: 0, Right: 0, Up: 0 }
      };
    }
  });

  // Automatically save ML matrices and parameters to localStorage whenever they update!
  useEffect(() => {
    localStorage.setItem("cham_user_move_history", JSON.stringify(userMoveHistory));
  }, [userMoveHistory]);

  useEffect(() => {
    localStorage.setItem("cham_markov_matrix", JSON.stringify(markovMatrix));
  }, [markovMatrix]);

  useEffect(() => {
    localStorage.setItem("cham_mlp_weights", JSON.stringify(mlpWeights));
  }, [mlpWeights]);

  useEffect(() => {
    localStorage.setItem("cham_q_table", JSON.stringify(qTable));
  }, [qTable]);

  // Manual ML memory wipe trigger function
  const resetAllMlBrains = () => {
    localStorage.removeItem("cham_user_move_history");
    localStorage.removeItem("cham_markov_matrix");
    localStorage.removeItem("cham_mlp_weights");
    localStorage.removeItem("cham_q_table");

    setUserMoveHistory([]);
    setMarkovMatrix({
      Left: { Left: 1, Right: 1, Up: 1 },
      Right: { Left: 1, Right: 1, Up: 1 },
      Up: { Left: 1, Right: 1, Up: 1 }
    });
    const randomMatrix = (rows: number, cols: number) =>
      Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() - 0.5) * 0.4));
    const randomArray = (size: number) => Array.from({ length: size }, () => (Math.random() - 0.5) * 0.4);
    setMlpWeights({
      w1: randomMatrix(4, 6),
      b1: randomArray(4),
      w2: randomMatrix(3, 4),
      b2: randomArray(3)
    });
    setQTable({
      None: { Left: 0, Right: 0, Up: 0 },
      Left: { Left: 0, Right: 0, Up: 0 },
      Right: { Left: 0, Right: 0, Up: 0 },
      Up: { Left: 0, Right: 0, Up: 0 }
    });
  };

  // Model Engine Prediction core logic
  const getAiPredictionAndChoice = (): {
    predictionProbs: Record<Direction, number>;
    chosenAction: Direction;
  } => {
    const directions: Direction[] = ["Left", "Right", "Up"];
    const lastUserAction = userMoveHistory[userMoveHistory.length - 1] || null;
    const secondLastUserAction = userMoveHistory[userMoveHistory.length - 2] || null;

    let probs: Record<Direction, number> = { Left: 0.33, Right: 0.33, Up: 0.33 };

    if (opponent.id === "minjun") {
      // Min-jun (Markov Chain state transitions)
      if (lastUserAction) {
        const row = markovMatrix[lastUserAction];
        const total = (row.Left || 1) + (row.Right || 1) + (row.Up || 1);
        probs = {
          Left: (row.Left || 1) / total,
          Right: (row.Right || 1) / total,
          Up: (row.Up || 1) / total
        };
      } else {
        probs = { Left: 0.33, Right: 0.33, Up: 0.34 };
      }
    } else if (opponent.id === "jihee") {
      // Ji-hee (Light Neural Network Perceptron)
      const encodeAction = (act: Direction | null): number[] => {
        if (act === "Left") return [1, 0, 0];
        if (act === "Right") return [0, 1, 0];
        if (act === "Up") return [0, 0, 1];
        return [0.33, 0.33, 0.33];
      };
      const x = [...encodeAction(lastUserAction), ...encodeAction(secondLastUserAction)];

      // Hidden forward: ReLU
      const hiddenInputs = mlpWeights.b1.map((b, i) => {
        let val = b;
        for (let j = 0; j < x.length; j++) {
          val += mlpWeights.w1[i][j] * x[j];
        }
        return val;
      });
      const hiddenActs = hiddenInputs.map(val => Math.max(0, val));

      // Output forward: Softmax
      const outInputs = mlpWeights.b2.map((b, i) => {
        let val = b;
        for (let j = 0; j < hiddenActs.length; j++) {
          val += mlpWeights.w2[i][j] * hiddenActs[j];
        }
        return val;
      });
      const expOut = outInputs.map(v => Math.exp(Math.min(8, Math.max(-8, v))));
      const sumExp = expOut.reduce((sum, e) => sum + e, 0.0001);
      probs = {
        Left: expOut[0] / sumExp,
        Right: expOut[1] / sumExp,
        Up: expOut[2] / sumExp
      };
    } else {
      // Master Kim (Reinforcement Learning Q-Table representation)
      const stateKey = lastUserAction || "None";
      const qRow = qTable[stateKey];
      const qArr = [qRow.Left, qRow.Right, qRow.Up];
      const minQ = Math.min(...qArr);
      const shiftQ = qArr.map(q => q - minQ + 0.5);
      const sumQ = shiftQ.reduce((s, x) => s + x, 0.0001);
      probs = {
        Left: shiftQ[0] / sumQ,
        Right: shiftQ[1] / sumQ,
        Up: shiftQ[2] / sumQ
      };
    }

    // Determine chosen direction based on probabilities
    let chosenAction: Direction = "Up";

    if (opponent.id === "master_kim") {
      const stateKey = lastUserAction || "None";
      if (Math.random() < 0.15) {
        chosenAction = directions[Math.floor(Math.random() * directions.length)];
      } else {
        const qRow = qTable[stateKey];
        if (currentRole === "user_defend") {
          // AI is attacking! Match user's expected location
          let bestAct: Direction = "Up";
          let highestVal = -Infinity;
          directions.forEach(d => {
            if (qRow[d] > highestVal) {
              highestVal = qRow[d];
              bestAct = d;
            }
          });
          chosenAction = bestAct;
        } else {
          // AI is defending! Avoid matching user
          let safestAct: Direction = "Up";
          let lowestVal = Infinity;
          directions.forEach(d => {
            if (qRow[d] < lowestVal) {
              lowestVal = qRow[d];
              safestAct = d;
            }
          });
          chosenAction = safestAct;
        }
      }
    } else {
      if (currentRole === "user_defend") {
        // AI is attacking! Let's choose the direction the user is MOST likely to look
        let maxP = -1;
        directions.forEach(d => {
          if (probs[d] > maxP) {
            maxP = probs[d];
            chosenAction = d;
          }
        });
      } else {
        // AI is defending! Let's choose the direction the user is LEAST likely to point
        let minP = Infinity;
        directions.forEach(d => {
          if (probs[d] < minP) {
            minP = probs[d];
            chosenAction = d;
          }
        });
      }
    }

    if (!chosenAction || !directions.includes(chosenAction)) {
      chosenAction = directions[Math.floor(Math.random() * directions.length)];
    }

    return { predictionProbs: probs, chosenAction };
  };

  // Online model update
  const updateMlModels = (userDirection: Direction, actualWinner: RoundWinner, aiDirection: Direction) => {
    const historyCopy = [...userMoveHistory, userDirection];
    setUserMoveHistory(historyCopy);

    const prevUserAction = userMoveHistory[userMoveHistory.length - 1] || null;

    // 1. Update Min-jun's Markov Matrix
    if (opponent.id === "minjun" && prevUserAction) {
      setMarkovMatrix(prev => {
        const nextRow = { ...prev[prevUserAction] };
        nextRow[userDirection] = (nextRow[userDirection] || 0) + 1;
        return {
          ...prev,
          [prevUserAction]: nextRow
        };
      });
    }

    // 2. Update Ji-hee's Neural Weights
    if (opponent.id === "jihee") {
      const lastAct = prevUserAction;
      const secondLastAct = userMoveHistory[userMoveHistory.length - 2] || null;

      const encodeAction = (act: Direction | null): number[] => {
        if (act === "Left") return [1, 0, 0];
        if (act === "Right") return [0, 1, 0];
        if (act === "Up") return [0, 0, 1];
        return [0.33, 0.33, 0.33];
      };
      const x = [...encodeAction(lastAct), ...encodeAction(secondLastAct)];

      const hiddenInputs = mlpWeights.b1.map((b, i) => {
        let val = b;
        for (let j = 0; j < x.length; j++) {
          val += mlpWeights.w1[i][j] * x[j];
        }
        return val;
      });
      const hiddenActs = hiddenInputs.map(val => Math.max(0, val));

      const outInputs = mlpWeights.b2.map((b, i) => {
        let val = b;
        for (let j = 0; j < hiddenActs.length; j++) {
          val += mlpWeights.w2[i][j] * hiddenActs[j];
        }
        return val;
      });
      const expOut = outInputs.map(v => Math.exp(Math.min(8, Math.max(-8, v))));
      const sumExp = expOut.reduce((sum, e) => sum + e, 0.0001);
      const outActs = expOut.map(e => e / sumExp);

      const y = [
        userDirection === "Left" ? 1 : 0,
        userDirection === "Right" ? 1 : 0,
        userDirection === "Up" ? 1 : 0
      ];

      const lr = 0.25;
      const dZ2 = outActs.map((act, i) => act - y[i]);
      const dW2 = dZ2.map(dz => hiddenActs.map(ha => dz * ha));
      const dB2 = dZ2;

      const dZ1 = hiddenInputs.map((val, i) => {
        if (val <= 0) return 0;
        let errorSum = 0;
        for (let j = 0; j < 3; j++) {
          errorSum += mlpWeights.w2[j][i] * dZ2[j];
        }
        return errorSum;
      });
      const dW1 = dZ1.map(dz => x.map(xv => dz * xv));
      const dB1 = dZ1;

      setMlpWeights(prev => ({
        w2: prev.w2.map((row, i) => row.map((w, j) => w - lr * dW2[i][j])),
        b2: prev.b2.map((b, i) => b - lr * dB2[i]),
        w1: prev.w1.map((row, i) => row.map((w, j) => w - lr * dW1[i][j])),
        b1: prev.b1.map((b, i) => b - lr * dB1[i])
      }));
    }

    // 3. Update Master Kim's QTable
    if (opponent.id === "master_kim") {
      const stateKey = prevUserAction || "None";
      const reward = actualWinner === "ai" ? 12 : actualWinner === "user" ? -12 : -1.5;
      const alpha = 0.3;
      const gamma = 0.82;

      const nextStateKey = userDirection;

      setQTable(prev => {
        const currentQValue = prev[stateKey]?.[aiDirection] || 0;
        const nextQRow = prev[nextStateKey] || { Left: 0, Right: 0, Up: 0 };
        const maxNextQ = Math.max(nextQRow.Left, nextQRow.Right, nextQRow.Up);

        const newQValue = currentQValue + alpha * (reward + gamma * maxNextQ - currentQValue);

        return {
          ...prev,
          [stateKey]: {
            ...prev[stateKey],
            [aiDirection]: newQValue
          }
        };
      });
    }
  };

  // React effect to update live prediction display for next round
  useEffect(() => {
    if (gamePhase === "idle") {
      const { predictionProbs } = getAiPredictionAndChoice();
      setLivePredictions(predictionProbs);
    }
  }, [gamePhase, userMoveHistory, opponent.id, markovMatrix, mlpWeights, qTable]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [liveFaceDirection, setLiveFaceDirection] = useState<Direction | "Center" | "None">("None");
  const [liveHandDirection, setLiveHandDirection] = useState<Direction | "None">("None");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackingLoopRef = useRef<number | null>(null);
  const handsObjRef = useRef<any>(null);
  const facesObjRef = useRef<any>(null);

  // Auto-triggering Peace gesture state and synchronization Refs
  const [peaceProgress, setPeaceProgress] = useState<number>(0);
  const consecutivePeaceFramesRef = useRef<number>(0);
  const lastValidDetectionDuringPrepRef = useRef<Direction | null>(null);

  const gamePhaseRef = useRef(gamePhase);
  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  const streamActiveRef = useRef(streamActive);
  useEffect(() => {
    streamActiveRef.current = streamActive;
  }, [streamActive]);

  const triggerPlayRoundRef = useRef<any>(null);

  // Script Loader for MediaPipe CDNs (Hands, Face Mesh, Utilities)
  useEffect(() => {
    if (!useCamera) return;

    let active = true;

    async function loadMediaPipe() {
      if ((window as any).Hands && (window as any).FaceMesh && (window as any).drawConnectors) {
        if (active) {
          setModelsLoaded(true);
        }
        return;
      }

      if (isModelLoading) return;
      setIsModelLoading(true);

      const scripts = [
        "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
        "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
        "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js",
        "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
      ];

      try {
        for (const src of scripts) {
          let script = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;
          if (!script) {
            script = document.createElement("script");
            script.src = src;
            script.crossOrigin = "anonymous";
            script.async = false;
            document.head.appendChild(script);
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = reject;
            });
          } else {
            if (!script.dataset.loaded) {
              await new Promise((resolve) => {
                script.addEventListener("load", resolve, { once: true });
              });
            }
          }
          script.dataset.loaded = "true";
        }

        if (active) {
          setModelsLoaded(true);
          setIsModelLoading(false);
        }
      } catch (err) {
        console.error("Gagal memuat pustaka MediaPipe:", err);
        setIsModelLoading(false);
      }
    }

    loadMediaPipe();

    return () => {
      active = false;
    };
  }, [useCamera]);

  // Keep track of the current role with a ref to avoid recreating the whole pipeline on swap
  const currentRoleRef = useRef(currentRole);
  useEffect(() => {
    currentRoleRef.current = currentRole;
  }, [currentRole]);

  // Real-time tracker pipeline loop
  useEffect(() => {
    if (!useCamera || !streamActive || !modelsLoaded) {
      if (trackingLoopRef.current) {
        cancelAnimationFrame(trackingLoopRef.current);
        trackingLoopRef.current = null;
      }
      setLiveFaceDirection("None");
      setLiveHandDirection("None");
      return;
    }

    const HandsClass = (window as any).Hands;
    const FaceMeshClass = (window as any).FaceMesh;

    if (!HandsClass || !FaceMeshClass) return;

    const hands = new HandsClass({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0, // 0 = Lite (highly optimized for older laptops)
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    const faceMesh = new FaceMeshClass({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false, // Disabling refinement makes FaceMesh run significantly lighter
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    handsObjRef.current = hands;
    facesObjRef.current = faceMesh;

    let latestHandResults: any = null;
    let latestFaceResults: any = null;

    hands.onResults((results: any) => {
      latestHandResults = results;
      
      // Calculate real-time pointing direction
      if (results && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const wrist = landmarks[0];
        const indexTip = landmarks[8];
        if (wrist && indexTip) {
          const dx = indexTip.x - wrist.x;
          const dy = indexTip.y - wrist.y;

          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          // We improve pointing classification:
          // Left/Right should not falsely jump to "Up" with a tiny diagonal elevation.
          let detectedDir: Direction | "None" = "None";

          if (absDx < 0.08 && absDy < 0.08) {
            detectedDir = "None";
          } else {
            // Dominant vertical upward direction requires steep slope
            if (dy < -0.10 && absDy > 1.35 * absDx) {
              detectedDir = "Up";
            } else {
              // Otherwise, we perform horizontal classification if there is sufficient x offset
              if (dx < -0.09) {
                detectedDir = "Right";
              } else if (dx > 0.09) {
                detectedDir = "Left";
              } else if (dy < -0.10) {
                detectedDir = "Up";
              } else {
                detectedDir = "None";
              }
            }
          }

          setLiveHandDirection(detectedDir);

          // If countdown is active and a valid direction is detected, record it!
          if (gamePhaseRef.current === "countdown" && detectedDir !== "None") {
            lastValidDetectionDuringPrepRef.current = detectedDir as Direction;
          }
        }

        // Auto-Trigger check: Evaluate Peace Sign Gesture ✌️
        const l8 = landmarks[8];
        const l6 = landmarks[6];
        const l12 = landmarks[12];
        const l10 = landmarks[10];
        const l16 = landmarks[16];
        const l14 = landmarks[14];
        const l20 = landmarks[20];
        const l18 = landmarks[18];

        if (l8 && l6 && l12 && l10 && l16 && l14 && l20 && l18) {
          const isIndexOpen = l8.y < l6.y;
          const isMiddleOpen = l12.y < l10.y;
          const isRingClosed = l16.y > l14.y;
          const isPinkyClosed = l20.y > l18.y;

          if (isIndexOpen && isMiddleOpen && isRingClosed && isPinkyClosed) {
            consecutivePeaceFramesRef.current = (consecutivePeaceFramesRef.current || 0) + 1;
            const progress = Math.min(100, Math.floor((consecutivePeaceFramesRef.current / 7) * 100));
            setPeaceProgress(progress);

            if (consecutivePeaceFramesRef.current >= 7) {
              setPeaceProgress(0);
              consecutivePeaceFramesRef.current = -30; // Locking cooling down (approx 2-3 seconds)
              if (gamePhaseRef.current === "idle" && streamActiveRef.current) {
                if (triggerPlayRoundRef.current) {
                  triggerPlayRoundRef.current();
                }
              }
            }
          } else {
            if (consecutivePeaceFramesRef.current < 0) {
              // Cooling down phase
              consecutivePeaceFramesRef.current += 1;
              setPeaceProgress(0);
            } else {
              consecutivePeaceFramesRef.current = Math.max(0, consecutivePeaceFramesRef.current - 1);
              const progress = Math.min(100, Math.floor((consecutivePeaceFramesRef.current / 7) * 100));
              setPeaceProgress(progress);
            }
          }
        }
      } else {
        setLiveHandDirection("None");
        if (consecutivePeaceFramesRef.current < 0) {
          consecutivePeaceFramesRef.current += 1;
          setPeaceProgress(0);
        } else {
          consecutivePeaceFramesRef.current = Math.max(0, consecutivePeaceFramesRef.current - 1);
          const progress = Math.min(100, Math.floor((consecutivePeaceFramesRef.current / 7) * 100));
          setPeaceProgress(progress);
        }
      }
    });

    faceMesh.onResults((results: any) => {
      latestFaceResults = results;

      // Calculate real-time head-turn direction
      if (results && results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        const nose = landmarks[4];
        const left = landmarks[234];
        const right = landmarks[454];
        const top = landmarks[10];
        const bottom = landmarks[152];

        if (nose && left && right && top && bottom) {
          const dLeft = Math.abs(nose.x - left.x);
          const dRight = Math.abs(nose.x - right.x);
          const horizontalRatio = dLeft / (dLeft + dRight);

          const dTop = Math.abs(nose.y - top.y);
          const dBottom = Math.abs(nose.y - bottom.y);
          const verticalRatio = dTop / (dTop + dBottom);

          // Calibrated thresholds
          let detectedDir: Direction | "Center" = "Center";
          if (horizontalRatio < 0.40) {
            detectedDir = "Right";
          } else if (horizontalRatio > 0.60) {
            detectedDir = "Left";
          } else if (verticalRatio < 0.42) {
            detectedDir = "Up";
          } else {
            detectedDir = "Center";
          }

          setLiveFaceDirection(detectedDir);

          // If countdown is active and a valid direction is detected, record it!
          if (gamePhaseRef.current === "countdown" && detectedDir !== "Center") {
            lastValidDetectionDuringPrepRef.current = detectedDir as Direction;
          }
        }
      } else {
        setLiveFaceDirection("None");
      }
    });

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;

    if (!videoElement) return;

    let isProcessing = false;
    let lastProcessedTime = 0;
    let frameToggle = 0;

    const tick = async () => {
      if (!videoElement || videoElement.paused || videoElement.ended) {
        trackingLoopRef.current = requestAnimationFrame(tick);
        return;
      }

      // Draw overlay frame at full screen frequency (for absolute smoothness)
      if (canvasElement) {
        if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
          canvasElement.width = videoElement.videoWidth || 320;
          canvasElement.height = videoElement.videoHeight || 240;
        }

        const ctx = canvasElement.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

          const drawConnectors = (window as any).drawConnectors;
          const drawLandmarks = (window as any).drawLandmarks;
          const HAND_CONNECTIONS = (window as any).HAND_CONNECTIONS;
          const FACEMESH_TESSELATION = (window as any).FACEMESH_TESSELATION;

          const role = currentRoleRef.current;

          // Only draw face mesh if currently defending
          if (role === "user_defend" && latestFaceResults && latestFaceResults.multiFaceLandmarks && latestFaceResults.multiFaceLandmarks.length > 0) {
            for (const landmarks of latestFaceResults.multiFaceLandmarks) {
              if (drawConnectors && FACEMESH_TESSELATION) {
                drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, {
                  color: "rgba(34, 211, 238, 0.25)",
                  lineWidth: 0.8,
                });
              }
              const FACEMESH_RIGHT_EYE = (window as any).FACEMESH_RIGHT_EYE;
              const FACEMESH_LEFT_EYE = (window as any).FACEMESH_LEFT_EYE;
              const FACEMESH_LIPS = (window as any).FACEMESH_LIPS;
              if (drawConnectors) {
                if (FACEMESH_RIGHT_EYE) {
                  drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, { color: "#22d3ee", lineWidth: 1.2 });
                }
                if (FACEMESH_LEFT_EYE) {
                  drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, { color: "#22d3ee", lineWidth: 1.2 });
                }
                if (FACEMESH_LIPS) {
                  drawConnectors(ctx, landmarks, FACEMESH_LIPS, { color: "#f43f5e", lineWidth: 1.8 });
                }
              }
            }
          }

          // Draw finger connectors if currently attacking, or if in the idle phase of defending (specifically to allow visual feedback for the peace trigger)
          if ((role === "user_attack" || (role === "user_defend" && gamePhaseRef.current === "idle")) && latestHandResults && latestHandResults.multiHandLandmarks && latestHandResults.multiHandLandmarks.length > 0) {
            for (const landmarks of latestHandResults.multiHandLandmarks) {
              if (drawConnectors && HAND_CONNECTIONS) {
                drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                  color: "#f472b6",
                  lineWidth: 2.2,
                });
              }
              if (drawLandmarks) {
                drawLandmarks(ctx, landmarks, {
                  color: "#fbbf24",
                  radius: 3,
                });
              }
            }
          }
        }
      }

      // Check throttling threshold (Only run heavy inference every 85 milliseconds ~ 12 FPS instead of 60 FPS)
      const now = performance.now();
      if (!isProcessing && (now - lastProcessedTime >= 85)) {
        isProcessing = true;
        const role = currentRoleRef.current;
        const phase = gamePhaseRef.current;
        
        try {
          if (role === "user_attack") {
            // ONLY execute hands detector if user is attacking
            latestFaceResults = null;
            setLiveFaceDirection("None");
            await hands.send({ image: videoElement });
          } else {
            // role is user_defend
            if (phase === "idle") {
              // Alternately process faceMesh and hands detector to prevent WebGL/CPU bottlenecks and ensure high-reliability peace detection
              frameToggle += 1;
              if (frameToggle % 2 === 0) {
                await faceMesh.send({ image: videoElement });
              } else {
                await hands.send({ image: videoElement });
              }
            } else {
              // Active countdown or refereeing, only execute face detector
              latestHandResults = null;
              setLiveHandDirection("None");
              await faceMesh.send({ image: videoElement });
            }
          }
          lastProcessedTime = now;
        } catch (err) {
          console.warn("Inference frame dropped", err);
        } finally {
          isProcessing = false;
        }
      }

      trackingLoopRef.current = requestAnimationFrame(tick);
    };

    trackingLoopRef.current = requestAnimationFrame(tick);

    return () => {
      if (trackingLoopRef.current) {
        cancelAnimationFrame(trackingLoopRef.current);
        trackingLoopRef.current = null;
      }
    };
  }, [useCamera, streamActive, modelsLoaded]);

  // Initialize and clean up Web Cam stream
  useEffect(() => {
    if (useCamera) {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => {
      stopWebcam();
    };
  }, [useCamera]);

  // Check if someone reached maximum score to end match
  useEffect(() => {
    if (userScore >= maxScore || aiScore >= maxScore) {
      isMatchEndedRef.current = true;
      setGamePhase("match_ended");
      if (userScore >= maxScore) {
        setCurrExpression("crying");
        setCommentaryText("Aiiiigoo! Masak aku bisa kalah dari manusia sepertimu...");
        playLossSound(); // play celebratory or fun ending sounds
        setTimeout(() => playWinSound(), 200);
      } else {
        setCurrExpression("smug");
        setCommentaryText("Asssa! Memang aku ini Cham Cham Cham champion sejati, jinjja!");
        playLossSound();
      }
    } else {
      isMatchEndedRef.current = false;
      setGamePhase((prev) => prev === "match_ended" ? "idle" : prev);
      setAiAction(null);
      setUserAction(null);
      setPeaceProgress(0);
    }
  }, [userScore, aiScore, maxScore]);

  // Reset peace progress and set a firm cooldown lockout of -25 frames (approx 2 seconds at 12fps) when entering idle state
  useEffect(() => {
    if (gamePhase === "idle") {
      consecutivePeaceFramesRef.current = -25;
      setPeaceProgress(0);
    }
  }, [gamePhase]);

  // Listen to keyboard shortcuts for game actions: A/Left, W/Up, D/Right
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gamePhase !== "idle") return; // Key binds only active on idle state

      // Space trigger works in both camera and simulation modes
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (triggerPlayRoundRef.current) {
          triggerPlayRoundRef.current();
        }
        return;
      }

      if (useCamera) return; // Direction key binds disabled in camera mode

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        triggerPlayRound("Left");
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        triggerPlayRound("Up");
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        triggerPlayRound("Right");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gamePhase, useCamera]);

  async function startWebcam() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Video stream play request was safely caught and handled:", err);
          });
        }
        mediaStreamRef.current = stream;
        setStreamActive(true);
      }
    } catch (e: any) {
      console.warn("Camera failed to start", e);
      setCameraError(
        "Gagal mengakses kamera. Pastikan izin kamera diizinkan atau silakan gunakan Mode Manual."
      );
      setUseCamera(false);
    }
  }

  function stopWebcam() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  }

  function captureSnapshot(): string | null {
    if (!videoRef.current || !streamActive) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Mirrored shot for self view natural movement
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.7);
      }
    } catch (err) {
      console.error("Snapshot capture error", err);
    }
    return null;
  }

  // Action Triggers
  const triggerPlayRound = (directSelection: Direction | null = null) => {
    if (gamePhase !== "idle") return;

    // AI selects a smart predicted action using its advanced character-specific machine learning model
    const { chosenAction } = getAiPredictionAndChoice();
    const chosenAiAction = chosenAction;

    lastValidDetectionDuringPrepRef.current = null; // Clear any previous valid detections

    setAiAction(chosenAiAction);
    setUserAction(directSelection); // will be null if camera cv mode is analyzing
    setCountdownNum(3);
    setGamePhase("countdown");
    playTickSound();

    // Start variety countdown interval (Cham... Cham... Cham!)
    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      setCountdownNum(count);
      if (count > 0) {
        playTickSound();
      } else {
        clearInterval(interval);
        // Step 3 reached, trigger the main calculation
        playSwipeSound();
        processRoundEvaluation(chosenAiAction, directSelection);
      }
    }, 800);
  };

  useEffect(() => {
    triggerPlayRoundRef.current = triggerPlayRound;
  }, [triggerPlayRound]);

  const processRoundEvaluation = async (chosenAiAction: Direction, directSelection: Direction | null) => {
    setGamePhase("refereeing");

    // Capture user frame exactly on countdown strike if camera is enabled
    let snap: string | null = null;
    if (useCamera) {
      snap = captureSnapshot();
      setLastRoundSnapshot(snap);
    } else {
      setLastRoundSnapshot(null);
    }

    // Determine the client-side estimated direction to use as manual fallback/helper
    let fallbackDirection: Direction = "Up";
    if (useCamera) {
      if (lastValidDetectionDuringPrepRef.current) {
        fallbackDirection = lastValidDetectionDuringPrepRef.current;
      } else {
        if (currentRole === "user_defend" && liveFaceDirection !== "None" && liveFaceDirection !== "Center") {
          fallbackDirection = liveFaceDirection as Direction;
        } else if (currentRole === "user_attack" && liveHandDirection !== "None") {
          fallbackDirection = liveHandDirection as Direction;
        } else {
          fallbackDirection = directSelection || "Up";
        }
      }
    } else {
      fallbackDirection = directSelection || "Up";
    }

    // Call server API for referee evaluation
    try {
      const payload = {
        userImage: snap,
        gameState: currentRole,
        opponentId: opponent.id,
        aiAction: chosenAiAction,
        userManualAction: fallbackDirection, // Pass the smart computer vision fallback here!
        useCamera: useCamera,
        playerName: playerName || "Kamu",
      };

      const res = await fetch("/api/referee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Panggilan server gagal.");
      }

      const result = await res.json();

      // UI application updates
      setUserAction(result.detectedDirection as Direction);
      setRefereeText(result.refereeMessage);
      setCommentaryText(result.opponentCommentary);
      setCurrExpression(result.opponentExpression as OpponentExpression);

      // Perform online machine learning updater hook
      updateMlModels(result.detectedDirection as Direction, result.roundWinner as RoundWinner, chosenAiAction);

      // Play audio cue
      if (result.roundWinner === "user") {
        playWinSound();
        triggerFireworks();
      } else if (result.roundWinner === "ai") {
        playLossSound();
      } else {
        playDrawSound();
      }

      // Complete round hooks back to parent
      onRoundComplete({
        userAction: result.detectedDirection as Direction,
        aiAction: chosenAiAction,
        winner: result.roundWinner as RoundWinner,
        commentary: result.opponentCommentary,
        refereeMessage: result.refereeMessage,
        opponentExpression: result.opponentExpression as OpponentExpression,
        snapshot: snap || undefined,
      });

      // Show result for 3.5 seconds, then return to idle sandbox unless match has ended
      setTimeout(() => {
        if (isMatchEndedRef.current) {
          setGamePhase("match_ended");
          return;
        }
        setGamePhase((prev) => {
          if (prev === "match_ended") return prev;
          return "idle";
        });
        // Maintain expression but clear values
        setAiAction(null);
        setUserAction(null);
      }, 3500);

    } catch (err: any) {
      console.warn("Referee API handled fallback gracefully:", err.message || err);
      // Failover safely on backend/API connection issues
      setUserAction(fallbackDirection);

      let winner: RoundWinner = "none";
      let msg = "";
      if (currentRole === "user_attack") {
        if (fallbackDirection === chosenAiAction) {
          winner = "user";
          msg = "Kamu menang ronde ini! AI tertembak!";
          playWinSound();
          triggerFireworks();
        } else {
          msg = "Lawan menghindar dengan sukses!";
          playDrawSound();
        }
      } else {
        if (fallbackDirection === chosenAiAction) {
          winner = "ai";
          msg = "Lawan menembakmu tepat sasaran! Poin untuk AI!";
          playLossSound();
        } else {
          msg = "Kamu berhasil menghindari serangan lawan!";
          playDrawSound();
        }
      }

      // Perform online machine learning updater hook in failover mode
      updateMlModels(fallbackDirection, winner, chosenAiAction);

      onRoundComplete({
        userAction: fallbackDirection,
        aiAction: chosenAiAction,
        winner,
        commentary: "Ahem... wasit sedang sibuk jajan sate, mari kita tebak sendiri saja!",
        refereeMessage: msg,
        opponentExpression: winner === "user" ? "shocked" : winner === "ai" ? "smug" : "smiling",
      });

      setRefereeText(msg);
      setCommentaryText("Ahem... wasit sedang sibuk jajan sate!");
      setCurrExpression(winner === "user" ? "shocked" : winner === "ai" ? "smug" : "smiling");

      setTimeout(() => {
        if (isMatchEndedRef.current) {
          setGamePhase("match_ended");
          return;
        }
        setGamePhase((prev) => {
          if (prev === "match_ended") return prev;
          return "idle";
        });
        setAiAction(null);
        setUserAction(null);
      }, 3500);
    }
  };

  const isUserAttacking = currentRole === "user_attack";
  const isAiAttacking = currentRole === "user_defend";

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 h-full justify-between relative">
      
      {/* FULLSCREEN ROUND SPLASH OVERLAY ANIMATION */}
      <AnimatePresence>
        {showRoundSplash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0, y: -50 }}
              transition={{ type: "spring", stiffness: 180, damping: 15 }}
              className="text-center px-6 py-8 rounded-3xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-2xl relative overflow-hidden max-w-sm w-full mx-4"
            >
              {/* Glowing aura */}
              <div className="absolute inset-0 bg-radial from-pink-500/20 via-transparent to-transparent pointer-events-none" />
              
              <motion.span
                initial={{ letterSpacing: "0.1em" }}
                animate={{ letterSpacing: "0.25em" }}
                transition={{ duration: 0.8 }}
                className="text-zinc-500 text-xs font-black uppercase tracking-widest block mb-1 font-mono"
              >
                PERTANDINGAN DIMULAI
              </motion.span>
              
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-amber-400 to-cyan-400 tracking-tight uppercase drop-shadow-lg leading-tight">
                RONDE {roundCount + 1}
              </h2>
              
              <span className="text-xs font-bold text-white/50 block mt-2.5 uppercase tracking-wider font-mono">
                Best of {maxScore === 1 ? 1 : maxScore === 3 ? 5 : maxScore === 5 ? 9 : maxScore}
              </span>
              
              <div className="mt-5 flex justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GORGEOUS TOP HORIZONTAL SCOREBOARD */}
      <div className="w-full backdrop-blur-2xl bg-white/5 rounded-2xl p-3 border border-white/10 shadow-2xl flex flex-row items-center justify-between gap-3 mb-3 shrink-0 relative overflow-hidden">
        {/* Decorative background aura to highlight which side is active */}
        <div className={`absolute inset-0 bg-radial transition-all duration-700 pointer-events-none opacity-[0.15] ${
          isUserAttacking 
            ? "from-cyan-500/30 via-transparent to-transparent left-1/2 right-0" 
            : "from-pink-500/30 via-transparent to-transparent left-0 right-1/2"
        }`} />

        {/* AI OPPONENT STATE (Left side of Scoreboard) */}
        <div className={`flex items-center gap-3 relative z-10 transition-all duration-300 ${
          isAiAttacking ? "scale-105 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]" : "opacity-80"
        }`}>
          <span className="text-sm sm:text-base font-black tracking-widest text-pink-400 uppercase">
            {opponent.name.toUpperCase()}
          </span>
          <div className={`text-xl sm:text-2xl font-black text-white leading-none font-mono px-3.5 py-1.5 rounded-xl bg-black/60 border transition-all duration-300 ${
            isAiAttacking ? "border-pink-500 bg-pink-950/20 shadow-[0_0_15px_rgba(236,72,153,0.2)]" : "border-white/10"
          }`}>
            {aiScore}
          </div>
        </div>

        {/* MIDDLE INFO: Match details with active countdown indicator */}
        <div className="flex flex-col items-center text-center relative z-10 w-auto gap-0.5 justify-center">
          <span className="bg-pink-500 text-white font-mono font-black text-[10px] px-3.5 py-0.5 rounded-lg tracking-widest uppercase shadow-md">
            RONDE {roundCount + 1}
          </span>
          <span className="text-[10px] text-white/55 font-black uppercase tracking-widest font-mono">
            BEST OF {maxScore === 1 ? 1 : maxScore === 3 ? 5 : maxScore === 5 ? 9 : maxScore}
          </span>
        </div>

        {/* PLAYER STATE (Right side of Scoreboard) */}
        <div className={`flex items-center gap-3 relative z-10 transition-all duration-300 ${
          isUserAttacking ? "scale-105 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "opacity-80"
        }`}>
          <div className={`text-xl sm:text-2xl font-black text-white leading-none font-mono px-3.5 py-1.5 rounded-xl bg-black/60 border transition-all duration-300 ${
            isUserAttacking ? "border-cyan-400 bg-cyan-950/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]" : "border-white/10"
          }`}>
            {userScore}
          </div>
          <span className="text-sm sm:text-base font-black tracking-widest text-cyan-400 uppercase">
            {playerName.toUpperCase() || "KAMU"}
          </span>
        </div>

      </div>

      {/* Side-by-Side Video Streams View Area (Sleek 2-column Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch mb-2.5 md:mb-3 flex-1 min-h-0">
        
        {/* LEFT COMPONENT (Col 1): AI OPPONENT FEED */}
        <div className={`backdrop-blur-2xl bg-white/5 rounded-2xl p-4 border shadow-2xl flex flex-col justify-between relative h-[240px] xs:h-[280px] md:h-full transition-all duration-350 ${
          gamePhase === "match_ended" ? "overflow-visible" : "overflow-hidden"
        } ${
          isAiAttacking
            ? "border-pink-500 ring-4 ring-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.4)]"
            : "border-white/15"
        }`}>
          
          {/* Top Label Badge */}
          <div className="absolute top-3 left-3 flex gap-1.5 z-10">
            <span className="backdrop-blur-md bg-black/60 text-white/95 px-2.5 py-0.5 rounded-full text-[9px] font-mono border border-white/10 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
              LIVE &bull; {opponent.name.toUpperCase()}
            </span>
          </div>

          {/* GIANT ATTACK INDICATOR BANNER FOR AI */}
          <AnimatePresence>
            {isAiAttacking && gamePhase === "idle" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.05, 1], opacity: 1 }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute top-14 left-1/2 -translate-x-1/2 bg-yellow-400 border-2 border-yellow-200 text-black px-5 py-2.5 rounded-2xl font-black text-xs sm:text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(234,179,8,0.7)] z-10 flex flex-col items-center gap-1 text-center max-w-[90%] select-none pointer-events-none"
              >
                <span className="text-sm font-black text-black">⚡ AI SIAP MENYERANG! ⚡</span>
                <span className="text-[8.5px] font-bold text-black/85">AI akan menyerang ke salah satu arah!</span>
              </motion.div>
            )}
            {!isAiAttacking && gamePhase === "idle" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.05, 1], opacity: 1 }}
                className="absolute top-14 left-1/2 -translate-x-1/2 bg-white/10 border border-white/20 text-white/90 px-4 py-2 rounded-2xl font-black text-[10px] tracking-wider uppercase shadow-md z-10 flex flex-col items-center gap-0.5 text-center max-w-[90%] select-none pointer-events-none backdrop-blur-md"
              >
                <span>🛡️ AI SEDANG BERTAHAN</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Subtitle ketika AI Berbicara */}
          <AnimatePresence>
            {activeSubtitle && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-x-4 bottom-4 bg-black/92 backdrop-blur-md text-white border border-pink-500/40 px-4 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed tracking-wide text-center z-30 shadow-[0_4px_25px_rgba(236,72,153,0.35)] flex flex-col items-center gap-1 select-none pointer-events-none"
              >
                <span className="text-white text-[11px] sm:text-xs">"{activeSubtitle}"</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Character Main Avatar Stream Space */}
          <div className="flex-1 flex items-center justify-center scale-95 md:scale-100 drop-shadow-2xl relative my-1 min-h-0">
            {aiScore >= maxScore && (
              <motion.div
                initial={{ scale: 0, y: 15 }}
                animate={{ scale: [1, 1.15, 1], y: [0, -10, 0], rotate: [0, -3, 3, 0] }}
                transition={{
                  scale: { repeat: Infinity, duration: 1.8, ease: "easeInOut" },
                  y: { repeat: Infinity, duration: 2.2, ease: "easeInOut" },
                  rotate: { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
                }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 z-25 text-5xl filter drop-shadow-[0_6px_15px_rgba(234,179,8,0.85)] pointer-events-none select-none"
              >
                👑
              </motion.div>
            )}
            <OpponentAvatar
              opponentId={opponent.id}
              expression={currExpression}
              action={aiAction}
              gameState={
                gamePhase === "countdown"
                  ? "countdown"
                  : gamePhase === "refereeing"
                  ? "reveal"
                  : "idle"
              }
              role={currentRole}
            />

            {/* AI action bubble floating indicator */}
            <AnimatePresence>
              {aiAction && gamePhase === "refereeing" && (
                <motion.div
                  initial={{ scale: 0.3, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="absolute bottom-2 bg-yellow-400 text-black px-3.5 py-1.5 rounded-xl shadow-2xl font-black text-[10px] uppercase tracking-wider border border-white/20 select-none z-10"
                >
                  Memilih: {aiAction === "Left" ? "👈 KIRI" : aiAction === "Right" ? "👉 KANAN" : "👆 ATAS"}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Opponent Footer Stream Tag removed for a cleaner visual look */}

        </div>

        {/* RIGHT COMPONENT (Col 2): USER ACTION FEED */}
        <div className={`backdrop-blur-2xl bg-white/5 rounded-2xl p-4 border shadow-2xl flex flex-col justify-between relative h-[240px] xs:h-[280px] md:h-full transition-all duration-350 ${
          gamePhase === "match_ended" ? "overflow-visible" : "overflow-hidden"
        } ${
          isUserAttacking
            ? "border-cyan-400 ring-4 ring-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
            : "border-white/15"
        }`}>
          {userScore >= maxScore && (
            <motion.div
              initial={{ scale: 0, y: 15 }}
              animate={{ scale: [1, 1.15, 1], y: [0, -10, 0], rotate: [0, -3, 3, 0] }}
              transition={{
                scale: { repeat: Infinity, duration: 1.8, ease: "easeInOut" },
                y: { repeat: Infinity, duration: 2.2, ease: "easeInOut" },
                rotate: { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
              }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 z-25 text-5xl filter drop-shadow-[0_6px_15px_rgba(234,179,8,0.85)] pointer-events-none select-none"
            >
              👑
            </motion.div>
          )}
          
          {/* Top Label Badge */}
          <div className="absolute top-3 left-3 flex gap-1.5 z-10">
            <span className="backdrop-blur-md bg-black/60 text-white/95 px-2.5 py-0.5 rounded-full text-[9px] font-mono border border-white/10 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${useCamera && streamActive ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
              {useCamera && streamActive ? `LIVE FEED • ${playerName.toUpperCase()}` : `SIMULASI • ${playerName.toUpperCase()}`}
            </span>
          </div>

          {/* GIANT ATTACK INDICATOR BANNER FOR USER */}
          <AnimatePresence>
            {isUserAttacking && gamePhase === "idle" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.05, 1], opacity: 1 }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute top-14 left-1/2 -translate-x-1/2 bg-cyan-400 border-2 border-cyan-200 text-black px-5 py-2.5 rounded-2xl font-black text-xs sm:text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(34,211,238,0.8)] z-10 flex flex-col items-center gap-1 text-center max-w-[90%] select-none pointer-events-none"
              >
                <span className="text-sm font-black text-black">⚔️ KAMU MENYERANG! ⚔️</span>
                <span className="text-[8.5px] font-bold text-black/85">Pose Peace (✌️) untuk serang otomatis!</span>
              </motion.div>
            )}
            {!isUserAttacking && gamePhase === "idle" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.05, 1], opacity: 1 }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute top-14 left-1/2 -translate-x-1/2 bg-pink-600 border-2 border-pink-350 text-white px-5 py-2.5 rounded-2xl font-black text-xs sm:text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(236,72,153,0.8)] z-10 flex flex-col items-center gap-1 text-center max-w-[90%] select-none pointer-events-none"
              >
                <span className="text-sm font-black text-white">🛡️ KAMU BERTAHAN! 🛡️</span>
                <span className="text-[8.5px] font-bold text-white/90">Tengok kepala menghindari AI. Pose Peace (✌️) untuk mulai!</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Countdown Overlay with exact action indicators */}
          <AnimatePresence>
            {gamePhase === "countdown" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="absolute inset-0 bg-rose-600/95 backdrop-blur-md z-30 flex flex-col items-center justify-center text-center p-4"
              >
                <motion.h2
                  key={countdownNum}
                  initial={{ scale: 0.5, y: 10 }}
                  animate={{ scale: [1, 1.25, 1], y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-5xl font-black text-white tracking-widest leading-none block drop-shadow-2xl"
                >
                  {countdownNum === 3 && "CHAM!"}
                  {countdownNum === 2 && "CHAM!"}
                  {countdownNum === 1 && "CHAM!!!"}
                </motion.h2>

                {/* Subtitle indicators showing exact direction indicators to turn or point */}
                <p className="text-yellow-300 font-mono text-[9px] uppercase tracking-widest mt-4 drop-shadow-md font-black max-w-xs leading-relaxed">
                  {currentRole === "user_attack" ? (
                    <>
                      {countdownNum === 3 && "SIAP SIAGA TANGANMU!"}
                      {countdownNum === 2 && (
                        <span className="text-white text-[10px] bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 mt-1 block">
                          👉 TUNJUK: KIRI, ATAS, atau KANAN!
                        </span>
                      )}
                      {countdownNum === 1 && "TUNJUK SEKARANG!"}
                    </>
                  ) : (
                    <>
                      {countdownNum === 3 && "SIAP GERAKKAN KEPALA!"}
                      {countdownNum === 2 && (
                        <span className="text-white text-[10px] bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 mt-1 block">
                          👉 TENGOK: KIRI, ATAS, atau KANAN!
                        </span>
                      )}
                      {countdownNum === 1 && "HADAP SEKARANG!"}
                    </>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Refereeing AI results overlay */}
          <AnimatePresence>
            {gamePhase === "refereeing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/85 backdrop-blur-xl z-20 flex flex-col items-center justify-center p-4 text-center"
              >
                <Loader2 className="w-10 h-10 text-pink-500 animate-spin mb-3" />
                <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest mb-2">
                  Hasil Visual Sedang Dinilai
                </span>
                <h3 className="text-sm font-black mb-1 text-white">
                  {refereeText || "Mengevaluasi Foto Ronde..."}
                </h3>
                <p className="text-[10px] text-white/50 max-w-xs leading-relaxed mb-3">
                  Multi-modal Vision AI menganalisis gesture kepala atau jari tanganmu secara saksama!
                </p>

                {lastRoundSnapshot && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="border-3 border-white/20 rounded-xl overflow-hidden w-24 h-16 shadow-2xl relative bg-slate-850"
                  >
                    <img src={lastRoundSnapshot} alt="Snapshot Captured" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 bg-black/70 text-[7px] font-mono px-1 rounded text-white">SNAP</span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mirror Video frame or placeholder output */}
          <div className="absolute inset-0 w-full h-full -z-0">
            <div className="w-full h-full relative bg-slate-950">
              {/* ALWAYS render the video element to prevent videoRef.current from being null */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ opacity: streamActive ? 1 : 0 }}
                className="w-full h-full object-cover scale-x-[-1] absolute inset-0"
              />
              <canvas
                ref={canvasRef}
                style={{ opacity: streamActive ? 1 : 0 }}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-x-[-1]"
              />
              
              {/* Loader when stream is not yet active */}
              {!streamActive && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-4 z-20">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                  <p className="text-[10px] font-black text-white font-mono tracking-widest uppercase mb-1">MENGHUBUNGKAN KAMERA...</p>
                  <p className="text-[9px] text-white/50 max-w-[200px] leading-relaxed">
                    Izinkan akses webcam pada peramban Anda untuk mengaktifkan wasit interaktif.
                  </p>
                </div>
              )}

              {/* MediaPipe Model Loader State */}
              {streamActive && (!modelsLoaded || isModelLoading) && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 z-20">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                  <p className="text-[10px] font-black text-cyan-300 font-mono tracking-widest uppercase mb-1">MENGAKTIFKAN DETECTOR CV...</p>
                  <p className="text-[9px] text-white/50 max-w-[200px] leading-relaxed">
                    Mengunduh modul Face Mesh & Hand Tracking MediaPipe secara real-time.
                  </p>
                </div>
              )}
              
              {/* Responsive Guidelines frame overlay */}
              {streamActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 translate-y-8">
                  <div className="border-2 border-dashed border-pink-500/30 rounded-3xl w-56 h-56 flex items-center justify-center relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/75 px-2 py-0.5 rounded border border-white/10 text-[8px] font-mono font-bold text-white">KIRI</div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/75 px-2 py-0.5 rounded border border-white/10 text-[8px] font-mono font-bold text-white">KANAN</div>
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/75 px-2 py-0.5 rounded border border-white/10 text-[8px] font-mono font-bold text-white">ATAS</div>

                    {currentRole === "user_defend" ? (
                      <div className="border border-cyan-400/20 bg-cyan-500/5 rounded-full w-28 h-36 flex flex-col items-center justify-center text-cyan-200">
                        <span className="text-[8px] font-mono text-cyan-300">Posisi Kepala</span>
                      </div>
                    ) : (
                      <div className="border border-yellow-400/20 bg-yellow-500/5 rounded-2xl w-40 h-28 flex flex-col items-center justify-center text-yellow-200">
                        <span className="text-[8px] font-mono text-yellow-300">Gesture Tangan</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User stream identifier tag removed for a cleaner minimal look */}

          {/* Top Right CV Overlay */}
          {streamActive && modelsLoaded && (
            <div className="absolute top-3 right-3 z-10 flex gap-1.5">
              {currentRole === "user_defend" ? (
                <span className="backdrop-blur-md bg-black/60 text-white/95 px-2.5 py-0.5 rounded-full text-[9px] font-mono border border-cyan-400/20 flex items-center gap-1.5 shadow-lg">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                  <span>FACE:</span>
                  <span className="font-black text-cyan-300 uppercase">
                    {liveFaceDirection === "Left" ? "👈 KIRI" : 
                     liveFaceDirection === "Right" ? "👉 KANAN" : 
                     liveFaceDirection === "Up" ? "👆 ATAS" : 
                     liveFaceDirection === "Center" ? "🎯 CNTR" : "..."}
                  </span>
                </span>
              ) : (
                <span className="backdrop-blur-md bg-black/60 text-white/95 px-2.5 py-0.5 rounded-full text-[9px] font-mono border border-yellow-400/25 flex items-center gap-1.5 shadow-lg">
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                  <span>HAND:</span>
                  <span className="font-black text-yellow-300 uppercase">
                    {liveHandDirection === "Left" ? "👈 KIRI" : 
                     liveHandDirection === "Right" ? "👉 KANAN" : 
                     liveHandDirection === "Up" ? "👆 ATAS" : "..."}
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Dynamic real-time peace gesture progressive overlay bar */}
          {peaceProgress > 0 && (
            <div className="absolute bottom-32 left-4 right-4 bg-black/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-pink-500/30 z-20 flex flex-col gap-1.5 shadow-[0_0_15px_rgba(236,72,153,0.2)] max-w-xs mx-auto animate-pulse">
              <div className="flex justify-between items-center text-[9px] font-mono text-pink-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-ping" />
                  MEMULAI RONDE: PEACE (✌️)
                </span>
                <span>{peaceProgress}%</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div style={{ width: `${peaceProgress}%` }} className="bg-gradient-to-r from-pink-500 to-yellow-400 h-full transition-all duration-75 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
              </div>
            </div>
          )}

          {/* Camera Trigger Manual Button (Only when camera mode is active and game is idle) */}
          {useCamera && gamePhase === "idle" && (
            <div className="absolute inset-x-4 bottom-6 z-20 flex justify-center">
              <button
                id="button-camera-start"
                onClick={() => {
                  if (triggerPlayRoundRef.current) {
                    triggerPlayRoundRef.current();
                  }
                }}
                className={`w-full max-w-xs py-3 px-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2.5 border cursor-pointer select-none transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  isUserAttacking
                    ? "bg-cyan-400 hover:bg-cyan-300 text-black border-cyan-200 shadow-cyan-500/30"
                    : "bg-pink-600 hover:bg-pink-500 text-white border-pink-400 shadow-pink-500/30"
                }`}
              >
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span>Mulai Ronde (Space)</span>
              </button>
            </div>
          )}

          {/* Manual Direct Action Buttons (Only when camera mode is false) */}
          {!useCamera && gamePhase === "idle" && (
            <div className="absolute inset-x-4 bottom-14 z-20 flex flex-col gap-2 items-center">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                Gunakan Keyboard atau Pilih Arah:
              </div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                <button
                  id="button-manual-left"
                  onClick={() => triggerPlayRound("Left")}
                  className="bg-slate-900/90 border border-white/10 hover:border-cyan-400 hover:text-cyan-400 py-3.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 transform active:scale-95 cursor-pointer shadow-lg hover:shadow-cyan-500/10"
                >
                  👈 KIRI (A)
                </button>
                <button
                  id="button-manual-up"
                  onClick={() => triggerPlayRound("Up")}
                  className="bg-slate-900/90 border border-white/10 hover:border-yellow-400 hover:text-yellow-400 py-3.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 transform active:scale-95 cursor-pointer shadow-lg hover:shadow-yellow-500/10"
                >
                  👆 ATAS (W)
                </button>
                <button
                  id="button-manual-right"
                  onClick={() => triggerPlayRound("Right")}
                  className="bg-slate-900/90 border border-white/10 hover:border-pink-500 hover:text-pink-500 py-3.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 transform active:scale-95 cursor-pointer shadow-lg hover:shadow-pink-500/10"
                >
                  👉 KANAN (D)
                </button>
              </div>
            </div>
          )}

          {/* Error notifications */}
          {cameraError && (
            <div className="absolute bottom-4 left-4 right-4 bg-rose-900/90 text-white rounded-xl p-3 border border-rose-500/30 shadow-2xl text-[9px] flex items-start gap-2 z-10 backdrop-blur-md">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
              <p className="leading-relaxed text-rose-200">{cameraError}</p>
            </div>
          )}

        </div>

      </div>

      {/* Immersive Bottom Nav Actions Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 shrink-0 w-full relative z-10">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/10 text-xs font-black uppercase tracking-wider transition-all px-4 py-2 rounded-xl border border-white/5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-pink-400" />
          <span>Kembali ke Karakter</span>
        </button>

        <button
          onClick={() => setIsModelInfoOpen(true)}
          className="flex items-center gap-2 text-white/70 hover:text-cyan-400 hover:bg-white/10 text-xs font-black uppercase tracking-wider transition-all px-4 py-2 rounded-xl border border-white/5 cursor-pointer"
        >
          <Brain className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>Info Model AI</span>
        </button>
      </div>

      {/* MATCH END CHAMPIONSHIP RESULT POPUP OVERLAY */}
      <AnimatePresence>
        {gamePhase === "match_ended" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="backdrop-blur-3xl bg-black/85 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-white/20 relative overflow-hidden"
            >
              {/* Confetti decoration elements */}
              <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400" />
 
              <div className="mb-6 flex flex-col items-center justify-center relative">
                {/* Winner Crown above the Head/Trophy */}
                <motion.div
                  initial={{ scale: 0, y: 15 }}
                  animate={{ scale: [1, 1.15, 1], y: [0, -8, 0], rotate: [0, -3, 3, 0] }}
                  transition={{
                    scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    y: { repeat: Infinity, duration: 2.2, ease: "easeInOut" },
                    rotate: { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
                  }}
                  className="text-5xl filter drop-shadow-[0_4px_12px_rgba(234,179,8,0.85)] z-25 mb-3 relative"
                >
                  👑
                </motion.div>

                {userScore >= maxScore ? (
                  <div className="rounded-full p-4 border bg-yellow-400/20 text-yellow-400 border-yellow-400/35 shadow-[0_0_25px_rgba(234,179,8,0.3)]">
                    <Trophy className="w-16 h-16 stroke-[1.5]" />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full border border-pink-500/30 bg-pink-950/20 flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(236,72,153,0.3)] scale-90 relative">
                    <OpponentAvatar
                      opponentId={opponent.id}
                      expression="smug"
                      action={null}
                      gameState="ended"
                      role={currentRole}
                    />
                  </div>
                )}
              </div>
 
              {userScore >= maxScore ? (
                <>
                  <span className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-3.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest mb-2 inline-block">
                    CHAMPIONSHIP VICTORY!
                  </span>
                  <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-3">
                    {playerName.toUpperCase()} JUARA! 참!
                  </h2>
                  <p className="text-white/70 text-xs leading-relaxed mb-4">
                    Keren sekali! <strong className="text-yellow-400">{playerName}</strong> berhasil mengalahkan <strong className="text-yellow-400">{opponent.name}</strong> dengan kedudukan telak <strong className="text-pink-400">{userScore} - {aiScore}</strong>. Refleks kepalamu sungguh setingkat dewa!
                  </p>
                </>
              ) : (
                <>
                  <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 px-3.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest mb-2 inline-block">
                    MATCH ENDED - DEFEATED
                  </span>
                  <h2 className="text-3xl font-black text-pink-500 tracking-tight leading-none mb-3 border-b border-white/5 pb-2">
                    YAH, AI MENANG! 참!
                  </h2>
                  <p className="text-white/70 text-xs leading-relaxed mb-4">
                    Waduh! <strong className="text-white">{opponent.name}</strong> membuktikan kecerdasannya dalam membaca pikiranmu, unggul <strong className="text-pink-400">{aiScore} - {userScore}</strong>. Mari asah lagi instingmu!
                  </p>
                </>
              )}

              {/* Tournament Match Statistics */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5 text-left space-y-3">
                <h3 className="text-[9.5px] font-mono font-black text-cyan-300 uppercase tracking-widest border-b border-white/5 pb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  REKAP STATISTIK PERTANDINGAN
                </h3>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-black/40 border border-white/5 px-2.5 py-2 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-white/50 block font-sans">Total Ronde</span>
                    <span className="text-sm font-mono font-black text-white mt-0.5">{history.length} Ronde</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 px-2.5 py-2 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-white/50 block font-sans">Arah Favoritmu</span>
                    <span className="text-xs font-mono font-black text-yellow-400 mt-1 uppercase truncate">
                      {favoriteDirectionLabel === "KIRI" ? "👈 KIRI" : favoriteDirectionLabel === "KANAN" ? "👉 KANAN" : "👆 ATAS"}
                    </span>
                  </div>
                  <div className="bg-black/40 border border-white/5 px-2.5 py-2 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-white/50 block font-sans">Akurasi Serang</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-mono font-black text-emerald-400">{attackAccuracy}%</span>
                    </div>
                    <span className="text-[7.5px] text-white/30 font-mono">Sukses: {successfulUserAttacks}/{totalUserAttacks}</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 px-2.5 py-2 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-white/50 block font-sans">Rasio Menghindar</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-mono font-black text-pink-400">{dodgeRate}%</span>
                    </div>
                    <span className="text-[7.5px] text-white/30 font-mono">Sukses: {successfulUserDefends}/{totalUserDefends}</span>
                  </div>
                </div>
              </div>
 
              {/* Reset/Exit layout buttons */}
              <div className="space-y-3">
                <button
                  onClick={onResetGame}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-black text-sm rounded-xl shadow-lg shadow-pink-500/20 transition-all cursor-pointer border-b-4 border-rose-800"
                >
                  TANDING ULANG (Rematch)
                </button>
                <button
                  onClick={onExit}
                  className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold text-sm rounded-xl transition-all cursor-pointer"
                >
                  GANTI LAWAN (Opponent List)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODEL INFO MODAL POPUP */}
      <AnimatePresence>
        {isModelInfoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="backdrop-blur-3xl bg-slate-900/95 border border-white/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative text-left overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400" />
              
              {/* Header */}
              <div className="flex items-start justify-between mb-4 pb-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                    <Brain className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                      Sirkuit Belajar AI: {opponent.name}
                    </h2>
                    <p className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest">
                      Spesifikasi Algoritme Model
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModelInfoOpen(false)}
                  className="p-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5 hover:border-white/15 transition-all text-[10px] uppercase font-mono tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tutup</span>
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {/* Intro Card */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-pink-400" />
                    <span className="text-[11px] font-mono font-black text-pink-400 uppercase tracking-widest">
                      {opponent.id === "minjun" && "Markov Chain sequence"}
                      {opponent.id === "jihee" && "Feedforward MLP Network"}
                      {opponent.id === "master_kim" && "Reinforcement Q-Table"}
                    </span>
                  </div>
                  <h3 className="text-white text-xs font-bold font-sans">
                    {opponent.id === "minjun" && "Rantai Markov Probabilitas Transisi Orde-1"}
                    {opponent.id === "jihee" && "Jaringan Jaringan Saraf Tiruan Mini (Multi-Layer Perceptron)"}
                    {opponent.id === "master_kim" && "Agen Pembelajaran Q-Learning Adaptif"}
                  </h3>
                  <p className="text-[11px] text-white/70 leading-relaxed font-medium">
                    {opponent.id === "minjun" && (
                      "Min-jun memetakan probabilitas gerakan selanjutnya dari kamu berdasarkan seberapa sering kamu berpindah dari satu arah gerakan ke arah gerakan lainnya. Ia menganalisis kebiasaan transisimu (seperti setelah memilih KIRI, kamu cenderung memilih KANAN) dan memperbarui peluang ini secara real-time."
                    )}
                    {opponent.id === "jihee" && (
                      "Ji-hee ditenagai oleh Jaringan Saraf Tiruan (Neural Network) dengan hidden layer teraktivasi ReLU dan output ternormalisasi Softmax. Ia menganalisis representasi pattern sequence jendela berjalan (sliding window) dari 2 gerakan terakhir yang kamu lakukan untuk memperkirakan gerakan ketigamu."
                    )}
                    {opponent.id === "master_kim" && (
                      "Suhu Kim melatih agen kecerdasan buatan berbasis Reinforcement Q-Learning. Melalui ganjaran hadiah (+10 jika berhasil menangkap taktikmu, -10 jika salah tebak), ia menetapkan nilai utilitas Q-Value pada setiap keadaan aksi untuk memaksimumkan rasio kemenangannya."
                    )}
                  </p>
                </div>

                {/* Live Matrix Data Visualizer */}
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-3">
                  <span className="text-[10px] font-mono font-black text-cyan-300 uppercase tracking-wider block font-sans">
                    ⚡ AKTIVITAS MATRIKS MEMORI SEKARANG:
                  </span>
                  
                  {opponent.id === "minjun" && (
                    <div className="space-y-2 font-mono text-[10px] text-white/80">
                      {(["Left", "Right", "Up"] as Direction[]).map((fromDir) => {
                        const row = markovMatrix[fromDir] || { Left: 1, Right: 1, Up: 1 };
                        const total = (row.Left || 1) + (row.Right || 1) + (row.Up || 1);
                        const labelFrom = fromDir === "Left" ? "KIRI" : fromDir === "Right" ? "KANAN" : "ATAS";
                        return (
                          <div key={fromDir} className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="text-[10px] text-yellow-400 font-bold block mb-1">
                              Dari gerakan terakhir [{labelFrom}] &rarr; gerakan berikutnya:
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                              {(["Left", "Right", "Up"] as Direction[]).map((toDir) => {
                                const count = row[toDir] || 1;
                                const pct = ((count / total) * 100).toFixed(0);
                                const labelTo = toDir === "Left" ? "KIRI" : toDir === "Right" ? "KANAN" : "ATAS";
                                return (
                                  <div key={toDir} className="bg-black/40 p-1.5 rounded border border-white/5 flex flex-col items-center">
                                    <span className="text-[8px] text-white/50">{labelTo}</span>
                                    <span className="text-white font-extrabold">{pct}%</span>
                                    <span className="text-[7px] text-white/30 font-light">(n={count.toFixed(0)})</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {opponent.id === "jihee" && (
                    <div className="space-y-3 text-[10px] font-mono text-white/80">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 flex flex-col justify-between">
                          <div>
                            <span className="text-[8.5px] text-yellow-400 font-bold uppercase tracking-wider block">HIDDEN WEIGHTS</span>
                            <span className="text-[7.5px] text-white/40 font-light block mb-2">Bobot Sinapsis Matriks w1</span>
                          </div>
                          <span className="text-xs font-black text-cyan-300">4 x 6 Float Matrix</span>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 flex flex-col justify-between">
                          <div>
                            <span className="text-[8.5px] text-pink-400 font-bold uppercase tracking-wider block">OUTPUT WEIGHTS</span>
                            <span className="text-[7.5px] text-white/40 font-light block mb-2">Bobot Sinapsis Matriks w2</span>
                          </div>
                          <span className="text-xs font-black text-pink-300">3 x 4 Float Matrix</span>
                        </div>
                      </div>

                      <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                        <span className="text-[9px] text-yellow-400 font-bold uppercase tracking-wider block mb-1">TINGKAT AKTIVITAS SINAPSIS</span>
                        <div className="flex flex-col gap-1.5 mt-2">
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="text-white/60 font-sans">Kompleksitas Input Jaringan:</span>
                            <span className="text-white font-bold">12 Fitur (Histori Jendela Ganda)</span>
                          </div>
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="text-white/60 font-sans">Ratusan Iterasi Backprop:</span>
                            <span className="text-white font-bold">100 iterasi / ronde</span>
                          </div>
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="text-white/60 font-sans">Estimator Laju Belajar (LR):</span>
                            <span className="text-white font-bold">0.15 AdaGrad Set</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {opponent.id === "master_kim" && (
                    <div className="space-y-2 font-mono text-[9px] text-white/80">
                      {(["None", "Left", "Right", "Up"] as string[]).map((stateKey) => {
                        const row = qTable[stateKey] || { Left: 0, Right: 0, Up: 0 };
                        const labelState = stateKey === "None" ? "MULAI PERMAINAN" : stateKey === "Left" ? "KIRI" : stateKey === "Right" ? "KANAN" : "ATAS";
                        return (
                          <div key={stateKey} className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="text-[9.5px] text-yellow-400 font-bold block mb-1">
                              Status Kepalamu: [{labelState}] &rarr; Ekspektasi Nilai Q-Value:
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                              {(["Left", "Right", "Up"] as Direction[]).map((act) => {
                                const qVal = row[act] || 0;
                                const labelAct = act === "Left" ? "KIRI" : act === "Right" ? "KANAN" : "ATAS";
                                const colorClass = qVal > 0 ? "text-green-400" : qVal < 0 ? "text-red-400" : "text-white";
                                return (
                                  <div key={act} className="bg-black/40 p-1 rounded border border-white/5 flex flex-col items-center">
                                    <span className="text-[8px] text-white/50">{labelAct}</span>
                                    <span className={`font-black ${colorClass}`}>{qVal.toFixed(2)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Dynamic Forecast / User Movement Predictions */}
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-3">
                  <div className="flex items-center gap-1.5 flex-row">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-black text-cyan-300 uppercase tracking-wider block">
                      🔮 ANALISIS PREDIKSI GERAKANMU BERIKUTNYA
                    </span>
                  </div>
                  <div className="space-y-2 font-mono">
                    {(["Left", "Right", "Up"] as Direction[]).map((dir) => {
                      const p = livePredictions[dir] || 0.33;
                      const pct = (p * 100).toFixed(0);
                      const barColor = dir === "Left" ? "bg-cyan-400" : dir === "Right" ? "bg-pink-400" : "bg-yellow-400";
                      const nameText = dir === "Left" ? "KIRI" : dir === "Right" ? "KANAN" : "ATAS";
                      return (
                        <div key={dir} className="flex items-center justify-between text-[10px] w-full bg-white/5 p-2 rounded-lg border border-white/5">
                          <span className="text-white/80 font-bold w-12">{nameText}</span>
                          <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden mx-3 relative">
                            <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-white font-extrabold w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reset Brain Memory button */}
                <button
                  onClick={() => {
                    if (window.confirm("Apakah kamu yakin ingin mereset seluruh memori pembelajaran AI? Mereka akan melupakan seluruh pola permainanmu dan memulai dari nol kembali.")) {
                      resetAllMlBrains();
                      setIsModelInfoOpen(false);
                    }
                  }}
                  className="w-full text-[10px] font-bold text-red-400/90 hover:text-red-300 hover:bg-red-500/10 active:bg-red-500/20 py-2.5 px-3 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all font-mono uppercase cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>⚠️ Reset Memori Otak AI</span>
                </button>

                {/* Additional Info / Explanative Info */}
                <div className="text-[9.5px] text-white/40 leading-relaxed text-center font-mono py-1">
                  💡 Status memori AI disimpan di dalam LocalStorage perambanmu secara lokal dan terus berkembang setiap kali kamu bermain melawannya!
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER DYNAMIC ROUND WINNING FIREWORKS EXPLOSIONS */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {particles.map((p) => {
          const radian = (p.angle * Math.PI) / 180;
          const destX = Math.cos(radian) * p.distance;
          const destY = Math.sin(radian) * p.distance;

          return (
            <motion.div
              key={p.id}
              initial={{ x: p.cx, y: p.cy, scale: 0, opacity: 1 }}
              animate={{
                x: `calc(${p.cx} + ${destX}px)`,
                y: [
                  `calc(${p.cy})`, 
                  `calc(${p.cy} + ${destY}px - 35px)`, 
                  `calc(${p.cy} + ${destY}px + 45px)`
                ],
                scale: [0, 1.4, 0.7, 0],
                opacity: [1, 1, 0.5, 0],
              }}
              transition={{
                duration: 1.4 + Math.random() * 0.7,
                delay: p.delay,
                ease: "easeOut",
              }}
              style={{
                position: "absolute",
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: "50%",
                boxShadow: `0 0 12px ${p.color}, 0 0 4px #ffffff`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
