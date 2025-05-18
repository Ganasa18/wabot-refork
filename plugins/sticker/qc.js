/**
 * Simple Base Botz
 * • Credits : wa.me/6285822146627 [ Nazir ]
 * • Feature : maker/qc with Canvas implementation (no external API dependency)
 */
const { Sticker } = require("akiraa-scrape");
const axios = require("axios");
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
  if (args.length >= 1) {
    text = args.join(" ");
  } else if (m.quoted) {
    text = m.quoted.text || "";
  } else {
    throw "*• Example :* .qc *[text or reply message]*";
  }

  const img = await q.download?.();
  const pp = await conn
    .profilePictureUrl(q.sender, "image")
    .catch((_) => "https://telegra.ph/file/320b066dc81928b782c7b.png");

  let randomColor = [
    "#ef1a11",
    "#89cff0",
    "#660000",
    "#87a96b",
    "#e9f6ff",
    "#ffe7f7",
    "#ca86b0",
    "#83a3ee",
    "#abcc88",
    "#80bd76",
    "#6a84bd",
    "#5d8d7f",
    "#530101",
    "#863434",
    "#013337",
    "#133700",
    "#2f3641",
    "#cc4291",
    "#7c4848",
    "#8a496b",
    "#722f37",
    "#0fc163",
    "#2f3641",
    "#e7a6cb",
    "#64c987",
    "#e6e6fa",
    "#ffa500",
  ];
  let apiColor = randomColor[Math.floor(Math.random() * randomColor.length)];

  try {
    // Create Canvas quote directly instead of using external API
    const createQuoteCanvas = async () => {
      try {
        // Canvas dimensions - ensure adequate space for the text
        const width = 512;
        const textLength = text ? text.length : 0;
        const baseHeight = 300; // Minimum height
        const estimatedTextHeight = Math.max(
          100,
          Math.min(400, textLength * 0.8)
        ); // Estimate text height based on length
        const height = baseHeight + estimatedTextHeight; // Dynamic height

        // Create canvas
        const canvas = createCanvas(width, Math.min(height, 768));
        const ctx = canvas.getContext("2d");

        // Background
        ctx.fillStyle = apiColor;
        ctx.fillRect(0, 0, width, height);

        // Add rounded corners effect with white border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 8;
        roundRect(ctx, 10, 10, width - 20, height - 20, 20);
        ctx.stroke();

        // Try to load profile picture
        let profilePic;
        try {
          profilePic = await loadImage(pp);
        } catch (e) {
          console.log("Error loading profile picture:", e);
          // Use default image if profile pic fails to load
          profilePic = await loadImage(
            "https://telegra.ph/file/320b066dc81928b782c7b.png"
          );
        }

        // Make profile picture circular
        ctx.save();
        ctx.beginPath();
        ctx.arc(80, 80, 50, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(profilePic, 30, 30, 100, 100);
        ctx.restore();

        // Add name
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px Arial";
        ctx.fillText(q.name || "User", 150, 60);

        // Add timestamp
        ctx.fillStyle = "#f0f0f0";
        ctx.font = "16px Arial";
        ctx.fillText(moment().format("HH:mm"), 150, 90);

        // Add text with word wrapping
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px Arial";

        // Ensure text is not empty and properly displayed
        const displayText = text && text.trim() ? text : "(tidak ada teks)";
        const textY = wrapText(ctx, displayText, 40, 160, width - 80, 25);

        // Make sure text position is adjusted properly based on content
        let currentY = textY + 20; // Add some padding after the text

        // If there was a quoted message
        if (reply && reply.text) {
          // Draw quote bubble
          ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
          roundRect(ctx, 40, currentY, width - 80, 60, 10);
          ctx.fill();

          // Add quoted text
          ctx.fillStyle = "#f0f0f0";
          ctx.font = "italic 16px Arial";
          wrapText(
            ctx,
            `"${reply.text.substring(0, 60)}${
              reply.text.length > 60 ? "..." : ""
            }"`,
            50,
            currentY + 30,
            width - 100,
            20
          );
          currentY += 80; // Move down after quote
        }

        // If there's uploaded media
        if (mime && img) {
          try {
            const mediaImg = await loadImage(img);
            // Calculate aspect ratio to fit within canvas
            const maxMediaWidth = width - 100;
            const maxMediaHeight = 150;
            let mediaWidth = mediaImg.width;
            let mediaHeight = mediaImg.height;

            if (mediaWidth > maxMediaWidth) {
              const ratio = maxMediaWidth / mediaWidth;
              mediaWidth = maxMediaWidth;
              mediaHeight = mediaHeight * ratio;
            }

            if (mediaHeight > maxMediaHeight) {
              const ratio = maxMediaHeight / mediaHeight;
              mediaHeight = maxMediaHeight;
              mediaWidth = mediaWidth * ratio;
            }

            // Draw media image with a border
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.strokeRect(40, currentY, mediaWidth + 4, mediaHeight + 4);
            ctx.drawImage(mediaImg, 42, currentY + 2, mediaWidth, mediaHeight);
          } catch (e) {
            console.log("Error adding media to canvas:", e);
          }
        }

        // Return the buffer
        return canvas.toBuffer();
      } catch (e) {
        console.error("Error creating quote canvas:", e);
        throw new Error("Failed to create quote image");
      }
    };

    // Helper function to draw rounded rectangles
    function roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
      );
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      return ctx;
    }

    // Helper function for text wrapping
    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
      // Ensure text is not null or empty
      if (!text || text.trim() === "") {
        ctx.fillText("(tidak ada teks)", x, y);
        return y + lineHeight;
      }

      const words = text.split(" ");
      let line = "";
      let testLine = "";
      let lineCount = 0;
      let currentY = y;

      for (let n = 0; n < words.length; n++) {
        testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x, currentY);
          line = words[n] + " ";
          currentY += lineHeight;
          lineCount++;

          if (lineCount > 15) {
            // Limit to prevent overflow
            line += "...";
            ctx.fillText(line, x, currentY);
            break;
          }
        } else {
          line = testLine;
        }
      }

      // Make sure the last line is drawn
      if (line.trim() !== "") {
        ctx.fillText(line, x, currentY);
      }

      return currentY;
    }

    // Generate the quote image
    const buffer = await createQuoteCanvas();

    // Create and send sticker
    conn.sendImageAsSticker(m.chat, buffer, m, {
      packname: `Time : ${moment.tz("Asia/Jakarta")}\n`,
      author: `Created By ${m.name}\nBy © Asyl`,
    });
  } catch (error) {
    console.error("Error in QC function:", error);
    m.reply(
      `Failed to generate quote: ${error.message}\n\nMake sure you have installed the 'canvas' package with: npm install canvas`
    );
  }
};

handler.help = ["qc"].map((a) => a + " *[text or reply message]*");
handler.tags = ["sticker"];
handler.command = ["qc"];
module.exports = handler;
