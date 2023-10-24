import { Electron } from '@electron-app';

const electron = window.require('electron') as Electron;
const ipcRenderer = electron.ipcRenderer;
const remote = electron.remote;

export { ipcRenderer, electron, remote };
