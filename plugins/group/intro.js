/*
// Simple Base Botz
// • Credits : wa.me/62895322391225 [ Asyl ]
// • Feature : group/intro
*/

const fs = require("fs");
const path = require("path");

// Path to database file
const DATABASE_PATH = path.join(__dirname, "intro.json");

// Ensure database file exists
const ensureDatabase = () => {
  try {
    if (!fs.existsSync(DATABASE_PATH)) {
      // Create directory if it doesn't exist
      const dir = path.dirname(DATABASE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Create empty database file
      fs.writeFileSync(DATABASE_PATH, JSON.stringify({}));
    }
  } catch (error) {
    console.error("Error creating database file:", error);
  }
};

// Save intro data
const saveIntro = (groupId, userId, data) => {
  try {
    ensureDatabase();

    // Read current database
    let db = {};
    try {
      const content = fs.readFileSync(DATABASE_PATH, "utf8");
      db = JSON.parse(content);
    } catch (error) {
      console.error("Error reading database:", error);
    }

    // Initialize group if not exists
    if (!db[groupId]) {
      db[groupId] = {};
    }

    // Save user data
    db[groupId][userId] = {
      ...data,
      timestamp: Date.now(),
    };

    // Write back to database
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(db, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving intro data:", error);
    return false;
  }
};

// Check if a user already has an intro in a group
const hasIntro = (groupId, userId) => {
  try {
    // Check if database file exists
    if (!fs.existsSync(DATABASE_PATH)) {
      return false;
    }

    // Read database
    const content = fs.readFileSync(DATABASE_PATH, "utf8");
    const db = JSON.parse(content);

    // Check if group and user exist in database
    return !!(db[groupId] && db[groupId][userId]);
  } catch (error) {
    console.error("Error checking intro existence:", error);
    return false;
  }
};

// Get user's existing intro data
const getUserIntro = (groupId, userId) => {
  try {
    // Check if database file exists
    if (!fs.existsSync(DATABASE_PATH)) {
      return null;
    }

    // Read database
    const content = fs.readFileSync(DATABASE_PATH, "utf8");
    const db = JSON.parse(content);

    // Get user data if exists
    if (db[groupId] && db[groupId][userId]) {
      return db[groupId][userId];
    }

    return null;
  } catch (error) {
    console.error("Error getting user intro:", error);
    return null;
  }
};

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    // Extract flags from command
    const isForceUpdate = /--force/i.test(text);
    if (isForceUpdate) {
      text = text.replace(/--force/i, "").trim();
    }

    // Check if user is viewing their intro, showing the form, or updating
    if (!text) {
      // Check if user already has an intro
      const existingIntro = getUserIntro(m.chat, m.sender);

      if (existingIntro) {
        // Show existing intro
        const introCard = `[ 𝐊𝐚𝐫𝐭𝐮 𝐈𝐧𝐭𝐫𝐨 ]
𝐍𝐚𝐦𝐚 : ${existingIntro.nama}
𝐀𝐬𝐚𝐥  : ${existingIntro.asal}
𝐆𝐞𝐧𝐝𝐞𝐫 : ${existingIntro.gender}
IGN : ${existingIntro.ign}
ROLE : ${existingIntro.role}

Kamu sudah memiliki intro. Untuk mengubah intro, gunakan:
${usedPrefix}intro --force Nama|Asal|Gender|IGN|Role

Untuk menghapus intro, gunakan:
${usedPrefix}deleteintro`;

        return m.reply(introCard);
      }

      // Show intro form
      let pp;
      try {
        pp = await conn.profilePictureUrl(m.chat).catch((_) => null);
      } catch (error) {
        pp = null;
      }

      const krtu = `[ 𝐊𝐚𝐫𝐭𝐮 𝐈𝐧𝐭𝐫𝐨 ]
𝐍𝐚𝐦𝐚 :
𝐀𝐬𝐚𝐥  :
𝐆𝐞𝐧𝐝𝐞𝐫 :
IGN :
ROLE :

Silahkan isi data intro kamu dengan format:
${usedPrefix}intro Nama|Asal|Gender|IGN|Role

Contoh:
${usedPrefix}intro Asyl|Jakarta|Pria|AsylXYZ|Support`;

      return m.reply(krtu);
    }

    // Parse the submitted data
    const [nama, asal, gender, ign, role] = text
      .split("|")
      .map((item) => item.trim());

    // Validate submitted data
    if (!nama || !asal || !gender || !ign || !role) {
      return m.reply(`⚠️ Format intro tidak valid! Gunakan format:
${usedPrefix}intro Nama|Asal|Gender|IGN|Role`);
    }

    // Check if user already has an intro
    if (hasIntro(m.chat, m.sender) && !isForceUpdate) {
      return m.reply(`⚠️ Kamu sudah memiliki intro!

Untuk melihat intro kamu, ketik:
${usedPrefix}intro

Untuk mengubah intro, gunakan:
${usedPrefix}intro --force Nama|Asal|Gender|IGN|Role

Untuk menghapus intro, gunakan:
${usedPrefix}deleteintro`);
    }

    // Save to database
    const userData = { nama, asal, gender, ign, role };
    const saved = saveIntro(m.chat, m.sender, userData);

    if (saved) {
      // Create formatted card
      const introCard = `[ 𝐊𝐚𝐫𝐭𝐮 𝐈𝐧𝐭𝐫𝐨 ]
𝐍𝐚𝐦𝐚 : ${nama}
𝐀𝐬𝐚𝐥  : ${asal}
𝐆𝐞𝐧𝐝𝐞𝐫 : ${gender}
IGN : ${ign}
ROLE : ${role}

✅ Intro berhasil ${isForceUpdate ? "diperbarui" : "disimpan"}!`;

      return m.reply(introCard);
    } else {
      return m.reply("❌ Terjadi kesalahan saat menyimpan intro.");
    }
  } catch (error) {
    console.error("Error in intro command:", error);
    return m.reply("❌ Terjadi kesalahan. Silakan coba lagi nanti.");
  }
};

handler.help = ["intro"];
handler.tags = ["group"];
handler.command = /^(intro)$/i;

module.exports = handler;
