import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Landing from './pages/Landing';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
