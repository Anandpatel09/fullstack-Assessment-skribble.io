import React from 'react';

export function Players({ players, drawerId }) {
  return (
    <div className="player-list">
      {[...players]
        .sort((a, b) => b.score - a.score)
        .map((player, index) => (
          <div key={player.id} className={player.id === drawerId ? 'player-row drawing' : 'player-row'}>
            <strong>#{index + 1}</strong>
            <div className="player-name">
              <span>{player.name}</span>
              <small>{player.score} points</small>
              <small className="player-status">{player.isHost ? 'Host' : player.guessed ? 'Guessed' : 'Waiting'}</small>
            </div>
            <div className="avatar small-avatar"><span>{player.name.slice(0, 1).toUpperCase()}</span></div>
          </div>
        ))}
    </div>
  );
}
