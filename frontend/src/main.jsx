import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LanguageProvider } from './hooks/useLanguage';
import Login from './pages/Login';
import App from './pages/App';

function Root() {
  const { user } = useAuth();
  return user ? <App /> : <Login />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <Root />
      </LanguageProvider>
    </AuthProvider>
  </React.StrictMode>
);
