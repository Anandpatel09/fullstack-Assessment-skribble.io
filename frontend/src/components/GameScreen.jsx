import React from 'react';
import { Chat } from './Chat.jsx';
import { DrawingCanvas } from './DrawingCanvas.jsx';
import { GameOver } from './GameOver.jsx';
import { Lobby } from './Lobby.jsx';
import { Logo } from './Logo.jsx';
import { Players } from './Players.jsx';
import { TopBar } from './TopBar.jsx';
import { WordPicker } from './WordPicker.jsx';

export function GameScreen({ state, messages, notice, playerId, wordOptions, roomLink, startGame }) {
  const isDrawer = state.drawerId === playerId;
  const me = state.players?.find((player) => player.id === playerId);

  return (
    <main className="game-shell">
      <header className="game-logo">
        <Logo />
        <button className="gear" title="Room settings" aria-label="Room settings">⚙</button>
      </header>
      <aside className="sidebar">
        <Players players={state.players} drawerId={state.drawerId} />
      </aside>
      <section className="board">
        <TopBar state={state} isDrawer={isDrawer} />
        {state.phase === 'lobby' && (
          <Lobby
            me={me}
            players={state.players}
            roomCode={state.code}
            roomLink={roomLink}
            onStartGame={startGame}
          />
        )}
        {state.phase === 'choosing' && (
          <WordPicker isDrawer={isDrawer} drawerName={state.drawerName} words={state.wordOptions?.length ? state.wordOptions : wordOptions} />
        )}
        {(state.phase === 'drawing' || state.phase === 'round-end') && (
          <DrawingCanvas isDrawer={isDrawer && state.phase === 'drawing'} strokes={state.strokes} />
        )}
        {state.phase === 'game-over' && <GameOver leaderboard={state.leaderboard} />}
        {notice && <p className="notice floating">{notice}</p>}
      </section>
      <Chat messages={messages} disabled={isDrawer && state.phase === 'drawing'} isGuessMode={!isDrawer && state.phase === 'drawing'} />
    </main>
  );
}
