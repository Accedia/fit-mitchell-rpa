import React, { useCallback } from 'react';
import { useEffect } from 'react';
import { MESSAGE, AppState } from '@electron-app';
import { Button, Icon, Progress } from 'semantic-ui-react';
import { ipcRenderer } from '@react-app/utils/electron_remote';
import Dots from '../components/Dots';

import '../styles/app.scss';

const LoadingPage: React.FC = () => {
  const [status, setStatus] = React.useState('Loading');
  const [progress, setProgress] = React.useState(0);
  const [appState, setAppState] = React.useState<AppState>('default');

  useEffect(() => {
    ipcRenderer.on(MESSAGE.LOADER_CHECK_UPDATE_STATUS, (event: any, updateMessage: string) => {
      setStatus(updateMessage);
    });
  }, []);

  useEffect(() => {
    ipcRenderer.on(MESSAGE.LOADER_ACTION_REQUIRED, (event: any, action: AppState) => {
      setAppState(action);
    });
  }, []);

  useEffect(() => {
    ipcRenderer.on(MESSAGE.LOADER_PROGRESS, (event: any, _progress: number) => {
      setProgress(_progress);
    });
  }, []);

  const close = useCallback(() => {
    ipcRenderer.send(MESSAGE.CLOSE_APP);
  }, []);

  const getClasses = () => {
    if (appState === 'error') return 'error-loading';
    if (appState === 'complete') return 'success-loading';
    return '';
  };

  return (
    <div className={`loading-page-container ${getClasses()}`}>
      <img
        src={process.env.PUBLIC_URL + '/logo_gif_transparent.gif'}
        alt="FIT Logo"
        width="125"
        className="fit-loader-logo"
      />
      <p className="status-text">
        {status}
        <Dots />
      </p>

      {appState === 'downloading' && (
        <Progress percent={progress} size="tiny" color="blue" className="progress-bar" />
      )}
      {['downloading', 'installing'].includes(appState) && (
        <div className="notification-segment">
          <Icon color="orange" name="warning circle" /> App will restart when its ready. This might take
          several minutes.
        </div>
      )}
      {appState === 'error' && <Button content="Close" className="action-button" onClick={close} />}
    </div>
  );
};

export default LoadingPage;
