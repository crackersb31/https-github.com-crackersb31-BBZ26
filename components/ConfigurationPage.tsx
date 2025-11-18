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
            <h3 className="text-xl font-semibold text-gray-800">Mission de l'application</h3>
            <p className="text-gray-800">
              Cette application est conçue pour <strong className="text-gray-900">centraliser et suivre les contributions</strong> des différentes équipes sur des fiches projet. L'objectif est de collaborer efficacement, d'assurer la traçabilité des modifications et de disposer d'une vue d'ensemble consolidée.
            </p>
            <h3 className="text-xl font-semibold text-gray-800 mt-6">Navigation et Pages Clés</h3>
            <p className="text-gray-800">L'application est organisée autour de plusieurs écrans principaux :</p>
            <dl className="space-y-4">
                <div>
                    <dt className="font-semibold text-gray-700">Connexion</dt>
                    <dd className="pl-4 text-gray-700">Un portail sécurisé où chaque utilisateur s'identifie avec un code unique.</dd>
                </div>
                <div>
                    <dt className="font-semibold text-gray-700">Sommaire</dt>
                    <dd className="pl-4 text-gray-700">
                        La page d'accueil qui regroupe l'accès à tous les tableaux et outils. Elle est divisée en deux sections :
                        <ul className="my-2 text-gray-700">
                            <li><strong className="text-gray-800">Remontée Sous Unité :</strong> Contient les tableaux <em>GEH AA, GEH AG, GEH TA, GMH</em>.</li>
                            <li><strong className="text-gray-800">Etat Major Unité :</strong> Regroupe tous les autres tableaux (<em>Fiches de synthèse, DC, DCAB, DCOM, DF, DRH, DT, SST</em>) et les outils.</li>
                        </ul>
                    </dd>
                </div>
                <div>
                    <dt className="font-semibold text-gray-700">Tableaux de saisie</dt>
                    <dd className="pl-4 text-gray-700">Les pages de travail où les données sont consultées et modifiées.</dd>
                </div>
                 <div>
                    <dt className="font-semibold text-gray-700">Outils (visibles sur le Sommaire)</dt>
                    <dd className="pl-4 text-gray-700">
                        <ul className="my-2 text-gray-700">
                            <li><strong className="text-gray-800">Configuration & Aide (Tous) :</strong> La page actuelle.</li>
                            <li><strong className="text-gray-800">Synthèse Globale (Admin) :</strong> Une vue consolidée qui agrège les données de tous les tableaux.</li>
                            <li><strong className="text-gray-800">Historique Global (Admin) :</strong> Un journal complet de toutes les modifications.</li>
                             <li><strong className="text-gray-800">Diagnostic Admin (Admin) :</strong> Page technique pour exporter la configuration de l'application.</li>
                        </ul>
                    </dd>
                </div>
            </dl>
          </div>
        );
      case 'saisies':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-semibold text-gray-800">Comment modifier les données ?</h3>
            <p className="text-gray-800">Les permissions de modification dépendent de votre rôle (Utilisateur ou Administrateur).</p>
            <ol className="text-gray-700">
                <li><strong className="text-gray-800">Saisir une contribution :</strong> En tant qu'utilisateur, vous pouvez uniquement modifier les chiffres dans la colonne qui porte le nom de votre équipe. L'administrateur peut tout modifier.</li>
                <li><strong className="text-gray-800">Ajouter un commentaire :</strong> Cliquez sur le bouton <strong>"Gérer"</strong> dans la colonne "Commentaires" pour ajouter ou modifier votre commentaire sur une ligne. Un point bleu signale la présence de commentaires.</li>
                <li><strong className="text-gray-800">Filtrer les données :</strong> Utilisez le menu déroulant <strong>"Filtrer par difficulté"</strong> en haut de chaque tableau pour n'afficher que les lignes pertinentes.</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-800 mt-6">Points Clés à Retenir</h3>
            <div className="space-y-4">
                <div className="flex items-start">
                    <span className="text-2xl mr-4">💾</span>
                    <div className="text-gray-700">
                        <strong className="text-gray-800">Sauvegarde Manuelle :</strong> Les modifications ne sont pas automatiques. Cliquez toujours sur <strong>"Sauvegarder"</strong> pour enregistrer votre travail. Le bouton devient orange pour vous alerter des changements non sauvegardés.
                    </div>
                </div>
                <div className="flex items-start">
                    <span className="text-2xl mr-4">⚠️</span>
                     <div className="text-gray-700">
                        <strong className="text-gray-800">Alerte de sortie :</strong> Si vous quittez une page avec des modifications non sauvegardées, le navigateur vous demandera une confirmation. Si vous ignorez l'alerte, vos changements seront perdus.
                    </div>
                </div>
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