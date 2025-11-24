import React from 'react';
import './StartTimerButton.css';

const StartTimerButton = ({ onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="start-btn"
    >
      СТАРТ
    </button>
  );
};

export default StartTimerButton;