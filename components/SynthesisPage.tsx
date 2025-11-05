import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { type RowData, type PageConfig } from '../types';
import { teamMembers } from '../config';

interface SynthesisPageProps {
  onBack: () => void;
  pageConfigs: PageConfig[];
}

type SortConfig = {
    key: keyof RowData | 'total' | `contrib_${number}`;
    direction: 'ascending' | 'descending';
} | null;

const ITEMS_PER_PAGE = 20;

const SynthesisPage: React.FC<SynthesisPageProps> = ({ onBack, pageConfigs }) => {
  const [aggregatedData, setAggregatedData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'thematique', direction: 'ascending' });

  // Filtering states
  const [filterText, setFilterText] = useState('');
  const [origineFilter, setOrigineFilter] = useState<string>('all');
  const [difficulteFilter, setDifficulteFilter] = useState<string>('all');
  const [contributionFilter, setContributionFilter] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const allPromises = pageConfigs.map(async (config) => {
          const docRef = doc(db, 'pagesData', config.storageKey);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return docSnap.data().rows as RowData[];
          } else {
            return config.initialData as RowData[];
          }
        });
        
        const allPagesData = await Promise.all(allPromises);
        const allRows = allPagesData.flat();

        const aggregationMap = new Map<string, RowData>();
        allRows.forEach(row => {
          if (!row || !row.thematique) return;

          const existingRow = aggregationMap.get(row.thematique);
          if (existingRow) {
            for (let i = 0; i < existingRow.contributions.length; i++) {
              existingRow.contributions[i] += (row.contributions[i] || 0);
            }
          } else {
            const newRow = JSON.parse(JSON.stringify(row));
            aggregationMap.set(row.thematique, newRow);
          }
        });
        
        setAggregatedData(Array.from(aggregationMap.values()));

      } catch (err) {
        console.error("Erreur lors de la récupération des données de synthèse:", err);
        setError("Impossible de charger les données de synthèse.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pageConfigs]);

  const uniqueOrigines = useMemo(
    () => ['all', ...Array.from(new Set(aggregatedData.map(row => row.origine).filter(Boolean))).sort()],
    [aggregatedData]
  );

  const uniqueDifficultes = useMemo(
    () => ['all', ...Array.from(new Set(aggregatedData.map(row => row.difficulte).filter(Boolean))).sort()],
    [aggregatedData]
  );
  
  const sortedAndFilteredData = useMemo(() => {
    let data = [...aggregatedData];
    
    // 1. Apply all filters
    data = data.filter(row => {
      const thematiqueMatch = filterText 
        ? row.thematique.toLowerCase().includes(filterText.toLowerCase()) || row.synthese.toLowerCase().includes(filterText.toLowerCase()) 
        : true;
      const origineMatch = origineFilter === 'all' ? true : row.origine === origineFilter;
      const difficulteMatch = difficulteFilter === 'all' ? true : row.difficulte === difficulteFilter;
      const contributionMatch = contributionFilter !== null ? (row.contributions[contributionFilter] || 0) > 0 : true;
      return thematiqueMatch && origineMatch && difficulteMatch && contributionMatch;
    });
    
    // 2. Sort the filtered data
    if (sortConfig !== null) {
      data.sort((a, b) => {
        let aValue: string | number, bValue: string | number;

        if (sortConfig.key === 'total') {
            aValue = a.contributions.reduce((s, c) => s + (c || 0), 0);
            bValue = b.contributions.reduce((s, c) => s + (c || 0), 0);
        } else if (typeof sortConfig.key === 'string' && sortConfig.key.startsWith('contrib_')) {
            const index = parseInt(sortConfig.key.split('_')[1], 10);
            aValue = a.contributions[index] || 0;
            bValue = b.contributions[index] || 0;
        } else {
            aValue = a[sortConfig.key as keyof RowData] as any;
            bValue = b[sortConfig.key as keyof RowData] as any;
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [aggregatedData, sortConfig, filterText, origineFilter, difficulteFilter, contributionFilter]);
  
  const resetAllFilters = () => {
    setFilterText('');
    setOrigineFilter('all');
    setDifficulteFilter('all');
    setContributionFilter(null);
  };
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, origineFilter, difficulteFilter, contributionFilter]);

  const totalPages = Math.ceil(sortedAndFilteredData.length / ITEMS_PER_PAGE);
  const currentItems = sortedAndFilteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const requestSort = (key: SortConfig['key']) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleContributionFilter = (index: number) => {
    setContributionFilter(currentFilter => currentFilter === index ? null : index);
  }

  const getSortIndicator = (key: SortConfig['key']) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
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

  const activeFilters = [
    origineFilter !== 'all' && `Origine: ${origineFilter}`,
    difficulteFilter !== 'all' && `Difficulté: ${difficulteFilter}`,
    contributionFilter !== null && `Contribution: ${teamMembers[contributionFilter]} > 0`
  ].filter(Boolean);

  return (
    <>
      <header className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Synthèse Globale des Contributions</h1>
          <button onClick={onBack} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700">
            Retour au sommaire
          </button>
        </div>
      </header>

      <main className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b bg-gray-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
             <div>
                <label htmlFor="thematique-search" className="block text-sm font-medium text-gray-700 mb-1">Rechercher</label>
                <input 
                  id="thematique-search"
                  type="text"
                  placeholder="Thématique ou synthèse..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                />
            </div>
             <div>
                <label htmlFor="origine-filter" className="block text-sm font-medium text-gray-700 mb-1">Filtrer par Origine</label>
                <select id="origine-filter" value={origineFilter} onChange={e => setOrigineFilter(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md shadow-sm p-2.5 text-sm">
                    {uniqueOrigines.map(o => <option key={o} value={o}>{o === 'all' ? 'Toutes' : o}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="difficulte-filter" className="block text-sm font-medium text-gray-700 mb-1">Filtrer par Difficulté</label>
                <select id="difficulte-filter" value={difficulteFilter} onChange={e => setDifficulteFilter(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md shadow-sm p-2.5 text-sm">
                    {uniqueDifficultes.map(d => <option key={d} value={d}>{d === 'all' ? 'Toutes' : d}</option>)}
                </select>
            </div>
            <button onClick={resetAllFilters} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Réinitialiser les filtres
            </button>
        </div>

        {activeFilters.length > 0 && (
            <div className="p-3 bg-blue-50 border-b text-blue-800 text-sm flex items-center justify-between">
                <span>
                    Filtres actifs : <strong>{activeFilters.join(' / ')}</strong>
                </span>
                <button onClick={resetAllFilters} className="font-semibold hover:underline">(Tout réinitialiser)</button>
            </div>
        )}
        
        <div className="overflow-x-auto">
          {loading ? (
             <p className="p-8 text-center text-gray-500">Chargement et agrégation des données...</p>
          ) : error ? (
             <p className="p-8 text-center text-red-500">{error}</p>
          ) : sortedAndFilteredData.length > 0 ? (
            <>
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Thématique</th>
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Synthèse du levier</th>
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Origine</th>
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Difficulté</th>
                  {teamMembers.map((name, index) => (
                    <th key={name} scope="col" className={`px-6 py-4 font-semibold text-center whitespace-nowrap cursor-pointer hover:bg-gray-200 ${contributionFilter === index ? 'bg-blue-200' : ''}`} onClick={() => handleContributionFilter(index)} title={`Filtrer par ${name}`}>{name}</th>
                  ))}
                  <th scope="col" className="px-6 py-4 font-semibold text-center whitespace-nowrap cursor-pointer" onClick={() => requestSort('total')}>Total Contrib.{getSortIndicator('total')}</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((row, index) => (
                  <tr key={row.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b hover:bg-blue-50`}>
                    <td className="px-6 py-4 font-medium text-gray-900">{row.thematique}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-sm truncate" title={row.synthese}>{row.synthese}</td>
                    <td className="px-6 py-4">{row.origine}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getDifficultyBadge(row.difficulte)}</td>
                    {row.contributions.map((contrib, i) => (
                        <td key={i} className="px-6 py-4 text-center">{(contrib || 0).toLocaleString('fr-FR')}</td>
                    ))}
                    <td className="px-6 py-4 font-bold text-center">
                      {row.contributions.reduce((sum, item) => sum + (item || 0), 0).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
                <div className="p-4 flex items-center justify-between border-t bg-white">
                  <span className="text-sm text-gray-700">
                    Page <span className="font-semibold">{currentPage}</span> sur <span className="font-semibold">{totalPages}</span>
                  </span>
                  <div className="inline-flex -space-x-px">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Précédent
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="p-8 text-center text-gray-500">Aucune donnée à afficher pour les filtres actuels.</p>
          )}
        </div>
      </main>
    </>
  );
};

export default SynthesisPage;
