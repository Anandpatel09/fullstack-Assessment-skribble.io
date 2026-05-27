import React from 'react';
import { AvatarPreview } from './AvatarPreview.jsx';
import { Logo } from './Logo.jsx';
import { RoomSettings } from './RoomSettings.jsx';

export function EntryScreen({
  name,
  notice,
  roomCode,
  settings,
  connected,
  setName,
  setRoomCode,
  setSettings,
  createRoom,
  joinRoom
}) {
  return (
    <main className="entry">
      <section className="entry-panel skribbl-panel">
        <Logo large />
        {!connected && <p className="notice">Connecting to backend on port 4000...</p>}
        <div className="quick-card">
          <div className="entry-fields">
            <input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" />
            <select aria-label="Language" defaultValue="English">
              <option>English</option>
              <option>Hindi</option>
              <option>Spanish</option>
            </select>
          </div>
          <AvatarPreview name={name || 'You'} />
          <button className="play-button" disabled={!connected || !name.trim()} onClick={() => createRoom({ privateRoom: false })}>Play!</button>
          <button className="private-button" disabled={!connected || !name.trim()} onClick={() => createRoom({ privateRoom: true })}>Create Private Room</button>
          <div className="join-row">
            <input value={roomCode} onChange={(event) => setRoomCode(event.target.value)} placeholder="Room code" />
            <button disabled={!connected || !name.trim() || !roomCode.trim()} onClick={() => joinRoom()}>Join</button>
          </div>
        </div>
        <RoomSettings settings={settings} setSettings={setSettings} />
        {notice && <p className="notice">{notice}</p>}
      </section>
    </main>
  );
}
