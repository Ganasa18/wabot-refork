const fs = require("fs");
const path = require("path");
const WareWolfGame = require("../../class/werewolf_class");
const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} = require("baileys");
// Path to database file
const DATABASE_PATH = path.join(__dirname, "../../json/werewolf.json");
class GameSession {
  constructor(id, botInstance) {
    this.id = id;
    this.players = [];
    this.game = new WareWolfGame(botInstance);
    this.botInstance = botInstance;
  }
}
// Ensure database file exists
const ensureDatabase = () => {
  try {
    if (!fs.existsSync(DATABASE_PATH)) {
      // Create directory if it doesn't exist
      const dir = path.dirname(DATABASE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Create empty database file
      const initialData = {
        gameStates: {},
        playerGameMapping: {},
        lobbies: {},
        activeGames: [],
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(DATABASE_PATH, JSON.stringify(initialData, null, 2));
    }
  } catch (error) {
    console.error("Error creating database file:", error);
  }
};

// Helper function to validate and convert number to player ID
const numberToPlayerId = (groupId, number, game) => {
  const gameState = game.gameStates[groupId];
  if (!gameState) return null;

  const alivePlayers = gameState.alivePlayers;
  const num = parseInt(number);
  if (isNaN(num)) return null;

  const index = num - 1;
  if (index < 0 || index >= alivePlayers.length) return null;

  return alivePlayers[index];
};

// Helper function to generate numbered player list
const generatePlayerList = (groupId, game) => {
  const gameState = game.gameStates[groupId];
  if (!gameState) return "";
  return Object.entries(gameState.playerIndexMap)
    .filter(([number, playerId]) => gameState.alivePlayers.includes(playerId))
    .map(
      ([number, playerId]) =>
        `${number}. ${this.getPlayerNameById(groupId, playerId)}`
    )
    .join("\n");
};

ensureDatabase();

const createMenuSectionsWereWolf = () => {
  return [
    {
      title: "🎮 Game Management",
      rows: [
        {
          title: "🔨 Create Game",
          description: "Membuat lobby game werewolf baru",
          id: ".ww create",
        },
        {
          title: "🚪 Join Game",
          description: "Bergabung ke lobby yang sudah ada",
          id: ".ww join",
        },
        {
          title: "🚶 Leave Lobby",
          description: "Keluar dari lobby game werewolf",
          id: ".ww leave",
        },
        {
          title: "📋 Player List",
          description: "Melihat daftar pemain di lobby",
          id: ".ww list",
        },
      ],
    },
    {
      title: "⚙️ Game Control",
      rows: [
        {
          title: "▶️ Start Game",
          description: "Memulai permainan (hanya pembuat lobby)",
          id: ".ww start",
        },
        {
          title: "⏱️ Set Phase Time",
          description: "Mengatur durasi setiap fase game",
          id: ".ww setphase",
        },
        {
          title: "🔚 End Game",
          description: "Mengakhiri game secara paksa",
          id: ".ww end",
        },
      ],
    },
    {
      title: "🎯 Game Actions",
      rows: [
        {
          title: "🗳️ Vote Player",
          description: "Vote pemain untuk dikeluarkan (siang hari)",
          id: ".ww vote",
        },
        {
          title: "🔮 Seer Action",
          description: "Melihat peran pemain (Seer only - PM)",
          id: ".ww seer",
        },
        {
          title: "🧪 Witch Action",
          description: "Heal/Kill pemain (Witch only - PM)",
          id: ".ww witch",
        },
        {
          title: "🏹 Hunter Shoot",
          description: "Menembak pemain (Hunter only - after death)",
          id: ".ww shoot",
        },
      ],
    },
    {
      title: "ℹ️ Information",
      rows: [
        {
          title: "❓ Help",
          description: "Bantuan dan daftar perintah lengkap",
          id: ".ww help",
        },
      ],
    },
  ];
};

const createGameStatusMessage = (lobby, groupId, game) => {
  if (!lobby) {
    return {
      title: "🐺 Werewolf Game Status",
      sections: [
        {
          title: "❌ No Active Game",
          rows: [
            {
              title: "Create New Game",
              description: "Buat lobby werewolf baru untuk memulai",
              id: ".ww create",
            },
          ],
        },
      ],
    };
  }

  const playerCount = Object.keys(lobby.players).length;
  const isStarted = lobby.isGameStarted;

  return {
    title: `🐺 Game Status - ${playerCount} Players`,
    sections: [
      {
        title: isStarted ? "🎮 Game Running" : "⏳ Waiting in Lobby",
        rows: [
          {
            title: "👥 View Players",
            description: `${playerCount} pemain di lobby`,
            id: ".ww list",
          },
          ...(isStarted
            ? []
            : [
                {
                  title: "🚪 Join Game",
                  description: "Bergabung ke lobby",
                  id: ".ww join",
                },
                {
                  title: "▶️ Start Game",
                  description: `Min ${game.minPlayers} pemain diperlukan`,
                  id: ".ww start",
                },
              ]),
        ],
      },
    ],
  };
};

const createVotingMessage = (gameState, groupId, game) => {
  const alivePlayers = gameState.alivePlayers;
  const playerRows = alivePlayers.map((playerId, index) => {
    const playerName = game.getPlayerNameById(groupId, playerId);
    const voteCount = gameState.votes
      ? Object.values(gameState.votes).filter((vote) => vote === playerId)
          .length
      : 0;

    return {
      title: `${index + 1}. ${playerName}`,
      description: `Votes: ${voteCount} | Click to vote`,
      id: `.ww vote ${index + 1}`,
    };
  });

  return {
    title: "🗳️ Day Phase - Vote to Eliminate",
    sections: [
      {
        title: "👥 Alive Players",
        rows: playerRows,
      },
    ],
  };
};

// Fixed generateInteractiveMessage function
const generateInteractiveMessage = async (
  conn,
  chat,
  text,
  user,
  listMessage
) => {
  try {
    const thumbnailUrl =
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2920510/45ea0d121ff28cbd97c9d7036a7bc9eab99c5377/capsule_616x353.jpg";

    let msg = generateWAMessageFromContent(
      chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({
                text: text,
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({
                text: "🎮 Choose an action from the menu below",
              }),
              header: proto.Message.InteractiveMessage.Header.create({
                title: `Game Menu`,
                subtitle: `Hello, @${user.replace(/@.+/g, "")}`,
                hasMediaAttachment: false,
                ...(await prepareWAMessageMedia(
                  {
                    image: {
                      url: thumbnailUrl,
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
                      name: "single_select",
                      buttonParamsJson: JSON.stringify(listMessage),
                    },
                  ],
                }),
            }),
          },
        },
      },
      {
        quoted: null,
      }
    );

    return await conn.relayMessage(chat, msg.message, {
      messageId: msg.key.id,
    });
  } catch (error) {
    console.error("Error generating interactive message:", error);
    // Fallback to simple text message
    return await conn.sendMessage(chat, { text: text });
  }
};

// Fixed generateGameInfoMessage function
const generateGameInfoMessage = async (conn, chat, user, gameInfo) => {
  try {
    const thumbnailUrl =
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2920510/45ea0d121ff28cbd97c9d7036a7bc9eab99c5377/capsule_616x353.jpg";

    let msg = generateWAMessageFromContent(
      chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({
                text: gameInfo.description,
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({
                text: "🎮 Current game status and quick actions",
              }),
              header: proto.Message.InteractiveMessage.Header.create({
                title: gameInfo.title,
                subtitle: gameInfo.status,
                hasMediaAttachment: false,
                ...(await prepareWAMessageMedia(
                  {
                    image: {
                      url: thumbnailUrl,
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
                      name: "single_select",
                      buttonParamsJson: JSON.stringify(gameInfo.actions),
                    },
                  ],
                }),
            }),
          },
        },
      },
      {
        quoted: null,
      }
    );

    return await conn.relayMessage(chat, msg.message, {
      messageId: msg.key.id,
    });
  } catch (error) {
    console.error("Error generating game info message:", error);
    // Fallback to simple text message
    return await conn.sendMessage(chat, {
      text: `${gameInfo.title}\n${gameInfo.status}\n\n${gameInfo.description}`,
    });
  }
};

// Handler untuk memulai permainan werewolf// Handler untuk memulai permainan werewolf
let handler = async (
  m,
  { conn, args, usedPrefix, text, command, groupMetadata }
) => {
  conn.werewolf = conn.werewolf || {};
  const sessionId = m.chat;
  let dataGroup = groupMetadata;

  if (!conn.werewolf[sessionId]) {
    conn.werewolf[sessionId] = new GameSession(sessionId, conn);
  }

  const session = conn.werewolf[sessionId];
  const game = session.game;
  game.setBotInstance(conn);
  game.botPrefix = usedPrefix;

  let username = m.pushName || m.name || "Pemain";
  let userId = m.sender;
  const userName = username;
  const groupId = dataGroup?.id;
  const subCommand = args[0] ? args[0].toLowerCase() : "";
  const lobby = game.getLobby(groupId);

  // Handle voting by index
  if (
    m.isGroup &&
    (command === "ww" || command === "vote") &&
    args[1] &&
    lobby?.isGameStarted
  ) {
    const targetNumber = parseInt(args[1]);
    if (isNaN(targetNumber) || targetNumber < 1) {
      const votingMessage = createVotingMessage(
        game.gameStates[groupId],
        groupId,
        game
      );
      return await generateInteractiveMessage(
        conn,
        m.chat,
        "❌ Nomor pemain tidak valid. Pilih dari daftar di bawah:",
        m.sender,
        votingMessage
      );
    }

    const targetId = numberToPlayerId(groupId, targetNumber, game);
    if (!targetId) {
      const votingMessage = createVotingMessage(
        game.gameStates[groupId],
        groupId,
        game
      );
      return await generateInteractiveMessage(
        conn,
        m.chat,
        "❌ Nomor pemain tidak valid. Pilih dari daftar di bawah:",
        m.sender,
        votingMessage
      );
    }
  }

  if (command === "werewolf" || command === "ww") {
    if (m.isGroup && subCommand !== "vote") {
      conn.sendMessage(m.chat, {
        react: { text: "⏳", key: m.key },
      });
    }

    // Show interactive menu if no subcommand or help
    if (!subCommand || subCommand === "help") {
      const listMessage = createMenuSectionsWereWolf();
      const helpText = `**GAME COMMANDS**
**📋 Quick Guide:**
  • **Lobby**: Create, join, leave lobbies
  • **Game**: Vote, use special abilities  
  • **Roles**: Werewolf, Seer, Witch, Hunter
  • **Phases**: Day (voting) & Night (abilities)

**💡 Tips:**
  - Use numbers to vote: \`.ww vote 3\`
  - Private commands for night actions
  - Group commands for day voting
  - Minimum ${game.minPlayers} players needed

Select an action from the menu below:`;

      return await generateInteractiveMessage(
        conn,
        m.chat,
        helpText,
        m.sender,
        { title: "Menu", sections: listMessage }
      );
    }

    switch (subCommand) {
      case "create": {
        if (!m.isGroup) {
          return m.reply("❌ Perintah ini hanya bisa digunakan di dalam grup.");
        }

        const newLobby = game.createLobby(groupId, userId, userName);
        if (newLobby) {
          const gameStatus = createGameStatusMessage(newLobby, groupId, game);
          return await generateGameInfoMessage(conn, m.chat, m.sender, {
            title: "🎮 Lobby Created!",
            status: `by ${userName}`,
            description: `✅ Lobby werewolf berhasil dibuat!\n\n👥 Players: 1/${
              game.maxPlayers || 12
            }\n⏱️ Phase Time: ${
              game.phaseTime / 1000
            }s\n\nMenunggu pemain lain bergabung...`,
            actions: gameStatus,
          });
        } else {
          return m.reply(
            "❌ Lobby werewolf sudah ada di grup ini atau game sedang berjalan."
          );
        }
      }

      case "join": {
        if (!m.isGroup) {
          return m.reply("❌ Perintah ini hanya bisa digunakan di dalam grup.");
        }

        if (!lobby) {
          const listMessage = createMenuSectionsWereWolf();
          return await generateInteractiveMessage(
            conn,
            m.chat,
            "❌ Belum ada lobby werewolf di grup ini.\nBuat lobby baru terlebih dahulu:",
            m.sender,
            { title: "🐺 No Active Lobby", sections: listMessage }
          );
        }

        if (lobby.isGameStarted) {
          return m.reply("❌ Game sudah dimulai, tidak bisa bergabung.");
        }

        const joined = game.joinLobby(groupId, userId, userName);
        if (joined) {
          const playerCount = Object.keys(lobby.players).length;
          const gameStatus = createGameStatusMessage(lobby, groupId, game);
          return await generateGameInfoMessage(conn, m.chat, m.sender, {
            title: "🚪 Joined Lobby!",
            status: `${playerCount} players`,
            description: `✅ ${userName} bergabung ke lobby!\n\n👥 Players: ${playerCount}/${
              game.maxPlayers || 12
            }\n⏱️ Phase Time: ${game.phaseTime / 1000}s\n\n${
              lobby.getPlayerList() || "Loading players..."
            }`,
            actions: gameStatus,
          });
        } else {
          return m.reply(
            "❌ Gagal bergabung. Mungkin kamu sudah di dalam lobby."
          );
        }
      }

      case "list": {
        if (!m.isGroup) {
          return m.reply("❌ Perintah ini hanya bisa digunakan di dalam grup.");
        }

        if (lobby) {
          const playerCount = Object.keys(lobby.players).length;
          const gameStatus = createGameStatusMessage(lobby, groupId, game);
          const isGameRunning = lobby.isGameStarted;
          const gameState = game.gameStates[groupId];

          let statusText = `👥 **Player List** (${playerCount} players)\n\n`;
          statusText += lobby.getPlayerList() || "No players in lobby.";

          if (isGameRunning && gameState) {
            statusText += `\n\n🎮 **Game Status:**\n`;
            statusText += `Phase: ${
              gameState.phase === "day" ? "☀️ Day" : "🌙 Night"
            }\n`;
            statusText += `Alive: ${gameState.alivePlayers.length}/${playerCount}\n`;

            if (gameState.phase === "day") {
              const votingMessage = createVotingMessage(
                gameState,
                groupId,
                game
              );
              return await generateInteractiveMessage(
                conn,
                m.chat,
                statusText +
                  "\n🗳️ **Voting Phase Active**\nSelect a player to vote:",
                m.sender,
                votingMessage
              );
            }
          }

          return await generateGameInfoMessage(conn, m.chat, m.sender, {
            title: "👥 Player List",
            status: isGameRunning ? "🎮 Game Running" : "⏳ In Lobby",
            description: statusText,
            actions: gameStatus,
          });
        } else {
          const listMessage = createMenuSectionsWereWolf();
          return await generateInteractiveMessage(
            conn,
            m.chat,
            "🐺 Tidak ada lobby werewolf aktif di grup ini.\nBuat lobby baru untuk memulai:",
            m.sender,
            { title: "🐺 No Active Game", sections: listMessage }
          );
        }
      }

      case "vote": {
        if (m.isGroup) {
          conn.sendMessage(m.chat, {
            react: { text: "✅", key: m.key },
          });

          const gameState = game.gameStates[groupId];
          if (!gameState || !lobby?.isGameStarted) {
            return m.reply("❌ Game belum dimulai atau tidak ada game aktif.");
          }

          if (gameState.phase === "day") {
            if (!args[1]) {
              const votingMessage = createVotingMessage(
                gameState,
                groupId,
                game
              );
              return await generateInteractiveMessage(
                conn,
                m.chat,
                "🗳️ **Day Phase - Voting Time!**\n\nPilih pemain yang ingin kamu vote untuk dikeluarkan:",
                m.sender,
                votingMessage
              );
            }

            const targetNumber = parseInt(args[1]);
            if (isNaN(targetNumber) || targetNumber < 1) {
              const votingMessage = createVotingMessage(
                gameState,
                groupId,
                game
              );
              return await generateInteractiveMessage(
                conn,
                m.chat,
                "❌ Nomor pemain tidak valid. Pilih dari daftar di bawah:",
                m.sender,
                votingMessage
              );
            }

            const response = game.handleDayVote(groupId, userId, targetNumber);
            if (
              response &&
              !response.includes("dicatat") &&
              !response.includes("memilih")
            ) {
              return await m.reply(response);
            }
          } else {
            return m.reply(
              "❌ Voting hanya bisa dilakukan pada fase siang hari."
            );
          }
        } else {
          // Private werewolf vote
          const voteNumber = parseInt(args[1]);
          if (isNaN(voteNumber) || voteNumber < 1) {
            return m.reply(
              `❌ Nomor vote tidak valid. Gunakan angka sesuai urutan pemain di daftar (${usedPrefix}ww list di grup).`
            );
          }
          const response = game.handleWerewolfPrivateVote(userId, voteNumber);
          return await m.reply(response);
        }
      }

      case "start": {
        if (!m.isGroup) {
          return m.reply("❌ Perintah ini hanya bisa digunakan di dalam grup.");
        }

        if (!lobby) {
          return m.reply(
            `❌ Lobby tidak ditemukan. Buat dulu dengan ${usedPrefix}ww create.`
          );
        }

        // if (lobby.creator !== userId) {
        //   return m.reply(
        //     `❌ Hanya pembuat lobby yang dapat memulai permainan.`
        //   );
        // }

        if (lobby.isGameStarted) {
          return m.reply(`❌ Permainan sudah dimulai.`);
        }

        const playerCount = Object.keys(lobby.players).length;
        if (playerCount < game.minPlayers) {
          const gameStatus = createGameStatusMessage(lobby, groupId, game);
          return await generateGameInfoMessage(conn, m.chat, m.sender, {
            title: "❌ Not Enough Players",
            status: `${playerCount}/${game.minPlayers} minimum`,
            description: `Jumlah pemain minimal untuk memulai game adalah ${game.minPlayers} orang.\n\nSaat ini baru ${playerCount} pemain.\n\nAjak lebih banyak teman untuk bergabung!`,
            actions: gameStatus,
          });
        }

        await m.reply(
          `⏳ Memulai permainan werewolf... Peran akan dibagikan secara pribadi.`
        );

        if (!game.startGame(groupId)) {
          return await m.reply(
            `❌ Gagal memulai permainan. Cek konsol untuk error.`
          );
        }
        break;
      }

      case "seer": {
        if (m.isGroup) {
          return m.reply(
            "❌ Perintah Seer hanya bisa digunakan di chat pribadi dengan bot."
          );
        }
        const targetNumber = args[1];
        const response = game.handlePrivateSeerAction(userId, targetNumber);
        return await m.reply(response);
      }

      case "witch": {
        if (m.isGroup) {
          return m.reply(
            "❌ Perintah Witch hanya bisa digunakan di chat pribadi dengan bot."
          );
        }

        const action = args[1]?.toLowerCase();
        if (!action || (action !== "heal" && action !== "kill")) {
          return m.reply(`Usage: ${usedPrefix}ww witch <heal|kill> <number>`);
        }
        const targetNumber = args[2];
        const response = game.handlePrivateWitchAction(
          userId,
          action,
          targetNumber
        );
        return await m.reply(response);
      }

      case "shoot": {
        if (!m.isGroup) {
          return m.reply(
            "❌ Perintah Hunter menembak hanya bisa digunakan di grup tempat game berlangsung."
          );
        }
        const targetNumber = args[1];
        if (!targetNumber) {
          return m.reply(
            `Siapa yang ingin kamu tembak? Gunakan ${usedPrefix}ww shoot <number>.`
          );
        }

        const response = game.handleHunterShot(userId, targetNumber);
        if (response) {
          return await m.reply(response);
        }
        break;
      }

      case "leave": {
        if (!lobby) return m.reply("Belum ada lobby werewolf di grup ini.");
        if (lobby.isGameStarted)
          return m.reply("❌ Game sudah dimulai, tidak bisa keluar.");

        const left = game.leaveLobby(groupId, userId);
        if (left) {
          return await m.reply(
            `👋 ${userName} keluar dari lobby.\nPemain di lobby: ${
              lobby.getPlayerList() || "Tidak ada pemain di lobby."
            }`
          );
        } else {
          return await m.reply(
            `❌ Gagal keluar. Pastikan kamu ada di dalam lobby.`
          );
        }
      }

      case "end": {
        const lobby = game.getLobby(groupId);
        if (!lobby || !lobby.isGameStarted)
          return m.reply("Tidak ada game yang sedang berjalan untuk diakhiri.");
        if (lobby.creator !== userId)
          return m.reply("Hanya pembuat lobby yang bisa mengakhiri game.");

        game.endGame(groupId, "Diakhiri Paksa oleh Pembuat");
        return m.reply("Permainan telah diakhiri secara paksa.");
      }

      case "setphase": {
        if (!lobby)
          return m.reply(
            `Belum ada lobby werewolf di grup ini. Buat dulu dengan ${usedPrefix}ww create.`
          );
        if (lobby.isGameStarted)
          return m.reply(
            "❌ Game sudah dimulai, tidak bisa mengubah durasi fase."
          );

        const args = text.split(" ");
        if (args.length < 2 || isNaN(parseInt(args[1]))) {
          return m.reply(
            `Penggunaan: ${usedPrefix}ww setphase <detik>\nContoh: ${usedPrefix}ww setphase 60 (mengatur durasi fase menjadi 60 detik)`
          );
        }

        const newPhaseTimeInSeconds = parseInt(args[1]);
        const newPhaseTimeInMillis = newPhaseTimeInSeconds * 1000;

        game.setPhaseTime(newPhaseTimeInMillis);
        return await m.reply(
          `✅ Durasi fase berhasil diubah menjadi ${newPhaseTimeInSeconds} detik.`
        );
      }

      default: {
        const listMessage = createMenuSectionsWereWolf();
        return await generateInteractiveMessage(
          conn,
          m.chat,
          `❌ Perintah tidak dikenali!\n\nGunakan menu di bawah untuk melihat semua perintah yang tersedia:`,
          m.sender,
          { title: "Game Menu", sections: listMessage }
        );
      }
    }
  } else if (command === "vote") {
    // Handle vote alias
    if (!m.isGroup) {
      return m.reply("❌ Perintah vote hanya bisa digunakan di grup.");
    }

    conn.sendMessage(m.chat, {
      react: { text: "✅", key: m.key },
    });

    const gameState = game.gameStates[groupId];
    if (!gameState || !lobby?.isGameStarted) {
      return m.reply("❌ Game belum dimulai atau tidak ada game aktif.");
    }

    if (gameState.phase === "day") {
      if (!args[0]) {
        const votingMessage = createVotingMessage(gameState, groupId, game);
        return await generateInteractiveMessage(
          conn,
          m.chat,
          "🗳️ **Day Phase - Voting Time!**\n\nPilih pemain yang ingin kamu vote untuk dikeluarkan:",
          m.sender,
          votingMessage
        );
      }

      const targetNumber = parseInt(args[0]);
      const response = game.handleDayVote(groupId, userId, targetNumber);
      if (
        response &&
        !response.includes("dicatat") &&
        !response.includes("memilih")
      ) {
        return await m.reply(response);
      }
    }
  }
};

handler.help = ["ww <perintah>"];
handler.tags = ["game"];
handler.command = /^(werewolf|ww|vote)$/i;
handler.group = false;
handler.register = true;

module.exports = handler;
