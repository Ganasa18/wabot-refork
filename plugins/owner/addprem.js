//Simple Base Botz
// • Credits : wa.me/62895322391225 [ Asyl ]
// • Feature : owner/addprem

let { MessageType } = require("baileys");
let handler = async (m, { conn, text, usedPrefix }) => {
  function no(number) {
    return number.replace(/\s/g, "").replace(/([@+-])/g, "");
  }
  const isROwner = [
    conn.decodeJid(global.conn.user.id),
    ...global.owner.map((a) => a + "@s.whatsapp.net"),
  ].includes(m.sender);
  const isOwner = isROwner;

  if (isOwner) {
    return conn.reply(m.chat, `Owners sudah otomatis premium`, m);
  }

  var hl = [];
  hl[0] = text.split("|")[0];
  hl[0] = no(hl[0]) + "@s.whatsapp.net";
  hl[1] = text.split("|")[1];

  if (hl[1] == undefined) {
    return conn.reply(m.chat, `• *Example :* .addprem 628816609112|100`, m);
  }
  if (!text)
    return conn.reply(m.chat, `• *Example :* .addprem 628816609112|100`, m);
  if (typeof db.data.users[hl[0]] == "undefined")
    return conn.reply(m.chat, "🚩 Pengguna tidak ada didalam data base", m);
  var jumlahHari = 86400000 * hl[1];
  var now = new Date() * 1;
  global.db.data.users[hl[0]].premium = true;
  global.db.data.users[hl[0]].limit = 30;
  if (now < global.db.data.users[hl[0]].premiumDate)
    global.db.data.users[hl[0]].premiumDate += jumlahHari;
  else global.db.data.users[hl[0]].premiumDate = now + jumlahHari;
  conn.reply(
    m.chat,
    `• *UPGRADE PREMIUM*\n\nBerhasil menambahkan akses premium kepada *@${
      hl[0].split("@")[0]
    }* selama *${hl[1]} hari*.\n\n*Premium : ${msToDate(
      global.db.data.users[hl[0]].premiumDate - now
    )}*`,
    m,
    {
      contextInfo: {
        mentionedJid: [hl[0]],
      },
    }
  );
  conn.reply(
    hl[0],
    `• *UPGRADE PREMIUM*\n\nBerhasil menambahkan akses premium kepada *@${
      hl[0].split("@")[0]
    }* selama *${hl[1]} hari*.\n\n*Premium : ${msToDate(
      global.db.data.users[hl[0]].premiumDate - now
    )}*`,
    m,
    {
      contextInfo: {
        mentionedJid: [hl[0]],
      },
    }
  );
};
handler.help = ["addprem *<@tag|days>*"];
handler.tags = ["owner"];
handler.command = /^(addprem)$/i;
handler.Puki = true;
handler.fail = null;
handler.moderator = true;
module.exports = handler;

function msToDate(ms) {
  temp = ms;
  days = Math.floor(ms / (24 * 60 * 60 * 1000));
  daysms = ms % (24 * 60 * 60 * 1000);
  hours = Math.floor(daysms / (60 * 60 * 1000));
  hoursms = ms % (60 * 60 * 1000);
  minutes = Math.floor(hoursms / (60 * 1000));
  minutesms = ms % (60 * 1000);
  sec = Math.floor(minutesms / 1000);
  return days + ":" + hours + ":" + minutes + "";
}
