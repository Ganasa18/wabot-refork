/*Code By Nazir
 * Credits : Nazir
 * GcBot : https://chat.whatsapp.com/DwiyKDLAuwjHqjPasln3WP
 * !Note : Jangan Perjualbelikan Script ini tanpa izin @Nazir
 */

const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process"); // Added for ffmpeg execution
let moment = require("moment-timezone");

// Helper function to check if ffmpeg is installed
const checkFfmpeg = () => {
  return new Promise((resolve, reject) => {
    exec("ffmpeg -version", (error) => {
      if (error) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};

const handler = async (m, { conn, text, usedPrefix }) => {
  // Validate the input text
  if (!text)
    throw `Gunakan perintah ini dengan format: ${usedPrefix}brat <teks>`;
  if (text.length >= 50)
    throw `[❗] You Can't Use Brat Because It's Oversized You Can't Use Brat Because You're Over 50 Text`;

  // Check if ffmpeg is installed
  const ffmpegInstalled = await checkFfmpeg();
  if (!ffmpegInstalled) {
    return m.reply(
      "Error: FFmpeg is not installed. Please install FFmpeg to use this command."
    );
  }

  // Show processing reaction
  conn.sendMessage(m.chat, {
    react: {
      text: "⏳",
      key: m.key,
    },
  });

  try {
    let name = m.pushName || conn.getName(m.sender);

    // First API endpoint
    let url = `https://brat.caliphdev.com/api/brat?text=${encodeURIComponent(
      text
    )}`;
    let response;
    let useBackupApi = false;

    try {
      response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000, // Add timeout
      });
    } catch (error) {
      console.log("Primary API failed, trying backup API");
      useBackupApi = true;
    }

    // If primary API fails, use backup API
    if (useBackupApi) {
      url = `https://aqul-brat.hf.space/api/brat?text=${encodeURIComponent(
        text
      )}`;
      response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000, // Add timeout
      });
    }

    // Create a unique filename with timestamp
    const tempFilePath = `./temp_${Date.now()}.jpg`;

    // Save the image temporarily
    fs.writeFileSync(tempFilePath, response.data);

    // Show success reaction
    conn.sendMessage(m.chat, {
      react: {
        text: "✅",
        key: m.key,
      },
    });

    // Send as sticker with proper timezone
    const timezone = "Asia/Jakarta";
    await conn.sendImageAsSticker(m.chat, tempFilePath, m, {
      packname: `Time: ${moment.tz(timezone).format("HH:mm DD/MM/YY")}`,
      author: `Created By ${name}\n© Asyl`,
    });

    // Delete the temporary file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  } catch (error) {
    console.error("Error in brat handler:", error);
    conn.sendMessage(m.chat, {
      react: {
        text: "❌",
        key: m.key,
      },
    });
    m.reply("Error processing your request. Please try again later.");
  }
};

handler.help = ["brat"].map((a) => a + " *[text]*");
handler.tags = ["maker"];
handler.command = /^brat$/i;
handler.register = true;
handler.premium = true;
handler.limit = true;
module.exports = handler;
