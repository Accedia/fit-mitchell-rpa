import React from 'react';
import { Message } from 'semantic-ui-react';
import { electron } from '@react-app/utils/electron_remote';

interface FitHeaderProps { }

const FitHeader: React.FC<FitHeaderProps> = () => {
  const getVersion = () => {
    const { app } = electron.remote

    if (app.isPackaged) {
      return 'v' + electron.remote.app.getVersion();
    } else {
      return <span style={{ color: 'red', fontWeight: 'bold' }}>DEVELOPMENT</span>;
    }
  }
  return (
    <Message icon>
      <img className="fit-settings-logo" src={process.env.PUBLIC_URL + '/icon.ico'} alt="logo" />
      <Message.Content>
        <Message.Header>REV Import Technology Manual</Message.Header>
        <div className="version-text">
          <span className="version-label">Version:</span> {getVersion()}
        </div>
      </Message.Content>
    </Message>
  );
};

export default FitHeader;
