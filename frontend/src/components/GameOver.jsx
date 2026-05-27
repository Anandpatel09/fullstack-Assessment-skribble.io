import React from 'react';

export function GameOver({ leaderboard }) {
  return (
    <div className="center-panel">
      <h2>Game over</h2>
      <p>Winner: {leaderboard[0]?.name || 'No winner'}</p>
      <div className="leaderboard-summary">
        {leaderboard.map((player, index) => (
          <div key={player.id} className="leaderboard-row">
            <span>#{index + 1}</span>
            <strong>{player.name}</strong>
            <span>{player.score} pts</span>
          </div>
        ))}
      </div>
      <p className="end-note">Refresh to play again or invite friends to the same room.</p>
    </div>
  );
}
