import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initStyle } from './lib/style';
import './styles/tokens.css';
import './styles/base.css';
import './styles/styles.css';
import './styles/print.css';

initStyle();

const root = document.getElementById('root');
if (!root) throw new Error('Brak elementu #root');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
