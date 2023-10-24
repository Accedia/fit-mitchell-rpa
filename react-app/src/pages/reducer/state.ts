export interface ControlsState {
  stoppedPrematurely: boolean;
  percentage: number;
  isRunning: boolean;
  isLoading: boolean;
  hasError: boolean;
  isWaitingCcc: boolean;
  isReady: boolean;
}

export const INITIAL_STATE: ControlsState = {
  stoppedPrematurely: false,
  percentage: 0,
  isRunning: false,
  isLoading: false,
  hasError: false,
  isWaitingCcc: false,
  isReady: false,
};
