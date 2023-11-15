import { ResponseData } from './interfaces/ResponseData';
import { app, globalShortcut, ipcMain } from 'electron';
import WindowManager from './utils/window_manager';
import importer from './utils/importer';
import { MESSAGE } from './constants/messages';
import path from 'path';
import axios from 'axios';
import { CUSTOM_PROTOCOL } from './constants/config';
import Store from 'electron-store';
import { InputSpeed } from './interfaces/InputSpeed';
import { getCustomProtocolUrl } from './utils/get_custom_protocol_url';
import { isAppDev, isDev } from './utils/is_dev';
import log from 'electron-log';
import { FirebaseService, SessionStatus } from './utils/firebase';
import mitchell_importer from './utils/mitchell_importer';

const INPUT_SPEED_STORAGE_KEY = 'inputSpeed';

if (isDev() && isAppDev(app)) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('source-map-support').install();
}

/** If there is no squirrel quit the app (usually during installation, to prevent 2 running instances) */
if (require('electron-squirrel-startup')) app.quit();

class Main {
  windowManager = new WindowManager();
  store = new Store();
  finalUrl = '';
  automationIdToFinishRPA = '';
  constructor() {
    app.on('ready', this.windowManager.startLoading);
    this.finalUrl = '';
    this.registerCustomProtocol();
    this.createSingleInstanceLock();
    this.registerMainListeners();
    this.registerKeyboardShortcuts();
  }

  private registerCustomProtocol = () => {
    app.removeAsDefaultProtocolClient(CUSTOM_PROTOCOL);

    /** The extra two parameters are required for windows development version */
    if (isAppDev(app) && process.platform === 'win32') {
      app.setAsDefaultProtocolClient(CUSTOM_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    } else {
      app.setAsDefaultProtocolClient(CUSTOM_PROTOCOL);
    }
  };

  private createSingleInstanceLock = () => {
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
      app.quit();
    } else {
      // on dev and prod it does not enter here because we dont open a second instance but directly the first
      app.on('second-instance', async (e, argv) => {
        const url = getCustomProtocolUrl(argv);
        if (this.windowManager.mainWindow) {
          /**
           * Enters here when app is opened from the browser
           * after it has been started manually before that
           */
          importer.stop();
          this.windowManager.mainWindow.webContents.send(MESSAGE.RESET_CONTROLS_STATE);
        } else if (url) {
          /**
           * I don't know when we enter here
           */
          log.debug('It seems we need this');
          await this.windowManager.createMainWindow();
        }

        if (url) {
          // ? Is this snooze necessary, check if it causes problems
          // await snooze(1500);
          this.fetchDataAndStartImporter(url);
        }
      });
    }
  };


  private stopMitchell = async () => {
    log.info('In stop mitchell function');
    // In dev we're not getting the finalUrl for some reason
    log.info('Final Protocol URL:', this.finalUrl);
    log.info('Final automationIdToFinishRPA', this.automationIdToFinishRPA)
    await mitchell_importer.abort(this.automationIdToFinishRPA, this.finalUrl)
    app.quit()
  };
  private registerMainListeners = () => {
    ipcMain.on(MESSAGE.STOP_IMPORTER, this.stopMitchell);
    ipcMain.on(MESSAGE.STOP_IMPORTER, importer.stop);
    ipcMain.on(MESSAGE.SET_INPUT_SPEED, this.setInputSpeed);
    ipcMain.on(MESSAGE.CLOSE_APP, app.quit);
    ipcMain.on(MESSAGE.OPEN_MANUAL, this.windowManager.openManual);
  };

  private registerKeyboardShortcuts = () => {
    /**
     * Register keyboards shortcuts
     * F7 -> Stop the importer (same as stop button)
     */
    app.whenReady().then(() => {
      globalShortcut.register('F7', async () => {
        importer.stop();
        mitchell_importer.stop();
        await this.stopMitchell();
        log.info('Force Import stopped manually with shortcut.');
        this.windowManager.mainWindow.webContents.send(MESSAGE.STOP_IMPORTER_SHORTCUT);
        // snooze maybe?
        app.quit();
      });
    });
  };

  private setInputSpeed = (event: any, inputSpeed: string) => {
    this.store.set(INPUT_SPEED_STORAGE_KEY, inputSpeed);
  };

  public getInputSpeed = (): InputSpeed => {
    /**
     * ! DEV ONLY
     * increase input speed to waste less time developing
     */
    if (isAppDev(app)) {
      return 'slow';
    }

    /**
     * There was an option to choose input speed,
     * currently it is disabled and set to the slowest one.
     *
     * Keeping this in case we need to bring back custom speed selection
     *
     * previous value:
     * return this.store.get(INPUT_SPEED_STORAGE_KEY) as InputSpeed;
     */
    return 'extra-slow';
  };

  public fetchDataAndStartImporter = async (url: string) => {
    try {
      log.info(`URL To fetch data received: ${url}`);
      /** Prepare UI for data-fetching */
      this.updateMainWindowStateToFetching();

      /** Fetch the data. Replace localhost with [::1] because otherwise it does not work */
      url = url.replace('localhost', '[::1]');
      const { data } = await axios.get<ResponseData>(url);
      this.automationIdToFinishRPA = data.automationIdToFinishRPA;
      this.finalUrl = url;
      await FirebaseService.setSessionStatus(data.automationId, SessionStatus.APP_STARTED);

      /** Do the population (CCC || Mitchell) */
      if (data.dataSource === 'Mitchell') {
        // await importer.startMitchellPopulation(data, this.windowManager.mainWindow);
        await mitchell_importer.startPopulation(data, this.windowManager.mainWindow, url);
      } else if (data.dataSource === 'CCC') {
        await importer.startPopulation(data, this.windowManager.mainWindow);
      }
    } catch (e) {
      log.error('Error retrieving the forgettables', JSON.stringify(e));
      this.windowManager.mainWindow.webContents.send(MESSAGE.ERROR, `Error: ${e.message}`);
    }
  };

  private updateMainWindowStateToFetching = () => {
    this.windowManager.appStateUpdate('populating');
    this.windowManager.putWindowOnTop(this.windowManager.mainWindow);
    this.windowManager.mainWindow.webContents.send(MESSAGE.LOADING_UPDATE, true);
  };
}

const main = new Main();

export const getInputSpeed = main.getInputSpeed;
export const fetchDataAndStartImporter = main.fetchDataAndStartImporter;
export const mainWindowManager = main.windowManager;
