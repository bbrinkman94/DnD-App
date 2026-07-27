import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/theme.css';
import './styles/ui.css';

const container = document.getElementById('root');
if (!container) throw new Error('The Threshold needs a #root element to open.');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
