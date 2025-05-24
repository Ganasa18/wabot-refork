let handler = async (m, { conn, usedPrefix, command, args, isOwner }) => {
  // Only allow bot owner to use this command
  if (!isOwner) {
    return m.reply("❌ Perintah ini hanya bisa digunakan oleh owner bot.");
  }

  const fs = require("fs");
  const path = require("path");

  // Database configurations
  const databases = {
    werewolf: {
      path: path.join(process.cwd(), "database", "../../json/werewolf.json"),
      memoryKey: "werewolf",
      initialData: {
        gameStates: {},
        playerGameMapping: {},
        lobbies: {},
        activeGames: [],
        lastUpdated: new Date().toISOString(),
        resetCount: 0,
        resetHistory: [],
      },
    },
    intro: {
      path: path.join(process.cwd(), "database", "../../json/intro.json"),
      memoryKey: "intro",
      initialData: {},
    },
  };

  const dbType = args[0]?.toLowerCase();

  // Show help if no argument provided
  if (!dbType) {
    const dbList = Object.keys(databases)
      .map((db) => `• ${db}`)
      .join("\n");
    return m.reply(`🗃️ **Reset Database Command**

**Penggunaan:** ${usedPrefix}${command} <type> [confirm]

**Database yang tersedia:**
${dbList}
• all - Reset semua database

**Contoh:**
${usedPrefix}${command} werewolf
${usedPrefix}${command} intro
${usedPrefix}${command} user confirm
${usedPrefix}${command} all confirm

**Note:** Tambahkan 'confirm' untuk langsung reset tanpa konfirmasi.`);
  }

  const confirmFlag = args[1]?.toLowerCase() === "confirm";

  // Function to create fresh database
  const createNewDatabase = (dbConfig) => {
    try {
      const dir = path.dirname(dbConfig.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        dbConfig.path,
        JSON.stringify(dbConfig.initialData, null, 2)
      );
      return true;
    } catch (error) {
      console.error(`Error creating database ${dbConfig.path}:`, error);
      return false;
    }
  };

  // Function to reset single database
  const resetDatabase = async (dbName, dbConfig) => {
    let dbExists = fs.existsSync(dbConfig.path);
    let oldData = null;
    let sessionCount = 0;

    if (dbExists) {
      try {
        const rawData = fs.readFileSync(dbConfig.path, "utf8");
        oldData = JSON.parse(rawData);
      } catch (error) {
        console.error(`Error reading ${dbName} database:`, error);
      }
    }

    // Delete old database if it exists
    if (dbExists) {
      try {
        fs.unlinkSync(dbConfig.path);
      } catch (error) {
        throw new Error(`Gagal menghapus database ${dbName}: ${error.message}`);
      }
    }

    // Create new database
    const created = createNewDatabase(dbConfig);
    if (!created) {
      throw new Error(`Gagal membuat database baru untuk ${dbName}`);
    }

    // Clear memory if exists
    if (conn[dbConfig.memoryKey]) {
      sessionCount = Object.keys(conn[dbConfig.memoryKey]).length;
      conn[dbConfig.memoryKey] = {};
    }

    return {
      dbName,
      existed: dbExists,
      sessionCount,
      path: dbConfig.path,
    };
  };

  try {
    if (dbType === "all") {
      // Reset all databases
      if (!confirmFlag) {
        return m.reply(`⚠️ **Konfirmasi Reset Semua Database**

Anda akan mereset SEMUA database bot:
${Object.keys(databases)
  .map((db) => `• ${db}.json`)
  .join("\n")}

⚠️ **PERINGATAN:** Semua data akan hilang permanen!

Ketik: ${usedPrefix}${command} all confirm`);
      }

      await m.reply("🔄 Memulai reset semua database...");

      const results = [];
      let totalSessions = 0;

      for (const [dbName, dbConfig] of Object.entries(databases)) {
        try {
          const result = await resetDatabase(dbName, dbConfig);
          results.push(result);
          totalSessions += result.sessionCount;
        } catch (error) {
          results.push({ dbName, error: error.message });
        }
      }

      // Generate report
      const successful = results.filter((r) => !r.error);
      const failed = results.filter((r) => r.error);

      let report = `✅ **Reset Database Selesai**\n\n`;
      report += `📊 **Ringkasan:**\n`;
      report += `• Berhasil: ${successful.length} database\n`;
      report += `• Gagal: ${failed.length} database\n`;
      report += `• Total sesi dihapus: ${totalSessions} sesi\n`;
      report += `• Waktu: ${new Date().toLocaleString("id-ID")}\n\n`;

      if (successful.length > 0) {
        report += `✅ **Berhasil direset:**\n`;
        successful.forEach((r) => {
          report += `• ${r.dbName}: ${
            r.existed ? "Dihapus & dibuat ulang" : "Dibuat baru"
          }\n`;
        });
      }

      if (failed.length > 0) {
        report += `\n❌ **Gagal direset:**\n`;
        failed.forEach((r) => {
          report += `• ${r.dbName}: ${r.error}\n`;
        });
      }

      await m.reply(report);
    } else if (databases[dbType]) {
      // Reset specific database
      const dbConfig = databases[dbType];

      if (!confirmFlag) {
        const dbExists = fs.existsSync(dbConfig.path);
        return m.reply(`⚠️ **Konfirmasi Reset Database ${dbType.toUpperCase()}**

Database: ${dbConfig.path}
Status: ${dbExists ? "Ada" : "Tidak ada"}

⚠️ **PERINGATAN:** Semua data ${dbType} akan hilang permanen!

Ketik: ${usedPrefix}${command} ${dbType} confirm`);
      }

      const result = await resetDatabase(dbType, dbConfig);

      await m.reply(`✅ **Database ${dbType.toUpperCase()} berhasil direset!**

📊 **Info Reset:**
• Database lama: ${result.existed ? "Dihapus" : "Tidak ada"}
• Database baru: Dibuat
• Sesi di memory: ${result.sessionCount} sesi dihapus
• Path: ${result.path}
• Waktu: ${new Date().toLocaleString("id-ID")}

🎮 Database siap digunakan.`);
    } else {
      // Invalid database type
      const dbList = Object.keys(databases)
        .map((db) => `• ${db}`)
        .join("\n");
      await m.reply(`❌ **Database tidak dikenal: ${dbType}**

Database yang tersedia:
${dbList}
• all

Gunakan: ${usedPrefix}${command} untuk melihat bantuan lengkap.`);
    }
  } catch (error) {
    console.error("Error in resetdb command:", error);
    await m.reply("❌ Terjadi error saat mereset database: " + error.message);
  }
};

handler.help = ["resetdb <type> [confirm]"];
handler.tags = ["owner"];
handler.command = /^(resetdb|dbreset|resetdatabase)$/i;
handler.rowner = true;
handler.owner = true;

module.exports = handler;
