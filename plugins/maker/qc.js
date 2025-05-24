/**
 * Simple Base Botz
 * • Credits : wa.me/6285822146627 [ Nazir ]
 * • Feature : maker/qc with Canvas implementation (no external API dependency)
 */
// const { Sticker } = require("akiraa-scrape");
// const axios = require("axios");
let moment = require("moment-timezone");
// Require canvas for generating quotes directly
const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs").promises;
const path = require("path");

const handler = async (m, { conn, args }) => {
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || "";

  // Show processing reaction
  conn.sendMessage(m.chat, {
    react: {
      text: "⏳",
      key: m.key,
    },
  });

  let reply;
  if (!m.quoted) {
    reply = {};
  } else if (!q.sender === q.sender) {
    reply = {
      name: q.name,
      text: q.text || "",
      chatId: q.chat.split("@")[0],
    };
  }

  let text;
  let customName = null;
  let textSize = 36; // Default text size

  // Parse arguments for custom name, text size, and text
  if (args.length >= 1) {
    const fullArgs = args.join(" ");

    // Check if there are custom parameters specified with |
    if (fullArgs.includes("|")) {
      const parts = fullArgs.split("|");
      text = parts[0].trim();

      if (parts[1]) {
        customName = parts[1].trim();
      }

      if (parts[2]) {
        const size = parseInt(parts[2].trim());
        if (!isNaN(size) && size >= 12 && size <= 72) {
          textSize = size;
        }
      }
    } else {
      text = fullArgs;
    }
  } else if (m.quoted) {
    text = m.quoted.text || "";
  } else {
    throw "*• Example :*\n.qc *[text]*\n.qc *[text]|[custom name]*\n.qc *[text]|[custom name]|[text size]*\n.qc *[reply message]*\n.qc *[reply message]|[custom name]|[text size]*";
  }

  // If no text provided, throw error
  if (!text) {
    throw "*• Example :*\n.qc *[text]*\n.qc *[text]|[custom name]*\n.qc *[text]|[custom name]|[text size]*\n.qc *[reply message]*\n.qc *[reply message]|[custom name]|[text size]*";
  }

  // const img = await q.download?.();

  // Determine profile picture based on whether custom name is used
  let pp;
  if (customName) {
    // If custom name is used, use default/anonymous profile picture
    pp = "https://telegra.ph/file/320b066dc81928b782c7b.png";
  } else {
    // If using original name, use sender's profile picture
    pp = await conn
      .profilePictureUrl(q.sender, "image")
      .catch((_) => "https://telegra.ph/file/320b066dc81928b782c7b.png");
  }

  // Use a solid color background like in the example
  let bgColor = "#262626"; // Dark gray background similar to the example

  try {
    // Create Canvas quote directly instead of using external API
    const createQuoteCanvas = async () => {
      try {
        // Canvas dimensions - wider and taller for better text display
        const width = 800;
        const height = 600;

        // Create canvas
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        // Background - solid color like in the example
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        // Define padding and positioning constants
        const PADDING_TOP = 40; // Top padding
        const PADDING_SIDE = 50; // Side padding
        const PROFILE_SIZE = 60; // Profile picture size
        const HEADER_HEIGHT = 120; // Total header section height

        // Add profile picture (with proper padding from top)
        let profilePic;
        try {
          profilePic = await loadImage(pp);
        } catch (e) {
          console.log("Error loading profile picture:", e);
          profilePic = await loadImage(
            "https://telegra.ph/file/320b066dc81928b782c7b.png"
          );
        }

        // Make profile picture circular (with padding from top and left)
        const profileX = PADDING_SIDE;
        const profileY = PADDING_TOP + PROFILE_SIZE / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(
          profileX + PROFILE_SIZE / 2,
          profileY,
          PROFILE_SIZE / 2,
          0,
          Math.PI * 2,
          true
        );
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(
          profilePic,
          profileX,
          profileY - PROFILE_SIZE / 2,
          PROFILE_SIZE,
          PROFILE_SIZE
        );
        ctx.restore();

        // Determine which name to use: custom name or original name
        const displayName = customName || q.name || "User";

        // Add name (with proper spacing from profile picture)
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "left"; // Left align for name
        ctx.fillText(displayName, profileX + PROFILE_SIZE + 20, profileY + 8);

        // Add timestamp (below name with proper spacing)
        ctx.fillStyle = "#aaaaaa";
        ctx.font = "16px Arial";
        ctx.fillText(
          moment.tz("Asia/Jakarta").format("HH:mm"),
          profileX + PROFILE_SIZE + 20,
          profileY + 32
        );

        // Main text - centered with proper padding from header
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${textSize}px Arial`;
        ctx.textAlign = "center"; // Center aligned text

        // Split text into lines manually for better control
        const maxTextWidth = width - PADDING_SIDE * 2;
        const lines = splitTextIntoLines(ctx, text, maxTextWidth);

        // Calculate starting Y position with proper spacing from header
        const lineHeight = textSize + Math.ceil(textSize * 0.4); // Dynamic line height
        const totalTextHeight = lines.length * lineHeight;
        const textStartY = PADDING_TOP + HEADER_HEIGHT + 40; // Header + extra padding

        // Center vertically in remaining space
        const remainingHeight = height - textStartY - 40; // Bottom padding
        const centeredStartY =
          textStartY + (remainingHeight - totalTextHeight) / 2;

        // Use the maximum of centered position and minimum safe position
        const finalStartY = Math.max(centeredStartY, textStartY);

        // Draw each line with dynamic spacing
        lines.forEach((line, i) => {
          ctx.fillText(line, width / 2, finalStartY + i * lineHeight);
        });

        // Return the buffer
        return canvas.toBuffer();
      } catch (e) {
        console.error("Error creating quote canvas:", e);
        throw new Error("Failed to create quote image");
      }
    };

    // Helper function to split text into lines
    function splitTextIntoLines(ctx, text, maxWidth) {
      const words = text.split(" ");
      const lines = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    }

    // Generate the quote image
    const buffer = await createQuoteCanvas();

    // Create and send sticker
    conn.sendImageAsSticker(m.chat, buffer, m, {
      packname: `Time : ${moment.tz("Asia/Jakarta").format("HH:mm")}`,
      author: `Created By ${m.name}`,
    });
  } catch (error) {
    console.error("Error in QC function:", error);
    m.reply(
      `Failed to generate quote: ${error.message}\n\nMake sure you have installed the 'canvas' package with: npm install canvas`
    );
  }
};

handler.help = ["qc"].map((a) => a + " *[text or reply message]*");
handler.tags = ["maker"];
handler.command = ["qc"];
handler.register = true;
handler.premium = true;
handler.limit = true;
module.exports = handler;
