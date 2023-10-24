import { MESSAGE } from '../constants/messages';
import { BrowserWindow } from 'electron';

export const sendError = (window: BrowserWindow, message: string): void => {
  window.webContents.send(MESSAGE.ERROR, message);
};
