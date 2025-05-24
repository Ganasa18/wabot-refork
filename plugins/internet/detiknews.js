//Simple Base Botz
// • Credits : wa.me/62895322391225 [ Asyl ]
// • Feature : internet/detiknews

const fetch = require("node-fetch");

let handler = async (m, { conn }) => {
  try {
    await conn.sendMessage(m.chat, {
      react: {
        text: "⏳",
        key: m.key,
      },
    });

    const res = await fetch("https://api.alfixd.my.id/api/detiknews");
    const { status, source, result } = await res.json();

    if (!status || !result || !result.length) {
      throw "Failed to fetch news or no news available";
    }

    let newsList = `📰 *DETIK NEWS UPDATE* 📰\n`;
    newsList += `🔗 *Source:* ${source}\n`;
    newsList += `📅 *Date:* ${new Date().toLocaleDateString("id-ID")}\n\n`;

    result.slice(0, 10).forEach((item, index) => {
      newsList += `*${index + 1}. ${item.title}*\n`;
      newsList += `▸ ${item.link}\n\n`;
    });

    newsList += `ℹ️ Total ${result.length} news items fetched`;

    await conn.reply(m.chat, newsList, m, {
      contextInfo: {
        externalAdReply: {
          title: "Detik News Update",
          body: "Latest news from Detik.com",
          thumbnailUrl: "https://i.ibb.co/0nY4L6y/detik.jpg",
          sourceUrl: source,
          mediaType: 1,
        },
      },
    });
  } catch (e) {
    console.error("News Error:", e);
    await conn.reply(
      m.chat,
      "❌ Failed to fetch news. Please try again later.",
      m
    );
  }
};

handler.help = ["detiknews"];
handler.tags = ["internet"];
// handler.command = /^(detiknews|newsdetik|)$/i;
// handler.limit = true;
// handler.group = false;
// handler.mods = true;

module.exports = handler;
