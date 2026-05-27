import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { Database } from './db.js';
import { GameRegistry, Player } from './game.js';

const app = express();
const server = http.createServer(app);
// const allowedOrigins = new Set([
//   process.env.CLIENT_URL,
//   'http://localhost:5173',
//   'http://127.0.0.1:5173'
// ].filter(Boolean));

const allowedOrigins = new Set([
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175'
].filter(Boolean));
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by Socket.IO CORS.`));
    }
  }
});
const db = new Database();
const registry = new GameRegistry();
const port = process.env.PORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: Boolean(process.env.DATABASE_URL) });
});

app.get('/api/rooms', (_req, res) => {
  res.json({
    rooms: [...registry.rooms.values()].map((room) => ({
      id: room.id,
      code: room.code,
      phase: room.phase,
      isPrivate: room.settings.privateRoom,
      players: room.players.length,
      maxPlayers: room.settings.maxPlayers,
      round: room.round
    }))
  });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = registry.find(req.params.roomId);
  if (!room) {
    res.status(404).json({ ok: false, error: 'Room not found.' });
    return;
  }

  res.json({
    ok: true,
    room: {
      id: room.id,
      code: room.code,
      phase: room.phase,
      settings: room.settings,
      players: room.players.map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        isHost: player.isHost
      })),
      leaderboard: room.leaderboard.map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score
      }))
    }
  });
});

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  const indexHtml = path.join(frontendDist, 'index.html');

  if (fs.existsSync(indexHtml)) {
    app.use(express.static(frontendDist));
    app.get('*', (_req, res) => res.sendFile(indexHtml));
  } else {
    console.warn(`Frontend dist not found at ${indexHtml}. Skipping static file serving.`);
  }
}

const emitState = (room) => {
  room.players.forEach((player) => {
    io.to(player.id).emit('game_state', room.publicState(player.id));
  });
};

const emitChat = (room, message) => io.to(room.id).emit('chat_message', message);

const advanceRound = (room) => {
  room.nextTurn();
  if (room.phase !== 'game-over') {
    io.to(room.id).emit('round_start', {
      drawerId: room.drawerId,
      wordOptions: room.wordOptions,
      drawTime: room.settings.drawTime
    });
  } else {
    io.to(room.id).emit('game_over', {
      winner: room.leaderboard[0],
      leaderboard: room.leaderboard
    });
  }
  emitState(room);
};

const scheduleRoundEnd = (room) => {
  room.clearTimer();
  room.ticker = setInterval(() => emitState(room), 1000);
  room.timer = setTimeout(async () => {
    room.endRound();
    await db.updateScores(room);
    io.to(room.id).emit('round_end', {
      word: room.currentWord,
      scores: room.leaderboard,
      nextDrawer: room.players[(room.turnIndex + 1) % room.players.length]?.name
    });
    emitState(room);
    setTimeout(() => {
      advanceRound(room);
    }, 4500);
  }, room.settings.drawTime * 1000);
};

io.on('connection', (socket) => {
  socket.on('create_room', async ({ hostName, settings }, ack) => {
    try {
      const room = registry.create(socket, hostName, settings);
      socket.join(room.id);
      await db.saveRoom(room);
      await db.savePlayer(room.id, room.players[0]);
      ack?.({ ok: true, roomId: room.id, code: room.code, playerId: socket.id });
      emitState(room);
    } catch (error) {
      ack?.({ ok: false, error: error.message });
    }
  });

  socket.on('join_room', async ({ roomId, playerName }, ack) => {
    try {
      const room = roomId === 'public' ? registry.publicRoom() : registry.find(roomId);
      if (!room) throw new Error('Room not found.');
      const player = new Player(socket, playerName);
      room.addPlayer(player);
      socket.join(room.id);
      await db.savePlayer(room.id, player);
      ack?.({ ok: true, roomId: room.id, code: room.code, playerId: socket.id });
      io.to(room.id).emit('player_joined', { player, players: room.players });
      emitChat(room, { system: true, text: `${player.name} joined the room.` });
      emitState(room);
    } catch (error) {
      ack?.({ ok: false, error: error.message });
    }
  });

  socket.on('ready', () => {
    const room = registry.playerRoom(socket.id);
    const player = room?.players.find((candidate) => candidate.id === socket.id);
    if (!room || !player) return;
    player.ready = !player.ready;
    emitState(room);
  });

  socket.on('start_game', async (_payload, ack) => {
    try {
      const room = registry.playerRoom(socket.id);
      const player = room?.players.find((candidate) => candidate.id === socket.id);
      if (!room || !player?.isHost) throw new Error('Only the host can start.');
      room.startGame();
      await db.updateScores(room);
      io.to(room.id).emit('round_start', {
        drawerId: room.drawerId,
        wordOptions: room.wordOptions,
        drawTime: room.settings.drawTime
      });
      ack?.({ ok: true });
      emitState(room);
    } catch (error) {
      ack?.({ ok: false, error: error.message });
    }
  });

  socket.on('word_chosen', async ({ word }, ack) => {
    try {
      const room = registry.playerRoom(socket.id);
      if (!room || room.drawerId !== socket.id) throw new Error('Only the drawer can choose.');
      room.chooseWord(word);
      ack?.({ ok: true });
      scheduleRoundEnd(room);
      emitState(room);
    } catch (error) {
      ack?.({ ok: false, error: error.message });
    }
  });

  socket.on('draw_start', (stroke) => handleDraw(socket, 'draw_start', stroke));
  socket.on('draw_move', (point) => handleDraw(socket, 'draw_move', point));
  socket.on('draw_end', (point) => handleDraw(socket, 'draw_end', point));

  socket.on('canvas_clear', () => {
    const room = registry.playerRoom(socket.id);
    if (!room || room.drawerId !== socket.id) return;
    room.strokes = [];
    io.to(room.id).emit('canvas_clear');
  });

  socket.on('draw_undo', () => {
    const room = registry.playerRoom(socket.id);
    if (!room || room.drawerId !== socket.id) return;
    room.strokes.pop();
    io.to(room.id).emit('draw_undo');
  });

  socket.on('guess', async ({ text }, ack) => {
    const room = registry.playerRoom(socket.id);
    const player = room?.players.find((candidate) => candidate.id === socket.id);
    if (!room || !player) return;
    const result = room.scoreGuess(socket.id, text);
    if (result) {
      emitChat(room, { system: true, text: `${player.name} guessed the word!` });
      io.to(room.id).emit('guess_result', {
        correct: true,
        playerId: player.id,
        playerName: player.name,
        points: player.score
      });
      await db.updateScores(room);
      ack?.({ ok: true, correct: true });
      if (result.allGuessed) {
        room.endRound();
        io.to(room.id).emit('round_end', { word: room.currentWord, scores: room.leaderboard });
        emitState(room);
        setTimeout(() => {
          advanceRound(room);
        }, 4500);
      } else {
        emitState(room);
      }
      return;
    }
    emitChat(room, { playerId: player.id, playerName: player.name, text: String(text || '').slice(0, 160) });
    ack?.({ ok: true, correct: false });
  });

  socket.on('chat', ({ text }) => {
    const room = registry.playerRoom(socket.id);
    const player = room?.players.find((candidate) => candidate.id === socket.id);
    if (!room || !player || room.phase === 'drawing') return;
    emitChat(room, { playerId: player.id, playerName: player.name, text: String(text || '').slice(0, 160) });
  });

  socket.on('disconnect', async () => {
    const room = registry.playerRoom(socket.id);
    if (!room) return;
    const removed = room.removePlayer(socket.id);
    await db.removePlayer(socket.id);
    if (removed) {
      io.to(room.id).emit('player_left', { playerId: socket.id, players: room.players });
      emitChat(room, { system: true, text: `${removed.name} left the room.` });
    }
    if (room.players.length === 0) {
      room.clearTimer();
      registry.rooms.delete(room.id);
      return;
    }
    if (socket.id === room.drawerId && room.phase === 'drawing') room.endRound();
    emitState(room);
  });
});

function handleDraw(socket, event, payload = {}) {
  const room = registry.playerRoom(socket.id);
  if (!room || room.drawerId !== socket.id || room.phase !== 'drawing') return;
  const data = { ...payload, event };
  if (event === 'draw_start') room.strokes.push([data]);
  if (event === 'draw_move' || event === 'draw_end') room.strokes.at(-1)?.push(data);
  socket.to(room.id).emit('draw_data', data);
}

await db.init();
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
