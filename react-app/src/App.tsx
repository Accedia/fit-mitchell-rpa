import React from 'react';
import AppRouter from './AppRouter';
import { ToastProvider } from 'react-toast-notifications';

declare global {
  interface Window {
    require: any;
  }
}

function App() {
  return (
    <div className="App">
      <ToastProvider
        autoDismiss={true}
        autoDismissTimeout={3500}
        placement="bottom-center"
        transitionDuration={100}
      >
        <AppRouter />
      </ToastProvider>
    </div>
  );
}

export default App;
