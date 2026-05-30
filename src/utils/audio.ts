/**
 * Lightweight browser synthesizer for sound effects.
 * No external file downloads required, 100% reliable.
 */

let activeCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!activeCtx) {
      activeCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume context if suspended (browser security blocks autoplay)
    if (activeCtx.state === "suspended") {
      activeCtx.resume();
    }
    return activeCtx;
  } catch (e) {
    console.warn("Web Audio API not supported in this browser environment.", e);
    return null;
  }
}

export function playTickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 tick
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playSwipeSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.25);

  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

export function playWinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Sound a cheerful double-note chord
  const playC = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.setValueAtTime(freq * 1.25, start + dur / 2); // major third jump

    gain.gain.setValueAtTime(0.15, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  };

  playC(523.25, now, 0.15); // C5
  playC(659.25, now + 0.12, 0.35); // E5
  playC(783.99, now + 0.24, 0.45); // G5
}

export function playLossSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Sad sliding buzz chord on loss or draw hit
  const playD = (freq: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq / 2, now + 0.5);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.6);
  };

  playD(220); // G3 sliding down
}

export function playDrawSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

type SpeechListener = (text: string | null) => void;
let speechListener: SpeechListener | null = null;

export function registerSpeechListener(listener: SpeechListener) {
  speechListener = listener;
}

export function speakText(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    if (speechListener) {
      speechListener(text);
    }
    
    // Clean emojis and decorative characters to avoid pronunciation quirks
    const cleanText = text
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
      .replace(/[&#*\";👈👉👆🎯⚡🛡️⚔️•]/g, "")
      .replace(/best of \d/gi, "")
      .trim();
      
    if (!cleanText) {
      if (speechListener) {
        speechListener(null);
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "id-ID";
    utterance.rate = 1.35; // Speak faster

    utterance.onend = () => {
      if (speechListener) {
        speechListener(null);
      }
    };
    utterance.onerror = () => {
      if (speechListener) {
        speechListener(null);
      }
    };
    
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.toLowerCase().includes("id") || v.lang.toLowerCase().includes("in"));
    if (idVoice) {
      utterance.voice = idVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis failed", err);
    if (speechListener) {
      speechListener(null);
    }
  }
}

let currentTTSAudio: HTMLAudioElement | null = null;

export async function speakTextWithTTS(text: string, opponentId: string) {
  try {
    // Stop currently playing TTS audio if any
    if (currentTTSAudio) {
      currentTTSAudio.pause();
      currentTTSAudio.currentTime = 0;
      currentTTSAudio = null;
    }

    if (!text) {
      if (speechListener) {
        speechListener(null);
      }
      return;
    }

    if (speechListener) {
      speechListener(text);
    }

    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text, opponentId })
    });

    if (!response.ok) {
      throw new Error("TTS API call failed");
    }

    const data = await response.json();
    if (!data.audio) {
      console.warn("No audio returned from TTS API, falling back to Web Speech");
      speakText(text);
      return;
    }

    const mimeType = data.mimeType || "audio/mp3";
    const audioDataUrl = `data:${mimeType};base64,${data.audio}`;

    const audio = new Audio(audioDataUrl);
    audio.playbackRate = 1.35; // Accelerate AI speaking speed to keep matches dynamic and responsive
    currentTTSAudio = audio;

    audio.onended = () => {
      if (speechListener && currentTTSAudio === audio) {
        speechListener(null);
      }
    };
    audio.onpause = () => {
      if (speechListener && currentTTSAudio === audio) {
        speechListener(null);
      }
    };
    audio.onerror = () => {
      if (speechListener && currentTTSAudio === audio) {
        speechListener(null);
      }
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("TTS Audio autoplay interrupted or blocked by browser policy:", err);
        if (speechListener && currentTTSAudio === audio) {
          speechListener(null);
        }
      });
    }
  } catch (err) {
    console.warn("speakTextWithTTS failed, falling back to Web Speech API", err);
    // Use classic Web Speech API as fallback
    speakText(text);
  }
}

export function cancelTTS() {
  if (currentTTSAudio) {
    currentTTSAudio.pause();
    currentTTSAudio.currentTime = 0;
    currentTTSAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (speechListener) {
    speechListener(null);
  }
}

