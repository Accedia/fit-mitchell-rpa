import React from 'react';

const BlockOverlay: React.FC = () => {
  return (
    <div className="block-overlay">
      <img src={process.env.PUBLIC_URL + '/block_mouse_animation.svg'} alt="Block-mouse-icon" width="200" />
      <div className="text-container">
        <h1>Do not touch the mouse or keyboard during population!</h1>
        <h2>Doing so may result in errors or wrong values</h2>
      </div>
    </div>
  );
};

export default BlockOverlay;
