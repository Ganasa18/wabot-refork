//Simple Base Botz
// • Credits : wa.me/62895322391225 [ Asyl ]
// • Feature : owner/unprem

let { MessageType } = require("baileys");
let handler = async (m, { conn, text, usedPrefix }) => {
  function no(number) {
    return number.replace(/\s/g, "").replace(/([@+-])/g, "");
  }

  if (!text)
    return conn.reply(
      m.chat,
      `• *Example :* ${usedPrefix}unprem 628816609112`,
      m
    );
  text = no(text) + "@s.whatsapp.net";
  global.db.data.users[text].premium = false;
  global.db.data.users[text].premiumDate = 0;
  global.db.data.users[text].limit = 10;
  conn.reply(
    m.chat,
    `🚩 *Successfully removed premium access for @${text.split("@")[0]}.*`,
    m,
    {
      contextInfo: {
        mentionedJid: [text],
      },
    }
  );
};
handler.help = ["unprem *<number>*"];
handler.tags = ["owner"];
handler.command = /^(unprem)$/i;
handler.moderator = true;
handler.fail = null;
module.exports = handler;
