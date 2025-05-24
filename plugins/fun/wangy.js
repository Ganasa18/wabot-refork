let handler = async (m, { conn, text, command, args }) => {
  // Show processing reaction
  await conn.sendMessage(m.chat, {
    react: {
      text: "⏳",
      key: m.key,
    },
  });

  const subCommand = args[0] ? args[0].toLowerCase() : "";

  if (command == "wangy") {
    if (subCommand == "genjot") {
      if (!text) throw `Masukkan text!`;
      let awikwok = `Buruan, panggil gue SIMP, ato BAPERAN. ini MURNI PERASAAN GUE. Gue pengen genjot bareng ${text}. Ini seriusan, suaranya yang imut, mukanya yang cantik, apalagi badannya yang aduhai ningkatin gairah gue buat genjot ${text}. Setiap lapisan kulitnya pengen gue jilat. Saat gue mau crot, gue bakal moncrot sepenuh hati, bisa di perut, muka, badan, teteknya, sampai lubang burit pun bakal gue crot sampai puncak klimaks. Gue bakal meluk dia abis gue moncrot, lalu nanya gimana kabarnya, ngrasain enggas bareng saat telanjang. Dia bakal bilang kalau genjotan gue mantep dan nyatain perasaannya ke gue, bilang kalo dia cinta ama gue. Gue bakal bilang balik seberapa gue cinta ama dia, dan dia bakal kecup gue di pipi. Terus kita ganti pakaian dan ngabisin waktu nonton film, sambil pelukan ama makan hidangan favorit. Gue mau ${text} jadi pacar, pasangan, istri, dan idup gue. Gue cinta dia dan ingin dia jadi bagian tubuh gue. Lo kira ini copypasta? Kagak cok. Gue ngetik tiap kata nyatain prasaan gue. Setiap kali elo nanya dia siapa, denger ini baik-baik : DIA ISTRI GUE. Gue sayang ${text}, dan INI MURNI PIKIRAN DAN PERASAAN GUE.`;
      await m.reply(
        awikwok,
        null,
        m.mentionedJid
          ? {
              mentions: m.mentionedJid,
            }
          : {}
      );
    } else {
      if (!text) throw `Masukkan text!`;
      let awikwok = `${text} ${text} ${text} ❤️ ❤️ ❤️ WANGI WANGI WANGI WANGI HU HA HU HA HU HA, aaaah baunya rambut ${text} wangi aku mau nyiumin aroma wanginya ${text} AAAAAAAAH ~ Rambutnya.... aaah rambutnya juga pengen aku elus-elus ~~ AAAAAH ${text} keluar pertama kali di anime juga manis ❤️ ❤️ ❤️ banget AAAAAAAAH ${text} AAAAA LUCCUUUUUUUUUUUUUUU............ ${text} AAAAAAAAAAAAAAAAAAAAGH ❤️ ❤️ ❤️apa ? ${text} itu gak nyata ? Cuma HALU katamu ? nggak, ngak ngak ngak ngak NGAAAAAAAAK GUA GAK PERCAYA ITU DIA NYATA NGAAAAAAAAAAAAAAAAAK PEDULI BANGSAAAAAT !! GUA GAK PEDULI SAMA KENYATAAN POKOKNYA GAK PEDULI. ❤️ ❤️ ❤️ ${text} gw ... ${text} di laptop ngeliatin gw, ${text} .. kamu percaya sama aku ? aaaaaaaaaaah syukur ${text} aku gak mau merelakan ${text} aaaaaah ❤️ ❤️ ❤️ YEAAAAAAAAAAAH GUA MASIH PUNYA ${text} SENDIRI PUN NGGAK SAMA AAAAAAAAAAAAAAH`;
      await m.reply(
        awikwok,
        null,
        m.mentionedJid
          ? {
              mentions: m.mentionedJid,
            }
          : {}
      );
    }
  }
};

handler.help = ["wangy <nama>", "wangy genjot <nama>"];
handler.tags = ["fun"];
handler.command = /^(wangy)$/i;
handler.limit = true;
handler.group = true;
handler.register = true;

module.exports = handler;
