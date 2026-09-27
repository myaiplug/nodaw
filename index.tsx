import React from 'react';
import ReactDOM from 'react-dom/createRoot';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Landing from './pages/Landing';
import Profile from './pages/Profile';
import { ClerkGate } from './components/ClerkGate';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ClerkGate>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app/*" element={<App />} />
          <Route path="/u/:handle" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    </ClerkGate>
  </React.StrictMode>,
);
