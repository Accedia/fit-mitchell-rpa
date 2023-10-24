import React from 'react';

interface DotsProps {
  compact?: boolean;
}

const Dots: React.FC<DotsProps> = ({ compact = false }) => {
  const classes = compact ? 'dot compact' : 'dot';

  return (
    <span>
      <span className={classes} />
      <span className={classes} />
      <span className={classes} />
    </span>
  );
};

export default Dots;
