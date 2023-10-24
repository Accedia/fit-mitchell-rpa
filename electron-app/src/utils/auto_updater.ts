import { snooze } from './snooze';
import { MESSAGE } from './../constants/messages';
import { Endpoints } from '@octokit/types';
import { app, autoUpdater, dialog, MessageBoxOptions, shell, BrowserWindow } from 'electron';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import * as stream from 'stream';
import { promisify } from 'util';
import { AppState } from '../interfaces/AppState';
import log from 'electron-log';
import { FirebaseService, SessionStatus } from './firebase';

type LatestRelease = Endpoints['GET /repos/{owner}/{repo}/releases/latest']['response']['data'];

export class AutoUpdater {
  private window: BrowserWindow;
  public currentVersion: string;
  public latestVersion: string;
  public tempDir: string;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.tempDir = '';
    this.currentVersion = app.getVersion();
    this.latestVersion = app.getVersion(); // will be overwritten later

    this.makeTempDir();
  }

  public checkAndDownloadUpdates = async () => {
    this.sendUpdate('Checking for updates');
    const { version, assets } = await this.getLatestVersion();
    const latestVersion = version.replace(/v/, '');

    const shouldUpdate = this.isUpdateAvailable(app.getVersion(), latestVersion);
    if (!shouldUpdate) {
      this.sendUpdate('No updates found');
      return false;
    }

    FirebaseService.useCurrentSession.setStatus(SessionStatus.UPDATE_NEEDED);

    this.sendUpdate('Downloading update');
    this.sendAction('downloading');

    const releases = assets.find((asset) => asset.type === null);
    const nupkg = assets.find((asset) => asset.type === 'nupkg');

    this.checkAndShowDownloadProgress(nupkg.name, nupkg.size);
    FirebaseService.useCurrentSession.setStatus(SessionStatus.UPDATING);

    await Promise.all([
      this.download(releases.name, releases.download_url),
      this.download(nupkg.name, nupkg.download_url),
    ]);

    this.sendAction('installing');

    try {
      await this.applyUpdates();
    } catch (e) {
      log.error('Error applying the updates', e);
      app.quit();
    }

    return true;
  };

  private isUpdateAvailable = (appVersion: string, latestVersion: string) => {
    const [appMajor, appMinor, appPatch] = appVersion.split('.').map((v) => parseInt(v));
    const [latestMajor, latestMinor, latestPatch] = latestVersion.split('.').map((v) => parseInt(v));

    if (appMajor < latestMajor) return true;
    if (appMajor === latestMajor && appMinor < latestMinor) return true;
    if (appMajor === latestMajor && appMinor === latestMinor && appPatch < latestPatch) return true;
    return false;
  };

  private getLatestVersion = async () => {
    const response = await axios.get<LatestRelease>(
      'https://api.github.com/repos/Accedia/force-import-technology/releases/latest'
    );

    const assets = response.data.assets.map((asset) => ({
      url: asset.url,
      name: asset.name,
      type: this.getExtension(asset.name),
      download_url: asset.browser_download_url,
      size: asset.size,
    }));

    const latestRelease = {
      version: response.data.tag_name,
      assets,
    };

    return latestRelease;
  };

  private getExtension = (name: string): string | null => {
    if (!name.includes('.')) {
      return null;
    }

    const nameParts = name.split('.');
    return nameParts[nameParts.length - 1];
  };

  private checkAndShowDownloadProgress = (name: string, size: number) => {
    const timeout = setInterval(() => {
      const filePath = `${this.tempDir}/${name}`;
      const stats = fs.statSync(filePath);
      const fileSizeInBytes = stats.size;
      const progress = (fileSizeInBytes / size) * 100;
      this.window.webContents.send(MESSAGE.LOADER_PROGRESS, progress);
      if (progress >= 98) clearTimeout(timeout);
    }, 150);
  };

  private download = async (name: string, url: string) => {
    const finished = promisify(stream.finished);
    const filePath = `${this.tempDir}/${name}`;
    const writer = fs.createWriteStream(filePath, { flags: 'w+' });

    const response = await axios.get(url, { responseType: 'stream' });
    response.data.pipe(writer);

    return finished(writer);
  };

  private makeTempDir = () => {
    this.tempDir = path.join(app.getPath('temp'), 'NTWRK');
    if (!fs.existsSync(this.tempDir)) fs.mkdirSync(this.tempDir);
  };

  private sendUpdate = (update: string) => {
    this.window.webContents.send(MESSAGE.LOADER_CHECK_UPDATE_STATUS, update);
  };
  private sendAction = (action: AppState) => {
    this.window.webContents.send(MESSAGE.LOADER_ACTION_REQUIRED, action);
  };

  private applyUpdates = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      autoUpdater.on('checking-for-update', () => {
        // Nothing happens here, but can happen...
      });

      autoUpdater.on('error', (error: any) => {
        log.error(error);
        this.sendUpdate('Something went wrong, please restart');
        this.window.webContents.send(MESSAGE.LOADER_ACTION_REQUIRED, 'error');
        this.window.show();

        shell.beep();
        const dialogOpts: MessageBoxOptions = {
          type: 'error',
          buttons: ['Close'],
          title: 'Application Update',
          message: 'Error updating the application',
          detail: `Please report this issue to FIT. \n\n ${error}`,
        };

        dialog.showMessageBox(dialogOpts);
      });

      autoUpdater.on('update-available', () => {
        this.sendUpdate('Installing');
      });

      autoUpdater.on('update-downloaded', () => {
        this.sendUpdate('Restarting to apply updates');
        this.sendAction('complete');
        shell.beep();

        setTimeout(() => {
          FirebaseService.useCurrentSession.setStatus(SessionStatus.UPDATE_COMPLETED);
        }, 1500);

        setTimeout(() => {
          autoUpdater.quitAndInstall();
        }, 3000);
      });

      autoUpdater.on('update-not-available', () => {
        this.sendUpdate('Update not available');
        resolve();
      });

      autoUpdater.setFeedURL({ url: this.tempDir });
      autoUpdater.checkForUpdates();
    });
  };
}
