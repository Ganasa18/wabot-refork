//Simple Base Botz
// • Credits : wa.me/62895322391225 [ Asyl ]
// • Feature : info/verify

const handler = async (m, { conn, command, text, usedPrefix }) => {
  let user = global.db.data.users[m.sender];
  if (!user.registered) {
    let name = m.pushName;
    let age = Math.floor(Math.random() * (50 - 18 + 1)) + 18;
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
    user.name = name;
    user.age = age;
    user.registered = true;

    await m.reply(
      `Halo! Kamu telah terverify secara otomatis dengan nama ${name} dan umur ${age} tahun.`
    );
  } else {
    await m.reply(
      `Selamat datang kembali, ${user.name}! Kamu sudah terverify.`
    );
  }
};

handler.help = ["verify"];
handler.tags = ["main"];
handler.command = ["verify"];

module.exports = handler;
