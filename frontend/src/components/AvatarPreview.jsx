import React from 'react';

export function AvatarPreview({ name }) {
  return (
    <div className="avatar-stage">
      <button className="arrow-button" aria-label="Previous avatar">{'<'}</button>
      <div className="avatar avatar-big">
        <span>{name.slice(0, 1).toUpperCase()}</span>
      </div>
      <button className="arrow-button" aria-label="Next avatar">{'>'}</button>
      <button className="dice-button" aria-label="Random avatar">[]</button>
    </div>
  );
}
