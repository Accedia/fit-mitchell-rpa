import { MESSAGE } from './../constants/messages';
import { BrowserWindow } from 'electron';

class ProgressUpdater {
  private currentProgress = 0;
  private step = 0;
  private electronWindow: BrowserWindow;

  public setStep = (step: number): this => {
    this.step = step;
    return this;
  };

  public setElectronWindow = (electronWindow: BrowserWindow): this => {
    this.electronWindow = electronWindow;
    return this;
  };

  public update = (): this => {
    this.currentProgress += this.step;
    this.sendMessage();
    return this;
  };

  public setPercentage = (percentage: number): this => {
    this.currentProgress = percentage;
    this.sendMessage();
    return this;
  };

  private sendMessage = () => {
    this.electronWindow.webContents.send(MESSAGE.PROGRESS_UPDATE, this.currentProgress);
  };
}

export default ProgressUpdater;
