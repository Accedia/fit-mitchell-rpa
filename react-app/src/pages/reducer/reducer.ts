import { ControlsAction } from './actions';
import { ControlsState, INITIAL_STATE } from './state';

const reducer = (
  state: ControlsState,
  action: ControlsAction
): ControlsState => {
  switch (action.type) {
    case '@SET_STOPPED_PREMATURELY':
      return {
        ...state,
        stoppedPrematurely: action.payload
      }
    case '@SET_PERCENTAGE':
      return {
        ...state,
        percentage: action.payload,
      }
    case '@SET_IS_RUNNING':
      return {
        ...state,
        isRunning: action.payload,
      }
    case '@SET_IS_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case '@SET_HAS_ERROR':
      return {
        ...state,
        hasError: action.payload,
      }
    case '@RESET_STATE':
      state = INITIAL_STATE;
      return state;
    case '@SET_IS_WAITING_CCC':
      return {
        ...state,
        isWaitingCcc: action.payload,
      }
    case '@SET_IS_READY':
      return {
        ...state,
        isReady: action.payload,
      }
    case '@SET_IS_SEARCHING_FOR_COMMIT_BUTTON':
      return {
        ...state,
        isSearchingForCommitButton: action.payload
      }
    case '@SET_IS_SEARCHING_FOR_MANUAL_LINE_BUTTON':
      return {
        ...state,
        isSearchingForAddLineButton: action.payload
      }
    default:
      return state;
  }
};

export default reducer;