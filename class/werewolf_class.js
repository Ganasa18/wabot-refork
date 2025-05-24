const fs = require("fs");
const path = require("path");
const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} = require("baileys");

// Path to database file
const DATABASE_PATH = path.join(__dirname, "../json/werewolf.json");
class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.role = null;
    this.isAlive = true;
    this.votedFor = null;
    this.indexMap = null;
    // Tambahan untuk Witch dan Hunter jika ingin melacak penggunaan power di player object
    // this.witchHealUsed = false;
    // this.witchKillUsed = false;
    // this.hunterShotUsed = false;
  }
}

class Lobby {
  constructor(id, creator) {
    this.id = id;
    this.creator = creator;
    this.players = {};
    this.isGameStarted = false;
  }

  addPlayer(playerId, playerName) {
    if (!this.players[playerId]) {
      this.players[playerId] = new Player(playerId, playerName);
      return true;
    }
    return false;
  }

  removePlayer(playerId) {
    if (this.players[playerId]) {
      delete this.players[playerId];
      return true;
    }
    return false;
  }

  getPlayerList() {
    return Object.values(this.players)
      .map((player) => `${player.name} (${player.id.split("@")[0]})`)
      .join(", ");
  }

  getPlayerById(playerId) {
    return this.players[playerId];
  }
}

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

class WareWolfGame {
  constructor(bot) {
    this.lobbies = {}; // Menyimpan informasi lobby berdasarkan ID grup
    this.gameStates = {}; // Menyimpan status game yang sedang berjalan
    this.timers = {}; // Menyimpan timer untuk setiap game
    this.botInstance = bot;
    this.botPrefix = "/";
    this.phaseTime = 180000;
    this.minPlayers = 2;
    // Initialize database
    this.playerGameMapping = {}; // Track which player is in which game
    this.activeGames = new Set(); // Track active games
    // this.loadFromDatabase();
  }

  setPhaseTime(time) {
    this.phaseTime = time;
  }

  setBotInstance(bot) {
    this.botInstance = bot;
  }

  loadFromDatabase() {
    try {
      if (fs.existsSync(DATABASE_PATH)) {
        const data = JSON.parse(fs.readFileSync(DATABASE_PATH, "utf8"));

        // Check for active hunter pending shots before overwriting
        const activeHunters = [];
        if (this.gameStates) {
          Object.keys(this.gameStates).forEach((groupId) => {
            if (this.gameStates[groupId].hunterPendingShot) {
              activeHunters.push(groupId);
            }
          });
        }

        if (activeHunters.length > 0) {
          console.warn(
            `⚠️  WARNING: Loading database while ${activeHunters.length} hunter(s) pending shot in games:`,
            activeHunters
          );
        }

        this.gameStates = data.gameStates || {};
        this.playerGameMapping = data.playerGameMapping || {};
        this.lobbies = data.lobbies || {};
        this.activeGames = new Set(data.activeGames || []);

        console.log(
          `📁 Loaded database: ${Object.keys(this.gameStates).length} games, ${
            Object.keys(this.playerGameMapping).length
          } players`
        );

        for (const groupId in this.gameStates) {
          if (!this.gameStates[groupId].wolfVotes) {
            this.gameStates[groupId].wolfVotes = {};
          }
        }

        // Log any hunter pending shots that were loaded
        Object.keys(this.gameStates).forEach((groupId) => {
          if (this.gameStates[groupId].hunterPendingShot) {
            console.log(
              `📁 LOADED hunterPendingShot for ${groupId}:`,
              this.gameStates[groupId].hunterPendingShot
            );
          }
        });
      }
    } catch (error) {
      console.error("Error loading database:", error);
      this.gameStates = {};
      this.playerGameMapping = {};
      this.lobbies = {};
      this.activeGames = new Set();
    }
  }

  // Enhanced saveToDatabase method with better logging
  saveToDatabase() {
    try {
      const data = {
        gameStates: this.gameStates,
        playerGameMapping: this.playerGameMapping,
        lobbies: this.lobbies,
        activeGames: Array.from(this.activeGames || []),
        lastUpdated: new Date().toISOString(),
      };

      // Debug log for hunter pending shots before saving
      Object.keys(this.gameStates).forEach((groupId) => {
        if (this.gameStates[groupId].hunterPendingShot) {
          console.log(
            `💾 SAVING hunterPendingShot for ${groupId}:`,
            this.gameStates[groupId].hunterPendingShot
          );
        }
      });

      fs.writeFileSync(DATABASE_PATH, JSON.stringify(data, null, 2));
      console.log(
        `💾 Database saved: ${Object.keys(this.gameStates).length} games`
      );
    } catch (error) {
      console.error("Error saving database:", error);
    }
  }

  removeGameFromDatabase(groupId) {
    try {
      if (this.gameStates[groupId]) {
        // Remove all players from tracking
        const players = this.getPlayersInGame(groupId);
        players.forEach((playerId) => {
          delete this.playerGameMapping[playerId];
        });

        // Remove game state
        delete this.gameStates[groupId];

        // Remove from active games
        if (this.activeGames) {
          this.activeGames.delete(groupId);
        }

        // Remove lobby
        if (this.lobbies[groupId]) {
          delete this.lobbies[groupId];
        }

        // Save changes to file
        this.saveToDatabase();

        console.log(`🗑️ Removed game ${groupId} from database`);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error removing game from database:", error);
      return false;
    }
  }

  createLobby(groupId, creatorId, creatorName) {
    if (!this.lobbies[groupId]) {
      this.lobbies[groupId] = new Lobby(groupId, creatorId);

      this.lobbies[groupId].addPlayer(creatorId, creatorName);
      return this.lobbies[groupId];
    }
    return null; // Lobby sudah ada
  }

  getLobby(groupId) {
    return this.lobbies[groupId];
  }

  joinLobby(groupId, playerId, playerName) {
    const lobby = this.getLobby(groupId);
    if (lobby && !lobby.isGameStarted) {
      return lobby.addPlayer(playerId, playerName);
    }
    return false;
  }

  leaveLobby(groupId, playerId) {
    const lobby = this.getLobby(groupId);
    if (lobby && !lobby.isGameStarted) {
      return lobby.removePlayer(playerId);
    }
    return false;
  }

  isPlayerInGame(playerId) {
    if (!this.playerGameMapping) {
      this.playerGameMapping = {};
    }

    const groupId = this.playerGameMapping[playerId];
    if (!groupId || !this.gameStates[groupId]) {
      // Clean up if mapping exists but game doesn't
      if (groupId) {
        delete this.playerGameMapping[playerId];
        this.saveToDatabase();
      }
      return null;
    }

    const gameState = this.gameStates[groupId];
    const isAlive = gameState.alivePlayers.includes(playerId);

    return {
      groupId: groupId,
      isAlive: isAlive,
      role: gameState.playerRoles[playerId],
      phase: gameState.phase,
      dayNumber: gameState.dayNumber,
      gameState: gameState,
    };
  }

  /**
   * Add player to game tracking
   */
  addPlayerToGame(playerId, groupId) {
    if (!this.playerGameMapping) {
      this.playerGameMapping = {};
    }

    this.playerGameMapping[playerId] = groupId;
    this.saveToDatabase();
  }

  /**
   * Get all players in a specific game
   */
  getPlayersInGame(groupId) {
    if (!this.gameStates[groupId]) return [];
    return Object.keys(this.gameStates[groupId].playerRoles || {});
  }

  /**
   * Get player status with detailed information
   */
  getPlayerStatus(playerId) {
    const gameInfo = this.isPlayerInGame(playerId);

    if (!gameInfo) {
      return {
        inGame: false,
        playerId: playerId,
        message: "Pemain tidak sedang dalam permainan apapun",
      };
    }

    return {
      inGame: true,
      playerId: playerId,
      groupId: gameInfo.groupId,
      role: gameInfo.role,
      isAlive: gameInfo.isAlive,
      phase: gameInfo.phase,
      dayNumber: gameInfo.dayNumber,
      message: `Sedang bermain di grup ${gameInfo.groupId} sebagai ${gameInfo.role}`,
    };
  }

  /**
   * Remove player from game tracking
   */
  removePlayerFromGame(playerId) {
    if (this.playerGameMapping && this.playerGameMapping[playerId]) {
      delete this.playerGameMapping[playerId];
      this.saveToDatabase();
    }
  }

  getRoleDescription(role) {
    switch (role.toLowerCase()) {
      case "werewolf":
        return "🐺 WEREWOLF: Setiap malam, berdiskusilah dengan werewolf lain (jika ada) melalui chat pribadi dan gunakan perintah `.ww vote <nomor>` di grup utama untuk memilih korban (gunakan nomor urut pemain dari daftar).";
      case "seer":
        return `👁️ SEER: Setiap malam, kamu bisa memilih satu pemain untuk dilihat perannya. Gunakan perintah .ww seer <nomor> di chat pribadi dengan bot (gunakan nomor urut pemain dari daftar).`;
      case "witch":
        return `🧪 WITCH: Kamu memiliki dua ramuan (masing-masing sekali pakai): satu untuk menyembuhkan pemain yang dibunuh werewolf malam ini, dan satu untuk membunuh pemain lain. Gunakan perintah .ww witch heal <nomor> atau .ww witch kill <nomor> di chat pribadi dengan bot pada malam hari (gunakan nomor urut pemain dari daftar).`;
      case "hunter":
        return `🏹 HUNTER: Jika kamu mati (voting), kamu bisa memilih satu pemain lain untuk ikut mati bersamamu. Setelah kematianmu diumumkan, gunakan perintah .ww shoot <nomor> di grup utama.`;
      case "villager":
        return "🧑‍🌾 VILLAGER: Tugasmu adalah mengidentifikasi werewolf di antara penduduk desa dan melakukan voting untuk mengeluarkannya pada siang hari.";
      default:
        return "Peran tidak diketahui.";
    }
  }

  startGame(groupId) {
    const lobby = this.getLobby(groupId);
    if (!lobby) return false;

    if (
      lobby.isGameStarted ||
      Object.keys(lobby.players).length < this.minPlayers
    ) {
      return false;
    }

    const players = Object.values(lobby.players);
    const numPlayers = players.length;
    const roles = [];

    // DEBUG MODE: For 4 players with fixed role order for debugging

    // Use existing role distribution logic for other player counts
    let numWerewolf = Math.floor(numPlayers / 3);
    if (numPlayers > 6) numWerewolf = Math.max(2, Math.floor(numPlayers / 3));
    numWerewolf = Math.max(1, numWerewolf); // Ensure at least 1 werewolf

    let numSeer = numPlayers >= 4 ? 1 : 0;
    let numWitch = numPlayers >= 5 ? 1 : 0;
    let numHunter = numPlayers >= 8 ? 1 : 0;

    let numSpecialRoles = numWerewolf + numSeer + numWitch + numHunter;
    let numVillager = numPlayers - numSpecialRoles;

    // If too many special roles, reduce from the most "optional" or add villagers
    if (numVillager < 0) {
      // Reduction priority: Hunter -> Witch -> Seer (if villagers still lacking)
      if (numHunter > 0) {
        numHunter--;
        numSpecialRoles--;
      }

      if (numVillager < 0 && numWitch > 0) {
        numWitch--;
        numSpecialRoles--;
      }

      // Seer is usually important, so try to keep it if possible
      // But if we still have negative villagers, we need to reduce seer too
      if (numVillager < 0 && numSeer > 0) {
        numSeer--;
        numSpecialRoles--;
      }

      numVillager = numPlayers - numSpecialRoles;
      numVillager = Math.max(0, numVillager); // Ensure not negative
    }

    for (let i = 0; i < numWerewolf; i++) roles.push("werewolf");
    for (let i = 0; i < numSeer; i++) roles.push("seer");
    for (let i = 0; i < numWitch; i++) roles.push("witch");
    for (let i = 0; i < numHunter; i++) roles.push("hunter");
    for (let i = 0; i < numVillager; i++) roles.push("villager");

    // Randomize roles for cases other than debug mode
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    const playerRoles = {};
    const witchState = {};
    const playerIndexMap = {}; // For mapping order number to playerId
    this.currentGameId = groupId;

    // Create list of players with order numbers
    let playerListText = "📋 *Daftar Pemain (Nomor Urut):*\n\n";
    players.forEach((player, index) => {
      player.role = roles[index];
      playerRoles[player.id] = player.role;
      playerIndexMap[index + 1] = player.id;
      player.indexMap = index + 1;

      if (player.role === "witch") {
        witchState[player.id] = { healAvailable: true, killAvailable: true };
      }

      playerListText += `${index + 1}. ${player.name}\n`;
    });

    this.gameStates[groupId] = {
      phase: "night",
      dayNumber: 0,
      alivePlayers: Object.keys(lobby.players),
      playerRoles: playerRoles,
      playerIndexMap: playerIndexMap,
      wolfVotes: {},
      werewolfTarget: null,
      seerTarget: null,
      witchAction: {},
      witchHealTarget: null,
      witchKillTarget: null,
      witchPotionsUsed: witchState,
      hunterPendingShot: null,
      votes: {},
      nightActionsResolved: false,
      groupId: groupId,
      playerList: players,
      nightActionsUsed: null,
    };

    // Add to active games
    if (!this.activeGames) {
      this.activeGames = new Set();
    }
    this.activeGames.add(groupId);

    // Save to database
    lobby.isGameStarted = true;
    this.saveToDatabase();

    // Send info to all players
    players.forEach((player) => {
      const roleDescription = this.getRoleDescription(player.role);
      const privateMessage =
        `🐺 *PERMAINAN DIMULAI!* 🐺\n\n` +
        `👤 *Nama:* ${player.name}\n` +
        `🎭 *Peran:* ${player.role.toUpperCase()}\n\n` +
        `${roleDescription}\n\n` +
        `${playerListText}\n\n` +
        `📢 *Petunjuk:* Gunakan nomor urut pemain untuk memilih target`;

      this.botInstance.sendMessage(player.id, { text: privateMessage });
    });

    setTimeout(() => {
      // Opening message in group
      const groupMessage =
        `Permainan Werewolf dimulai!\n\n` +
        `${playerListText}\n\n` +
        `📢 *Perhatikan:*\n` +
        `- Pemain khusus akan menerima petunjuk via chat pribadi\n` +
        `- Gunakan nomor urut pemain untuk memilih target`;

      this.botInstance.sendMessage(groupId, { text: groupMessage });
    }, 10000);

    // this.startDay(groupId);
    this.startNight(groupId);

    // Set phase timer
    if (this.timers[groupId]) clearInterval(this.timers[groupId]);
    this.startPhaseTimer(groupId);
    return true;
  }

  startPhaseTimer(groupId) {
    const gameState = this.gameStates[groupId];
    if (!gameState) return;

    if (this.timers[groupId]) {
      clearInterval(this.timers[groupId]);
    }

    this.timers[groupId] = setInterval(() => {
      this.autoNextPhase(groupId);
    }, this.phaseTime);
  }

  autoNextPhase(groupId) {
    const gameState = this.gameStates[groupId];

    if (!gameState || !this.activeGames?.has(groupId)) {
      if (this.timers[groupId]) {
        clearInterval(this.timers[groupId]);
        clearTimeout(this.timers[groupId]);
        delete this.timers[groupId];
      }
      return;
    }

    if (this.timers[groupId]) {
      clearInterval(this.timers[groupId]);
      this.timers[groupId] = null;
    }

    if (gameState.phase === "night" && !gameState.nightActionsResolved) {
      this.botInstance.sendMessage(groupId, {
        text: "⏳ Waktu malam hampir habis! Segera selesaikan aksimu.",
      });

      this.timers[groupId] = setTimeout(() => {
        if (!this.gameStates[groupId] || !this.activeGames?.has(groupId)) {
          return;
        }

        if (gameState.phase === "night" && !gameState.nightActionsResolved) {
          this.botInstance.sendMessage(groupId, {
            text: "⏰ Waktu malam habis! Memproses kejadian malam...",
          });

          this.resolveNightActions(groupId); // Force night actions
        }
        // After resolving, start the timer for the next phase (Day)
        if (this.gameStates[groupId] && this.activeGames?.has(groupId)) {
          this.startPhaseTimer(groupId);
        }
      }, 30000); // 30 seconds additional for night actions
    } else if (gameState.phase === "day") {
      this.botInstance.sendMessage(groupId, {
        text: "⏳ Waktu diskusi dan voting siang hampir habis!",
      });

      // Give a grace period, then force transition
      this.timers[groupId] = setTimeout(() => {
        // Double-check game is still active before proceeding
        if (!this.gameStates[groupId] || !this.activeGames?.has(groupId)) {
          return;
        }

        if (gameState.phase === "day") {
          this.botInstance.sendMessage(groupId, {
            text: "⏰ Waktu siang habis! Memproses hasil voting...",
          });
          this.resolveDayVotes(groupId); // Force day votes
        }
        // After resolving, start the timer for the next phase (Night)
        if (this.gameStates[groupId] && this.activeGames?.has(groupId)) {
          this.startPhaseTimer(groupId);
        }
      }, 30000); // 30 seconds additional for day voting
    }
  }

  processPhaseChange(groupId, newPhase) {
    const gameState = this.gameStates[groupId];
    if (!gameState) return;

    console.log("DEBUG: PROCESS PHASE CHANGE", newPhase);
    // Ubah fase
    gameState.phase = newPhase;

    if (newPhase === "day") {
      gameState.dayNumber++;
      // Reset variabel yang terkait dengan fase malam
      gameState.wolfVotes = {};
      gameState.seerTarget = null;
      gameState.witchHealTarget = null;
      gameState.witchKillTarget = null;
      // Memulai fase siang

      setTimeout(() => {
        this.startDay(groupId);
      }, 2000);
    } else if (newPhase === "night") {
      // Memulai fase malam
      setTimeout(() => {
        this.startNight(groupId);
      }, 2000);
    }
    // Cek kondisi kemenangan setiap pergantian fase
    this.checkWinCondition(groupId);
  }

  endGame(groupId, winner) {
    const lobby = this.getLobby(groupId);
    if (!lobby) return;

    // Clear current game ID first to prevent any further processing
    if (this.currentGameId === groupId) {
      this.currentGameId = null;
    }

    // Clear ALL timers - both setInterval and setTimeout
    if (this.timers[groupId]) {
      clearInterval(this.timers[groupId]);
      clearTimeout(this.timers[groupId]); // Also clear setTimeout from autoNextPhase
      delete this.timers[groupId];
    }

    // Remove from active games set
    if (this.activeGames) {
      this.activeGames.delete(groupId);
    }

    // Clean up game state BEFORE sending final message
    delete this.gameStates[groupId];

    // Send final message
    setTimeout(() => {
      this.botInstance.sendMessage(groupId, {
        text: `🎉 Permainan Berakhir! 🎉\n\nPemenangnya adalah: *${winner}*!\n\nPeran pemain:\n${Object.values(
          lobby.players
        )
          .map((p) => `${p.name}: ${p.role || "Belum dapat peran"}`)
          .join("\n")}`,
      });
    }, 4000);

    // Reset lobby state
    lobby.isGameStarted = false;

    // Clean up players' roles
    Object.values(lobby.players).forEach((player) => {
      delete player.role;
      delete player.indexMap;
    });

    // Remove from database and clean up lobby
    this.removeGameFromDatabase(groupId);
    delete this.lobbies[groupId];
  }

  handleDayVote(groupId, voterId, targetNumber) {
    const gameState = this.gameStates[groupId];
    const lobby = this.getLobby(groupId);
    if (!gameState || !lobby) return "Game tidak ditemukan.";
    if (gameState.phase !== "day") return "Bukan waktunya voting siang.";
    if (!lobby.players[voterId].isAlive)
      return "Kamu sudah mati atau tidak dalam game.";

    const targetId = gameState.playerIndexMap[parseInt(targetNumber)];
    const checkUserIsAlive = this.checkUserIsAlive(groupId, voterId);

    if (!targetId || !checkUserIsAlive)
      return "Target tidak valid atau sudah mati. Gunakan nomor urut pemain yang ada di daftar.";

    if (voterId === targetId) return "Kamu tidak bisa vote dirimu sendiri.";

    gameState.votes[voterId] = targetId;
    const voterName = this.getPlayerNameById(groupId, voterId);
    const targetName = this.getPlayerNameById(groupId, targetId);
    this.botInstance.sendMessage(groupId, {
      text: `🗳️ ${voterName} telah memilih pemain nomor ${targetNumber} (${targetName}).`,
    });

    const allPlayers = this.getAllPlayersArray(groupId);
    const alivePlayerList = allPlayers.filter((p) => p.isAlive);
    const aliveVoters = alivePlayerList.length;

    if (Object.keys(gameState.votes).length >= aliveVoters) {
      this.botInstance.sendMessage(groupId, {
        text: "Semua pemain hidup telah melakukan voting. Hasil akan segera diumumkan.",
      });
      this.resolveDayVotes(groupId);
    } else {
      // Beri tahu sisa vote jika perlu
      this.botInstance.sendMessage(groupId, {
        text: `${
          aliveVoters - Object.keys(gameState.votes).length
        } pemain lagi belum vote.`,
      });
    }
    return `Pilihanmu untuk pemain nomor ${targetNumber} (${targetName}) telah dicatat.`;
  }

  resolveDayVotes(groupId) {
    const gameState = this.gameStates[groupId];
    const lobby = this.getLobby(groupId);
    if (!gameState || !lobby) return;

    gameState.dayActionsResolved = true;

    const voteCounts = {};
    let maxVotes = 0;
    let targetsWithMaxVotes = [];

    for (const voter in gameState.votes) {
      const target = gameState.votes[voter];
      voteCounts[target] = (voteCounts[target] || 0) + 1;
    }

    for (const target in voteCounts) {
      if (voteCounts[target] > maxVotes) {
        maxVotes = voteCounts[target];
        targetsWithMaxVotes = [target];
      } else if (voteCounts[target] === maxVotes) {
        targetsWithMaxVotes.push(target);
      }
    }

    let playerEliminatedId = null;
    let eliminatedPlayerName = ""; // Deklarasikan di sini
    let eliminatedPlayerRole = ""; // Deklarasikan di sini
    console.log("DEBUG: VOTER TARGET", targetsWithMaxVotes);
    console.log("DEBUG: VOTER maxVotes", maxVotes);

    if (targetsWithMaxVotes.length === 1 && maxVotes > 0) {
      playerEliminatedId = targetsWithMaxVotes[0];
      eliminatedPlayerName = this.getPlayerNameById(
        groupId,
        playerEliminatedId
      );
      eliminatedPlayerRole = gameState.playerRoles[playerEliminatedId];
      setTimeout(() => {
        this.botInstance.sendMessage(groupId, {
          text: `⚖️ Hasil Voting Siang: ${eliminatedPlayerName} mendapat suara terbanyak (${maxVotes} suara) dan dikeluarkan dari desa! Perannya adalah *${eliminatedPlayerRole.toUpperCase()}*.`,
        });
      }, 3000);

      // Mark player as dead
      this.killPlayer(groupId, playerEliminatedId, "vote_out");
      setTimeout(() => {
        this.botInstance.sendMessage(playerEliminatedId, {
          text: "💀 Kamu telah divote keluar oleh penduduk desa.",
        });
      }, 2000);
    } else if (targetsWithMaxVotes.length > 1) {
      setTimeout(() => {
        this.botInstance.sendMessage(groupId, {
          text: `⚖️ Hasil Voting Siang: Terjadi seri! Tidak ada yang dikeluarkan dari desa hari ini.`,
        });
      }, 2000);
    } else {
      setTimeout(() => {
        this.botInstance.sendMessage(groupId, {
          text: `⚖️ Hasil Voting Siang: Tidak ada yang dikeluarkan dari desa hari ini.`,
        });
      }, 2000);
      // Tidak ada vote sama sekali atau tidak ada target yg dapat vote signifikan
    }

    this.saveToDatabase();
    this.processPhaseChange(groupId, "night"); // Ini akan lanjut ke malam
  }

  startDay(groupId) {
    const gameState = this.gameStates[groupId];
    if (!gameState) return;

    gameState.votes = {}; // Reset votes untuk hari ini
    // Option 3: Separate alive and dead lists
    const allPlayers = this.getAllPlayersArray(groupId);
    const alivePlayers = allPlayers.filter((p) => p.isAlive);
    const deadPlayers = allPlayers.filter((p) => !p.isAlive);

    let message = "\n📋 Status Pemain:\n\n";

    if (alivePlayers.length > 0) {
      message += "✅ **Masih Hidup:**\n";
      alivePlayers.forEach((player) => {
        message += `${player.indexMap}. ${player.name}\n`;
      });
    }

    if (deadPlayers.length > 0) {
      message += "\n💀 **Sudah Mati:**\n";
      deadPlayers.forEach((player) => {
        message += `${player.indexMap}. ${player.name}\n`;
      });
    }

    if (gameState.alivePlayers.length === 0) {
      this.botInstance.sendMessage(groupId, {
        text: "Semua pemain mati? Ini aneh.",
      });
      this.endGame(groupId, "draw"); // Atau kondisi lain
      return;
    }
    setTimeout(() => {
      this.botInstance.sendMessage(groupId, {
        text: `☀️ Hari ke-${gameState.dayNumber} telah tiba!\n\n${message}\n\nSaatnya berdiskusi dan melakukan voting untuk mengeluarkan pemain yang dicurigai. Gunakan perintah .ww vote <nomor> untuk memilih.`,
      });
    }, 2000);
    this.startPhaseTimer(groupId);
  }

  startNight(groupId) {
    const gameState = this.gameStates[groupId];
    if (!gameState) return;

    gameState.phase = "night";
    gameState.dayNumber++;

    // Reset all night action states
    gameState.wolfVotes = {};
    gameState.seerTarget = null;

    // PERBAIKAN: Jangan reset witchAction jika sudah ada dan belum diproses
    if (!gameState.nightActionsResolved) {
      console.log(
        "DEBUG: Preserving existing witchAction:",
        JSON.stringify(gameState.witchAction)
      );
    } else {
      gameState.witchAction = {};
    }

    gameState.werewolfTarget = null;
    gameState.nightActionsResolved = false;

    // Initialize night action tracking for each role
    gameState.nightActionsUsed = {
      werewolf: {},
      seer: {},
      witch: {},
    };

    this.saveToDatabase();
    this.botInstance.sendMessage(groupId, {
      text: `🌙 Malam ke-${gameState.dayNumber} telah tiba! Waktunya peran khusus beraksi.`,
    });

    // Send role-specific messages
    if (gameState.dayNumber !== 1) this.sendNightRoleMessages(groupId);
    this.startPhaseTimer(groupId);
  }

  sendNightRoleMessages(groupId) {
    const gameState = this.gameStates[groupId];
    // Show alive players
    const allPlayers = this.getAllPlayersArray(groupId);
    const alivePlayers = allPlayers.filter((p) => p.isAlive);
    const deadPlayers = allPlayers.filter((p) => !p.isAlive);

    let message = "\n📋 Status Pemain:\n\n";
    if (alivePlayers.length > 0) {
      message += "✅ **Masih Hidup:**\n";
      alivePlayers.forEach((player) => {
        message += `${player.indexMap}. ${player.name}\n`;
      });
    }

    if (deadPlayers.length > 0) {
      message += "\n💀 **Sudah Mati:**\n";
      deadPlayers.forEach((player) => {
        message += `${player.indexMap}. ${player.name}\n`;
      });
    }

    alivePlayers.forEach((player) => {
      if (!player.isAlive) return;
      const role = player.role;
      let privateMessage = `🌙 Malam ke-${gameState.dayNumber} telah tiba!\n${message}\n\n`;
      const roleDescription = this.getRoleDescription(role);

      switch (role) {
        case "werewolf":
          privateMessage += `${roleDescription}`;
          this.botInstance.sendMessage(player.id, { text: privateMessage });
          break;

        case "seer":
          privateMessage += `${roleDescription}`;
          this.botInstance.sendMessage(player.id, { text: privateMessage });
          break;

        case "witch":
          privateMessage += this.getWitchMessage(groupId, player.id);
          this.botInstance.sendMessage(player.id, { text: privateMessage });
          break;
      }
    });
  }

  getWitchMessage(groupId, witchId) {
    const gameState = this.gameStates[groupId];
    const witchState = gameState.witchPotionsUsed[witchId] || {
      healAvailable: true,
      killAvailable: true,
    };

    let potionInfo = "";
    if (witchState.healAvailable) {
      potionInfo +=
        "- Ramuan Penyembuh: Tersedia (gunakan `.ww heal [nomor]`)\n";
    }
    if (witchState.killAvailable) {
      potionInfo +=
        "- Ramuan Pembunuh: Tersedia (gunakan `/ww kill [nomor]`)\n";
    }
    if (potionInfo === "") {
      potionInfo = "Tidak ada ramuan yang tersisa.";
    }

    return `🧙‍♀️ Sebagai Penyihir:\n${potionInfo}\n\nKamu bisa menggunakan ramuanmu di chat pribadi ini.`;
  }

  resolveNightActions(groupId) {
    this.loadFromDatabase();
    const gameState = this.gameStates[groupId];
    const lobby = this.getLobby(groupId);
    if (!gameState || !lobby || gameState.nightActionsResolved) return; // Already processed or game doesn't exist

    let nightEvents = ["🌙 Hasil Malam Ini:"];
    let playersKilledTonightIds = new Set(); // IDs of players killed tonight
    gameState.werewolfTargetSaved = false;

    // 1. Determine Werewolf target (if any votes)
    const finalWerewolfTargetId = this.processWerewolfVotes(
      gameState,
      nightEvents
    );

    // 2. Process Witch actions
    this.processWitchActions(
      gameState,
      nightEvents,
      playersKilledTonightIds,
      finalWerewolfTargetId
    );

    // 3. Process deaths from Werewolf (if target still exists after Witch actions)
    const { isHunterKilledByWerewolf, killedHunterId } =
      this.processWerewolfKills(
        gameState,
        nightEvents,
        playersKilledTonightIds,
        finalWerewolfTargetId
      );

    // 4. Process Seer actions
    this.processSeerActions(gameState);

    // 5. Send night results to group
    this.botInstance.sendMessage(groupId, { text: nightEvents.join("\n") });

    // 6. Process deaths and check for Hunter

    this.processDeathsAndHunter(
      groupId,
      playersKilledTonightIds,
      isHunterKilledByWerewolf,
      killedHunterId
    );
  }

  killPlayer(groupId, playerId, reason = "eliminated") {
    const gameState = this.gameStates[groupId];
    const lobby = this.getLobby(groupId);
    if (!lobby && !gameState) return;

    const player = gameState.playerList.find((p) => p.id === playerId);
    if (player) {
      player.isAlive = false;
    }
    gameState.alivePlayers = gameState.alivePlayers.filter(
      (p) => p !== playerId
    );
    console.log(
      `DEBUG: KILL PLAYER GAME STATE AFTER STRING ${JSON.stringify(gameState)}`
    );
    this.saveToDatabase();
  }
  getAlivePlayersList(groupId) {
    // this.loadFromDatabase();
    const gameState = this.gameStates[groupId];
    if (!gameState) return "";

    return Object.entries(gameState.playerIndexMap)
      .filter(([number, playerId]) => gameState.alivePlayers.includes(playerId))
      .map(
        ([number, playerId]) =>
          `${number}. ${this.getPlayerNameById(groupId, playerId)}`
      )
      .join("\n");
  }

  getAllPlayersArray(groupId) {
    // this.loadFromDatabase();
    const gameState = this.gameStates[groupId];
    if (!gameState) return [];
    return gameState.playerList || [];
  }

  validateNightAction(gameState, lobby, playerId, expectedRole) {
    if (!gameState || !lobby) {
      return "Permainan tidak sedang berjalan.";
    }

    if (gameState.phase !== "night") {
      return `Bukan waktunya ${expectedRole} beraksi.`;
    }

    if (gameState.playerRoles[playerId] !== expectedRole) {
      return `Kamu bukan ${expectedRole} yang hidup.`;
    }

    if (!gameState.alivePlayers.includes(playerId)) {
      return `Kamu sudah mati dan tidak bisa beraksi.`;
    }

    return true;
  }

  validateTarget(gameState, targetNumber) {
    const targetIndex = parseInt(targetNumber);

    if (
      isNaN(targetIndex) ||
      targetIndex < 1 ||
      !gameState.playerIndexMap[targetIndex]
    ) {
      return { error: "Nomor target tidak valid." };
    }

    const targetId = gameState.playerIndexMap[targetIndex];

    if (!gameState.alivePlayers.includes(targetId)) {
      return { error: "Target tidak valid atau sudah mati." };
    }

    const targetName = this.getPlayerNameById(
      gameState.groupId || Object.keys(this.gameStates)[0],
      targetId
    );

    return { targetId, targetName };
  }

  // Fungsi Role untuk werewolf memilih target (dipanggil dari handler via /vote di grup)
  handleWerewolfPrivateVote(voterId, targetIndex) {
    const groupId = this.findGroupIdByUserId(voterId);
    if (!groupId) return "Kamu tidak sedang berpartisipasi dalam game aktif.";

    const gameState = this.gameStates[groupId];
    const lobby = this.getLobby(groupId);

    if (!gameState || !lobby || gameState.phase !== "night")
      return "Bukan waktunya werewolf memilih.";
    if (
      gameState.playerRoles[voterId] !== "werewolf" ||
      !gameState.alivePlayers.includes(voterId)
    )
      return "Kamu bukan werewolf yang hidup.";

    const targetNumber = parseInt(targetIndex);
    if (
      isNaN(targetNumber) ||
      targetNumber < 1 ||
      !gameState.playerIndexMap[targetNumber]
    )
      return "Nomor target tidak valid.";

    const targetId = gameState.playerIndexMap[targetNumber];

    if (!gameState.alivePlayers.includes(targetId))
      return "Target tidak valid atau sudah mati.";
    if (gameState.playerRoles[targetId] === "werewolf")
      return "Tidak bisa memilih sesama werewolf.";

    // Simpan vote werewolf
    if (!gameState.wolfVotes) gameState.wolfVotes = {};
    gameState.wolfVotes[voterId] = targetId;
    const targetName = this.getPlayerNameById(groupId, targetId);
    // Debug log
    console.log(`Werewolf vote recorded:`, {
      voterId,
      targetId,
      wolfVotes: gameState.wolfVotes,
    });

    this.saveToDatabase();
    return `🐺 Pilihanmu untuk pemain nomor ${targetNumber} (${targetName}) telah dicatat.`;
  }

  processWerewolfVotes(gameState, nightEvents) {
    const wolfVoteCounts = {};

    for (const voterId in gameState.wolfVotes) {
      const target = gameState.wolfVotes[voterId];
      wolfVoteCounts[target] = (wolfVoteCounts[target] || 0) + 1;
    }

    let finalWerewolfTargetId = null;
    let maxVotes = 0;

    for (const targetId in wolfVoteCounts) {
      if (wolfVoteCounts[targetId] > maxVotes) {
        maxVotes = wolfVoteCounts[targetId];
        finalWerewolfTargetId = targetId;
      } else if (wolfVoteCounts[targetId] === maxVotes) {
        // Handle ties randomly
        const tiedTargets = Object.keys(wolfVoteCounts).filter(
          (id) => wolfVoteCounts[id] === maxVotes
        );
        finalWerewolfTargetId =
          tiedTargets[Math.floor(Math.random() * tiedTargets.length)];
      }
    }

    gameState.werewolfTarget = finalWerewolfTargetId;
    return finalWerewolfTargetId;
  }

  processWerewolfKills(
    gameState,
    nightEvents,
    playersKilledTonightIds,
    werewolfTargetId
  ) {
    let isHunterKilledByWerewolf = false;
    let killedHunterId = null;

    // PERBAIKAN: Cek apakah ada target werewolf dan belum diselamatkan witch
    if (werewolfTargetId && !gameState.werewolfTargetSaved) {
      const targetName = this.getPlayerNameById(
        gameState.groupId || Object.keys(this.gameStates)[0],
        werewolfTargetId
      );
      const targetRole = gameState.playerRoles[werewolfTargetId];

      playersKilledTonightIds.add(werewolfTargetId);

      if (targetRole === "hunter") {
        isHunterKilledByWerewolf = true;
        killedHunterId = werewolfTargetId;
        this.killPlayer(gameState.groupId, werewolfTargetId);
      }

      nightEvents.push(
        `🐺 Werewolf telah membunuh ${targetName} malam ini. Perannya adalah ${targetRole.toUpperCase()}.`
      );
      console.log(`DEBUG: Werewolf killed ${werewolfTargetId}`);
    } else if (werewolfTargetId && gameState.werewolfTargetSaved) {
      // Target ada tapi diselamatkan witch
    } else if (Object.keys(gameState.wolfVotes || {}).length > 0) {
      nightEvents.push(`🐺 Tidak ada yang terbunuh oleh werewolf malam ini.`);
    } else {
      nightEvents.push(`🐺 Werewolf tidak memilih target malam ini.`);
    }

    return { isHunterKilledByWerewolf, killedHunterId };
  }

  // Fungsi Role untuk Seer (dipanggil dari handler via PM)
  handlePrivateSeerAction(seerId, targetNumber) {
    const groupId = this.findGroupIdByUserId(seerId);
    if (!groupId) return "Kamu tidak sedang berpartisipasi dalam game aktif.";

    const gameState = this.gameStates[groupId];
    const lobby = this.getLobby(groupId);

    // Validation checks
    const validationResult = this.validateNightAction(
      gameState,
      lobby,
      seerId,
      "seer"
    );
    if (validationResult !== true) return validationResult;

    // Check if seer already used ability this night
    if (gameState.nightActionsUsed.seer[seerId]) {
      return "Kamu sudah menggunakan kemampuanmu malam ini.";
    }

    // Validate target
    const targetValidation = this.validateTarget(gameState, targetNumber);
    if (targetValidation.error) return targetValidation.error;

    const { targetId, targetName } = targetValidation;
    const targetRole = gameState.playerRoles[targetId];

    // Record the action and mark as used
    gameState.seerTarget = gameState.seerTarget || {};
    gameState.seerTarget[seerId] = targetId;
    gameState.nightActionsUsed.seer[seerId] = true;

    this.saveToDatabase();

    // Send result immediately
    const allPlayers = this.getAllPlayersArray(groupId);
    const alivePlayers = allPlayers
      .filter((player) => player.isAlive)
      .map((player) => `• ${player.indexMap} ${player.name}`) // Tambahkan .map() untuk mengkonversi object ke string
      .join("\n");
    this.botInstance.sendMessage(seerId, {
      text: `👁️ Hasil penglihatanmu: ${targetName} adalah seorang *${targetRole.toUpperCase()}*.\n\nDaftar Pemain Hidup:\n${alivePlayers}`,
    });

    return `Kamu telah melihat peran ${targetName}.`;
  }

  processSeerActions(gameState) {
    // for (const seerId in gameState.seerTarget || {}) {
    //   if (
    //     !gameState.alivePlayers.includes(seerId) ||
    //     gameState.playerRoles[seerId] !== "seer"
    //   ) {
    //     continue;
    //   }

    //   const targetId = gameState.seerTarget[seerId];
    //   const targetName = this.getPlayerNameById(
    //     gameState.groupId || Object.keys(this.gameStates)[0],
    //     targetId
    //   );
    //   const targetRole = gameState.playerRoles[targetId];

    //   this.botInstance.sendMessage(seerId, {
    //     text: `👁️ Hasil penglihatanmu: ${targetName} adalah seorang *${targetRole.toUpperCase()}*.`,
    //   });
    // }

    gameState.seerTarget = {}; // Reset after processing
  }

  // Fungsi Role untuk Witch (dipanggil dari handler via PM)
  handlePrivateWitchAction(witchId, action, targetNumber) {
    console.log("DEBUG: handleWitchAction", witchId, action, targetNumber);

    const groupId = this.findGroupIdByUserId(witchId);
    if (!groupId) return "Kamu tidak sedang berpartisipasi dalam game aktif.";

    const gameState = this.gameStates[groupId];
    const lobby = this.getLobby(groupId);

    // Validation checks
    const validationResult = this.validateNightAction(
      gameState,
      lobby,
      witchId,
      "witch"
    );
    if (validationResult !== true) return validationResult;

    // Check if witch already used ability this night
    if (gameState.nightActionsUsed.witch[witchId]) {
      return "Kamu sudah melakukan aksi malam ini.";
    }

    // Validate action type
    if (!["heal", "kill"].includes(action)) {
      return "Aksi tidak valid untuk Witch. Gunakan 'heal' atau 'kill'.";
    }

    // Check potion availability
    const witchPotions = gameState.witchPotionsUsed[witchId];
    if (action === "heal" && !witchPotions.healAvailable) {
      return "Kamu sudah menggunakan ramuan penyembuh.";
    }
    if (action === "kill" && !witchPotions.killAvailable) {
      return "Kamu sudah menggunakan ramuan pembunuh.";
    }

    // Validate target
    const targetValidation = this.validateTarget(gameState, targetNumber);
    if (targetValidation.error) return targetValidation.error;

    const { targetId, targetName } = targetValidation;

    // Witch can't kill themselves
    if (action === "kill" && targetId === witchId) {
      return "Kamu tidak bisa membunuh dirimu sendiri dengan ramuan.";
    }

    // Record the action and mark as used
    gameState.witchAction[witchId] = { action, targetId };
    gameState.nightActionsUsed.witch[witchId] = true;
    this.saveToDatabase();
    console.log(
      "DEBUG: handleWitchAction",
      JSON.stringify(gameState.witchAction)
    );

    const allPlayers = this.getAllPlayersArray(groupId);
    const alivePlayers = allPlayers
      .filter((player) => player.isAlive)
      .map((player) => `• ${player.indexMap} ${player.name}`)
      .join("\n");
    return `Kamu telah memilih untuk ${action} ${targetName} (Pemain #${targetNumber}). Efek akan terjadi di akhir malam.\n\nDaftar Pemain Hidup:\n${alivePlayers}`;
  }
  processWitchActions(
    gameState,
    nightEvents,
    playersKilledTonightIds,
    werewolfTargetId
  ) {
    // Cek apakah witchAction ada dan tidak kosong
    if (
      !gameState.witchAction ||
      Object.keys(gameState.witchAction).length === 0
    ) {
      console.log("DEBUG: No witch actions found or witchAction is empty");
      return;
    }

    Object.keys(gameState.witchAction).forEach((witchId) => {
      // Validasi witch masih hidup dan role benar
      if (
        !gameState.alivePlayers.includes(witchId) ||
        gameState.playerRoles[witchId] !== "witch"
      ) {
        console.log(
          `DEBUG: Witch ${witchId} tidak valid - mati atau bukan witch`
        );
        console.log(
          `DEBUG: Is alive: ${gameState.alivePlayers.includes(witchId)}`
        );
        console.log(`DEBUG: Role: ${gameState.playerRoles[witchId]}`);
        return;
      }
      const witchActionData = gameState.witchAction[witchId];

      if (
        !witchActionData ||
        !witchActionData.action ||
        !witchActionData.targetId
      ) {
        return;
      }

      const { action, targetId } = witchActionData;
      const witchPotions = gameState.witchPotionsUsed[witchId];

      const targetName = this.getPlayerNameById(
        gameState.groupId || Object.keys(this.gameStates)[0],
        targetId
      );

      if (action === "heal" && witchPotions && witchPotions.healAvailable) {
        if (targetId === werewolfTargetId) {
          // PERBAIKAN: Tandai bahwa target werewolf diselamatkan
          gameState.werewolfTargetSaved = true;
          nightEvents.push(
            `✨ ${targetName} seharusnya mati dimangsa werewolf, namun diselamatkan oleh Witch!`
          );
        } else {
          nightEvents.push(
            `🧪 Witch menggunakan ramuan penyembuh pada ${targetName}, namun sepertinya bukan dia target werewolf.`
          );
        }
        // Tandai ramuan sudah digunakan
        gameState.witchPotionsUsed[witchId].healAvailable = false;
      } else if (
        action === "kill" &&
        witchPotions &&
        witchPotions.killAvailable
      ) {
        // Validasi target masih hidup dan bukan witch sendiri
        if (gameState.alivePlayers.includes(targetId) && targetId !== witchId) {
          playersKilledTonightIds.add(targetId);
          nightEvents.push(
            `☠️ ${targetName} ditemukan tewas, sepertinya diracun oleh Witch!`
          );
          // Tandai ramuan sudah digunakan
          gameState.witchPotionsUsed[witchId].killAvailable = false;
        } else {
        }
      } else {
        if (witchPotions) {
          console.log(`DEBUG: - heal available: ${witchPotions.healAvailable}`);
          console.log(`DEBUG: - kill available: ${witchPotions.killAvailable}`);
        }
      }
    });
  }
  // Fungsi Role untuk mengeksekusi tembakan hunter
  handleHunterShot(hunterId, targetNumber) {
    const groupId = this.findGroupIdByUserId(hunterId);
    if (!groupId) return "Kamu tidak sedang berpartisipasi dalam game aktif.";

    const gameState = this.gameStates[groupId];
    const lobby = this.getLobby(groupId);
    if (!gameState || !lobby) return "Permainan tidak sedang berjalan.";

    if (gameState.playerRoles[hunterId] !== "hunter") {
      return "Kamu bukan Hunter.";
    }

    if (
      !gameState.hunterPendingShot ||
      gameState.hunterPendingShot.hunterId !== hunterId
    ) {
      return "Kamu tidak bisa menembak sekarang. Kemampuan Hunter hanya bisa digunakan saat kamu sekarat.";
    }

    const targetIndex = parseInt(targetNumber);

    const isHunterKilledByWerewolf =
      gameState.hunterPendingShot.killedByWerewolf;
    const checkAlive = isHunterKilledByWerewolf
      ? true
      : this.checkUserIsAlive(groupId, hunterId);

    if (isNaN(targetIndex) || targetIndex < 1 || !checkAlive) {
      return "Nomor target tidak valid.";
    }

    const targetId = gameState.playerIndexMap[targetIndex];

    // Verifikasi target masih hidup
    if (!gameState.alivePlayers.includes(targetId)) {
      return "Target tidak valid atau sudah mati.";
    }

    // Update hunter pending shot dengan target yang dipilih
    const targetName = this.getPlayerNameById(groupId, targetId);
    gameState.hunterPendingShot.targetId = targetId;
    gameState.hunterPendingShot.targetName = targetName;

    // Konfirmasi ke Hunter
    this.botInstance.sendMessage(hunterId, {
      text: `🔫 Kamu telah memilih untuk menembak ${targetName} (Pemain #${targetNumber}). Tembakan akan dieksekusi segera.`,
    });

    // Eksekusi tembakan
    this.executeHunterShot(groupId);

    return `Kamu telah memilih untuk menembak ${targetName}.`;
  }

  executeHunterShot(groupId) {
    const gameState = this.gameStates[groupId];
    if (!gameState || !gameState.hunterPendingShot) return;

    const { hunterId, targetId, hunterName, killedByWerewolf, timeoutId } =
      gameState.hunterPendingShot;

    if (timeoutId) {
      clearTimeout(timeoutId);
      console.log("Cleared hunter timeout:", timeoutId);
    }

    let shotMessage = "";
    if (targetId && !gameState.alivePlayers.includes(targetId)) {
      // Target already dead, hunter shoots empty
      shotMessage = `Hunter ${hunterName} menembak, namun targetnya sudah mati! Tembakan sia-sia.`;
    } else if (targetId) {
      // Valid target, still alive
      const targetName = this.getPlayerNameById(groupId, targetId);
      const targetRole = gameState.playerRoles[targetId];
      shotMessage = `🎯 Hunter ${hunterName} telah menembak ${targetName}! Perannya adalah ${targetRole.toUpperCase()}.`;
      // Kill hunter's target
      this.killPlayer(groupId, targetId, "hunter_shot");
      this.botInstance.sendMessage(targetId, {
        text: `💀 Kamu telah ditembak oleh Hunter.`,
      });
    } else {
      // No target or invalid target
      shotMessage = `Hunter ${hunterName} tidak menembak siapapun.`;
    }

    this.botInstance.sendMessage(groupId, { text: shotMessage });

    // If hunter was killed by werewolf, now actually kill them after they used their ability
    if (killedByWerewolf) {
      this.killPlayer(groupId, hunterId);
      this.botInstance.sendMessage(groupId, {
        text: `💀 Hunter ${hunterName} akhirnya mati dimangsa werewolf setelah menggunakan kemampuan terakhirnya.`,
      });
    }

    // Reset hunterPendingShot after processing
    gameState.hunterPendingShot = null;
    this.saveToDatabase();

    // Continue to day phase
    this.processPhaseChange(groupId, "day");
  }

  processDeathsAndHunter(
    groupId,
    playersKilledTonightIds,
    isHunterKilledByWerewolf,
    killedHunterId
  ) {
    const gameState = this.gameStates[groupId];
    let hunterDiedId = null;
    let specialDeathHandling = false;

    // Check for hunter deaths
    for (const killedId of playersKilledTonightIds) {
      if (gameState.playerRoles[killedId] === "hunter") {
        hunterDiedId = killedId;
        if (killedId === killedHunterId && isHunterKilledByWerewolf) {
          specialDeathHandling = true;
          break;
        }
      }
    }

    // Process deaths based on hunter status
    if (specialDeathHandling) {
      // Kill others first, hunter gets special handling
      for (const killedId of playersKilledTonightIds) {
        if (killedId !== hunterDiedId) {
          this.killPlayer(groupId, killedId);
        }
      }
    } else {
      // Kill all normally
      for (const killedId of playersKilledTonightIds) {
        this.killPlayer(groupId, killedId);
      }
    }

    // Show alive players
    gameState.nightActionsResolved = false;
    const allPlayers = this.getAllPlayersArray(groupId);
    const alivePlayers = allPlayers.filter((p) => p.isAlive);
    const deadPlayers = allPlayers.filter((p) => !p.isAlive);

    let message = "\n📋 Status Pemain:\n\n";
    if (alivePlayers.length > 0) {
      message += "✅ **Masih Hidup:**\n";
      alivePlayers.forEach((player) => {
        message += `${player.indexMap}. ${player.name}\n`;
      });
    }

    if (deadPlayers.length > 0) {
      message += "\n💀 **Sudah Mati:**\n";
      deadPlayers.forEach((player) => {
        message += `${player.indexMap}. ${player.name}\n`;
      });
    }
    this.botInstance.sendMessage(groupId, { text: message });

    // Handle hunter death or continue game
    if (hunterDiedId) {
      this.handleHunterDeath(groupId, hunterDiedId, specialDeathHandling);
    } else {
      this.saveToDatabase();
      this.processPhaseChange(groupId, "day");
    }
  }

  handleHunterDeath(groupId, hunterDiedId, specialDeathHandling) {
    const gameState = this.gameStates[groupId];
    const hunterName = this.getPlayerNameById(groupId, hunterDiedId);

    // Create hunter pending data with common properties
    const hunterPendingData = {
      hunterId: hunterDiedId,
      targetId: null,
      hunterName: hunterName,
      killedByWerewolf: !!specialDeathHandling,
      timestamp: Date.now(),
      groupId: groupId,
      timeoutId: null, // Store timeout ID for possible cancellation
    };

    // Save hunter pending shot data
    gameState.hunterPendingShot = hunterPendingData;
    this.saveToDatabase();

    // Verify the save worked
    const verifyState = this.gameStates[groupId];
    if (!verifyState.hunterPendingShot) {
      return;
    }

    // Send appropriate messages
    if (specialDeathHandling) {
      this.botInstance.sendMessage(groupId, {
        text: `🏹 ${hunterName} adalah HUNTER yang akan mati dimangsa werewolf! Sebelum mati, dia memiliki kesempatan terakhir untuk menembak seseorang!`,
      });

      // Use immediate execution instead of setTimeout for the instruction message
      this.sendHunterInstructions(
        groupId,
        hunterDiedId,
        hunterPendingData.timestamp
      );
    } else {
      const allPlayers = this.getAllPlayersArray(groupId);
      const alivePlayers = allPlayers.filter((p) => p.isAlive);

      let message = "\n📋 Status Pemain:\n\n";
      if (alivePlayers.length > 0) {
        message += "✅ **Masih Hidup:**\n";
        alivePlayers.forEach((player) => {
          message += `${player.indexMap}. ${player.name}\n`;
        });
      }
      this.botInstance.sendMessage(groupId, {
        text: `🏹 ${hunterName} adalah HUNTER yang telah mati! Mereka memiliki kesempatan terakhir untuk menembak seseorang.`,
      });

      this.botInstance.sendMessage(hunterDiedId, {
        text:
          `🏹 HUNTER ABILITY 🏹\n\n` +
          `Kamu telah mati, tetapi kamu bisa menggunakan kemampuan terakhirmu untuk menembak satu pemain lain!\n` +
          `Gunakan perintah .ww shoot <nomor> di chat pribadi dengan bot untuk memilih target (gunakan nomor urut pemain dari daftar).\n\n` +
          `Daftar pemain yang bisa kamu tembak:\n${message}\n\n` +
          `Kamu memiliki 30 detik untuk menembak sebelum kemampuan ini hangus.`,
      });
    }

    // Set up timeout for hunter ability expiration and store the timeout ID
    const timeoutId = this.setHunterTimeout(
      groupId,
      hunterDiedId,
      hunterName,
      hunterPendingData.timestamp
    );

    // Update the hunterPendingData with the timeout ID
    gameState.hunterPendingShot.timeoutId = timeoutId;
    this.saveToDatabase();
  }

  // Separate method to send hunter instructions with validation
  sendHunterInstructions(groupId, hunterId, playerList, originalTimestamp) {
    // Small delay to ensure all messages are sent in order
    setTimeout(() => {
      // Validate that hunter pending shot still exists and matches
      const currentState = this.gameStates[groupId];
      if (!currentState) {
        return;
      }

      const hunterPending = currentState.hunterPendingShot;
      if (!hunterPending) {
        return;
      }

      if (
        hunterPending.hunterId !== hunterId ||
        hunterPending.timestamp !== originalTimestamp
      ) {
        return;
      }

      this.botInstance.sendMessage(hunterId, {
        text:
          `🏹 HUNTER ABILITY 🏹\n\n` +
          `Kamu telah dimangsa oleh werewolf, tetapi sebelum mati kamu bisa menggunakan kemampuan terakhirmu untuk menembak satu pemain lain!\n` +
          `Gunakan perintah .ww shoot <nomor> di chat pribadi dengan bot untuk memilih target.\n\n` +
          `Daftar pemain yang bisa kamu tembak:\n${playerList}\n\n` +
          `Kamu memiliki 30 detik untuk menembak sebelum kemampuan ini hangus.\n\n` +
          `DEBUG: Hunter ID = ${hunterId}, Timestamp = ${originalTimestamp}`,
      });
    }, 500);
  }

  // Modified setHunterTimeout to return the timeout ID
  setHunterTimeout(groupId, hunterId, hunterName, originalTimestamp) {
    const timeoutId = setTimeout(() => {
      // Validate that hunter pending shot still exists and matches
      const currentState = this.gameStates[groupId];
      if (!currentState) {
        return;
      }

      const hunterPending = currentState.hunterPendingShot;
      if (!hunterPending) {
        return;
      }

      if (
        hunterPending.hunterId !== hunterId ||
        hunterPending.timestamp !== originalTimestamp
      ) {
        return;
      }
    }, 31000); // 31 seconds

    return timeoutId; // Return the timeout ID
  }

  checkWinCondition(groupId) {
    const gameState = this.gameStates[groupId];
    const lobby = this.getLobby(groupId);

    if (!gameState || !lobby) {
      console.error("Game state or lobby is undefined for group:", groupId);
      this.endGame(groupId, "Error - Game State Corrupted");
      return true;
    }

    const alivePlayers = gameState.alivePlayers || [];

    const aliveWerewolves = alivePlayers.filter(
      (pId) => gameState.playerRoles[pId] === "werewolf"
    ).length;

    const aliveNonWerewolves = alivePlayers.filter(
      (pId) => gameState.playerRoles[pId] !== "werewolf"
    ).length;

    let winner = null;

    // Win conditions:
    // 1. Werewolves win if they equal or outnumber villagers
    if (aliveWerewolves > 0 && aliveNonWerewolves <= aliveWerewolves) {
      winner = "Werewolves";
    }
    // 2. Villagers win if all werewolves are dead
    else if (aliveWerewolves === 0 && aliveNonWerewolves > 0) {
      winner = "Villagers";
    }
    // 3. Draw if everyone is dead
    else if (alivePlayers.length === 0) {
      winner = "Draw (Semua Mati)";
    }

    if (winner) {
      this.endGame(groupId, winner);
      return true;
    }

    return false;
  }

  checkUserIsAlive(groupId, playerId) {
    const gameState = this.gameStates[groupId];
    if (!gameState) return false;
    return gameState.alivePlayers.includes(playerId);
  }

  endGame(groupId, winner) {
    const lobby = this.getLobby(groupId);
    if (!lobby) return;
    if (lobby) {
      this.currentGameId = null;
    }

    this.botInstance.sendMessage(groupId, {
      text: `🎉 Permainan Berakhir! 🎉\n\nPemenangnya adalah: *${winner}*!\n\nPeran pemain:\n${Object.values(
        lobby.players
      )
        .map((p) => `${p.name}: ${p.role || "Belum dapat peran"}`)
        .join("\n")}`,
    });
    // Remove from database
    this.removeGameFromDatabase(groupId);
    if (this.timers[groupId]) {
      clearInterval(this.timers[groupId]);
      delete this.timers[groupId];
    }
    delete this.gameStates[groupId];
    delete this.lobbies[groupId];
  }

  getPlayerNameById(groupId, playerId) {
    // this.loadFromDatabase();
    const lobby = this.getLobby(groupId);
    if (!lobby || !lobby.players[playerId]) return "Pemain Misterius";
    return lobby.players[playerId].name;
  }

  getPlayerGameGroupId = (userId, role, conn) => {
    for (const gid in conn.werewolf) {
      const s = conn.werewolf[gid];
      if (
        s.game &&
        s.game.gameStates[gid] &&
        s.game.gameStates[gid].playerRoles[userId] === role &&
        s.game.gameStates[gid].alivePlayers.includes(userId)
      ) {
        return gid;
      }
    }
    return null;
  };

  findGroupIdByUserId(userId) {
    userId = String(userId);
    this.loadFromDatabase();

    for (const groupId in this.gameStates) {
      const gameState = this.gameStates[groupId];
      if (gameState.playerRoles && gameState.playerRoles[userId]) {
        this.playerGameMapping[userId] = groupId;
        this.saveToDatabase();
        return groupId;
      }
    }

    return null;
  }
}

module.exports = WareWolfGame;
