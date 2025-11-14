import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import TablePage from './components/TablePage';
import SummaryPage from './components/SummaryPage';
import HistoryPage from './components/HistoryPage';
import SynthesisPage from './components/SynthesisPage';
import ConfigurationPage from './components/ConfigurationPage';
import CreatePage from './components/CreatePage'; // Import de la nouvelle page
import { loginCodes } from './config';
import { INITIAL_DATA as page1Data } from './data';
import { INITIAL_DATA_GEH_AA as page2Data } from './data-geh-aa';
import { INITIAL_DATA_GEH_AG_PAGE as page3Data } from './data-geh-ag-page';
import { INITIAL_DATA_GMH as page4Data } from './data-gmh';
import { type PageConfig, type LoginEntry, type Column, type RowData } from './types';
import { db } from './firebase-config';
import { doc, setDoc, getDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';

// FIX: Removed defaultColumns constant. It is now centralized in config.ts.

const initialPages: PageConfig[] = [
  {
    id: "page1",
    title: "Fiches de synthèse",
    subtitle: "Issue des fiches de synthèses disponible dans teams",
    initialData: page1Data,
    storageKey: "contributionTableData_p1",
    historyKey: "contributionHistory_p1",
  },
  {
    id: "page2",
    title: "Remontée GEH AA",
    subtitle: "",
    initialData: page2Data,
    storageKey: "contributionTableData_p2",
    historyKey: "contributionHistory_p2",
  },
  {
    id: "page3",
    title: "Remontée GEH AG",
    subtitle: "",
    initialData: page3Data,
    storageKey: "contributionTableData_p3",
    historyKey: "contributionHistory_p3",
  },
  {
    id: "page4",
    title: "Remontée GMH",
    subtitle: "",
    initialData: page4Data,
    storageKey: "contributionTableData_p4",
    historyKey: "contributionHistory_p4",
  },
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'summary' | 'table' | 'history' | 'synthesis' | 'configuration' | 'createPage'>('login');
  const [pageIndex, setPageIndex] = useState(0);
  const [pages, setPages] = useState<PageConfig[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  useEffect(() => {
    const fetchPagesConfig = async () => {
        const docRef = doc(db, 'appConfig', 'pages');
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().pageList) {
                setPages(docSnap.data().pageList);
            } else {
                console.log("Configuration des pages non trouvée, initialisation par défaut.");
                await setDoc(docRef, { pageList: initialPages });
                setPages(initialPages);
            }
        } catch (error) {
            console.error("Erreur de chargement de la configuration des pages :", error);
            setPages(initialPages); // Fallback to initial pages on error
        } finally {
            setLoadingPages(false);
        }
    };
    fetchPagesConfig();
  }, []);

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

  const handleSelectConfiguration = () => {
    setCurrentView('configuration');
  };

  const handleSelectCreatePage = () => {
    setCurrentView('createPage');
  };
  
  const handlePageCreated = (newPage: PageConfig) => {
    const updatedPages = [...pages, newPage];
    setPages(updatedPages);
    const docRef = doc(db, 'appConfig', 'pages');
    setDoc(docRef, { pageList: updatedPages });
    setPageIndex(updatedPages.length - 1); // Select the new page
    setCurrentView('table');
  };
  
  const handleDeletePage = async (pageId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce tableau ? Toutes ses données et son historique seront définitivement perdus.")) {
        return;
    }

    setLoadingPages(true);

    const pageToDelete = pages.find(p => p.id === pageId);
    if (!pageToDelete) {
        console.error("Tableau à supprimer non trouvé:", pageId);
        alert("Erreur: Impossible de trouver le tableau à supprimer.");
        setLoadingPages(false);
        return;
    }
    const { storageKey, historyKey } = pageToDelete;
    const updatedPages = pages.filter(p => p.id !== pageId);
    
    try {
        // Étape 1: Supprimer l'historique associé par lots pour éviter de dépasser la limite de 500 opérations.
        const historyCollectionRef = collection(db, 'history');
        const q = query(historyCollectionRef, where("pageKey", "==", historyKey));
        const historySnapshot = await getDocs(q);

        if (!historySnapshot.empty) {
            const BATCH_SIZE = 500; // Limite de Firestore pour les écritures en batch
            const chunks = [];
            for (let i = 0; i < historySnapshot.docs.length; i += BATCH_SIZE) {
                chunks.push(historySnapshot.docs.slice(i, i + BATCH_SIZE));
            }

            for (const chunk of chunks) {
                const historyBatch = writeBatch(db);
                chunk.forEach((doc) => {
                    historyBatch.delete(doc.ref);
                });
                await historyBatch.commit();
            }
        }

        // Étape 2: Supprimer les données de la page et mettre à jour la configuration.
        const finalBatch = writeBatch(db);

        const pagesConfigDocRef = doc(db, 'appConfig', 'pages');
        finalBatch.set(pagesConfigDocRef, { pageList: updatedPages });

        const pageDataDocRef = doc(db, 'pagesData', storageKey);
        finalBatch.delete(pageDataDocRef);
        
        await finalBatch.commit();
        
        setPages(updatedPages);
        alert("Le tableau a été supprimé avec succès.");
    } catch (error) {
        console.error("Erreur lors de la suppression du tableau :", error);
        alert("Une erreur est survenue lors de la suppression. Veuillez réessayer.");
    } finally {
        setLoadingPages(false);
    }
  };

  const renderContent = () => {
    if (currentView === 'login' || !currentUser) {
      return <LoginPage onLogin={handleLogin} />;
    }

    if (loadingPages) {
      return <div className="flex items-center justify-center min-h-screen">Chargement de la configuration...</div>;
    }
    
    if (currentView === 'summary') {
      return (
        <SummaryPage
          currentUser={currentUser}
          pages={pages}
          onSelectPage={handleSelectPage}
          onSelectHistory={handleSelectHistory}
          onSelectSynthesis={handleSelectSynthesis}
          onSelectConfiguration={handleSelectConfiguration}
          onSelectCreatePage={handleSelectCreatePage}
          onDeletePage={handleDeletePage}
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
          pageConfig={currentPageConfig}
        />
      );
    }

    if (currentView === 'history') {
      return <HistoryPage onBack={handleBackToSummary} historyKey={null} />;
    }

    if (currentView === 'synthesis') {
      return <SynthesisPage onBack={handleBackToSummary} pageConfigs={pages} />;
    }

    if (currentView === 'configuration') {
        return <ConfigurationPage onBack={handleBackToSummary} currentUser={currentUser} />;
    }

    if (currentView === 'createPage') {
      return <CreatePage onBack={handleBackToSummary} onPageCreated={handlePageCreated} />;
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
