import { App } from "electron";

export const isDev = (): boolean => process.env.NODE_ENV === "development";
export const isAppDev = (app: App): boolean => !app.isPackaged || isDev();
