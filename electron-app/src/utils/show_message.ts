import { BrowserWindow, dialog, MessageBoxOptions } from 'electron';

export const showMessage = async (dialogOptions: MessageBoxOptions) => {
  const dialogOpts: MessageBoxOptions = dialogOptions;

  const dialogWindow = new BrowserWindow({
    show: false,
    alwaysOnTop: true,
  });
  const result = await dialog.showMessageBox(dialogWindow, dialogOpts);
  dialogWindow.destroy();
  return result;
};
