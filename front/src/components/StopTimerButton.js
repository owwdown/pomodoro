import React from 'react';
import './StopTimerButton.css';

const StopTimerButton = ({ onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="stop-btn"
    >
      СТОП
    </button>
  );
};

export default StopTimerButton;