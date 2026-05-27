import pg from 'pg';

const { Pool } = pg;

export class Database {
  constructor() {
    this.pool = process.env.DATABASE_URL
      ? new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        })
      : null;
  }

  async init() {
    if (!this.pool) {
      console.warn('DATABASE_URL is not set. PostgreSQL persistence is disabled for this run.');
      return;
    }

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        is_private BOOLEAN NOT NULL DEFAULT true,
        settings JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        is_host BOOLEAN NOT NULL DEFAULT false,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS score_snapshots (
        id BIGSERIAL PRIMARY KEY,
        room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
        round INTEGER NOT NULL,
        scores JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  async saveRoom(room) {
    if (!this.pool) return;
    await this.pool.query(
      `INSERT INTO rooms (id, code, is_private, settings, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code,
         is_private = EXCLUDED.is_private,
         settings = EXCLUDED.settings,
         updated_at = NOW()`,
      [room.id, room.code, room.settings.privateRoom, room.settings]
    );
  }

  async savePlayer(roomId, player) {
    if (!this.pool) return;
    await this.pool.query(
      `INSERT INTO players (id, room_id, name, score, is_host)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         score = EXCLUDED.score,
         is_host = EXCLUDED.is_host`,
      [player.id, roomId, player.name, player.score, player.isHost]
    );
  }

  async updateScores(room) {
    if (!this.pool) return;
    const players = room.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score
    }));
    await Promise.all(
      room.players.map((player) =>
        this.pool.query('UPDATE players SET score = $1 WHERE id = $2', [player.score, player.id])
      )
    );
    await this.pool.query(
      'INSERT INTO score_snapshots (room_id, round, scores) VALUES ($1, $2, $3)',
      [room.id, room.round, JSON.stringify(players)]
    );
  }

  async removePlayer(playerId) {
    if (!this.pool) return;
    await this.pool.query('DELETE FROM players WHERE id = $1', [playerId]);
  }
}
