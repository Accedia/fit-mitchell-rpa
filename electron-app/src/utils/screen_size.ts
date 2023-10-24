import { screen } from 'electron';

export const getScreenSize = () => {
  const displayInfo = screen.getPrimaryDisplay();
  return {
    width: displayInfo.bounds.width,
    height: displayInfo.bounds.height,
  };
};
