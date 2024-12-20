import { FirebaseService, SessionStatus } from './firebase';
import importer, { FocusTableOptions, ImageSearchResult, Importer } from './importer';
import { ImporterStoppedException } from './importer_stopped_exception';
import { ResponseData } from './../interfaces/ResponseData';
import { BrowserWindow } from 'electron';
import { getInputSpeed, mainWindowManager } from '../main';
import { MESSAGE } from '../constants/messages';
import { getInputSpeedInSeconds } from './get_config_values';
import { snooze } from './snooze';
import log from 'electron-log';
import fs from 'fs';
import { screen, centerOf, keyboard, Point, mouse, Key } from 'test-fork-nutjs';
import path from 'path';
import { isDev } from './is_dev';
import { MitchellForgettable } from '../interfaces/Forgettable';
import { times } from './times_do';
import { VERIFICATION_PROGRESS_BREAKPOINT } from '../constants/verification_progress_breakpoint';

enum MitchellButtons {
  commitButton = 'COMMIT',
  manualLineButton = 'Manual Line',
  commitButtonInModal = 'Commit In Modal',
}
export class Mitchell_Importer extends Importer {
  private BUNDLED_QUANTITY: string;
  private BUNDLED_TOTAL_UNITS: string;
  private DEFAULT_QUANTITY: string;
  private BUNDLED_LINE_NOTE: string;
  constructor() {
    super();
    this.BUNDLED_QUANTITY = '1';
    this.BUNDLED_TOTAL_UNITS = '0';
    this.DEFAULT_QUANTITY = '1';
    this.BUNDLED_LINE_NOTE =
      'Shop will provide a zip folder with an itemized invoice along with all supporting documentation.';
  }

  public setMitchellConfig = (
    inputSpeed: number,
    isLookingForCommitButton?: boolean,
    isLookingForCommitBtnInModal?: boolean
  ): void => {
    /** Delay between different instructions (e.g. pressKey() and consequential pressKey()) */
    keyboard.config.autoDelayMs = inputSpeed ** 2;
    /** Delay between keystrokes when typing a word (e.g. calling keyboard.type(), time between each letter keypress). */
    keyboard['nativeAdapter'].keyboard.setKeyboardDelay(inputSpeed * 75);
    /** Path with the assets, where we put images for "Manual Line" button image-recognition */
    screen.config.resourceDirectory = isLookingForCommitButton
      ? this.getMitchellPathForCommitButton()
      : isLookingForCommitBtnInModal
        ? this.getMitchellPathForCommitButtonInModal()
        : this.getMitchellPathForAssets();

    // screen.config.resourceDirectory = isLookingForCommitButton
    //   ? this.getMitchellPathForCommitButton()
    //   : this.getMitchellPathForAssets();

    // ! Left only for debug purposes
    // ? Uncomment if needed, do not deploy to prod
    if (isLookingForCommitButton) {
      screen.config.confidence = 0.96;
    }
    // screen.config.autoHighlight = true;
    // screen.config.highlightDurationMs = 3000;
    // screen.config.highlightOpacity = 0.8;
  };

  public startPopulation = async (
    data: ResponseData,
    electronWindow: BrowserWindow,
    url: string
  ): Promise<void> => {
    const { forgettables, automationId, automationIdToFinishRPA, selectedTypeForCommit } = data;
    this.startSession(automationId);
    this.start();
    const inputSpeed = getInputSpeed();
    const inputSpeedSeconds = getInputSpeedInSeconds(inputSpeed);
    this.setMitchellConfig(inputSpeedSeconds, false);

    try {
      /** Sends a message to stop the loader for fetching data */
      electronWindow.webContents.send(MESSAGE.LOADING_UPDATE, false);

      if (this.isRunning) {
        /** Start the Mitchell Waiting loader */
        electronWindow.webContents.send(MESSAGE.WAITING_MITCHELL_UPDATE, true);
        await FirebaseService.useCurrentSession.setStatus(SessionStatus.SEARCHING_CCC);

        /** Continuously check for "Manual Line" button */
        const manualLineCoordinates = await this.getButtonCoordinates(
          electronWindow,
          MitchellButtons.manualLineButton
        );
        if (manualLineCoordinates) {
          const shouldPopulate = await this.getShouldPopulateData(
            manualLineCoordinates,
            data,
            electronWindow
          );
          //   /** Stop the Mitchell Waiting loader */
          electronWindow.webContents.send(MESSAGE.WAITING_MITCHELL_UPDATE, false);

          if (shouldPopulate) {
            /** Start population */
            await FirebaseService.useCurrentSession.setStatus(SessionStatus.POPULATING);
            this.progressUpdater.setPercentage(0);
            mainWindowManager.overlayWindow.show();
            await snooze(1000);
            await this.populateMitchellTableData(forgettables, selectedTypeForCommit);
            this.setMitchellConfig(inputSpeedSeconds, true);
            await snooze(5000);
            // const commitButtonCoordinates = await this.getButtonCoordinates(
            //   electronWindow,
            //   MitchellButtons.commitButton
            // );

            // if (commitButtonCoordinates) {
            //   await this.commitMitchellData(commitButtonCoordinates, electronWindow);
            //   // await this.commitMitchellData(commitButtonCoordinates);
            // } else {
            //   log.error("Can't find the Commit Button.");
            // }
            this.progressUpdater.setPercentage(100);
            await FirebaseService.useCurrentSession.setStatus(SessionStatus.VALIDATING);
            await FirebaseService.useCurrentSession.setStatus(SessionStatus.COMPLETED);
            this.complete(automationIdToFinishRPA, url);
            // await this.verifyPopulation(forgettables);
          } else {
            electronWindow.webContents.send(MESSAGE.RESET_CONTROLS_STATE, false);
          }
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

  private getMitchellPathForAssets = () => {
    return path.resolve(__dirname, '../../assets/manual-lines');
  };

  private getMitchellPathForCommitButton = () => {
    return path.resolve(__dirname, '../../assets/commit-button');
  };

  private getMitchellPathForCommitButtonInModal = () => {
    return path.resolve(__dirname, '../../assets/commit-button-in-modal');
  };

  private getButtonCoordinates = async (
    electronWindow: BrowserWindow,
    typeButton: MitchellButtons
  ): Promise<Point> => {
    // const buttonCoordinates =
    //   typeButton === MitchellButtons.manualLineButton
    //     ? await this.checkForButtonCoordinates(MitchellButtons.manualLineButton, electronWindow)
    //     : await this.checkForButtonCoordinates(MitchellButtons.commitButton, electronWindow);
    const buttonCoordinates =
      typeButton === MitchellButtons.manualLineButton
        ? await this.checkForButtonCoordinates(MitchellButtons.manualLineButton, electronWindow)
        : typeButton === MitchellButtons.commitButton
          ? await this.checkForButtonCoordinates(MitchellButtons.commitButton, electronWindow)
          : await this.checkForButtonCoordinates(MitchellButtons.commitButtonInModal, electronWindow);
    if (buttonCoordinates) {
      const messageToSendToReact =
        typeButton === MitchellButtons.manualLineButton
          ? MESSAGE.SEARCHING_ADD_LINE_BUTTON
          : MESSAGE.SEARCHING_COMMIT_BUTTON;
      electronWindow.webContents.send(messageToSendToReact, false);
      return buttonCoordinates;
    } else if (this.isRunning) {
      snooze(1000);
      log.warn('Still searching for Mitchell on the main screen. Retrying...');
      return this.getButtonCoordinates(electronWindow, typeButton);
    }
  };

  private checkForButtonCoordinates = async (
    typeButton: MitchellButtons,
    electronWindow: BrowserWindow
  ): Promise<Point> => {
    // const images =
    //   typeButton === MitchellButtons.manualLineButton
    //     ? fs.readdirSync(this.getMitchellPathForAssets())
    //     : fs.readdirSync(this.getMitchellPathForCommitButton());
    const images =
      typeButton === MitchellButtons.manualLineButton
        ? fs.readdirSync(this.getMitchellPathForAssets())
        : typeButton === MitchellButtons.commitButton
          ? fs.readdirSync(this.getMitchellPathForCommitButton())
          : fs.readdirSync(this.getMitchellPathForCommitButtonInModal());
    const result: ImageSearchResult = {
      coordinates: null,
      errors: [],
    };
    let isFound = false;
    let index = 0;
    let foundImage = false;

    do {
      const name = images[index];
      try {
        const coordinates = await screen.find(name);
        result.coordinates = coordinates;
        isFound = true;
        foundImage = true;
      } catch (err) {
        log.warn('here is error', err);
        const messageToSendToReact =
          typeButton === MitchellButtons.manualLineButton
            ? MESSAGE.SEARCHING_ADD_LINE_BUTTON
            : MESSAGE.SEARCHING_COMMIT_BUTTON;
        electronWindow.webContents.send(messageToSendToReact, true);
        result.errors.push(err);
      }

      if (!foundImage && index === images.length - 1) {
        // Reset the index if no image was found in the current iteration
        index = 0;
      } else {
        // Increment the index or reset it if it reaches the end of the array
        if (index < images.length - 1) {
          index++;
        } else {
          index = 0;
        }
        foundImage = false; // Reset foundImage flag for the next iteration
      }
    } while (!isFound);

    if (result.coordinates) {
      return await centerOf(result.coordinates);
    } else {
      result.errors.forEach((error) =>
        typeButton === MitchellButtons.manualLineButton
          ? log.warn('Error finding the Manual Line button', error)
          : log.warn('Error finding the Commit button', error)
      );
    }
  };

  // private checkForCommitButtonCoordinates = async (): Promise<Point> => {
  //   const images = fs.readdirSync(path.resolve(__dirname, '../../assets/commit-button'));
  //   const result: ImageSearchResult = {
  //     coordinates: null,
  //     errors: [],
  //   };
  //   for (let i = 0; i < images.length; i++) {
  //     const name = images[i];
  //     try {
  //       const coordinates = await screen.find(name);
  //       result.coordinates = coordinates;
  //       break;
  //     } catch (err) {
  //       result.errors.push(err);
  //     }
  //   }

  //   if (result.coordinates) {
  //     return await centerOf(result.coordinates);
  //   } else {
  //     result.errors.forEach((error) => log.warn('Error finding the Manual Line button', error));
  //   }
  // };

  private getShouldPopulateData = async (
    manualLineCoordinates: Point,
    data: ResponseData,
    electronWindow: BrowserWindow
  ): Promise<boolean> => {
    // if (isDev()) return true;

    try {
      await this.focusMitchellTable(manualLineCoordinates, { returnToPosition: true });
      return true;
    } catch (error) {
      log.error(error);
    }
  };

  private focusMitchellTable = async (
    manualLineCoordinates: Point,
    { returnToPosition = false, yOffset = 200 }: FocusTableOptions
  ) => {
    const prevPosition = await mouse.getPosition();
    await importer.moveToPosition(manualLineCoordinates.x, manualLineCoordinates.y);
    await mouse.leftClick();

    // if (returnToPosition) {
    //   await importer.moveToPosition(prevPosition.x, prevPosition.y);
    // }
  };

  private populateMitchellTableData = async (
    forgettables: MitchellForgettable[],
    selectedTypeForCommit: string
  ) => {
    const hasSelectedItemized = selectedTypeForCommit === 'Itemized';
    const hasSelectedBundled = selectedTypeForCommit === 'Bundled';
    const numberOfInputs = forgettables.length * 8;
    const percentagePerCell = VERIFICATION_PROGRESS_BREAKPOINT / numberOfInputs;
    this.progressUpdater.setStep(percentagePerCell);
    if (hasSelectedItemized) {
      await this.populateItemized(forgettables);
    } else if (hasSelectedBundled) {
      await this.populateBundled(forgettables);
    }
  };

  public typeMitchellValue = async (value: string): Promise<void> => {
    if (value) {
      await keyboard.type(value);
    }
  };

  private pressTabButton = async (count: number) => {
    await times(count).pressKey(Key.Tab);
  };

  private populateItemized = async (forgettables: MitchellForgettable[]) => {
    for (let i = 0; i < forgettables.length; i++) {
      const { description, partNumber, quantity, partPrice, consumableLineNote } = forgettables[i];
      //Type Description and Go to Operation
      await this.typeMitchellValue(description);
      this.progressUpdater.update();

      await times(4).pressKey(Key.Tab);
      await times(2).pressKey(Key.Down); // Selecting Part Type to be Aftermarket New


      await keyboard.pressKey(Key.Enter); // Select it
      await keyboard.releaseKey(Key.Enter);
      await snooze(250);

      await this.pressTabButton(7); // focus again on the Part number
      await this.typeMitchellValue(partNumber); // Type Part Number
      this.progressUpdater.update();
      await snooze(250)

      await this.pressTabButton(1); // Go to Quantity
      // // quantity is sometimes null if its a 0% and no update and it crashesh so we put default 1?
      if (!quantity) {
        await keyboard.type(this.DEFAULT_QUANTITY);
      } else {
        await keyboard.type(quantity.toString());
      }
      this.progressUpdater.update();
      await snooze(250)
      await keyboard.pressKey(Key.Tab)
      await keyboard.releaseKey(Key.Tab)
      await snooze(250)
      // await this.pressTabButton(1); // Go to price

      await this.typeMitchellValue(partPrice); // type totalPrice;
      this.progressUpdater.update();
      await snooze(250)

      await this.pressTabButton(2); // go to (+More) button
      this.progressUpdater.update();
      await snooze(3000)

      await keyboard.pressKey(Key.Enter); // press Add Line with Enter to open Dropdown
      await keyboard.releaseKey(Key.Enter);
      await snooze(3000)


      await times(4).pressKey(Key.Down); // Select Add New explanation
      await snooze(550)

      await keyboard.pressKey(Key.Enter); // Press Add new explanation to open the textarea
      await keyboard.releaseKey(Key.Enter);
      await this.typeMitchellValue(consumableLineNote); // Write the consumableLineNote
      await snooze(550)

      await this.pressTabButton(4); // go to Add Line
      await keyboard.pressKey(Key.Enter); // press Add Line with Enter
      await keyboard.releaseKey(Key.Enter);
      this.progressUpdater.update();
      await snooze(6000); // wait until modal is closed

      if (i < forgettables.length - 1) {
        await mouse.leftClick(); // open the modal again for the next line
      }
    }
  };

  private populateBundled = async (forgettables: MitchellForgettable[]) => {
    const { description, partNumber, partPrice } = forgettables[0]; // if it is bundled we return only one
    await this.typeMitchellValue(description); // type description
    this.progressUpdater.update();

    await this.pressTabButton(3); // skip Operation stay default, skip Type - stay default Body, go to Total Units
    await this.typeMitchellValue(this.BUNDLED_TOTAL_UNITS); // fill Total Units with 1
    this.progressUpdater.update();

    await this.pressTabButton(1); // go to part type
    await times(2).pressKey(Key.Down); // Selecting Part Type to be Aftermarket New
    await keyboard.pressKey(Key.Enter); // Select it
    await keyboard.releaseKey(Key.Enter); // Select it
    await snooze(2000);
    this.progressUpdater.update();

    await this.pressTabButton(7); // focus again on the Part number
    await this.typeMitchellValue(partNumber); // Type Part Number
    this.progressUpdater.update();
    await this.pressTabButton(1); // Go to Quantity
    await this.typeMitchellValue(this.BUNDLED_QUANTITY); // Type Quantity
    this.progressUpdater.update();
    await this.pressTabButton(1); // Go to Total Price
    await this.typeMitchellValue(partPrice); // Type Total Price calculated in our back-end
    this.progressUpdater.update();
    await snooze(2000);
    await this.pressTabButton(2); // go to (+More) button

    await keyboard.pressKey(Key.Enter); // press More with Enter to open Dropdown
    await keyboard.releaseKey(Key.Enter);
    await times(6).pressKey(Key.Down); // Select Add New explanation
    await keyboard.pressKey(Key.Enter); // Press Add new explanation to open the textarea
    await keyboard.releaseKey(Key.Enter);
    await this.typeMitchellValue(this.BUNDLED_LINE_NOTE); // Write the default bundled line note

    await snooze(1000);
    await this.pressTabButton(4); // go to add line
    await keyboard.pressKey(Key.Enter); // press Add Line with Enter
    await keyboard.releaseKey(Key.Enter);
    this.progressUpdater.update();
    await snooze(4000); // wait until modal is closed
  };

  private commitMitchellData = async (commitButtonCoordinates: Point, electronWindow: BrowserWindow) => {
    await mouse.setPosition(commitButtonCoordinates);
    await mouse.leftClick();
    this.progressUpdater.update();
    // logic for searching by image
    const inputSpeed = getInputSpeed();
    const inputSpeedSeconds = getInputSpeedInSeconds(inputSpeed);

    this.setMitchellConfig(inputSpeedSeconds, false, true);
    await snooze(6000);

    const coordinatesOfButtonInModal = await this.getButtonCoordinates(
      electronWindow,
      MitchellButtons.commitButtonInModal
    );
    if (coordinatesOfButtonInModal) {
      await mouse.setPosition(coordinatesOfButtonInModal);
      await mouse.leftClick();
      this.progressUpdater.setPercentage(100);
    }
  };
}

export default new Mitchell_Importer();
