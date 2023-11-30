export type ControlsAction =
  | { type: '@SET_STOPPED_PREMATURELY'; payload: boolean }
  | { type: '@SET_PERCENTAGE'; payload: number }
  | { type: '@SET_IS_RUNNING', payload: boolean }
  | { type: '@SET_IS_LOADING'; payload: boolean }
  | { type: '@SET_HAS_ERROR'; payload: boolean }
  | { type: '@RESET_STATE' }
  | { type: '@SET_IS_WAITING_CCC'; payload: boolean }
  | { type: '@SET_IS_READY'; payload: boolean }
  | { type: '@SET_IS_SEARCHING_FOR_COMMIT_BUTTON'; payload: boolean }
  | { type: '@SET_IS_SEARCHING_FOR_MANUAL_LINE_BUTTON'; payload: boolean };