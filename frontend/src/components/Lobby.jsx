import React from 'react';
import { socket } from '../socket.js';

export function Lobby({ me, players, roomCode, roomLink, onStartGame }) {
  return (
    <div className="center-panel">
      <h2>Room lobby</h2>
      <p>{players.length < 2 ? 'Invite one more player with the room code.' : 'Ready when you are.'}</p>
      <div className="room-invite">
        <span>Room code: <strong>{roomCode}</strong></span>
        {roomLink && <button type="button" onClick={() => navigator.clipboard.writeText(roomLink)}>Copy invite link</button>}
      </div>
      <div className="player-list-summary">
        {players.map((player) => (
          <div key={player.id} className="player-status-row">
            <strong>{player.name}</strong>
            <small>{player.isHost ? 'Host' : player.ready ? 'Ready' : 'Waiting'}</small>
          </div>
        ))}
      </div>
      <div className="actions">
        <button onClick={() => socket.emit('ready')}>{me?.ready ? 'Unready' : 'Ready'}</button>
        {me?.isHost && <button disabled={players.length < 2} onClick={onStartGame}>Start game</button>}
      </div>
    </div>
  );
}
