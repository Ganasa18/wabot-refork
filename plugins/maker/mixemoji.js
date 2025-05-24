const fs = require("fs");
const sharp = require("sharp");
const axios = require("axios");

let handler = async (m, { conn, text, command, usedPrefix }) => {
  if (!text) throw `Contoh: ${usedPrefix}mixemoji 😊,😂`;

  // Tunjukkan reaksi sedang memproses
  await conn.sendMessage(m.chat, {
    react: {
      text: "⏳",
      key: m.key,
    },
  });

  try {
    // Pisahkan emoji
    let [emoji1, emoji2] = text.split(/[, ]/).filter((e) => e.trim());

    if (!emoji1 || !emoji2)
      throw `Masukkan 2 emoji!\nContoh: ${usedPrefix}mixemoji 😊,😂`;

    // Validasi emoji
    const isEmoji = (str) => {
      // Regex yang lebih komprehensif untuk emoji modern
      const emojiRegex =
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}]/gu;
      return emojiRegex.test(str);
    };
    console.log(emoji1, emoji2);
    if (!isEmoji(emoji1) || !isEmoji(emoji2)) {
      throw "Input harus emoji!";
    }

    // Encode emoji untuk URL
    // Fungsi untuk encode emoji ke format percent-encoding
    const encodeEmoji = (emoji) => {
      return encodeURIComponent(emoji);
    };

    // URL API dengan emoji yang sudah di-encode
    let url = `https://flowfalcon.dpdns.org/tools/emojimix?emoji1=${encodeEmoji(
      emoji1
    )}&emoji2=${encodeEmoji(emoji2)}`;

    console.log("Request URL:", url); // Untuk debugging

    let { data } = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!data) throw "Gagal mendapatkan gambar mix emoji!";

    // Konversi ke sticker
    let sticker = await sharp(data).resize(512, 512).toFormat("png").toBuffer();

    await conn.sendMessage(
      m.chat,
      {
        sticker: sticker,
      },
      { quoted: m }
    );
  } catch (e) {
    console.error(e);
    await conn.sendMessage(m.chat, {
      react: {
        text: "❌",
        key: m.key,
      },
    });
    throw "Gagal membuat sticker. Coba emoji lain!";
  }
};

handler.help = ["mixemoji <emoji1>,<emoji2>"];
handler.tags = ["sticker"];
handler.command = /^(mixemoji|mixemoji)$/i;
handler.register = true;
handler.premium = true;
handler.limit = true;
module.exports = handler;
