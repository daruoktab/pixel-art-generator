import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App.tsx'; // Changed to import from src and added .tsx
import { AuthProvider } from './src/contexts/AuthContext.tsx'; // Import AuthProvider and added .tsx

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider> {/* Added AuthProvider */}
      <App />
    </AuthProvider> {/* Added AuthProvider */}
  </React.StrictMode>
);
