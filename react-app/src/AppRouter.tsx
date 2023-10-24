import React from 'react';
import { Route, Switch, HashRouter as Router } from 'react-router-dom';
import BlockOverlay from './pages/BlockOverlay';
import Controls from './pages/Controls';
import LoadingPage from './pages/LoadingPage';
import Manual from './pages/Manual';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Switch>
        <Route path="/" exact>
          <div className="homepage-container">
            <Controls />
          </div>
        </Route>
        <Route path="/loading">
          <LoadingPage />
        </Route>
        <Route path="/block-overlay">
          <BlockOverlay />
        </Route>
        <Route path="/manual">
          <Manual />
        </Route>
      </Switch>
    </Router>
  );
};

export default AppRouter;
