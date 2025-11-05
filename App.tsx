import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import TablePage from './components/TablePage';
import SummaryPage from './components/SummaryPage';
import HistoryPage from './components/HistoryPage';
import SynthesisPage from './components/SynthesisPage'; // Import de la nouvelle page
import { loginCodes } from './config';
import { INITIAL_DATA as page1Data } from './data';
import { INITIAL_DATA_GEH_AA as page2Data } from './data-geh-aa';
// FIX: Import data for the new 'GEH AG' page
import { INITIAL_DATA_GEH_AG_PAGE as page3Data } from './data-geh-ag-page';
import { INITIAL_DATA_GMH as page4Data } from './data-gmh';
import { type PageConfig, type LoginEntry } from './types';
import { db } from './firebase-config';
import { doc, setDoc, collection } from 'firebase/firestore';

const pages: PageConfig[] = [
  {
    title: "Tableau de Saisie des Contributions",
    subtitle: "Issue des fiches de synthèses disponible dans teams",
    initialData: page1Data,
    storageKey: "contributionTableData_p1",
    historyKey: "contributionHistory_p1",
  },
  {
    title: "Remontée 1510 GEH AA",
    subtitle: "",
    initialData: page2Data,
    storageKey: "contributionTableData_p2",
    historyKey: "contributionHistory_p2",
  },
  // FIX: Add configuration for the new 'GEH AG' page
  {
    title: "Remontée GEH AG",
    subtitle: "",
    initialData: page3Data,
    storageKey: "contributionTableData_p3",
    historyKey: "contributionHistory_p3",
  },
  {
    title: "Remontée GMH",
    subtitle: "",
    initialData: page4Data,
    storageKey: "contributionTableData_p4",
    historyKey: "contributionHistory_p4",
  },
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'summary' | 'table' | 'history' | 'synthesis'>('login');
  const [pageIndex, setPageIndex] = useState(0);

  const handleLogin = async (code: string): Promise<boolean> => {
    const user = loginCodes[code.trim().toUpperCase()];
    if (user) {
      setCurrentUser(user);
      try {
        const loginEntry: LoginEntry = {
          user,
          timestamp: new Date().toISOString(),
        };
        const loginCollectionRef = collection(db, 'logins');
        await setDoc(doc(loginCollectionRef), loginEntry);
      } catch (error) {
        console.error("Erreur lors de l'enregistrement de la connexion : ", error);
      }
      setCurrentView('summary');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('login');
  };

  const handleSelectPage = (index: number) => {
    setPageIndex(index);
    setCurrentView('table');
  };

  const handleBackToSummary = () => {
    setCurrentView('summary');
  };
  
  const handleSelectHistory = () => {
    setCurrentView('history');
  };

  const handleSelectSynthesis = () => {
    setCurrentView('synthesis');
  };
  
  const renderContent = () => {
    if (currentView === 'login' || !currentUser) {
      return <LoginPage onLogin={handleLogin} />;
    }
    
    if (currentView === 'summary') {
      return (
        <SummaryPage
          currentUser={currentUser}
          pages={pages}
          onSelectPage={handleSelectPage}
          onSelectHistory={handleSelectHistory}
          onSelectSynthesis={handleSelectSynthesis}
          onLogout={handleLogout}
        />
      );
    }

    if (currentView === 'table') {
      const currentPageConfig = pages[pageIndex];
      return (
        <TablePage
          key={pageIndex}
          currentUser={currentUser}
          onLogout={handleLogout}
          onBackToSummary={handleBackToSummary}
          title={currentPageConfig.title}
          subtitle={currentPageConfig.subtitle}
          initialData={currentPageConfig.initialData}
          storageKey={currentPageConfig.storageKey}
          historyKey={currentPageConfig.historyKey}
        />
      );
    }

    if (currentView === 'history') {
      return <HistoryPage onBack={handleBackToSummary} historyKey={null} />;
    }

    if (currentView === 'synthesis') {
      return <SynthesisPage onBack={handleBackToSummary} pageConfigs={pages} />;
    }
    
    return null;
  }
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {renderContent()}
    </div>
  );
};

export default App;