import crypto from 'crypto';

const DEFAULT_WORDS = [
  'apple',
  'airplane',
  'backpack',
  'banana',
  'camera',
  'castle',
  'dinosaur',
  'guitar',
  'ice cream',
  'mountain',
  'pencil',
  'pizza',
  'rainbow',
  'robot',
  'rocket',
  'sailboat',
  'snowman',
  'sunflower',
  'telescope',
  'waterfall'
];

const DEFAULT_SETTINGS = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  wordMode: 'normal',
  privateRoom: true
};

export const cleanGuess = (value) => value.toLowerCase().trim().replace(/\s+/g, ' ');

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));

const code = () => crypto.randomBytes(3).toString('hex').toUpperCase();

export class Player {
  constructor(socket, name, isHost = false) {
    this.id = socket.id;
    this.name = String(name || 'Player').trim().slice(0, 24);
    this.score = 0;
    this.isHost = isHost;
    this.ready = false;
    this.guessed = false;
  }
}

export class Room {
  constructor(host, settings = {}) {
    this.id = crypto.randomUUID();
    this.code = code();
    this.players = [host];
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      maxPlayers: clamp(settings.maxPlayers, 2, 20),
      rounds: clamp(settings.rounds, 2, 10),
      drawTime: clamp(settings.drawTime, 15, 240),
      wordCount: clamp(settings.wordCount, 1, 5),
      hints: clamp(settings.hints ?? DEFAULT_SETTINGS.hints, 0, 5),
      wordMode: ['normal', 'hidden', 'combination'].includes(settings.wordMode)
        ? settings.wordMode
        : DEFAULT_SETTINGS.wordMode,
      privateRoom: Boolean(settings.privateRoom)
    };
    this.phase = 'lobby';
    this.round = 0;
    this.turnIndex = -1;
    this.drawerId = null;
    this.currentWord = '';
    this.wordOptions = [];
    this.endsAt = null;
    this.hints = [];
    this.strokes = [];
    this.timer = null;
    this.ticker = null;
  }

  addPlayer(player) {
    if (this.players.length >= this.settings.maxPlayers) throw new Error('Room is full.');
    if (this.phase !== 'lobby') throw new Error('Game already started.');
    this.players.push(player);
  }

  removePlayer(playerId) {
    const removed = this.players.find((player) => player.id === playerId);
    this.players = this.players.filter((player) => player.id !== playerId);
    if (removed?.isHost && this.players[0]) this.players[0].isHost = true;
    return removed;
  }

  get drawer() {
    return this.players.find((player) => player.id === this.drawerId);
  }

  get leaderboard() {
    return [...this.players].sort((a, b) => b.score - a.score);
  }

  publicState(forPlayerId) {
    const isDrawer = forPlayerId === this.drawerId;
    return {
      id: this.id,
      code: this.code,
      settings: this.settings,
      phase: this.phase,
      round: this.round,
      drawerId: this.drawerId,
      drawerName: this.drawer?.name || '',
      word: isDrawer || this.phase === 'round-end' || this.phase === 'game-over' ? this.currentWord : '',
      hint: isDrawer ? this.currentWord : this.hintText(),
      wordOptions: isDrawer && this.phase === 'choosing' ? this.wordOptions : [],
      endsAt: this.endsAt,
      players: this.players.map(({ id, name, score, isHost, ready, guessed }) => ({
        id,
        name,
        score,
        isHost,
        ready,
        guessed
      })),
      leaderboard: this.leaderboard.map(({ id, name, score }) => ({ id, name, score })),
      strokes: this.strokes
    };
  }

  startGame() {
    if (this.players.length < 2) throw new Error('Need at least 2 players.');
    this.players.forEach((player) => {
      player.score = 0;
      player.guessed = false;
    });
    this.round = 1;
    this.turnIndex = -1;
    this.nextTurn();
  }

  nextTurn() {
    this.clearTimer();
    const totalTurns = this.settings.rounds * this.players.length;
    const completedTurns = (this.round - 1) * this.players.length + this.turnIndex + 1;
    if (completedTurns >= totalTurns) {
      this.phase = 'game-over';
      this.endsAt = null;
      return;
    }

    this.turnIndex += 1;
    if (this.turnIndex >= this.players.length) {
      this.turnIndex = 0;
      this.round += 1;
    }
    this.drawerId = this.players[this.turnIndex].id;
    this.phase = 'choosing';
    this.currentWord = '';
    this.wordOptions = this.randomWords(this.settings.wordCount);
    this.hints = [];
    this.strokes = [];
    this.players.forEach((player) => {
      player.guessed = false;
    });
  }

  chooseWord(word) {
    if (!this.wordOptions.includes(word)) throw new Error('Invalid word choice.');
    this.currentWord = word;
    this.phase = 'drawing';
    this.endsAt = Date.now() + this.settings.drawTime * 1000;
    this.hints = this.makeHints(word, this.settings.hints);
  }

  scoreGuess(playerId, text) {
    if (this.phase !== 'drawing') return null;
    if (playerId === this.drawerId) return null;
    const player = this.players.find((candidate) => candidate.id === playerId);
    if (!player || player.guessed) return null;
    if (cleanGuess(text) !== cleanGuess(this.currentWord)) return null;

    player.guessed = true;
    const secondsLeft = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    const rankBonus = this.players.filter((candidate) => candidate.guessed).length * 25;
    player.score += 100 + secondsLeft + Math.max(0, 75 - rankBonus);
    const activeGuessers = this.players.filter((candidate) => candidate.id !== this.drawerId);
    if (activeGuessers.length && activeGuessers.every((candidate) => candidate.guessed)) {
      this.drawer.score += 50;
      return { player, allGuessed: true };
    }
    return { player, allGuessed: false };
  }

  hintText() {
    if (!this.currentWord || this.settings.wordMode === 'hidden') return '';
    const elapsed = this.endsAt ? this.settings.drawTime - Math.ceil((this.endsAt - Date.now()) / 1000) : 0;
    const revealEvery = this.settings.hints ? this.settings.drawTime / (this.settings.hints + 1) : Infinity;
    const revealCount = Math.min(this.hints.length, Math.floor(elapsed / revealEvery));
    const revealedIndexes = new Set(this.hints.slice(0, revealCount));

    if (this.settings.wordMode === 'combination') {
      const letters = [...this.currentWord];
      const visible = new Set([0, letters.length - 1]);
      const combinationCount = Math.min(revealCount + 2, this.hints.length + 2);
      this.hints.slice(0, combinationCount).forEach((index) => visible.add(index));
      return letters
        .map((char, index) => (char === ' ' ? ' ' : visible.has(index) ? char : '_'))
        .join(' ');
    }

    return [...this.currentWord]
      .map((char, index) => (char === ' ' ? ' ' : revealedIndexes.has(index) ? char : '_'))
      .join(' ');
  }

  endRound() {
    this.clearTimer();
    this.phase = 'round-end';
    this.endsAt = null;
  }

  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    if (this.ticker) clearInterval(this.ticker);
    this.timer = null;
    this.ticker = null;
  }

  randomWords(count) {
    return [...DEFAULT_WORDS].sort(() => Math.random() - 0.5).slice(0, count);
  }

  makeHints(word, count) {
    const indexes = [...word]
      .map((char, index) => (char === ' ' ? null : index))
      .filter((index) => index !== null);
    return indexes.sort(() => Math.random() - 0.5).slice(0, count);
  }
}

export class GameRegistry {
  constructor() {
    this.rooms = new Map();
  }

  create(socket, playerName, settings) {
    const host = new Player(socket, playerName, true);
    const room = new Room(host, settings);
    this.rooms.set(room.id, room);
    return room;
  }

  find(roomIdOrCode) {
    const search = String(roomIdOrCode || '').toUpperCase();
    return this.rooms.get(roomIdOrCode) || [...this.rooms.values()].find((room) => room.code === search);
  }

  publicRoom() {
    return [...this.rooms.values()].find(
      (room) => !room.settings.privateRoom && room.phase === 'lobby' && room.players.length < room.settings.maxPlayers
    );
  }

  playerRoom(playerId) {
    return [...this.rooms.values()].find((room) => room.players.some((player) => player.id === playerId));
  }
}
