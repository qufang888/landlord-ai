import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { audioManager } from './audio/audio-manager';
import './index.css';

// 游戏开始前预加载所有音效与报牌语音
audioManager.preload();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
