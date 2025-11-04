import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import TablePage from './components/TablePage';
import { loginCodes } from './config';
import { INITIAL_DATA as page1Data } from './data';
import { INITIAL_DATA_GEH_AA as page2Data } from './data-geh-aa';
// FIX: Import data for the new 'GEH AG' page
import { INITIAL_DATA_GEH_AG_PAGE as page3Data } from './data-geh-ag-page';
import { INITIAL_DATA_GMH as page4Data } from './data-gmh';

interface PageConfig {
  title: string;
  subtitle?: string;
  initialData: any[];
  storageKey: string;
  historyKey: string;
}

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
  const [pageIndex, setPageIndex] = useState(0);

  const handleLogin = (code: string): boolean => {
    // Rend la vérification insensible à la casse et aux espaces de début/fin
    const user = loginCodes[code.trim().toUpperCase()];
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPageIndex(0); // Reset to first page
  };
  
  const currentPageConfig = pages[pageIndex];

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {currentUser ? (
        <TablePage
          key={pageIndex} // Force re-render when page changes
          currentUser={currentUser}
          onLogout={handleLogout}
          // Page specific props
          title={currentPageConfig.title}
          subtitle={currentPageConfig.subtitle}
          initialData={currentPageConfig.initialData}
          storageKey={currentPageConfig.storageKey}
          historyKey={currentPageConfig.historyKey}
          // Navigation props
          currentPage={pageIndex + 1}
          totalPages={pages.length}
          onNavigate={(newIndex) => setPageIndex(newIndex)}
        />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;