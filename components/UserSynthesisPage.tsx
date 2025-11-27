

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase-config';
import { type RowData, type PageConfig } from '../types';
import { teamMembers } from '../config';

interface UserSynthesisPageProps {
  onBack: () => void;
  pageConfigs: PageConfig[];
  currentUser: string;
}

// Helper pour convertir n'importe quelle entrée en nombre pour le calcul local
const safeParseFloat = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleanStr = String(val).replace(/,/g, '.').replace(/[\s\u00A0]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
};

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
          const docRef = db.collection('pagesData').doc(config.storageKey);
          const docSnap = await docRef.get();
          if (docSnap.exists) {
            // On attache le nom du tableau source à chaque ligne pour info
            return (docSnap.data()?.rows as RowData[]).map(row => ({...row, sourcePageTitle: config.title}));
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
            existingRow.contributions = existingRow.contributions.map((c, i) => safeParseFloat(c) + safeParseFloat(row.contributions[i]));
          } else {
            const newRow = JSON.parse(JSON.stringify(row));
            newRow.contributions = newRow.contributions.map((c: any) => safeParseFloat(c));
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
        const contrib = safeParseFloat(row.contributions[userIndex]);
        // Si on masque les vides, on vérifie si la contrib > 0
        if (hideEmptyRows && contrib === 0) return false;
        return true;
    });
  }, [aggregatedData, selectedUser, hideEmptyRows]);

  // Calcul du total global pour cet utilisateur
  const totalAmount = useMemo(() => {
      const userIndex = teamMembers.indexOf(selectedUser);
      if (userIndex === -1) return 0;
      return filteredData.reduce((sum, row) => sum + safeParseFloat(row.contributions[userIndex]), 0);
  }, [filteredData, selectedUser]);

  const handleExportCSV = () => {
      const userIndex = teamMembers.indexOf(selectedUser);
      if (userIndex === -1) return;

      if (filteredData.length === 0) {
        alert("Aucune donnée à exporter.");
        return;
      }

      const headers = [
        "Thématique", "Synthèse", "Origine", "Difficulté", "Nature", "Assiette 25",
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
            safeParseFloat(row.contributions[userIndex])
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

  const userIndex = teamMembers.indexOf(selectedUser);

  return (
    <>
      <header className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Synthèse par Utilisateur</h1>
          <button onClick={onBack} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700">
            Retour au sommaire
          </button>
        </div>
      </header>

      <main className="bg-white rounded-lg shadow-md overflow-hidden">
         <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-4">
                 {/* Sélecteur d'utilisateur si Admin, sinon affichage statique */}
                 {isAdmin ? (
                     <div>
                         <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mr-2">Voir pour :</label>
                         <select
                            id="user-select"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                         >
                             {teamMembers.map(tm => (
                                 <option key={tm} value={tm}>{tm}</option>
                             ))}
                         </select>
                     </div>
                 ) : (
                     <div className="text-lg font-bold text-blue-800">
                         Synthèse pour {currentUser}
                     </div>
                 )}
                 
                 <label className="inline-flex items-center cursor-pointer ml-4">
                    <input type="checkbox" checked={hideEmptyRows} onChange={e => setHideEmptyRows(e.target.checked)} className="sr-only peer" />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-900">Masquer les lignes à 0 €</span>
                </label>
             </div>
             
             <div className="flex items-center gap-4">
                 <div className="text-right">
                     <span className="block text-xs text-gray-500 uppercase tracking-wide">Total Contribution</span>
                     <span className="text-xl font-bold text-green-600">{totalAmount.toLocaleString('fr-FR')} €</span>
                 </div>
                 <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Excel
                </button>
             </div>
         </div>

         <div className="overflow-x-auto">
             {loading ? (
                 <p className="p-8 text-center text-gray-500">Chargement...</p>
             ) : filteredData.length > 0 ? (
                 <table className="w-full text-sm text-left text-gray-700">
                     <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                         <tr>
                             <th className="px-6 py-3">Thématique</th>
                             <th className="px-6 py-3">Synthèse</th>
                             <th className="px-6 py-3">Origine</th>
                             <th className="px-6 py-3">Difficulté</th>
                             <th className="px-6 py-3">Assiette 25</th>
                             <th className="px-6 py-3 text-center bg-blue-50 border-x border-blue-100">Contribution {selectedUser}</th>
                         </tr>
                     </thead>
                     <tbody>
                         {filteredData.map((row, index) => (
                             <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                 <td className="px-6 py-4 font-medium text-gray-900">{row.thematique}</td>
                                 <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={row.synthese}>{row.synthese}</td>
                                 <td className="px-6 py-4">{row.origine}</td>
                                 <td className="px-6 py-4">{getDifficultyBadge(row.difficulte)}</td>
                                 <td className="px-6 py-4">{row.estimation}</td>
                                 <td className="px-6 py-4 text-center font-bold text-blue-700 bg-blue-50 border-x border-blue-100">
                                     {safeParseFloat(row.contributions[userIndex]).toLocaleString('fr-FR')}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                     <tfoot className="bg-gray-100 font-bold text-gray-900">
                        <tr>
                            <td colSpan={5} className="px-6 py-3 text-right">TOTAL</td>
                            <td className="px-6 py-3 text-center bg-blue-100 text-blue-800 border-x border-blue-200">
                                {totalAmount.toLocaleString('fr-FR')}
                            </td>
                        </tr>
                     </tfoot>
                 </table>
             ) : (
                 <p className="p-12 text-center text-gray-500 italic">
                     Aucune contribution trouvée pour {selectedUser} avec les filtres actuels.
                 </p>
             )}
         </div>
      </main>
    </>
  );
};

export default UserSynthesisPage;
