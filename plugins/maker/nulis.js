//Simple Base Botz
// • Credits : wa.me/62895322391225 [ Asyl ]
// • Feature : maker/nulis

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) throw `Example ${usedPrefix}nulis Teks Yang Ingin Kamu Tulis`;
  let kertas = `https://api.alfixd.my.id/api/nulis?text=${text}`;
  // Show processing reaction
  conn.sendMessage(m.chat, {
    react: {
      text: "⏳",
      key: m.key,
    },
  });
  await conn.sendFile(
    m.chat,
    kertas,
    "error.jpg",
    "Lain Kali Nulis Sendiri...",
    m
  );
};
handler.help = ["n"].map((v) => v + "ulis <teks>");
handler.tags = ["maker"];
handler.command = /^nulis$/i;
handler.register = true;
handler.premium = true;
handler.limit = true;
module.exports = handler;
