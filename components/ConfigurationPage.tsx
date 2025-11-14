import React, { useState, useEffect } from 'react';
import { loginCodes } from '../config';

interface ConfigurationPageProps {
  onBack: () => void;
  currentUser: string;
}

const ConfigurationPage: React.FC<ConfigurationPageProps> = ({ onBack, currentUser }) => {
  const [activeTab, setActiveTab] = useState('structure');
  const isAdmin = currentUser === 'ADMIN';

  const tabs = [
    { id: 'structure', label: "Structure de l'application" },
    { id: 'saisies', label: 'Gestion des saisies' },
  ];

  if (isAdmin) {
    tabs.push({ id: 'droits', label: 'Droits des administrateurs' });
    tabs.push({ id: 'codes', label: "Codes d'accès" });
  }
  
  // Si l'utilisateur n'est pas admin et qu'un onglet admin est actif, on le redirige.
  useEffect(() => {
    if (!isAdmin && (activeTab === 'droits' || activeTab === 'codes')) {
      setActiveTab('structure');
    }
  }, [isAdmin, activeTab]);


  const renderContent = () => {
    switch (activeTab) {
      case 'structure':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-semibold text-gray-800">Présentation Générale</h3>
            <p>
              Cette application est conçue pour faciliter la saisie collaborative et le suivi des contributions des différentes équipes sur des fiches de synthèse de projet. Elle vise à centraliser l'information, automatiser les calculs et assurer la traçabilité des modifications.
            </p>
            <h3 className="text-xl font-semibold text-gray-800 mt-6">Architecture des Pages</h3>
            <p>L'application est organisée autour de plusieurs écrans clés :</p>
            <ul>
              <li><strong>Connexion :</strong> Un portail sécurisé où chaque utilisateur s'identifie avec un code unique.</li>
              <li><strong>Sommaire :</strong> La page d'accueil après connexion, offrant une vue d'ensemble et une navigation vers les différents tableaux et fonctionnalités.</li>
              <li><strong>Tableaux de saisie :</strong> Des pages dédiées à chaque fiche de synthèse où les utilisateurs peuvent consulter les données et saisir leurs contributions.</li>
              <li><strong>Création de tableau (Admin) :</strong> Une interface permettant aux administrateurs de créer de nouveaux tableaux personnalisés.</li>
              <li><strong>Historique Global (Admin) :</strong> Un journal complet de toutes les modifications effectuées sur l'ensemble des tableaux, accessible uniquement aux administrateurs.</li>
              <li><strong>Synthèse Globale (Admin) :</strong> Une vue consolidée qui agrège les données de tous les tableaux pour une analyse transversale.</li>
              <li><strong>Configuration & Aide :</strong> La page actuelle, fournissant des informations sur le fonctionnement de l'application.</li>
            </ul>
             <h3 className="text-xl font-semibold text-gray-800 mt-6">Technologie</h3>
             <p>L'application utilise une base de données en temps réel (Firebase Firestore) pour stocker toutes les données, les historiques de modification et les journaux de connexion, garantissant que les informations sont toujours à jour et sécurisées.</p>
          </div>
        );
      case 'saisies':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-semibold text-gray-800">Rôles des Utilisateurs</h3>
            <p>Il existe deux types de rôles :</p>
            <ul>
                <li><strong>Utilisateur standard (membre d'équipe) :</strong> Peut modifier les contributions de sa propre équipe et ajouter des commentaires.</li>
                <li><strong>Administrateur :</strong> Dispose de droits étendus sur l'ensemble de l'application.</li>
            </ul>
            <h3 className="text-xl font-semibold text-gray-800 mt-6">Comment modifier les données ?</h3>
            <ol>
                <li><strong>Contributions :</strong> Chaque utilisateur ne peut modifier que la colonne de contribution correspondant à son équipe (ex: l'utilisateur 'GEH AG' ne peut modifier que la colonne 'Contrib. GEH AG'). Les autres colonnes sont en lecture seule.</li>
                <li><strong>Commentaires :</strong> Chaque utilisateur peut ajouter, modifier ou supprimer son propre commentaire sur n'importe quelle ligne en cliquant sur le bouton "Gérer" dans la colonne "Commentaires". Un indicateur visuel (point bleu) signale la présence de commentaires.</li>
                <li><strong>Sauvegarde :</strong> Les modifications ne sont pas enregistrées automatiquement. Il est impératif de cliquer sur le bouton <strong>"Sauvegarder"</strong>. Un indicateur visuel (bouton orange et animé) vous alerte en cas de modifications non sauvegardées.</li>
            </ol>
            <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
                <p><strong>Attention :</strong> Si vous quittez une page avec des modifications non sauvegardées, une alerte vous demandera de confirmer. Si vous ignorez cette alerte, vos modifications seront perdues.</p>
            </div>
          </div>
        );
      case 'droits':
        if (!isAdmin) return null;
        return (
            <div className="prose max-w-none">
                <h3 className="text-xl font-semibold text-gray-800">Pouvoirs de l'Administrateur</h3>
                <p>
                    Le rôle d'administrateur est conçu pour la supervision, la maintenance des données et l'analyse globale. Il dispose de droits étendus qui lui permettent de gérer l'intégralité du contenu de l'application.
                </p>
                <h3 className="text-xl font-semibold text-gray-800 mt-6">Permissions spécifiques :</h3>
                <ul>
                    <li><strong>Édition complète des tableaux :</strong> Contrairement à un utilisateur standard, l'administrateur peut modifier <strong>tous les champs</strong> de toutes les lignes, y compris "Thématique", "Origine", "Synthèse", "Estimation", etc. Il peut également modifier les contributions de toutes les équipes.</li>
                    <li><strong>Gestion des tableaux :</strong> L'administrateur peut <strong>créer</strong> de nouveaux tableaux personnalisés et <strong>supprimer</strong> des tableaux existants directement depuis la page Sommaire. La suppression est une action irréversible qui efface toutes les données et l'historique associés.</li>
                    <li><strong>Tableau de Bord :</strong> Sur la page Sommaire, l'administrateur a accès à un tableau de bord affichant des statistiques d'utilisation, comme les utilisateurs les plus actifs et la répartition des contributions.</li>
                    <li><strong>Accès à l'Historique Global :</strong> L'administrateur peut consulter la page "Historique Global", qui retrace l'intégralité des modifications effectuées par tous les utilisateurs sur tous les tableaux, avec des options de filtrage avancées.</li>
                    <li><strong>Accès à la Synthèse Globale :</strong> L'administrateur peut accéder à une vue de "Synthèse Globale" qui agrège et consolide les données de toutes les fiches pour permettre une analyse transversale.</li>
                </ul>
                <h3 className="text-xl font-semibold text-gray-800 mt-6">Consultation des codes</h3>
                <p>
                  Pour plus de détails, vous pouvez consulter la liste exhaustive de tous les codes d'accès configurés dans l'application et leurs permissions associées dans l'onglet <button onClick={() => setActiveTab('codes')} className="text-blue-600 underline font-semibold hover:text-blue-800 focus:outline-none">Codes d'accès</button>.
                </p>
                <div className="mt-4 p-4 bg-sky-50 border-l-4 border-sky-400 text-sky-800">
                    <p><strong>Responsabilité :</strong> Les modifications effectuées par un administrateur sont également tracées dans l'historique. Ce rôle doit être utilisé avec soin pour garantir l'intégrité des données.</p>
                </div>
            </div>
        );
      case 'codes':
        if (!isAdmin) return null;
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-semibold text-gray-800">Liste des Codes d'Accès et Permissions</h3>
            <p>
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
                <p><strong>Note :</strong> Ces codes sont définis directement dans la configuration de l'application. Pour ajouter, modifier ou supprimer un code, une intervention sur le code source est nécessaire.</p>
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
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none`}
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