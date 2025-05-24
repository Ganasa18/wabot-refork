//Simple Base Botz
// • Credits : wa.me/6285822146627 [ Nazir ]
// • Feature : info/info-daftar

const { createHash } = require("crypto");
let Reg = /\|?(.*)([.|] *?)([0-9]*)$/i;
let handler = async function (m, { text, usedPrefix }) {
  let user = global.db.data.users[m.sender];
  if (user.registered === true)
    throw `Anda sudah terdaftar\nMau daftar ulang? ${usedPrefix}unreg <SN|SERIAL NUMBER>`;
  if (!Reg.test(text)) throw `Format salah\n*${usedPrefix}daftar nama.umur*`;
  let [_, name, splitter, age] = text.match(Reg);
  if (!name) throw "Nama tidak boleh kosong (Alphanumeric)";
  if (!age) throw "Umur tidak boleh kosong (Angka)";
  age = parseInt(age);
  if (age > 120) throw "Umur terlalu tua 😂";
  if (age < 5) throw "Bayi bisa ngetik sesuai format bjir ._.";

  const isROwner = [
    conn.decodeJid(global.conn.user.id),
    ...global.owner.map((a) => a + "@s.whatsapp.net"),
  ].includes(m.sender);
  const isOwner = isROwner || m.fromMe;
  const isMods = global.db.data.users[m.sender].moderator;
  const isPrems = global.db.data.users[m.sender].premium;
  console.log(`isOwner: ${isOwner}, isMods: ${isMods}, isPrems: ${isPrems}`);
  if (isOwner && isPrems && isMods) {
    user.limit = null;
  } else if (isPrems && isMods) {
    user.limit = 30;
  } else {
    user.limit = 10;
  }

  user.name = name.trim();
  user.age = age;

  user.regTime = +new Date();
  user.registered = true;
  let sn = createHash("md5").update(m.sender).digest("hex");
  m.reply(
    `
Daftar berhasil!

╭─「 Info 」
│ Nama: ${name}
│ Umur: ${age} tahun 
╰────
Serial Number: 
${sn}
`.trim()
  );
};
handler.help = ["daftar"].map((v) => v + " <nama>.<umur>");
handler.tags = ["main"];

handler.command = /^(daftar|reg(ister)?)$/i;

module.exports = handler;
