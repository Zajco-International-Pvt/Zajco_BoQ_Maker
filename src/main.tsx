import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { AppContent } from './App';
import './index.css';

// Prevent mouse wheel from incrementing/decrementing number inputs globally
if (typeof window !== 'undefined') {
  window.addEventListener(
    'wheel',
    () => {
      if (
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement.type === 'number'
      ) {
        document.activeElement.blur();
      }
    },
    { passive: true }
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </React.StrictMode>
);
