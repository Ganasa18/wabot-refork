//Simple Base Botz
// • Credits : wa.me/62895322391225 [ Asyl ]
// • Feature : info/menu

let fs = require("fs");
let path = require("path");
let fetch = require("node-fetch");
let axios = require("axios");
let os = require("os");
let {
  generateWAMessageFromContent,
  proto,
  prepareWAMessageMedia,
} = require("baileys");
let moment = require("moment-timezone");
let { sizeFormatter } = require("human-readable");

// Configure formatter for file sizes
const format = sizeFormatter({
  std: "JEDEC",
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`,
});

/**
 * Converts text to styled format
 * @param {string} text - Text to style
 * @param {number} style - Style number (currently only supports style 1)
 * @returns {string} - Styled text
 */
const applyTextStyle = (text, style = 1) => {
  const originalChars = "abcdefghijklmnopqrstuvwxyz1234567890".split("");
  const styleMap = {
    1: "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘqʀꜱᴛᴜᴠᴡxʏᴢ1234567890",
  };

  const replacements = originalChars.map((char, index) => ({
    original: char,
    convert: styleMap[style].split("")[index],
  }));

  return text
    .toLowerCase()
    .split("")
    .map((char) => {
      const found = replacements.find((r) => r.original === char);
      return found ? found.convert : char;
    })
    .join("");
};

// Default menu template
const defaultMenu = {
  before: `
╭━━━━━━━ INFO ━━━━━━╮
┃ 👤 User: %name
┃ 📆 Date: %date
┃ ⏰ Time: %time
┃ ⏱️ Uptime: %uptime
╰━━━━━━━━━━━━━━━━━━━╯`,

  header: `–  *%category* \n┌  `,
  body: `│  ◦ %cmd`,
  footer: `└  `,
  after: ``,
};

/**
 * Get current time greeting
 * @returns {string} - Appropriate greeting based on time
 */
const getTimeGreeting = () => {
  const hour = moment().hour();
  if (hour >= 0 && hour < 4) return "Good Night 🌙";
  if (hour >= 4 && hour < 12) return "Good Morning 🌄";
  if (hour >= 12 && hour < 18) return "Good Afternoon ☀️";
  return "Good Evening 🌆";
};

/**
 * Format time duration
 * @param {number} ms - Time in milliseconds
 * @returns {string} - Formatted time string
 */
const formatTime = (ms) => {
  let seconds = Math.floor(ms / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);
  let days = Math.floor(hours / 24);

  return [
    days && `${days} days`,
    hours % 24 && `${hours % 24} hours`,
    minutes % 60 && `${minutes % 60} minutes`,
    seconds % 60 && `${seconds % 60} seconds`,
  ]
    .filter(Boolean)
    .join(", ");
};

/**
 * Create menu category definitions
 * @returns {Object} - Menu categories mapping
 */
const createMenuCategories = () => {
  return {
    all: {
      main: "MAIN MENU",
      fun: "FUN MENU",
      rohani: "ROHANI MENU",
      info: "INFO MENU",
      music: "MUSIC MENU",
      maker: "MAKER MENU",
      game: "GAME MENU",
      group: "GROUP MENU",
      internet: "INTERNET MENU",
      owner: "OWNER MENU",
      rpg: "RPG MENU",
      anime: "ANIME MENU",
    },
    // Individual categories
    convert: { convert: "CONVERT" },
    main: { main: "MAIN" },
    game: { game: "GAME" },
    maker: { maker: "MAKER" },
    group: { group: "GROUP" },
    music: { music: "MUSIC" },
    fun: { fun: "FUN" },
    rohani: { rohani: "ROHANI" },
    anime: { anime: "ANIME" },
    internet: { internet: "INTERNET" },
    owner: { owner: "OWNER" },
    rpg: { rpg: "RPG" },
    info: { info: "INFO" },
  };
};

/**
 * Create menu sections for list display
 * @returns {Array} - Menu sections
 */
const createMenuSections = () => {
  return [
    {
      title: "List menu",
      highlight_label: "Popular Plugins",
      rows: [
        {
          title: "All Feature",
          description: "Displays all menu (List Menu)",
          id: ".menu all",
        },
        {
          title: "Main Feature",
          description: "Displays menu Main (List Menu)",
          id: ".menu main",
        },
        {
          title: "Game Feature",
          description: "Displays menu Game (List Menu)",
          id: ".menu game",
        },
        {
          title: "Rpg Feature",
          description: "Displays menu Rpg (List Menu)",
          id: ".menu rpg",
        },
        {
          title: "Info Feature",
          description: "Displays menu Info (List Menu)",
          id: ".menu info",
        },
        {
          title: "Group Feature",
          description: "Displays menu Group (List Menu)",
          id: ".menu group",
        },
        {
          title: "Internet Feature",
          description: "Displays menu Internet (List Menu)",
          id: ".menu internet",
        },
        {
          title: "Fun Feature",
          description: "Displays menu Fun (List Menu)",
          id: ".menu fun",
        },
        {
          title: "Owner Feature",
          description: "Displays menu Owner (List Menu)",
          id: ".menu owner",
        },
        {
          title: "Maker Feature",
          description: "Displays menu Maker (List Menu)",
          id: ".menu maker",
        },
        {
          title: "Anime Feature",
          description: "Displays menu Anime (List Menu)",
          id: ".menu anime",
        },
        {
          title: "Rohani Feature",
          description: "Displays menu Rohani (List Menu)",
          id: ".menu rohani",
        },
        {
          title: "Music Feature",
          description: "Displays menu Music (List Menu)",
          id: ".menu music",
        },
      ],
    },
    {
      title: "System Information",
      highlight_label: "Popular Plugins",
      rows: [
        {
          title: "Creator Bot",
          description: "Bot owner info, who created it (information)",
          id: ".owner",
        },
        {
          title: "Info System",
          description: "Viewing System Info on Bot (information)",
          id: ".ping",
        },
        {
          title: "Script Info",
          description: "Source Code Bot WhatsApp Info (information)",
          id: ".sc",
        },
      ],
    },
  ];
};

/**
 * Create contact data for message quotes
 * @param {string} sender - Sender ID
 * @returns {Object} - Contact data for fkontak
 */
const createContactData = (sender) => {
  return {
    key: {
      participants: "0@s.whatsapp.net",
      remoteJid: "status@broadcast",
      fromMe: false,
      id: "Powered by : Asyl",
    },
    message: {
      contactMessage: {
        vcard: `BEGIN:VCARD\nVERSION:1.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${
          sender.split("@")[0]
        }:${sender.split("@")[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
      },
    },
    participant: "0@s.whatsapp.net",
  };
};

/**
 * Generate user information text
 * @param {Object} user - User data
 * @param {string} name - Username
 * @param {string} totalreg - Total registered users
 * @param {Array} group - Group data
 * @param {string} uptime - Bot uptime
 * @returns {string} - Formatted user info text
 */
const generateUserInfo = (user, name, totalreg, group, uptime) => {
  const isPremium = user.premium ? "Premium" : "Free User";
  const lim = user.premium ? "∞" : user.limit;

  let text = ` –   *BOT INFORMATION*\n`;
  text += "┌  ◦ Name Bot:" + ` Asyl-Botz\n`;
  text += "│  ◦ Uptime:" + ` ${uptime}\n`;
  text += "│  ◦ Date:" + ` ${moment().format("DD MMMM YYYY")}\n`;
  text += "│  ◦ Users:" + ` ${totalreg} Users\n`;
  text += "│  ◦ Groups:" + ` ${group.length} Groups\n`;
  text +=
    "└  ◦ Memory:" +
    ` ${format(os.totalmem() - os.freemem())} / ${format(os.totalmem())}\n\n`;

  text += ` –   *USER INFORMATION*\n`;
  text += "┌  ◦ Name:" + ` ${name}\n`;
  text += "│  ◦ Limit:" + ` ${lim}\n`;
  text += "└  ◦ Status:" + ` ${isPremium}\n`;

  return text;
};

/**
 * Generate interactive message
 * @param {Object} conn - Connection object
 * @param {string} chat - Chat ID
 * @param {string} text - Message text
 * @param {Object} user - User data
 * @param {Object} fkontak - Contact data
 * @param {Object} listMessage - List message data
 * @returns {Promise<Object>} - Generated message
 */
const generateInteractiveMessage = async (
  conn,
  chat,
  text,
  user,
  fkontak,
  listMessage
) => {
  return generateWAMessageFromContent(
    chat,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: proto.Message.InteractiveMessage.create({
            contextInfo: {
              mentionedJid: [user],
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363386031513012@newsletter",
                newsletterName: "Powered By Asyl",
                serverMessageId: -1,
              },
              externalAdReply: {
                title: "AsylBotz",
                body: "Version: 1.0.2-beta",
                thumbnailUrl:
                  "https://raw.githubusercontent.com/Fiisya/uploads/main/uploads/1747336545556.jpeg",
                sourceUrl: "https://alfisyl.my.id",
                mediaType: 1,
                renderLargerThumbnail: true,
              },
            },
            body: proto.Message.InteractiveMessage.Body.create({
              text: text,
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
              text: "Click the button below for the menu list",
            }),
            header: proto.Message.InteractiveMessage.Header.create({
              title: `Hello, @${user.replace(/@.+/g, "")} 🪸`,
              subtitle: "Fuzan",
            }),
            nativeFlowMessage:
              proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify(listMessage),
                  },
                  {
                    name: "cta_url",
                    buttonParamsJson:
                      '{"display_text":"Owner","url":"https://www.alfisyl.my.id","merchant_url":"https://www.alfisyl.my.id"}',
                  },
                ],
              }),
          }),
        },
      },
    },
    {
      userJid: chat,
      quoted: fkontak,
    }
  );
};

function filterMenuByAccess(menuItems, conn, m) {
  // Salin menu untuk menghindari mutasi
  const userData = global.db.data.users[m.sender];

  // Definisikan status pengguna
  const isROwner = [
    conn.decodeJid(global.conn.user.id),
    ...global.owner.map((a) => a + "@s.whatsapp.net"),
  ].includes(m.sender);
  const isOwner = isROwner || m.fromMe;
  const isMods = userData?.moderator || false;
  const isPrems = userData?.premium || false;
  const isBans = userData?.banned || false;

  console.log(
    `isOwner: ${isOwner}, isMods: ${isMods}, isPrems: ${isPrems}, isBans: ${isBans}`
  );

  return menuItems.filter((plugin) => {
    // Skip disabled plugins
    if (plugin.disabled) return false;

    // Check if user is banned - paling prioritas
    if (isBans) return false;

    // Check permission hierarchy
    // Owner dapat mengakses semua menu
    if (isOwner) return true;

    // Moderator dapat mengakses semua menu kecuali owner-only
    if (isMods) {
      if (plugin.owner) return false;
      return true;
    }

    // Premium user dapat mengakses premium dan non-restricted
    if (isPrems) {
      if (plugin.owner || plugin.moderator) return false;
      return true;
    }

    // Pengguna biasa - hanya bisa akses non-restricted
    if (plugin.premium || plugin.moderator || plugin.owner) return false;

    // Lolos semua filter
    return true;
  });
}

/**
 * Main menu handler function
 * @param {Object} m - Message object
 * @param {Object} param1 - Parameters
 * @returns {Promise<void>}
 */
let handler = async (m, { conn, usedPrefix: _p, args, command }) => {
  try {
    // Show loading indicator
    await conn.sendMessage(m.chat, {
      react: {
        text: "🕒",
        key: m.key,
      },
    });

    // Parse command argument
    let teks = `${args[0]}`.toLowerCase();
    const arrayMenu = [
      "all",
      "main",
      "fun",
      "rohani",
      "info",
      "bug",
      "jadibot",
      "store",
      "downloader",
      "convert",
      "music",
      "game",
      "group",
      "panel",
      "internet",
      "owner",
      "rpg",
      "saluran",
      "sticker",
      "tools",
      "anime",
    ];

    // Default to 404 if invalid menu requested
    if (!arrayMenu.includes(teks)) teks = "404";

    // Get menu categories based on requested menu
    const menuCategories = createMenuCategories();
    let tags = menuCategories[teks] || {};

    // Read package info
    const packageInfo = JSON.parse(
      await fs.promises
        .readFile(path.join(__dirname, "../package.json"))
        .catch((_) => "{}")
    );

    // Get user data
    const { registered } = global.db.data.users[m.sender];
    const user = global.db.data.users[m.sender];
    const name = registered
      ? global.db.data.users[m.sender].name
      : conn.getName(m.sender);

    // Time and date formatting
    const d = new Date(new Date() + 3600000);
    const locale = "id";
    const weton = ["Pahing", "Pon", "Wage", "Kliwon", "Legi"][
      Math.floor(d / 84600000) % 5
    ];
    const week = d.toLocaleDateString(locale, { weekday: "long" });
    const date = d.toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const dateIslamic = Intl.DateTimeFormat(locale + "-TN-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
    const time = d.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });

    // System information
    const _uptime = process.uptime() * 1000;
    let _muptime;
    if (process.send) {
      process.send("uptime");
      _muptime =
        (await new Promise((resolve) => {
          process.once("message", resolve);
          setTimeout(resolve, 1000);
        })) * 1000;
    }
    const muptime = formatTime(_muptime);
    const uptime = formatTime(_uptime);

    // Registration stats
    const totalreg = Object.keys(global.db.data.users).length;
    const rtotalreg = Object.values(global.db.data.users).filter(
      (user) => user.registered == true
    ).length;

    // Get groups data
    const group = Object.entries(conn.chats)
      .filter(
        ([jid, chat]) =>
          jid.endsWith("@g.us") &&
          chat.isChats &&
          !chat.metadata?.read_only &&
          !chat.metadata?.announce
      )
      .map((v) => v[0]);

    // Create contact data
    const fkontak = createContactData(m.sender);

    // Create list message
    const listMessage = {
      title: "List Menu",
      sections: createMenuSections(),
    };

    // Handle menu display
    if (teks === "404") {
      // Default menu (main)
      const greeting = `${getTimeGreeting()} 🪸\n`;
      const botIntro = `I am an automated system (WhatsApp Bot) that can help to do something, search and get data / information only through WhatsApp.\n`;
      const userInfo = generateUserInfo(user, name, totalreg, group, uptime);

      const msg = await generateInteractiveMessage(
        conn,
        m.chat,
        userInfo,
        m.sender,
        fkontak,
        listMessage
      );

      conn.relayMessage(msg.key.remoteJid, msg.message, {
        messageId: msg.key.id,
      });
      return;
    }

    // Process specific menu
    let help = Object.values(global.plugins)
      .filter((plugin) => !plugin.disabled)
      .map((plugin) => ({
        help: Array.isArray(plugin.help) ? plugin.help : [plugin.help],
        tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
        prefix: "customPrefix" in plugin,
        limit: plugin.limit,
        premium: plugin.premium,
        enabled: !plugin.disabled,
        moderator: plugin.moderator,
        owner: plugin.owner,
      }));

    // Filter based on user access before displaying
    const filteredHelp = filterMenuByAccess(help, conn, m);

    // Group plugins by tags
    let groups = {};
    for (let tag in tags) {
      groups[tag] = [];
      for (let plugin of filteredHelp)
        if (plugin.tags && plugin.tags.includes(tag))
          if (plugin.help) groups[tag].push(plugin);
    }

    // Apply menu template
    conn.menu = conn.menu ? conn.menu : {};
    let before = conn.menu.before || defaultMenu.before;
    let header = conn.menu.header || defaultMenu.header;
    let body = conn.menu.body || defaultMenu.body;
    let footer = conn.menu.footer || defaultMenu.footer;
    let after =
      conn.menu.after ||
      (conn.user.jid == global.conn.user.jid
        ? ""
        : `Powered by https://www.alfisyl.my.id/${
            global.conn.user.jid.split`@`[0]
          }`) + defaultMenu.after;

    // Build menu text
    let _text = [
      before,
      ...Object.keys(tags).map((tag) => {
        // Check if group is empty and provide fallback content
        const groupContent =
          groups[tag].length > 0
            ? [
                ...groups[tag].map((menu) => {
                  return menu.help
                    .map((help) => {
                      return body
                        .replace(/%cmd/g, menu.prefix ? help : "%p" + help)
                        .replace(/%islimit/g, menu.limit ? "(Limit)" : "")
                        .replace(/%isPremium/g, menu.premium ? "(Premium)" : "")
                        .trim();
                    })
                    .join("\n");
                }),
                footer,
              ].join("\n")
            : "│  ◦ No commands available in this category.\n" + footer;

        return header.replace(/%category/g, tags[tag]) + "\n" + groupContent;
      }),
      after,
    ].join("\n");

    // Apply template replacements
    let text =
      typeof conn.menu == "string"
        ? conn.menu
        : typeof conn.menu == "object"
        ? _text
        : "";
    let replacements = {
      "%": "%",
      p: _p,
      uptime,
      muptime,
      me: conn.user.name,
      npmname: packageInfo.name,
      npmdesc: packageInfo.description,
      version: packageInfo.version,
      github: packageInfo.homepage
        ? packageInfo.homepage.url || packageInfo.homepage
        : "[unknown github url]",
      name,
      weton,
      week,
      date,
      dateIslamic,
      time,
      totalreg,
      rtotalreg,
    };

    text = text.replace(
      new RegExp(
        `%(${Object.keys(replacements).sort((a, b) => b.length - a.length)
          .join`|`})`,
        "g"
      ),
      (_, name) => "" + replacements[name]
    );

    // Create final menu text
    let menuText = `${getTimeGreeting()}\n`;
    menuText += `Saya bot fuzan cama siap membantu.\n\n`;
    menuText += applyTextStyle(text).trim();

    // Send menu
    const msg = await generateInteractiveMessage(
      conn,
      m.chat,
      menuText,
      m.sender,
      fkontak,
      listMessage
    );

    conn.relayMessage(msg.key.remoteJid, msg.message, {
      messageId: msg.key.id,
    });
  } catch (e) {
    // Handle errors
    const errorText = "Type *.allmenu* to view the complete menu";
    const msg = await generateInteractiveMessage(
      conn,
      m.chat,
      errorText,
      m.sender,
      createContactData(m.sender),
      {
        title: "List Menu",
        sections: createMenuSections(),
      }
    );

    conn.relayMessage(msg.key.remoteJid, msg.message, {
      messageId: msg.key.id,
    });

    console.error("Menu error:", e);
  }
};

// Command metadata
handler.help = ["menu"];
handler.tags = ["main"];
handler.command = /^(menu|help)$/i;

// Permission flags
handler.register = true;
handler.limit = true;

module.exports = handler;

async function getBuffer(url, options) {
  try {
    options ? options : {};
    const res = await axios({
      method: "get",
      url,
      headers: {
        DNT: 1,
        "Upgrade-Insecure-Request": 1,
      },
      ...options,
      responseType: "arraybuffer",
    });
    return res.data;
  } catch (err) {
    return err;
  }
}

function toRupiah(angka) {
  var saldo = "";
  var angkarev = angka.toString().split("").reverse().join("");
  for (var i = 0; i < angkarev.length; i++)
    if (i % 3 == 0) saldo += angkarev.substr(i, 3) + ".";
  return (
    "" +
    saldo
      .split("", saldo.length - 1)
      .reverse()
      .join("")
  );
}

function clockString(ms) {
  let h = isNaN(ms) ? "--" : Math.floor(ms / 3600000);
  let m = isNaN(ms) ? "--" : Math.floor(ms / 60000) % 60;
  let s = isNaN(ms) ? "--" : Math.floor(ms / 1000) % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, 0)).join(":");
}

function ucapan() {
  const time = moment.tz("Asia/Jakarta").format("HH");
  let res = "Malam";
  if (time >= 4) {
    res = "Pagi";
  }
  if (time > 10) {
    res = "Siang";
  }
  if (time >= 15) {
    res = "Sore";
  }
  if (time >= 18) {
    res = "Malam";
  }
  return res;
}
