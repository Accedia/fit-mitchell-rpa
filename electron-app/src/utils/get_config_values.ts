import { InputSpeed } from '../interfaces/InputSpeed';
import { INPUT_SPEED_CONFIG } from '../constants/config';


export const getInputSpeedInSeconds = (inputSpeed: InputSpeed): number => {
  return INPUT_SPEED_CONFIG[inputSpeed].value;
};
