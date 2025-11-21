
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
  onSelectUserSynthesis: () => void; // New Prop
  onSelectConfiguration: () => void;
  onSelectAdminDiagnostics: () => void;
  onDeletePage: (pageId: string) => void;
}

// --- CONFIGURATION DES THEMES ---
type ThemeColor = 'blue' | 'amber' | 'emerald' | 'rose' | 'slate' | 'purple' | 'indigo' | 'cyan';

interface ThemeStyles {
  bg: string;
  iconBg: string;
  iconColor: string;
  ring: string;
  shadow: string;
}

const themes: Record<ThemeColor, ThemeStyles> = {
  blue: { bg: 'hover:bg-blue-50/80', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', ring: 'group-hover:ring-blue-200', shadow: 'hover:shadow-blue-200' },
  amber: { bg: 'hover:bg-amber-50/80', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', ring: 'group-hover:ring-amber-200', shadow: 'hover:shadow-amber-200' },
  emerald: { bg: 'hover:bg-emerald-50/80', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', ring: 'group-hover:ring-emerald-200', shadow: 'hover:shadow-emerald-200' },
  rose: { bg: 'hover:bg-rose-50/80', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', ring: 'group-hover:ring-rose-200', shadow: 'hover:shadow-rose-200' },
  slate: { bg: 'hover:bg-slate-50/80', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', ring: 'group-hover:ring-slate-200', shadow: 'hover:shadow-slate-200' },
  purple: { bg: 'hover:bg-purple-50/80', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', ring: 'group-hover:ring-purple-200', shadow: 'hover:shadow-purple-200' },
  indigo: { bg: 'hover:bg-indigo-50/80', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', ring: 'group-hover:ring-indigo-200', shadow: 'hover:shadow-indigo-200' },
  cyan: { bg: 'hover:bg-cyan-50/80', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', ring: 'group-hover:ring-cyan-200', shadow: 'hover:shadow-cyan-200' },
};

// --- COMPOSANTS ICONES (SVG purs, la couleur est gérée par le parent) ---
const IconPath: React.FC<{ d: string }> = ({ d }) => (
  <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
);

const iconComponents: Record<string, React.FC> = {
    'Fiches transverses': () => <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><IconPath d="M4 4H8V8H4V4Z"/><IconPath d="M4 16H8V20H4V16Z"/><IconPath d="M16 4H20V8H16V4Z"/><IconPath d="M16 16H20V20H16V16Z"/><IconPath d="M10 6.5H14"/><IconPath d="M10 17.5H14"/><IconPath d="M6.5 10V14"/><IconPath d="M17.5 10V14"/></svg>,
    'Remontée GEH': () => <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><IconPath d="M13 3L4 14H12L11 21L20 10H12L13 3Z"/></svg>,
    'Remontée DRH': () => <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><IconPath d="M17 21V19C17 16.7909 15.2091 15 13 15H8C5.79086 15 4 16.7909 4 19V21"/><IconPath d="M10.5 11C12.433 11 14 9.433 14 7.5C14 5.567 12.433 4 10.5 4C8.567 4 7 5.567 7 7.5C7 9.433 8.567 11 10.5 11Z"/><IconPath d="M18.9999 11C20.9329 11 22.4999 9.433 22.4999 7.5C22.4999 5.567 20.9329 4 18.9999 4C18.3999 4 17.8999 4.2 17.3999 4.5"/><IconPath d="M17.4 15C17.8 15.2 18.2 15.5 18.5 15.8"/></svg>,
    'Remontée SST': () => <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><IconPath d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"/></svg>,
    'Remontée DCOM': () => <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><IconPath d="M13 10L10 13M13 13L10 10"/><IconPath d="M2 13.3721C2 14.9912 2.78453 16.4831 4.07593 17.4722L4.08838 17.4813C4.10091 17.4904 4.11353 17.4994 4.12625 17.5083L4.13702 17.5162C4.69078 17.8872 5.31952 18.106 6 18.106C6.68048 18.106 7.30922 17.8872 7.86298 17.5162L7.87375 17.5083C7.88647 17.4994 7.89909 17.4904 7.91162 17.4813L7.92407 17.4722C9.21547 16.4831 10 14.9912 10 13.3721V9.3871C10 6.36835 12.0323 3.86419 14.8657 3.54148L15 3.51863V3.51863C18.866 3.51863 22 6.65263 22 10.5186V13.3721C22 14.8023 21.3255 16.1362 20.2155 17.1118"/></svg>,
    DEFAULT: () => <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><IconPath d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"/><IconPath d="M14 2V8H20"/></svg>,
    'Configuration & Aide': () => <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><IconPath d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"/><IconPath d="M19.4 15L21.5 13.4C21.8 13.1 22 12.6 22 12C22 11.4 21.8 10.9 21.5 10.6L19.4 9C19.1 8.7 18.6 8.5 18.1 8.5C17.6 8.5 17.1 8.7 16.8 9.1L15 10.6C14.7 10.9 14.5 11.4 14.5 11.9C14.5 12.4 14.7 12.9 15 13.2L16.8 14.7C17.1 15.1 17.6 15.3 18.1 15.3C18.6 15.3 19.1 15.1 19.4 14.8V15Z"/><IconPath d="M4.6 15L2.5 13.4C2.2 13.1 2 12.6 2 12C2 11.4 2.2 10.9 2.5 10.6L4.6 9C4.9 8.7 5.4 8.5 5.9 8.5C6.4 8.5 6.9 8.7 7.2 9.1L9 10.6C9.3 10.9 9.5 11.4 9.5 11.9C9.5 12.4 9.3 12.9 9 13.2L7.2 14.7C6.9 15.1 6.4 15.3 5.9 15.3C5.4 15.3 4.9 15.1 4.6 14.8V15Z"/><IconPath d="M9.1 7.2L10.6 9C10.9 9.3 11.4 9.5 11.9 9.5C12.4 9.5 12.9 9.3 13.2 9L14.7 7.2C15.1 6.9 15.3 6.4 15.3 5.9C15.3 5.4 15.1 4.9 14.8 4.6L13.4 2.5C13.1 2.2 12.6 2 12 2C11.4 2 10.9 2.2 10.6 2.5L9.1 4.6C8.7 4.9 8.5 5.4 8.5 5.9C8.5 6.4 8.7 6.9 9 7.2V7.2Z"/><IconPath d="M9.1 16.8L10.6 15C10.9 14.7 11.4 14.5 11.9 14.5C12.4 14.5 12.9 14.7 13.2 15L14.7 16.8C15.1 17.1 15.3 17.6 15.3 18.1C15.3 18.6 15.1 19.1 14.8 19.4L13.4 21.5C13.1 21.8 12.6 22 12 22C11.4 22 10.9 21.8 10.6 21.5L9.1 19.4C8.7 19.1 8.5 18.6 8.5 18.1C8.5 17.6 8.7 17.1 9 16.8V16.8Z"/></svg>,
    'Synthèse Globale': () => <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><IconPath d="M4 6H20"/><IconPath d="M4 12H20"/><IconPath d="M4 18H20"/></svg>,
    'Synthèse par Utilisateur': () => <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><IconPath d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"/><IconPath d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z"/></svg>,
    'Historique Global': () => <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><IconPath d="M12 8V12L14 14"/><IconPath d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"/></svg>,
    'Diagnostic Admin': () => <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><IconPath d="M10 20L14 4"/><IconPath d="M17 17L21 13L17 9"/><IconPath d="M7 17L3 13L7 9"/></svg>,
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
  theme: ThemeColor;
  delay: number;
}

const PageCard: React.FC<PageCardProps> = ({ page, isAdmin, onSelect, onDelete, theme, delay }) => {
  const Icon = getPageIcon(page.title);
  const style = themes[theme];

  return (
    <div
      onClick={onSelect}
      style={{ animationDelay: `${delay}ms` }}
      className={`group relative bg-white/80 backdrop-blur-sm rounded-3xl p-6 cursor-pointer border border-white/50 shadow-lg transition-all duration-300 hover:-translate-y-2 animate-fade-in-up ${style.shadow} ${style.ring} hover:ring-1`}
    >
      {isAdmin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(page.id);
          }}
          className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
          title="Supprimer le tableau"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className={`p-4 rounded-2xl ${style.iconBg} ${style.iconColor} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm`}>
            <div className="w-8 h-8">
                <Icon />
            </div>
        </div>
        <h3 className="text-lg font-bold text-slate-700 group-hover:text-slate-900 transition-colors leading-tight">{page.title}</h3>
        <div className={`h-1 w-8 rounded-full ${style.iconBg} opacity-0 group-hover:opacity-100 transition-all duration-300`}></div>
      </div>
    </div>
  );
};

interface ToolCardProps {
  title: string;
  onClick: () => void;
  Icon: React.FC;
  theme: ThemeColor;
  delay: number;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, onClick, Icon, theme, delay }) => {
    const style = themes[theme];
    return (
        <div 
            onClick={onClick} 
            style={{ animationDelay: `${delay}ms` }}
            className={`group relative bg-white/80 backdrop-blur-sm rounded-3xl p-6 cursor-pointer border border-white/50 shadow-lg transition-all duration-300 hover:-translate-y-2 animate-fade-in-up ${style.shadow} ${style.ring} hover:ring-1`}
        >
            <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-2xl ${style.iconBg} ${style.iconColor} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm`}>
                    <div className="w-8 h-8">
                        <Icon />
                    </div>
                </div>
                <h3 className="text-lg font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{title}</h3>
                <div className={`h-1 w-8 rounded-full ${style.iconBg} opacity-0 group-hover:opacity-100 transition-all duration-300`}></div>
            </div>
        </div>
    );
};


const StatWidget: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode; color: string }> = ({ title, children, icon, color }) => (
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-white/50 flex flex-col h-full max-h-[500px]">
        <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 pb-4 flex-shrink-0">
            <div className={`p-2 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-700">{title}</h3>
        </div>
        <div className="flex-grow overflow-hidden flex flex-col">
            {children}
        </div>
    </div>
);

const SummaryPage: React.FC<SummaryPageProps> = ({ currentUser, pages, onSelectPage, onLogout, onSelectHistory, onSelectSynthesis, onSelectUserSynthesis, onSelectConfiguration, onSelectAdminDiagnostics, onDeletePage }) => {
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
            activityScores[entry.user] = (activityScores[entry.user] || 0) + 0.5;
        });
        
        const activeUsers = Object.entries(activityScores)
            .filter(([user]) => user !== 'ADMIN') // Exclure l'admin
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
            .filter(([user]) => user !== 'ADMIN') // Exclure l'admin
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
    if (a.title === 'Fiches transverses') return -1;
    if (b.title === 'Fiches transverses') return 1;
    return a.title.localeCompare(b.title);
  });
  
  // Filtrer les pages terminées pour le widget
  const finishedPages = pages.filter(p => p.isFinished);

  const toolsStartDelay = (sousUnitePages.length + etatMajorPages.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-x-hidden">
       {/* Arrière-plan animé "Living Light" */}
       <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-blue-200/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[50rem] h-[50rem] bg-purple-200/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[50rem] h-[50rem] bg-pink-200/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
       </div>

      <header className="bg-white/70 backdrop-blur-md sticky top-0 z-30 border-b border-white/50">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-200">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 leading-tight">Les leviers au budget 26</h1>
                    <p className="text-xs text-slate-500 font-medium">Tableau de bord de pilotage</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                      <p className="font-bold text-slate-700 text-sm">{currentUser}</p>
                      <div className="flex items-center justify-end gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          <p className="text-xs text-slate-500">En ligne</p>
                      </div>
                  </div>
                  <button onClick={onLogout} className="group p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-red-500 transition-colors" title="Se déconnecter">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  </button>
              </div>
          </div>
      </header>

      <main className="relative z-10 container mx-auto p-6 lg:p-8 flex-grow space-y-12">
          
          {isAdmin && (
              <section className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                  <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <span className="w-1 h-8 bg-indigo-500 rounded-full"></span>
                      Pilotage Administrateur
                  </h2>
                  {loading ? (
                      <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                  ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                           <StatWidget title="Utilisateurs les plus actifs" color="bg-amber-500 text-amber-600" icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}>
                              {stats.activeUsers.length > 0 ? (
                                <div className="overflow-y-auto max-h-[250px] pr-2 space-y-3 custom-scrollbar">
                                  {stats.activeUsers.map((u, i) => (
                                    <div key={u.user} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      <div className="flex items-center gap-3">
                                          <span className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                                              {i + 1}
                                          </span>
                                          <span className="font-semibold text-slate-700">{u.user}</span>
                                      </div>
                                      <span className="px-3 py-1 bg-white rounded-md text-xs font-bold text-slate-600 shadow-sm border border-slate-100">{u.score} actions</span>
                                    </div>
                                  ))}
                                </div>
                              ) : <p className="text-slate-400 text-center py-4">Aucune activité récente.</p>}
                          </StatWidget>

                          <StatWidget title="Volume des Contributions" color="bg-blue-500 text-blue-600" icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}>
                               {stats.totalContributions.length > 0 ? (
                                <div className="overflow-y-auto max-h-[250px] pr-2 space-y-3 custom-scrollbar">
                                  {stats.totalContributions.map((c, i) => (
                                    <div key={c.user} className="space-y-2">
                                        <div className="flex justify-between text-sm px-1">
                                            <span className="font-medium text-slate-600">{c.user}</span>
                                            <span className="font-bold text-slate-800">{c.total.toLocaleString('fr-FR')}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${i === 0 ? 'bg-blue-500' : 'bg-blue-400/70'}`}
                                                style={{ width: `${stats.maxContribution > 0 ? (c.total / stats.maxContribution) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                  ))}
                                </div>
                               ) : <p className="text-slate-400 text-center py-4">Aucune contribution chiffrée.</p>}
                          </StatWidget>

                          {/* Nouveau Widget : Saisies terminées */}
                          <StatWidget title="Saisies terminées" color="bg-green-500 text-green-600" icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
                              {finishedPages.length > 0 ? (
                                  <div className="overflow-y-auto max-h-[250px] pr-2 space-y-3 custom-scrollbar">
                                      {finishedPages.map((page) => (
                                          <div key={page.id} className="flex items-center justify-between p-3 bg-green-50/50 rounded-xl border border-green-100">
                                              <div className="flex items-center gap-3">
                                                  <div className="p-1.5 rounded-full bg-green-100 text-green-600">
                                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                  </div>
                                                  <span className="font-semibold text-slate-700 text-sm">{page.title}</span>
                                              </div>
                                              <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">Validé</span>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                      <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                      <p className="text-sm">Aucune saisie validée pour l'instant.</p>
                                  </div>
                              )}
                          </StatWidget>
                      </div>
                  )}
              </section>
          )}
          
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1 h-8 bg-amber-500 rounded-full"></span>
                Remontée Sous Unité
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sousUnitePages.map((page, index) => {
                  const originalIndex = pages.findIndex(p => p.id === page.id);
                  return <PageCard 
                    key={page.id} 
                    page={page} 
                    isAdmin={isAdmin} 
                    onSelect={() => onSelectPage(originalIndex)} 
                    onDelete={onDeletePage}
                    theme="amber"
                    delay={index * 100}
                  />;
                })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1 h-8 bg-blue-500 rounded-full"></span>
                    Etat Major Unité
                </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {etatMajorPages.map((page, index) => {
                const originalIndex = pages.findIndex(p => p.id === page.id);
                // Theme specific for the main table
                const theme = page.title === 'Fiches transverses' ? 'indigo' : 'blue';
                
                return <PageCard 
                  key={page.id} 
                  page={page} 
                  isAdmin={isAdmin} 
                  onSelect={() => onSelectPage(originalIndex)} 
                  onDelete={onDeletePage}
                  theme={theme}
                  delay={(index + sousUnitePages.length) * 100}
                />;
              })}
            </div>
          </section>

          {/* Nouvelle Section 3 : Statistique et Configuration */}
          <section>
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1 h-8 bg-emerald-500 rounded-full"></span>
                    Statistique et Configuration
                </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <ToolCard 
                    title="Configuration & Aide" 
                    onClick={onSelectConfiguration} 
                    Icon={iconComponents['Configuration & Aide']} 
                    theme="slate" 
                    delay={toolsStartDelay}
                />

                <ToolCard 
                    title="Synthèse par Utilisateur" 
                    onClick={onSelectUserSynthesis} 
                    Icon={iconComponents['Synthèse par Utilisateur']} 
                    theme="cyan" 
                    delay={toolsStartDelay + 100} 
                />

                {isAdmin && (
                    <>
                    <ToolCard title="Synthèse Globale" onClick={onSelectSynthesis} Icon={iconComponents['Synthèse Globale']} theme="purple" delay={toolsStartDelay + 200} />
                    <ToolCard title="Historique Global" onClick={onSelectHistory} Icon={iconComponents['Historique Global']} theme="emerald" delay={toolsStartDelay + 300} />
                    <ToolCard title="Diagnostic Admin" onClick={onSelectAdminDiagnostics} Icon={iconComponents['Diagnostic Admin']} theme="slate" delay={toolsStartDelay + 400} />
                    </>
                )}
            </div>
          </section>
      </main>
      
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 10s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.6s ease-out forwards;
            opacity: 0; /* Start hidden */
        }
        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(241, 245, 249, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(203, 213, 225, 0.8);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.8);
        }
      `}</style>
    </div>
  );
};

export default SummaryPage;
