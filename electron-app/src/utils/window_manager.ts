import { isAppDev, isDev } from './is_dev';
import { app, BrowserWindow, screen, shell, dialog } from 'electron';
import * as path from 'path';
import { getCustomProtocolUrl } from './get_custom_protocol_url';
import { fetchDataAndStartImporter, store } from '../main';
import { WINDOW_CONFIG } from '../config/window_config';
import { MESSAGE, APP_STATE } from '../constants/messages';
import { AutoUpdater } from './auto_updater';
import importer from './importer';
import { FirebaseService } from './firebase';
import { extractSessionIdFromUrl } from './extract_sessionid_from_url';
import mitchell_importer from './mitchell_importer';
import log from 'electron-log';
import { spawn } from 'child_process';
import * as os from 'os';

const userHomeDir = os.homedir();
const fitMitchellCloudPath = path.join(userHomeDir, 'AppData', 'Local', 'FIT-Mitchell_Cloud', 'FIT.bat');

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
    console.log('starting loading');
    const shouldOpenVBS = process && process.argv.some((url) => url.includes('openVBS'))
    this.loadingWindow = new BrowserWindow({...WINDOW_CONFIG.loading, 
      show: shouldOpenVBS ? false : true
    });
    if(shouldOpenVBS){
      this.loadingWindow.minimize();
    }
    this.loadLoadingWindowContent();
    this.loadingWindow.once('show', async () => {
      console.log('VBS URL', process.argv);
      if (shouldOpenVBS) {
        try {
          const bat = spawn(fitMitchellCloudPath, [], { windowsHide: true });
          bat.on('close', (code) => {
            console.log(`Child process exited with code ${code}`);
            app.quit();
          });
          return;
        } catch (error) {
          dialog.showErrorBox('Error', 'The specified file was not found: C:\\FIT-Mitchell-Cloud-RO-Import-Tool\\FIT.bat');
        }
      }
      log.info('loading has started this is on show');
      const storedUrl = store.get('url') as string | null;
      log.info('storedUrl at line 70,', storedUrl);

      const newStoredUrl = storedUrl?.replace('https//', 'https://') ?? null;
      log.info('new', newStoredUrl);

      const url = newStoredUrl || getCustomProtocolUrl(process.argv);
      log.info('The url at line 71 in the startLoading', url);

      if (url) {
        const sessionId = extractSessionIdFromUrl(url);
        FirebaseService.useCurrentSession.set(sessionId);
      }

      if (!isAppDev(app) && !isDev()) {
        console.log('here in auto updater');
        const autoUpdater = new AutoUpdater(this.loadingWindow);
        await autoUpdater.checkAndDownloadUpdates(url);
      }
      await this.startApp();
    });
    this.loadingWindow.on('ready-to-show', this.loadingWindow.show);
  };

  public startApp = async (): Promise<void> => {
    await this.createMainWindow();
    log.info('VBS URL - 2', process.argv);
    log.info('loading has started this is on show');
    const storedUrl = store.get('url') as string | null;
    log.info('storedUrl at line 70,', storedUrl);

    const newStoredUrl = storedUrl?.replace('https//', 'https://') ?? null;
    log.info('new', newStoredUrl);

    const url = newStoredUrl || getCustomProtocolUrl(process.argv);
    log.info('The url at line 71 in the startLoading', url);
    if (process.platform !== 'darwin') {
      if (url) {
        /**
         * If the app has been opened by pressing the "Commit" button in REV
         * without the app being opened before that
         */
        await fetchDataAndStartImporter(url);
      }
    }
  };

  public createMainWindow = (): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      this.mainWindow = new BrowserWindow(WINDOW_CONFIG.main);
      log.info('In create main window function');
      this.createBlockOverlayWindow();
      this.mainWindow.once('ready-to-show', () => {
        log.info('in main window .once ready-to-show');
        this.mainWindow.show();
        importer.setProgressBrowserWindow(this.mainWindow);
        //We set also for the mitchell importer a browser window
        mitchell_importer.setProgressBrowserWindow(this.mainWindow);
        this.loadingWindow.hide();
        this.loadingWindow.close();

        resolve();
      });
      this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log.info('Failed to load window');
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
    window.setPosition(display.bounds.width - windowWidth - 800, 20);
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
