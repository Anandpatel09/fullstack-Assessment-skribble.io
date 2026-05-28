import React from 'react';
import { socket } from '../socket.js';

export function Lobby({ me, players, roomCode, roomLink, onStartGame }) {
  const handleReady = (e) => {
    e.preventDefault();
    try {
      // log for debugging whether the button click is firing and socket state
      // eslint-disable-next-line no-console
      console.log('Ready clicked', { id: socket?.id, connected: socket?.connected });
      socket?.emit('ready');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to emit ready', err);
    }
  };

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
        <button type="button" onClick={handleReady}>{me?.ready ? 'Unready' : 'Ready'}</button>
        {me?.isHost && <button disabled={players.length < 2} onClick={onStartGame}>Start game</button>}
      </div>
    </div>
  );
}
