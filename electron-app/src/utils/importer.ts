import { FirebaseService, SessionStatus } from './firebase';
import { ImporterStoppedException } from './importer_stopped_exception';
import { EstimateColumns } from './../constants/estimate_columns';
import { ResponseData } from './../interfaces/ResponseData';
import fs from 'fs';
// import {
//   Key,
//   keyboard,
//   mouse,
//   screen,
//   centerOf,
//   Point,
//   Region,
//   getActiveWindow,
//   sleep,
// } from '';
import { BrowserWindow, clipboard } from 'electron';
import { getInputSpeed, mainWindowManager } from '../main';
import { MESSAGE } from '../constants/messages';
import { getInputSpeedInSeconds } from './get_config_values';
import { snooze } from './snooze';
import { Forgettable } from '../interfaces/Forgettable';
import { times } from './times_do';
import log from 'electron-log';
import path from 'path';
import { showMessage } from './show_message';
import { VERIFICATION_PROGRESS_BREAKPOINT } from '../constants/verification_progress_breakpoint';
import { isDev } from './is_dev';
import ProgressUpdater from './progress_updater';
import { getPartNumTabIndex, getPartTypeOptionIndex, getPartTypeTabIndex } from './part_type_utils';
import axios from 'axios';
import {
  Region, Key,
  keyboard,
  mouse,
  screen,
  centerOf,
  Point,
  getActiveWindow,
  sleep,
} from 'test-fork-nutjs';

export interface ImageSearchResult {
  coordinates: Region | null;
  errors: string[];
}

export interface FocusTableOptions {
  returnToPosition?: boolean;
  yOffset?: number;
}

export class Importer {
  private _isRunning = false;
  private _lastLineNumber: number;
  public progressUpdater = new ProgressUpdater();

  get isRunning(): boolean {
    return this._isRunning;
  }

  public setConfig = (inputSpeed: number) => {
    /** Delay between different instructions (e.g. pressKey() and consequential pressKey()) */
    keyboard.config.autoDelayMs = inputSpeed ** 2;
    /** Delay between keystrokes when typing a word (e.g. calling keyboard.type(), time between each letter keypress). */
    keyboard['nativeAdapter'].keyboard.setKeyboardDelay(inputSpeed * 50);
    /** Path with the assets, where we put images for "Line operation" button image-recognition */
    screen.config.resourceDirectory = this.getAssetsPath();

    // ! Left only for debug purposes
    // ? Uncomment if needed, do not deploy to prod
    screen.config.confidence = 0.84;
    // screen.config.autoHighlight = true;
    // screen.config.highlightDurationMs = 3000;
    // screen.config.highlightOpacity = 0.8;
  };

  public startSession = (sessionId: string) => {
    FirebaseService.useCurrentSession.set(sessionId);
    FirebaseService.subscribe(sessionId, ({ status }) => {
      if (status === SessionStatus.STOPPED) {
        this.stop();
        mainWindowManager.mainWindow.webContents.send(MESSAGE.STOP_IMPORTER_SHORTCUT);
      }
    });
  };

  public start = () => {
    this._isRunning = true;
  };

  public stop = () => {
    FirebaseService.useCurrentSession.setStatus(SessionStatus.STOPPED);
    FirebaseService.unsubscribe();
    FirebaseService.useCurrentSession.remove();
    FirebaseService.useCurrentSession.unset();
    this._isRunning = false;
  };

  public complete = async (automationIdToFinishRPA: string, url?: string) => {
    await this.finishImport(automationIdToFinishRPA, url);
    FirebaseService.useCurrentSession.setStatus(SessionStatus.COMPLETED);
    FirebaseService.unsubscribe();
    FirebaseService.useCurrentSession.remove();
    FirebaseService.useCurrentSession.unset();
    this._isRunning = false;
  };

  public abort = async (automationIdToFinishRPA: string, url?: string) => {
    await this.abortImport(automationIdToFinishRPA, url);
    FirebaseService.useCurrentSession.setStatus(SessionStatus.COMPLETED);
    FirebaseService.unsubscribe();
    FirebaseService.useCurrentSession.remove();
    FirebaseService.useCurrentSession.unset();
    this._isRunning = false;
  };

  public setProgressBrowserWindow = (electronWindow: BrowserWindow) => {
    this.progressUpdater.setElectronWindow(electronWindow);
  };

  public startPopulation = async (data: ResponseData, electronWindow: BrowserWindow, url?: string) => {
    const { forgettables, automationId, automationIdToFinishRPA } = data;

    this.startSession(automationId);

    this.start();
    const inputSpeed = getInputSpeed();
    const inputSpeedSeconds = getInputSpeedInSeconds(inputSpeed);
    this.setConfig(inputSpeedSeconds);

    try {
      /** Sends a message to stop the loader for fetching data */
      electronWindow.webContents.send(MESSAGE.LOADING_UPDATE, false);

      if (this.isRunning) {
        /** Start the CCC Waiting loader */
        electronWindow.webContents.send(MESSAGE.WAITING_CCC_UPDATE, true);
        await FirebaseService.useCurrentSession.setStatus(SessionStatus.SEARCHING_CCC);

        /** Continuously check for "Line Operations" button */
        const lineOperationCoordinates = await this.getLineOperationCoordinates(electronWindow);

        if (lineOperationCoordinates) {
          /** Check if the CCC window's title corresponds to the selected RO */
          const shouldPopulate = await this.getShouldPopulate(lineOperationCoordinates, data, electronWindow);

          /** Stop the CCC Waiting loader */
          // electronWindow.webContents.send(MESSAGE.WAITING_CCC_UPDATE, false);

          // if (shouldPopulate) {
          //   /** Start population */
          //   await FirebaseService.useCurrentSession.setStatus(SessionStatus.POPULATING);
          //   this.progressUpdater.setPercentage(0);
          //   mainWindowManager.overlayWindow.show();
          //   await snooze(1000);
          //   await this.focusCccTable(lineOperationCoordinates, { yOffset: 250 });
          //   await snooze(100);
          //   await this.saveLastLineNumber();
          //   await this.goToTheFirstCell();
          //   await this.populateTableData(forgettables, lineOperationCoordinates);
          //   await FirebaseService.useCurrentSession.setStatus(SessionStatus.VALIDATING);
          //   await this.verifyPopulation(forgettables);
          // } else {
          //   electronWindow.webContents.send(MESSAGE.RESET_CONTROLS_STATE, false);
          // }

          await FirebaseService.useCurrentSession.setStatus(SessionStatus.COMPLETED);
          this.complete(automationIdToFinishRPA);
        }
      }

      mainWindowManager.overlayWindow.hide();
      electronWindow.setAlwaysOnTop(false);
    } catch (e) {
      if (e instanceof ImporterStoppedException) {
        mainWindowManager.overlayWindow.hide();
      } else {
        log.error('Error populating the data', e);
        electronWindow.webContents.send(MESSAGE.ERROR, e.message);
      }
    }
  };

  private getLineOperationCoordinates = async (electronWindow: BrowserWindow): Promise<Point> => {
    const lineOperationCoordinates = await this.checkForLineOperationCoordinates();

    if (lineOperationCoordinates) {
      return lineOperationCoordinates;
    } else if (this.isRunning) {
      snooze(1000);
      log.warn('Still searching for CCC on the main screen. Retrying...');
      return this.getLineOperationCoordinates(electronWindow);
    }
  };

  private getAssetsPath = () => {
    return path.resolve(__dirname, '../../assets/line-operation');
  };

  private checkForLineOperationCoordinates = async (): Promise<Point> => {
    const images = fs.readdirSync(this.getAssetsPath());
    const result: ImageSearchResult = {
      coordinates: null,
      errors: [],
    };

    for (let i = 0; i < images.length; i++) {
      const name = images[i];

      try {
        const coordinates = await screen.find(name);
        result.coordinates = coordinates;
        break;
      } catch (err) {
        result.errors.push(err);
      }
    }

    if (result.coordinates) {
      return await centerOf(result.coordinates);
    } else {
      result.errors.forEach((error) => log.warn('Error finding the Line Operation button', error));
    }
  };

  public finishImport = async (automationIdToFinishRPA: string, url?: string) => {
    console.log(url, 'This is the URL before using it for post to finish');
    let urlToFinishRPA = url.includes('localhost') || url.includes('[::1]')
      ? `http://[::1]:4002/api/finishAutomation/${automationIdToFinishRPA}`
      : url.includes('dev')
        ? `https://dev.fit-portal.com/api/finishAutomation/${automationIdToFinishRPA}`
        : `https://fit-portal.com/api/finishAutomation/${automationIdToFinishRPA}`;
    urlToFinishRPA = urlToFinishRPA.replace('localhost', '[::1]');
    log.info('This is the URL we make post request to finish automation', urlToFinishRPA)
    await axios.post(urlToFinishRPA);
  };

  public abortImport = async (automationIdToFinishRPA: string, url?: string) => {
    console.log(url, 'This is the URL before using it for post to abort');
    let urlToFinishRPA = url.includes('localhost') || url.includes('[::1]')
      ? `http://[::1]:4002/api/abortAutomation/${automationIdToFinishRPA}`
      : url.includes('dev')
        ? `https://dev.fit-portal.com/api/abortAutomation/${automationIdToFinishRPA}`
        : `https://fit-portal.com/api/abortAutomation/${automationIdToFinishRPA}`;
    urlToFinishRPA = urlToFinishRPA.replace('localhost', '[::1]');
    log.info('This is the URL we make post request to abort automation', urlToFinishRPA)
    await axios.post(urlToFinishRPA);
  };

  private focusCccTable = async (
    lineOperationCoordinates: Point,
    { returnToPosition = false, yOffset = 200 }: FocusTableOptions
  ) => {
    const prevPosition = await mouse.getPosition();
    await this.moveToPosition(lineOperationCoordinates.x, lineOperationCoordinates.y + yOffset);
    await mouse.leftClick();

    if (returnToPosition) {
      await this.moveToPosition(prevPosition.x, prevPosition.y);
    }
  };

  public moveToPosition = async (x: number, y: number) => {
    const coordinates = new Point(x, y);
    await mouse.setPosition(coordinates);
  };

  private goToTheFirstCell = async () => {
    await keyboard.pressKey(Key.LeftControl, Key.Left);
    await keyboard.pressKey(Key.LeftControl, Key.Down);
    await keyboard.releaseKey(Key.LeftControl);
  };

  private populateModalData = async (forgettable: Forgettable) => {
    const { partNum, lineNote, oper, partType } = forgettable;

    /** Prepare for modal */

    /** Left-click. Mouse should already be in position to click the "Line operations button" */
    // ---------------------------------------------------
    await mouse.leftClick();
    await snooze(500);
    // ---------------------------------------------------

    this.stopCheckPoint();

    /** Click "Edit-Line" from the dropdown (first item) */
    // ---------------------------------------------------
    await keyboard.pressKey(Key.Down);
    await keyboard.pressKey(Key.Enter);
    // ---------------------------------------------------

    this.stopCheckPoint();

    /** MODAL IS OPENED AT THIS POINT, AT THE INITIAL POSITION */

    /** Navigate to the part type field, with Tab click amount depending on oper */
    // ---------------------------------------------------
    const partTypeTabIndex = getPartTypeTabIndex(oper);
    await times(partTypeTabIndex).pressKey(Key.Tab);
    // ---------------------------------------------------

    this.stopCheckPoint();

    /** Select the appropriate partType from the drop down */
    // ---------------------------------------------------
    const partTypeOptionIndex = getPartTypeOptionIndex(partType);
    await times(partTypeOptionIndex).pressKey(Key.Up);
    // ---------------------------------------------------

    this.stopCheckPoint();

    /**
     * Part Number field is on different position depending on the operation
     * partNumTabIndex is set depending on the oper so its always in the correct spot
     */
    // ---------------------------------------------------
    const partNumTabIndex = getPartNumTabIndex(oper) - 2;
    if (partNum && partNumTabIndex > 0) {
      await times(partNumTabIndex).pressKey(Key.Tab);
      await keyboard.type(partNum);
    }
    // ---------------------------------------------------

    this.stopCheckPoint();

    /** Navigate to the Line notes tab & enter line note */
    // ---------------------------------------------------
    await times(2).do(async () => {
      await keyboard.pressKey(Key.LeftControl, Key.Tab);
      await keyboard.releaseKey(Key.LeftControl);
    });

    await keyboard.pressKey(Key.Tab);

    this.stopCheckPoint();

    if (lineNote) {
      await keyboard.type(lineNote);
    }
    // ---------------------------------------------------

    this.stopCheckPoint();

    /** Navigate to the next tab. Using SHIFT + TAB, because of predefined notes which take
     *  the forward-tabs and can be of unknown length. So we tab backwards which is always constant.
     */
    // ---------------------------------------------------
    await keyboard.pressKey(Key.LeftShift);
    await times(3).pressKey(Key.Tab);
    await keyboard.releaseKey(Key.LeftShift);
    await keyboard.pressKey(Key.Enter);
    // ---------------------------------------------------

    this.stopCheckPoint();

    if (lineNote || partNum) {
      await times(3).pressKey(Key.Tab);
    }
  };

  private populateTableData = async (forgettables: Forgettable[], lineOperationCoordinates: Point) => {
    const numberOfCells = forgettables.length * 15;
    const percentagePerCell = VERIFICATION_PROGRESS_BREAKPOINT / numberOfCells;
    this.progressUpdater.setStep(percentagePerCell);

    for (const forgettable of forgettables) {
      const rowData = forgettable.rowData;

      for (let column = 0; column <= EstimateColumns.PRICE; column++) {
        this.stopCheckPoint();
        const value = rowData[column];

        /** type value and go to next cell */
        await this.typeValue(value);
        await keyboard.pressKey(Key.Tab);

        /** Open the line operations modal and populate the required data */
        this.stopCheckPoint();
        if (column === EstimateColumns.DESCRIPTION) {
          await mouse.setPosition(lineOperationCoordinates);
          await this.populateModalData(forgettable);
        }

        /**
         * Needed because sometimes CCC will display an error
         * that the sum is over a certain threshold which blocks the execution.
         *
         * This closes the potential warning message and places the input on the last cell.
         */
        this.stopCheckPoint();
        if (column === EstimateColumns.PRICE) {
          await keyboard.pressKey(Key.Tab);
          await keyboard.pressKey(Key.Enter);
          await keyboard.pressKey(Key.End);
        }

        this.progressUpdater.update();
      }

      /**
       * Continue from the last input cell backwards &
       * enter the remaining values
       */
      for (let column = EstimateColumns.PAINT; column >= EstimateColumns.LABOR; column--) {
        this.stopCheckPoint();
        const value = rowData[column];
        await this.typeValue(value);
        await keyboard.pressKey(Key.Left);

        this.progressUpdater.update();
      }

      /** Continue with next line */
      this.stopCheckPoint();
      await keyboard.pressKey(Key.Down);
      await keyboard.pressKey(Key.Home);
    }
  };

  private typeValue = async (value: string) => {
    if (value) {
      await keyboard.type(value);
    }
  };

  private checkIsCccOnFocus = async (
    electronWindow: BrowserWindow,
    orderData: Omit<ResponseData, 'forgettables' | 'automationId'>
  ): Promise<boolean> => {
    const activeWindow = await getActiveWindow();
    console.log('activeWindow', activeWindow);

    const title = await activeWindow.title;
    console.log('title', title);

    const includesOrderNumber = title.includes(orderData.orderNumber);
    const includesCustomerName = title.includes(orderData.orderCustomerName);

    if (!includesOrderNumber && !includesCustomerName) {
      log.info(`Number or customer name not present in window's title`);

      const result = await showMessage({
        type: 'warning',
        buttons: ['Yes, continue', 'Abort'],
        title: 'Warning',
        message: 'CCC estimate may not correspond to the selected RO',
        detail: `The CCC Estimate and the scrubbed estimate (${orderData.orderNumber}) do not match. Do you want to continue?`,
        noLink: true,
      });

      if (result.response === 1) {
        electronWindow.webContents.send(MESSAGE.STOP_IMPORTER_SHORTCUT);
        return false;
      }
    }

    return true;
  };

  private verifyPopulation = async (forgettables: Forgettable[]) => {
    const lastLineNumberAfterImport = await this.getLastLineNumber();
    const expectedLineNumber = this._lastLineNumber + forgettables.length;

    this.progressUpdater.setPercentage(100);

    if (lastLineNumberAfterImport === expectedLineNumber) {
      return true;
    } else {
      mainWindowManager.overlayWindow.hide();

      log.warn(
        `Population not successful: The last line number was ${lastLineNumberAfterImport} and the expected value was ${expectedLineNumber}`
      );

      await showMessage({
        type: 'warning',
        buttons: ['OK'],
        title: 'Warning',
        message: 'Import might not have been successful',
        detail: `The program detected that there might have been an issue during force import and some lines may be missing. Please verify.`,
        noLink: true,
      });
      return false;
    }
  };

  /**
   * Checks if the import process is still running
   * and if not throws exception to stop the function
   * execution immediately
   */
  private stopCheckPoint = () => {
    if (!this.isRunning) {
      throw new ImporterStoppedException();
    }
  };

  /**
   * ! For DEBUG purposes only:
   * Stops the execution immediately.
   */
  private DEBUG_stopExecution = () => {
    if (!isDev()) return;

    throw new ImporterStoppedException();
  };

  private getLastLineNumber = async () => {
    await this.goToTheFirstCell();
    await times(5).pressKey(Key.Tab);
    await keyboard.pressKey(Key.Up);

    this.stopCheckPoint();

    await this.pressCtrlC();
    const copiedText = this.getTextFromClipboard();

    log.info(`Last line number is ${copiedText}, int: (${parseInt(copiedText)})`);

    return parseInt(copiedText);
  };

  private saveLastLineNumber = async () => {
    this._lastLineNumber = await this.getLastLineNumber();
  };

  private pressCtrlC = async () => {
    await keyboard.pressKey(Key.LeftControl, Key.C);
    await keyboard.releaseKey(Key.LeftControl, Key.C);

    /**
     * Needed because CTRL + C locks the clipboard process
     * and if tried to be accessed too quickly an error is thrown
     */
    await sleep(700);
  };

  private getTextFromClipboard = () => {
    return (
      clipboard
        .readHTML()
        // Since we copy from a table, we get HTML in the clipboard -> Remove HTML tags
        .replace(/(<([^>]+)>)/gi, '')
        // Remove whitespace characters
        .replace(/\s/g, '')
    );
  };

  private getShouldPopulate = async (
    lineOperationCoordinates: Point,
    data: ResponseData,
    electronWindow: BrowserWindow
  ): Promise<boolean> => {
    // if (isDev()) return true;

    const { orderCustomerName, orderNumber } = data;

    await this.focusCccTable(lineOperationCoordinates, { returnToPosition: true });

    return this.checkIsCccOnFocus(electronWindow, {
      orderCustomerName,
      orderNumber,
    });
  };
}

export default new Importer();
