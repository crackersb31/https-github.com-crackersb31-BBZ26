
import React, { useState, useEffect } from 'react';
import { loginCodes, teamMembers } from '../config';
import { db } from '../firebase-config';
import { collection, getDocs, writeBatch, doc, getDoc, setDoc } from 'firebase/firestore';
import { type RowData, type PageConfig, type AnnouncementConfig } from '../types';

interface ConfigurationPageProps {
  onBack: () => void;
  currentUser: string;
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

  const isAdmin = currentUser === 'ADMIN';

  const tabs = [
    { id: 'structure', label: "Structure de l'application" },
    { id: 'saisies', label: 'Guide utilisateur & Saisies' },
  ];

  if (isAdmin) {
    tabs.push({ id: 'communication', label: 'Communication' }); // Nouvel onglet
    tabs.push({ id: 'droits', label: 'Droits des administrateurs' });
    tabs.push({ id: 'codes', label: "Codes d'accès" });
    tabs.push({ id: 'maintenance', label: "Maintenance & Reset" });
  }
  
  useEffect(() => {
    if (!isAdmin && (activeTab === 'droits' || activeTab === 'codes' || activeTab === 'maintenance' || activeTab === 'communication')) {
      setActiveTab('structure');
    }
  }, [isAdmin, activeTab]);

  // Load announcement config when entering communication tab
  useEffect(() => {
      if (activeTab === 'communication' && isAdmin) {
          const loadAnnouncements = async () => {
              setIsLoading(true);
              try {
                  const docRef = doc(db, 'appConfig', 'announcements');
                  const docSnap = await getDoc(docRef);
                  if (docSnap.exists()) {
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

  const handleSaveAnnouncements = async () => {
      setIsLoading(true);
      setAnnouncementSaveStatus('');
      try {
          const docRef = doc(db, 'appConfig', 'announcements');
          await setDoc(docRef, announcementConfig);
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

  const handleResetHistoryAndLogs = async () => {
    if (!window.confirm("ATTENTION : Êtes-vous sûr de vouloir supprimer TOUT l'historique des modifications et TOUS les journaux de connexion ?\n\nCette action est irréversible. Les statistiques 'Utilisateurs actifs' seront remises à zéro.")) {
        return;
    }

    setIsLoading(true);
    try {
        const batchSize = 500;
        
        // 1. Supprimer l'historique
        const historyRef = collection(db, 'history');
        const historySnapshot = await getDocs(historyRef);
        const historyDocs = historySnapshot.docs;
        
        // Firestore limite les batchs à 500 opérations
        for (let i = 0; i < historyDocs.length; i += batchSize) {
            const batch = writeBatch(db);
            const chunk = historyDocs.slice(i, i + batchSize);
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        // 2. Supprimer les logs de connexion
        const loginsRef = collection(db, 'logins');
        const loginsSnapshot = await getDocs(loginsRef);
        const loginsDocs = loginsSnapshot.docs;

        for (let i = 0; i < loginsDocs.length; i += batchSize) {
            const batch = writeBatch(db);
            const chunk = loginsDocs.slice(i, i + batchSize);
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        alert("Succès : L'historique et les journaux de connexion ont été entièrement effacés.");
    } catch (error) {
        console.error("Erreur lors de la réinitialisation :", error);
        alert("Une erreur est survenue lors de la suppression.");
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
          // 1. Récupérer la liste des pages
          const pagesConfigRef = doc(db, 'appConfig', 'pages');
          const pagesConfigSnap = await getDoc(pagesConfigRef);
          
          if (!pagesConfigSnap.exists()) {
              throw new Error("Configuration introuvable");
          }
          
          const pages: PageConfig[] = pagesConfigSnap.data().pageList;
          const batch = writeBatch(db);
          
          // 2. Pour chaque page, récupérer les données et mettre à zéro les contributions
          for (const page of pages) {
              const pageRef = doc(db, 'pagesData', page.storageKey);
              const pageSnap = await getDoc(pageRef);
              
              if (pageSnap.exists()) {
                  const rows = pageSnap.data().rows as RowData[];
                  const updatedRows = rows.map(row => ({
                      ...row,
                      contributions: Array(teamMembers.length).fill(0) // Remise à zéro du tableau de contributions
                  }));
                  batch.set(pageRef, { rows: updatedRows });
              }
          }
          
          await batch.commit();
          alert("Succès : Toutes les contributions ont été remises à zéro.");

      } catch (error) {
          console.error("Erreur lors de la remise à zéro des contributions :", error);
          alert("Une erreur est survenue.");
      } finally {
          setIsLoading(false);
      }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'structure':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-semibold text-gray-800">Mission de l'application</h3>
            <p className="text-gray-800">
              <strong>Activation des leviers BBZ budget 26</strong> est l'outil central pour piloter les contributions financières. Elle remplace les fichiers Excel dispersés pour offrir une consolidation en temps réel, sécurisée et transparente.
            </p>
            <h3 className="text-xl font-semibold text-gray-800 mt-6">Organisation du Sommaire</h3>
            <p className="text-gray-800">L'écran d'accueil est désormais structuré en <strong>3 zones distinctes</strong> pour plus de clarté :</p>
            <dl className="space-y-4">
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <dt className="font-bold text-amber-800">1. Remontée Sous Unité</dt>
                    <dd className="text-amber-900 text-sm mt-1">
                        Contient les tableaux spécifiques aux entités géographiques et techniques : <em>GEH AA, GEH AG, GEH TA, GMH</em>.
                    </dd>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <dt className="font-bold text-blue-800">2. Etat Major Unité</dt>
                    <dd className="text-blue-900 text-sm mt-1">
                        Regroupe le tableau central <strong>"Fiches transverses"</strong> ainsi que les remontées des fonctions support (<em>DC, DCOM, DF, DRH, DT, SST...</em>).
                    </dd>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <dt className="font-bold text-emerald-800">3. Statistique et Configuration</dt>
                    <dd className="text-emerald-900 text-sm mt-1">
                        La zone de pilotage et d'analyse :
                        <ul className="list-disc list-inside mt-2">
                            <li><strong>Configuration & Aide :</strong> La page actuelle.</li>
                            <li><strong>Synthèse par Utilisateur :</strong> Pour voir toutes vos contributions sur une seule page.</li>
                            <li><strong>Outils Admin :</strong> Synthèse Globale, Historique, Diagnostic.</li>
                        </ul>
                    </dd>
                </div>
            </dl>
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

            <h3 className="text-xl font-semibold text-gray-800 mt-8">Nouveautés & Ergonomie</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="border p-4 rounded-lg bg-gray-50">
                    <h4 className="font-bold text-gray-800 mb-2">📌 Colonnes Figées</h4>
                    <p className="text-sm text-gray-600">
                        Lorsque vous faites défiler le tableau vers la droite pour voir les équipes, les <strong>6 premières colonnes</strong> (Thématique, Origine...) restent fixes à gauche. Vous ne perdez jamais le contexte de la ligne !
                    </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                    <h4 className="font-bold text-gray-800 mb-2">✅ Validation "Saisie Terminée"</h4>
                    <p className="text-sm text-gray-600">
                        Dans votre tableau de remontée, un interrupteur en haut à droite permet de signaler officiellement que vous avez fini.
                        <br/>
                        <span className="text-green-600 font-bold text-xs">Passer au vert pour valider</span>
                    </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                    <h4 className="font-bold text-gray-800 mb-2">📊 Exports Excel (CSV)</h4>
                    <p className="text-sm text-gray-600">
                        Un bouton vert <strong>"Exporter CSV"</strong> est disponible sur les pages de Synthèse (Globale et Utilisateur). Il génère un fichier compatible Excel (point-virgule) ne contenant que les lignes pertinentes (Total > 0).
                    </p>
                </div>
                <div className="border p-4 rounded-lg bg-gray-50">
                    <h4 className="font-bold text-gray-800 mb-2">👁️ Filtres Intelligents</h4>
                    <p className="text-sm text-gray-600">
                       Sur les synthèses, l'option <strong>"Masquer les lignes à 0"</strong> permet d'épurer l'affichage instantanément pour se concentrer sur l'essentiel.
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
                            {isLoading ? "Traitement en cours..." : "EFFACER TOUS LES CHIFFRES (Contribs à 0)"}
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
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
