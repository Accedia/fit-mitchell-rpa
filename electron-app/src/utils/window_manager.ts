import { isAppDev, isDev } from './is_dev';
import { app, BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { getCustomProtocolUrl } from './get_custom_protocol_url';
import { fetchDataAndStartImporter } from '../main';
import { WINDOW_CONFIG } from '../config/window_config';
import { MESSAGE, APP_STATE } from '../constants/messages';
import { AutoUpdater } from './auto_updater';
import importer from './importer';
import { FirebaseService } from './firebase';
import { extractSessionIdFromUrl } from './extract_sessionid_from_url';
import mitchell_importer from './mitchell_importer';
import log from 'electron-log';

type MaybeBrowserWindow = BrowserWindow | null;

class WindowManager {
  mainWindow: MaybeBrowserWindow;
  loadingWindow: MaybeBrowserWindow;
  overlayWindow: MaybeBrowserWindow;
  manualWindow: MaybeBrowserWindow;

  private devUrl = 'http://localhost:3000';
  private prodUrl = path.resolve(__dirname, '../../build/index.html');
  private paths = {
    loading: '/loading',
    blockOverlay: '/block-overlay',
    manual: '/manual',
  };

  constructor() {
    this.mainWindow = null;
    this.loadingWindow = null;
  }

  private loadContent = (window: BrowserWindow, path?: string) => {
    if (isDev()) {
      let url = this.devUrl;
      if (path) {
        url += `#${path}`;
      }

      window.loadURL(url);
    } else {
      const options: Electron.LoadFileOptions = {};
      if (path) {
        options.hash = path;
      }

      window.loadFile(this.prodUrl, options);
    }
  };

  private loadLoadingWindowContent = () => {
    if (isDev()) {
      this.loadingWindow.loadURL(`${this.devUrl}#${this.paths.loading}`);
    } else {

      this.loadingWindow.loadFile(this.prodUrl, {
        hash: this.paths.loading,
      });
    }
  };

  public startLoading = (): void => {
    this.loadingWindow = new BrowserWindow(WINDOW_CONFIG.loading);
    this.loadLoadingWindowContent();
    this.loadingWindow.once('show', async () => {
      log.info('in the .once `show` function')
      const url = getCustomProtocolUrl(process.argv);
      log.info('this are the process.argv', + ' ', process.argv)
      log.info('The url at line 71 in the startLoading', url);
      if (url) {
        const sessionId = extractSessionIdFromUrl(url);
        FirebaseService.useCurrentSession.set(sessionId);
      }

      if (!isAppDev(app) && !isDev()) {
        const autoUpdater = new AutoUpdater(this.loadingWindow);
        log.info('Here in the if check about !isDev() and awaiting the checkAndDownloadUpdates function');
        await autoUpdater.checkAndDownloadUpdates(url);
      }
      log.info('Outside the If check next command is awaiting the startApp')
      await this.startApp();
    });
    this.loadingWindow.on('ready-to-show', this.loadingWindow.show);
  };


  public startApp = async (): Promise<void> => {
    await this.createMainWindow();
    // what if we dont have url cant we just re-run startLoading so we can get the url from it
    if (process.platform !== 'darwin') {
      const storedUrl = localStorage.getItem('url');
      const url = storedUrl ? storedUrl : getCustomProtocolUrl(process.argv);
      log.info("This is the url at line 91 in startApp", url);
      // since the updates make the app quit and re-open we don't get the url here it is undefined
      log.info('this is the url after update preserved in local storage', storedUrl);

      if (url) {
        /**
         * If the app has been opened by pressing the "Commit" button in REV
         * without the app being opened before that
         */
        log.info('In start app function before awaiting fetchDataAndStartImporter');
        await fetchDataAndStartImporter(url);
      }
    }
  };

  public createMainWindow = (): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      this.mainWindow = new BrowserWindow(WINDOW_CONFIG.main);
      this.createBlockOverlayWindow();
      this.mainWindow.once('ready-to-show', () => {
        this.mainWindow.show();
        importer.setProgressBrowserWindow(this.mainWindow);
        //We set also for the mitchell importer a browser window
        mitchell_importer.setProgressBrowserWindow(this.mainWindow);
        this.loadingWindow.hide();
        this.loadingWindow.close();

        resolve();
      });
      this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        reject(`Failed to load window: ${errorDescription}`);
      });
      this.mainWindow.on('close', () => {
        importer.stop();
        mitchell_importer.stop();
        this.overlayWindow.close();
        app.quit();
      });
      if (isDev()) {
        this.mainWindow.loadURL(this.devUrl);
      } else {
        this.mainWindow.loadFile(this.prodUrl);
      }

    });
  };

  public createBlockOverlayWindow = (): void => {
    this.overlayWindow = new BrowserWindow(WINDOW_CONFIG.blockOverlay);
    this.loadContent(this.overlayWindow, this.paths.blockOverlay);
    this.overlayWindow.on('ready-to-show', () => {
      this.overlayWindow.setIgnoreMouseEvents(true);
      this.overlayWindow.setAlwaysOnTop(true);
    });
    this.overlayWindow.hide();
  };

  public putWindowOnTop = (window: BrowserWindow): void => {
    const display = screen.getPrimaryDisplay();
    const [windowWidth] = window.getSize();

    window.setAlwaysOnTop(true);
    window.setPosition(display.bounds.width - windowWidth - 20, 20);
  };

  public appStateUpdate = (newState: keyof typeof APP_STATE): void => {
    this.mainWindow.webContents.send(MESSAGE.UPDATE_APP_STATE, newState);
  };

  public openManual = () => {
    this.manualWindow = new BrowserWindow(WINDOW_CONFIG.manual);
    this.loadContent(this.manualWindow, this.paths.manual);
    this.manualWindow.on('ready-to-show', this.manualWindow.show);
  };
}

export default WindowManager;
