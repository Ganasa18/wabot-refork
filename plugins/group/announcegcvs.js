/**
 * Simple Base Botz
 * • Credits : wa.me/62895322391225 [ Asyl ]
 * • Enhanced By: Claude
 * • Feature : group/announcement with title, description, time, and attendance voting
 */
let handler = async (
  m,
  { conn, text, participants, usedPrefix, command, groupMetadata }
) => {
  const gcnya = groupMetadata.id;

  // Check if the group is a group
  if (!gcnya)
    return conn.reply(m.chat, "This command can only be used in groups!", m);
  // Check if there's input text
  if (!text)
    return conn.reply(
      m.chat,
      `Format: ${usedPrefix}${command} title|description|time\n\nExample: ${usedPrefix}${command} Big Match|TIM AMBA VS TIM TUKAM|13.00 WIB`,
      m
    );

  // Show processing reaction
  conn.sendMessage(m.chat, {
    react: {
      text: "⏳",
      key: m.key,
    },
  });

  // Parse the input
  let [title, description, time] = text.split("|");

  if (!title) return conn.reply(m.chat, "Title is required!", m);
  if (!description) return conn.reply(m.chat, "Description is required!", m);

  // Create the announcement text
  let teks = `┏━━━━『 *ANNOUNCEMENT* 』━━━━━━━━┓\n\n`;
  teks += `📢 *${title || "ANNOUNCEMENT"}*\n\n`;
  teks += `${description || "No description"}\n`;

  if (time) {
    teks += `\n⏰ *TIME:* ${time}\n`;
  }

  teks += `\n┗━━━━━━━━━━━━━━━━━━━━┛\n\n`;

  // Tag all participants
  for (let mem of participants) {
    teks += ` @${mem.id.split("@")[0]}\n`;
  }

  teks += `\n━━━━━━━━━━━━━━━━━━━━`;

  // Send the announcement with tags
  await conn.sendMessage(m.chat, {
    text: teks,
    mentions: participants.map((a) => a.id),
  });

  // Create attendance poll
  setTimeout(async () => {
    // Initialize vote data
    if (!global.db) global.db = {};
    if (!global.db.data) global.db.data = {};
    if (!global.db.data.chats) global.db.data.chats = {};
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};

    // Set up attendance data
    global.db.data.chats[m.chat].attendance = {
      title: title,
      description: description,
      time: time,
      present: [],
      absent: [],
      maybe: [],
      startTime: new Date().getTime(),
      msgId: m.key.id,
    };

    // Try to detect the prefix being used in the command
    const prefix = usedPrefix || "."; // Default to . if usedPrefix isn't available

    // Send attendance poll
    let attendanceMsg = `*ATTENDANCE CONFIRMATION*\n\n`;
    attendanceMsg += `Event: *${title}*\n`;
    if (time) attendanceMsg += `Time: ${time}\n`;
    attendanceMsg += `\nPlease confirm your attendance by replying with:\n`;
    attendanceMsg += `*${prefix}present* - If you're coming\n`;
    attendanceMsg += `*${prefix}absent* - If you can't attend\n`;
    attendanceMsg += `*${prefix}maybe* - If you're not sure yet\n\n`;
    attendanceMsg += `You can check the current attendance status with *${prefix}attendlist*`;

    conn.sendMessage(m.chat, {
      text: attendanceMsg,
    });
  }, 1000);

  // Add command handlers within the main handler
  conn.present = async function (m, usedPrefix) {
    if (!global.db?.data?.chats?.[m.chat]?.attendance)
      return conn.reply(
        m.chat,
        "There's no active attendance poll in this group!",
        m
      );

    const sender = m.sender;
    const attendance = global.db.data.chats[m.chat].attendance;

    // Remove from other lists if exists
    attendance.absent = attendance.absent.filter((id) => id !== sender);
    attendance.maybe = attendance.maybe.filter((id) => id !== sender);

    // Add to present list if not already there
    if (!attendance.present.includes(sender)) {
      attendance.present.push(sender);
      conn.reply(
        m.chat,
        `✅ You've been marked as *PRESENT* for "${attendance.title}"`,
        m
      );
    } else {
      conn.reply(m.chat, `You're already marked as present for this event!`, m);
    }
  };

  conn.absent = async function (m, usedPrefix) {
    if (!global.db?.data?.chats?.[m.chat]?.attendance)
      return conn.reply(
        m.chat,
        "There's no active attendance poll in this group!",
        m
      );

    const sender = m.sender;
    const attendance = global.db.data.chats[m.chat].attendance;

    // Remove from other lists if exists
    attendance.present = attendance.present.filter((id) => id !== sender);
    attendance.maybe = attendance.maybe.filter((id) => id !== sender);

    // Add to absent list if not already there
    if (!attendance.absent.includes(sender)) {
      attendance.absent.push(sender);
      conn.reply(
        m.chat,
        `❌ You've been marked as *ABSENT* for "${attendance.title}"`,
        m
      );
    } else {
      conn.reply(m.chat, `You're already marked as absent for this event!`, m);
    }
  };

  conn.maybe = async function (m, usedPrefix) {
    if (!global.db?.data?.chats?.[m.chat]?.attendance)
      return conn.reply(
        m.chat,
        "There's no active attendance poll in this group!",
        m
      );

    const sender = m.sender;
    const attendance = global.db.data.chats[m.chat].attendance;

    // Remove from other lists if exists
    attendance.present = attendance.present.filter((id) => id !== sender);
    attendance.absent = attendance.absent.filter((id) => id !== sender);

    // Add to maybe list if not already there
    if (!attendance.maybe.includes(sender)) {
      attendance.maybe.push(sender);
      conn.reply(
        m.chat,
        `❓ You've been marked as *MAYBE* for "${attendance.title}"`,
        m
      );
    } else {
      conn.reply(m.chat, `You're already marked as maybe for this event!`, m);
    }
  };

  conn.attendlist = async function (m, usedPrefix) {
    if (!global.db?.data?.chats?.[m.chat]?.attendance)
      return conn.reply(
        m.chat,
        "There's no active attendance poll in this group!",
        m
      );

    const attendance = global.db.data.chats[m.chat].attendance;

    let replyMsg = `*ATTENDANCE STATUS*\n\n`;
    replyMsg += `Event: *${attendance.title}*\n`;
    if (attendance.time) replyMsg += `Time: ${attendance.time}\n\n`;

    replyMsg += `✅ *PRESENT (${attendance.present.length})*\n`;
    if (attendance.present.length > 0) {
      for (let id of attendance.present) {
        let name = id.split("@")[0];
        replyMsg += `   • @${name}\n`;
      }
    } else {
      replyMsg += `   • None yet\n`;
    }

    replyMsg += `\n❌ *ABSENT (${attendance.absent.length})*\n`;
    if (attendance.absent.length > 0) {
      for (let id of attendance.absent) {
        let name = id.split("@")[0];
        replyMsg += `   • @${name}\n`;
      }
    } else {
      replyMsg += `   • None yet\n`;
    }

    replyMsg += `\n❓ *MAYBE (${attendance.maybe.length})*\n`;
    if (attendance.maybe.length > 0) {
      for (let id of attendance.maybe) {
        let name = id.split("@")[0];
        replyMsg += `   • @${name}\n`;
      }
    } else {
      replyMsg += `   • None yet\n`;
    }

    const totalResponded =
      attendance.present.length +
      attendance.absent.length +
      attendance.maybe.length;
    replyMsg += `\n📊 *SUMMARY*\n`;
    replyMsg += `Total responded: ${totalResponded}/${participants.length} members`;

    // Collect all mentioned user IDs
    let mentions = [
      ...attendance.present,
      ...attendance.absent,
      ...attendance.maybe,
    ];

    conn.sendMessage(m.chat, {
      text: replyMsg,
      mentions: mentions,
    });
  };
};

// Register handlers
handler.help = ["announce <title|description|time>"];
handler.tags = ["group"];
handler.command = /^(announce|announcegc)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

// Add the before handler to process attendance commands
handler.before = async function (m, { conn }) {
  if (!m.text) return;
  const text = m.text.toLowerCase();

  const prefixRegex = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.\/\\©^]/; // Common prefix characters
  const matchedPrefix = text.match(prefixRegex);
  const prefix = matchedPrefix ? matchedPrefix[0] : "."; // Default to '.' if no prefix found

  // Now handle commands with any prefix
  if (text === prefix + "present") {
    if (!global.db?.data?.chats?.[m.chat]?.attendance)
      return conn.reply(
        m.chat,
        "There's no active attendance poll in this group!",
        m
      );

    const sender = m.sender;
    const attendance = global.db.data.chats[m.chat].attendance;

    // Remove from other lists if exists
    attendance.absent = attendance.absent.filter((id) => id !== sender);
    attendance.maybe = attendance.maybe.filter((id) => id !== sender);

    // Add to present list if not already there
    if (!attendance.present.includes(sender)) {
      attendance.present.push(sender);
      conn.reply(
        m.chat,
        `✅ You've been marked as *PRESENT* for "${attendance.title}"`,
        m
      );
    } else {
      conn.reply(m.chat, `You're already marked as present for this event!`, m);
    }
    return true;
  } else if (text === prefix + "absent") {
    if (!global.db?.data?.chats?.[m.chat]?.attendance)
      return conn.reply(
        m.chat,
        "There's no active attendance poll in this group!",
        m
      );

    const sender = m.sender;
    const attendance = global.db.data.chats[m.chat].attendance;

    // Remove from other lists if exists
    attendance.present = attendance.present.filter((id) => id !== sender);
    attendance.maybe = attendance.maybe.filter((id) => id !== sender);

    // Add to absent list if not already there
    if (!attendance.absent.includes(sender)) {
      attendance.absent.push(sender);
      conn.reply(
        m.chat,
        `❌ You've been marked as *ABSENT* for "${attendance.title}"`,
        m
      );
    } else {
      conn.reply(m.chat, `You're already marked as absent for this event!`, m);
    }
    return true;
  } else if (text === prefix + "maybe") {
    if (!global.db?.data?.chats?.[m.chat]?.attendance)
      return conn.reply(
        m.chat,
        "There's no active attendance poll in this group!",
        m
      );

    const sender = m.sender;
    const attendance = global.db.data.chats[m.chat].attendance;

    // Remove from other lists if exists
    attendance.present = attendance.present.filter((id) => id !== sender);
    attendance.absent = attendance.absent.filter((id) => id !== sender);

    // Add to maybe list if not already there
    if (!attendance.maybe.includes(sender)) {
      attendance.maybe.push(sender);
      conn.reply(
        m.chat,
        `❓ You've been marked as *MAYBE* for "${attendance.title}"`,
        m
      );
    } else {
      conn.reply(m.chat, `You're already marked as maybe for this event!`, m);
    }
    return true;
  } else if (text === prefix + "attendlist") {
    if (!global.db?.data?.chats?.[m.chat]?.attendance)
      return conn.reply(
        m.chat,
        "There's no active attendance poll in this group!",
        m
      );

    const attendance = global.db.data.chats[m.chat].attendance;

    let replyMsg = `*ATTENDANCE STATUS*\n\n`;
    replyMsg += `Event: *${attendance.title}*\n`;
    if (attendance.time) replyMsg += `Time: ${attendance.time}\n\n`;

    replyMsg += `✅ *NAK IKUT (${attendance.present.length})*\n`;
    if (attendance.present.length > 0) {
      for (let id of attendance.present) {
        let name = id.split("@")[0];
        replyMsg += `   • @${name}\n`;
      }
    } else {
      replyMsg += `   • None yet\n`;
    }

    replyMsg += `\n❌ *TAK NAK LA (${attendance.absent.length})*\n`;
    if (attendance.absent.length > 0) {
      for (let id of attendance.absent) {
        let name = id.split("@")[0];
        replyMsg += `   • @${name}\n`;
      }
    } else {
      replyMsg += `   • None yet\n`;
    }

    replyMsg += `\n❓ *SIBUK KAYA KAPTEN (${attendance.maybe.length})*\n`;
    if (attendance.maybe.length > 0) {
      for (let id of attendance.maybe) {
        let name = id.split("@")[0];
        replyMsg += `   • @${name}\n`;
      }
    } else {
      replyMsg += `   • None yet\n`;
    }

    // Calculate not responded
    let responded = [
      ...new Set([
        ...attendance.present,
        ...attendance.absent,
        ...attendance.maybe,
      ]),
    ];
    let numParticipants = 0;
    try {
      const metadata = await conn.groupMetadata(m.chat);
      numParticipants = metadata.participants.length;
    } catch (e) {
      numParticipants = responded.length; // Fallback
    }

    replyMsg += `\n📊 *SUMMARY*\n`;
    replyMsg += `Total responded: ${responded.length}/${numParticipants} members`;

    // Collect all mentioned user IDs
    let mentions = [
      ...attendance.present,
      ...attendance.absent,
      ...attendance.maybe,
    ];

    conn.sendMessage(m.chat, {
      text: replyMsg,
      mentions: mentions,
    });
    return true;
  } else if (text === prefix + "endattend") {
    // Check if user is admin
    const isAdmin = m.isGroup
      ? (await conn.groupMetadata(m.chat))?.participants.find(
          (p) => conn.decodeJid(p.id) === m.sender
        )?.admin || false
      : false;

    if (!isAdmin) {
      conn.reply(m.chat, "Only admins can end the attendance poll!", m);
      return true;
    }

    if (!global.db?.data?.chats?.[m.chat]?.attendance) {
      conn.reply(m.chat, "There's no active attendance poll to end!", m);
      return true;
    }

    // Show final attendance (by calling the existing command with the same message)
    m.text = prefix + "attendlist";
    this.before(m, { conn });

    // Clean up
    setTimeout(() => {
      delete global.db.data.chats[m.chat].attendance;
      conn.reply(m.chat, "The attendance poll has been closed.", m);
    }, 1000);

    return true;
  }
};

module.exports = handler;
