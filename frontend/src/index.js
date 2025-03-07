import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';

// Get the root element
const container = document.getElementById('root');
const root = createRoot(container);

// Render your app
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);