import React from 'react';

export function Logo({ large = false }) {
  const letters = ['s', 'k', 'r', 'i', 'b', 'b', 'l'];

  return (
    <div className={large ? 'logo logo-large' : 'logo'} aria-label="skribbl clone">
      {letters.map((letter, index) => <span key={`${letter}-${index}`}>{letter}</span>)}
      <strong>.io</strong>
      <i />
    </div>
  );
}
