import { INPUT_SPEED_CONFIG, MESSAGE } from '@electron-app';
import React, { useCallback, useState } from 'react';
import { Button, Message } from 'semantic-ui-react';
import { SemanticWIDTHS } from 'semantic-ui-react/dist/commonjs/generic';
import SectionTitle from '../components/SectionTitle';
import { electron, ipcRenderer } from '@react-app/utils/electron_remote';
import { useToasts } from 'react-toast-notifications';

type InputSpeed = keyof typeof INPUT_SPEED_CONFIG;
interface ElectronRemote {
  getInputSpeed: () => InputSpeed;
}

const getElectronRemote = (): ElectronRemote => electron.remote.require('./main.js');

const Settings: React.FC = () => {
  const { getInputSpeed } = getElectronRemote();
  const storageInputSpeed = getInputSpeed();
  const { addToast } = useToasts();

  const [inputSpeed, setInputSpeed] = useState<InputSpeed>(storageInputSpeed || 'normal');

  React.useEffect(() => {
    ipcRenderer.send(MESSAGE.SET_INPUT_SPEED, inputSpeed);
  }, [inputSpeed]);

  const handleSpeedChange = useCallback(
    (speed: InputSpeed) => {
      addToast(
        <div>
          Input speed changed to <b>{speed}</b>
        </div>,
        {
          appearance: 'success',
          autoDismiss: true,
        }
      );
      setInputSpeed(speed);
    },
    [addToast]
  );

  const getButton = (content: string, buttonInputSpeed: InputSpeed) => {
    const isActive = inputSpeed === buttonInputSpeed;

    return (
      <Button
        color={isActive ? 'blue' : undefined}
        onClick={() => handleSpeedChange(buttonInputSpeed)}
        active={isActive}
      >
        {content}
      </Button>
    );
  };

  return (
    <div>
      <Message icon>
        <img className="fit-settings-logo" src={process.env.PUBLIC_URL + '/icon.ico'} alt="logo" />
        <Message.Content>
          <Message.Header>REV Import Technology</Message.Header>
          <div className="version-text">
            <span className="version-label">Version:</span> v{electron.remote.app.getVersion()}
          </div>
        </Message.Content>
      </Message>
      <div className="setting-container">
        <SectionTitle
          title="Input Speed"
          popup
          popupContent="The speed of the auto input population. Decrease the speed if you encounter missing symbols or cells"
          popupPosition="right center"
        />
        <Button.Group widths={Object.keys(INPUT_SPEED_CONFIG).length.toString() as SemanticWIDTHS}>
          {(Object.keys(INPUT_SPEED_CONFIG) as Array<InputSpeed>).map((key) => {
            const config = INPUT_SPEED_CONFIG[key];

            return getButton(config.title, key);
          })}
        </Button.Group>
      </div>
    </div>
  );
};

export default Settings;
