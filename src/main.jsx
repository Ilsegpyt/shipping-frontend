import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Keep the browser from restoring the previous scroll position on refresh.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// import { createRoot } from 'react-dom/client';
// import './index.css';
// import App from './App.jsx';

// createRoot(document.getElementById('root')).render(
//   <App />
// );
