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

// 启动界面：React 首帧绘制完成后淡出并移除 splash，避免内容就绪前的黑框/空白
const splash = document.getElementById('splash');
if (splash) {
  requestAnimationFrame(() => {
    splash.classList.add('splash-hidden');
    setTimeout(() => splash.remove(), 450);
  });
}
