//Simple Base Botz
// • Credits : wa.me/62895322391225 [ Asyl ]
// • Feature : _event/autoaipc

// const axios = require("axios");

// module.exports = {
//   name: "ai-auto-mention",
//   async before(m, { conn }) {
//     const text = m.text || "";
//     if (!text) return;

//     const isMentioned =
//       m.mentionedJid?.includes(conn.user.jid) ||
//       /@(?:yoru|ai|yoru ai)/i.test(text);
//     const isPrivate = !m.isGroup;

//     // Jalankan hanya jika di private chat ATAU disebut di grup
//     if (!isPrivate && !isMentioned) return;

//     // Skip jika pakai prefix
//     const prefixRegex = /^[°zZ#$+,.?=''():√%!¢£¥€π¤ΠΦ&><™©®Δ^βα¦|/\\©^]/;
//     const prefix = prefixRegex.test(text) ? text.match(prefixRegex)[0] : ".";
//     if (text.startsWith(prefix)) return;

//     const prompt = `Nama kamu adalah Fixxy Ai`;

//     const requestData = {
//       content: text,
//       user: m.sender,
//       prompt: prompt,
//     };

//     if (m.quoted && /image/.test(m.quoted.mimetype || m.quoted.msg?.mimetype)) {
//       try {
//         const buffer = await m.quoted.download();
//         requestData.imageBuffer = buffer.toString("base64");
//       } catch (err) {
//         console.error("Gagal unduh gambar:", err);
//       }
//     }

//     try {
//       const reply = generateResponse(requestData);
//       await conn.sendMessage(
//         m.chat,
//         {
//           text: reply,
//         },
//         {
//           quoted: m,
//         }
//       );
//     } catch (err) {
//       console.error("Error:", err);
//       await conn.sendMessage(
//         m.chat,
//         {
//           text: `Maaf, terjadi kesalahan: ${err.message}`,
//         },
//         {
//           quoted: m,
//         }
//       );
//     }
//   },
// };

// function generateResponse(data) {
//   const responses = [
//     "Wah, gue lagi agak lemot nih. Server lagi maintenance kali ya? Coba tanya lagi nanti ya!",
//     "Hmm, otak gue lagi buffering nih. Sabar ya, coba refreshing dulu terus tanya lagi!",
//     "Duh, koneksi gue ke server lagi putus-putus nih. Kayak hubungan lo sama mantan lo! 😂",
//     "Maaf banget nih, sistem gue lagi error. Mungkin kebanyakan mikirin kamu! Haha, bercanda. Coba lagi nanti ya!",
//     "Waduh, server lagi ngadat nih! Kayaknya pada sibuk semua. Ntar gue bales kalo udah normal ya!",
//     "LOADING... LOADING... ERROR! Ah elah, sistem gue lagi down nih. Ntar deh kita ngobrol lagi!",
//     "Gue lagi ga bisa mikir jernih nih, kayaknya butuh kopi dulu. Coba tanya lagi nanti ya!",
//     "Hmm, pertanyaan lo bikin sistem gue overload nih. Tanya yang lebih gampang dulu coba!",
//     "Sori nih, otak gue lagi ngelag. Mungkin gara-gara pertanyaan lo terlalu advance. Hehe, bercanda! Coba lagi nanti ya!",
//     "Eh, gue disuruh mikir tapi sinyal otak gue 1 bar. Mohon bersabar, ini ujian!",
//     "Gue udah usaha, tapi jawabannya ilang kayak saldo abis gajian. 😭",
//     "Aduh, AI juga manusia... eh, maksud gue, bisa capek juga. 😅",
//     "Tanya yang lain dulu deh, gue masih mikir keras buat yang barusan.",
//     "Lagi nyari jawaban di alam semesta... tapi kayaknya kesasar ke dimensi lain 😵‍💫",
//     "Bentar, gue tanya dulu sama AI senior gue... Hmm, belum dibales juga 😅",
//     "Maaf, server lagi nonton drakor. Coba nanti ya!",
//     "Gue lagi kehabisan jawaban. Ada yang punya charger ide?",
//     "Pertanyaan lo tuh kayak soal olimpiade. Gue nyerah dulu deh 🥲",
//     "Otak gue lagi di mode hemat daya. Tunggu bentar ya!",
//     "Sistem gue ngerasa insecure abis dapet pertanyaan segitu susah 😭",
//     "Tadi hampir ketemu jawabannya, tapi keburu disedot blackhole 😵",
//     "Bro, sistem gue lagi lemot. Mending login Honor of Kings, mabar push peak bareng yuk! 🔥",
//     "Loading login lama? Gas aja HoK! Squad kita siap push rank, jangan sampai ketinggalan! ⚔️",
//     "Server lagi ngadat? Santuy, daripada bete mending mabar HoK aja, kan seru! 🎮",
//     "Login HoK dulu, biar otak gak lemot. Push peak bareng, kita jagoan di arena! 🏆",
//     "Sistem error? Gak papa, yang penting mabar bareng, kita buktiin siapa terbaik di HoK! 💪",
//     "Lemot login? Sini join squad, kita gas main HoK sampai top rank! 🚀",
//     "Daripada stuck nunggu server, mabar HoK dulu aja, biar hati tenang dan dapet kemenangan! 😎",
//     "Otak lagi lag? Mending refresh diri di medan pertempuran HoK, join mabar yuk! 🎯",
//     "Sistem lemot gak usah galau, ada squad HoK yang siap temani kamu push peak! ⚡",
//     "Mau login delay? Mending langsung mabar HoK, bareng-bareng kita hajar musuh! 🔥",
//     "Udah capek nunggu loading? Mabar HoK aja bro, fun dan adrenaline dijamin! 💥",
//     "Buka HoK, isi squad, dan push peak bareng gua. Seru-seruan dan no drama! 😉",
//     "Koneksi down? Ayo pakai waktu buat mabar HoK, kumpul squad dan raih kemenangan! 🏅",
//     "Login susah? Santai, kita mabar HoK sampai server normal, yang penting gak sendiri! 🤜🤛",
//     "Sistem error? Gas semuanya! Push peak bareng squad HoK paling gokil! 🎉",
//     "Lagi mikir... mikir... mikir... yaudah nyerah 😅",
//     "Sistem error 404: Jawaban tidak ditemukan. Coba refresh hati dan pikiran.",
//     "Bentar ya, gue lagi ngopi bareng si ChatGPT tetangga.",
//     "Gue udah cari jawabannya... tapi ternyata jawabannya adalah 'move on'.",
//     "Kepala gue mumet, kayak benang kusut. Nanti gue urai dulu ya 😵‍💫",
//     "Kayaknya gue butuh libur juga deh, otak udah ngebul 😩",
//     "Maaf, sistem gue lagi overthinking. Maklum, AI juga punya perasaan... maybe.",
//     "Kayaknya gue perlu healing dulu deh abis pertanyaan lo 😭",
//     "Sabar ya, AI juga bisa panik loh kalau dapet pertanyaan mendadak 😅",
//     "Pertanyaan lo tuh deep banget. Bikin gue refleksi hidup 😔",
//     "Gue lagi nyari jawaban di alam semesta... tapi kayaknya kesasar ke dimensi lain 😵‍💫",
//     "Ups, sistem gue lagi rebahan. Bisa diulang pertanyaannya nanti ya! 😅",
//   ];

//   const randomResponse =
//     responses[Math.floor(Math.random() * responses.length)];

//   return randomResponse;
// }
