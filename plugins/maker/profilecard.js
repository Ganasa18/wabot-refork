/**
 * Simple Base Botz
 * • Credits : wa.me/62895322391225 [ Asyl ]
 * • Feature : maker/profilecard
 **/

/**
 * Profile Card Generator
 * Format: nama|username|role
 **/

const { createCanvas, loadImage } = require("canvas");

let handler = async (m, { conn, usedPrefix, command, args }) => {
  try {
    // Jika tidak ada input, minta input
    if (args.length === 0) {
      await m.reply(
        `Kartu profil tidak dapat dibuat tanpa input. Silakan kirimkan perintah dengan format: \n\n*Nama|Username|Role*\n\nContoh: ${
          usedPrefix + command
        } Takashi Yamada|@shoyutakashi|DarkSistem`
      );
      return;
    }

    // Pisahkan input berdasarkan |
    let [name = "User", username = "@user", role = "Member"] = args
      .join(" ")
      .split("|");

    // Buat tanggal hari ini sebagai tanggal dibuat
    const today = new Date();
    const memberSince = today.toISOString().split("T")[0]; // format YYYY-MM-DD

    // Ambil foto profil pengguna
    let pp = await conn
      .profilePictureUrl(m.sender, "image")
      .catch((_) => "https://i.ibb.co/8zYj1Kb/avatar.jpg");
    // Gunakan URL alternatif untuk background
    let bg = await loadImage("https://i.ibb.co/7QpKsCX/bg.png").catch((_) => {
      // Fallback jika URL utama gagal
      return loadImage("https://i.postimg.cc/SKvmC0YG/gradient-bg.jpg").catch(
        (__) => {
          // Jika kedua URL gagal, buat canvas plain color sebagai fallback terakhir
          const fallbackCanvas = createCanvas(800, 500);
          const fallbackCtx = fallbackCanvas.getContext("2d");
          // Buat gradient background sebagai fallback
          const gradient = fallbackCtx.createLinearGradient(0, 0, 800, 500);
          gradient.addColorStop(0, "#2c3e50");
          gradient.addColorStop(1, "#4ca1af");
          fallbackCtx.fillStyle = gradient;
          fallbackCtx.fillRect(0, 0, 800, 500);
          return fallbackCanvas;
        }
      );
    });

    const canvas = createCanvas(800, 500);
    const ctx = canvas.getContext("2d");

    // Cek apakah bg adalah canvas fallback atau image
    if (bg.width) {
      // Jika bg adalah image
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    } else {
      // Jika bg adalah canvas fallback
      const tempCanvas = bg;
      const tempCtx = tempCanvas.getContext("2d");
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create rounded rectangle background for profile card
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.roundRect(40, 40, 720, 420, 30);
    ctx.fill();

    // Draw user avatar
    let avatar = await loadImage(pp);
    ctx.save();
    ctx.beginPath();
    ctx.arc(140, 160, 80, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 60, 80, 160, 160);
    ctx.restore();

    // Add name and username
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px Sans";
    ctx.fillText(name || "User", 260, 110);

    ctx.fillStyle = "#aaaaaa";
    ctx.font = "24px Sans";
    ctx.fillText(username || "@user", 260, 150);

    // Add social indicator
    ctx.fillStyle = "#007acc";
    ctx.beginPath();
    ctx.arc(
      260 + ctx.measureText(username || "@user").width + 25,
      140,
      8,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Add role with highlight
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px Sans";
    ctx.fillText("ROLE", 60, 290);

    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(60, 310, 30, 30);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Sans";
    ctx.fillText(role || "Member", 110, 330);

    // Add "MEMBER SINCE" section
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Sans";
    ctx.fillText("TANGGAL DIBUAT", 60, 400);

    ctx.fillStyle = "#dddddd";
    ctx.font = "18px Sans";
    ctx.fillText(memberSince, 60, 430);

    // Send the image
    await conn.sendMessage(
      m.chat,
      {
        image: canvas.toBuffer("image/png"),
        fileName: "profile-card.png",
      },
      {
        quoted: m,
      }
    );
  } catch (e) {
    console.error(e);
    await m.reply("Terjadi kesalahan saat membuat kartu profil.");
  }
};

handler.help = ["profilecard *[nama|username|role]*"];
handler.tags = ["maker"];
handler.command = /^profilecard$/i;
handler.register = true;
handler.premium = true;
handler.limit = true;
module.exports = handler;
