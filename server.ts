import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with generous limit for webcam frames
app.use(express.json({ limit: "10mb" }));

// Lazy initializer for Google GenAI client
let aiClient: GoogleGenAI | null = null;
function getGenAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Characters profiles for game logic
const OPPONENTS = {
  minjun: {
    name: "Min-jun",
    title: "Bocah Ganteng suka membual (The Cocky Kid)",
    bio: "Min-jun adalah anak laki-hari yang sangat percaya diri, suka pamer, dan suka mengejek jika ia menang. Tapi kalau kalah sedikit saja, dia langsung merengek-rengek kaget 'Heol! Masak aku kalah!'. Gayanya sangat ekspresif.",
    personalities: ["lucu", "pembual", "manja"]
  },
  jihee: {
    name: "Ji-hee",
    title: "Pembawa Acara Variety Hype (The Variety Star)",
    bio: "Ji-hee adalah MC variety show Korea yang super energik, heboh, dan ekspresif. Dia selalu berteriak 'Daebak!' atau 'Keren sekali!' jika kamu sukses bertahan atau menyerang, dan sangat dramatis ketika bertanding.",
    personalities: ["energik", "dramatis", "heboh"]
  },
  master_kim: {
    name: "Master Kim",
    title: "Suhu Zen yang Santai (The Calm Zen Master)",
    bio: "Suhu Kim adalah kakek ahli meditasi yang santai dan bijaksana, namun senang memberikan komentar-komentar satir yang lucu. Dia jarang panik, tapi kalau wajahnya tertabrak jari kita (kalah), dia akan berdeham 'Ahem... anginnya kencas sekali ya hari ini'.",
    personalities: ["tenang", "bijaksana", "satir"]
  }
};

// API: Referee response mapping
app.post("/api/referee", async (req, res) => {
  try {
    const {
      userImage,         // base64 image (null if manual mode)
      gameState,         // 'user_attack' | 'user_defend'
      opponentId,        // 'minjun' | 'jihee' | 'master_kim'
      aiAction,          // 'Left' | 'Right' | 'Up'
      userManualAction,  // 'Left' | 'Right' | 'Up'
      useCamera          // boolean flag
    } = req.body;

    // Standard mappings
    const activeOpponent = OPPONENTS[opponentId as keyof typeof OPPONENTS] || OPPONENTS.jihee;

    let textPrompt = `
Kamu adalah Referee dan AI Opponent dalam game tradisional Korea "Cham Cham Cham" (참참참).
Opponent yang dipilih user saat ini adalah: ${activeOpponent.name} (${activeOpponent.title}).
Karakteristik & Latar Belakang Opponent: "${activeOpponent.bio}".

CRITICAL DESIGN RULE FOR DIRECTIONS:
Game ini dihitung sepenuhnya berdasarkan PANDANGAN LAYAR USER (Screen-relative / Pandangan mata user ke layar).
Artinya:
- Sisi "Left" (Kiri) selalu merupakan Sisi KIRI pada layar dari sudut pandang user (di mana label "KIRI" digambar).
- Sisi "Right" (Kanan) selalu merupakan Sisi KANAN pada layar dari sudut pandang user (di mana label "KANAN" digambar).
- Sisi "Up" (Atas) selalu ke arah atas.

Foto snapshot yang kamu terima dari kamera user sudah di-mirror oleh aplikasi (Horizontal Flipped), sehingga:
- KIRI LAYAR (Left) = Sisi KIRI FOTO (Kiri dari sudut pandang kamu melihat foto itu).
- KANAN LAYAR (Right) = Sisi KANAN FOTO (Kanan dari sudut pandang kamu melihat foto itu).

Tolong abaikan perspektif orientasi biologi tubuh subjek atau orientasi tubuh AI sendiri! Hanya gunakan perspektif sisi foto:
- Jika subjek menunjuk atau menengok ke arah KANAN FOTO (Sisi kanan dari sudut pandang kamu melihat gambar), maka itu adalah "Right" (Kanan).
- Jika subjek menunjuk atau menengok ke arah KIRI FOTO (Sisi kiri dari sudut pandang kamu melihat gambar), maka itu adalah "Left" (Kiri).

Detil ronde saat ini:
- Kondisi Permainan: ${gameState === "user_attack" ? "User Menyerang (User mengacungkan tangan ke arah detectedDirection, AI memutar wajah ke arah aiAction)" : "User Bertahan (AI mengacungkan tangan ke arah aiAction, User memutar wajah ke arah detectedDirection)"}.
- Gerakan AI: AI memilih arah **${aiAction}** (screen-relative, maka ${aiAction === "Left" ? "AI menunjuk/menengok ke sisi KIRI foto" : aiAction === "Right" ? "AI menunjuk/menengok ke sisi KANAN foto" : "AI menunjuk/menengok ke atas"}).

Instruksi Analisis Gambar (Computer Vision - Jika ada gambar):
`;

    if (useCamera && userImage) {
      if (gameState === "user_attack") {
        textPrompt += `
- Analisislah gambar yang diberikan. Temukan lokasi tangan/jari telunjuk yang diacungkan oleh user.
- Tentukan apakah arah tangan/jari tersebut menunjuk ke arah:
  * "Left" (Jika mengarah ke sisi KIRI FOTO dari sudut pandangmu melihat gambar)
  * "Right" (Jika mengarah ke sisi KANAN FOTO dari sudut pandangmu melihat gambar)
  * "Up" (Jika menunjuk lurus ke atas)
- Catatan: Jika tidak ada tangan terdeteksi, atau ragu, gunakan manual fallback: "${userManualAction}".
- Isilah kolom "detectedDirection" dengan salah satu dari: "Left", "Right", "Up".
- Tuliskan alasan analisis visualmu pada kolom "detectionReason" dalam Bahasa Indonesia secara ramah.
`;
      } else {
        textPrompt += `
- Analisislah gambar wajah yang diberikan. Tentukan arah menengok kepala orang tersebut:
  * "Left" (Jika hidung/wajah miring/menengok ke sisi KIRI FOTO dari pandanganmu)
  * "Right" (Jika hidung/wajah miring/menengok ke sisi KANAN FOTO dari pandanganmu)
  * "Up" (Mendongak ke atas)
  * Jika wajah tampak lurus ke depan, pilihlah penafsiran yang paling dekat atau gunakan fallback manual "${userManualAction}".
- Isilah kolom "detectedDirection" dengan salah satu dari: "Left", "Right", "Up".
- Tuliskan alasan analisismu pada kolom "detectionReason" dalam Bahasa Indonesia secara singkat dan lucu.
`;
      }
    } else {
      textPrompt += `
- User bermain dalam manual mode (tanpa kamera). Arah gerak user yang ditetapkan secara manual adalah: "${userManualAction}".
- Tetapkan "detectedDirection" ke "${userManualAction}".
- Set "detectionConfidence" ke "none".
- "detectionReason" diisi: "Mode input manual diaktifkan".
`;
    }

    textPrompt += `
Aturan Keputusan Poin:
- Jika Game State = "user_attack" (User Menyerang):
  - User Menang Ronde ini (mendapat poin) jika Arah gerakan Tangan User ("detectedDirection") SAMA dengan Arah gerakan Wajah AI ("aiAction") dari perspektif foto/layar.
  - AI Selamat (tidak ada poin) jika Arah Tangan User BEDA dengan Arah Wajah AI.
- Jika Game State = "user_defend" (User Bertahan):
  - AI Menang Ronde ini (mendapat poin) jika Arah Wajah User ("detectedDirection") SAMA dengan Arah Tangan AI ("aiAction") dari perspektif foto/layar.
  - User Selamat (tidak ada poin) jika Arah Wajah User BEDA dengan Arah Tangan AI.

Tugas Tambahan (Hasilkan Dialog Reaksi & Referee):
1. Hasilkan tanggapan interaktif dari karakter Opponent ("opponentCommentary") dalam BAHASA INDONESIA yang dicampur dengan kata-kata ekspresif Korea (seperti: "Daebak!", "Ah, jinjja?", "Assa!", "Aigoo!", "Heol!", "Omo!"). Tanggapan ini harus sangat khas dengan kepribadian karakter ${activeOpponent.name} yang baru saja digambarkan. Jangan kaku!
2. Pilih ekspresi visual lawan ("opponentExpression") dari pilihan berikut: "neutral", "smiling", "shouting", "shocked", "smug", "crying".
3. Berikan pesan resmi dari wasit ("refereeMessage") tentang ronde ini dalam Bahasa Indonesia yang bersemangat (contoh: "Wah, serangan jitu! Poin untuk User!" atau "Suhu Kim berhasil menghindar! Serangan gagal!").

Kembalikan hasil dalam bentuk JSON murni dengan format schema berikut:
{
  "detectedDirection": "Left" | "Right" | "Up",
  "detectionConfidence": "high" | "low" | "none",
  "detectionReason": "string deskripsi visual singkat",
  "roundWinner": "user" | "ai" | "none",
  "opponentCommentary": "string kutipan dialog khas karakter",
  "opponentExpression": "neutral" | "smiling" | "shouting" | "shocked" | "smug" | "crying",
  "refereeMessage": "string penjelasan wasit"
}
`;

    const ai = getGenAIClient();
    const contents: any[] = [];

    // If useCamera is true and image is provided, prepare image payload
    if (useCamera && userImage) {
      // Base64 format check: remove header data:image/jpeg;base64, if exists
      const base64Clean = userImage.replace(/^data:image\/\w+;base64,/, "");
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Clean
        }
      });
    }

    contents.push({ text: textPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedDirection: {
              type: Type.STRING,
              description: "The calculated direction (Left, Right, or Up) of user.",
            },
            detectionConfidence: {
              type: Type.STRING,
              description: "Confidence level of CV estimation: high, low, or none if manual fallback is used.",
            },
            detectionReason: {
              type: Type.STRING,
              description: "Short reason for visual classification.",
            },
            roundWinner: {
              type: Type.STRING,
              description: "Who wins this round: user, ai, or none.",
            },
            opponentCommentary: {
              type: Type.STRING,
              description: "Indonesian commentary with variety-show expressions.",
            },
            opponentExpression: {
              type: Type.STRING,
              description: "Expression class for SVG representation.",
            },
            refereeMessage: {
              type: Type.STRING,
              description: "Warm, official statement of referee of this play round.",
            }
          },
          required: [
            "detectedDirection",
            "detectionConfidence",
            "detectionReason",
            "roundWinner",
            "opponentCommentary",
            "opponentExpression",
            "refereeMessage"
          ]
        }
      }
    });

    const resultText = response.text || "{}";
    let resultObject: any = {};
    try {
      resultObject = JSON.parse(resultText.trim());
    } catch (e) {
      console.warn("Failed to parse Gemini JSON:", resultText);
      resultObject = {};
    }

    // Combine locally detected direction (MediaPipe) or user manual keyboard action
    const detectedDirection = userManualAction || resultObject.detectedDirection || "Up";

    // Recalculate winner programmatically to prevent Gemini mismatch or logical hallucination
    let correctWinner: "user" | "ai" | "none" = "none";
    if (gameState === "user_attack") {
      if (detectedDirection === aiAction) {
        correctWinner = "user";
      }
    } else if (gameState === "user_defend") {
      if (detectedDirection === aiAction) {
        correctWinner = "ai";
      }
    }

    // Construct programmatically flawless official referee message in Indonesian
    const dirIndo = {
      Left: "KIRI 👈",
      Right: "KANAN 👉",
      Up: "ATAS 👆",
    };
    
    const displayPlayerName = req.body.playerName || "Kamu";
    
    let refereeMessage = "";
    if (gameState === "user_attack") {
      if (correctWinner === "user") {
        refereeMessage = `Tembakan tepat sasaran! Jari ${displayPlayerName} menunjuk ke ${dirIndo[detectedDirection as keyof typeof dirIndo]} dan wajah ${activeOpponent.name} juga menengok ke ${dirIndo[aiAction as keyof typeof dirIndo]}! Satu poin tambahan!`;
      } else {
        refereeMessage = `${activeOpponent.name} berhasil menghindar dengan mulus! Jari ${displayPlayerName} menunjuk ke ${dirIndo[detectedDirection as keyof typeof dirIndo]} tetapi lawan menengok ke ${dirIndo[aiAction as keyof typeof dirIndo]}.`;
      }
    } else {
      if (correctWinner === "ai") {
        refereeMessage = `Aduh, kena tembak! Kepala ${displayPlayerName} menengok ke ${dirIndo[detectedDirection as keyof typeof dirIndo]} tepat ke arah jari ${activeOpponent.name} yang menunjuk ke ${dirIndo[aiAction as keyof typeof dirIndo]}! Poin untuk lawan!`;
      } else {
        refereeMessage = `Luar biasa, berhasil menghindar! Kepala ${displayPlayerName} menengok ke ${dirIndo[detectedDirection as keyof typeof dirIndo]} sedangkan jari ${activeOpponent.name} menunjuk ke ${dirIndo[aiAction as keyof typeof dirIndo]}. Selamat!`;
      }
    }

    // Assign corrected values back to response payload
    resultObject.detectedDirection = detectedDirection;
    resultObject.roundWinner = correctWinner;
    resultObject.refereeMessage = refereeMessage;
    // Keep commentary and expression fields generated by Gemini (which are creatively descriptive!)
    if (!resultObject.opponentCommentary) {
      resultObject.opponentCommentary = correctWinner === "user" ? "Heol! Bagaimana kamu tahu?!" : "Gampang sekali kutebak!";
    }
    if (!resultObject.opponentExpression) {
      resultObject.opponentExpression = correctWinner === "user" ? "shocked" : "smiling";
    }

    res.json(resultObject);
  } catch (error: any) {
    console.error("Referee API Error:", error);
    res.status(500).json({
      error: error.message || "Failed to contact Referee AI Engine"
    });
  }
});

// API: Generate Text-to-Speech (TTS) using Gemini TTS model
app.post("/api/tts", async (req, res) => {
  try {
    const { text, opponentId } = req.body;

    // Mapping opponent to official supported prebuilt voices:
    // Puck, Charon, Kore, Fenrir, Zephyr
    let voiceName = "Zephyr";
    if (opponentId === "master_kim") {
      voiceName = "Charon";
    } else if (opponentId === "minjun") {
      voiceName = "Puck";
    } else if (opponentId === "jihee") {
      voiceName = "Zephyr";
    }

    // Clean text of emojis and specific symbols for better pronunciation
    const cleanText = text
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
      .replace(/[&#*\";👈👉👆🎯⚡🛡️⚔️•]/g, "")
      .replace(/best of \d/gi, "")
      .trim();

    if (!cleanText) {
      return res.json({ audio: null, mimeType: null });
    }

    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }
          }
        }
      }
    } as any);

    const part = (response as any).candidates?.[0]?.content?.parts?.[0];
    const base64Audio = part?.inlineData?.data || null;
    const mimeType = part?.inlineData?.mimeType || "audio/mp3";

    res.json({ audio: base64Audio, mimeType });
  } catch (error: any) {
    // Graceful fallback: warn the server console but don't crash nor return a 500 error.
    // Returning 200 with audio: null triggers a perfect seamless fallback to the browser's Web Speech API.
    console.warn("TTS API handled fallback gracefully:", error.message || error);
    res.json({ audio: null, mimeType: null, error: error.message || "TTS Model preview unavailable in this context" });
  }
});

// Serve API check/health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Cham Cham Cham Game Master is fully powered!" });
});

// Vite & Static file configurations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully interactive on http://0.0.0.0:${PORT}`);
  });
}

startServer();
