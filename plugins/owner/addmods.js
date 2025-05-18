let { MessageType } = require("baileys");
let handler = async (m, { conn, text, usedPrefix }) => {
  function no(number) {
    return number.replace(/\s/g, "").replace(/([@+-])/g, "");
  }

  var hl = no(text) + "@s.whatsapp.net";

  if (!text)
    return conn.reply(m.chat, `• *Example :* .addmods 628816609112`, m);
  if (typeof db.data.users[hl] == "undefined")
    return conn.reply(m.chat, "🚩 Pengguna tidak ada didalam data base", m);

  global.db.data.users[hl].mod = true;

  conn.reply(
    m.chat,
    `• *GRANT MODERATOR*\n\nBerhasil menambahkan akses moderator kepada *@${
      hl.split("@")[0]
    }*.\n\n*Status : Permanent*`,
    m,
    {
      contextInfo: {
        mentionedJid: [hl],
      },
    }
  );
  conn.reply(
    hl,
    `• *GRANT MODERATOR*\n\nAnda telah diberikan akses moderator oleh owner.\n\n*Status : Permanent*`,
    m,
    {
      contextInfo: {
        mentionedJid: [hl],
      },
    }
  );
};
handler.help = ["addmods *<@tag>*"];
handler.tags = ["owner"];
handler.command = /^(addmods)$/i;
handler.Puki = true;
handler.fail = null;
handler.owner = true;
handler.rowner = true;
module.exports = handler;
