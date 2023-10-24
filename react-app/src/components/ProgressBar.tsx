import { VERIFICATION_PROGRESS_BREAKPOINT } from '@electron-app';
import React from 'react';
import { Icon, Progress, Segment, SemanticCOLORS } from 'semantic-ui-react';
import Dots from './Dots';

enum ProgressStates {
  COMPLETE,
  POPULATING,
  VERIFYING,
}

interface ProgressStateConfig {
  type: ProgressStates;
  isCurrentState: (percentage: number) => boolean;
  message: JSX.Element;
  color: SemanticCOLORS;
}

const progressState: ProgressStateConfig[] = [
  {
    type: ProgressStates.POPULATING,
    isCurrentState: (percentage) => percentage < VERIFICATION_PROGRESS_BREAKPOINT,
    message: (
      <>
        Population in progress
        <Dots compact />
      </>
    ),
    color: 'blue',
  },
  {
    type: ProgressStates.VERIFYING,
    isCurrentState: (percentage) => percentage >= VERIFICATION_PROGRESS_BREAKPOINT && percentage < 100,
    message: (
      <>
        Verifying imports
        <Dots compact />
      </>
    ),
    color: 'orange',
  },
  {
    type: ProgressStates.COMPLETE,
    isCurrentState: (percentage) => percentage >= 100,
    message: <>Population complete</>,
    color: 'green',
  },
];

interface ProgressBarProps {
  percentage: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percentage }) => {
  const currentState = progressState.find((state) => state.isCurrentState(percentage))!;

  return (
    <div className="controls-progress">
      <Progress percent={percentage.toFixed(1)} size="small" color="teal" progress className="progress-bar" />
      <Segment compact color={currentState.color} inverted>
        {currentState.type === ProgressStates.COMPLETE ? (
          <Icon name="check circle" />
        ) : (
          <Icon name="circle notched" loading />
        )}
        {currentState.message}
      </Segment>
    </div>
  );
};

export default ProgressBar;
