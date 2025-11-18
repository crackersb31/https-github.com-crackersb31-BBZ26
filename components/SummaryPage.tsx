import React, { useState, useEffect } from 'react';
import { db } from '../firebase-config';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { type HistoryEntry, type LoginEntry, type RowData, type PageConfig } from '../types';
import { teamMembers } from '../config';

interface SummaryPageProps {
  currentUser: string;
  pages: PageConfig[];
  onSelectPage: (index: number) => void;
  onLogout: () => void;
  onSelectHistory: () => void;
  onSelectSynthesis: () => void;
  onSelectConfiguration: () => void;
  onSelectAdminDiagnostics: () => void;
  onDeletePage: (pageId: string) => void;
}

// --- NOUVELLES ICÔNES PERSONNALISÉES ---
const iconProps = {
    className: "h-10 w-10 mb-3 transition-transform duration-300 group-hover:scale-110",
};

const iconComponents: Record<string, React.FC> = {
    'Fiches de synthèse': () => <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4H8V8H4V4Z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 16H8V20H4V16Z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 4H20V8H16V4Z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 16H20V20H16V16Z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 6.5H14" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 17.5H14" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.5 10V14" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17.5 10V14" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Remontée GEH': () => <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 3L4 14H12L11 21L20 10H12L13 3Z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Remontée DRH': () => <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 21V19C17 16.7909 15.2091 15 13 15H8C5.79086 15 4 16.7909 4 19V21" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.5 11C12.433 11 14 9.433 14 7.5C14 5.567 12.433 4 10.5 4C8.567 4 7 5.567 7 7.5C7 9.433 8.567 11 10.5 11Z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.9999 11C20.9329 11 22.4999 9.433 22.4999 7.5C22.4999 5.567 20.9329 4 18.9999 4C18.3999 4 17.8999 4.2 17.3999 4.5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17.4 15C17.8 15.2 18.2 15.5 18.5 15.8" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Remontée SST': () => <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Remontée DCOM': () => <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 10L10 13M13 13L10 10" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 13.3721C2 14.9912 2.78453 16.4831 4.07593 17.4722L4.08838 17.4813C4.10091 17.4904 4.11353 17.4994 4.12625 17.5083L4.13702 17.5162C4.69078 17.8872 5.31952 18.106 6 18.106C6.68048 18.106 7.30922 17.8872 7.86298 17.5162L7.87375 17.5083C7.88647 17.4994 7.89909 17.4904 7.91162 17.4813L7.92407 17.4722C9.21547 16.4831 10 14.9912 10 13.3721V9.3871C10 6.36835 12.0323 3.86419 14.8657 3.54148L15 3.51863V3.51863C18.866 3.51863 22 6.65263 22 10.5186V13.3721C22 14.8023 21.3255 16.1362 20.2155 17.1118" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    DEFAULT: () => <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2V8H20" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Configuration & Aide': () => <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19.4 15L21.5 13.4C21.8 13.1 22 12.6 22 12C22 11.4 21.8 10.9 21.5 10.6L19.4 9C19.1 8.7 18.6 8.5 18.1 8.5C17.6 8.5 17.1 8.7 16.8 9.1L15 10.6C14.7 10.9 14.5 11.4 14.5 11.9C14.5 12.4 14.7 12.9 15 13.2L16.8 14.7C17.1 15.1 17.6 15.3 18.1 15.3C18.6 15.3 19.1 15.1 19.4 14.8V15Z" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4.6 15L2.5 13.4C2.2 13.1 2 12.6 2 12C2 11.4 2.2 10.9 2.5 10.6L4.6 9C4.9 8.7 5.4 8.5 5.9 8.5C6.4 8.5 6.9 8.7 7.2 9.1L9 10.6C9.3 10.9 9.5 11.4 9.5 11.9C9.5 12.4 9.3 12.9 9 13.2L7.2 14.7C6.9 15.1 6.4 15.3 5.9 15.3C5.4 15.3 4.9 15.1 4.6 14.8V15Z" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.1 7.2L10.6 9C10.9 9.3 11.4 9.5 11.9 9.5C12.4 9.5 12.9 9.3 13.2 9L14.7 7.2C15.1 6.9 15.3 6.4 15.3 5.9C15.3 5.4 15.1 4.9 14.8 4.6L13.4 2.5C13.1 2.2 12.6 2 12 2C11.4 2 10.9 2.2 10.6 2.5L9.1 4.6C8.7 4.9 8.5 5.4 8.5 5.9C8.5 6.4 8.7 6.9 9 7.2V7.2Z" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.1 16.8L10.6 15C10.9 14.7 11.4 14.5 11.9 14.5C12.4 14.5 12.9 14.7 13.2 15L14.7 16.8C15.1 17.1 15.3 17.6 15.3 18.1C15.3 18.6 15.1 19.1 14.8 19.4L13.4 21.5C13.1 21.8 12.6 22 12 22C11.4 22 10.9 21.8 10.6 21.5L9.1 19.4C8.7 19.1 8.5 18.6 8.5 18.1C8.5 17.6 8.7 17.1 9 16.8V16.8Z" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Synthèse Globale': () => <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6H20" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 12H20" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 18H20" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Historique Global': () => <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8V12L14 14" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Diagnostic Admin': () => <svg {...iconProps} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 20L14 4" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 17L21 13L17 9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 17L3 13L7 9" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

const getPageIcon = (title: string) => {
    if (title.startsWith('Remontée GEH')) return iconComponents['Remontée GEH'];
    const key = Object.keys(iconComponents).find(k => title.includes(k));
    return key ? iconComponents[key] : iconComponents['DEFAULT'];
};

interface PageCardProps {
  page: PageConfig;
  isAdmin: boolean;
  onSelect: () => void;
  onDelete: (pageId: string) => void;
}

const PageCard: React.FC<PageCardProps> = ({ page, isAdmin, onSelect, onDelete }) => {
  const Icon = getPageIcon(page.title);
  return (
    <div
      onClick={onSelect}
      className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center p-6 hover:-translate-y-1 group border border-slate-200/50"
    >
      {isAdmin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(page.id);
          }}
          className="absolute top-3 right-3 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          aria-label={`Supprimer le tableau ${page.title}`}
          title="Supprimer le tableau"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
      <Icon />
      <h3 className="text-md font-semibold text-slate-800 ">{page.title}</h3>
    </div>
  );
};

interface ToolCardProps {
  title: string;
  onClick: () => void;
  Icon: React.FC;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, onClick, Icon }) => (
  <div onClick={onClick} className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center p-6 hover:-translate-y-1 group border border-slate-200/50">
    <Icon />
    <h3 className="text-md font-semibold text-slate-800 ">{title}</h3>
  </div>
);


const StatCard: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-200/50">
        <div className="flex items-center mb-4">
            <div className="mr-4">{icon}</div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        </div>
        {children}
    </div>
);

const SummaryPage: React.FC<SummaryPageProps> = ({ currentUser, pages, onSelectPage, onLogout, onSelectHistory, onSelectSynthesis, onSelectConfiguration, onSelectAdminDiagnostics, onDeletePage }) => {
  const [stats, setStats] = useState({
    activeUsers: [] as { user: string; score: number }[],
    totalContributions: [] as { user:string; total: number }[],
    maxContribution: 0,
  });
  const [loading, setLoading] = useState(true);
  const isAdmin = currentUser === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        const historyQuery = query(collection(db, 'history'), orderBy('timestamp', 'desc'));
        const historySnapshot = await getDocs(historyQuery);
        const historyData = historySnapshot.docs.map(doc => doc.data() as HistoryEntry);
        
        const loginQuery = query(collection(db, 'logins'), orderBy('timestamp', 'desc'));
        const loginSnapshot = await getDocs(loginQuery);
        const loginData = loginSnapshot.docs.map(doc => doc.data() as LoginEntry);

        const activityScores: Record<string, number> = {};
        historyData.forEach(entry => {
            activityScores[entry.user] = (activityScores[entry.user] || 0) + 1;
        });
        loginData.forEach(entry => {
            activityScores[entry.user] = (activityScores[entry.user] || 0) + 0.5; // Logins count for less
        });
        
        const activeUsers = Object.entries(activityScores)
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
            .map(([user, score]) => ({ user, score: Math.round(score) }));

        const contributionPromises = pages.map(page => {
            const docRef = doc(db, 'pagesData', page.storageKey);
            return getDoc(docRef).then(docSnap => {
                return docSnap.exists() ? (docSnap.data().rows as RowData[]) : page.initialData;
            });
        });
        const allPagesData = await Promise.all(contributionPromises);
        
        const totalContributions: Record<string, number> = {};
        allPagesData.flat().forEach(row => {
            if (!row || !row.contributions) return;
            row.contributions.forEach((contrib, index) => {
                const teamName = teamMembers[index];
                if (teamName) {
                    totalContributions[teamName] = (totalContributions[teamName] || 0) + Number(contrib || 0);
                }
            });
        });
        
        const contributionsByTeam = Object.entries(totalContributions)
            .map(([user, total]) => ({user, total}))
            .sort((a, b) => b.total - a.total);
            
        const maxContribution = Math.max(...contributionsByTeam.map(c => c.total), 0);
        
        setStats({ 
            activeUsers, 
            totalContributions: contributionsByTeam,
            maxContribution,
        });

      } catch (error) {
        console.error("Erreur lors de la récupération des statistiques pour le tableau de bord", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser, pages, isAdmin]);
  
  const sousUniteTitles = ['Remontée GEH AA', 'Remontée GEH AG', 'Remontée GEH TA', 'Remontée GMH'];
  const sousUnitePages = pages.filter(p => sousUniteTitles.includes(p.title));
  const etatMajorPagesUnsorted = pages.filter(p => !sousUniteTitles.includes(p.title));
  const etatMajorPages = etatMajorPagesUnsorted.sort((a, b) => {
    if (a.title === 'Fiches de synthèse') return -1;
    if (b.title === 'Fiches de synthèse') return 1;
    return a.title.localeCompare(b.title);
  });
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col -m-4 sm:-m-6 lg:-m-8">
      <header className="bg-white/80 backdrop-blur-lg shadow-sm w-full sticky top-0 z-20 border-b border-slate-200/50">
          <div className="container mx-auto p-4 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Sommaire</h1>
                <p className="text-sm text-slate-500">Tableau de bord et navigation</p>
              </div>
              <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                      <p className="font-semibold text-slate-800">{currentUser}</p>
                      <p className="text-xs text-slate-500">Connecté</p>
                  </div>
                  <button onClick={onLogout} className="py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 transition-colors">
                      Se déconnecter
                  </button>
              </div>
          </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow">
          {isAdmin && (
              <div className="mb-12">
                  <h2 className="text-3xl font-bold text-slate-800 mb-6">Tableau de Bord</h2>
                  {loading ? <p className="text-center text-slate-600">Chargement des statistiques...</p> : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <StatCard title="Utilisateurs les plus actifs" icon={<svg className="h-8 w-8 text-amber-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 17.5L19 19L22 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 18H10V18C6.68629 18 4 15.3137 4 12V12C4 8.68629 6.68629 6 10 6V6H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 11L15 8L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
                              {stats.activeUsers.length > 0 ? (
                                <ul className="space-y-3 text-sm">
                                  {stats.activeUsers.slice(0, 5).map((u, i) => <li key={u.user} className="flex items-center justify-between">
                                      <div className="flex items-center">
                                          <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-600' : 'bg-slate-300'} text-white font-bold text-xs mr-3`}>{i + 1}</span>
                                          <span className="text-slate-700">{u.user}</span>
                                      </div>
                                      <span className="font-bold text-slate-600">{u.score} actions</span>
                                  </li>)}
                                </ul>
                              ) : <p className="text-sm text-slate-500">Aucune activité enregistrée.</p>}
                          </StatCard>
                          <StatCard title="Répartition des Contributions" icon={<svg className="h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 20V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
                               {stats.totalContributions.length > 0 ? (
                                <ul className="space-y-4 text-sm">
                                  {stats.totalContributions.slice(0,5).map(c => (
                                    <li key={c.user}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-slate-700">{c.user}</span>
                                            <span className="font-bold text-slate-600">{c.total.toLocaleString('fr-FR')}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                                            <div
                                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                                                style={{ width: `${stats.maxContribution > 0 ? (c.total / stats.maxContribution) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    </li>
                                  ))}
                                </ul>
                               ) : <p className="text-sm text-slate-500">Aucune contribution enregistrée.</p>}
                          </StatCard>
                      </div>
                  )}
              </div>
          )}
          
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Remontée Sous Unité</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sousUnitePages.map((page) => {
                  const originalIndex = pages.findIndex(p => p.id === page.id);
                  return <PageCard 
                    key={page.id} 
                    page={page} 
                    isAdmin={isAdmin} 
                    onSelect={() => onSelectPage(originalIndex)} 
                    onDelete={onDeletePage} 
                  />;
                })}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Etat Major Unité</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {etatMajorPages.map((page) => {
                const originalIndex = pages.findIndex(p => p.id === page.id);
                return <PageCard 
                  key={page.id} 
                  page={page} 
                  isAdmin={isAdmin} 
                  onSelect={() => onSelectPage(originalIndex)} 
                  onDelete={onDeletePage} 
                />;
              })}
              
              <ToolCard title="Configuration & Aide" onClick={onSelectConfiguration} Icon={iconComponents['Configuration & Aide']} />
              
              {isAdmin && (
                <>
                  <ToolCard title="Synthèse Globale" onClick={onSelectSynthesis} Icon={iconComponents['Synthèse Globale']} />
                  <ToolCard title="Historique Global" onClick={onSelectHistory} Icon={iconComponents['Historique Global']} />
                  <ToolCard title="Diagnostic Admin" onClick={onSelectAdminDiagnostics} Icon={iconComponents['Diagnostic Admin']} />
                </>
              )}
            </div>
          </section>
      </main>
    </div>
  );
};

export default SummaryPage;