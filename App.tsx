
import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import TablePage from './components/TablePage';
import SummaryPage from './components/SummaryPage';
import HistoryPage from './components/HistoryPage';
import SynthesisPage from './components/SynthesisPage';
import UserSynthesisPage from './components/UserSynthesisPage';
import ConfigurationPage from './components/ConfigurationPage';
import AdminDiagnosticsPage from './components/AdminDiagnosticsPage';
import AnnouncementPage from './components/AnnouncementPage';
import TransverseDomainsPage from './components/TransverseDomainsPage';
import ExpertResponsesPage from './components/ExpertResponsesPage';
import SurveyPage from './components/SurveyPage';
import SurveyResultsPage from './components/SurveyResultsPage';
import { loginCodes, defaultColumns, surveyThemes as initialSurveyThemes } from './config';
import { INITIAL_DATA as page1Data } from './data';
import { INITIAL_DATA_GEH_AA as page2Data } from './data-geh-aa';
import { INITIAL_DATA_GEH_AG_PAGE as page3Data } from './data-geh-ag-page';
import { INITIAL_DATA_GMH as page4Data } from './data-gmh';
import { type PageConfig, type LoginEntry, type Column, type AnnouncementConfig, type SurveyTheme } from './types';
import { db } from './firebase-config';

const initialPages: PageConfig[] = [
  { id: "page1", title: "Fiches transverses", subtitle: "Issue des fiches de synthèses disponible dans teams", initialData: page1Data, storageKey: "contributionTableData_p1", historyKey: "contributionHistory_p1", columns: defaultColumns },
  { id: "page2", title: "Remontée GEH AA", subtitle: "", initialData: page2Data, storageKey: "contributionTableData_p2", historyKey: "contributionHistory_p2", columns: defaultColumns },
  { id: "page3", title: "Remontée GEH AG", subtitle: "", initialData: page3Data, storageKey: "contributionTableData_p3", historyKey: "contributionHistory_p3", columns: defaultColumns },
  { id: "page12", title: "Remontée GEH TA", subtitle: "", initialData: [], storageKey: "contributionTableData_p12", historyKey: "contributionHistory_p12", isCustom: true, columns: defaultColumns },
  { id: "page4", title: "Remontée GMH", subtitle: "", initialData: page4Data, storageKey: "contributionTableData_p4", historyKey: "contributionHistory_p4", columns: defaultColumns },
  { id: "page5", title: "Remontée DT", subtitle: "", initialData: [], storageKey: "contributionTableData_p5", historyKey: "contributionHistory_p5", isCustom: true, columns: defaultColumns },
  { id: "page6", title: "Remontée DF", subtitle: "", initialData: [], storageKey: "contributionTableData_p6", historyKey: "contributionHistory_p6", isCustom: true, columns: defaultColumns },
  { id: "page7", title: "Remontée DC", subtitle: "", initialData: [], storageKey: "contributionTableData_p7", historyKey: "contributionHistory_p7", isCustom: true, columns: defaultColumns },
  { id: "page8", title: "Remontée SST", subtitle: "", initialData: [], storageKey: "contributionTableData_p8", historyKey: "contributionHistory_p8", isCustom: true, columns: defaultColumns },
  { id: "page9", title: "Remontée DCOM", subtitle: "", initialData: [], storageKey: "contributionTableData_p9", historyKey: "contributionHistory_p9", isCustom: true, columns: defaultColumns },
  { id: "page10", title: "Remontée DCAB", subtitle: "", initialData: [], storageKey: "contributionTableData_p10", historyKey: "contributionHistory_p10", isCustom: true, columns: defaultColumns },
  { id: "page11", title: "Remontée DRH", subtitle: "", initialData: [], storageKey: "contributionTableData_p11", historyKey: "contributionHistory_p11", isCustom: true, columns: defaultColumns },
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'announcement' | 'summary' | 'table' | 'history' | 'synthesis' | 'userSynthesis' | 'configuration' | 'adminDiagnostics' | 'transverseDomains' | 'expertResponses' | 'survey' | 'surveyResults'>('login');
  const [pageIndex, setPageIndex] = useState(0);
  const [pages, setPages] = useState<PageConfig[]>([]);
  const [surveyThemes, setSurveyThemes] = useState<SurveyTheme[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<string>('');

  useEffect(() => {
    const fetchAppConfig = async () => {
        setLoadingConfig(true);
        try {
            // Fetch Pages
            const pagesDoc = await db.collection('appConfig').doc('pages').get();
            if (pagesDoc.exists && pagesDoc.data()?.pageList) {
                setPages(pagesDoc.data()!.pageList);
            } else {
                await db.collection('appConfig').doc('pages').set({ pageList: initialPages });
                setPages(initialPages);
            }

            // Fetch Survey Themes
            const surveyDoc = await db.collection('appConfig').doc('surveyConfig').get();
            if (surveyDoc.exists && surveyDoc.data()?.themes) {
                setSurveyThemes(surveyDoc.data()!.themes);
            } else {
                await db.collection('appConfig').doc('surveyConfig').set({ themes: initialSurveyThemes });
                setSurveyThemes(initialSurveyThemes);
            }
        } catch (error) {
            console.error("Erreur chargement config globale", error);
            setPages(initialPages);
            setSurveyThemes(initialSurveyThemes);
        } finally {
            setLoadingConfig(false);
        }
    };
    fetchAppConfig();
  }, []);

  const handleUpdateSurveyThemes = async (newThemes: SurveyTheme[]) => {
      try {
          await db.collection('appConfig').doc('surveyConfig').set({ themes: newThemes });
          setSurveyThemes(newThemes);
      } catch (e) {
          console.error("Erreur update survey", e);
          throw e;
      }
  };

  const handleLogin = async (code: string): Promise<boolean> => {
    const user = loginCodes[code.trim().toUpperCase()];
    if (user) {
      setCurrentUser(user);
      try {
        await db.collection('logins').add({ user, timestamp: new Date().toISOString() });
        const announcementSnap = await db.collection('appConfig').doc('announcements').get();
        if (announcementSnap.exists) {
            const config = announcementSnap.data() as AnnouncementConfig;
            if (config.isActive) {
                let messageToShow = (config.globalMessage || '') + '\n\n' + (config.userMessages?.[user] || '');
                if (messageToShow.trim()) {
                    setCurrentAnnouncement(messageToShow.trim());
                    setCurrentView('announcement');
                    return true;
                }
            }
        }
      } catch (error) {}
      setCurrentView('summary');
      return true;
    }
    return false;
  };

  const renderContent = () => {
    if (currentView === 'login' || !currentUser) return <LoginPage onLogin={handleLogin} />;
    if (loadingConfig) return <div className="flex items-center justify-center min-h-screen">Chargement de la configuration...</div>;

    switch(currentView) {
      case 'announcement': return <AnnouncementPage message={currentAnnouncement} onAcknowledge={() => setCurrentView('summary')} />;
      case 'summary': return <SummaryPage currentUser={currentUser} pages={pages} onSelectPage={(i) => { setPageIndex(i); setCurrentView('table'); }} onSelectHistory={() => setCurrentView('history')} onSelectSynthesis={() => setCurrentView('synthesis')} onSelectUserSynthesis={() => setCurrentView('userSynthesis')} onSelectConfiguration={() => setCurrentView('configuration')} onSelectAdminDiagnostics={() => setCurrentView('adminDiagnostics')} onSelectTransverseDomains={() => setCurrentView('transverseDomains')} onSelectExpertResponses={() => setCurrentView('expertResponses')} onDeletePage={() => {}} onLogout={() => setCurrentView('login')} onSelectSurvey={() => setCurrentView('survey')} onSelectSurveyResults={() => setCurrentView('surveyResults')} currentSurveyThemes={surveyThemes} onUpdateSurveyThemes={handleUpdateSurveyThemes} />;
      case 'table': return <TablePage key={pageIndex} currentUser={currentUser} onLogout={() => setCurrentView('login')} onBackToSummary={() => setCurrentView('summary')} pageConfig={pages[pageIndex]} onUpdatePageConfig={async () => {}} onToggleStatus={() => {}} />;
      case 'history': return <HistoryPage onBack={() => setCurrentView('summary')} historyKey={null} />;
      case 'synthesis': return <SynthesisPage onBack={() => setCurrentView('summary')} pageConfigs={pages} />;
      case 'userSynthesis': return <UserSynthesisPage onBack={() => setCurrentView('summary')} pageConfigs={pages} currentUser={currentUser} />;
      case 'configuration': return <ConfigurationPage onBack={() => setCurrentView('summary')} currentUser={currentUser} currentSurveyThemes={surveyThemes} onUpdateSurveyThemes={handleUpdateSurveyThemes} />;
      case 'adminDiagnostics': return <AdminDiagnosticsPage onBack={() => setCurrentView('summary')} />;
      case 'expertResponses': return <ExpertResponsesPage onBack={() => setCurrentView('summary')} pageConfigs={pages} />;
      case 'transverseDomains': return <TransverseDomainsPage currentUser={currentUser} onLogout={() => setCurrentView('login')} onBack={() => setCurrentView('summary')} pageConfig={pages.find(p => p.title === 'Fiches transverses')!} onUpdatePageConfig={async () => {}} onToggleStatus={() => {}} />;
      case 'survey': return <SurveyPage currentUser={currentUser} themes={surveyThemes} onBack={() => setCurrentView('summary')} />;
      case 'surveyResults': return <SurveyResultsPage themes={surveyThemes} onBack={() => setCurrentView('summary')} />;
      default: return null;
    }
  };

  return <div className={currentView === 'login' || currentView === 'announcement' ? '' : "p-4 sm:p-6 lg:p-8"}>{renderContent()}</div>;
};

export default App;
