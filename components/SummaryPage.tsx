
import React, { useState, useEffect } from 'react';
import { db } from '../firebase-config';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { type PageConfig, type LoginEntry } from '../types';
import { teamMembers } from '../config';
import ConfigurationPage from './ConfigurationPage';

interface SummaryPageProps {
  currentUser: string;
  pages: PageConfig[];
  onSelectPage: (index: number) => void;
  onSelectHistory: () => void;
  onSelectSynthesis: () => void;
  onSelectUserSynthesis: () => void;
  onSelectConfiguration: () => void;
  onSelectAdminDiagnostics: () => void;
  onSelectTransverseDomains: () => void;
  onSelectExpertResponses: () => void;
  onDeletePage: (pageId: string) => void;
  onLogout: () => void;
}

interface StatItem {
    label: string;
    value: string | number;
    subtext?: string;
    colorClass?: string;
}

// Configuration des icônes par titre de page
const iconComponents: Record<string, React.ReactNode> = {
    'Fiches transverses': (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    'Remontée GEH AA': (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    ),
    'Remontée GEH AG': (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
    ),
    'Remontée GEH TA': (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
    ),
    'Remontée GMH': (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    'Default': (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
};

interface PageCardProps {
    page: PageConfig;
    onClick: () => void;
    isAdmin: boolean;
    onDeletePage: (pageId: string) => void;
}

const PageCard: React.FC<PageCardProps> = ({ page, onClick, isAdmin, onDeletePage }) => {
    // Détermination des styles de couleur en fonction du titre
    let styleConfig = {
        cardBg: 'bg-white/60',
        iconBg: 'bg-blue-100 text-blue-600',
        border: 'group-hover:border-blue-300 border-white/50',
        titleHover: 'group-hover:text-blue-700'
    };

    if (page.title.includes('GEH AG')) {
        styleConfig = {
            cardBg: 'bg-purple-50/90', // Fond violet léger pour la tuile
            iconBg: 'bg-purple-100 text-purple-600',
            border: 'group-hover:border-purple-300 border-purple-100/50',
            titleHover: 'group-hover:text-purple-700'
        };
    } else if (page.title.includes('GEH AA')) {
        styleConfig = {
            cardBg: 'bg-sky-50/90', // Fond bleu ciel léger pour la tuile
            iconBg: 'bg-sky-100 text-sky-600',
            border: 'group-hover:border-sky-300 border-sky-100/50',
            titleHover: 'group-hover:text-sky-700'
        };
    } else if (page.title.includes('GEH TA')) {
        styleConfig = {
            cardBg: 'bg-orange-50/90', // Fond orange léger pour la tuile
            iconBg: 'bg-orange-100 text-orange-600',
            border: 'group-hover:border-orange-300 border-orange-100/50',
            titleHover: 'group-hover:text-orange-700'
        };
    } else if (page.title.includes('GEH') || page.title.includes('GMH')) {
        // Fallback pour les autres sous-unités (GMH, etc.)
        styleConfig = {
            cardBg: 'bg-amber-50/60',
            iconBg: 'bg-amber-100 text-amber-600',
            border: 'group-hover:border-amber-300',
            titleHover: 'group-hover:text-amber-700'
        };
    }
    
    return (
      <div 
        onClick={onClick}
        className={`group relative ${styleConfig.cardBg} backdrop-blur-md rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border cursor-pointer ${styleConfig.border} hover:-translate-y-1`}
      >
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl ${styleConfig.iconBg} shadow-inner`}>
                {iconComponents[page.title] || iconComponents['Default']}
            </div>
            {isAdmin && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-opacity"
                    title="Supprimer ce tableau"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
        </div>
        <h3 className={`text-lg font-bold text-gray-800 leading-tight mb-1 ${styleConfig.titleHover} transition-colors`}>
            {page.title}
        </h3>
        {page.subtitle && (
            <p className="text-xs text-gray-500 font-medium">{page.subtitle}</p>
        )}
        {page.isFinished && (
            <div className="absolute top-6 right-6">
                 <span className="flex h-3 w-3">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
            </div>
        )}
      </div>
    );
};

interface ToolCardProps {
    title: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, desc, icon, color, onClick }) => (
    <div 
        onClick={onClick}
        className={`group flex items-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer hover:bg-white`}
    >
        <div className={`p-3 rounded-xl mr-4 ${color}`}>
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-gray-800 group-hover:text-gray-900">{title}</h4>
            <p className="text-xs text-gray-500">{desc}</p>
        </div>
    </div>
);

interface AdminWidgetProps {
    title: string;
    stats: StatItem[];
    loading: boolean;
    emptyMsg: string;
}

const AdminWidget: React.FC<AdminWidgetProps> = ({ title, stats, loading, emptyMsg }) => (
      <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-sm border border-white/50 flex flex-col h-64">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{title}</h4>
          {loading ? (
               <div className="flex-1 flex items-center justify-center">
                   <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
               </div>
          ) : (
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                  {stats.length > 0 ? (
                      stats.map((stat: StatItem, i: number) => (
                          <div key={i} className="flex justify-between items-center text-sm">
                              <span className="font-medium text-gray-700">{stat.label}</span>
                              <div className="text-right">
                                  <span className={`block font-bold text-gray-900 ${stat.colorClass || ''}`}>{stat.value}</span>
                                  {stat.subtext && <span className="text-xs text-gray-400">{stat.subtext}</span>}
                              </div>
                          </div>
                      ))
                  ) : (
                      <p className="text-xs text-gray-400 text-center mt-10">{emptyMsg}</p>
                  )}
              </div>
          )}
      </div>
);

const SummaryPage: React.FC<SummaryPageProps> = ({
  currentUser,
  pages,
  onSelectPage,
  onSelectHistory,
  onSelectSynthesis,
  onSelectUserSynthesis,
  onSelectConfiguration,
  onSelectAdminDiagnostics,
  onSelectTransverseDomains,
  onSelectExpertResponses,
  onDeletePage,
  onLogout,
}) => {
  const isAdmin = currentUser === 'ADMIN';
  const [activeUsersStats, setActiveUsersStats] = useState<StatItem[]>([]);
  const [contributionStats, setContributionStats] = useState<StatItem[]>([]);
  const [finishedStats, setFinishedStats] = useState<StatItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // État pour les onglets majeurs
  const [activeTab, setActiveTab] = useState<'saisie' | 'pilotage' | 'configuration'>('saisie');

  useEffect(() => {
    const fetchStats = async () => {
      if (!isAdmin) {
        setLoadingStats(false);
        return;
      }

      try {
        // 1. Récupérer les utilisateurs actifs (Logins)
        const loginsRef = collection(db, 'logins');
        // On récupère tout pour filtrer en JS car 'limit' s'applique avant le filtrage distinct
        const qLogins = query(loginsRef, orderBy('timestamp', 'desc')); 
        const loginSnaps = await getDocs(qLogins);
        
        const userCounts: Record<string, number> = {};
        loginSnaps.forEach(doc => {
            const data = doc.data() as LoginEntry;
            if (data.user && data.user !== 'ADMIN') { // Exclure l'admin
                userCounts[data.user] = (userCounts[data.user] || 0) + 1;
            }
        });

        const sortedUsers = Object.entries(userCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([user, count]) => ({
                label: user,
                value: count,
                subtext: 'connexions'
            }));

        setActiveUsersStats(sortedUsers);

        // 2. Récupérer le volume des contributions
        // On a besoin de la liste des storageKeys
        let globalSums = new Array(teamMembers.length).fill(0);
        
        const docReads = pages.map(p => {
             const ref = doc(db, 'pagesData', p.storageKey);
             return getDoc(ref);
        });
        
        const docs = await Promise.all(docReads);
        
        docs.forEach(d => {
            if (d.exists()) {
                const rows = d.data().rows || [];
                rows.forEach((r: any) => {
                    if (r.contributions && Array.isArray(r.contributions)) {
                        r.contributions.forEach((val: any, idx: number) => {
                            globalSums[idx] += (Number(val) || 0);
                        });
                    }
                });
            }
        });

        const sortedContributions = teamMembers
            .map((tm, idx) => ({
                label: tm,
                value: globalSums[idx] > 0 ? (globalSums[idx] / 1000).toFixed(1) + ' k€' : '0',
                rawValue: globalSums[idx]
            }))
            .filter(item => item.label !== 'ADMIN') // Exclure l'admin
            .sort((a, b) => b.rawValue - a.rawValue)
            .map(item => ({ label: item.label, value: item.value }));

        setContributionStats(sortedContributions);

        // 3. Récupérer les saisies terminées
        const finishedList = pages
            .filter(p => p.isFinished)
            .map(p => ({
                label: p.title.replace('Remontée ', ''), // Simplifier le nom
                value: 'Validé',
                colorClass: 'text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded'
            }));
        setFinishedStats(finishedList);

      } catch (error) {
        console.error("Erreur chargement stats dashboard", error);
      } finally {
        setLoadingStats(false);
      }
    };
    
    fetchStats();
  }, [isAdmin, pages]);

  // Group pages by section
  const subUnitPages = pages.filter(p => {
      const t = p.title.toUpperCase();
      return t.includes('GEH') || t.includes('GMH');
  });

  const staffPages = pages.filter(p => {
      const t = p.title.toUpperCase();
      // On exclut les GEH/GMH, mais aussi explicitement 'Fiches transverses' car elle est gérée à part via le widget
      return !t.includes('GEH') && !t.includes('GMH') && p.title !== 'Fiches transverses';
  });

  return (
    <div className="relative min-h-screen">
      {/* Background Living Light */}
      <div className="fixed inset-0 z-[-1] bg-slate-50 overflow-hidden pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
           <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
           <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-amber-100/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      <header className="flex justify-between items-center mb-6 pt-2">
         <div>
             <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Sommaire</h1>
             <p className="text-slate-500 font-medium">Pilotage et Consolidation Budgétaire</p>
         </div>
         <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                 <p className="text-sm font-bold text-slate-700">{isAdmin ? "Administrateur" : currentUser}</p>
                 <div className="flex items-center justify-end gap-1.5">
                     <span className="w-2 h-2 rounded-full bg-green-500"></span>
                     <p className="text-xs text-slate-400">En ligne</p>
                 </div>
             </div>
             <button onClick={onLogout} className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-red-50 transition-all text-slate-400 hover:text-red-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
             </button>
         </div>
      </header>

      {/* NAVIGATION TABS (SWITCH) */}
      <div className="flex justify-center mb-10">
          <div className="bg-white/50 p-1.5 rounded-full border border-white/60 shadow-sm backdrop-blur-md flex items-center gap-1">
              <button 
                  onClick={() => setActiveTab('saisie')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                      activeTab === 'saisie' 
                      ? 'bg-white text-blue-600 shadow-md transform scale-105' 
                      : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
                  }`}
              >
                  🚀 Espace Saisie
              </button>
              <button 
                  onClick={() => setActiveTab('pilotage')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                      activeTab === 'pilotage' 
                      ? 'bg-white text-emerald-600 shadow-md transform scale-105' 
                      : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
                  }`}
              >
                  📊 Espace Pilotage
              </button>
              <button 
                  onClick={() => setActiveTab('configuration')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                      activeTab === 'configuration' 
                      ? 'bg-white text-slate-600 shadow-md transform scale-105' 
                      : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
                  }`}
              >
                  ⚙️ Aide & Config
              </button>
          </div>
      </div>
      
      {/* CONTENU : ESPACE SAISIE */}
      {activeTab === 'saisie' && (
        <div className="animate-fade-in-up">
            {/* SECTION 1: Remontée Sous Unité */}
            <section className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <h2 className="text-xl font-bold text-slate-800">Remontée Sous Unité</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {subUnitPages.map((page) => (
                        <PageCard 
                            key={page.id} 
                            page={page} 
                            onClick={() => onSelectPage(pages.findIndex(p => p.id === page.id))} 
                            isAdmin={isAdmin}
                            onDeletePage={onDeletePage}
                        />
                    ))}
                </div>
            </section>

            {/* SECTION 2: Etat Major Unité */}
            <section className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <h2 className="text-xl font-bold text-slate-800">Etat Major Unité</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* 1. Carte Spéciale "Domaines transverses" */}
                    <div 
                        onClick={onSelectTransverseDomains}
                        className="group relative bg-orange-50/80 backdrop-blur-md rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-100/50 cursor-pointer group-hover:border-orange-300 hover:-translate-y-1"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-2xl bg-orange-200 text-orange-700 shadow-inner">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 leading-tight mb-1 group-hover:text-orange-800 transition-colors">
                            Domaines transverses
                        </h3>
                    </div>

                    {/* 2. Autres cartes dynamiques */}
                    {staffPages.map((page) => (
                        <PageCard 
                            key={page.id} 
                            page={page} 
                            onClick={() => onSelectPage(pages.findIndex(p => p.id === page.id))} 
                            isAdmin={isAdmin}
                            onDeletePage={onDeletePage}
                        />
                    ))}
                </div>
            </section>
        </div>
      )}

      {/* CONTENU : ESPACE PILOTAGE */}
      {activeTab === 'pilotage' && (
        <div className="animate-fade-in-up">
            {/* Admin Dashboard Widgets */}
            {isAdmin && (
                <section className="mb-12">
                     <div className="flex items-center gap-3 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        <h2 className="text-xl font-bold text-slate-800">Tableau de Bord</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <AdminWidget 
                            title="Utilisateurs Actifs" 
                            stats={activeUsersStats} 
                            loading={loadingStats} 
                            emptyMsg="Aucune connexion récente"
                        />
                        <AdminWidget 
                            title="Volume des Contributions" 
                            stats={contributionStats} 
                            loading={loadingStats} 
                            emptyMsg="Aucune contribution"
                        />
                        <AdminWidget 
                            title="Saisies Terminées" 
                            stats={finishedStats} 
                            loading={loadingStats} 
                            emptyMsg="Aucun tableau validé"
                        />
                    </div>
                </section>
            )}

            {/* SECTION 3: Outils */}
            <section className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <h2 className="text-xl font-bold text-slate-800">Outils d'Analyse</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Carte Synthèse par Utilisateur (Pour tout le monde) */}
                    <ToolCard
                        title="Synthèse par Utilisateur"
                        desc="Vue consolidée par métier"
                        color="bg-purple-100 text-purple-600"
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                        onClick={onSelectUserSynthesis}
                    />
                    
                    {/* NOTE: Configuration & Aide a été déplacé dans son propre onglet */}

                    {isAdmin && (
                        <>
                            <ToolCard
                                title="Synthèse Globale"
                                desc="Consolidation de tous les leviers"
                                color="bg-emerald-100 text-emerald-600"
                                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                                onClick={onSelectSynthesis}
                            />
                            <ToolCard
                                title="Suivi Réponses Experts"
                                desc="Traitement des sollicitations"
                                color="bg-indigo-100 text-indigo-600"
                                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
                                onClick={onSelectExpertResponses}
                            />
                            <ToolCard
                                title="Historique Global"
                                desc="Traçabilité des modifications"
                                color="bg-orange-100 text-orange-600"
                                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                onClick={onSelectHistory}
                            />
                            <ToolCard
                                title="Diagnostic Admin"
                                desc="JSON & Données brutes"
                                color="bg-gray-200 text-gray-700"
                                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                                onClick={onSelectAdminDiagnostics}
                            />
                        </>
                    )}
                </div>
            </section>
        </div>
      )}

      {/* CONTENU : AIDE & CONFIGURATION */}
      {activeTab === 'configuration' && (
          <div className="animate-fade-in-up">
              <ConfigurationPage onBack={() => setActiveTab('saisie')} currentUser={currentUser} />
          </div>
      )}

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
            animation: fadeInUp 0.5s ease-out forwards;
        }
         .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default SummaryPage;
