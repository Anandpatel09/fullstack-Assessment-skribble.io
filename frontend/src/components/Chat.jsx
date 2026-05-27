import React, { useState } from 'react';
import { socket } from '../socket.js';

export function Chat({ messages, disabled, isGuessMode }) {
  const [text, setText] = useState('');

  const send = (event) => {
    event.preventDefault();
    if (!text.trim() || disabled) return;
    socket.emit(isGuessMode ? 'guess' : 'chat', { text });
    setText('');
  };

  return (
    <aside className="chat">
      <div className="messages">
        {messages.map((message, index) => (
          <p key={index} className={message.system ? 'system' : ''}>
            {message.system ? message.text : <><strong>{message.playerName}: </strong>{message.text}</>}
          </p>
        ))}
      </div>
      <form onSubmit={send}>
        <input
          disabled={disabled}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={disabled ? 'Drawer waits until round end' : isGuessMode ? 'Type your guess' : 'Type a chat message'}
        />
        <button type="submit" disabled={disabled}>Send</button>
      </form>
    </aside>
  );
}
