# Cham Cham Cham - AI Referee 🏆

Cham Cham Cham adalah game kasual interaktif yang memadukan permainan tradisional Korea "Cham Cham Cham" dengan kemampuan AI mutakhir. Aplikasi ini dapat mendeteksi wajah dan tangan pengguna secara *real-time* menggunakan kamera komputer (dibantu dengan MediaPipe) dan menghasilkan komentar suara AI yang dinamis berdasarkan interaksi pengguna.

## Spesifikasi Permainan
1. **Aturan Cham Cham Cham**: Pemain penyerang (Attacker) akan menunjuk arah tertentu (Kiri, Kanan, atau Atas). Di saat yang bersamaan, pemain bertahan (Defender) harus menolehkan kepalanya.
    - Jika arah yang ditunjuk dan arah kepala SAMA, maka Penyerang menang, dan akan mendapat poin!
    - Jika ARAH BERBEDA, maka Bertahan menang atau berhasil selamat, dan tidak ada poin yang diberikan atau peran akan ditukar!
2. **Kamera AI & Deteksi Visual**: 
   - Di saat kamu bertahan, aplikasinya akan mendeteksi arah kepala kamu. 
   - Jika kamu menyerang, algoritme bisa mendeteksi arah jarimu atau kamu dapat menggunakan opsi manual.
   - Peringatan: Gunakan pencahayaan yang cukup di dalam ruangan untuk akurasi optimal.
3. **Model Pembelajaran Mesin AI**: AI akan mengumpulkan statistik kamu selagi match berjalan. Di akhir game, kamu dapat melihat statistik lengkap mengenai jumlah win, loss, rasio, dan pola pergerakanmu!

## Cara Menjalankan untuk Versi Local Development
1. Clone / Tarik repository ini.
2. Buat file `.env` di folder root dan letakkan `GEMINI_API_KEY=YOUR_API_KEY` di sana. (Bisa merujuk menggunakan file contoh `.env.example`).
3. Dari terminal, jalankan perintah `npm start` atau `npm run dev`.
4. Anda siap menantang sang AI Champion!

## Teknologi yang Dipakai
- Google Gemini 3 (TTS & Text Generation)
- React 18 & Motion (Animasi UI/UX)
- Tailwind CSS v4 & Lucide Icons
- MediaPipe (Google Vision / Face Mesh)
- Node.js / Express Server-Side Proxy
