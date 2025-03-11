export {};

declare global {
  interface Window {
    electron: {
      shell: {
        openPath: (path: string) => Promise<string>;
      };
    };
  }
}
