import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './components/LoginPage';
import './components/TablePage';
import './components/HistoryPage';
import './components/SummaryPage';
import './components/SynthesisPage'; // Import de la nouvelle page de synthèse
import './config';
import './data';
import './data-geh-aa';
// FIX: Import new data file following existing pattern
import './data-geh-ag-page';
import './data-gmh';
import './firebase-config'; // Initialise Firebase

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("L'élément root est introuvable dans le DOM");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);