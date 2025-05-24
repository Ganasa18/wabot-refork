/*
// Simple Base Botz
// • Credits : wa.me/62895322391225 [ Asyl ]
// • Feature : group/deleteintro
*/

const fs = require("fs");
const path = require("path");

// Path to database file
const DATABASE_PATH = path.join(__dirname, "../../json/intro.json");

// Delete an intro from the database
const deleteIntro = (groupId, userId) => {
  try {
    // Check if database file exists
    if (!fs.existsSync(DATABASE_PATH)) {
      return false;
    }

    // Read database
    const content = fs.readFileSync(DATABASE_PATH, "utf8");
    const db = JSON.parse(content);

    // Check if group and user exist in database
    if (!db[groupId] || !db[groupId][userId]) {
      return false;
    }

    // Delete user intro
    delete db[groupId][userId];

    // Clean up empty groups
    if (Object.keys(db[groupId]).length === 0) {
      delete db[groupId];
    }

    // Write back to database
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(db, null, 2));
    return true;
  } catch (error) {
    console.error("Error deleting intro:", error);
    return false;
  }
};

let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    // Get targetId - either from args (for admin) or sender (for self)
    let targetId = m.sender;
    let isAdmin = false;

    try {
      // Check if user is admin
      const groupMetadata = await conn.groupMetadata(m.chat);
      const participants = groupMetadata.participants || [];
      const admins = participants.filter((p) => p.admin).map((p) => p.id);
      isAdmin = admins.includes(m.sender);

      // If admin and mentioning someone
      if (isAdmin && m.mentionedJid && m.mentionedJid.length > 0) {
        targetId = m.mentionedJid[0];
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }

    // Delete intro
    const deleted = deleteIntro(m.chat, targetId);

    if (deleted) {
      // Check if deleting own intro or someone else's (admin only)
      if (targetId === m.sender) {
        return m.reply("✅ Intro kamu berhasil dihapus.");
      } else {
        try {
          const username = await conn.getName(targetId);
          return m.reply(
            `✅ Intro dari ${username || targetId} berhasil dihapus.`
          );
        } catch (error) {
          return m.reply(`✅ Intro pengguna berhasil dihapus.`);
        }
      }
    } else {
      // Check if deleting own intro or someone else's (admin only)
      if (targetId === m.sender) {
        return m.reply(
          "❌ Kamu belum mengisi intro atau intro sudah dihapus sebelumnya."
        );
      } else {
        try {
          const username = await conn.getName(targetId);
          return m.reply(
            `❌ ${
              username || targetId
            } belum mengisi intro atau intro sudah dihapus sebelumnya.`
          );
        } catch (error) {
          return m.reply(
            `❌ Pengguna tersebut belum mengisi intro atau intro sudah dihapus sebelumnya.`
          );
        }
      }
    }
  } catch (error) {
    console.error("Error in deleteintro command:", error);
    return m.reply("❌ Terjadi kesalahan. Silakan coba lagi nanti.");
  }
};

handler.help = ["deleteintro", "hapusintro"];
handler.tags = ["group"];
handler.command = /^(deleteintro|hapusintro|delintro)$/i;
handler.group = true;

module.exports = handler;
