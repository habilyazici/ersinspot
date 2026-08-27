import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles/globals.css';

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Kök öğe bulunamadı. index.html içindeki #root kontrol edin.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
