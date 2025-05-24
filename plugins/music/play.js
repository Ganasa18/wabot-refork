//Simple Base Botz
// • Credits : wa.me/6285822146627 [ Nazir ]
// • Feature : downloader/yt-play.js
// Sumber: https://chat.whatsapp.com/DwiyKDLAuwjHqjPasln3WP

const {
  generateWAMessage,
  proto,
  jidNormalizedUser,
  prepareWAMessageMedia,
  generateForwardMessageContent,
  generateWAMessageFromContent,
} = require("baileys");
const yts = require("yt-search");
const fs = require("fs");

const handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) throw `*• Example :* ${usedPrefix + command} *[query]*`;
  conn.sendMessage(m.chat, {
    react: {
      text: "⏳",
      key: m.key,
    },
  });
  let search = await yts(text);
  if (!search) throw "Video Not Found, Try Another Title";
  let vid = search.videos[0];
  let { title, thumbnail, timestamp, views, ago, url } = vid;

  let teks =
    "*" +
    title +
    "*" +
    "\n\n*Durasi:* " +
    timestamp +
    "\n*Views:* " +
    views +
    "\n*Upload:* " +
    ago +
    "\n*Link:* " +
    url;
  let msg = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 0x2,
          },
          interactiveMessage: proto.Message.InteractiveMessage.create({
            body: proto.Message.InteractiveMessage.Body.create({
              text: teks,
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
              text: wm,
            }),
            header: proto.Message.InteractiveMessage.Header.create({
              hasMediaAttachment: false,
              ...(await prepareWAMessageMedia(
                {
                  image: {
                    url: thumbnail,
                  },
                },
                {
                  upload: conn.waUploadToServer,
                }
              )),
            }),
            nativeFlowMessage:
              proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  {
                    name: "quick_reply",
                    buttonParamsJson:
                      '{"display_text":"Audio🎧","id":".yta ' + url + '"}',
                  },
                  {
                    name: "quick_reply",
                    buttonParamsJson:
                      '{"display_text":"Video🎥","id":".ytv ' + url + '"}',
                  },
                  {
                    name: "quick_reply",
                    buttonParamsJson:
                      '{"display_text":"Lirik🎶","id":".lirik ' + text + '"}',
                  },
                ],
              }),
          }),
        },
      },
    },
    {
      quoted: m,
    }
  );
  return await conn.relayMessage(m.chat, msg.message, {});
};

handler.help = ["play"].map((a) => a + ` *[query]*`);
handler.tags = ["music"];
handler.command = ["song", "lagu", "play"];

handler.exp = 0;
handler.register = true;
// handler.premium = true;
handler.moderator = true;
handler.limit = true;

module.exports = handler;
