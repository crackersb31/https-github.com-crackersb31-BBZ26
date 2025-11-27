
import React, { useState, useEffect } from 'react';
import { loginCodes, teamMembers } from '../config';
import { db } from '../firebase-config';
import { type RowData, type PageConfig, type AnnouncementConfig, type LoginEntry } from '../types';

interface ConfigurationPageProps {
  onBack: () => void;
  currentUser: string;
}

interface ConnectionStat {
    user: string;
    lastConnection: string; // ISO Date string
    count: number;
}

interface PageVisit {
    user: string;
    pageId: string;
    pageTitle: string;
    lastVisit: string;
}

const ConfigurationPage: React.FC<ConfigurationPageProps> = ({ onBack, currentUser }) => {
  const [activeTab, setActiveTab] = useState('structure');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for Announcements
  const [announcementConfig, setAnnouncementConfig] = useState<AnnouncementConfig>({
      isActive: false,
      globalMessage: '',
      userMessages: {}
  });
  const [announcementSaveStatus, setAnnouncementSaveStatus] = useState('');

  // State for Connection Stats & Matrix
  const [connectionStats, setConnectionStats] = useState<ConnectionStat[]>([]);
  const [matrixPages, setMatrixPages] = useState<PageConfig[]>([]);
  const [visitsData, setVisitsData] = useState<PageVisit[]>([]);

  const isAdmin = currentUser === 'ADMIN';

  const tabs = [
    { id: 'structure', label: "Structure de l'application" },
    { id: 'saisies', label: 'Guide utilisateur & Nouveautés' },
  ];

  if (isAdmin) {
    tabs.push({ id: 'communication', label: 'Communication' });
    tabs.push({ id: 'connexions', label: 'Suivi des Connexions' });
    tabs.push({ id: 'droits', label: 'Droits des administrateurs' });
    tabs.push({ id: 'codes', label: "Codes d'accès" });
    tabs.push({ id: 'maintenance', label: "Maintenance & Reset" });
  }
  
  useEffect(() => {
    if (!isAdmin && (activeTab === 'droits' || activeTab === 'codes' || activeTab === 'maintenance' || activeTab === 'communication' || activeTab === 'connexions')) {
      setActiveTab('structure');
    }
  }, [isAdmin, activeTab]);

  // Load announcement config when entering communication tab
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

  // Load connection stats and matrix data when entering connexions tab
  useEffect(() => {
      if (activeTab === 'connexions' && isAdmin) {
          const loadConnectionsAndMatrix = async () => {
              setIsLoading(true);
              try {
                  // 1. Load connection stats (Logins)
                  const loginsRef = db.collection('logins');
                  const q = loginsRef.orderBy('timestamp', 'desc');
                  const snapshot = await q.get();
                  
                  const statsMap: Record<string, ConnectionStat> = {};
                  Object.values(loginCodes).forEach(user => {
                      if (user !== 'ADMIN') {
                          statsMap[user] = { user, lastConnection: '', count: 0 };
                      }
                  });

                  snapshot.forEach(doc => {
                      const data = doc.data() as LoginEntry;
                      if (data.user && data.user !== 'ADMIN') {
                          if (!statsMap[data.user]) {
                              statsMap[data.user] = { user: data.user, lastConnection: data.timestamp, count: 1 };
                          } else {
                              statsMap[data.user].count += 1;
                              if (!statsMap[data.user].lastConnection) {
                                  statsMap[data.user].lastConnection = data.timestamp;
                              }
                          }
                      }
                  });

                  const sortedStats = Object.values(statsMap).sort((a, b) => {
                      if (!a.lastConnection) return 1;
                      if (!b.lastConnection) return -1;
                      return new Date(b.lastConnection).getTime() - new Date(a.lastConnection).getTime();
                  });

                  setConnectionStats(sortedStats);

                  // 2. Load Pages for Matrix
                  const pagesRef = db.collection('appConfig').doc('pages');
                  const pagesSnap = await pagesRef.get();
                  if (pagesSnap.exists) {
                      setMatrixPages(pagesSnap.data()?.pageList || []);
                  }

                  // 3. Load Visits for Matrix
                  const visitsRef = db.collection('pageVisits');
                  const visitsSnap = await visitsRef.get();
                  const visits: PageVisit[] = [];
                  visitsSnap.forEach(doc => visits.push(doc.data() as PageVisit));
                  setVisitsData(visits);

              } catch (error) {
                  console.error("Erreur chargement connexions", error);
              } finally {
                  setIsLoading(false);
              }
          };
          loadConnectionsAndMatrix();
      }
  }, [activeTab, isAdmin]);

  const handleSaveAnnouncements = async () => {
      setIsLoading(true);
      setAnnouncementSaveStatus('');
      try {
          const docRef = db.collection('appConfig').doc('announcements');
          await docRef.set(announcementConfig);
          setAnnouncementSaveStatus('Sauvegardé avec succès !');
          setTimeout(() => setAnnouncementSaveStatus(''), 3000);
      } catch (error) {
          console.error("Erreur sauvegarde annonces", error);
          setAnnouncementSaveStatus('Erreur lors de la sauvegarde.');
      } finally {
          setIsLoading(false);
      }
  };

  const handleUserMessageChange = (user: string, message: string) => {
      setAnnouncementConfig(prev => ({
          ...prev,
          userMessages: {
              ...prev.userMessages,
              [user]: message
          }
      }));
  };

  // Fonction utilitaire pour nettoyer récursivement les objets avant envoi Firestore
  // Transforme tous les 'undefined' en 'null'
  const sanitizeValue = (value: any): any => {
      if (value === undefined) return null;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          const newObj: any = {};
          Object.keys(value).forEach(key => {
              newObj[key] = sanitizeValue(value[key]);
          });
          return newObj;
      }
      if (Array.isArray(value)) {
          return value.map(sanitizeValue);
      }
      return value;
  };

  const deleteCollection = async (collectionName: string) => {
      try {
          console.log(`Début suppression collection : ${collectionName}`);
          const collectionRef = db.collection(collectionName);
          let totalDeleted = 0;
          
          // Boucle while pour supprimer par lots tant qu'il reste des documents
          // eslint-disable-next-line no-constant-condition
          while (true) {
              const q = collectionRef.limit(400); // Marge de sécurité sous la limite de 500
              const snapshot = await q.get();
              
              if (snapshot.empty) {
                  break;
              }
              
              const batch = db.batch();
              snapshot.docs.forEach((doc) => {
                  batch.delete(doc.ref);
              });
              
              await batch.commit();
              totalDeleted += snapshot.size;
              console.log(`Supprimé ${snapshot.size} documents de ${collectionName} (Total: ${totalDeleted})...`);
              
              // Petite pause pour ne pas surcharger le navigateur ou la connexion
              await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          return totalDeleted;
      } catch (e) {
          console.error(`Erreur suppression collection ${collectionName}`, e);
          throw e;
      }
  };

  const handleResetHistoryAndLogs = async () => {
    if (!window.confirm("ATTENTION : Êtes-vous sûr de vouloir supprimer TOUT l'historique des modifications et TOUS les journaux de connexion ?\n\nCette action est irréversible. Les statistiques 'Utilisateurs actifs' seront remises à zéro.")) {
        return;
    }

    setIsLoading(true);
    try {
        await deleteCollection('history');
        await deleteCollection('logins');
        await deleteCollection('pageVisits');
        
        alert("Succès : L'historique et les journaux ont été effacés.");
        // Réinitialisation des états locaux pour refléter le changement
        setConnectionStats([]);
        setVisitsData([]);
    } catch (error) {
        console.error("Erreur générale lors de la réinitialisation :", error);
        alert("Une erreur est survenue lors de la suppression. Vérifiez la console.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleResetContributions = async () => {
      if (!window.confirm("ATTENTION DANGER : Vous êtes sur le point de remettre à ZÉRO toutes les contributions chiffrées de TOUS les tableaux.\n\nLes lignes et les textes resteront, mais tous les chiffres saisis par les équipes seront effacés.\n\nVoulez-vous vraiment continuer ?")) {
          return;
      }
      
      if (!window.confirm("Confirmation de sécurité : Confirmez-vous vraiment l'effacement des chiffres ?")) {
          return;
      }

      setIsLoading(true);
      try {
          const pagesConfigRef = db.collection('appConfig').doc('pages');
          const pagesConfigSnap = await pagesConfigRef.get();
          
          if (!pagesConfigSnap.exists) {
              throw new Error("Configuration introuvable");
          }
          
          const pages: PageConfig[] = pagesConfigSnap.data()?.pageList;
          let successCount = 0;
          let failCount = 0;

          // TRAITEMENT SÉQUENTIEL (TABLEAU APRÈS TABLEAU)
          for (const page of pages) {
              try {
                  console.log(`Traitement du tableau : ${page.title} (${page.id})`);
                  const pageRef = db.collection('pagesData').doc(page.storageKey);
                  const pageSnap = await pageRef.get();

                  if (pageSnap.exists) {
                      const data = pageSnap.data();
                      const rows = data ? (data.rows as RowData[]) : [];
                      
                      const updatedRows = rows.map(row => {
                          const cleanRow = sanitizeValue(row);
                          return {
                              ...cleanRow,
                              domainTag: cleanRow.domainTag || null,
                              domainResponse: cleanRow.domainResponse || null,
                              contributions: Array(teamMembers.length).fill(0)
                          };
                      });
                      
                      await pageRef.set({ rows: updatedRows });
                      successCount++;
                  }
              } catch (err) {
                  console.error(`Echec pour le tableau ${page.title}`, err);
                  failCount++;
              }
          }
          
          alert(`Opération terminée.\nTableaux réinitialisés : ${successCount}\nÉchecs : ${failCount}`);

      } catch (error) {
          console.error("Erreur lors de la remise à zéro des contributions :", error);
          alert("Erreur technique : " + (error instanceof Error ? error.message : "Inconnue"));
      } finally {
          setIsLoading(false);
      }
  };

  const getTimeAgo = (dateString: string) => {
      if (!dateString) return 'Jamais connecté';
      const now = new Date();
      const past = new Date(dateString);
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      return `Il y a ${diffDays} jours`;
  };

  const getStatusColor = (dateString: string) => {
      if (!dateString) return 'bg-gray-100 text-gray-500';
      const diffDays = (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 3600 * 24);
      if (diffDays < 3) return 'bg-green-100 text-green-700';
      if (diffDays < 10) return 'bg-yellow-100 text-yellow-700';
      return 'bg-red-100 text-red-700';
  };

  // Helper pour la matrice
  const hasVisited = (user: string, pageId: string) => {
      return visitsData.some(v => v.user === user && v.pageId === pageId);
  };

  const getVisitDate = (user: string, pageId: string) => {
      const visit = visitsData.find(v => v.user === user && v.pageId === pageId);
      return visit ? new Date(visit.lastVisit).toLocaleDateString('fr-FR') : '';
  };
  
  const isOwnPage = (user: string, pageTitle: string) => {
      return pageTitle.toUpperCase().includes(user.toUpperCase());
  };

  const sortedUsersForMatrix = Object.values(loginCodes).filter(u => u !== 'ADMIN').sort();
  const sortedPagesForMatrix = matrixPages.sort((a, b) => {
      if (a.title === 'Fiches transverses') return -1;
      if (b.title === 'Fiches transverses') return 1;
      return a.title.localeCompare(b.title);
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'structure':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-semibold text-gray-800">Mission de l'application</h3>
            <p className="text-gray-800">
              <strong>Activation des leviers BBZ budget 26</strong> est l'outil central pour piloter les contributions financières. 
              Elle remplace les fichiers Excel dispersés pour offrir une consolidation en temps réel, sécurisée et transparente.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6">Nouvelle Organisation (Onglets)</h3>
            <p className="text-gray-800">Pour plus de clarté, le Sommaire est désormais divisé en <strong>2 espaces majeurs</strong> accessibles via le sélecteur en haut de page :</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <h4 className="font-bold text-blue-800 flex items-center gap-2">
                        🚀 Espace Saisie
                    </h4>
                    <p className="text-blue-900 text-sm mt-2">
                        C'est votre espace de travail quotidien. Il contient :
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Les remontées <strong>Sous Unité</strong> (GEH, GMH...)</li>
                            <li>Les remontées <strong>Etat Major</strong> (DC, DRH, DF...)</li>
                            <li>L'accès direct aux <strong>Domaines Transverses</strong></li>
                        </ul>
                    </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                         📊 Espace Pilotage
                    </h4>
                    <p className="text-emerald-900 text-sm mt-2">
                        C'est l'espace d'analyse et de supervision. Il contient :
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Le <strong>Dashboard</strong> statistique (Utilisateurs actifs...)</li>
                            <li>Les outils de <strong>Synthèse</strong> (Globale & Utilisateur)</li>
                            <li>L'<strong>Historique</strong> et la Configuration</li>
                            <li>Le <strong>Suivi des Réponses Experts</strong></li>
                        </ul>
                    </p>
                </div>
            </div>
          </div>
        );
      case 'saisies':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-semibold text-gray-800">Guide de Saisie & Droits</h3>
            <p className="text-gray-800">L'application garantit que chacun n'agit que sur son périmètre :</p>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
                <li><strong className="text-blue-700">Chiffres :</strong> Vous ne pouvez modifier que la colonne de votre équipe (ex: "Contrib. DCOM"). Les autres sont verrouillées.</li>
                <li><strong className="text-blue-700">Difficulté :</strong> La colonne "Difficulté" est désormais modifiable par tous pour ajuster l'évaluation.</li>
                <li><strong className="text-blue-700">Commentaires :</strong> Le bouton "Gérer" permet d'annoter n'importe quelle ligne.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-8">Nouveautés & Fonctionnalités Avancées</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="border p-4 rounded-lg bg-gray-50 border-l-4 border-l-purple-500">
                    <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                        💬 Workflow Expert (Nouveau)
                    </h4>
                    <p className="text-sm text-gray-600">
                        Si une thématique est taguée avec votre domaine (ex: badge <span className="text-xs bg-pink-100 text-pink-800 px-1 rounded border border-pink-200">RH</span> pour le DRH) :
                        <ul className="list-decimal list-inside mt-2 space-y-1">
                            <li>Cliquez sur le badge coloré.</li>
                            <li>Une fenêtre s'ouvre pour saisir votre <strong>Réponse Officielle</strong>.</li>
                            <li>Une icône "bulle" apparaîtra pour indiquer qu'une réponse a été apportée.</li>
                        </ul>
                    </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                    <h4 className="font-bold text-gray-800 mb-2">📌 Colonne Figée</h4>
                    <p className="text-sm text-gray-600">
                        Pour faciliter la lecture, la colonne <strong>Thématique</strong> reste désormais figée à gauche lorsque vous faites défiler le tableau vers la droite.
                    </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                    <h4 className="font-bold text-gray-800 mb-2">✅ Validation "Saisie Terminée"</h4>
                    <p className="text-sm text-gray-600">
                        Dans votre tableau, un interrupteur en haut à droite permet de valider votre travail.
                        <br/>
                        <span className="text-green-600 font-bold text-xs">Passer au vert pour informer l'admin</span>
                    </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                    <h4 className="font-bold text-gray-800 mb-2">🔍 Info-Bulles (Loupe)</h4>
                    <p className="text-sm text-gray-600">
                       Passez simplement votre souris sur les colonnes <strong>Thématique</strong> ou <strong>Synthèse</strong> pour voir apparaître le texte complet dans une grande fenêtre flottante.
                    </p>
                </div>
            </div>

            <div className="mt-8 p-4 bg-orange-50 border-l-4 border-orange-400 text-orange-800">
                <p className="font-bold">Rappel Sécurité :</p>
                <p className="text-sm">Le bouton <strong>Sauvegarder</strong> (qui devient orange et pulse) est votre seul ami. Si vous quittez sans cliquer dessus, vos saisies seront perdues.</p>
            </div>
          </div>
        );
      case 'communication':
        if (!isAdmin) return null;
        const sortedUsers = Object.values(loginCodes).filter(u => u !== 'ADMIN').sort();
        return (
            <div className="max-w-4xl">
                <h3 className="text-xl font-semibold text-blue-700 flex items-center gap-2 mb-4">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                    Diffusion de messages aux équipes
                </h3>
                <p className="text-gray-600 mb-6">
                    Utilisez cette section pour afficher un message important aux utilisateurs. Le message s'affichera <strong>une fois connecté, avant d'accéder au sommaire</strong>.
                </p>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <input 
                            type="checkbox" 
                            id="active-msg" 
                            checked={announcementConfig.isActive} 
                            onChange={e => setAnnouncementConfig(prev => ({...prev, isActive: e.target.checked}))}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <label htmlFor="active-msg" className="font-bold text-blue-900">Activer l'affichage des messages</label>
                    </div>
                    <p className="text-xs text-blue-700 ml-8">Si décoché, aucun message ne sera affiché, même si les champs ci-dessous sont remplis.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block font-semibold text-gray-800 mb-2">Message Global (Pour tout le monde)</label>
                        <textarea 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 h-24"
                            placeholder="Ex: La campagne budgétaire se termine ce vendredi..."
                            value={announcementConfig.globalMessage}
                            onChange={e => setAnnouncementConfig(prev => ({...prev, globalMessage: e.target.value}))}
                        />
                    </div>

                    <div className="border-t pt-6">
                        <h4 className="font-semibold text-gray-800 mb-4">Messages Individuels (Optionnel)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sortedUsers.map(user => (
                                <div key={user}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message pour {user}</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder={`Message spécifique pour ${user}...`}
                                        value={announcementConfig.userMessages[user] || ''}
                                        onChange={e => handleUserMessageChange(user, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-between sticky bottom-0 bg-white p-4 border-t border-gray-100 shadow-inner rounded-b-lg">
                    <div className="text-green-600 font-medium">{announcementSaveStatus}</div>
                    <button 
                        onClick={handleSaveAnnouncements}
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md disabled:opacity-50"
                    >
                        {isLoading ? 'Sauvegarde...' : 'Enregistrer la configuration'}
                    </button>
                </div>
            </div>
        );
      case 'connexions':
        if (!isAdmin) return null;
        return (
            <div className="prose max-w-none">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Suivi des Connexions
                </h3>
                
                {isLoading ? (
                    <div className="text-center p-8 text-gray-500">Chargement des données...</div>
                ) : (
                    <div className="space-y-10">
                        {/* TABLEAU 1: DERNIÈRES CONNEXIONS */}
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                             <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                <h4 className="text-md font-bold text-gray-700">Journal des connexions à l'application</h4>
                            </div>
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Utilisateur</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Dernière connexion</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Délai</th>
                                        <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Fréquence</th>
                                        <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {connectionStats.map((stat) => (
                                        <tr key={stat.user} className="hover:bg-gray-50 transition-colors">
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{stat.user}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {stat.lastConnection ? new Date(stat.lastConnection).toLocaleString('fr-FR') : '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {getTimeAgo(stat.lastConnection)}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                                                {stat.count} fois
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(stat.lastConnection)}`}>
                                                    {stat.lastConnection ? (new Date().getTime() - new Date(stat.lastConnection).getTime() < 86400000 * 3 ? 'Actif' : 'Inactif') : 'Jamais'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* TABLEAU 2: MATRICE DE CONSULTATION */}
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-200">
                                <h4 className="text-md font-bold text-emerald-800 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                    Matrice de Consultation des Tableaux
                                </h4>
                                <p className="text-xs text-emerald-700 mt-1">
                                    Suivez quel utilisateur a consulté quel tableau.
                                    <span className="ml-4 font-bold">Légende :</span> 
                                    <span className="mx-2">✅ Visité</span> 
                                    <span className="mx-2 text-gray-400">❌ Jamais vu</span>
                                    <span className="mx-2">⭐ Son tableau (vu)</span>
                                    <span className="mx-2">⚠️ Son tableau (jamais vu)</span>
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-bold text-gray-900 sm:pl-6 sticky left-0 bg-gray-50 z-10 border-r">
                                                Utilisateur
                                            </th>
                                            {sortedPagesForMatrix.map(page => (
                                                <th key={page.id} scope="col" className="px-2 py-3.5 text-center text-xs font-semibold text-gray-600 rotate-45 h-32 align-bottom w-12">
                                                    <div>{page.title.replace('Remontée ', '').replace('Fiches ', '')}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {sortedUsersForMatrix.map((user) => (
                                            <tr key={user} className="hover:bg-gray-50">
                                                <td className="whitespace-nowrap py-2 pl-4 pr-3 text-sm font-bold text-gray-900 sm:pl-6 sticky left-0 bg-white z-10 border-r">
                                                    {user}
                                                </td>
                                                {sortedPagesForMatrix.map(page => {
                                                    const visited = hasVisited(user, page.id);
                                                    const date = getVisitDate(user, page.id);
                                                    const isOwner = isOwnPage(user, page.title);
                                                    
                                                    return (
                                                        <td key={page.id} className="px-2 py-2 text-center border-l border-gray-100" title={visited ? `Vu le ${date}` : "Jamais consulté"}>
                                                            {visited ? (
                                                                isOwner ? <span className="text-lg">⭐</span> : <span className="text-green-500 font-bold">✅</span>
                                                            ) : (
                                                                isOwner ? <span className="text-lg" title="Alerte : N'a pas consulté son propre tableau !">⚠️</span> : <span className="text-gray-200 text-xs">❌</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
      case 'droits':
        if (!isAdmin) return null;
        return (
            <div className="prose max-w-none">
                <h3 className="text-xl font-semibold text-gray-800">Super-pouvoirs de l'Administrateur</h3>
                <p className="text-gray-800">
                    Le rôle d'administrateur offre un contrôle total sur l'application. Ces permissions doivent être utilisées avec précaution pour maintenir l'intégrité des données.
                </p>
                
                <h4 className="font-semibold text-gray-700 mt-4">Gestion du Contenu</h4>
                <ul className="text-gray-700">
                    <li><strong className="text-gray-800">Édition Complète :</strong> Modifier <strong>n'importe quel champ</strong> de n'importe quelle ligne dans tous les tableaux (thématique, synthèse, estimations, et toutes les contributions).</li>
                    <li><strong className="text-gray-800">Ajout de Lignes :</strong> Dans les tableaux de remontées, l'administrateur peut ajouter de nouvelles lignes via le bouton "Ajouter une ligne".</li>
                </ul>

                <h4 className="font-semibold text-gray-700 mt-4">Gestion de la Structure</h4>
                 <ul className="text-gray-700">
                    <li><strong className="text-gray-800">Suppression de Tableaux :</strong> Supprimer définitivement un tableau et toutes ses données depuis le Sommaire. <strong className="text-red-600">Cette action est irréversible.</strong></li>
                    <li><strong className="text-gray-800">Gestion des Colonnes :</strong> Sur les tableaux de remontées, utiliser le bouton "Gérer les colonnes" pour ajouter, supprimer, ou masquer des colonnes.</li>
                </ul>

                <h4 className="font-semibold text-gray-700 mt-4">Analyse & Supervision</h4>
                <ul className="text-gray-700">
                    <li><strong className="text-gray-800">Tableau de Bord Dynamique :</strong> Accéder à des statistiques sur le Sommaire, incluant les utilisateurs les plus actifs et la répartition des contributions.</li>
                    <li><strong className="text-gray-800">Historique et Synthèse Globale :</strong> Accéder aux pages "Historique Global" et "Synthèse Globale" pour une vue d'ensemble complète.</li>
                    <li><strong className="text-gray-800">Consultation des Codes :</strong> Voir tous les codes d'accès dans l'onglet <button onClick={() => setActiveTab('codes')} className="text-blue-600 underline font-semibold hover:text-blue-800 focus:outline-none">Codes d'accès</button>.</li>
                </ul>
            </div>
        );
      case 'codes':
        if (!isAdmin) return null;
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-semibold text-gray-800">Liste des Codes d'Accès et Permissions</h3>
            <p className="text-gray-800">
              Voici la liste de tous les codes d'accès actuellement configurés dans l'application. Chaque code est associé à un utilisateur et à un niveau de permission spécifique.
            </p>
            <div className="overflow-x-auto mt-4 not-prose">
              <table className="w-full text-sm">
                <thead className="text-left bg-gray-50">
                  <tr>
                    <th className="p-3 font-semibold text-gray-700 border-b">Code d'accès</th>
                    <th className="p-3 font-semibold text-gray-700 border-b">Utilisateur associé</th>
                    <th className="p-3 font-semibold text-gray-700 border-b">Permissions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(loginCodes).map(([code, user]) => (
                    <tr key={code} className="border-t">
                      <td className="p-3 font-mono bg-gray-50 text-gray-800">{code}</td>
                      <td className="p-3 text-gray-800">{user}</td>
                      <td className="p-3 text-gray-600">
                        {user === 'ADMIN'
                          ? <span className="font-bold text-purple-700">Administrateur (contrôle total)</span>
                          : `Utilisateur standard (peut modifier les contributions de ${user})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
             <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 prose-p:my-0">
                <p><strong className="text-yellow-900">Note :</strong> Ces codes sont définis directement dans la configuration de l'application. Pour ajouter, modifier ou supprimer un code, une intervention sur le code source est nécessaire.</p>
            </div>
          </div>
        );
      case 'maintenance':
        if (!isAdmin) return null;
        return (
            <div className="prose max-w-none">
                <h3 className="text-xl font-semibold text-red-700 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Maintenance & Réinitialisation
                </h3>
                <p className="text-gray-800">
                    Cette zone permet de nettoyer les données de l'application avant un lancement officiel ou pour repartir sur une base saine. 
                    <br/>
                    <strong className="text-red-600">Ces actions sont irréversibles.</strong>
                </p>
                
                <div className="mt-8 space-y-8">
                    {/* Action 1 : Historique */}
                    <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                        <h4 className="text-lg font-bold text-gray-800 mb-2">1. Nettoyer l'historique et les statistiques d'activité</h4>
                        <p className="text-sm text-gray-600 mb-4">
                            Cette action supprime :
                            <ul className="list-disc ml-5 mt-1">
                                <li>Toutes les lignes de la page <em>"Historique Global"</em>.</li>
                                <li>Toutes les statistiques du widget <em>"Utilisateurs les plus actifs"</em>.</li>
                            </ul>
                            Les données des tableaux (chiffres, textes) ne sont <strong>PAS</strong> affectées.
                        </p>
                        <button 
                            onClick={handleResetHistoryAndLogs} 
                            disabled={isLoading}
                            className="px-4 py-2 bg-white border border-red-300 text-red-700 font-semibold rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                        >
                            {isLoading ? "Traitement en cours..." : "Réinitialiser l'historique et les logs"}
                        </button>
                    </div>

                    {/* Action 2 : Contributions */}
                    <div className="bg-red-50 p-6 border border-red-200 rounded-xl shadow-sm">
                         <h4 className="text-lg font-bold text-red-800 mb-2">2. Remise à zéro des contributions (Fresh Start)</h4>
                        <p className="text-sm text-red-700 mb-4">
                            Cette action remet à <strong>ZÉRO</strong> toutes les valeurs chiffrées (colonnes DCOM, DRH, SST, etc.) dans <strong>TOUS</strong> les tableaux.
                            <br/><br/>
                            <em>Utile si vous avez rempli des chiffres pour tester et que vous souhaitez vider les tableaux pour le lancement officiel.</em>
                            <br/>
                            Les libellés (thématiques), origines, difficultés et commentaires sont conservés.
                        </p>
                        <button 
                             onClick={handleResetContributions}
                             disabled={isLoading}
                             className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 shadow-md"
                        >
                            {isLoading ? "Traitement en cours (Tableau après Tableau)..." : "EFFACER TOUS LES CHIFFRES (Contribs à 0)"}
                        </button>
                    </div>
                </div>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <header className="mb-8 grid grid-cols-3 items-center">
        <div className="justify-self-start">
            <button 
              onClick={onBack} 
              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              &larr; Retour au sommaire
            </button>
        </div>
        <div className="justify-self-center text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Configuration & Aide</h1>
        </div>
        <div className="justify-self-end flex items-center gap-4">
            <div className="text-right hidden sm:block">
                <p className="font-semibold">{isAdmin ? "Administrateur" : currentUser}</p>
                <p className="text-xs text-gray-500">Connecté</p>
            </div>
        </div>
      </header>
      <main className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none transition-colors duration-200`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6 md:p-8">
            {renderContent()}
        </div>
      </main>
    </>
  );
};

export default ConfigurationPage;
