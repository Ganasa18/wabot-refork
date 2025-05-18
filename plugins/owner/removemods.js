let { MessageType } = require("baileys");
let handler = async (m, { conn, text, usedPrefix }) => {
  function no(number) {
    return number.replace(/\s/g, "").replace(/([@+-])/g, "");
  }

  var hl = no(text) + "@s.whatsapp.net";

  if (!text)
    return conn.reply(m.chat, `• *Example :* .removemods 628816609112`, m);
  if (typeof db.data.users[hl] == "undefined")
    return conn.reply(m.chat, "🚩 Pengguna tidak ada didalam database", m);

  if (!global.db.data.users[hl].mod)
    return conn.reply(m.chat, "🚩 User ini bukan moderator!", m);

  global.db.data.users[hl].mod = false;

  conn.reply(
    m.chat,
    `• *REMOVE MODERATOR*\n\nBerhasil mencabut akses moderator dari *@${
      hl.split("@")[0]
    }*.\n\n*Status : Bukan Moderator*`,
    m,
    {
      contextInfo: {
        mentionedJid: [hl],
      },
    }
  );
  conn.reply(
    hl,
    `• *MODERATOR REMOVED*\n\nAkses moderator Anda telah dicabut oleh owner.\n\n*Status : Bukan Moderator*`,
    m,
    {
      contextInfo: {
        mentionedJid: [hl],
      },
    }
  );
};

handler.help = ["removemods *<@tag>*"];
handler.tags = ["owner"];
handler.command = /^(removemods|delmods|rmmods)$/i;
handler.Puki = true;
handler.fail = null;
handler.rowner = true;
handler.owner = true;
module.exports = handler;
