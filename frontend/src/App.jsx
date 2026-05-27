import React, { useEffect, useState } from 'react';
import { socket } from './socket.js';
import { EntryScreen } from './components/EntryScreen.jsx';
import { GameScreen } from './components/GameScreen.jsx';

const defaultSettings = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  wordMode: 'normal',
  privateRoom: true
};

export default function App() {
  const [name, setName] = useState(localStorage.getItem('playerName') || '');
  const [roomCode, setRoomCode] = useState(new URLSearchParams(location.search).get('room') || '');
  const [settings, setSettings] = useState(defaultSettings);
  const [state, setState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [wordOptions, setWordOptions] = useState([]);
  const [notice, setNotice] = useState('');
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      setNotice('');
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (error) => {
      setConnected(false);
      setNotice(`Cannot connect to backend: ${error.message}`);
    });
    socket.on('game_state', setState);
    socket.on('round_start', ({ wordOptions }) => setWordOptions(wordOptions || []));
    socket.on('chat_message', (message) => setMessages((items) => [...items.slice(-80), message]));
    socket.on('guess_result', ({ playerName }) => setNotice(`${playerName} guessed correctly`));
    socket.on('round_end', ({ word }) => {
      setNotice(`Round over. The word was "${word}".`);
      setWordOptions([]);
    });

    return () => socket.removeAllListeners();
  }, []);

  const emitWithAck = (event, payload, onSuccess) => {
    socket.timeout(5000).emit(event, payload, (error, reply) => {
      if (error) {
        setNotice('Backend did not respond. Check that backend is running on port 4000.');
        return;
      }

      if (!reply?.ok) {
        setNotice(reply?.error || 'Something went wrong.');
        return;
      }

      setNotice('');
      if (reply.code) {
        history.replaceState(null, '', `?room=${reply.code}`);
        setRoomCode(reply.code);
      }

      onSuccess?.(reply);
    });
  };

  const handleAck = (reply) => {
    if (!reply?.ok) {
      setNotice(reply?.error || 'Something went wrong.');
      return;
    }

    setNotice('');
    if (reply.code) history.replaceState(null, '', `?room=${reply.code}`);
  };

  const createRoom = (overrides = {}) => {
    localStorage.setItem('playerName', name);
    emitWithAck('create_room', { hostName: name, settings: { ...settings, ...overrides } });
  };

  const joinRoom = (target = roomCode) => {
    localStorage.setItem('playerName', name);
    emitWithAck('join_room', { roomId: target, playerName: name });
  };

  const startGame = () => {
    emitWithAck('start_game', {}, () => {
      setNotice('Game started!');
    });
  };

  const currentRoomCode = state?.code || roomCode;
  const roomLink = currentRoomCode ? `${window.location.origin}?room=${currentRoomCode}` : '';

  if (!state) {
    return (
      <EntryScreen
        name={name}
        notice={notice}
        roomCode={roomCode}
        settings={settings}
        connected={connected}
        setName={setName}
        setRoomCode={setRoomCode}
        setSettings={setSettings}
        createRoom={createRoom}
        joinRoom={joinRoom}
      />
    );
  }

  return (
    <GameScreen
      state={state}
      messages={messages}
      notice={notice}
      playerId={socket.id}
      wordOptions={wordOptions}
      roomLink={roomLink}
      startGame={startGame}
    />
  );
}
