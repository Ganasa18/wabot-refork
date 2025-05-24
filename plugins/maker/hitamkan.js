const axios = require("axios");
const FormData = require("form-data");
const { Readable } = require("stream");

async function Hytamkan(imageBuffer) {
  const URL_API = "https://www.laurine.site/api/generator/hitamkan-waifu";

  const imageStream = Readable.from(imageBuffer);

  const form = new FormData();
  form.append("image", imageStream, {
    filename: "image.jpg",
    contentType: "image/jpeg",
  });

  try {
    const response = await axios.post(URL_API, form, {
      headers: {
        ...form.getHeaders(),
        "User-Agent": "Mozilla/5.0",
        Accept: "image/*",
      },
      responseType: "arraybuffer",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return {
      success: true,
      imageBuffer: response.data,
      contentType: response.headers["content-type"] || "image/png",
    };
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
    throw error;
  }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || "";
  if (!/image/.test(mime))
    throw "[⚠️] *Can't Use, Please Send Image To Enhance To Anime*";

  await conn.sendMessage(m.chat, {
    react: {
      text: "⏳",
      key: m.key,
    },
  });

  try {
    let buffer = await q.download();
    const result = await Hytamkan(buffer);

    if (result?.imageBuffer) {
      let caption = `
╭━━━〔 *NIH BANG SUDAH HITAM* 〕━━━⬣
┃🖼️CREATE BY : *XITERBOT MD*
┃📤 Status : *Sukses diproses!*
╰━━━━━━━━━━━━━━━━━━⬣
`;
      await conn.sendFile(m.chat, result.imageBuffer, "result.png", caption, m);
    } else {
      throw "Failed to process image - no image returned";
    }
  } catch (error) {
    console.error("Handler Error:", error);
    throw "Error processing image. Please try again later.";
  }
};

handler.help = ["hitamkan"].map((a) => a + " *[search/url]*");
handler.command = ["hitamkan"];
handler.register = true;
handler.premium = true;
handler.limit = true;

module.exports = handler;
