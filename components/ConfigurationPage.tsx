
import React, { useState, useEffect, useRef } from 'react';
import { loginCodes, teamMembers, surveyThemes as initialSurveyThemes } from '../config';
import { db } from '../firebase-config';
import { type RowData, type PageConfig, type AnnouncementConfig, type LoginEntry, type SurveyTheme, type SurveyAxis } from '../types';

interface ConfigurationPageProps {
  onBack: () => void;
  currentUser: string;
  currentSurveyThemes: SurveyTheme[];
  onUpdateSurveyThemes: (newThemes: SurveyTheme[]) => Promise<void>;
}

interface ConnectionStat {
    user: string;
    lastConnection: string;
    count: number;
}

interface PageVisit {
    user: string;
    pageId: string;
    pageTitle: string;
    lastVisit: string;
}

const ConfigurationPage: React.FC<ConfigurationPageProps> = ({ onBack, currentUser, currentSurveyThemes, onUpdateSurveyThemes }) => {
  const [activeTab, setActiveTab] = useState('structure');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for Survey Editor
  const [editableThemes, setEditableThemes] = useState<SurveyTheme[]>([]);
  const [surveySaveStatus, setSurveySaveStatus] = useState('');
  const isEditingSurvey = useRef(false);

  // State for Announcements
  const [announcementConfig, setAnnouncementConfig] = useState<AnnouncementConfig>({
      isActive: false,
      globalMessage: '',
      userMessages: {}
  });
  const [announcementSaveStatus, setAnnouncementSaveStatus] = useState('');

  // State for Connection Stats
  const [connectionStats, setConnectionStats] = useState<ConnectionStat[]>([]);
  const [matrixPages, setMatrixPages] = useState<PageConfig[]>([]);
  const [visitsData, setVisitsData] = useState<PageVisit[]>([]);

  const isAdmin = currentUser === 'ADMIN';

  const tabs = [
    { id: 'structure', label: "Structure de l'application" },
    { id: 'saisies', label: 'Guide utilisateur & Nouveautés' },
  ];

  if (isAdmin) {
    tabs.push({ id: 'survey', label: 'Éditeur de Sondage' });
    tabs.push({ id: 'communication', label: 'Communication' });
    tabs.push({ id: 'connexions', label: 'Suivi des Connexions' });
    tabs.push({ id: 'droits', label: 'Droits des administrateurs' });
    tabs.push({ id: 'codes', label: "Codes d'accès" });
    tabs.push({ id: 'maintenance', label: "Maintenance & Reset" });
  }
  
  // Initialize survey editor only if not currently editing to avoid wiping unsaved changes
  useEffect(() => {
      if (!isEditingSurvey.current) {
          setEditableThemes(JSON.parse(JSON.stringify(currentSurveyThemes)));
      }
  }, [currentSurveyThemes]);

  // Load announcements
  useEffect(() => {
      if (activeTab === 'communication' && isAdmin) {
          const loadAnnouncements = async () => {
              setIsLoading(true);
              try {
                  const docRef = db.collection('appConfig').doc('announcements');
                  const docSnap = await docRef.get();
                  if (docSnap.exists) {
                      setAnnouncementConfig(docSnap.data() as AnnouncementConfig);
                  }
              } catch (error) {
                  console.error("Erreur chargement annonces", error);
              } finally {
                  setIsLoading(false);
              }
          };
          loadAnnouncements();
      }
  }, [activeTab, isAdmin]);

  // Load connections tracking
  useEffect(() => {
      if (activeTab === 'connexions' && isAdmin) {
          const loadConnections = async () => {
              setIsLoading(true);
              try {
                  const loginsRef = db.collection('logins');
                  const q = loginsRef.orderBy('timestamp', 'desc');
                  const snapshot = await q.get();
                  
                  const statsMap: Record<string, ConnectionStat> = {};
                  Object.values(loginCodes).forEach(user => {
                      if (user !== 'ADMIN') statsMap[user] = { user, lastConnection: '', count: 0 };
                  });

                  snapshot.forEach(doc => {
                      const data = doc.data() as LoginEntry;
                      if (data.user && data.user !== 'ADMIN' && statsMap[data.user]) {
                          statsMap[data.user].count += 1;
                          if (!statsMap[data.user].lastConnection) {
                              statsMap[data.user].lastConnection = data.timestamp;
                          }
                      }
                  });

                  setConnectionStats(Object.values(statsMap).sort((a, b) => {
                      if (!a.lastConnection) return 1;
                      if (!b.lastConnection) return -1;
                      return new Date(b.lastConnection).getTime() - new Date(a.lastConnection).getTime();
                  }));
              } catch (error) {
                  console.error("Erreur chargement connexions", error);
              } finally {
                  setIsLoading(false);
              }
          };
          loadConnections();
      }
  }, [activeTab, isAdmin]);

  const handleSaveAnnouncements = async () => {
      setIsLoading(true);
      setAnnouncementSaveStatus('');
      try {
          const docRef = db.collection('appConfig').doc('announcements');
          await docRef.set(announcementConfig);
          setAnnouncementSaveStatus('✅ Configuration enregistrée !');
          setTimeout(() => setAnnouncementSaveStatus(''), 4000);
      } catch (error) {
          console.error("Erreur sauvegarde annonces", error);
          setAnnouncementSaveStatus('❌ Erreur de sauvegarde.');
      } finally {
          setIsLoading(false);
      }
  };

  const handleSaveSurvey = async () => {
      setIsLoading(true);
      setSurveySaveStatus('');
      try {
          await onUpdateSurveyThemes(editableThemes);
          isEditingSurvey.current = false;
          setSurveySaveStatus('✅ Structure enregistrée en base !');
          setTimeout(() => setSurveySaveStatus(''), 4000);
      } catch (e) {
          setSurveySaveStatus('❌ Erreur lors de la sauvegarde.');
      } finally {
          setIsLoading(false);
      }
  };

  const handleSyncSurveyStructure = async () => {
      if (!window.confirm(`⚠️ Forcer la structure officielle du code (${initialSurveyThemes.length} thèmes) ?`)) return;
      setIsLoading(true);
      try {
          await onUpdateSurveyThemes(initialSurveyThemes);
          alert("Succès : Structure synchronisée.");
          window.location.reload();
      } catch (e) {
          alert("Erreur technique.");
      } finally {
          setIsLoading(false);
      }
  };

  // --- Survey Management (CRITICAL FIXES HERE) ---

  const markAsEditing = () => {
      isEditingSurvey.current = true;
  };

  const handleAddTheme = () => {
      markAsEditing();
      const newTheme: SurveyTheme = {
          id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          title: 'Nouveau Thème',
          icon: '📌',
          objective: 'Objectif à définir',
          axes: [{ id: `a_${Date.now()}`, label: 'Nouvel axe de réflexion' }]
      };
      setEditableThemes(prev => [...prev, newTheme]);
  };

  const handleDeleteTheme = (themeIndex: number) => {
      if (!window.confirm("🗑️ Supprimer ce thème et TOUS ses axes ?")) return;
      markAsEditing();
      setEditableThemes(prev => prev.filter((_, idx) => idx !== themeIndex));
  };

  const handleThemeFieldChange = (themeIndex: number, field: keyof SurveyTheme, value: string) => {
      markAsEditing();
      setEditableThemes(prev => {
          const updated = [...prev];
          updated[themeIndex] = { ...updated[themeIndex], [field]: value };
          return updated;
      });
  };

  const handleAddAxis = (themeIndex: number) => {
      markAsEditing();
      setEditableThemes(prev => {
          const updated = [...prev];
          const newAxis: SurveyAxis = {
              id: `a_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              label: 'Nouvel axe'
          };
          updated[themeIndex].axes = [...updated[themeIndex].axes, newAxis];
          return updated;
      });
  };

  const handleAxisLabelChange = (themeIndex: number, axisIndex: number, newLabel: string) => {
      markAsEditing();
      setEditableThemes(prev => {
          const updated = [...prev];
          const updatedAxes = [...updated[themeIndex].axes];
          updatedAxes[axisIndex] = { ...updatedAxes[axisIndex], label: newLabel };
          updated[themeIndex].axes = updatedAxes;
          return updated;
      });
  };

  const handleDeleteAxis = (themeIndex: number, axisIndex: number) => {
      if (!window.confirm("Supprimer cet axe ?")) return;
      markAsEditing();
      setEditableThemes(prev => {
          const updated = [...prev];
          updated[themeIndex].axes = updated[themeIndex].axes.filter((_, idx) => idx !== axisIndex);
          return updated;
      });
  };

  const handleResetSurvey = async () => {
      if (!window.confirm("⚠️ Action irréversible : Supprimer TOUS les votes et réinitialiser ?")) return;
      setIsLoading(true);
      try {
          const collectionRef = db.collection('surveys');
          const snapshot = await collectionRef.get();
          const batch = db.batch();
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          alert("Sondage réinitialisé.");
          window.location.reload();
      } catch (e) {
          alert("Erreur.");
      } finally {
          setIsLoading(false);
      }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'survey':
        if (!isAdmin) return null;
        return (
            <div className="max-w-4xl animate-fade-in-up pb-40">
                <div className="flex justify-between items-center mb-10 bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 shadow-sm">
                    <div>
                        <h3 className="text-2xl font-black text-indigo-700">Gestion du Sondage</h3>
                        <p className="text-indigo-400 text-sm font-bold">Configurez les thèmes et les axes de priorisation.</p>
                    </div>
                    <button onClick={handleAddTheme} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        AJOUTER UN THÈME
                    </button>
                </div>

                <div className="space-y-8">
                    {editableThemes.map((theme, tIdx) => (
                        <div key={theme.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden group hover:border-indigo-200 transition-all duration-300">
                            <div className="p-8 bg-gray-50/50 border-b border-gray-100 flex justify-between items-start gap-4">
                                <div className="flex-1 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-24">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 block text-center">Icône</label>
                                            <input type="text" className="w-full text-3xl text-center bg-white border border-gray-200 rounded-2xl px-2 py-3" value={theme.icon} onChange={(e) => handleThemeFieldChange(tIdx, 'icon', e.target.value)} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 block">Titre du Thème #{tIdx + 1}</label>
                                            <input type="text" className="w-full text-xl font-black text-gray-800 bg-white border border-gray-200 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-100 outline-none" value={theme.title} onChange={(e) => handleThemeFieldChange(tIdx, 'title', e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 block">Objectif de la thématique</label>
                                        <input type="text" className="w-full text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-100 outline-none" value={theme.objective} onChange={(e) => handleThemeFieldChange(tIdx, 'objective', e.target.value)} />
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteTheme(tIdx)} className="p-4 bg-rose-50 text-rose-400 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm" title="Supprimer ce thème">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                            
                            <div className="p-8 space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Axes de réflexion détaillés</label>
                                {theme.axes.map((axis, aIdx) => (
                                    <div key={axis.id} className="flex items-center gap-4 animate-fade-in-up">
                                        <span className="text-xs font-black text-indigo-300 w-6">{aIdx + 1}.</span>
                                        <input type="text" className="flex-1 p-4 bg-gray-50 border border-gray-100 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-2xl text-sm transition-all outline-none" value={axis.label} onChange={(e) => handleAxisLabelChange(tIdx, aIdx, e.target.value)} />
                                        <button onClick={() => handleDeleteAxis(tIdx, aIdx)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => handleAddAxis(tIdx)} className="w-full mt-4 py-4 border-2 border-dashed border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-[2rem] hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all">
                                    + Ajouter un axe de réflexion
                                </button>
                            </div>
                        </div>
                    ))}
                    {editableThemes.length === 0 && (
                        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-[3rem] text-gray-400 font-bold">
                            Aucun thème configuré. Cliquez sur le bouton "Ajouter un thème".
                        </div>
                    )}
                </div>

                <div className="mt-12 sticky bottom-8 bg-white/90 backdrop-blur-xl p-8 border border-white shadow-2xl rounded-[3rem] z-20 flex justify-between items-center ring-1 ring-black/5">
                    <div className="flex-1">
                        {surveySaveStatus && <span className="text-green-600 font-black text-sm animate-pulse">{surveySaveStatus}</span>}
                    </div>
                    <button onClick={handleSaveSurvey} disabled={isLoading} className="px-16 py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50">
                        {isLoading ? 'ENREGISTREMENT...' : 'SAUVEGARDER LA STRUCTURE'}
                    </button>
                </div>
            </div>
        );
      case 'communication':
        if (!isAdmin) return null;
        return (
            <div className="max-w-4xl animate-fade-in-up">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                    <div className="p-8 bg-blue-50/50 border-b border-gray-100">
                        <h3 className="text-2xl font-black text-blue-700 mb-2">Message d'Accueil (Announce)</h3>
                        <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Diffuser une information à la connexion des utilisateurs</p>
                    </div>
                    
                    <div className="p-8 space-y-8">
                        {/* Toggle d'activation */}
                        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
                            <div>
                                <h4 className="font-black text-gray-800">Activer le message d'accueil</h4>
                                <p className="text-xs text-gray-400 font-bold">Le message s'affichera immédiatement après la saisie du code d'accès.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={announcementConfig.isActive}
                                    onChange={(e) => setAnnouncementConfig(prev => ({...prev, isActive: e.target.checked}))}
                                />
                                <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* Textarea du message */}
                        <div className={`space-y-2 transition-all duration-500 ${announcementConfig.isActive ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none scale-95'}`}>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-2">Contenu du message global</label>
                            <textarea 
                                className="w-full p-6 bg-white border border-gray-200 rounded-[2rem] h-64 focus:ring-4 focus:ring-blue-50/50 focus:border-blue-400 outline-none transition-all font-medium text-gray-700 leading-relaxed shadow-inner" 
                                placeholder="Saisissez ici le message qui sera visible par toutes les équipes..." 
                                value={announcementConfig.globalMessage} 
                                onChange={e => setAnnouncementConfig(prev => ({...prev, globalMessage: e.target.value}))} 
                            />
                        </div>

                        <div className="flex justify-between items-center pt-4">
                            <span className="text-green-600 font-black text-sm">{announcementSaveStatus}</span>
                            <button 
                                onClick={handleSaveAnnouncements} 
                                disabled={isLoading} 
                                className="px-12 py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 shadow-2xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isLoading ? 'ENREGISTREMENT...' : 'SAUVEGARDER LA CONFIGURATION'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
      case 'connexions':
        if (!isAdmin) return null;
        return (
            <div className="prose max-w-none">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">Suivi des Connexions</h3>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr><th className="py-3.5 pl-4 text-left text-sm font-semibold">Utilisateur</th><th className="px-3 text-left text-sm font-semibold">Dernière connexion</th><th className="px-3 text-center text-sm font-semibold">Statut</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {connectionStats.map((stat) => (
                                <tr key={stat.user}>
                                    <td className="py-4 pl-4 text-sm font-medium text-gray-900">{stat.user}</td>
                                    <td className="px-3 py-4 text-sm text-gray-500">{stat.lastConnection ? new Date(stat.lastConnection).toLocaleString('fr-FR') : '—'}</td>
                                    <td className="px-3 py-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(stat.lastConnection)}`}>{stat.lastConnection ? 'Actif' : 'Inactif'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
      case 'maintenance':
        if (!isAdmin) return null;
        return (
            <div className="prose max-w-none space-y-12">
                <h3 className="text-2xl font-black text-rose-700">Maintenance & Réinitialisation</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-blue-50 p-8 border border-blue-100 rounded-[2.5rem] shadow-sm">
                        <h4 className="text-lg font-black text-blue-800 mb-2">Synchronisation forcée</h4>
                        <p className="text-sm text-blue-700 mb-6">Réapplique la structure officielle par défaut (11 thèmes) sans toucher aux données.</p>
                        <button onClick={handleSyncSurveyStructure} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700">SYNCHRONISER (SOURCE)</button>
                    </div>

                    <div className="bg-rose-50 p-8 border border-rose-100 rounded-[2.5rem] shadow-sm">
                        <h4 className="text-lg font-black text-rose-800 mb-2">Réinitialisation complète</h4>
                        <p className="text-sm text-rose-700 mb-6">Supprime <strong>TOUS les votes</strong> du sondage et réinitialise la structure.</p>
                        <button onClick={handleResetSurvey} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl shadow-lg hover:bg-rose-700">RÀZ COMPLÈTE DU SONDAGE</button>
                    </div>
                </div>
            </div>
        );
      default: return (
        <div className="prose max-w-none text-gray-800">
            <h3 className="text-xl font-semibold">Mission de l'application</h3>
            <p><strong>Activation des leviers BBZ budget 26</strong> est l'outil central pour piloter les contributions financières.</p>
        </div>
      );
    }
  };

  const getStatusColor = (dateString: string) => {
      if (!dateString) return 'bg-gray-100 text-gray-500';
      const diffDays = (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 3600 * 24);
      if (diffDays < 3) return 'bg-green-100 text-green-700';
      if (diffDays < 10) return 'bg-yellow-100 text-yellow-700';
      return 'bg-red-100 text-red-700';
  };

  return (
    <>
      <header className="mb-8 grid grid-cols-3 items-center">
        <div className="justify-self-start"><button onClick={onBack} className="py-2.5 px-6 border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all">← Retour</button></div>
        <div className="justify-self-center text-center"><h1 className="text-3xl font-black text-gray-800 tracking-tight">Configuration</h1></div>
      </header>
      <main className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 overflow-x-auto bg-gray-50/50">
          <nav className="-mb-px flex space-x-6 px-10" aria-label="Tabs">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400'} whitespace-nowrap py-6 px-1 border-b-2 font-black text-xs uppercase tracking-widest focus:outline-none transition-all duration-200`}>{tab.label}</button>
            ))}
          </nav>
        </div>
        <div className="p-10 md:p-14">{renderContent()}</div>
      </main>
    </>
  );
};

export default ConfigurationPage;
