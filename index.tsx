import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Landing from './pages/Landing';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

// Vite replaces BASE_URL at build time: '/' in dev, '/nodaw/' on GH Pages
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
