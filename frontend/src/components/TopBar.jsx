import React, { useEffect, useState } from 'react';

export function TopBar({ state, isDrawer }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  const seconds = state.endsAt ? Math.max(0, Math.ceil((state.endsAt - now) / 1000)) : 0;
  const phaseLabel = {
    lobby: 'LOBBY',
    choosing: 'CHOOSING',
    drawing: 'DRAWING',
    'round-end': 'ROUND END',
    'game-over': 'GAME OVER'
  }[state.phase] || state.phase.toUpperCase();

  const wordLabel = state.phase === 'drawing'
    ? isDrawer
      ? state.word
      : state.hint || 'Guess the word'
    : state.phase === 'choosing'
      ? 'Waiting for drawer to choose' : 'Waiting for next round';

  return (
    <header className="topbar">
      <div className="timer">{state.phase === 'drawing' ? seconds || '-' : '-'}</div>
      <div className="word-strip">
        <span>{phaseLabel}</span>
        <strong>{wordLabel}</strong>
      </div>
      <div className="round-pill">
        {state.phase === 'lobby' ? 'Waiting to start' : `Round ${state.round} of ${state.settings.rounds}`}
      </div>
    </header>
  );
}
