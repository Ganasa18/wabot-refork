/*
// Simple Base Botz
// • Credits : wa.me/62895322391225 [ Asyl ]
// • Feature : group/listintro
*/

const fs = require("fs");
const path = require("path");

// Path to database file
const DATABASE_PATH = path.join(__dirname, "intro.json");

// Get intro data for a group
const getIntros = (groupId) => {
  try {
    // Check if database file exists
    if (!fs.existsSync(DATABASE_PATH)) {
      return null;
    }

    // Read database
    const content = fs.readFileSync(DATABASE_PATH, "utf8");
    const db = JSON.parse(content);

    // Check if group exists in database
    if (!db[groupId]) {
      return null;
    }

    return db[groupId];
  } catch (error) {
    console.error("Error reading intros:", error);
    return null;
  }
};

let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    // Get group members with intros
    const intros = getIntros(m.chat);

    // Check if any intros exist
    if (!intros || Object.keys(intros).length === 0) {
      return m.reply("❌ Belum ada member yang mengisi intro di grup ini.");
    }

    // Create list of intros
    let introList = `*[ DAFTAR INTRO MEMBER ]*\n`;
    introList += `*Total: ${Object.keys(intros).length} member*\n\n`;

    let num = 1;
    for (const [userId, data] of Object.entries(intros)) {
      // Get user mention
      let userMention;
      try {
        const user = await conn.getName(userId);
        userMention = user || "Unknown User";
      } catch (error) {
        userMention = "Unknown User";
      }

      // Add to list
      introList += `*${num++}. ${userMention}*\n`;
      introList += `𝐍𝐚𝐦𝐚 : ${data.nama}\n`;
      introList += `𝐀𝐬𝐚𝐥  : ${data.asal}\n`;
      introList += `𝐆𝐞𝐧𝐝𝐞𝐫 : ${data.gender}\n`;
      introList += `IGN : ${data.ign}\n`;
      introList += `ROLE : ${data.role}\n\n`;
    }

    introList += `\nUntuk mengisi intro, ketik: ${usedPrefix}intro`;

    return m.reply(introList);
  } catch (error) {
    console.error("Error in listintro command:", error);
    return m.reply("❌ Terjadi kesalahan. Silakan coba lagi nanti.");
  }
};

handler.help = ["listintro"];
handler.tags = ["group"];
handler.command = /^(listintro|introlist|daftarintro)$/i;
handler.group = true;

module.exports = handler;
