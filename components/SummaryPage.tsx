
import React, { useState, useEffect } from 'react';
import { db } from '../firebase-config';
import { type PageConfig, type LoginEntry, type SurveyTheme } from '../types';
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
  onSelectSurvey: () => void;
  onSelectSurveyResults: () => void;
  currentSurveyThemes: SurveyTheme[];
  onUpdateSurveyThemes: (newThemes: SurveyTheme[]) => Promise<void>;
}

const iconComponents: Record<string, React.ReactNode> = {
    'Fiches transverses': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    'Default': <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
};

const PageCard: React.FC<{ page: PageConfig, onClick: () => void, isAdmin: boolean, onDeletePage: (id: string) => void }> = ({ page, onClick, isAdmin, onDeletePage }) => (
    <div onClick={onClick} className="group relative bg-white/60 backdrop-blur-md rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 cursor-pointer hover:-translate-y-1">
        <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-2xl bg-blue-100 text-blue-600 shadow-inner">
                {iconComponents[page.title] || iconComponents['Default']}
            </div>
        </div>
        <h3 className="text-lg font-bold text-gray-800 leading-tight mb-1 group-hover:text-blue-700 transition-colors">{page.title}</h3>
        {page.subtitle && <p className="text-xs text-gray-500 font-medium">{page.subtitle}</p>}
    </div>
);

const ToolCard: React.FC<{ title: string, desc: string, icon: React.ReactNode, color: string, onClick: () => void }> = ({ title, desc, icon, color, onClick }) => (
    <div onClick={onClick} className="group flex items-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer hover:bg-white">
        <div className={`p-3 rounded-xl mr-4 ${color}`}>{icon}</div>
        <div>
            <h4 className="font-bold text-gray-800 group-hover:text-gray-900">{title}</h4>
            <p className="text-xs text-gray-500">{desc}</p>
        </div>
    </div>
);

const SummaryPage: React.FC<SummaryPageProps> = ({ currentUser, pages, onSelectPage, onSelectHistory, onSelectSynthesis, onSelectUserSynthesis, onSelectConfiguration, onSelectAdminDiagnostics, onSelectTransverseDomains, onSelectExpertResponses, onDeletePage, onLogout, onSelectSurvey, onSelectSurveyResults, currentSurveyThemes, onUpdateSurveyThemes }) => {
  const isAdmin = currentUser === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'saisie' | 'pilotage' | 'configuration'>('saisie');

  const subUnitPages = pages.filter(p => p.title.includes('GEH') || p.title.includes('GMH'));
  const staffPages = pages.filter(p => !p.title.includes('GEH') && !p.title.includes('GMH') && p.title !== 'Fiches transverses');

  return (
    <div className="relative min-h-screen pb-12">
      <header className="flex justify-between items-center mb-6 pt-2">
         <div>
             <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Sommaire</h1>
             <p className="text-slate-500 font-medium">Pilotage et Consolidation Budgétaire</p>
         </div>
         <button onClick={onLogout} className="p-2 bg-white rounded-xl shadow-sm hover:bg-red-50 text-slate-400 hover:text-red-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
         </button>
      </header>

      <div className="flex justify-center mb-10">
          <div className="bg-white/50 p-1.5 rounded-full border border-white/60 shadow-sm backdrop-blur-md flex items-center gap-1">
              <button onClick={() => setActiveTab('saisie')} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'saisie' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-500 hover:text-gray-700'}`}>🚀 Espace Saisie</button>
              <button onClick={() => setActiveTab('pilotage')} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'pilotage' ? 'bg-white text-emerald-600 shadow-md scale-105' : 'text-gray-500 hover:text-gray-700'}`}>📊 Espace Pilotage</button>
              <button onClick={() => setActiveTab('configuration')} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'configuration' ? 'bg-white text-slate-600 shadow-md scale-105' : 'text-gray-500 hover:text-gray-700'}`}>⚙️ Aide & Config</button>
          </div>
      </div>

      {activeTab === 'saisie' && (
        <div className="space-y-10 animate-fade-in-up">
            <section className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">📋 Sondage Priorisation 2027</h2>
                    <p className="opacity-90">Partagez votre avis sur les {currentSurveyThemes.length} thèmes stratégiques issus de la démarche BBZ HSO 2025.</p>
                </div>
                <button onClick={onSelectSurvey} className="px-8 py-4 bg-white text-indigo-600 font-black rounded-2xl shadow-xl hover:scale-105 transition-all">
                    VOTER MAINTENANT
                </button>
            </section>

            <section>
                <div className="flex items-center gap-3 mb-6"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span><h2 className="text-xl font-bold text-slate-800">Sous Unités</h2></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {subUnitPages.map(p => <PageCard key={p.id} page={p} onClick={() => onSelectPage(pages.indexOf(p))} isAdmin={isAdmin} onDeletePage={() => {}} />)}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-3 mb-6"><span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span><h2 className="text-xl font-bold text-slate-800">Etat Major Unité</h2></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div onClick={onSelectTransverseDomains} className="bg-orange-50/80 backdrop-blur-md rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all border border-orange-100/50 cursor-pointer hover:-translate-y-1">
                        <div className="p-3 rounded-2xl bg-orange-200 text-orange-700 mb-4 inline-block"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                        <h3 className="text-lg font-bold text-gray-800 leading-tight">Domaines transverses</h3>
                    </div>
                    {staffPages.map(p => <PageCard key={p.id} page={p} onClick={() => onSelectPage(pages.indexOf(p))} isAdmin={isAdmin} onDeletePage={() => {}} />)}
                </div>
            </section>
        </div>
      )}

      {activeTab === 'pilotage' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in-up">
            {isAdmin && (
                <ToolCard title="Résultats du Sondage" desc="Classement des thèmes" color="bg-rose-100 text-rose-600" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} onClick={onSelectSurveyResults} />
            )}
            <ToolCard title="Synthèse par Utilisateur" desc="Vue consolidée métier" color="bg-purple-100 text-purple-600" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} onClick={onSelectUserSynthesis} />
            {isAdmin && (
                <>
                    <ToolCard title="Synthèse Globale" desc="Consolidation tous leviers" color="bg-emerald-100 text-emerald-600" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>} onClick={onSelectSynthesis} />
                    <ToolCard title="Suivi Réponses Experts" desc="Traitement sollicitations" color="bg-indigo-100 text-indigo-600" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>} onClick={onSelectExpertResponses} />
                    <ToolCard title="Historique Global" desc="Traçabilité modifications" color="bg-orange-100 text-orange-600" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} onClick={onSelectHistory} />
                </>
            )}
        </div>
      )}

      {activeTab === 'configuration' && (
        <ConfigurationPage 
          onBack={() => setActiveTab('saisie')} 
          currentUser={currentUser} 
          currentSurveyThemes={currentSurveyThemes}
          onUpdateSurveyThemes={onUpdateSurveyThemes}
        />
      )}
    </div>
  );
};

export default SummaryPage;
