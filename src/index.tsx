import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { app } from './firebaseConfig'; // Ensures Firebase app is initialized via firebaseConfig.ts
import { AuthProvider } from './contexts/AuthContext'; // Import AuthProvider

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
