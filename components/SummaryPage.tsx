import React, { useState, useEffect } from 'react';
import { db } from '../firebase-config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { type HistoryEntry, type LoginEntry, type RowData } from '../types';

interface PageConfigForSummary {
  title: string;
  subtitle?: string;
  storageKey: string;
}

interface SummaryPageProps {
  currentUser: string;
  pages: PageConfigForSummary[];
  onSelectPage: (index: number) => void;
  onLogout: () => void;
  onSelectHistory: () => void;
  onSelectAnalytics: () => void;
}

const StatCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-600 mb-3">{title}</h3>
        {children}
    </div>
);

const SummaryPage: React.FC<SummaryPageProps> = ({ currentUser, pages, onSelectPage, onLogout, onSelectHistory, onSelectAnalytics }) => {
  const [stats, setStats] = useState({
    activeUsers: [] as { user: string; score: number }[],
    totalContributions: [] as { user: string; total: number }[],
    tablesCount: 0,
    modifsToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser !== 'ADMIN') {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetch history for modifications
        const historyQuery = query(collection(db, 'history'), orderBy('timestamp', 'desc'));
        const historySnapshot = await getDocs(historyQuery);
        const historyData = historySnapshot.docs.map(doc => doc.data() as HistoryEntry);
        
        // Fetch logins
        const loginQuery = query(collection(db, 'logins'), orderBy('timestamp', 'desc'));
        const loginSnapshot = await getDocs(loginQuery);
        const loginData = loginSnapshot.docs.map(doc => doc.data() as LoginEntry);

        // --- Calculate stats ---

        // 1. Modifications today
        const today = new Date().toISOString().slice(0, 10);
        const modifsToday = historyData.filter(entry => entry.timestamp.startsWith(today)).length;
        
        // 2. Activity Score (Modifications + Logins)
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

        // 3. Total Contributions by team
        const contributionPromises = pages.map(page => getDocs(collection(db, 'pagesData')).then(snapshot => {
            const doc = snapshot.docs.find(d => d.id === page.storageKey);
            return doc ? (doc.data().rows as RowData[]) : [];
        }));
        const allPagesData = await Promise.all(contributionPromises);
        
        const totalContributions = allPagesData.flat().reduce((acc, row) => {
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
  }, [currentUser, pages]);

  const availablePages = pages
    .map((page, index) => ({ ...page, index }))
    .filter(page => {
      if (currentUser === 'ADMIN') return true;
      if (page.index === 0) return true;
      return page.title.includes(currentUser);
    });

  const PageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
  const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  const AnalyticsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;

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
          {currentUser === 'ADMIN' && (
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
                      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center p-6 hover:-translate-y-1 group"
                  >
                      <PageIcon />
                      <h3 className="text-md font-bold text-gray-800 mt-4">{page.title}</h3>
                  </div>
              ))}
              {currentUser === 'ADMIN' && (
                <>
                  <div
                      onClick={onSelectHistory}
                      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center p-6 hover:-translate-y-1 group border-2 border-transparent bg-teal-50"
                  >
                      <HistoryIcon/>
                      <h3 className="text-md font-bold text-gray-800 mt-4">Historique Global</h3>
                  </div>
                  <div
                      onClick={onSelectAnalytics}
                      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center p-6 hover:-translate-y-1 group border-2 border-transparent bg-purple-50"
                  >
                      <AnalyticsIcon/>
                      <h3 className="text-md font-bold text-gray-800 mt-4">Analyse des Contributions</h3>
                  </div>
                </>
              )}
          </div>
      </main>
    </div>
  );
};

export default SummaryPage;