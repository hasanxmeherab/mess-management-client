import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Import your main CSS file that contains the Tailwind directives
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
