import React from 'react';
import ReactDOM from 'react-dom/client';
import { enableMapSet } from 'immer';
import App from './App';
import './styles/globals.css';

// Enable Immer's MapSet plugin for Map/Set support in stores
enableMapSet();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

