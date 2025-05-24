const moment = require("moment-timezone");
const schedule = require("node-schedule");

let handler = async (m, { conn, text, usedPrefix, command }) => {
  // Check if user has permission
  const isMods = global.db.data.users[m.sender].moderator;
  if (!m.isGroup)
    return m.reply("Perintah ini hanya dapat digunakan dalam grup!");
  if (!isMods)
    return m.reply("Perintah ini hanya dapat digunakan oleh admin grup!");

  if (!text) {
    return m.reply(
      `*Format salah!* 🚫\n\nPenggunaan:\n${
        usedPrefix + command
      } <waktu> <satuan>\n\nContoh:\n${usedPrefix + command} 1 jam\n${
        usedPrefix + command
      } 2 hari\n${usedPrefix + command} 30 menit`
    );
  }

  let [timeValue, timeUnit] = text.split(" ");
  timeValue = parseInt(timeValue);

  // Validate input
  if (isNaN(timeValue) || timeValue <= 0) {
    return m.reply("Waktu harus berupa angka positif!");
  }

  // Normalize time unit
  timeUnit = timeUnit.toLowerCase();

  // Calculate time in milliseconds
  let timeInMs;
  let timeText;

  if (timeUnit === "detik" || timeUnit === "second" || timeUnit === "s") {
    timeInMs = timeValue * 1000;
    timeText = `${timeValue} detik`;
  } else if (
    timeUnit === "menit" ||
    timeUnit === "minute" ||
    timeUnit === "m"
  ) {
    timeInMs = timeValue * 60 * 1000;
    timeText = `${timeValue} menit`;
  } else if (timeUnit === "jam" || timeUnit === "hour" || timeUnit === "h") {
    timeInMs = timeValue * 60 * 60 * 1000;
    timeText = `${timeValue} jam`;
  } else if (timeUnit === "hari" || timeUnit === "day" || timeUnit === "d") {
    timeInMs = timeValue * 24 * 60 * 60 * 1000;
    timeText = `${timeValue} hari`;
  } else {
    return m.reply(
      "Satuan waktu tidak valid! Gunakan: detik, menit, jam, atau hari"
    );
  }

  // Calculate the closing time
  const closeTime = new Date(Date.now() + timeInMs);
  const formattedCloseTime = moment(closeTime).format("DD MMMM YYYY HH:mm:ss");

  // Save the group close schedule to database or global variable
  if (!global.db.data.chats) global.db.data.chats = {};
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};

  global.db.data.chats[m.chat].autoClose = {
    enabled: true,
    closeTime: closeTime.getTime(),
  };

  const closeJob = schedule.scheduleJob(closeTime, async function () {
    if (global.db.data.chats[m.chat]?.autoClose?.enabled) {
      try {
        await conn.sendMessage(m.chat, {
          text: `⏰ *WAKTU HABIS!* ⏰\n\nGrup akan ditutup sesuai jadwal yang telah ditentukan.`,
        });

        // Close the group (set to admin-only)
        await conn.groupSettingUpdate(m.chat, "announcement");

        // Remove the schedule
        delete global.db.data.chats[m.chat].autoClose;
      } catch (error) {
        console.error("Error in auto close job:", error);
      }
    }
  });

  // Send confirmation message
  let groupInfo = await conn.groupMetadata(m.chat);
  let groupName = groupInfo.subject;

  let message = `🔒 *AUTO CLOSE GROUP* 🔒\n\n`;
  message += `Grup: *${groupName}*\n`;
  message += `Akan ditutup dalam: *${timeText}*\n`;
  message += `Waktu penutupan: *${formattedCloseTime}*\n\n`;
  message += `Grup akan otomatis diubah menjadi "hanya admin" pada waktu yang ditentukan.`;

  let pp = await conn.profilePictureUrl(m.chat).catch((_) => null);
  await conn.sendMessage(m.chat, {
    text: message,
    contextInfo: {
      externalAdReply: {
        title: "⏱️ AUTO CLOSE GROUP ACTIVATED",
        body: `${timeText} remaining`,
        thumbnailUrl: pp,
        sourceUrl: "https://wa.me/62895322391225",
        mediaType: 1,
        renderLargerThumbnail: true,
      },
    },
  });
};

// Add function to check all group statuses regularly
function checkGroupStatus(conn) {
  if (!global.db || !global.db.data || !global.db.data.chats) return;

  const now = Date.now();

  Object.entries(global.db.data.chats).forEach(async ([chatId, chat]) => {
    if (
      chat.autoClose &&
      chat.autoClose.enabled &&
      chat.autoClose.closeTime <= now
    ) {
      try {
        // Send notification
        await conn.sendMessage(chatId, {
          text: `⏰ *WAKTU HABIS!* ⏰\n\nGrup akan ditutup sesuai jadwal yang telah ditentukan.`,
        });

        // Close the group
        await conn.groupSettingUpdate(chatId, "announcement");

        // Remove the schedule
        delete global.db.data.chats[chatId].autoClose;
      } catch (error) {
        console.error("Error in auto close check:", error);
      }
    }
  });
}

// Run check every minute to ensure no schedules are missed
schedule.scheduleJob("* * * * *", () => {
  checkGroupStatus(global.conn);
});

// Command setup
handler.help = ["autoclose <time> <unit>"];
handler.tags = ["group"];
handler.command = /^(autoclose|tutupgrup|tutupgroup)$/i;

handler.group = true;
handler.admin = true;
handler.botAdmin = true;
handler.moderator = true;

// example :
// .autoclose 2 jam    (closes group after 2 hours)
// .tutupgrup 30 menit (closes group after 30 minutes)
// .closegroup 1 hari  (closes group after 1 day)

module.exports = handler;
