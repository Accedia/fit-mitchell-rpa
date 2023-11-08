import React from 'react';
import { Button, Icon } from 'semantic-ui-react';
import { ipcRenderer } from '@react-app/utils/electron_remote';
import { MESSAGE } from '@electron-app';

interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
}

const BackButton: React.FC<ButtonProps> = ({ onClick, disabled }) => (
  <Button icon labelPosition="left" onClick={onClick} disabled={disabled}>
    <Icon name="arrow left" />
    Back
  </Button>
);

const FinishButton: React.FC<ButtonProps> = ({ onClick, disabled }) => (
  <Button icon labelPosition="left" onClick={onClick} disabled={disabled}>
    <Icon name="checkmark" />
    Finish
  </Button>
);

const StopButton: React.FC<ButtonProps> = ({ onClick, disabled }) => (
  <Button icon labelPosition="left" color="red" onClick={onClick} disabled={disabled}>
    <Icon name="stop" />
    Abort (F7)
  </Button>
);

const ManualButton: React.FC = () => {
  const openManual = () => {
    ipcRenderer.send(MESSAGE.OPEN_MANUAL);
  };

  return (
    <Button icon labelPosition="left" onClick={openManual} color="yellow">
      <Icon name="question" />
      Help
    </Button>
  );
};

const DoneButton: React.FC<ButtonProps> = ({ onClick, disabled }) => (
  <Button color="blue" onClick={onClick} disabled={disabled}>
    Done
  </Button>
);

export const ActionButton = {
  Back: BackButton,
  Stop: StopButton,
  Manual: ManualButton,
  Finish: FinishButton,
  Done: DoneButton,
};
