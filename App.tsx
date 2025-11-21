
import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import TablePage from './components/TablePage';
import SummaryPage from './components/SummaryPage';
import HistoryPage from './components/HistoryPage';
import SynthesisPage from './components/SynthesisPage';
import UserSynthesisPage from './components/UserSynthesisPage';
import ConfigurationPage from './components/ConfigurationPage';
import AdminDiagnosticsPage from './components/AdminDiagnosticsPage';
import AnnouncementPage from './components/AnnouncementPage'; // Import de la page d'annonce
import { loginCodes, defaultColumns } from './config';
import { INITIAL_DATA as page1Data } from './data';
import { INITIAL_DATA_GEH_AA as page2Data } from './data-geh-aa';
import { INITIAL_DATA_GEH_AG_PAGE as page3Data } from './data-geh-ag-page';
import { INITIAL_DATA_GMH as page4Data } from './data-gmh';
import { type PageConfig, type LoginEntry, type Column, type RowData, type AnnouncementConfig } from './types';
import { db } from './firebase-config';
import { doc, setDoc, getDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';

const initialPages: PageConfig[] = [
  {
    id: "page1",
    title: "Fiches transverses",
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
    id: "page12",
    title: "Remontée GEH TA",
    subtitle: "",
    initialData: [],
    storageKey: "contributionTableData_p12",
    historyKey: "contributionHistory_p12",
    isCustom: true,
    columns: defaultColumns,
  },
  {
    id: "page4",
    title: "Remontée GMH",
    subtitle: "",
    initialData: page4Data,
    storageKey: "contributionTableData_p4",
    historyKey: "contributionHistory_p4",
  },
  {
    id: "page5",
    title: "Remontée DT",
    subtitle: "",
    initialData: [],
    storageKey: "contributionTableData_p5",
    historyKey: "contributionHistory_p5",
    isCustom: true,
    columns: defaultColumns,
  },
  {
    id: "page6",
    title: "Remontée DF",
    subtitle: "",
    initialData: [],
    storageKey: "contributionTableData_p6",
    historyKey: "contributionHistory_p6",
    isCustom: true,
    columns: defaultColumns,
  },
  {
    id: "page7",
    title: "Remontée DC",
    subtitle: "",
    initialData: [],
    storageKey: "contributionTableData_p7",
    historyKey: "contributionHistory_p7",
    isCustom: true,
    columns: defaultColumns,
  },
  {
    id: "page8",
    title: "Remontée SST",
    subtitle: "",
    initialData: [],
    storageKey: "contributionTableData_p8",
    historyKey: "contributionHistory_p8",
    isCustom: true,
    columns: defaultColumns,
  },
  {
    id: "page9",
    title: "Remontée DCOM",
    subtitle: "",
    initialData: [],
    storageKey: "contributionTableData_p9",
    historyKey: "contributionHistory_p9",
    isCustom: true,
    columns: defaultColumns,
  },
  {
    id: "page10",
    title: "Remontée DCAB",
    subtitle: "",
    initialData: [],
    storageKey: "contributionTableData_p10",
    historyKey: "contributionHistory_p10",
    isCustom: true,
    columns: defaultColumns,
  },
  {
    id: "page11",
    title: "Remontée DRH",
    subtitle: "",
    initialData: [],
    storageKey: "contributionTableData_p11",
    historyKey: "contributionHistory_p11",
    isCustom: true,
    columns: defaultColumns,
  },
];

const performPageDeletion = async (pages: PageConfig[], pageId: string) => {
    const pageToDelete = pages.find(p => p.id === pageId);
    if (!pageToDelete) {
        console.error("Tableau à supprimer non trouvé", { pageId });
        return { success: false, updatedPages: pages };
    }
    const { storageKey, historyKey } = pageToDelete;
    const updatedPages = pages.filter(p => p.id !== pageId);

    try {
        const historyCollectionRef = collection(db, 'history');
        const historySnapshot = await getDocs(historyCollectionRef);
        const historyDocsToDelete = historySnapshot.docs.filter(doc => doc.data().pageKey === historyKey);

        if (historyDocsToDelete.length > 0) {
            const BATCH_SIZE = 500;
            const chunks = [];
            for (let i = 0; i < historyDocsToDelete.length; i += BATCH_SIZE) {
                chunks.push(historyDocsToDelete.slice(i, i + BATCH_SIZE));
            }

            for (const chunk of chunks) {
                const historyBatch = writeBatch(db);
                chunk.forEach((doc) => {
                    historyBatch.delete(doc.ref);
                });
                await historyBatch.commit();
            }
        }

        const finalBatch = writeBatch(db);
        const pagesConfigDocRef = doc(db, 'appConfig', 'pages');
        finalBatch.set(pagesConfigDocRef, { pageList: updatedPages });
        const pageDataDocRef = doc(db, 'pagesData', storageKey);
        finalBatch.delete(pageDataDocRef);
        await finalBatch.commit();
        
        return { success: true, updatedPages };
    } catch (error) {
        console.error("Erreur lors de la suppression du tableau", error);
        return { success: false, updatedPages: pages };
    }
};


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  // Ajout de l'état 'announcement' pour gérer la vue du message
  const [currentView, setCurrentView] = useState<'login' | 'announcement' | 'summary' | 'table' | 'history' | 'synthesis' | 'userSynthesis' | 'configuration' | 'adminDiagnostics'>('login');
  const [pageIndex, setPageIndex] = useState(0);
  const [pages, setPages] = useState<PageConfig[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<string>('');

  useEffect(() => {
    const fetchPagesConfig = async () => {
        const docRef = doc(db, 'appConfig', 'pages');
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().pageList) {
                let firestorePages: PageConfig[] = docSnap.data().pageList;
                let configChanged = false;

                const newTitle = "Fiches transverses";
                
                const indexOld1 = firestorePages.findIndex(p => p.title === "Fiches de synthèse");
                if (indexOld1 !== -1) {
                    firestorePages[indexOld1] = { ...firestorePages[indexOld1], title: newTitle };
                    configChanged = true;
                }

                const indexOld2 = firestorePages.findIndex(p => p.title === "Les leviers au budget 26");
                if (indexOld2 !== -1) {
                    firestorePages[indexOld2] = { ...firestorePages[indexOld2], title: newTitle };
                    configChanged = true;
                }

                const titlesToDelete = ["Remontée Ressources Humaines", "Remontée Direction Communication"];
                const pagesToDelete = firestorePages.filter(p => titlesToDelete.includes(p.title));

                if (pagesToDelete.length > 0) {
                    let currentPagesList = [...firestorePages];
                    for (const page of pagesToDelete) {
                        const result = await performPageDeletion(currentPagesList, page.id);
                        if (result.success) {
                            currentPagesList = result.updatedPages;
                        }
                    }
                    firestorePages = currentPagesList;
                    configChanged = true;
                }

                const firestorePageIds = new Set(firestorePages.map(p => p.id));
                const missingPages = initialPages.filter(p => !firestorePageIds.has(p.id));

                if (missingPages.length > 0 || configChanged) {
                    const updatedPages = [...firestorePages, ...missingPages];
                    await setDoc(docRef, { pageList: updatedPages });
                    setPages(updatedPages);
                } else {
                    setPages(firestorePages);
                }
            } else {
                await setDoc(docRef, { pageList: initialPages });
                setPages(initialPages);
            }
        } catch (error) {
            console.error("Erreur de chargement de la configuration des pages", error);
            setPages(initialPages);
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
        console.error("Erreur lors de l'enregistrement de la connexion", error);
      }

      // Check for announcements
      try {
          const announcementRef = doc(db, 'appConfig', 'announcements');
          const announcementSnap = await getDoc(announcementRef);
          
          if (announcementSnap.exists()) {
              const config = announcementSnap.data() as AnnouncementConfig;
              if (config.isActive) {
                  let messageToShow = '';
                  if (config.globalMessage) {
                      messageToShow += config.globalMessage + '\n\n';
                  }
                  if (config.userMessages && config.userMessages[user]) {
                      messageToShow += config.userMessages[user];
                  }
                  
                  if (messageToShow.trim()) {
                      setCurrentAnnouncement(messageToShow.trim());
                      setCurrentView('announcement');
                      return true;
                  }
              }
          }
      } catch (error) {
          console.error("Erreur vérification annonces", error);
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

  const handleAnnouncementAcknowledged = () => {
      setCurrentView('summary');
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

  const handleSelectUserSynthesis = () => {
    setCurrentView('userSynthesis');
  };

  const handleSelectConfiguration = () => {
    setCurrentView('configuration');
  };
  
  const handleSelectAdminDiagnostics = () => {
    setCurrentView('adminDiagnostics');
  };
  
  const handleDeletePage = async (pageId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce tableau ? Toutes ses données et son historique seront définitivement perdus.")) {
        return;
    }
    setLoadingPages(true);
    const { success, updatedPages } = await performPageDeletion(pages, pageId);
    if (success) {
        setPages(updatedPages);
        alert("Le tableau a été supprimé avec succès.");
    } else {
        alert("Une erreur est survenue lors de la suppression. Veuillez réessayer.");
    }
    setLoadingPages(false);
  };
  
  const handleUpdatePageConfig = async (pageId: string, newColumns: Column[]) => {
    const pageIndexToUpdate = pages.findIndex(p => p.id === pageId);
    if (pageIndexToUpdate === -1) return;

    setLoadingPages(true);
    const updatedPages = [...pages];
    updatedPages[pageIndexToUpdate] = {
        ...updatedPages[pageIndexToUpdate],
        columns: newColumns,
    };
    
    try {
        const docRef = doc(db, 'appConfig', 'pages');
        await setDoc(docRef, { pageList: updatedPages });
        setPages(updatedPages);
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la configuration de la page", error);
        alert("Erreur lors de la sauvegarde de la configuration des colonnes.");
    } finally {
        setLoadingPages(false);
    }
  };

  const handleTogglePageStatus = async (pageId: string, isFinished: boolean) => {
    const pageIndexToUpdate = pages.findIndex(p => p.id === pageId);
    if (pageIndexToUpdate === -1) return;

    const updatedPages = [...pages];
    updatedPages[pageIndexToUpdate] = {
        ...updatedPages[pageIndexToUpdate],
        isFinished: isFinished,
    };
    setPages(updatedPages);

    try {
        const docRef = doc(db, 'appConfig', 'pages');
        await setDoc(docRef, { pageList: updatedPages });
    } catch (error) {
        console.error("Erreur lors de la mise à jour du statut du tableau", error);
        // Revert on error if needed, but simpler to just log for now in this context
    }
  };

  const renderContent = () => {
    if (currentView === 'login' || !currentUser) {
      return <LoginPage onLogin={handleLogin} />;
    }

    if (loadingPages) {
      return <div className="flex items-center justify-center min-h-screen">Chargement de la configuration...</div>;
    }

    if (currentView === 'announcement') {
        return <AnnouncementPage message={currentAnnouncement} onAcknowledge={handleAnnouncementAcknowledged} />;
    }
    
    if (currentView === 'summary') {
      return (
        <SummaryPage
          currentUser={currentUser}
          pages={pages}
          onSelectPage={handleSelectPage}
          onSelectHistory={handleSelectHistory}
          onSelectSynthesis={handleSelectSynthesis}
          onSelectUserSynthesis={handleSelectUserSynthesis}
          onSelectConfiguration={handleSelectConfiguration}
          onSelectAdminDiagnostics={handleSelectAdminDiagnostics}
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
          onUpdatePageConfig={handleUpdatePageConfig}
          onToggleStatus={(status) => handleTogglePageStatus(currentPageConfig.id, status)}
        />
      );
    }

    if (currentView === 'history') {
      return <HistoryPage onBack={handleBackToSummary} historyKey={null} />;
    }

    if (currentView === 'synthesis') {
      return <SynthesisPage onBack={handleBackToSummary} pageConfigs={pages} />;
    }

    if (currentView === 'userSynthesis') {
      return <UserSynthesisPage onBack={handleBackToSummary} pageConfigs={pages} currentUser={currentUser} />;
    }

    if (currentView === 'configuration') {
        return <ConfigurationPage onBack={handleBackToSummary} currentUser={currentUser} />;
    }

    if (currentView === 'adminDiagnostics') {
        return <AdminDiagnosticsPage onBack={handleBackToSummary} />;
    }
    
    return null;
  }
  
  return (
    <div className={currentView === 'login' || currentView === 'announcement' ? '' : "p-4 sm:p-6 lg:p-8"}>
      {renderContent()}
    </div>
  );
};

export default App;
