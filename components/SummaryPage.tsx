import React, { useState, useEffect } from 'react';
import { db } from '../firebase-config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { type HistoryEntry, type LoginEntry, type RowData, type PageConfig } from '../types';

interface SummaryPageProps {
  currentUser: string;
  pages: PageConfig[];
  onSelectPage: (index: number) => void;
  onLogout: () => void;
  onSelectHistory: () => void;
  onSelectSynthesis: () => void;
  onSelectConfiguration: () => void;
  onSelectCreatePage: () => void;
  onDeletePage: (pageId: string) => void;
}

const StatCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-600 mb-3">{title}</h3>
        {children}
    </div>
);

const SummaryPage: React.FC<SummaryPageProps> = ({ currentUser, pages, onSelectPage, onLogout, onSelectHistory, onSelectSynthesis, onSelectConfiguration, onSelectCreatePage, onDeletePage }) => {
  const [stats, setStats] = useState({
    activeUsers: [] as { user: string; score: number }[],
    totalContributions: [] as { user: string; total: number }[],
    tablesCount: 0,
    modifsToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const isAdmin = currentUser === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const historyQuery = query(collection(db, 'history'), orderBy('timestamp', 'desc'));
        const historySnapshot = await getDocs(historyQuery);
        const historyData = historySnapshot.docs.map(doc => doc.data() as HistoryEntry);
        
        const loginQuery = query(collection(db, 'logins'), orderBy('timestamp', 'desc'));
        const loginSnapshot = await getDocs(loginQuery);
        const loginData = loginSnapshot.docs.map(doc => doc.data() as LoginEntry);

        const today = new Date().toISOString().slice(0, 10);
        const modifsToday = historyData.filter(entry => entry.timestamp.startsWith(today)).length;
        
        const activityScores: Record<string, number> = {};
        historyData.forEach(entry => {
            activityScores[entry.user] = (activityScores[entry.user] || 0) + 1;
        });
        loginData.forEach(entry => {
            activityScores[entry.user] = (activityScores[entry.user] || 0) + 1;
        });
        
        const activeUsers = Object.entries(activityScores)
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
            .map(([user, score]) => ({ user, score }));

        const contributionPromises = pages.map(page => getDocs(collection(db, 'pagesData')).then(snapshot => {
            const doc = snapshot.docs.find(d => d.id === page.storageKey);
            return doc ? (doc.data().rows as RowData[]) : [];
        }));
        const allPagesData = await Promise.all(contributionPromises);
        
        const totalContributions = allPagesData.flat().reduce((acc, row) => {
            if (!row || !row.contributions) return acc;
            row.contributions.forEach((contrib, index) => {
                const teamName = ['GEH AG', 'GEH AA', 'GEH TA', 'GMH'][index];
                if (teamName) {
                    acc[teamName] = (acc[teamName] || 0) + Number(contrib);
                }
            });
            return acc;
        }, {} as Record<string, number>);
        const contributionsByTeam = Object.entries(totalContributions).map(([user, total]) => ({user, total}));
        
        setStats({ 
            activeUsers, 
            totalContributions: contributionsByTeam,
            tablesCount: pages.length,
            modifsToday 
        });

      } catch (error) {
        console.error("Erreur lors de la récupération des statistiques:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser, pages, isAdmin]);

  const availablePages = pages.map((page, index) => ({ ...page, index }));

  const PageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
  const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  const SynthesisIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
  const ConfigIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
  const AddIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col -m-4 sm:-m-6 lg:-m-8">
      <header className="bg-white shadow-sm w-full sticky top-0 z-20">
          <div className="container mx-auto p-4 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Sommaire</h1>
                <p className="text-sm text-gray-500">Tableau de bord et navigation</p>
              </div>
              <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                      <p className="font-semibold">{currentUser}</p>
                      <p className="text-xs text-gray-500">Connecté</p>
                  </div>
                  <button onClick={onLogout} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700">
                      Se déconnecter
                  </button>
              </div>
          </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow">
          {isAdmin && (
              <div className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Tableau de Bord Administrateur</h2>
                  {loading ? <p>Chargement des statistiques...</p> : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <StatCard title="Utilisateurs les plus actifs">
                              <ul className="space-y-2 text-sm">
                                {stats.activeUsers.slice(0, 5).map(u => <li key={u.user} className="flex justify-between"><span>{u.user}</span> <span className="font-bold">{u.score} (score)</span></li>)}
                              </ul>
                          </StatCard>
                          <StatCard title="Répartition des Contributions">
                               <ul className="space-y-2 text-sm">
                                {stats.totalContributions.map(c => <li key={c.user} className="flex justify-between"><span>{c.user}</span> <span className="font-bold">{c.total.toLocaleString('fr-FR')}</span></li>)}
                              </ul>
                          </StatCard>
                      </div>
                  )}
              </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {availablePages.map((page) => (
                  <div
                      key={page.index}
                      onClick={() => onSelectPage(page.index)}
                      className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center p-6 hover:-translate-y-1 group"
                  >
                      {isAdmin && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeletePage(page.id);
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            aria-label={`Supprimer le tableau ${page.title}`}
                            title="Supprimer le tableau"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                      )}
                      <PageIcon />
                      <h3 className="text-md font-bold text-gray-800 mt-4">{page.title}</h3>
                  </div>
              ))}
              <div
                  onClick={onSelectConfiguration}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center p-6 hover:-translate-y-1 group border-2 border-transparent bg-gray-50"
              >
                  <ConfigIcon/>
                  <h3 className="text-md font-bold text-gray-800 mt-4">Configuration & Aide</h3>
              </div>
              {isAdmin && (
                <>
                  <div
                      onClick={onSelectCreatePage}
                      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center p-6 hover:-translate-y-1 group border-2 border-dashed border-gray-300 hover:border-green-500"
                  >
                      <AddIcon/>
                      <h3 className="text-md font-bold text-gray-800 mt-4">Créer un tableau</h3>
                  </div>
                  <div
                      onClick={onSelectSynthesis}
                      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center p-6 hover:-translate-y-1 group border-2 border-transparent bg-purple-50"
                  >
                      <SynthesisIcon/>
                      <h3 className="text-md font-bold text-gray-800 mt-4">Synthèse Globale</h3>
                  </div>
                  <div
                      onClick={onSelectHistory}
                      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center p-6 hover:-translate-y-1 group border-2 border-transparent bg-teal-50"
                  >
                      <HistoryIcon/>
                      <h3 className="text-md font-bold text-gray-800 mt-4">Historique Global</h3>
                  </div>
                </>
              )}
          </div>
      </main>
    </div>
  );
};

export default SummaryPage;