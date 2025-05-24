/*
// Simple Base Botz
// • Credits : wa.me/62895322391225 [ Asyl ]
// • Feature : group/listintro with CSV download
*/

const fs = require("fs");
const path = require("path");

// Path to database file
const DATABASE_PATH = path.join(__dirname, "../../json/intro.json");

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

// Function to generate CSV content
const generateCSV = (intros) => {
  let csvContent = "No;User ID;Nama;Asal;Gender;IGN;Role\n";

  let num = 1;
  for (const [userId, data] of Object.entries(intros)) {
    csvContent += `${num++};${userId};${data.nama};${data.asal};${
      data.gender
    };${data.ign};${data.role}\n`;
  }

  return csvContent;
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

    introList += `\nUntuk mengisi intro, ketik: ${usedPrefix}intro\n\n`;
    introList += `*Download CSV:* ${usedPrefix}listintro csv`;

    // Check if CSV download is requested
    if (args[0]?.toLowerCase() === "csv") {
      const csvContent = generateCSV(intros);
      const filename = `intro_${m.chat}_${Date.now()}.csv`;

      // Save temporary file
      fs.writeFileSync(filename, csvContent);

      // Send file
      await conn.sendMessage(m.chat, {
        document: fs.readFileSync(filename),
        fileName: filename,
        mimetype: "text/csv",
      });

      // Delete temporary file
      fs.unlinkSync(filename);
      return;
    }

    return m.reply(introList);
  } catch (error) {
    console.error("Error in listintro command:", error);
    return m.reply("❌ Terjadi kesalahan. Silakan coba lagi nanti.");
  }
};

handler.help = ["listintro [csv]"];
handler.tags = ["group"];
handler.command = /^(listintro|introlist)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

module.exports = handler;
