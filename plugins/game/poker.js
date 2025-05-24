/**
 * Game Poker WhatsApp Bot
 * Fitur permainan poker sederhana dengan multiplayer dan reset
 * dan penyimpanan kemenangan ke database pengguna
 *
 * By: Asyl
 */

const fs = require("fs");
const path = require("path");

class PokerGame {
  constructor(config = {}) {
    this.config = {
      timeout: 120000, // Waktu permainan dalam ms (2 menit)
      minBet: 1000, // Taruhan minimum
      baseMoney: 10000, // Uang diberikan saat reset
      minPlayers: 1, // Minimal pemain untuk multiplayer
      maxPlayers: 5, // Maksimal pemain untuk multiplayer
      joinTimeout: 60000, // Waktu tunggu pemain bergabung dalam ms (1 menit)
      ...config,
    };

    // Kartu poker
    this.SUITS = ["♠️", "♥️", "♦️", "♣️"];
    this.VALUES = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
      "A",
    ];

    // Game state storage
    this.pokerSessions = {};
    this.multiplayerLobbies = {};
    this.userProfiles = {};
  }

  /**
   * User Profile Functions (In-Memory)
   */
  getUserProfile(userId) {
    if (!this.userProfiles[userId]) {
      this.userProfiles[userId] = {
        id: userId,
        name: "Player",
        money: this.config.baseMoney,
        exp: 0,
        level: 1,
        wins: 0,
        losses: 0,
      };
    }
    return this.userProfiles[userId];
  }

  updateUserProfile(userId, update) {
    if (!this.userProfiles[userId]) {
      this.userProfiles[userId] = {
        id: userId,
        name: "Player",
        money: this.config.baseMoney,
        exp: 0,
        level: 1,
        wins: 0,
        losses: 0,
      };
    }

    this.userProfiles[userId] = {
      ...this.userProfiles[userId],
      ...update,
    };

    return this.userProfiles[userId];
  }

  resetUserMoney(userId) {
    if (this.userProfiles[userId]) {
      this.userProfiles[userId].money = this.config.baseMoney;
    }
    return this.userProfiles[userId];
  }

  /**
   * Card Deck Functions
   */
  createDeck() {
    const deck = [];
    for (const suit of this.SUITS) {
      for (const value of this.VALUES) {
        deck.push({ suit, value });
      }
    }

    // Acak dek (algoritma Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  getCardValue(card) {
    if (["J", "Q", "K"].includes(card.value)) return 10;
    if (card.value === "A") return 11;
    return parseInt(card.value);
  }

  getHandValue(hand) {
    let sum = 0;
    let aces = 0;

    for (const card of hand) {
      if (card.value === "A") {
        aces++;
        sum += 11;
      } else {
        sum += this.getCardValue(card);
      }
    }

    // Jika total melebihi 21, ubah nilai Ace menjadi 1
    while (sum > 21 && aces > 0) {
      sum -= 10;
      aces--;
    }

    return sum;
  }

  visualizeCards(hand) {
    return hand.map((card) => `${card.value}${card.suit}`).join(" ");
  }

  /**
   * Game Logic Functions
   */
  determineWinner(playerHand, dealerHand) {
    const playerValue = this.getHandValue(playerHand);
    const dealerValue = this.getHandValue(dealerHand);

    if (playerValue > 21) return "dealer"; // Player bust
    if (dealerValue > 21) return "player"; // Dealer bust
    if (playerValue > dealerValue) return "player";
    if (dealerValue > playerValue) return "dealer";
    return "draw"; // Seri
  }

  determineMultiplayerWinners(players, dealerHand) {
    const dealerValue = this.getHandValue(dealerHand);
    const dealerBust = dealerValue > 21;
    const results = {};

    for (const [playerId, playerData] of Object.entries(players)) {
      const playerValue = this.getHandValue(playerData.hand);

      // Jika player bust, dealer menang
      if (playerValue > 21) {
        results[playerId] = {
          result: "lose",
          reason: "bust",
          winAmount: -playerData.betAmount,
        };
        continue;
      }

      // Jika dealer bust, player yang tidak bust menang
      if (dealerBust) {
        results[playerId] = {
          result: "win",
          reason: "dealer bust",
          winAmount: playerData.betAmount,
        };
        continue;
      }

      // Bandingkan nilai kartu
      if (playerValue > dealerValue) {
        results[playerId] = {
          result: "win",
          reason: "higher value",
          winAmount: playerData.betAmount,
        };
      } else if (playerValue < dealerValue) {
        results[playerId] = {
          result: "lose",
          reason: "lower value",
          winAmount: -playerData.betAmount,
        };
      } else {
        results[playerId] = {
          result: "draw",
          reason: "same value",
          winAmount: 0,
        };
      }
    }

    return results;
  }

  /**
   * Multiplayer Game Management Functions
   */
  createLobby(lobbyId, userId, groupId, betAmount, usedPrefix) {
    this.multiplayerLobbies[lobbyId] = {
      id: lobbyId,
      host: userId,
      groupId: groupId,
      betAmount: betAmount,
      status: "waiting", // waiting, playing, finished
      players: {
        [userId]: {
          id: userId,
          name:
            this.getUserProfile(userId).name ||
            `Player ${userId.split("@")[0]}`,
          betAmount: betAmount,
          hand: [],
          status: "waiting", // waiting, playing, stand, bust
        },
      },
      playerIds: [userId],
      currentPlayerIndex: 0,
      deck: null,
      dealerHand: [],
      timestamp: Date.now(),
      usedPrefix: usedPrefix,
      timeoutId: setTimeout(() => {
        // Batalkan lobby jika waktu habis
        if (
          this.multiplayerLobbies[lobbyId] &&
          this.multiplayerLobbies[lobbyId].status === "waiting"
        ) {
          return {
            action: "timeout",
            lobbyId: lobbyId,
            message: `⌛ Waktu untuk bergabung habis! Lobby multiplayer dibatalkan.`,
            mentions: this.multiplayerLobbies[lobbyId].playerIds,
          };
        }
      }, this.config.joinTimeout),
    };

    return this.multiplayerLobbies[lobbyId];
  }

  joinLobby(lobbyId, userId, betAmount) {
    const lobby = this.multiplayerLobbies[lobbyId];

    if (!lobby) {
      return { success: false, message: "❌ Lobby tidak ditemukan!" };
    }

    if (lobby.status !== "waiting") {
      return {
        success: false,
        message: "❌ Permainan sudah dimulai, tidak bisa bergabung!",
      };
    }

    if (Object.keys(lobby.players).length >= this.config.maxPlayers) {
      return { success: false, message: "❌ Lobby sudah penuh!" };
    }

    if (lobby.players[userId]) {
      return {
        success: false,
        message: "❌ Anda sudah bergabung dalam lobby ini!",
      };
    }

    const user = this.getUserProfile(userId);
    if (user.money < betAmount) {
      return {
        success: false,
        message: `❌ Uang Anda tidak mencukupi! Anda memiliki ${user.money} koin.`,
      };
    }

    lobby.players[userId] = {
      id: userId,
      name: user.name || `Player ${userId.split("@")[0]}`,
      betAmount: betAmount,
      hand: [],
      status: "waiting",
    };

    lobby.playerIds.push(userId);

    return {
      success: true,
      message: `✅ @${userId.split("@")[0]} bergabung dalam permainan!`,
      playerCount: Object.keys(lobby.players).length,
      maxPlayers: this.config.maxPlayers,
    };
  }

  leaveLobby(lobbyId, userId) {
    const lobby = this.multiplayerLobbies[lobbyId];

    if (!lobby) {
      return { success: false, message: "❌ Lobby tidak ditemukan!" };
    }

    if (!lobby.players[userId]) {
      return {
        success: false,
        message: "❌ Anda tidak berada dalam lobby ini!",
      };
    }

    if (lobby.status === "playing") {
      return {
        success: false,
        message: "❌ Tidak bisa keluar saat permainan sedang berlangsung!",
      };
    }

    // Jika pemain yang keluar adalah host, batalkan lobby
    if (userId === lobby.host) {
      clearTimeout(lobby.timeoutId);
      delete this.multiplayerLobbies[lobbyId];

      return {
        success: true,
        action: "cancel",
        message: `❌ Host keluar, lobby dibatalkan!`,
        mentions: lobby.playerIds,
      };
    }

    // Hapus pemain dari daftar
    delete lobby.players[userId];
    lobby.playerIds = lobby.playerIds.filter((id) => id !== userId);

    return {
      success: true,
      action: "leave",
      message: `👋 @${userId.split("@")[0]} keluar dari lobby.`,
      playerCount: Object.keys(lobby.players).length,
      maxPlayers: this.config.maxPlayers,
    };
  }

  startGame(lobbyId, userId) {
    const lobby = this.multiplayerLobbies[lobbyId];

    if (!lobby) {
      return { success: false, message: "❌ Lobby tidak ditemukan!" };
    }

    if (userId !== lobby.host) {
      return {
        success: false,
        message: "❌ Hanya host yang dapat memulai permainan!",
      };
    }

    if (lobby.status !== "waiting") {
      return { success: false, message: "❌ Permainan sudah dimulai!" };
    }

    const playerCount = Object.keys(lobby.players).length;
    if (playerCount < this.config.minPlayers) {
      return {
        success: false,
        message: `❌ Minimal ${this.config.minPlayers} pemain untuk memulai permainan!`,
      };
    }

    // Mulai permainan
    clearTimeout(lobby.timeoutId);
    lobby.status = "playing";
    lobby.deck = this.createDeck();

    // Potong taruhan pemain
    for (const playerId of lobby.playerIds) {
      const user = this.getUserProfile(playerId);
      this.updateUserProfile(playerId, {
        money: user.money - lobby.players[playerId].betAmount,
      });
    }

    // Bagikan 2 kartu untuk semua pemain
    for (const playerId of lobby.playerIds) {
      lobby.players[playerId].hand = [lobby.deck.pop(), lobby.deck.pop()];
      lobby.players[playerId].status = "playing";
    }

    // Bagikan 2 kartu untuk dealer
    lobby.dealerHand = [lobby.deck.pop(), lobby.deck.pop()];

    // Set pemain pertama
    lobby.currentPlayerIndex = 0;

    return {
      success: true,
      action: "start",
      message: this.getNextPlayerMessage(lobbyId),
    };
  }

  hit(lobbyId, userId) {
    const lobby = this.multiplayerLobbies[lobbyId];

    if (!lobby) {
      return { success: false, message: "❌ Lobby tidak ditemukan!" };
    }

    if (lobby.status !== "playing") {
      return { success: false, message: "❌ Permainan belum dimulai!" };
    }

    const currentPlayerId = lobby.playerIds[lobby.currentPlayerIndex];
    if (userId !== currentPlayerId) {
      return { success: false, message: "❌ Bukan giliran Anda!" };
    }

    // Ambil kartu baru
    const card = lobby.deck.pop();
    lobby.players[userId].hand.push(card);

    // Periksa apakah pemain bust
    const handValue = this.getHandValue(lobby.players[userId].hand);
    if (handValue > 21) {
      lobby.players[userId].status = "bust";

      // Lanjut ke pemain berikutnya
      return this.nextPlayer(lobbyId);
    }

    return {
      success: true,
      action: "hit",
      message: `
🎯 *HIT!* @${userId.split("@")[0]} mengambil kartu ${card.value}${card.suit}
*Kartu Anda sekarang:* ${this.visualizeCards(
        lobby.players[userId].hand
      )} (Nilai: ${handValue})

Ketik:
- *${lobby.usedPrefix}mpoker hit* untuk ambil kartu lagi
- *${lobby.usedPrefix}mpoker stand* untuk berhenti
      `,
    };
  }

  stand(lobbyId, userId) {
    const lobby = this.multiplayerLobbies[lobbyId];

    if (!lobby) {
      return { success: false, message: "❌ Lobby tidak ditemukan!" };
    }

    if (lobby.status !== "playing") {
      return { success: false, message: "❌ Permainan belum dimulai!" };
    }

    const currentPlayerId = lobby.playerIds[lobby.currentPlayerIndex];
    if (userId !== currentPlayerId) {
      return { success: false, message: "❌ Bukan giliran Anda!" };
    }

    // Pemain stand
    lobby.players[userId].status = "stand";

    // Lanjut ke pemain berikutnya
    return this.nextPlayer(lobbyId);
  }

  nextPlayer(lobbyId) {
    const lobby = this.multiplayerLobbies[lobbyId];
    lobby.currentPlayerIndex++;

    // Jika semua pemain sudah selesai, lanjut ke giliran dealer
    if (lobby.currentPlayerIndex >= lobby.playerIds.length) {
      return this.dealerTurn(lobbyId);
    }

    return {
      success: true,
      action: "next",
      message: this.getNextPlayerMessage(lobbyId),
    };
  }

  dealerTurn(lobbyId) {
    const lobby = this.multiplayerLobbies[lobbyId];

    // Dealer mengambil kartu sampai nilai 17 atau lebih
    let dealerValue = this.getHandValue(lobby.dealerHand);
    let dealerCards = `${this.visualizeCards(lobby.dealerHand)}`;

    while (dealerValue < 17) {
      const card = lobby.deck.pop();
      lobby.dealerHand.push(card);
      dealerValue = this.getHandValue(lobby.dealerHand);
      dealerCards = `${this.visualizeCards(lobby.dealerHand)}`;
    }

    // Tentukan pemenang
    const results = this.determineMultiplayerWinners(
      lobby.players,
      lobby.dealerHand
    );

    // Update uang pemain
    for (const [playerId, result] of Object.entries(results)) {
      const user = this.getUserProfile(playerId);
      const winAmount = result.winAmount;

      // Update statistik pemain
      if (result.result === "win") {
        this.updateUserProfile(playerId, {
          money: user.money + winAmount * 2, // Kembalikan taruhan + kemenangan
          wins: user.wins + 1,
          exp: user.exp + 5,
        });
      } else if (result.result === "draw") {
        this.updateUserProfile(playerId, {
          money: user.money + lobby.players[playerId].betAmount, // Kembalikan taruhan
          exp: user.exp + 2,
        });
      } else {
        this.updateUserProfile(playerId, {
          losses: user.losses + 1,
          exp: user.exp + 1,
        });
      }
    }

    // Tandai permainan selesai
    lobby.status = "finished";

    // Siapkan pesan hasil
    let resultMessage = `
🃏 *HASIL POKER MULTIPLAYER* 🃏

*Kartu Dealer:* ${dealerCards} (Nilai: ${dealerValue})
${dealerValue > 21 ? "💥 *Dealer Bust!*" : ""}

*Hasil Pemain:*
`;

    for (const playerId of lobby.playerIds) {
      const playerHand = lobby.players[playerId].hand;
      const playerValue = this.getHandValue(playerHand);
      const result = results[playerId];

      resultMessage += `
@${playerId.split("@")[0]}: ${this.visualizeCards(
        playerHand
      )} (Nilai: ${playerValue})
${playerValue > 21 ? "💥 *Bust!*" : ""}
${
  result.result === "win"
    ? "🏆 *MENANG*"
    : result.result === "draw"
    ? "🤝 *SERI*"
    : "❌ *KALAH*"
}
${
  result.reason === "bust"
    ? "(Bust)"
    : result.reason === "dealer bust"
    ? "(Dealer Bust)"
    : `(${result.reason})`
}
${
  result.winAmount > 0
    ? `+${result.winAmount}`
    : result.winAmount < 0
    ? `${result.winAmount}`
    : "±0"
} koin
`;
    }

    // Hapus lobby setelah 30 detik
    setTimeout(() => {
      delete this.multiplayerLobbies[lobbyId];
    }, 30000);

    return {
      success: true,
      action: "end",
      message: resultMessage,
      mentions: lobby.playerIds,
    };
  }

  getNextPlayerMessage(lobbyId) {
    const lobby = this.multiplayerLobbies[lobbyId];
    const currentPlayerId = lobby.playerIds[lobby.currentPlayerIndex];
    const currentPlayer = lobby.players[currentPlayerId];

    return `
🎮 *GILIRAN PEMAIN*
Sekarang giliran: @${currentPlayerId.split("@")[0]}

*Kartu Anda:* ${this.visualizeCards(
      currentPlayer.hand
    )} (Nilai: ${this.getHandValue(currentPlayer.hand)})
*Kartu Dealer:* ${lobby.dealerHand[0].value}${
      lobby.dealerHand[0].suit
    } ? (Nilai terlihat: ${this.getCardValue(lobby.dealerHand[0])})

Ketik:
- *${lobby.usedPrefix}mhit* untuk ambil kartu tambahan
- *${lobby.usedPrefix}mstand* untuk berhenti
    `;
  }

  getLobbyStatus(lobbyId) {
    const lobby = this.multiplayerLobbies[lobbyId];

    if (!lobby) {
      return { success: false, message: "❌ Lobby tidak ditemukan!" };
    }

    if (lobby.status === "waiting") {
      return {
        success: true,
        message: `
🃏 *STATUS LOBBY POKER*
ID: ${lobby.id}
Host: @${lobby.host.split("@")[0]}
Status: Menunggu pemain
Pemain (${Object.keys(lobby.players).length}/${this.config.maxPlayers}):
${lobby.playerIds.map((id) => `- @${id.split("@")[0]}`).join("\n")}
Taruhan: ${lobby.betAmount} koin
        `,
        mentions: lobby.playerIds,
      };
    } else if (lobby.status === "playing") {
      return {
        success: true,
        message: `
🃏 *STATUS GAME POKER*
ID: ${lobby.id}
Status: Bermain
Pemain (${Object.keys(lobby.players).length}):
${lobby.playerIds
  .map((id) => {
    const player = lobby.players[id];
    return `- @${id.split("@")[0]} (${player.status}): ${this.visualizeCards(
      player.hand
    )} (${this.getHandValue(player.hand)})`;
  })
  .join("\n")}

Dealer: ${lobby.dealerHand[0].value}${lobby.dealerHand[0].suit} ?

Giliran sekarang: @${lobby.playerIds[lobby.currentPlayerIndex].split("@")[0]}
        `,
        mentions: lobby.playerIds,
      };
    } else {
      return {
        success: true,
        message: `
🃏 *GAME POKER SELESAI*
ID: ${lobby.id}
Status: Selesai
Pemain (${Object.keys(lobby.players).length}):
${lobby.playerIds
  .map((id) => {
    const player = lobby.players[id];
    return `- @${id.split("@")[0]}: ${this.visualizeCards(
      player.hand
    )} (${this.getHandValue(player.hand)})`;
  })
  .join("\n")}

Dealer: ${this.visualizeCards(lobby.dealerHand)} (${this.getHandValue(
          lobby.dealerHand
        )})
        `,
        mentions: lobby.playerIds,
      };
    }
  }

  // Check if user is in any lobby
  isUserInLobby(userId) {
    for (const lobbyId in this.multiplayerLobbies) {
      if (this.multiplayerLobbies[lobbyId].players[userId]) {
        return lobbyId;
      }
    }
    return null;
  }

  // Get lobby by group ID
  getLobbyByGroup(groupId) {
    for (const lobbyId in this.multiplayerLobbies) {
      if (this.multiplayerLobbies[lobbyId].groupId === groupId) {
        return lobbyId;
      }
    }
    return null;
  }
}

class GameSession {
  constructor(id, botInstance) {
    this.id = id;
    this.players = [];
    this.game = new PokerGame();
    this.botInstance = botInstance;
  }
}

// Handler untuk memulai permainan pokerlet handler = async (m, { conn, args, usedPrefix }) => {
let handler = async (m, { conn, args, usedPrefix }) => {
  // Initialize poker sessions if not exists
  conn.poker = conn.poker || {};
  // Show processing reaction
  conn.sendMessage(m.chat, {
    react: {
      text: "⏳",
      key: m.key,
    },
  });

  // Get the session for current chat
  const sessionId = m.chat;
  if (!conn.poker[sessionId]) {
    conn.poker[sessionId] = {
      game: new GameSession(sessionId, conn),
      state: false,
      players: {},
      lastAction: null,
    };
  }

  const session = conn.poker[sessionId];
  const game = session.game.game; // Access the PokerGame instance

  // No arguments provided, show help message
  if (!args[0]) {
    return m.reply(`
🃏 *POKER MULTIPLAYER COMMANDS* 🃏

${usedPrefix}mpoker create <taruhan> - Buat lobby poker baru
${usedPrefix}mpoker join <taruhan> - Bergabung dengan lobby yang ada
${usedPrefix}mpoker start - Mulai permainan (host only)
${usedPrefix}mpoker hit - Ambil kartu tambahan
${usedPrefix}mpoker stand - Berhenti mengambil kartu
${usedPrefix}mpoker leave - Keluar dari lobby
${usedPrefix}mpoker status - Cek status lobby/permainan
${usedPrefix}mpoker cancel - Batalkan lobby (host only)
${usedPrefix}mpoker profile - Lihat profil poker Anda
${usedPrefix}mpoker update min <jumlah> - Update minimal pemain (host only)
${usedPrefix}mpoker update max <jumlah> - Update maksimal pemain (host only)
${usedPrefix}mpoker settings - Lihat pengaturan lobby saat ini
    `);
  }

  const command = args[0].toLowerCase();
  const userId = m.sender;
  const groupId = m.chat;

  switch (command) {
    case "create": {
      // Check if there's an existing lobby in the group
      const existingLobby = game.getLobbyByGroup(groupId);
      if (existingLobby) {
        return m.reply(
          `❌ Sudah ada lobby poker di grup ini! Gunakan ${usedPrefix}mpoker join untuk bergabung.`
        );
      }

      // Check if player is already in another lobby
      const playerLobby = game.isUserInLobby(userId);
      if (playerLobby) {
        return m.reply(
          `❌ Anda sudah berada dalam lobby lain! Keluar dulu dengan ${usedPrefix}mpoker leave.`
        );
      }

      // Get bet amount
      const betAmount = parseInt(args[1]);
      if (!betAmount || isNaN(betAmount) || betAmount < game.config.minBet) {
        return m.reply(
          `❌ Masukkan jumlah taruhan minimal ${game.config.minBet} koin!`
        );
      }

      // Check player money
      const user = game.getUserProfile(userId);
      if (user.money < betAmount) {
        return m.reply(
          `❌ Uang Anda tidak mencukupi! Anda memiliki ${user.money} koin.`
        );
      }

      // Create new lobby
      const lobbyId = `poker-${groupId}-${Date.now()}`;
      const lobby = game.createLobby(
        lobbyId,
        userId,
        groupId,
        betAmount,
        usedPrefix
      );

      return m.reply(
        `
🃏 *LOBBY POKER DIBUAT* 🃏

Host: @${userId.split("@")[0]}
Taruhan: ${betAmount} koin
Status: Menunggu pemain (1/${game.config.maxPlayers})

Ketik *${usedPrefix}mpoker join ${betAmount}* untuk bergabung!
Host ketik *${usedPrefix}mpoker start* untuk mulai permainan.
      `,
        null,
        { mentions: [userId] }
      );
    }

    case "join": {
      // Check if there's a lobby in the group
      const lobbyId = game.getLobbyByGroup(groupId);
      if (!lobbyId) {
        return m.reply(
          `❌ Tidak ada lobby poker di grup ini! Buat dulu dengan ${usedPrefix}mpoker create <taruhan>.`
        );
      }

      // Check if player is already in another lobby
      const playerLobby = game.isUserInLobby(userId);
      if (playerLobby && playerLobby !== lobbyId) {
        return m.reply(
          `❌ Anda sudah berada dalam lobby lain! Keluar dulu dengan ${usedPrefix}mpoker leave.`
        );
      }

      // Get bet amount
      const betAmount = parseInt(args[1]);
      if (!betAmount || isNaN(betAmount)) {
        return m.reply(`❌ Masukkan jumlah taruhan!`);
      }

      // Join lobby
      const result = game.joinLobby(lobbyId, userId, betAmount);

      if (!result.success) {
        return m.reply(result.message);
      }

      return m.reply(
        `
${result.message}
Pemain: (${result.playerCount}/${result.maxPlayers})

Host ketik *${usedPrefix}mpoker start* untuk mulai permainan.
      `,
        null,
        { mentions: [userId] }
      );
    }

    case "start": {
      // Check if there's a lobby in the group
      const lobbyId = game.getLobbyByGroup(groupId);
      if (!lobbyId) {
        return m.reply(
          `❌ Tidak ada lobby poker di grup ini! Buat dulu dengan ${usedPrefix}mpoker create <taruhan>.`
        );
      }

      // Start game
      const result = game.startGame(lobbyId, userId);

      if (!result.success) {
        return m.reply(result.message);
      }

      return m.reply(result.message, null, {
        mentions: game.multiplayerLobbies[lobbyId].playerIds,
      });
    }

    case "hit": {
      // Check if player is in a game
      const lobbyId = game.isUserInLobby(userId);
      if (!lobbyId) {
        return m.reply(`❌ Anda tidak sedang bermain poker!`);
      }

      // Check if the game is active
      const lobby = game.multiplayerLobbies[lobbyId];
      if (!lobby || lobby.status !== "playing") {
        return m.reply(`❌ Permainan belum dimulai!`);
      }

      // Execute hit action
      const result = game.hit(lobbyId, userId);

      if (!result.success) {
        return m.reply(result.message);
      }

      if (result.action === "hit") {
        return m.reply(result.message, null, { mentions: [userId] });
      } else if (result.action === "next") {
        // Next player's turn
        return m.reply(result.message, null, {
          mentions: [lobby.playerIds[lobby.currentPlayerIndex]],
        });
      } else if (result.action === "end") {
        // Game ended
        return m.reply(result.message, null, { mentions: result.mentions });
      }

      return m.reply(result.message);
    }

    case "stand": {
      // Check if player is in a game
      const lobbyId = game.isUserInLobby(userId);
      if (!lobbyId) {
        return m.reply(`❌ Anda tidak sedang bermain poker!`);
      }

      // Check if the game is active
      const lobby = game.multiplayerLobbies[lobbyId];
      if (!lobby || lobby.status !== "playing") {
        return m.reply(`❌ Permainan belum dimulai!`);
      }

      // Execute stand action
      const result = game.stand(lobbyId, userId);

      if (!result.success) {
        return m.reply(result.message);
      }

      if (result.action === "next") {
        // Next player's turn
        return m.reply(result.message, null, {
          mentions: [lobby.playerIds[lobby.currentPlayerIndex]],
        });
      } else if (result.action === "end") {
        // Game ended
        return m.reply(result.message, null, { mentions: result.mentions });
      }

      return m.reply(result.message);
    }

    case "leave": {
      // Check if player is in a lobby
      const lobbyId = game.isUserInLobby(userId);
      if (!lobbyId) {
        return m.reply(`❌ Anda tidak berada dalam lobby poker!`);
      }

      // Leave lobby
      const result = game.leaveLobby(lobbyId, userId);

      if (!result.success) {
        return m.reply(result.message);
      }

      if (result.action === "cancel") {
        return m.reply(result.message, null, {
          mentions: result.mentions,
        });
      }

      return m.reply(
        `
${result.message}
Pemain: (${result.playerCount}/${result.maxPlayers})
      `,
        null,
        { mentions: [userId] }
      );
    }

    case "status": {
      // Check if there's a lobby in the group
      const lobbyId = game.getLobbyByGroup(groupId);
      if (!lobbyId) {
        return m.reply(`❌ Tidak ada lobby poker di grup ini!`);
      }

      // Get lobby status
      const result = game.getLobbyStatus(lobbyId);

      if (!result.success) {
        return m.reply(result.message);
      }

      return m.reply(result.message, null, {
        mentions: result.mentions,
      });
    }

    case "cancel": {
      // Check if there's a lobby in the group
      const lobbyId = game.getLobbyByGroup(groupId);
      if (!lobbyId) {
        return m.reply(`❌ Tidak ada lobby poker di grup ini!`);
      }

      // Check if user is host
      const lobby = game.multiplayerLobbies[lobbyId];
      if (userId !== lobby.host) {
        return m.reply(`❌ Hanya host yang dapat membatalkan permainan!`);
      }

      // Check game state
      if (lobby.status === "playing") {
        return m.reply(
          `❌ Permainan sedang berlangsung, tidak bisa dibatalkan!`
        );
      }

      // Cancel the game
      clearTimeout(lobby.timeoutId);
      delete game.multiplayerLobbies[lobbyId];

      return m.reply(
        `🚫 Lobby poker dibatalkan oleh host @${userId.split("@")[0]}.`,
        null,
        { mentions: lobby.playerIds }
      );
    }

    case "profile": {
      // Get user profile
      const profile = game.getUserProfile(userId);

      // Calculate win rate
      const totalGames = profile.wins + profile.losses;
      const winRate =
        totalGames > 0 ? ((profile.wins / totalGames) * 100).toFixed(1) : 0;

      // Calculate next level requirements
      const nextLevelExp = profile.level * 50;
      const expProgress = (profile.exp / nextLevelExp) * 100;

      return m.reply(`
📊 *PROFIL POKER ANDA* 📊

👤 *Nama:* ${profile.name}
💰 *Uang:* ${profile.money} koin
🏆 *Menang:* ${profile.wins} kali
❌ *Kalah:* ${profile.losses} kali
📈 *Win Rate:* ${winRate}%

📊 *Level:* ${profile.level}
✨ *Exp:* ${profile.exp}/${nextLevelExp} (${expProgress.toFixed(1)}%)

${
  profile.money < 1000
    ? `⚠️ *Uang Anda menipis!* Ketik *${usedPrefix}daily* untuk bonus harian.`
    : ""
}
${
  profile.money <= 0
    ? `❗ Ketik *${usedPrefix}mpoker reset* untuk mereset uang ke ${game.config.baseMoney} koin.`
    : ""
}
      `);
    }

    case "reset": {
      // Reset user money if they're broke
      const profile = game.getUserProfile(userId);

      if (profile.money > 0) {
        return m.reply(
          `❌ Anda masih memiliki ${profile.money} koin. Reset hanya untuk pemain yang bangkrut!`
        );
      }

      // Reset money
      game.resetUserMoney(userId);

      return m.reply(`
💰 *UANG DIRESET* 💰
Uang Anda telah direset ke ${game.config.baseMoney} koin.
Semoga beruntung di permainan berikutnya!
      `);
    }

    case "update": {
      // Check if there's a lobby in the group
      const lobbyId = game.getLobbyByGroup(groupId);
      if (!lobbyId) {
        return m.reply(`❌ Tidak ada lobby poker di grup ini!`);
      }

      // Check if user is host
      const lobby = game.multiplayerLobbies[lobbyId];
      if (userId !== lobby.host) {
        return m.reply(
          `❌ Hanya host yang dapat mengupdate pengaturan permainan!`
        );
      }

      // Check if game has already started
      if (lobby.status !== "waiting") {
        return m.reply(
          `❌ Tidak bisa mengubah pengaturan, permainan sudah dimulai!`
        );
      }

      // Check what to update
      const updateType = args[1]?.toLowerCase();
      const updateValue = parseInt(args[2]);

      if (!updateType || !["min", "max"].includes(updateType)) {
        return m.reply(
          `❌ Tentukan parameter yang ingin diupdate: min atau max!`
        );
      }

      if (!updateValue || isNaN(updateValue)) {
        return m.reply(`❌ Masukkan nilai angka yang valid!`);
      }

      // Update min players
      if (updateType === "min") {
        if (
          updateValue < 1 ||
          updateValue > lobby.config?.maxPlayers ||
          updateValue > game.config.maxPlayers
        ) {
          return m.reply(
            `❌ Minimal pemain harus antara 1 - ${Math.min(
              lobby.config?.maxPlayers || game.config.maxPlayers,
              game.config.maxPlayers
            )}!`
          );
        }

        // Update config in PokerGame instance
        game.config.minPlayers = updateValue;

        // Also store in lobby for reference
        lobby.config = {
          ...(lobby.config || {}),
          minPlayers: updateValue,
        };

        return m.reply(
          `
✅ *PENGATURAN DIUPDATE* ✅
Minimal pemain sekarang: ${updateValue}
Host: @${userId.split("@")[0]}
        `,
          null,
          { mentions: [userId] }
        );
      }

      // Update max players
      if (updateType === "max") {
        if (
          updateValue < (lobby.config?.minPlayers || game.config.minPlayers) ||
          updateValue > 10
        ) {
          return m.reply(
            `❌ Maksimal pemain harus antara ${
              lobby.config?.minPlayers || game.config.minPlayers
            } - 10!`
          );
        }

        // Check if new max is less than current player count
        const currentPlayerCount = Object.keys(lobby.players).length;
        if (updateValue < currentPlayerCount) {
          return m.reply(
            `❌ Tidak bisa set maksimal pemain lebih kecil dari jumlah pemain saat ini (${currentPlayerCount})!`
          );
        }

        // Update config in PokerGame instance
        game.config.maxPlayers = updateValue;

        // Also store in lobby for reference
        lobby.config = {
          ...(lobby.config || {}),
          maxPlayers: updateValue,
        };

        return m.reply(
          `
✅ *PENGATURAN DIUPDATE* ✅
Maksimal pemain sekarang: ${updateValue}
Host: @${userId.split("@")[0]}
        `,
          null,
          { mentions: [userId] }
        );
      }

      return m.reply(`❌ Pengaturan tidak valid!`);
    }

    case "settings": {
      // Check if there's a lobby in the group
      const lobbyId = game.getLobbyByGroup(groupId);
      if (!lobbyId) {
        return m.reply(`❌ Tidak ada lobby poker di grup ini!`);
      }

      // Get lobby
      const lobby = game.multiplayerLobbies[lobbyId];

      // Compile settings
      const minPlayers = lobby.config?.minPlayers || game.config.minPlayers;
      const maxPlayers = lobby.config?.maxPlayers || game.config.maxPlayers;
      const currentPlayers = Object.keys(lobby.players).length;
      const betAmount = lobby.betAmount;
      const timeLeft =
        lobby.status === "waiting"
          ? Math.max(
              0,
              Math.round(
                (lobby.timestamp + game.config.joinTimeout - Date.now()) / 1000
              )
            )
          : "Permainan sudah dimulai";

      return m.reply(
        `
⚙️ *PENGATURAN LOBBY POKER* ⚙️

🎮 *Status:* ${
          lobby.status === "waiting" ? "Menunggu pemain" : "Sedang bermain"
        }
👥 *Pemain:* ${currentPlayers}/${maxPlayers}
⚖️ *Min. Pemain:* ${minPlayers}
🔢 *Max. Pemain:* ${maxPlayers}
💰 *Taruhan:* ${betAmount} koin
⏱️ *Waktu tersisa:* ${
          typeof timeLeft === "number" ? `${timeLeft} detik` : timeLeft
        }
👑 *Host:* @${lobby.host.split("@")[0]}

${
  lobby.status === "waiting"
    ? `🔧 *Host dapat mengubah pengaturan:*
- ${usedPrefix}mpoker update min <jumlah>
- ${usedPrefix}mpoker update max <jumlah>`
    : ""
}
      `,
        null,
        { mentions: [lobby.host] }
      );
    }
    default:
      return m.reply(`❌ Perintah tidak ditemukan!`);
  }
};

// Menerima perintah 'mhit' untuk hit pada giliran pemain
handler.command = /^(mpoker|multipoker|mhit|mstand)$/i;

// Ketika mhit/mstand digunakan sebagai command terpisah
handler.before = async (m, { usedPrefix }) => {
  if (!m.text) return;

  const command = m.text.trim().toLowerCase();

  if (command === `${usedPrefix}mhit`) {
    await handler(m, { conn: m.conn, args: ["hit"], usedPrefix });
    return true;
  }

  if (command === `${usedPrefix}mstand`) {
    await handler(m, { conn: m.conn, args: ["stand"], usedPrefix });
    return true;
  }

  return false;
};

// Handler untuk mengatur alias tag
handler.tags = ["game"];
handler.help = ["mpoker"];
handler.command = /^(mpoker)$/i;
handler.group = true;
handler.register = true;
module.exports = handler;
