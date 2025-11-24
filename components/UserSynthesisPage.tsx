
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { type RowData, type PageConfig } from '../types';
import { teamMembers } from '../config';

interface UserSynthesisPageProps {
  onBack: () => void;
  pageConfigs: PageConfig[];
  currentUser: string;
}

const UserSynthesisPage: React.FC<UserSynthesisPageProps> = ({ onBack, pageConfigs, currentUser }) => {
  const isAdmin = currentUser === 'ADMIN';
  
  // État pour l'utilisateur sélectionné. Par défaut : l'utilisateur courant (si c'est une équipe), sinon le premier de la liste.
  const [selectedUser, setSelectedUser] = useState<string>(() => {
      if (teamMembers.includes(currentUser)) return currentUser;
      return teamMembers[0];
  });

  const [aggregatedData, setAggregatedData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hideEmptyRows, setHideEmptyRows] = useState(true); // Par défaut activé ici car souvent pertinent

  // Chargement des données (identique à la synthèse globale)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const allPromises = pageConfigs.map(async (config) => {
          const docRef = doc(db, 'pagesData', config.storageKey);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            // On attache le nom du tableau source à chaque ligne pour info
            return (docSnap.data().rows as RowData[]).map(row => ({...row, sourcePageTitle: config.title}));
          }
          return (config.initialData as RowData[]).map(row => ({...row, sourcePageTitle: config.title}));
        });
        
        const allPagesData = await Promise.all(allPromises);
        const allRows = allPagesData.flat();

        // Agrégation par thématique
        const aggregationMap = new Map<string, RowData>();
        allRows.forEach(row => {
          if (!row || !row.thematique) return;
          const existingRow = aggregationMap.get(row.thematique);
          if (existingRow) {
            existingRow.contributions = existingRow.contributions.map((c, i) => Number(c) + (Number(row.contributions[i]) || 0));
          } else {
            const newRow = JSON.parse(JSON.stringify(row));
            newRow.contributions = newRow.contributions.map((c: any) => Number(c) || 0);
            aggregationMap.set(row.thematique, newRow);
          }
        });
        
        setAggregatedData(Array.from(aggregationMap.values()));
      } catch (err) {
        console.error("Erreur lors de la récupération des données de synthèse utilisateur", err);
        setError("Impossible de charger les données.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [pageConfigs]);

  // Filtrage des données pour l'utilisateur sélectionné
  const filteredData = useMemo(() => {
    const userIndex = teamMembers.indexOf(selectedUser);
    if (userIndex === -1) return [];

    return aggregatedData.filter(row => {
        const contrib = Number(row.contributions[userIndex]) || 0;
        // Si on masque les vides, on vérifie si la contrib > 0
        if (hideEmptyRows && contrib === 0) return false;
        return true;
    });
  }, [aggregatedData, selectedUser, hideEmptyRows]);

  // Calcul du total global pour cet utilisateur
  const totalAmount = useMemo(() => {
      const userIndex = teamMembers.indexOf(selectedUser);
      if (userIndex === -1) return 0;
      return filteredData.reduce((sum, row) => sum + (Number(row.contributions[userIndex]) || 0), 0);
  }, [filteredData, selectedUser]);

  const handleExportCSV = () => {
      const userIndex = teamMembers.indexOf(selectedUser);
      if (userIndex === -1) return;

      if (filteredData.length === 0) {
        alert("Aucune donnée à exporter.");
        return;
      }

      const headers = [
        "Thématique", "Synthèse", "Origine", "Difficulté", "Nature", "Estimation",
        `Contribution ${selectedUser}`
      ];

      const csvContent = [
        headers.join(";"),
        ...filteredData.map(row => {
          const fields = [
            row.thematique,
            row.synthese,
            row.origine,
            row.difficulte,
            row.nature,
            row.estimation,
            Number(row.contributions[userIndex]) || 0
          ];
          return fields.map(f => `"${String(f || '').replace(/"/g, '""')}"`).join(";");
        })
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Synthese_${selectedUser}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const getDifficultyBadge = (difficulty: string) => {
    const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full inline-block whitespace-nowrap";
    if (difficulty.includes('Très facile')) return <span className={`${baseClasses} bg-green-100 text-green-800`}>{difficulty}</span>;
    if (difficulty.includes('Facile')) return <span className={`${baseClasses} bg-emerald-100 text-emerald-800`}>{difficulty}</span>;
    if (difficulty.includes('Moyenne')) return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>{difficulty}</span>;
    if (difficulty.includes('Difficile')) return <span className={`${baseClasses} bg-orange-100 text-orange-800`}>{difficulty}</span>;
    if (difficulty.includes('Très difficile')) return <span className={`${baseClasses} bg-red-100 text-red-800`}>{difficulty}</span>;
    return <span>{difficulty}</span>;
  };

  return (
    <>
      <header className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
             <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Synthèse par Utilisateur</h1>
             {isAdmin && (
                 <div className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-semibold border border-purple-200">
                     Vue Administrateur
                 </div>
             )}
          </div>
          <button onClick={onBack} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700">
            Retour au sommaire
          </button>
        </div>
      </header>

      <main className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Barre d'outils supérieure */}
        <div className="p-6 border-b bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            
            {/* Sélecteur d'utilisateur */}
            <div>
                <label htmlFor="user-select" className="block text-sm font-bold text-gray-700 mb-2">
                    Sélectionner l'utilisateur à analyser :
                </label>
                <select
                    id="user-select"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="block w-full md:w-80 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                >
                    {teamMembers.map(member => (
                        <option key={member} value={member}>{member}</option>
                    ))}
                </select>
            </div>

            {/* Contrôles à droite */}
            <div className="flex flex-col items-end gap-3">
                 <div className="flex items-center gap-4">
                    <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={hideEmptyRows} onChange={e => setHideEmptyRows(e.target.checked)} className="sr-only peer" />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ms-3 text-sm font-medium text-gray-600">Masquer les lignes à 0</span>
                    </label>
                    
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export CSV ({selectedUser})
                    </button>
                </div>
                <div className="text-lg font-bold text-gray-800 bg-blue-50 px-4 py-1 rounded-lg border border-blue-100">
                    Total {selectedUser} : <span className="text-blue-600">{totalAmount.toLocaleString('fr-FR')}</span>
                </div>
            </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <p className="p-12 text-center text-gray-500 text-lg">Chargement des données...</p>
          ) : error ? (
             <p className="p-12 text-center text-red-500">{error}</p>
          ) : filteredData.length > 0 ? (
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">Thématique</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Origine</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Difficulté</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Nature</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Estimation</th>
                  <th scope="col" className="px-6 py-4 font-bold text-center text-blue-700 bg-blue-50 border-l border-blue-100">
                      Contribution {selectedUser}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => {
                    const userIndex = teamMembers.indexOf(selectedUser);
                    const contrib = Number(row.contributions[userIndex]) || 0;
                    return (
                      <tr key={index} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{row.thematique}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{row.origine}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getDifficultyBadge(row.difficulte)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{row.nature}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{row.estimation}</td>
                        <td className="px-6 py-4 font-bold text-center text-blue-700 bg-blue-50 border-l border-blue-100">
                            {contrib.toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
                <p className="text-gray-500 text-lg mb-2">Aucune contribution trouvée pour {selectedUser}.</p>
                <p className="text-sm text-gray-400">Essayez de décocher "Masquer les lignes à 0" pour voir toutes les thématiques.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default UserSynthesisPage;
