import React from 'react';

export function RoomSettings({ settings, setSettings }) {
  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  return (
    <div className="settings">
      <label>Players <input type="number" min="2" max="20" value={settings.maxPlayers} onChange={(event) => update('maxPlayers', event.target.value)} /></label>
      <label>Rounds <input type="number" min="2" max="10" value={settings.rounds} onChange={(event) => update('rounds', event.target.value)} /></label>
      <label>Draw time <input type="number" min="15" max="240" value={settings.drawTime} onChange={(event) => update('drawTime', event.target.value)} /></label>
      <label>Words <input type="number" min="1" max="5" value={settings.wordCount} onChange={(event) => update('wordCount', event.target.value)} /></label>
      <label>Hints <input type="number" min="0" max="5" value={settings.hints} onChange={(event) => update('hints', event.target.value)} /></label>
      <label>Word mode
        <select value={settings.wordMode} onChange={(event) => update('wordMode', event.target.value)}>
          <option value="normal">Normal</option>
          <option value="hidden">Hidden</option>
          <option value="combination">Combination</option>
        </select>
      </label>
      <label className="check"><input type="checkbox" checked={!settings.privateRoom} onChange={(event) => update('privateRoom', !event.target.checked)} /> Public room</label>
    </div>
  );
}
