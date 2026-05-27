import React from 'react';
import { socket } from '../socket.js';

export function WordPicker({ isDrawer, drawerName, words }) {
  if (!isDrawer) {
    return <div className="center-panel"><h2>{drawerName} is choosing a word</h2></div>;
  }

  return (
    <div className="center-panel">
      <h2>Choose a word</h2>
      <div className="word-grid">
        {words.map((word) => <button key={word} onClick={() => socket.emit('word_chosen', { word }, () => {})}>{word}</button>)}
      </div>
    </div>
  );
}
